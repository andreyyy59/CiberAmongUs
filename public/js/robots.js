// ============================================================
//  BYTEBOTS - los personajes del juego (dibujados con código)
//  Cabeza-pantalla con ojos de píxel, núcleo brillante en el
//  pecho, brazos que se mueven y propulsor en vez de piernas.
// ============================================================
const Robots = (() => {
  const VARIANTS = ['Antena', 'Doble antena', 'Hélice', 'Radar', 'Cresta', 'Audífonos'];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')';
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

  // Accesorio de la cabeza (se dibuja detrás o encima según el caso)
  function accessory(c, v, color, t, ghost) {
    const glow = ghost ? '#ffffff' : '#ffd23f';
    c.strokeStyle = '#120a2e'; c.lineWidth = 2.5;
    switch (v) {
      case 0: { // antena con foco que parpadea
        c.beginPath(); c.moveTo(0, -36); c.lineTo(0, -46); c.stroke();
        const on = Math.sin(t * 4) > -0.3;
        c.fillStyle = on ? glow : shade(color, -40);
        if (on && !ghost) { c.shadowColor = glow; c.shadowBlur = 10; }
        c.beginPath(); c.arc(0, -48, 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.shadowBlur = 0;
        break;
      }
      case 1: { // doble antena que se balancea
        const s = Math.sin(t * 3) * 2;
        c.beginPath(); c.moveTo(-8, -36); c.quadraticCurveTo(-12, -44, -14 + s, -50); c.stroke();
        c.beginPath(); c.moveTo(8, -36); c.quadraticCurveTo(12, -44, 14 + s, -50); c.stroke();
        c.fillStyle = glow;
        c.beginPath(); c.arc(-14 + s, -51, 3.5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(14 + s, -51, 3.5, 0, Math.PI * 2); c.fill();
        break;
      }
      case 2: { // gorro con hélice que gira
        rr(c, -10, -42, 20, 7, 4); c.fillStyle = shade(color, -50); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(0, -42); c.lineTo(0, -47); c.stroke();
        const k = Math.cos(t * 18);
        c.fillStyle = '#ff3d8b';
        c.beginPath(); c.ellipse(0, -48, Math.abs(k) * 16 + 2, 3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        break;
      }
      case 3: { // radar en una oreja
        c.save(); c.translate(19, -26); c.rotate(-0.6 + Math.sin(t * 2) * 0.25);
        c.fillStyle = '#d9dcf5';
        c.beginPath(); c.arc(0, -6, 9, Math.PI * 0.1, Math.PI * 0.9 + Math.PI, false); c.fill(); c.stroke();
        c.fillStyle = glow; c.beginPath(); c.arc(0, -6, 2.5, 0, Math.PI * 2); c.fill();
        c.restore();
        break;
      }
      case 4: { // cresta de picos
        c.fillStyle = '#ff3d8b';
        for (let i = -1; i <= 1; i++) {
          const h = i === 0 ? 13 : 9;
          c.beginPath(); c.moveTo(i * 8 - 5, -36); c.lineTo(i * 8, -36 - h - Math.sin(t * 6 + i) * 1.5); c.lineTo(i * 8 + 5, -36); c.closePath(); c.fill(); c.stroke();
        }
        break;
      }
      case 5: { // audífonos
        c.lineWidth = 4; c.strokeStyle = '#120a2e';
        c.beginPath(); c.arc(0, -22, 22, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
        c.lineWidth = 2.5;
        for (const sx of [-1, 1]) {
          rr(c, sx * 22 - 5, -28, 10, 14, 4); c.fillStyle = '#3ef0a0'; c.fill(); c.stroke();
        }
        break;
      }
    }
  }

  /**
   * Dibuja un Bytebot.
   * opts: color, variant, face(1/-1), t (segundos), moving, ghost, evil (ojos rojos),
   *       expr ('normal' | 'happy' | 'shock' | 'x'), seed
   */
  function draw(c, x, y, o) {
    const color = o.color || '#3a86ff';
    const v = (o.variant || 0) % VARIANTS.length;
    const t = o.t || 0;
    const seed = o.seed || 0;
    const face = o.face || 1;
    const ghost = !!o.ghost;
    const hover = Math.sin(t * 3 + seed) * 2.5 + (o.moving ? Math.sin(t * 16) * 1 : 0);
    const dark = '#120a2e';

    c.save();
    c.translate(x, y);

    // sombra que crece y se achica con la flotación
    if (!ghost) {
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.ellipse(0, 24, 15 - hover * 0.6, 4.5, 0, 0, Math.PI * 2); c.fill();
    }
    c.translate(0, hover - 4);
    if (ghost) {
      c.globalAlpha = 0.5;
      c.translate(Math.sin(t * 25) > 0.95 ? 2 : 0, 0); // pequeño "glitch"
    }
    // inclinación al moverse
    if (o.moving) c.rotate(face * 0.08);

    c.lineJoin = 'round';
    c.lineWidth = 2.5;
    c.strokeStyle = dark;

    // propulsor / cola de fantasma
    if (ghost) {
      c.fillStyle = shade(color, 30);
      c.beginPath();
      c.moveTo(-14, 14);
      for (let i = 0; i <= 4; i++) c.quadraticCurveTo(-14 + i * 7 - 3.5, 26 + Math.sin(t * 6 + i) * 3, -14 + i * 7, 20);
      c.lineTo(14, 14); c.closePath(); c.fill();
    } else {
      rr(c, -8, 15, 16, 7, 3); c.fillStyle = '#5b5f86'; c.fill(); c.stroke();
      const f = o.moving ? 10 + Math.random() * 7 : 4 + Math.sin(t * 20) * 1.5;
      const g = c.createLinearGradient(0, 22, 0, 22 + f);
      g.addColorStop(0, '#fff6a0'); g.addColorStop(0.5, '#ffb703'); g.addColorStop(1, 'rgba(255,61,139,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(-6, 22); c.quadraticCurveTo(0, 22 + f * 1.4, 6, 22); c.closePath(); c.fill();
    }

    // brazos
    const swing = o.moving ? Math.sin(t * 14) * 0.6 : Math.sin(t * 2 + seed) * 0.12;
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * 16, 2);
      c.rotate(side * 0.25 + (side === face ? swing : -swing));
      rr(c, -3, 0, 6, 13, 3); c.fillStyle = shade(color, -55); c.fill(); c.stroke();
      c.fillStyle = '#d9dcf5'; c.beginPath(); c.arc(0, 15, 4, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
    }

    // cuerpo
    rr(c, -15, -3, 30, 21, 7); c.fillStyle = color; c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.22)'; rr(c, -12, -1, 6, 15, 3); c.fill();
    // núcleo del pecho
    const pulse = 0.6 + Math.sin(t * 4 + seed) * 0.4;
    rr(c, -7, 2, 14, 11, 4); c.fillStyle = dark; c.fill();
    const coreColor = o.evil ? '#ff3d6e' : ghost ? '#ffffff' : '#7ff6ff';
    c.fillStyle = coreColor;
    if (!ghost) { c.shadowColor = coreColor; c.shadowBlur = 8 * pulse; }
    c.beginPath(); c.arc(0, 7.5, 3 + pulse, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;

    // cuello
    c.fillStyle = '#5b5f86'; c.fillRect(-4, -7, 8, 5);

    // accesorios que van detrás de la cabeza
    if (v === 5 || v === 3) accessory(c, v, color, t, ghost);

    // cabeza
    c.save();
    c.scale(face, 1);
    rr(c, -18, -36, 36, 30, 9); c.fillStyle = shade(color, 25); c.fill(); c.stroke();
    // tornillos
    c.fillStyle = '#d9dcf5';
    c.beginPath(); c.arc(-18, -21, 3, 0, Math.PI * 2); c.fill(); c.stroke();
    // pantalla de la cara
    rr(c, -13, -31, 27, 20, 6); c.fillStyle = '#0d0726'; c.fill();
    c.restore();

    // ojos (se dibujan sin espejo para poder mirar hacia los lados)
    const eyeC = o.evil ? '#ff3d6e' : ghost ? '#e8e8ff' : '#7ff6ff';
    const look = face * 2.5;
    const blink = ((t + seed * 1.7) % 3.6) < 0.12;
    c.fillStyle = eyeC; c.strokeStyle = eyeC;
    if (!ghost) { c.shadowColor = eyeC; c.shadowBlur = 6; }
    const expr = o.expr || (ghost ? 'sleep' : 'normal');
    for (const ex of [-6, 6]) {
      const cx = ex + look, cy = -22;
      if (expr === 'x') {
        c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(cx - 3, cy - 3); c.lineTo(cx + 3, cy + 3); c.moveTo(cx + 3, cy - 3); c.lineTo(cx - 3, cy + 3); c.stroke();
      } else if (expr === 'happy') {
        c.lineWidth = 2.5;
        c.beginPath(); c.arc(cx, cy + 2, 3.5, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      } else if (expr === 'sleep') {
        c.lineWidth = 2;
        c.beginPath(); c.arc(cx, cy - 1, 3, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      } else if (expr === 'shock') {
        c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI * 2); c.fill();
      } else if (blink) {
        c.fillRect(cx - 3, cy, 6, 1.5);
      } else if (o.evil) {
        // ojos inclinados de malvado
        c.beginPath(); c.moveTo(cx - 3.5, cy - 3 + (ex < 0 ? -1.5 : 1.5) * face); c.lineTo(cx + 3.5, cy - 3 + (ex < 0 ? 1.5 : -1.5) * face); c.lineTo(cx + 3, cy + 3); c.lineTo(cx - 3, cy + 3); c.closePath(); c.fill();
      } else {
        c.fillRect(cx - 2.5, cy - 4, 5, 7);
      }
    }
    // boca
    c.lineWidth = 1.8;
    if (expr === 'happy' || expr === 'normal') {
      c.beginPath(); c.arc(look, -17, 3, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
    } else if (expr === 'shock') {
      c.beginPath(); c.arc(look, -14.5, 2, 0, Math.PI * 2); c.stroke();
    }
    c.shadowBlur = 0;
    c.strokeStyle = dark; c.lineWidth = 2.5;

    // accesorios encima
    if (v !== 5 && v !== 3) accessory(c, v, color, t, ghost);

    // aureola de fantasma
    if (ghost) {
      c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(0, -52 + Math.sin(t * 3) * 1.5, 11, 3.5, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }

  // Robot infectado tirado en el suelo, con la pantalla en estática
  function drawDown(c, x, y, o) {
    const t = o.t || 0;
    c.save();
    c.translate(x, y);
    c.fillStyle = 'rgba(62,240,160,0.18)';
    c.beginPath(); c.ellipse(0, 10, 34, 12, 0, 0, Math.PI * 2); c.fill();
    c.rotate(-Math.PI / 2 + 0.15);
    draw(c, 0, 0, { color: o.color, variant: o.variant, t: 0, expr: 'x', seed: 0 });
    c.restore();
    // chispas
    if (Math.sin(t * 9 + x) > 0.7) {
      c.strokeStyle = '#ffd23f'; c.lineWidth = 2;
      c.beginPath();
      const sx = x - 22, sy = y - 6;
      c.moveTo(sx, sy); c.lineTo(sx - 6, sy - 7); c.lineTo(sx - 2, sy - 8); c.lineTo(sx - 9, sy - 16);
      c.stroke();
    }
    // burbujas de virus
    for (let i = 0; i < 5; i++) {
      const a = t * 1.3 + i * 1.25;
      const r = 3 + (i % 3) * 1.5;
      const px = x + Math.cos(a) * 30, py = y - 6 + Math.sin(a * 1.4) * 16;
      c.fillStyle = 'rgba(62,240,160,0.85)';
      c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(20,80,50,0.9)';
      c.beginPath(); c.arc(px - r * 0.3, py - r * 0.3, r * 0.35, 0, Math.PI * 2); c.fill();
    }
  }

  // Pequeño ayudante: dibuja un robot en un <canvas> (sala de espera, votos, etc.)
  function avatar(canvas, o, scale) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(canvas.width / 2, canvas.height * 0.66);
    c.scale(scale || 1, scale || 1);
    draw(c, 0, 0, o);
    c.restore();
  }

  return { draw, drawDown, avatar, shade, VARIANTS };
})();
