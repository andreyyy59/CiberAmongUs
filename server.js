// ============================================================
//  RED SEGURA - Servidor multijugador
//  El servidor es el "árbitro": decide los roles, valida las
//  acciones y decide quién gana. Los navegadores solo dibujan.
// ============================================================
'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const MAP = require('./public/shared/map.js');
const QUIZ = require('./server/quiz.js');

// ---------------- Configuración ----------------
const PORT = process.env.PORT || 3000;
const TEST_MODE = process.argv.includes('--prueba'); // npm run prueba → permite jugar con 1 o 2 personas
const MIN_PLAYERS = TEST_MODE ? 1 : 3;
const MAX_PLAYERS = 12;
const TASKS_PER_PLAYER = 5;

const USE_RANGE = 95;           // distancia para usar una estación
const INFECT_RANGE = 95;        // distancia para infectar
const REPORT_RANGE = 130;       // distancia para reportar
const PORT_RANGE = 70;          // distancia para usar un puerto abierto
const INFECT_COOLDOWN = 25000;  // ms entre infecciones
const FIRST_COOLDOWN = 15000;   // ms antes de la primera infección / después de reunión
const SABOTAGE_COOLDOWN = 35000;
const RANSOM_TIME = 45000;      // tiempo para detener el ransomware
const QUIZ_TIME = 20000;
const VOTE_TIME = 60000;
const RESULT_TIME = 6500;

const TASK_IDS = Object.keys(MAP.STATIONS);
const VARIANTS = 6; // estilos de robot (ver public/js/robots.js)
const COLORS = [
  { name: 'Rojo', hex: '#e74c3c' }, { name: 'Azul', hex: '#3498db' }, { name: 'Verde', hex: '#2ecc71' },
  { name: 'Amarillo', hex: '#f1c40f' }, { name: 'Naranja', hex: '#e67e22' }, { name: 'Morado', hex: '#9b59b6' },
  { name: 'Rosado', hex: '#ff6fb5' }, { name: 'Turquesa', hex: '#1abc9c' }, { name: 'Blanco', hex: '#ecf0f1' },
  { name: 'Café', hex: '#a0705a' }, { name: 'Lima', hex: '#a3e635' }, { name: 'Gris', hex: '#8395a7' },
];
const BAD_WORDS = ['idiota', 'estupido', 'estúpido', 'tonto', 'tonta', 'mierda', 'puta', 'puto', 'marica', 'malparido', 'malparida', 'gonorrea', 'imbecil', 'imbécil', 'pendejo', 'pendeja', 'hijueputa', 'hp'];

// ---------------- Servidor web ----------------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map(); // código → sala

// ---------------- Utilidades ----------------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function makeCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
  } while (rooms.has(code));
  return code;
}
function cleanName(name) {
  let n = String(name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 14);
  return n || 'Jugador';
}
function cleanChat(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  for (const w of BAD_WORDS) {
    const re = new RegExp('\\b' + w + '\\b', 'gi');
    t = t.replace(re, '***');
  }
  return t;
}
function getCtx(socket) {
  const room = rooms.get(socket.data.room);
  if (!room) return {};
  return { room, p: room.players.get(socket.id) };
}
function playersArr(room) { return [...room.players.values()]; }
function publicPlayers(room) {
  return playersArr(room).map((p) => ({ id: p.id, name: p.name, color: p.color, variant: p.variant, alive: p.alive }));
}

// ---------------- Sala de espera ----------------
function lobbyInfo(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    minPlayers: MIN_PLAYERS,
    testMode: TEST_MODE,
    players: playersArr(room).map((p) => ({ id: p.id, name: p.name, color: p.color, variant: p.variant })),
  };
}
function sendLobby(room) { io.to(room.code).emit('lobby', lobbyInfo(room)); }

function addPlayer(room, socket, name) {
  const used = new Set(playersArr(room).map((p) => p.color));
  const color = (COLORS.find((c) => !used.has(c.hex)) || COLORS[0]).hex;
  let finalName = cleanName(name);
  const names = new Set(playersArr(room).map((p) => p.name.toLowerCase()));
  let i = 2;
  const base = finalName;
  while (names.has(finalName.toLowerCase())) finalName = base.slice(0, 12) + i++;
  const variant = Math.floor(Math.random() * VARIANTS);
  room.players.set(socket.id, {
    id: socket.id, name: finalName, color, variant, x: MAP.SPAWN.x, y: MAP.SPAWN.y,
    alive: true, role: 'defender', tasks: [], lastChat: 0,
  });
  socket.join(room.code);
  socket.data.room = room.code;
}

function leaveCurrent(socket) {
  const room = rooms.get(socket.data.room);
  socket.data.room = null;
  if (!room) return;
  const p = room.players.get(socket.id);
  socket.leave(room.code);
  if (!p) return;
  releaseKey(room, p);
  room.players.delete(socket.id);

  if (room.players.size === 0) {
    clearRoomTimers(room);
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;

  if (room.phase === 'lobby' || room.phase === 'ended') {
    sendLobby(room);
    return;
  }
  io.to(room.code).emit('playerLeft', { id: p.id, name: p.name });
  if (room.meeting) {
    room.meeting.votes.delete(p.id);
    room.meeting.answers.delete(p.id);
  }
  if (!checkWin(room) && room.phase === 'meeting' && room.meeting) {
    if (room.meeting.stage === 'vote' && allVoted(room)) endMeeting(room);
  }
}

function clearRoomTimers(room) {
  if (room.meeting && room.meeting.timer) clearTimeout(room.meeting.timer);
  if (room.sabotage && room.sabotage.timer) clearTimeout(room.sabotage.timer);
  if (room.resultTimer) clearTimeout(room.resultTimer);
  room.resultTimer = null;
}

// ---------------- Inicio de partida ----------------
function startGame(room) {
  const list = shuffle(playersArr(room));
  const nMal = list.length >= 8 ? 2 : (list.length >= 2 ? 1 : 0);
  list.forEach((p, i) => { p.role = i < nMal ? 'malware' : 'defender'; });

  const now = Date.now();
  playersArr(room).forEach((p, i, all) => {
    const a = (i / all.length) * Math.PI * 2;
    p.x = MAP.SPAWN.x + Math.cos(a) * 80;
    p.y = MAP.SPAWN.y + Math.sin(a) * 45;
    p.alive = true;
    p.tasks = shuffle(TASK_IDS.slice()).slice(0, TASKS_PER_PLAYER).map((id) => ({ id, done: false }));
    p.emergencyUsed = false;
    p.infectReadyAt = now + FIRST_COOLDOWN;
    p.lastMove = now;
    p.moveBudget = 0;
    p.holding = null;
    p.portReadyAt = 0;
  });

  room.phase = 'playing';
  room.bodies = [];
  room.bodyCounter = 0;
  room.sabotage = null;
  room.sabotageReadyAt = now + 20000;
  room.meeting = null;
  room.malwareTotal = nMal;
  room.small = list.length < 3; // solo pasa en modo prueba

  const pub = playersArr(room).map((q) => ({ id: q.id, name: q.name, color: q.color, variant: q.variant }));
  for (const p of playersArr(room)) {
    io.to(p.id).emit('gameStart', {
      role: p.role,
      fellowMalware: p.role === 'malware' ? playersArr(room).filter((q) => q.role === 'malware' && q.id !== p.id).map((q) => q.id) : [],
      tasks: p.tasks.map((t) => t.id),
      players: pub,
      x: p.x, y: p.y,
      malwareCount: nMal,
    });
  }
}

// ---------------- Progreso y victoria ----------------
function taskProgress(room) {
  let total = 0, done = 0;
  for (const p of room.players.values()) {
    if (p.role === 'malware') continue; // las tareas del malware son falsas
    total += p.tasks.length;
    done += p.tasks.filter((t) => t.done).length;
  }
  return { total, done };
}

function checkWin(room) {
  if (room.phase === 'lobby' || room.phase === 'ended') return true;
  const ps = playersArr(room);
  const malAlive = ps.filter((p) => p.alive && p.role === 'malware').length;
  const defAlive = ps.filter((p) => p.alive && p.role !== 'malware').length;
  const prog = taskProgress(room);

  if (room.malwareTotal > 0 && malAlive === 0)
    return endGame(room, 'defenders', '¡El malware fue expulsado de la red!');
  if (prog.total > 0 && prog.done >= prog.total)
    return endGame(room, 'defenders', '¡Completaron todas las tareas de seguridad!');
  if (room.small ? defAlive === 0 : malAlive >= defAlive)
    return endGame(room, 'malware', 'El malware infectó a casi todos: ya no hay suficientes defensores.');
  return false;
}

function endGame(room, winner, reason) {
  clearRoomTimers(room);
  room.phase = 'ended';
  room.meeting = null;
  room.sabotage = null;
  io.to(room.code).emit('gameOver', {
    winner, reason,
    roles: playersArr(room).map((p) => ({ name: p.name, color: p.color, variant: p.variant, role: p.role, alive: p.alive })),
    hostId: room.hostId,
  });
  return true;
}

// ---------------- Sabotajes ----------------
function sabotageInfo(room) {
  const s = room.sabotage;
  if (!s) return null;
  return {
    type: s.type,
    remaining: s.endsAt ? Math.max(0, s.endsAt - Date.now()) : null,
    keys: { A: !!s.keys.A, B: !!s.keys.B },
  };
}
function releaseKey(room, p) {
  if (!room.sabotage || !p.holding) { p.holding = null; return; }
  const k = p.holding;
  if (room.sabotage.keys[k] === p.id) room.sabotage.keys[k] = null;
  p.holding = null;
  io.to(room.code).emit('keysUpdate', sabotageInfo(room).keys);
}
function clearSabotage(room, fixed) {
  const s = room.sabotage;
  if (!s) return;
  if (s.timer) clearTimeout(s.timer);
  for (const p of room.players.values()) p.holding = null;
  room.sabotage = null;
  room.sabotageReadyAt = Date.now() + SABOTAGE_COOLDOWN;
  io.to(room.code).emit('sabotageEnd', { type: s.type, fixed });
}

// ---------------- Reuniones ----------------
function aliveIds(room) { return playersArr(room).filter((p) => p.alive).map((p) => p.id); }
function allVoted(room) { return aliveIds(room).every((id) => room.meeting.votes.has(id)); }

function startMeeting(room, info) {
  clearSabotage(room, false);
  room.phase = 'meeting';
  const q = QUIZ[Math.floor(Math.random() * QUIZ.length)];
  room.meeting = {
    reason: info.reason,
    question: q,
    answers: new Map(), // id → true/false
    votes: new Map(),   // id → objetivo o 'skip'
    stage: 'quiz',
    timer: null,
  };
  room.bodies = [];
  for (const p of room.players.values()) p.holding = null;
  io.to(room.code).emit('meetingStart', {
    reason: info.reason,
    callerName: info.caller.name,
    callerColor: info.caller.color,
    callerVariant: info.caller.variant,
    bodyName: info.body ? info.body.name : null,
    bodyColor: info.body ? info.body.color : null,
    bodyVariant: info.body ? info.body.variant : 0,
    question: { text: q.q, options: q.options },
    duration: QUIZ_TIME,
    players: publicPlayers(room),
  });
  room.meeting.timer = setTimeout(() => startVoting(room), QUIZ_TIME);
}

function startVoting(room) {
  const m = room.meeting;
  if (!m || m.stage !== 'quiz') return;
  clearTimeout(m.timer);
  m.stage = 'vote';
  const stars = [...m.answers.entries()].filter(([, ok]) => ok).map(([id]) => id);
  io.to(room.code).emit('votingStart', { duration: VOTE_TIME, stars });
  m.timer = setTimeout(() => endMeeting(room), VOTE_TIME);
}

function endMeeting(room) {
  const m = room.meeting;
  if (!m || m.stage !== 'vote') return;
  clearTimeout(m.timer);
  m.stage = 'done';

  // Contar votos (voto doble para quien acertó la pregunta)
  const tally = new Map();
  const voters = new Map();
  for (const [voterId, target] of m.votes) {
    if (!room.players.has(voterId)) continue;
    const w = m.answers.get(voterId) ? 2 : 1;
    tally.set(target, (tally.get(target) || 0) + w);
    if (!voters.has(target)) voters.set(target, []);
    voters.get(target).push(voterId);
  }
  let best = null, bestVotes = 0, tie = false;
  for (const [target, v] of tally) {
    if (v > bestVotes) { best = target; bestVotes = v; tie = false; }
    else if (v === bestVotes) tie = true;
  }

  let ejected = null;
  let outcome = 'none';
  if (bestVotes === 0) outcome = 'novotes';
  else if (tie) outcome = 'tie';
  else if (best === 'skip') outcome = 'skip';
  else {
    const t = room.players.get(best);
    if (t) {
      t.alive = false;
      ejected = { id: t.id, name: t.name, color: t.color, variant: t.variant, wasMalware: t.role === 'malware' };
      outcome = 'ejected';
    }
  }
  const malLeft = playersArr(room).filter((p) => p.alive && p.role === 'malware').length;
  io.to(room.code).emit('meetingEnd', {
    outcome, ejected, malwareLeft: malLeft,
    tally: [...tally.entries()].map(([target, votes]) => ({ target, votes, voters: voters.get(target) || [] })),
  });

  room.phase = 'result';
  room.resultTimer = setTimeout(() => {
    room.resultTimer = null;
    room.meeting = null;
    if (checkWin(room)) return;
    // Volver a jugar: todos regresan a Recepción
    room.phase = 'playing';
    const now = Date.now();
    playersArr(room).forEach((p, i, all) => {
      if (p.alive) {
        const a = (i / all.length) * Math.PI * 2;
        p.x = MAP.SPAWN.x + Math.cos(a) * 80;
        p.y = MAP.SPAWN.y + Math.sin(a) * 45;
      }
      p.lastMove = now;
      p.moveBudget = 0;
      p.infectReadyAt = now + FIRST_COOLDOWN;
      io.to(p.id).emit('resume', { x: p.x, y: p.y, alive: p.alive });
    });
    room.sabotageReadyAt = now + 20000;
  }, RESULT_TIME);
}

// ---------------- Conexiones ----------------
io.on('connection', (socket) => {
  socket.data.room = null;

  socket.on('createRoom', (data, ack) => {
    if (typeof ack !== 'function') return;
    leaveCurrent(socket);
    const code = makeCode();
    const room = { code, hostId: socket.id, players: new Map(), phase: 'lobby', bodies: [], sabotage: null, meeting: null };
    rooms.set(code, room);
    addPlayer(room, socket, data && data.name);
    ack({ ok: true, code, id: socket.id });
    sendLobby(room);
  });

  socket.on('joinRoom', (data, ack) => {
    if (typeof ack !== 'function') return;
    const code = String((data && data.code) || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, error: 'No existe una sala con ese código.' });
    if (room.phase !== 'lobby' && room.phase !== 'ended') return ack({ ok: false, error: 'La partida ya empezó. Espera a que termine.' });
    if (room.players.size >= MAX_PLAYERS) return ack({ ok: false, error: 'La sala está llena (máximo ' + MAX_PLAYERS + ').' });
    leaveCurrent(socket);
    addPlayer(room, socket, data && data.name);
    ack({ ok: true, code, id: socket.id });
    sendLobby(room);
  });

  socket.on('leaveRoom', () => leaveCurrent(socket));

  // En la sala de espera cada jugador puede cambiar el estilo de su robot
  socket.on('setVariant', (v) => {
    const { room, p } = getCtx(socket);
    if (!p || (room.phase !== 'lobby' && room.phase !== 'ended')) return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n >= VARIANTS) return;
    p.variant = n;
    sendLobby(room);
  });

  socket.on('startGame', () => {
    const { room } = getCtx(socket);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== 'lobby' && room.phase !== 'ended') return;
    if (room.players.size < MIN_PLAYERS) {
      socket.emit('toast', 'Se necesitan al menos ' + MIN_PLAYERS + ' jugadores.');
      return;
    }
    startGame(room);
  });

  socket.on('backToLobby', () => {
    const { room } = getCtx(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'ended') return;
    room.phase = 'lobby';
    sendLobby(room);
  });

  // Movimiento: el servidor revisa que nadie se mueva demasiado rápido ni atraviese paredes
  socket.on('move', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !d) return;
    const x = Number(d.x), y = Number(d.y);
    if (!isFinite(x) || !isFinite(y)) return;
    const now = Date.now();
    const dt = Math.min(1, (now - p.lastMove) / 1000);
    p.lastMove = now;
    p.moveBudget = Math.min(p.moveBudget + MAP.SPEED * 1.5 * dt, MAP.SPEED * 0.7);
    const dd = Math.hypot(x - p.x, y - p.y);
    const okWall = p.alive ? MAP.isWalkable(x, y) : (x >= 0 && y >= 0 && x <= MAP.WORLD.w && y <= MAP.WORLD.h);
    if (dd > p.moveBudget + 12 || !okWall) {
      socket.emit('teleport', { x: p.x, y: p.y });
      return;
    }
    p.moveBudget -= dd;
    p.x = x; p.y = y;
    if (p.holding && room.sabotage) {
      const k = MAP.SPECIAL[p.holding === 'A' ? 'keyA' : 'keyB'];
      if (dist(p, k) > USE_RANGE + 20) releaseKey(room, p);
    }
  });

  socket.on('completeTask', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !d) return;
    const t = p.tasks.find((q) => q.id === d.taskId && !q.done);
    const st = MAP.STATIONS[d.taskId];
    if (!t || !st || dist(p, st) > USE_RANGE + 40) return;
    t.done = true;
    io.to(room.code).emit('fx', { type: 'task', x: st.x, y: st.y });
    checkWin(room);
  });

  socket.on('infect', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive || p.role !== 'malware' || !d) return;
    if (Date.now() < p.infectReadyAt) return;
    const t = room.players.get(d.targetId);
    if (!t || !t.alive || t.role === 'malware' || dist(p, t) > INFECT_RANGE) return;
    t.alive = false;
    releaseKey(room, t);
    room.bodies.push({ id: ++room.bodyCounter, name: t.name, color: t.color, variant: t.variant, x: Math.round(t.x), y: Math.round(t.y) });
    io.to(room.code).emit('fx', { type: 'infect', x: t.x, y: t.y });
    p.infectReadyAt = Date.now() + INFECT_COOLDOWN;
    io.to(t.id).emit('youWereInfected', { byName: p.name, byColor: p.color, byVariant: p.variant, myVariant: t.variant, myColor: t.color });
    checkWin(room);
  });

  socket.on('report', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive || !d) return;
    const body = room.bodies.find((b) => b.id === d.bodyId);
    if (!body || dist(p, body) > REPORT_RANGE) return;
    startMeeting(room, { reason: 'report', caller: p, body });
  });

  socket.on('emergency', () => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive || p.emergencyUsed) return;
    if (room.sabotage) return socket.emit('toast', '¡No puedes llamar a reunión durante un ataque!');
    if (dist(p, MAP.SPECIAL.emergency) > USE_RANGE + 30) return;
    p.emergencyUsed = true;
    startMeeting(room, { reason: 'emergency', caller: p });
  });

  socket.on('sabotage', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive || p.role !== 'malware' || !d) return;
    if (room.sabotage || Date.now() < room.sabotageReadyAt) return;
    if (d.type !== 'ddos' && d.type !== 'ransomware') return;
    const s = { type: d.type, endsAt: null, keys: { A: null, B: null }, timer: null };
    if (d.type === 'ransomware') {
      s.endsAt = Date.now() + RANSOM_TIME;
      s.timer = setTimeout(() => {
        if (room.sabotage === s && room.phase === 'playing')
          endGame(room, 'malware', 'El ransomware cifró todos los archivos de la red y nadie lo detuvo a tiempo.');
      }, RANSOM_TIME);
    }
    room.sabotage = s;
    io.to(room.code).emit('sabotageStart', sabotageInfo(room));
  });

  socket.on('fixDdos', () => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive) return;
    if (!room.sabotage || room.sabotage.type !== 'ddos') return;
    if (dist(p, MAP.SPECIAL.ddos) > USE_RANGE + 40) return;
    clearSabotage(room, true);
  });

  socket.on('holdKey', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !d) return;
    const s = room.sabotage;
    if (!s || s.type !== 'ransomware') return;
    const key = d.key === 'B' ? 'B' : 'A';
    if (d.holding) {
      if (!p.alive || p.holding) return;
      if (dist(p, MAP.SPECIAL[key === 'A' ? 'keyA' : 'keyB']) > USE_RANGE + 20) return;
      if (s.keys[key]) return;
      s.keys[key] = p.id;
      p.holding = key;
      io.to(room.code).emit('keysUpdate', { A: !!s.keys.A, B: !!s.keys.B });
      if (s.keys.A && s.keys.B && s.keys.A !== s.keys.B) clearSabotage(room, true);
    } else {
      releaseKey(room, p);
    }
  });

  socket.on('usePort', () => {
    const { room, p } = getCtx(socket);
    if (!p || room.phase !== 'playing' || !p.alive || p.role !== 'malware') return;
    if (Date.now() < p.portReadyAt) return;
    const i = MAP.PORTS.findIndex((pt) => dist(p, pt) <= PORT_RANGE);
    if (i < 0) return;
    const next = MAP.PORTS[(i + 1) % MAP.PORTS.length];
    io.to(room.code).emit('fx', { type: 'port', x: MAP.PORTS[i].x, y: MAP.PORTS[i].y });
    io.to(room.code).emit('fx', { type: 'port', x: next.x, y: next.y });
    p.x = next.x; p.y = next.y;
    p.moveBudget = 0;
    p.portReadyAt = Date.now() + 1200;
    socket.emit('teleport', { x: p.x, y: p.y });
  });

  socket.on('quizAnswer', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || !room.meeting || room.meeting.stage !== 'quiz' || !p.alive || !d) return;
    const m = room.meeting;
    if (m.answers.has(p.id)) return;
    const ok = Number(d.index) === m.question.correct;
    m.answers.set(p.id, ok);
    socket.emit('quizResult', { correct: ok, correctIndex: m.question.correct, explanation: m.question.explanation });
    if (aliveIds(room).every((id) => m.answers.has(id))) setTimeout(() => startVoting(room), 2500);
  });

  socket.on('vote', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || !room.meeting || room.meeting.stage !== 'vote' || !p.alive || !d) return;
    const m = room.meeting;
    if (m.votes.has(p.id)) return;
    const target = d.target === 'skip' ? 'skip' : d.target;
    if (target !== 'skip') {
      const t = room.players.get(target);
      if (!t || !t.alive) return;
    }
    m.votes.set(p.id, target);
    io.to(room.code).emit('voted', { voterId: p.id });
    if (allVoted(room)) endMeeting(room);
  });

  socket.on('chat', (d) => {
    const { room, p } = getCtx(socket);
    if (!p || !d) return;
    if (room.phase === 'playing') return; // solo se habla en reuniones y en la sala de espera
    const now = Date.now();
    if (now - p.lastChat < 900) return;
    p.lastChat = now;
    const text = cleanChat(d.text);
    if (!text) return;
    const msg = { name: p.name, color: p.color, text, ghost: !p.alive && room.phase !== 'lobby' && room.phase !== 'ended' };
    if (msg.ghost) {
      // Los fantasmas solo hablan entre fantasmas
      for (const q of room.players.values()) if (!q.alive) io.to(q.id).emit('chat', msg);
    } else {
      io.to(room.code).emit('chat', msg);
    }
  });

  socket.on('disconnect', () => leaveCurrent(socket));
});

// ---------------- Envío del estado (15 veces por segundo) ----------------
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.phase !== 'playing') continue;
    const ps = playersArr(room);
    const prog = taskProgress(room);
    const sab = sabotageInfo(room);
    for (const p of ps) {
      // Los vivos NO reciben la posición de los fantasmas (así no se pueden "espiar")
      const visible = ps.filter((q) => q.alive || !p.alive).map((q) => ({ id: q.id, x: Math.round(q.x), y: Math.round(q.y), alive: q.alive }));
      io.to(p.id).emit('state', {
        players: visible,
        bodies: room.bodies,
        progress: prog.total ? prog.done / prog.total : 0,
        sabotage: sab,
        me: {
          alive: p.alive,
          tasks: p.tasks,
          infectIn: Math.max(0, (p.infectReadyAt || 0) - now),
          sabotageIn: p.role === 'malware' ? Math.max(0, room.sabotageReadyAt - now) : 0,
          emergencyUsed: !!p.emergencyUsed,
        },
      });
    }
  }
}, 66);

server.listen(PORT, () => {
  console.log('==============================================');
  console.log('  RED SEGURA - servidor encendido');
  console.log('  En este computador:  http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family === 'IPv4' && !n.internal) console.log('  En la misma red:     http://' + n.address + ':' + PORT);
    }
  }
  if (TEST_MODE) console.log('  MODO PRUEBA: se puede iniciar con 1 jugador');
  console.log('==============================================');
});
