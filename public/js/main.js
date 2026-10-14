// ============================================================
//  RED SEGURA - Lógica del navegador (pantallas, red y dibujo)
// ============================================================

// Compatibilidad con navegadores viejos que no tienen roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

(() => {
  const socket = io();
  const $ = (id) => document.getElementById(id);

  // ---------- Rangos (un poco menores que los del servidor) ----------
  const USE_R = 88, INFECT_R = 90, REPORT_R = 125, PORT_R = 65;

  // ---------- Estado ----------
  const S = {
    phase: 'home',          // home | lobby | playing | meeting | result | ended
    myId: null, code: null, hostId: null,
    role: 'defender', fellow: new Set(),
    meta: new Map(),        // id → {name,color,variant}
    others: new Map(),      // id → {x,y,tx,ty,alive,face,moving}
    me: { x: 0, y: 0, alive: true, face: 1, moving: false },
    tasks: [], bodies: [], progress: 0,
    sabotage: null, sabotageAt: 0,
    infectIn: 0, sabotageIn: 0, stateAt: 0, emergencyUsed: false,
  };
  const keysDown = new Set();
  const joy = { x: 0, y: 0, active: false };
  const meta = (id) => S.meta.get(id) || { name: '¿?', color: '#888888', variant: 0 };
  const nameOf = (id) => meta(id).name;
  const colorOf = (id) => meta(id).color;
  const seedOf = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 1000; return h / 100; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Pantallas ----------
  FX.Background.init($('bg'));
  FX.Background.start();
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $('screen-' + name).classList.add('active');
    if (name === 'game') FX.Background.stop(); else FX.Background.start();
  }
  function toast(msg, type, ms = 3800) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    $('toasts').append(t);
    setTimeout(() => t.classList.add('out'), ms - 400);
    setTimeout(() => t.remove(), ms);
  }

  // ============================================================
  //  ESCENAS ANIMADAS (pantalla completa)
  // ============================================================
  const scv = $('splash-canvas'), sc = scv.getContext('2d');
  const Scene = { draw: null, t0: 0, timer: null, on: false };
  function scene(html, drawFn, ms) {
    $('splash-inner').innerHTML = html;
    $('splash').classList.remove('hidden');
    Scene.draw = drawFn; Scene.t0 = performance.now();
    clearTimeout(Scene.timer);
    if (ms) Scene.timer = setTimeout(hideScene, ms);
    if (!Scene.on) { Scene.on = true; requestAnimationFrame(sceneLoop); }
  }
  function hideScene() {
    clearTimeout(Scene.timer);
    $('splash').classList.add('hidden');
    Scene.draw = null;
  }
  function sceneLoop(now) {
    if (!Scene.draw) { Scene.on = false; return; }
    const W = window.innerWidth, H = window.innerHeight, D = Math.min(2, window.devicePixelRatio || 1);
    if (scv.width !== W * D || scv.height !== H * D) { scv.width = W * D; scv.height = H * D; }
    sc.setTransform(D, 0, 0, D, 0, 0);
    Scene.draw(sc, (now - Scene.t0) / 1000, W, H);
    requestAnimationFrame(sceneLoop);
  }
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const back = (k) => { k = Math.min(1, Math.max(0, k)); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };

  function rays(c, W, H, t, color, cx, cy) {
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.4);
    c.fillStyle = color;
    for (let i = 0; i < 14; i++) {
      c.rotate(Math.PI * 2 / 14);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(W, H), -60); c.lineTo(Math.max(W, H), 60); c.closePath(); c.fill();
    }
    c.restore();
  }
  function typeInto(el, text, cps = 28, delay = 0) {
    el.textContent = '';
    el.classList.add('typed');
    let i = 0;
    setTimeout(function tick() {
      if (!el.isConnected) return;
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 1000 / cps);
      else setTimeout(() => el.classList.remove('typed'), 800);
    }, delay);
  }

  // Escena: revelar el rol
  function roleScene(isMal, myMeta, extraHtml) {
    const html = '<div class="spacer"></div><p class="kicker later">Tu rol secreto es…</p>' +
      '<h1 class="slam ' + (isMal ? 'malware' : 'defender') + '">' + (isMal ? '🦠 MALWARE' : '🛡️ DEFENSOR') + '</h1>' + extraHtml;
    scene(html, (c, t, W, H) => {
      const g = c.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H / 2, Math.max(W, H) * 0.8);
      g.addColorStop(0, isMal ? '#5c0f33' : '#0f4f45'); g.addColorStop(1, '#07031c');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      rays(c, W, H, t, isMal ? 'rgba(255,61,139,0.08)' : 'rgba(62,240,160,0.08)', W / 2, H / 2 - 120);
      const k = back(t / 0.8);
      c.save();
      c.translate(W / 2, H / 2 - 110 + (1 - ease(t / 0.8)) * 200);
      c.scale(3.4 * k, 3.4 * k);
      Robots.draw(c, 0, 0, { color: myMeta.color, variant: myMeta.variant, t, evil: isMal, face: 1, expr: isMal ? undefined : 'happy' });
      c.restore();
      if (isMal && Math.sin(t * 13) > 0.85) {
        // franjas de "glitch"
        for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,61,139,0.25)'; c.fillRect(0, Math.random() * H, W, 4 + Math.random() * 14); }
      }
    }, 5200);
  }

  // Escena: alarma antes de la reunión
  function alarmScene(d, then) {
    const isReport = d.reason === 'report';
    const html = '<div class="spacer"></div><h1 class="alarm-title">' + (isReport ? '📢 ¡ROBOT INFECTADO!' : '🚨 ¡ALERTA DE SEGURIDAD!') + '</h1>' +
      '<p class="later">' + (isReport
        ? '<b style="color:' + esc(d.callerColor) + '">' + esc(d.callerName) + '</b> encontró a <b style="color:' + esc(d.bodyColor) + '">' + esc(d.bodyName) + '</b> infectado'
        : '<b style="color:' + esc(d.callerColor) + '">' + esc(d.callerName) + '</b> llamó a reunión') + '</p>';
    scene(html, (c, t, W, H) => {
      c.fillStyle = '#1a0010'; c.fillRect(0, 0, W, H);
      // franjas de peligro que se desplazan
      c.save();
      c.globalAlpha = 0.35;
      for (let x = -200 + ((t * 160) % 80); x < W + 200; x += 80) {
        c.fillStyle = '#ffd23f';
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x - 60, 60); c.lineTo(x - 100, 60); c.fill();
        c.beginPath(); c.moveTo(x, H - 60); c.lineTo(x + 40, H - 60); c.lineTo(x - 60, H); c.lineTo(x - 100, H); c.fill();
      }
      c.restore();
      rays(c, W, H, t * 4, 'rgba(255,61,139,0.12)', W / 2, H / 2 - 110);
      const k = back(t / 0.5);
      c.save(); c.translate(W / 2 + (isReport ? -70 : 0), H / 2 - 110); c.scale(2.6 * k, 2.6 * k);
      Robots.draw(c, 0, 0, { color: d.callerColor, variant: d.callerVariant, t: t * 3, expr: 'shock', moving: true, face: 1 });
      c.restore();
      if (isReport) {
        c.save(); c.translate(W / 2 + 90, H / 2 - 80); c.scale(2.2 * k, 2.2 * k);
        Robots.drawDown(c, 0, 0, { color: d.bodyColor, variant: d.bodyVariant, t });
        c.restore();
      }
      if (Math.sin(t * 20) > 0) { c.fillStyle = 'rgba(255,0,60,0.12)'; c.fillRect(0, 0, W, H); }
    }, 1900);
    setTimeout(then, 1900);
  }

  // Escena: expulsión al espacio digital
  function ejectScene(d) {
    const ej = d.ejected;
    let title, sub;
    if (d.outcome === 'ejected') {
      title = ej.name + (ej.wasMalware ? ' ERA el malware.' : ' NO era el malware.');
      sub = ej.wasMalware ? '¡Buen trabajo, equipo! 🎉' : 'Expulsaron a un robot inocente… 😢';
    } else {
      title = 'Nadie fue expulsado.';
      sub = d.outcome === 'tie' ? 'Hubo un empate en la votación.' : d.outcome === 'skip' ? 'La mayoría no estaba segura.' : 'Nadie votó.';
    }
    const html = '<div class="spacer"></div><h1 id="eject-title"></h1><p class="later2">' + esc(sub) + '</p>' +
      '<p class="later2 muted">Queda' + (d.malwareLeft === 1 ? '' : 'n') + ' <b>' + d.malwareLeft + '</b> malware en la red.</p>';
    const stars = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));
    scene(html, (c, t, W, H) => {
      c.fillStyle = '#05021a'; c.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.x -= (0.002 + s.z * 0.006);
        if (s.x < 0) { s.x = 1; s.y = Math.random(); }
        c.fillStyle = 'rgba(200,220,255,' + (0.3 + s.z * 0.7) + ')';
        c.fillRect(s.x * W, s.y * H, 2 + s.z * 8, 2);
      }
      if (ej) {
        const k = Math.min(1, t / 5);
        c.save();
        c.translate(-80 + (W + 160) * k, H / 2 - 120 + Math.sin(t * 2) * 30);
        c.rotate(t * 2.2);
        c.scale(2.2, 2.2);
        Robots.draw(c, 0, 0, { color: ej.color, variant: ej.variant, t, expr: 'shock', evil: ej.wasMalware && t > 2 });
        c.restore();
      }
    }, 0);
    typeInto($('eject-title'), title, 24, 300);
    const el = $('eject-title');
    if (d.outcome === 'ejected') el.className = ej.wasMalware ? 'good' : 'bad';
    if (d.outcome === 'ejected' && ej.wasMalware) setTimeout(() => FX.confetti(90), 1800);
  }

  // Escena: te infectaron
  function infectedScene(d) {
    const html = '<div class="spacer"></div><h1 class="slam malware">¡TE INFECTARON!</h1>' +
      '<p class="later">Fue <b style="color:' + esc(d.byColor) + '">' + esc(d.byName) + '</b>. Ya sabes quién es el malware… pero los fantasmas no pueden hablar con los vivos.</p>' +
      '<p class="later2">👻 Ahora eres un fantasma: <b>tus misiones todavía suben el escudo</b>. ¡Sigue ayudando!</p>';
    scene(html, (c, t, W, H) => {
      c.fillStyle = '#0d0420'; c.fillRect(0, 0, W, H);
      // estática de pantalla
      for (let i = 0; i < 260; i++) {
        c.fillStyle = Math.random() > 0.5 ? 'rgba(62,240,160,0.18)' : 'rgba(255,255,255,0.07)';
        c.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 20, 2 + Math.random() * 3);
      }
      c.save(); c.translate(W / 2, H / 2 - 110); c.scale(2.8, 2.8);
      if (t < 0.7) Robots.draw(c, (Math.random() - 0.5) * 4, 0, { color: d.myColor, variant: d.myVariant, t, expr: 'shock' });
      else Robots.drawDown(c, 0, 0, { color: d.myColor, variant: d.myVariant, t });
      c.restore();
    }, 6500);
  }

  // ============================================================
  //  INICIO (con robot animado)
  // ============================================================
  try { $('in-name').value = localStorage.getItem('rs-name') || ''; } catch (e) { /* sin almacenamiento */ }
  const hero = $('hero-bot'), hc = hero.getContext('2d');
  const HERO_COLORS = ['#3a86ff', '#ff3d8b', '#3ef0a0', '#ffd23f', '#a78bfa', '#ff8c42'];
  (function heroLoop(now) {
    if (S.phase === 'home') {
      const t = now / 1000;
      const idx = Math.floor(t / 2.5) % 6;
      const k = (t % 2.5) / 2.5;
      hero.width = 220; hero.height = 200;
      hc.save();
      hc.translate(110, 120);
      const pop = k < 0.12 ? back(k / 0.12) : 1;
      hc.scale(2.4 * pop, 2.4 * pop);
      Robots.draw(hc, 0, 0, { color: HERO_COLORS[idx], variant: idx, t, face: Math.sin(t * 0.8) > 0 ? 1 : -1, expr: k > 0.5 && k < 0.7 ? 'happy' : undefined });
      hc.restore();
    }
    requestAnimationFrame(heroLoop);
  })(0);

  function getName() {
    const n = $('in-name').value.trim();
    if (!n) { $('home-error').textContent = 'Primero ponle nombre a tu robot 🙂'; $('in-name').focus(); return null; }
    try { localStorage.setItem('rs-name', n); } catch (e) { /* nada */ }
    return n;
  }
  $('btn-create').onclick = () => {
    const name = getName(); if (!name) return;
    socket.emit('createRoom', { name }, (r) => { if (r.ok) enterLobby(r); });
  };
  $('btn-join').onclick = () => {
    const name = getName(); if (!name) return;
    const code = $('in-code').value.trim().toUpperCase();
    if (code.length !== 4) { $('home-error').textContent = 'El código tiene 4 letras. Pídeselo a quien creó la sala.'; return; }
    socket.emit('joinRoom', { name, code }, (r) => {
      if (!r.ok) { $('home-error').textContent = r.error; return; }
      enterLobby(r);
    });
  };
  $('in-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });
  $('in-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
  $('in-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-create').click(); });

  function enterLobby(r) {
    S.myId = r.id; S.code = r.code;
    $('home-error').textContent = '';
    $('lobby-chat-log').innerHTML = '';
    S.phase = 'lobby';
    lobbyIds = '';
    showScreen('lobby');
  }

  // ============================================================
  //  SALA DE ESPERA
  // ============================================================
  let lobbyIds = '';
  let lobbyBots = []; // {canvas, id}
  socket.on('lobby', (d) => {
    S.code = d.code; S.hostId = d.hostId;
    if (S.phase !== 'lobby') {
      S.phase = 'lobby';
      lobbyIds = '';
      $('gameover').classList.add('hidden');
      $('meeting').classList.add('hidden');
      hideScene();
      Tasks.close();
      showScreen('lobby');
    }
    $('lobby-code').textContent = d.code;
    $('lobby-count').textContent = d.players.length + ' / 12';
    d.players.forEach((p) => S.meta.set(p.id, { name: p.name, color: p.color, variant: p.variant }));

    // Solo se reconstruye la lista si alguien entró o salió (así no se repite la animación)
    const ids = d.players.map((p) => p.id + (p.id === d.hostId ? '*' : '')).join(',');
    if (ids !== lobbyIds) {
      const prev = new Set(lobbyIds.split(',').map((x) => x.replace('*', '')));
      lobbyIds = ids;
      const box = $('lobby-players');
      box.innerHTML = '';
      lobbyBots = [];
      d.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'lobby-player' + (p.id === S.myId ? ' me' : '');
        if (prev.has(p.id)) div.style.animation = 'none';
        else div.style.animationDelay = (i * 0.05) + 's';
        const cv = document.createElement('canvas');
        cv.width = 160; cv.height = 160;
        const name = document.createElement('span');
        name.textContent = p.name + (p.id === d.hostId ? ' 👑' : '') + (p.id === S.myId ? ' (tú)' : '');
        const acc = document.createElement('span');
        acc.className = 'acc';
        div.append(cv, name, acc);
        if (p.id === S.myId) {
          div.title = 'Cambiar accesorio';
          div.onclick = () => {
            socket.emit('setVariant', (meta(S.myId).variant + 1) % Robots.VARIANTS.length);
            FX.popAt(div.getBoundingClientRect().left + 50, div.getBoundingClientRect().top + 40, 16);
          };
        }
        box.append(div);
        lobbyBots.push({ canvas: cv, id: p.id, acc });
      });
      if (prev.size > 1 && d.players.length > prev.size - (prev.has('') ? 1 : 0)) toast('🤖 ¡Llegó un robot nuevo!', 'success', 2200);
    }
    lobbyBots.forEach((b) => { b.acc.textContent = Robots.VARIANTS[meta(b.id).variant] || ''; });

    const isHost = d.hostId === S.myId;
    $('btn-start').style.display = isHost ? '' : 'none';
    $('lobby-wait').style.display = isHost ? 'none' : '';
    const enough = d.players.length >= d.minPlayers;
    $('btn-start').disabled = !enough;
    $('btn-start').textContent = enough ? '🚀 ¡Arrancar la partida!' : 'Faltan robots: mínimo ' + d.minPlayers + ' (hay ' + d.players.length + ')';
  });
  // Animar los robots de la sala de espera
  (function lobbyLoop(now) {
    if (S.phase === 'lobby') {
      const t = now / 1000;
      for (const b of lobbyBots) {
        const m = meta(b.id);
        Robots.avatar(b.canvas, { color: m.color, variant: m.variant, t, seed: seedOf(b.id), face: Math.sin(t * 0.5 + seedOf(b.id)) > 0 ? 1 : -1 }, 1.75);
      }
    }
    requestAnimationFrame(lobbyLoop);
  })(0);

  $('btn-start').onclick = () => socket.emit('startGame');
  $('btn-leave').onclick = () => { socket.emit('leaveRoom'); S.phase = 'home'; showScreen('home'); };
  $('btn-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(S.code); toast('📋 Código copiado: ' + S.code, 'success', 2000); }
    catch (e) { toast('Código: ' + S.code, null, 2500); }
  };
  $('lobby-chat-form').onsubmit = (e) => {
    e.preventDefault();
    const t = $('lobby-chat-in').value.trim();
    if (t) socket.emit('chat', { text: t });
    $('lobby-chat-in').value = '';
  };

  // ============================================================
  //  INICIO DE PARTIDA
  // ============================================================
  socket.on('gameStart', (d) => {
    S.phase = 'playing';
    S.role = d.role;
    S.fellow = new Set(d.fellowMalware);
    S.meta.clear();
    d.players.forEach((p) => S.meta.set(p.id, { name: p.name, color: p.color, variant: p.variant }));
    S.others.clear();
    S.me = { x: d.x, y: d.y, alive: true, face: 1, moving: false };
    S.tasks = d.tasks.map((id) => ({ id, done: false }));
    S.bodies = []; S.progress = 0; S.sabotage = null; S.emergencyUsed = false;
    knownBodies = new Set();
    lastSent = { x: d.x, y: d.y, t: 0 };
    hudKey = '';
    $('gameover').classList.add('hidden');
    $('meeting').classList.add('hidden');
    showScreen('game');
    resize();
    $('task-panel').classList.toggle('collapsed', window.innerWidth < 760);

    const isMal = d.role === 'malware';
    const extra = isMal
      ? '<p class="later">Infecta robots sin que te vean. Finge hacer misiones, usa los <b>puertos secretos</b> 🕳️ y lanza <b>ataques</b> ⚡.</p>' +
        (d.fellowMalware.length ? '<p class="later2">Tu compañero de virus: <b style="color:' + esc(colorOf(d.fellowMalware[0])) + '">' + esc(d.fellowMalware.map(nameOf).join(', ')) + '</b></p>' : '')
      : '<p class="later">Cumple tus misiones para subir el escudo de la red.</p><p class="later2">Cuidado: hay <b>' + d.malwareCount + '</b> malware escondido entre ustedes 👀</p>';
    roleScene(isMal, meta(S.myId), extra);
  });

  // ============================================================
  //  ESTADO DEL JUEGO
  // ============================================================
  let knownBodies = new Set();
  let lastProgress = 0;
  socket.on('state', (d) => {
    const seen = new Set();
    for (const p of d.players) {
      seen.add(p.id);
      if (p.id === S.myId) continue;
      let o = S.others.get(p.id);
      if (!o) { o = { x: p.x, y: p.y, tx: p.x, ty: p.y, face: 1, moving: false }; S.others.set(p.id, o); }
      if (Math.abs(p.x - o.tx) > 0.5) o.face = p.x > o.tx ? 1 : -1;
      o.moving = Math.hypot(p.x - o.tx, p.y - o.ty) > 1;
      o.tx = p.x; o.ty = p.y; o.alive = p.alive;
    }
    for (const id of [...S.others.keys()]) if (!seen.has(id)) S.others.delete(id);
    S.bodies = d.bodies;
    for (const b of d.bodies) if (!knownBodies.has(b.id)) knownBodies.add(b.id);
    if (d.progress > lastProgress + 0.001) {
      const n = $('progress-num');
      n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
    }
    lastProgress = d.progress;
    S.progress = d.progress;
    const hadSab = S.sabotage;
    S.sabotage = d.sabotage;
    S.sabotageAt = performance.now();
    S.tasks = d.me.tasks;
    S.infectIn = d.me.infectIn;
    S.sabotageIn = d.me.sabotageIn;
    S.stateAt = performance.now();
    S.emergencyUsed = d.me.emergencyUsed;
    if (S.me.alive && !d.me.alive) S.me.alive = false;
    if (hadSab && !d.sabotage && (Tasks.openId() === 'ddos' || Tasks.openId() === 'key')) Tasks.close();
  });

  socket.on('teleport', (d) => { S.me.x = d.x; S.me.y = d.y; lastSent = { x: d.x, y: d.y, t: performance.now() }; });

  // Efectos que manda el servidor (misiones, infecciones, puertos)
  socket.on('fx', (f) => {
    if (S.phase !== 'playing') return;
    if (f.type === 'task') {
      FX.burst(f.x, f.y - 20, { n: 26, speed: 220, up: 120, colors: ['#3ef0a0', '#7ff6ff', '#ffd23f'] });
      FX.text(f.x, f.y - 50, '+ escudo', '#3ef0a0');
    } else if (f.type === 'infect') {
      FX.burst(f.x, f.y, { n: 40, speed: 200, colors: ['#3ef0a0', '#1fae6a', '#b6ffd9'], shape: 'circle', gravity: -40 });
      FX.burst(f.x, f.y, { n: 14, speed: 120, shape: 'bit', colors: ['#3ef0a0'], gravity: -60, life: 1.4 });
      if (Math.hypot(f.x - S.me.x, f.y - S.me.y) < 500) FX.addShake(14);
    } else if (f.type === 'port') {
      FX.burst(f.x, f.y, { n: 18, speed: 140, colors: ['#ff3d8b', '#a78bfa'], shape: 'circle', gravity: -120 });
    }
  });

  socket.on('youWereInfected', (d) => {
    S.me.alive = false;
    Tasks.close();
    FX.addShake(22);
    infectedScene(d);
  });

  socket.on('playerLeft', (d) => { toast('👋 ' + d.name + ' se desconectó'); S.others.delete(d.id); });
  socket.on('toast', (m) => toast(m, 'danger'));

  // ---------- Sabotajes ----------
  socket.on('sabotageStart', (s) => {
    S.sabotage = s; S.sabotageAt = performance.now();
    $('sabotage-menu').classList.add('hidden');
    FX.addShake(10);
    if (s.type === 'ddos') toast('🌊 ¡ATAQUE DDoS! La red se está ahogando en tráfico falso. Corran a la Sala de Servidores.', 'danger', 5500);
    else toast('🔒 ¡RANSOMWARE! Necesitan dos robots en las llaves A y B al mismo tiempo. ¡Rápido!', 'danger', 5500);
  });
  socket.on('sabotageEnd', (d) => {
    S.sabotage = null;
    if (Tasks.openId() === 'ddos' || Tasks.openId() === 'key') Tasks.close();
    if (d.fixed) toast(d.type === 'ddos' ? '✅ ¡Ataque DDoS bloqueado! La red respira otra vez.' : '✅ ¡Ransomware detenido! Los archivos están a salvo.', 'success');
  });
  socket.on('keysUpdate', (keys) => { if (S.sabotage) S.sabotage.keys = keys; Tasks.updateKeys(keys); });

  // ============================================================
  //  ENTRADA (teclado, botones, joystick)
  // ============================================================
  const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement && document.activeElement.tagName);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { Tasks.close(); $('sabotage-menu').classList.add('hidden'); return; }
    if (typing()) return;
    const k = e.key.toLowerCase();
    keysDown.add(k);
    if (S.phase !== 'playing' || e.repeat) return;
    if (k === 'e') doUse();
    else if (k === 'r') doReport();
    else if (k === 'q') doInfect();
    else if (k === 'v') doPort();
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keysDown.clear());

  $('act-use').onclick = () => doUse();
  $('act-report').onclick = () => doReport();
  $('act-infect').onclick = () => doInfect();
  $('act-port').onclick = () => doPort();
  $('act-sabotage').onclick = () => $('sabotage-menu').classList.toggle('hidden');
  $('sab-close').onclick = () => $('sabotage-menu').classList.add('hidden');
  $('task-toggle').onclick = () => $('task-panel').classList.toggle('collapsed');
  document.querySelectorAll('[data-sab]').forEach((b) => b.onclick = () => {
    socket.emit('sabotage', { type: b.dataset.sab });
    $('sabotage-menu').classList.add('hidden');
  });

  // Joystick táctil
  if (window.matchMedia('(pointer: coarse)').matches) $('joystick').classList.remove('hidden');
  const joyEl = $('joystick'), knob = $('joystick-knob');
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2, len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    joy.x = dx / max; joy.y = dy / max;
  }
  joyEl.addEventListener('pointerdown', (e) => { joy.active = true; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (joy.active) joyMove(e); });
  const joyEnd = () => { joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);

  // ============================================================
  //  ACCIONES
  // ============================================================
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function useTarget() {
    const me = S.me;
    if (S.sabotage && me.alive) {
      if (S.sabotage.type === 'ddos' && d2(me, MAP.SPECIAL.ddos) < USE_R) return { type: 'ddos' };
      if (S.sabotage.type === 'ransomware') {
        if (d2(me, MAP.SPECIAL.keyA) < USE_R) return { type: 'key', key: 'A' };
        if (d2(me, MAP.SPECIAL.keyB) < USE_R) return { type: 'key', key: 'B' };
      }
    }
    if (me.alive && !S.emergencyUsed && !S.sabotage && d2(me, MAP.SPECIAL.emergency) < USE_R) return { type: 'emergency' };
    let best = null, bd = USE_R;
    for (const t of S.tasks) {
      if (t.done) continue;
      const dd = d2(me, MAP.STATIONS[t.id]);
      if (dd < bd) { bd = dd; best = { type: 'task', id: t.id }; }
    }
    return best;
  }
  function reportTarget() {
    if (!S.me.alive) return null;
    let best = null, bd = REPORT_R;
    for (const b of S.bodies) { const dd = d2(S.me, b); if (dd < bd) { bd = dd; best = b; } }
    return best;
  }
  function infectTarget() {
    if (S.role !== 'malware' || !S.me.alive) return null;
    let best = null, bd = INFECT_R;
    for (const [id, o] of S.others) {
      if (!o.alive || S.fellow.has(id)) continue;
      const dd = d2(S.me, o);
      if (dd < bd) { bd = dd; best = id; }
    }
    return best;
  }
  const portNear = () => S.role === 'malware' && S.me.alive && MAP.PORTS.some((p) => d2(S.me, p) < PORT_R);

  function doUse() {
    if (S.phase !== 'playing' || Tasks.isOpen()) return;
    const t = useTarget();
    if (!t) return;
    const m = meta(S.myId);
    const common = { playerName: m.name, color: m.color, variant: m.variant };
    if (t.type === 'emergency') socket.emit('emergency');
    else if (t.type === 'task') {
      Tasks.open(t.id, { ...common, onComplete: () => socket.emit('completeTask', { taskId: t.id }) });
    } else if (t.type === 'ddos') {
      Tasks.open('ddos', { ...common, sabotage: 'ddos', onComplete: () => socket.emit('fixDdos') });
    } else if (t.type === 'key') {
      Tasks.open('key', { ...common, sabotage: 'ransomware', key: t.key, keys: S.sabotage.keys, onHold: (v) => socket.emit('holdKey', { key: t.key, holding: v }) });
    }
  }
  function doReport() { const b = reportTarget(); if (b && S.phase === 'playing') socket.emit('report', { bodyId: b.id }); }
  function doInfect() { const id = infectTarget(); if (id && infectCooldown() <= 0) socket.emit('infect', { targetId: id }); }
  function doPort() { if (portNear()) socket.emit('usePort'); }
  const infectCooldown = () => Math.max(0, S.infectIn - (performance.now() - S.stateAt));
  const sabotageCooldown = () => Math.max(0, S.sabotageIn - (performance.now() - S.stateAt));

  // ============================================================
  //  HUD
  // ============================================================
  let prevDone = new Set();
  function renderTaskList() {
    const ul = $('task-list');
    ul.innerHTML = '';
    if (S.role === 'malware') {
      const li = document.createElement('li');
      li.className = 'fake';
      li.textContent = '🦠 Misiones FALSAS: finge que las haces';
      ul.append(li);
    }
    let done = 0;
    for (const t of S.tasks) {
      const info = TASK_INFO[t.id];
      const li = document.createElement('li');
      li.className = t.done ? 'done' + (!prevDone.has(t.id) ? ' just' : '') : '';
      if (t.done) done++;
      li.append(info.icon + ' ' + info.title + ' ');
      const sm = document.createElement('small');
      sm.textContent = '📍 ' + MAP.roomName(MAP.STATIONS[t.id].room);
      li.append(sm);
      ul.append(li);
    }
    prevDone = new Set(S.tasks.filter((t) => t.done).map((t) => t.id));
    $('task-count').textContent = done + '/' + S.tasks.length;
  }
  let hudKey = '';
  function setAct(id, on, ready) {
    const b = $(id);
    b.classList.toggle('off', !on);
    b.classList.toggle('ready', !!(on && ready));
  }
  function updateHud() {
    if (S.phase !== 'playing') return;
    const chip = $('role-chip');
    chip.className = 'role-chip ' + S.role;
    chip.textContent = S.role === 'malware' ? '🦠 Eres el MALWARE' : '🛡️ Eres DEFENSOR';
    const pct = Math.round(S.progress * 100);
    $('progress-bar').style.width = pct + '%';
    $('progress-num').textContent = pct + '%';

    const key = S.role + S.tasks.map((t) => t.done ? 1 : 0).join('');
    if (key !== hudKey) { hudKey = key; renderTaskList(); }

    const ut = useTarget();
    setAct('act-use', !!ut, true);
    $('act-use').querySelector('span').textContent = ut && ut.type === 'emergency' ? 'ALERTA' : ut && ut.type === 'key' ? 'LLAVE ' + ut.key : ut && ut.type === 'ddos' ? 'BLOQUEAR' : 'USAR';
    setAct('act-report', !!reportTarget(), true);
    $('act-report').classList.toggle('hidden', !S.me.alive);

    const isMal = S.role === 'malware' && S.me.alive;
    ['act-infect', 'act-port', 'act-sabotage'].forEach((id) => $(id).classList.toggle('hidden', !isMal));
    if (isMal) {
      const cd = infectCooldown();
      setAct('act-infect', cd <= 0 && !!infectTarget(), true);
      $('act-infect').querySelector('span').textContent = cd > 0 ? Math.ceil(cd / 1000) + ' s' : 'INFECTAR';
      setAct('act-port', portNear(), false);
      const scd = sabotageCooldown();
      setAct('act-sabotage', scd <= 0 && !S.sabotage, false);
      $('act-sabotage').querySelector('span').textContent = scd > 0 ? Math.ceil(scd / 1000) + ' s' : 'ATACAR';
      if (scd > 0 || S.sabotage) $('sabotage-menu').classList.add('hidden');
    }
    $('ghost-banner').classList.toggle('hidden', S.me.alive);

    const sb = $('sabotage-banner');
    if (S.sabotage) {
      sb.classList.remove('hidden');
      if (S.sabotage.type === 'ddos') {
        sb.textContent = '🌊 ¡ATAQUE DDoS! No se ve casi nada. Vayan a la Sala de Servidores y bloqueen el tráfico falso.';
      } else {
        const left = Math.max(0, Math.ceil((S.sabotage.remaining - (performance.now() - S.sabotageAt)) / 1000));
        const k = S.sabotage.keys || {};
        sb.textContent = '🔒 ¡RANSOMWARE! ' + left + ' s — Llave A en Base de Datos ' + (k.A ? '✅' : '⏳') + ' · Llave B en Nube y Backups ' + (k.B ? '✅' : '⏳');
      }
    } else sb.classList.add('hidden');
  }
  setInterval(updateHud, 100);

  // ============================================================
  //  MOVIMIENTO Y BUCLE PRINCIPAL
  // ============================================================
  let lastSent = { x: 0, y: 0, t: 0 };
  function canStand(x, y) {
    if (S.me.alive) return MAP.isWalkable(x, y);
    return x > 20 && y > 20 && x < MAP.WORLD.w - 20 && y < MAP.WORLD.h - 20;
  }
  function update(dt, now) {
    const me = S.me;
    let vx = 0, vy = 0;
    const blocked = Tasks.isOpen() || S.phase !== 'playing';
    if (!blocked) {
      if (keysDown.has('a') || keysDown.has('arrowleft')) vx -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) vx += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) vy -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) vy += 1;
      vx += joy.x; vy += joy.y;
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const sp = MAP.SPEED * dt;
    me.moving = len > 0.1;
    if (me.moving) {
      if (Math.abs(vx) > 0.1) me.face = vx > 0 ? 1 : -1;
      const nx = me.x + vx * sp;
      if (canStand(nx, me.y)) me.x = nx;
      const ny = me.y + vy * sp;
      if (canStand(me.x, ny)) me.y = ny;
      if (me.alive) FX.trail(me.x, me.y + 20);
    }
    if (S.phase === 'playing' && now - lastSent.t > 50 && (me.x !== lastSent.x || me.y !== lastSent.y)) {
      socket.emit('move', { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10 });
      lastSent = { x: me.x, y: me.y, t: now };
    }
    const k = 1 - Math.exp(-dt * 14);
    for (const o of S.others.values()) {
      o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
      if (o.moving && o.alive) FX.trail(o.x, o.y + 20);
    }
    FX.update(dt);
  }

  // ============================================================
  //  DIBUJO DEL MUNDO
  // ============================================================
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('minimap'), mctx = mini.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  window.addEventListener('resize', resize);
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  const ROOM = Object.fromEntries(MAP.ROOMS.map((r) => [r.id, r]));

  function drawName(x, y, text, color) {
    ctx.font = '800 14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(14,8,48,0.9)'; ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, x, y);
  }

  // Consola holográfica (estación de misión)
  function drawStation(x, y, icon, glow, t, alert) {
    const col = alert ? '#ff3d8b' : glow ? '#ffd23f' : '#7ff6ff';
    if (glow || alert) {
      const p = 0.5 + Math.sin(t * 5) * 0.5;
      ctx.strokeStyle = col; ctx.globalAlpha = 0.4 + p * 0.5; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y + 14, 34 + p * 8, 12 + p * 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // base
    rr(ctx, x - 22, y + 2, 44, 16, 6); ctx.fillStyle = '#120a3a'; ctx.fill();
    ctx.strokeStyle = '#5a4bc4'; ctx.lineWidth = 2; ctx.stroke();
    // haz del holograma
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 4);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col + '66');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 10, y + 4); ctx.lineTo(x + 10, y + 4); ctx.lineTo(x + 24, y - 40); ctx.lineTo(x - 24, y - 40); ctx.closePath(); ctx.fill();
    // pantalla flotante
    const fy = y - 46 + Math.sin(t * 2.5 + x) * 3;
    rr(ctx, x - 24, fy - 16, 48, 32, 7); ctx.fillStyle = 'rgba(14,8,48,0.85)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 24, fy - 16, 48, 32, 7); ctx.clip();
    ctx.fillStyle = col + '33';
    ctx.fillRect(x - 24, fy - 16 + ((t * 30 + x) % 32), 48, 3);
    ctx.restore();
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, fy + 1);
    ctx.textBaseline = 'alphabetic';
    if (glow || alert) {
      const by = fy - 30 - Math.abs(Math.sin(t * 4)) * 8;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x - 8, by - 6); ctx.lineTo(x + 8, by - 6); ctx.lineTo(x, by + 4); ctx.closePath(); ctx.fill();
    }
  }

  // Decoración animada de cada sala (solo visual, no choca)
  function drawDecor(t) {
    // Servidores: racks con luces
    for (let i = 0; i < 3; i++) {
      const x = 345 + i * 52, y = 160;
      rr(ctx, x, y, 40, 64, 5); ctx.fillStyle = '#0c0730'; ctx.fill(); ctx.strokeStyle = '#4b37b8'; ctx.lineWidth = 2; ctx.stroke();
      for (let r = 0; r < 5; r++) for (let l = 0; l < 3; l++) {
        const on = Math.sin(t * (3 + l) + i * 7 + r * 3) > 0;
        ctx.fillStyle = on ? (l === 2 ? '#ffd23f' : '#3ef0a0') : '#1d1555';
        ctx.fillRect(x + 7 + l * 10, y + 8 + r * 11, 5, 4);
      }
    }
    // Correo: sobres volando
    const c = ROOM.correo;
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.25 + i / 4) % 1);
      const x = c.x + 30 + k * (c.w - 60), y = c.y + 60 + Math.sin(k * Math.PI * 4 + i) * 20 + (i % 2) * 40;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * 0.2);
      ctx.fillStyle = '#f6f4ff'; ctx.fillRect(-11, -7, 22, 14);
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(0, 2); ctx.lineTo(11, -7); ctx.stroke();
      ctx.restore();
    }
    // Wi-Fi: torre con ondas
    const tx = 1850, ty = 330;
    ctx.strokeStyle = '#7ff6ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx - 16, ty + 60); ctx.lineTo(tx, ty); ctx.lineTo(tx + 16, ty + 60); ctx.moveTo(tx - 10, ty + 35); ctx.lineTo(tx + 10, ty + 35); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, 10 + k * 60, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Recepción: plantas
    for (const [px, py] of [[1030, 630], [1370, 630], [1370, 890]]) {
      rr(ctx, px - 12, py, 24, 20, 5); ctx.fillStyle = '#ff8c42'; ctx.fill();
      ctx.fillStyle = '#3ef0a0';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5 + Math.sin(t * 1.5 + i) * 0.08;
        ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 12, py - 2 + Math.sin(a) * 12, 10, 5, a, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Base de datos: cilindros con anillos que giran
    for (let i = 0; i < 2; i++) {
      const x = 530 + i * 50, y = 1270;
      for (let j = 2; j >= 0; j--) {
        ctx.fillStyle = j === 0 ? '#a78bfa' : '#6d4fd6';
        ctx.fillRect(x - 18, y - j * 16 - 8, 36, 16);
        ctx.beginPath(); ctx.ellipse(x, y - j * 16 - 8, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#120a3a'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      const k = (t * 0.8 + i * 0.5) % 1;
      ctx.strokeStyle = 'rgba(127,246,255,' + (1 - k) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 8 - k * 50, 24, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Laboratorio: tubos con burbujas
    for (let i = 0; i < 3; i++) {
      const x = 1160 + i * 30, y = 1180;
      rr(ctx, x - 8, y, 16, 46, 8); ctx.fillStyle = 'rgba(127,246,255,0.15)'; ctx.fill(); ctx.strokeStyle = '#7ff6ff'; ctx.lineWidth = 2; ctx.stroke();
      const col = ['#3ef0a0', '#ff3d8b', '#ffd23f'][i];
      rr(ctx, x - 6, y + 20, 12, 24, 6); ctx.fillStyle = col; ctx.fill();
      for (let b = 0; b < 3; b++) {
        const k = (t * 0.9 + b / 3 + i * 0.2) % 1;
        ctx.fillStyle = col; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(x + Math.sin(k * 8 + b) * 3, y + 20 - k * 40, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Nube: nube flotante con flechas subiendo
    const cx = 1880, cy = 1300 + Math.sin(t * 1.5) * 5;
    ctx.fillStyle = '#e8ecff';
    for (const [ox, oy, r] of [[-22, 4, 16], [0, -6, 22], [24, 4, 16], [0, 8, 18]]) { ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.8 + i / 3) % 1;
      ctx.fillStyle = 'rgba(58,134,255,' + (1 - k) + ')';
      const ax = cx - 20 + i * 20, ay = cy + 60 - k * 40;
      ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax - 7, ay); ctx.closePath(); ctx.fill();
    }
  }

  // Paquetes de datos viajando por los pasillos
  function drawPackets(t) {
    MAP.CORRIDORS.forEach((r, i) => {
      const horiz = r.w > r.h;
      const len = horiz ? r.w : r.h;
      ctx.strokeStyle = 'rgba(127,246,255,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]);
      ctx.beginPath();
      if (horiz) { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); }
      else { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); }
      ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 3; k++) {
        const dir = i % 2 ? 1 : -1;
        let p = ((t * 90 * dir + k * len / 3 + i * 37) % len + len) % len;
        const x = horiz ? r.x + p : r.x + r.w / 2, y = horiz ? r.y + r.h / 2 : r.y + p;
        const col = (k + i) % 3 === 0 ? '#ffd23f' : '#7ff6ff';
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.shadowBlur = 0;
      }
    });
  }

  function drawMap(t) {
    // Profundidad + paredes
    ctx.fillStyle = '#05021a';
    for (const r of MAP.WALKABLE) { rr(ctx, r.x - 16, r.y - 6, r.w + 32, r.h + 30, 18); ctx.fill(); }
    ctx.fillStyle = '#4b37b8';
    for (const r of MAP.WALKABLE) { rr(ctx, r.x - 14, r.y - 14, r.w + 28, r.h + 28, 16); ctx.fill(); }
    ctx.fillStyle = '#2c1f80';
    for (const r of MAP.WALKABLE) { rr(ctx, r.x - 6, r.y - 6, r.w + 12, r.h + 12, 12); ctx.fill(); }
    // Pisos
    ctx.fillStyle = '#1b1150';
    for (const r of MAP.CORRIDORS) ctx.fillRect(r.x, r.y, r.w, r.h);
    for (const r of MAP.ROOMS) { rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = r.floor; ctx.fill(); }
    // Pistas de circuito en el piso
    ctx.save();
    ctx.beginPath();
    for (const r of MAP.WALKABLE) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < MAP.WORLD.w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, MAP.WORLD.h); }
    for (let y = 0; y < MAP.WORLD.h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(MAP.WORLD.w, y); }
    ctx.stroke();
    ctx.restore();
    drawPackets(t);
    // Nombres de salas
    ctx.font = '22px "Russo One", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (const r of MAP.ROOMS) ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h - 16);

    drawDecor(t);

    // Puertos secretos
    for (const p of MAP.PORTS) {
      const mal = S.role === 'malware' && S.me.alive;
      ctx.fillStyle = '#05021a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 24, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = mal ? 'rgba(255,61,139,' + (0.6 + Math.sin(t * 5) * 0.4) + ')' : '#4b37b8'; ctx.lineWidth = 3; ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -12; i <= 12; i += 6) { ctx.moveTo(p.x + i, p.y - 10); ctx.lineTo(p.x + i, p.y + 10); }
      ctx.stroke();
    }

    // Botón de alerta
    const e = MAP.SPECIAL.emergency;
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    ctx.fillStyle = '#120a3a'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d2c9c'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 36, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,61,139,' + (0.15 + pulse * 0.25) + ')';
    ctx.beginPath(); ctx.arc(e.x, e.y - 6, 26 + pulse * 6, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(e.x - 5, e.y - 12, 2, e.x, e.y - 6, 18);
    g.addColorStop(0, '#ff9ab8'); g.addColorStop(1, '#d1124f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y - 6, 16, Math.PI, 0); ctx.lineTo(e.x + 16, e.y); ctx.lineTo(e.x - 16, e.y); ctx.fill();
    ctx.font = '13px "Russo One", sans-serif'; ctx.fillStyle = '#ffc2d8'; ctx.fillText('ALERTA', e.x, e.y + 44);

    // Estaciones de misión
    const pending = new Set(S.tasks.filter((x) => !x.done).map((x) => x.id));
    for (const id in MAP.STATIONS) {
      const st = MAP.STATIONS[id];
      drawStation(st.x, st.y, TASK_INFO[id].icon, pending.has(id), t, false);
    }
    // Puntos para frenar ataques
    const sab = S.sabotage;
    drawStation(MAP.SPECIAL.ddos.x, MAP.SPECIAL.ddos.y, '🌊', false, t, sab && sab.type === 'ddos');
    drawStation(MAP.SPECIAL.keyA.x, MAP.SPECIAL.keyA.y, '🗝️', false, t, sab && sab.type === 'ransomware' && !sab.keys.A);
    drawStation(MAP.SPECIAL.keyB.x, MAP.SPECIAL.keyB.y, '🗝️', false, t, sab && sab.type === 'ransomware' && !sab.keys.B);
    ctx.font = '12px "Russo One", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('LLAVE A', MAP.SPECIAL.keyA.x, MAP.SPECIAL.keyA.y + 36);
    ctx.fillText('LLAVE B', MAP.SPECIAL.keyB.x, MAP.SPECIAL.keyB.y + 36);
  }

  function render(t) {
    const me = S.me;
    const zoom = Math.max(W < 760 ? 0.68 : 0.5, Math.min(1.25, Math.min(W / 1150, H / 720)));
    const sh = FX.getShake();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#07031c';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + sh.x, H / 2 + sh.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-me.x, -me.y);

    drawMap(t);

    const ddosOn = S.sabotage && S.sabotage.type === 'ddos' && S.role !== 'malware';
    const vision = !me.alive ? 99999 : ddosOn ? 120 : 360;

    for (const b of S.bodies) if (d2(me, b) < vision + 40) Robots.drawDown(ctx, b.x, b.y, { color: b.color, variant: b.variant, t });

    const list = [];
    for (const [id, o] of S.others) if (!me.alive || d2(me, o) < vision + 30) list.push({ id, x: o.x, y: o.y, face: o.face, moving: o.moving, alive: o.alive });
    list.push({ id: S.myId, x: me.x, y: me.y, face: me.face, moving: me.moving, alive: me.alive });
    list.sort((a, b) => a.y - b.y);
    FX.draw(ctx);
    for (const p of list) {
      const m = meta(p.id);
      const ally = S.role === 'malware' && (S.fellow.has(p.id) || p.id === S.myId);
      Robots.draw(ctx, p.x, p.y, { color: m.color, variant: m.variant, face: p.face, t, moving: p.moving, ghost: !p.alive, evil: ally, seed: seedOf(p.id) });
      drawName(p.x, p.y - 62, m.name + (p.alive ? '' : ' 👻'), ally ? '#ff7aa8' : '#fff');
    }
    ctx.restore();

    // Oscuridad fuera de la visión
    if (me.alive) {
      const R = vision * zoom;
      const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.55, W / 2, H / 2, R);
      g.addColorStop(0, 'rgba(7,3,28,0)');
      g.addColorStop(1, ddosOn ? 'rgba(40,0,20,0.96)' : 'rgba(7,3,28,0.88)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (S.sabotage) {
      // luz de sirena girando
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(t * 3);
      const g = ctx.createLinearGradient(0, 0, Math.max(W, H), 0);
      g.addColorStop(0, 'rgba(255,61,139,0.18)'); g.addColorStop(1, 'rgba(255,61,139,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.max(W, H), -0.25, 0.25); ctx.closePath(); ctx.fill();
      ctx.restore();
      const a = 0.3 + Math.sin(t * 6) * 0.2;
      ctx.strokeStyle = 'rgba(255,61,139,' + a + ')';
      ctx.lineWidth = 16;
      ctx.strokeRect(0, 0, W, H);
      if (ddosOn) {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,61,139,0.08)'; ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6); }
      }
      drawArrows(zoom, t);
    }
    drawMinimap(t);
  }

  // Flechas en el borde de la pantalla apuntando a dónde frenar el ataque
  function drawArrows(zoom, t) {
    if (!S.me.alive) return;
    const pts = S.sabotage.type === 'ddos' ? [MAP.SPECIAL.ddos] : [MAP.SPECIAL.keyA, MAP.SPECIAL.keyB];
    for (const p of pts) {
      const dx = (p.x - S.me.x) * zoom, dy = (p.y - S.me.y) * zoom;
      if (Math.abs(dx) < W / 2 - 40 && Math.abs(dy) < H / 2 - 40) continue;
      const ang = Math.atan2(dy, dx);
      const m = Math.min((W / 2 - 50) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - 50) / Math.abs(Math.sin(ang) || 1e-6)) - Math.abs(Math.sin(t * 6)) * 10;
      const x = W / 2 + Math.cos(ang) * m, y = H / 2 + Math.sin(ang) * m;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = '#ff3d8b'; ctx.shadowColor = '#ff3d8b'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-12, -16); ctx.lineTo(-5, 0); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawMinimap(t) {
    const s = mini.width / MAP.WORLD.w;
    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.fillStyle = '#4b37b8';
    for (const r of MAP.WALKABLE) mctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
    const pending = S.tasks.filter((x) => !x.done);
    const pulse = 3 + Math.sin(t * 5) * 1;
    mctx.fillStyle = '#ffd23f';
    for (const tk of pending) { const st = MAP.STATIONS[tk.id]; mctx.beginPath(); mctx.arc(st.x * s, st.y * s, pulse, 0, Math.PI * 2); mctx.fill(); }
    if (S.sabotage && Math.sin(t * 8) > 0) {
      mctx.fillStyle = '#ff3d8b';
      const pts = S.sabotage.type === 'ddos' ? [MAP.SPECIAL.ddos] : [MAP.SPECIAL.keyA, MAP.SPECIAL.keyB];
      for (const p of pts) { mctx.beginPath(); mctx.arc(p.x * s, p.y * s, 6, 0, Math.PI * 2); mctx.fill(); }
    }
    mctx.fillStyle = colorOf(S.myId);
    mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(S.me.x * s, S.me.y * s, 5, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (S.phase === 'playing' || S.phase === 'meeting' || S.phase === 'result') {
      update(dt, now);
      render(now / 1000);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ============================================================
  //  REUNIONES
  // ============================================================
  const M = { players: [], stars: new Set(), voted: new Set(), selected: null, myVote: false, cards: [] };

  function startTimer(ms) {
    const el = $('meeting-timer');
    el.style.transition = 'none';
    el.style.width = '100%';
    void el.offsetWidth;
    el.style.transition = 'width ' + ms + 'ms linear';
    el.style.width = '0%';
  }
  function addChat(logId, m) {
    const log = $(logId);
    const div = document.createElement('div');
    div.className = 'msg' + (m.ghost ? ' ghost' : '') + (m.system ? ' system' : '');
    if (!m.system) {
      const b = document.createElement('b');
      b.textContent = (m.ghost ? '👻 ' : '') + m.name + ': ';
      b.style.color = m.color;
      div.append(b);
    }
    div.append(document.createTextNode(m.text));
    log.append(div);
    log.scrollTop = log.scrollHeight;
  }
  socket.on('chat', (m) => addChat(S.phase === 'lobby' || S.phase === 'ended' ? 'lobby-chat-log' : 'chat-log', m));

  QUICK_PHRASES.forEach((q) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = q;
    b.onclick = () => socket.emit('chat', { text: q });
    $('quick-phrases').append(b);
  });
  $('chat-form').onsubmit = (e) => {
    e.preventDefault();
    const t = $('chat-in').value.trim();
    if (t) socket.emit('chat', { text: t });
    $('chat-in').value = '';
  };

  socket.on('meetingStart', (d) => {
    S.phase = 'meeting';
    Tasks.close();
    keysDown.clear();
    $('sabotage-menu').classList.add('hidden');
    S.sabotage = null;
    M.players = d.players; M.stars = new Set(); M.voted = new Set(); M.selected = null; M.myVote = false;
    d.players.forEach((p) => { const m = S.meta.get(p.id); if (m) m.variant = p.variant; });
    const caller = '<b style="color:' + esc(d.callerColor) + '">' + esc(d.callerName) + '</b>';
    $('meeting-head').innerHTML = d.reason === 'report'
      ? '📢 ' + caller + ' encontró a <b style="color:' + esc(d.bodyColor) + '">' + esc(d.bodyName) + '</b> infectado'
      : '🚨 ' + caller + ' activó la alerta de seguridad';
    $('chat-log').innerHTML = '';
    addChat('chat-log', { system: true, text: S.me.alive ? '💡 Primero la pregunta: si aciertas, tu voto vale doble.' : '👻 Eres un fantasma: solo te leen otros fantasmas.' });

    const qb = $('quiz-box');
    qb.innerHTML = '';
    qb.classList.remove('hidden');
    const tag = document.createElement('span');
    tag.className = 'q-tag';
    tag.textContent = '⭐ Pregunta de voto doble';
    const h = document.createElement('h3');
    h.textContent = d.question.text;
    qb.append(tag, h);
    const opts = document.createElement('div');
    opts.className = 'quiz-options';
    d.question.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'btn option';
      b.textContent = ['🅰️', '🅱️', '🅲', '🅳'][i] + '  ' + o;
      b.disabled = !S.me.alive;
      b.onclick = () => { socket.emit('quizAnswer', { index: i }); opts.querySelectorAll('button').forEach((x) => (x.disabled = true)); b.classList.add('picked'); };
      opts.append(b);
    });
    qb.append(opts);
    const fb = document.createElement('p');
    fb.id = 'quiz-fb';
    fb.className = 'feedback';
    if (!S.me.alive) fb.textContent = 'Los fantasmas no responden, pero pueden aprender 😉';
    qb.append(fb);
    $('vote-box').classList.add('hidden');
    buildVoteGrid();
    FX.addShake(12);
    alarmScene(d, () => {
      if (S.phase !== 'meeting') return;
      hideScene();
      const card = document.querySelector('.meeting-card');
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      $('meeting').classList.remove('hidden');
    });
    startTimer(d.duration);
  });

  socket.on('quizResult', (r) => {
    const opts = document.querySelectorAll('#quiz-box .quiz-options button');
    opts.forEach((b, i) => { if (i === r.correctIndex) b.classList.add('right'); else if (b.classList.contains('picked')) b.classList.add('wrong'); });
    const fb = $('quiz-fb');
    fb.className = 'feedback ' + (r.correct ? 'good' : 'bad');
    fb.textContent = (r.correct ? '¡Correcto! ⭐ Tu voto vale doble. ' : 'Esta vez no. ') + r.explanation;
    if (r.correct) { const b = opts[r.correctIndex].getBoundingClientRect(); FX.popAt(b.left + b.width / 2, b.top, 40); }
  });

  socket.on('votingStart', (d) => {
    M.stars = new Set(d.stars);
    $('quiz-box').classList.add('hidden');
    $('vote-box').classList.remove('hidden');
    $('vote-status').textContent = S.me.alive ? 'Toca a un robot y presiona Votar.' : 'Los fantasmas no votan 👻';
    $('btn-skip').disabled = !S.me.alive;
    buildVoteGrid();
    startTimer(d.duration);
  });

  socket.on('voted', (d) => { M.voted.add(d.voterId); refreshVoteGrid(); });

  // Tarjetas de voto con robots animados
  function buildVoteGrid() {
    const grid = $('vote-grid');
    grid.innerHTML = '';
    M.cards = [];
    M.players.forEach((p, i) => {
      const card = document.createElement('button');
      card.className = 'vote-card';
      card.style.animationDelay = (i * 0.04) + 's';
      const av = document.createElement('canvas');
      av.width = 108; av.height = 120;
      const nm = document.createElement('span');
      nm.className = 'vname';
      card.append(av, nm);
      card.onclick = () => { M.selected = p.id; refreshVoteGrid(); };
      grid.append(card);
      M.cards.push({ p, card, av, nm });
    });
    refreshVoteGrid();
  }
  function refreshVoteGrid(tally) {
    const counts = new Map();
    if (tally) tally.forEach((t) => counts.set(t.target, t));
    for (const { p, card, nm } of M.cards) {
      card.className = 'vote-card' + (p.alive ? '' : ' dead') + (M.selected === p.id ? ' sel' : '');
      nm.textContent = p.name + (p.id === S.myId ? ' (tú)' : '') + (M.stars.has(p.id) ? ' ⭐' : '');
      card.querySelectorAll('.badge,.dots').forEach((x) => x.remove());
      if (M.voted.has(p.id)) { const v = document.createElement('span'); v.className = 'badge'; v.textContent = '✔ votó'; card.append(v); }
      const t = counts.get(p.id);
      if (t) {
        const dots = document.createElement('div'); dots.className = 'dots';
        t.voters.forEach((vid, i) => { const dot = document.createElement('i'); dot.style.background = colorOf(vid); dot.style.animationDelay = (i * 0.15) + 's'; dots.append(dot); });
        card.append(dots);
      }
      card.disabled = !!tally || !p.alive || !S.me.alive || M.myVote;
    }
    $('btn-vote').disabled = !M.selected || M.myVote || !!tally;
    if (tally) {
      const sk = counts.get('skip');
      $('vote-status').textContent = 'No estaban seguros: ' + (sk ? sk.voters.length : 0);
    }
  }
  (function voteLoop(now) {
    if (!$('meeting').classList.contains('hidden')) {
      const t = now / 1000;
      for (const { p, av } of M.cards) {
        const sel = M.selected === p.id;
        Robots.avatar(av, { color: p.color, variant: p.variant, t, ghost: !p.alive, expr: !p.alive ? 'x' : sel ? 'shock' : undefined, seed: seedOf(p.id) }, 1.3);
      }
    }
    requestAnimationFrame(voteLoop);
  })(0);

  $('btn-vote').onclick = () => {
    if (!M.selected || M.myVote) return;
    M.myVote = true;
    socket.emit('vote', { target: M.selected });
    $('vote-status').textContent = 'Votaste por ' + nameOf(M.selected) + '. Esperando a los demás…';
    $('btn-skip').disabled = true;
    refreshVoteGrid();
  };
  $('btn-skip').onclick = () => {
    if (M.myVote) return;
    M.myVote = true;
    socket.emit('vote', { target: 'skip' });
    $('vote-status').textContent = 'Saltaste el voto. Esperando a los demás…';
    $('btn-skip').disabled = true;
    refreshVoteGrid();
  };

  socket.on('meetingEnd', (d) => {
    S.phase = 'result';
    $('quiz-box').classList.add('hidden');
    $('vote-box').classList.remove('hidden');
    refreshVoteGrid(d.tally);
    if (d.outcome === 'ejected' && d.ejected.id === S.myId) S.me.alive = false;
    setTimeout(() => {
      if (S.phase !== 'result') return;
      $('meeting').classList.add('hidden');
      ejectScene(d);
    }, 2400);
  });

  socket.on('resume', (d) => {
    S.phase = 'playing';
    S.me.x = d.x; S.me.y = d.y; S.me.alive = d.alive;
    lastSent = { x: d.x, y: d.y, t: performance.now() };
    S.others.clear();
    $('meeting').classList.add('hidden');
    hideScene();
  });

  // ============================================================
  //  FIN DE PARTIDA
  // ============================================================
  let goBots = [], goWinner = '';
  socket.on('gameOver', (d) => {
    S.phase = 'ended';
    S.hostId = d.hostId;
    Tasks.close();
    $('meeting').classList.add('hidden');
    hideScene();
    const win = d.winner === 'defenders';
    goWinner = d.winner;
    goBots = d.roles;
    const iWon = (S.role === 'malware') === !win;
    $('go-title').textContent = win ? '🛡️ ¡Los Defensores salvaron la red!' : '🦠 ¡El Malware tomó el control!';
    $('go-title').className = 'go-title ' + (win ? 'good' : 'bad');
    $('go-reason').textContent = d.reason + (iWon ? ' ¡Ganaste! 🎉' : ' Esta vez perdiste… ¡la revancha!');
    const roles = $('go-roles');
    roles.innerHTML = '';
    d.roles.forEach((r) => {
      const div = document.createElement('div');
      div.className = 'go-role ' + r.role;
      const dot = document.createElement('i'); dot.style.background = r.color;
      const sp = document.createElement('span');
      sp.textContent = r.name + (r.role === 'malware' ? ' era 🦠 Malware' : ' era 🛡️ Defensor');
      div.append(dot, sp);
      roles.append(div);
    });
    const ul = $('go-lessons');
    ul.innerHTML = '';
    Object.values(TASK_INFO).concat(Object.values(SABOTAGE_INFO)).forEach((i, n) => {
      const li = document.createElement('li');
      li.style.animationDelay = (0.6 + n * 0.08) + 's';
      li.textContent = i.icon + ' ' + i.tip;
      ul.append(li);
    });
    const isHost = d.hostId === S.myId;
    $('btn-again').style.display = isHost ? '' : 'none';
    $('go-wait').style.display = isHost ? 'none' : '';
    const card = document.querySelector('.gameover-card');
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    $('gameover').classList.remove('hidden');
    if (iWon) { FX.confetti(160); setTimeout(() => FX.confetti(100), 1200); }
  });
  // Robots celebrando (o tristes) en la pantalla final
  (function goLoop(now) {
    if (!$('gameover').classList.contains('hidden') && goBots.length) {
      const cv = $('go-canvas');
      const w = cv.clientWidth;
      if (cv.width !== w) cv.width = w;
      const c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      const t = now / 1000;
      const n = goBots.length;
      const gap = Math.min(80, (w - 40) / n);
      goBots.forEach((r, i) => {
        const won = (r.role === 'malware') === (goWinner === 'malware');
        const x = w / 2 + (i - (n - 1) / 2) * gap;
        const hop = won ? Math.abs(Math.sin(t * 6 + i)) * 18 : 0;
        c.save(); c.translate(x, 80 - hop); c.scale(1.2, 1.2);
        if (won) c.rotate(Math.sin(t * 6 + i) * 0.1);
        Robots.draw(c, 0, 0, { color: r.color, variant: r.variant, t, expr: won ? 'happy' : 'sleep', evil: r.role === 'malware', seed: i, face: i % 2 ? -1 : 1 });
        c.restore();
      });
    }
    requestAnimationFrame(goLoop);
  })(0);
  $('btn-again').onclick = () => socket.emit('backToLobby');

  // ============================================================
  //  CONEXIÓN
  // ============================================================
  socket.on('disconnect', () => {
    if (S.phase !== 'home') {
      toast('⚠️ Se perdió la conexión con el servidor. Vuelve a entrar a la sala.', 'danger', 6000);
      S.phase = 'home';
      Tasks.close();
      ['meeting', 'gameover'].forEach((id) => $(id).classList.add('hidden'));
      hideScene();
      showScreen('home');
    }
  });

  resize();
})();
