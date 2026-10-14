// ============================================================
//  MAPA DEL JUEGO (compartido entre servidor y navegador)
//  Todas las medidas están en píxeles del "mundo".
// ============================================================
(function (root) {
  const WORLD = { w: 2400, h: 1550 };

  // Salas: rectángulos donde se puede caminar
  const ROOMS = [
    { id: 'servidor',  name: 'Sala de Servidores', x: 200,  y: 150,  w: 420, h: 300, floor: '#1d1a66' },
    { id: 'correo',    name: 'Centro de Correo',   x: 1000, y: 120,  w: 400, h: 260, floor: '#2f176a' },
    { id: 'wifi',      name: 'Torre Wi‑Fi',        x: 1780, y: 150,  w: 420, h: 300, floor: '#103f63' },
    { id: 'recepcion', name: 'Recepción',          x: 1000, y: 600,  w: 400, h: 320, floor: '#271b68' },
    { id: 'datos',     name: 'Base de Datos',      x: 200,  y: 1050, w: 420, h: 320, floor: '#3d1558' },
    { id: 'lab',       name: 'Laboratorio',        x: 1000, y: 1150, w: 400, h: 280, floor: '#11475a' },
    { id: 'nube',      name: 'Nube y Backups',     x: 1780, y: 1050, w: 420, h: 320, floor: '#1c2d75' },
  ];

  // Pasillos que conectan las salas
  const CORRIDORS = [
    { x: 620,  y: 250,  w: 380, h: 100 }, // Servidores - Correo
    { x: 1400, y: 200,  w: 380, h: 100 }, // Correo - Wi-Fi
    { x: 1150, y: 380,  w: 100, h: 220 }, // Correo - Recepción
    { x: 1150, y: 920,  w: 100, h: 230 }, // Recepción - Laboratorio
    { x: 360,  y: 450,  w: 100, h: 600 }, // Servidores - Base de Datos
    { x: 1940, y: 450,  w: 100, h: 600 }, // Wi-Fi - Nube
    { x: 460,  y: 710,  w: 540, h: 100 }, // Recepción - oeste
    { x: 1400, y: 710,  w: 540, h: 100 }, // Recepción - este
    { x: 620,  y: 1200, w: 380, h: 100 }, // Base de Datos - Laboratorio
    { x: 1400, y: 1200, w: 380, h: 100 }, // Laboratorio - Nube
  ];

  const WALKABLE = ROOMS.concat(CORRIDORS);

  // Estaciones de tareas (una por tipo de tarea)
  const STATIONS = {
    password:  { x: 300,  y: 220,  room: 'servidor' },
    antivirus: { x: 520,  y: 395,  room: 'servidor' },
    phishing:  { x: 1200, y: 185,  room: 'correo' },
    wifi:      { x: 2000, y: 225,  room: 'wifi' },
    firewall:  { x: 2120, y: 395,  room: 'wifi' },
    privacy:   { x: 420,  y: 1140, room: 'datos' },
    updates:   { x: 1080, y: 1240, room: 'lab' },
    twofa:     { x: 1320, y: 1370, room: 'lab' },
    backup:    { x: 2000, y: 1140, room: 'nube' },
  };

  // Puntos especiales
  const SPECIAL = {
    emergency: { x: 1200, y: 740 },  // Botón "Alerta de seguridad"
    ddos:      { x: 560,  y: 200 },  // Reparar ataque DDoS
    keyA:      { x: 270,  y: 1320 }, // Llave A contra ransomware
    keyB:      { x: 2130, y: 1320 }, // Llave B contra ransomware
  };

  // "Puertos abiertos": atajos secretos que solo usa el malware (como las ventilaciones)
  const PORTS = [
    { x: 250,  y: 1110 },
    { x: 1050, y: 880 },
    { x: 2150, y: 200 },
    { x: 1350, y: 1200 },
  ];

  const SPAWN = { x: 1200, y: 820 };
  const PLAYER_R = 18;
  const SPEED = 230; // píxeles por segundo

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
  function pointOk(px, py) {
    for (const r of WALKABLE) if (inRect(px, py, r)) return true;
    return false;
  }
  // Un jugador puede estar en (x,y) si sus 4 "esquinas" están dentro de zonas caminables
  function isWalkable(x, y, rad) {
    const r = rad == null ? PLAYER_R : rad;
    return pointOk(x - r, y - r) && pointOk(x + r, y - r) && pointOk(x - r, y + r) && pointOk(x + r, y + r);
  }
  function roomAt(x, y) {
    for (const r of ROOMS) if (inRect(x, y, r)) return r;
    return null;
  }
  function roomName(id) {
    const r = ROOMS.find((q) => q.id === id);
    return r ? r.name : '';
  }

  const api = { WORLD, ROOMS, CORRIDORS, WALKABLE, STATIONS, SPECIAL, PORTS, SPAWN, PLAYER_R, SPEED, isWalkable, roomAt, roomName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MAP = api;
})(this);
