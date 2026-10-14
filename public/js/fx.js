// ============================================================
//  EFECTOS: partículas, textos flotantes, temblor de cámara,
//  confeti en pantalla y el fondo animado del menú.
// ============================================================
const FX = (() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts = [];   // partículas en el mundo
  const texts = [];   // textos flotantes en el mundo
  let shake = 0;

  function burst(x, y, o = {}) {
    const n = reduce ? Math.ceil((o.n || 20) / 3) : (o.n || 20);
    const colors = o.colors || ['#ffd23f', '#7ff6ff', '#ff3d8b', '#3ef0a0'];
    for (let i = 0; i < n; i++) {
      const a = (o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2);
      const sp = (o.speed || 160) * (0.4 + Math.random() * 0.8);
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
        life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 5) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        g: o.gravity == null ? 260 : o.gravity,
        shape: o.shape || 'sq', spin: Math.random() * 6,
      });
    }
  }
  function trail(x, y, color) {
    if (reduce || Math.random() > 0.5) return;
    parts.push({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, life: 0.35, age: 0, size: 3 + Math.random() * 3, color: color || '#ffb703', g: 0, shape: 'circle', spin: 0 });
  }
  function text(x, y, str, color) { texts.push({ x, y, str, color: color || '#ffd23f', age: 0, life: 1.6 }); }
  function addShake(a) { if (!reduce) shake = Math.max(shake, a); }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.spin += dt * 8;
    }
    for (let i = texts.length - 1; i >= 0; i--) { texts[i].age += dt; if (texts[i].age > texts[i].life) texts.splice(i, 1); }
    shake = Math.max(0, shake - dt * 30);
  }
  function getShake() {
    if (shake <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake };
  }
  function draw(c) {
    for (const p of parts) {
      const k = 1 - p.age / p.life;
      c.globalAlpha = Math.max(0, k);
      c.fillStyle = p.color;
      if (p.shape === 'circle') { c.beginPath(); c.arc(p.x, p.y, p.size * k, 0, Math.PI * 2); c.fill(); }
      else if (p.shape === 'bit') { c.font = '700 ' + Math.round(p.size * 3) + 'px monospace'; c.fillText(p.spin % 2 > 1 ? '1' : '0', p.x, p.y); }
      else { c.save(); c.translate(p.x, p.y); c.rotate(p.spin); c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore(); }
    }
    c.globalAlpha = 1;
    c.textAlign = 'center';
    for (const tx of texts) {
      const k = tx.age / tx.life;
      const s = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      c.save();
      c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      c.translate(tx.x, tx.y - k * 60);
      c.scale(s, s);
      c.font = '22px "Russo One", sans-serif';
      c.lineWidth = 5; c.strokeStyle = '#120a2e'; c.strokeText(tx.str, 0, 0);
      c.fillStyle = tx.color; c.fillText(tx.str, 0, 0);
      c.restore();
    }
  }

  // ---------- Confeti en toda la pantalla (para celebrar) ----------
  const ov = document.createElement('canvas');
  ov.id = 'fx-overlay';
  document.body.append(ov);
  const oc = ov.getContext('2d');
  const conf = [];
  let running = false;
  function confetti(n = 120, colors) {
    if (reduce) n = 25;
    const W = window.innerWidth;
    colors = colors || ['#ffd23f', '#7ff6ff', '#ff3d8b', '#3ef0a0', '#a78bfa'];
    for (let i = 0; i < n; i++) {
      conf.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 180, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, color: colors[i % colors.length], sway: Math.random() * 6 });
    }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function popAt(x, y, n = 40) {
    const colors = ['#ffd23f', '#7ff6ff', '#ff3d8b', '#3ef0a0'];
    for (let i = 0; i < (reduce ? 10 : n); i++) {
      const a = Math.random() * Math.PI * 2, s = 200 + Math.random() * 380;
      conf.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, r: 0, vr: (Math.random() - 0.5) * 12, w: 6, h: 9, color: colors[i % 4], sway: 0, g: 700 });
    }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  let last = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const W = window.innerWidth, H = window.innerHeight, D = Math.min(2, window.devicePixelRatio || 1);
    if (ov.width !== W * D || ov.height !== H * D) { ov.width = W * D; ov.height = H * D; }
    oc.setTransform(D, 0, 0, D, 0, 0);
    oc.clearRect(0, 0, W, H);
    for (let i = conf.length - 1; i >= 0; i--) {
      const p = conf[i];
      p.vy += (p.g || 60) * dt;
      p.x += (p.vx + Math.sin(now / 300 + p.sway) * 30) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y > H + 30) { conf.splice(i, 1); continue; }
      oc.save(); oc.translate(p.x, p.y); oc.rotate(p.r); oc.scale(1, Math.cos(now / 120 + p.sway));
      oc.fillStyle = p.color; oc.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      oc.restore();
    }
    if (conf.length) requestAnimationFrame(loop);
    else { running = false; oc.clearRect(0, 0, W, H); }
  }

  // ---------- Fondo animado del menú: circuitos + lluvia de bits + robots paseando ----------
  const Background = (() => {
    let cv, c, on = false, t0 = 0;
    const drops = [], walkers = [];
    const COLS = ['#3a86ff', '#ff3d8b', '#3ef0a0', '#ffd23f', '#a78bfa', '#ff8c42'];
    let traces = [];
    function init(canvas) {
      cv = canvas; c = cv.getContext('2d');
      window.addEventListener('resize', size);
      size();
      for (let i = 0; i < 40; i++) drops.push({ x: Math.random(), y: Math.random(), s: 0.05 + Math.random() * 0.12, ch: Math.random() > 0.5 ? '1' : '0' });
      for (let i = 0; i < 4; i++) walkers.push({ x: Math.random(), dir: Math.random() > 0.5 ? 1 : -1, color: COLS[i], v: i, sp: 0.03 + Math.random() * 0.03 });
    }
    function size() {
      const D = Math.min(2, window.devicePixelRatio || 1);
      cv.width = window.innerWidth * D; cv.height = window.innerHeight * D;
      c.setTransform(D, 0, 0, D, 0, 0);
      // pistas de circuito al azar (fijas)
      traces = [];
      const W = window.innerWidth, H = window.innerHeight;
      for (let i = 0; i < 26; i++) {
        let x = Math.round(Math.random() * W / 40) * 40, y = Math.round(Math.random() * H / 40) * 40;
        const pts = [[x, y]];
        for (let k = 0; k < 4; k++) {
          if (Math.random() > 0.5) x += (Math.random() > 0.5 ? 1 : -1) * 80; else y += (Math.random() > 0.5 ? 1 : -1) * 80;
          pts.push([x, y]);
        }
        traces.push({ pts, phase: Math.random() });
      }
    }
    function start() { if (on || !cv) return; on = true; t0 = performance.now(); requestAnimationFrame(frame); }
    function stop() { on = false; }
    function frame(now) {
      if (!on) return;
      const t = (now - t0) / 1000;
      const W = window.innerWidth, H = window.innerHeight;
      const g = c.createRadialGradient(W * 0.5, H * 0.35, 50, W * 0.5, H * 0.5, Math.max(W, H));
      g.addColorStop(0, '#2a1a6e'); g.addColorStop(1, '#0e0830');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // circuitos con pulsos de luz viajando
      c.lineWidth = 2;
      for (const tr of traces) {
        c.strokeStyle = 'rgba(127,246,255,0.10)';
        c.beginPath(); tr.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
        const [ex, ey] = tr.pts[tr.pts.length - 1];
        c.fillStyle = 'rgba(127,246,255,0.25)'; c.beginPath(); c.arc(ex, ey, 4, 0, Math.PI * 2); c.fill();
        if (!reduce) {
          const k = ((t * 0.35 + tr.phase) % 1) * (tr.pts.length - 1);
          const i = Math.floor(k), f = k - i;
          const a = tr.pts[i], b = tr.pts[i + 1];
          const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f;
          c.fillStyle = '#7ff6ff'; c.shadowColor = '#7ff6ff'; c.shadowBlur = 12;
          c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2); c.fill();
          c.shadowBlur = 0;
        }
      }
      // lluvia de bits
      c.font = '700 16px monospace';
      for (const d of drops) {
        if (!reduce) d.y += d.s * 0.016;
        if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
        c.fillStyle = 'rgba(62,240,160,0.22)';
        c.fillText(d.ch, d.x * W, d.y * H);
      }
      // robots paseando por abajo
      for (const w of walkers) {
        if (!reduce) w.x += w.dir * w.sp * 0.016;
        if (w.x > 1.1) w.dir = -1; if (w.x < -0.1) w.dir = 1;
        Robots.draw(c, w.x * W, H - 40, { color: w.color, variant: w.v, face: w.dir, t, moving: true, seed: w.v * 2 });
      }
      requestAnimationFrame(frame);
    }
    return { init, start, stop };
  })();

  return { burst, trail, text, addShake, update, draw, getShake, confetti, popAt, Background, reduce };
})();
