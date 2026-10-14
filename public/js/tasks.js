// ============================================================
//  MINIJUEGOS DE LAS TAREAS
//  Cada tarea es una función que dibuja dentro de la ventana
//  y llama a done() cuando el jugador la termina bien.
// ============================================================
const Tasks = (() => {
  const modal = document.getElementById('task-modal');
  const titleEl = document.getElementById('task-title');
  const bodyEl = document.getElementById('task-body');
  const closeBtn = document.getElementById('task-close');

  let current = null; // { id, cleanup:[], onClose }

  // ---------- utilidades ----------
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) if (kid != null) e.append(kid);
    return e;
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  function later(fn, ms) { const t = setTimeout(fn, ms); current && current.cleanup.push(() => clearTimeout(t)); return t; }
  function every(fn, ms) { const t = setInterval(fn, ms); current && current.cleanup.push(() => clearInterval(t)); return t; }
  function feedback(container, text, good) {
    container.textContent = text;
    container.className = 'feedback ' + (good ? 'good' : 'bad');
  }

  // ---------- abrir / cerrar ----------
  function open(id, opts) {
    close();
    const info = TASK_INFO[id] || SABOTAGE_INFO[opts && opts.sabotage] || { icon: '🛠️', title: 'Tarea' };
    current = { id, cleanup: [], onClose: opts && opts.onClose };
    titleEl.textContent = info.icon + ' ' + info.title;
    modal.querySelector('.mission-tag').textContent = opts && opts.sabotage ? '🚨 Emergencia en la red' : 'Misión de seguridad';
    // reinicia la animación de entrada
    const card = modal.querySelector('.modal-card');
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    bodyEl.innerHTML = '';
    modal.classList.remove('hidden');

    const done = () => {
      if (!current || current.finished) return;
      current.finished = true;
      opts && opts.onComplete && opts.onComplete();
      bodyEl.innerHTML = '';
      const cv = el('canvas', { width: '280', height: '260' });
      bodyEl.append(
        el('div', { class: 'task-done' },
          cv,
          el('h3', { text: opts && opts.sabotage ? '¡Ataque detenido!' : '¡Misión cumplida!' }),
          el('p', { class: 'tip', text: '💡 ' + info.tip }),
          el('div', { class: 'row center' }, el('button', { class: 'btn primary', text: 'Seguir explorando', onclick: close }))
        )
      );
      // Robot celebrando
      const c = cv.getContext('2d');
      const t0 = performance.now();
      let alive = true;
      current.cleanup.push(() => { alive = false; });
      (function dance(now) {
        if (!alive) return;
        const t = (now - t0) / 1000;
        c.clearRect(0, 0, cv.width, cv.height);
        c.save();
        c.translate(140, 175 - Math.abs(Math.sin(t * 7)) * 22);
        c.scale(2.6, 2.6);
        c.rotate(Math.sin(t * 7) * 0.12);
        Robots.draw(c, 0, 0, { color: (opts && opts.color) || '#3ef0a0', variant: (opts && opts.variant) || 0, t, expr: 'happy', face: Math.sin(t * 3.5) > 0 ? 1 : -1, moving: true });
        c.restore();
        requestAnimationFrame(dance);
      })(t0);
      const r = modal.querySelector('.modal-card').getBoundingClientRect();
      FX.popAt(r.left + r.width / 2, r.top + 120, 50);
      later(close, 7000);
    };

    const fn = GAMES[id];
    if (fn) fn(bodyEl, done, opts || {});
  }

  function close() {
    if (!current) return;
    const c = current;
    current = null;
    c.cleanup.forEach((f) => f());
    modal.classList.add('hidden');
    bodyEl.innerHTML = '';
    c.onClose && c.onClose();
  }

  closeBtn.addEventListener('click', close);
  const isOpen = () => !!current;
  const openId = () => current && current.id;

  // ============================================================
  //  LOS MINIJUEGOS
  // ============================================================
  const GAMES = {};

  // ---------- 🔑 Contraseña fuerte ----------
  GAMES.password = (root, done, opts) => {
    const name = (opts.playerName || '').toLowerCase();
    const common = ['123456', '12345', 'password', 'contraseña', 'contrasena', 'qwerty', 'abc123', '111111', 'admin', 'futbol', 'colombia', 'iloveyou', '000000'];
    const rules = [
      { text: 'Tiene 10 caracteres o más', test: (p) => p.length >= 10 },
      { text: 'Tiene una MAYÚSCULA', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
      { text: 'Tiene una minúscula', test: (p) => /[a-záéíóúñ]/.test(p) },
      { text: 'Tiene un número', test: (p) => /\d/.test(p) },
      { text: 'Tiene un símbolo (! # - _ @ …)', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) },
      { text: 'No tiene tu nombre', test: (p) => !name || name.length < 3 || !p.toLowerCase().includes(name) },
      { text: 'No es una contraseña famosa ni tiene "123" o "abc"', test: (p) => { const l = p.toLowerCase(); return !common.some((c) => l.includes(c)) && !/123|abc|qwe/.test(l); } },
    ];
    const input = el('input', { class: 'pw-input', placeholder: 'Escribe una contraseña…', maxlength: '40', autocomplete: 'off', spellcheck: 'false' });
    const meter = el('div', { class: 'meter' }, el('div', { class: 'meter-bar' }));
    const meterLabel = el('p', { class: 'center muted', text: 'Muy débil' });
    const list = el('ul', { class: 'checklist' });
    const items = rules.map((r) => { const li = el('li', { text: r.text }); list.append(li); return li; });
    const save = el('button', { class: 'btn primary', text: 'Guardar contraseña', disabled: 'true' });
    root.append(
      el('p', { text: 'El servidor necesita una contraseña nueva. ¡Crea una que nadie pueda adivinar!' }),
      el('p', { class: 'small muted', text: 'Truco: usa una frase rara, por ejemplo "MiGato-Come3Arepas!". (Tranquilo: esta contraseña no se envía a ningún lado).' }),
      input, meter, meterLabel, list, save
    );
    const labels = ['Muy débil 😱', 'Débil 😟', 'Regular 😐', 'Buena 🙂', 'Casi fuerte 😃', 'Fuerte 💪', 'Fuerte 💪', '¡Súper fuerte! 🛡️'];
    input.addEventListener('input', () => {
      const p = input.value;
      let ok = 0;
      rules.forEach((r, i) => { const pass = p.length > 0 && r.test(p); items[i].className = pass ? 'ok' : ''; if (pass) ok++; });
      const pct = ok / rules.length;
      const bar = meter.firstChild;
      bar.style.width = (pct * 100) + '%';
      bar.style.background = pct < 0.5 ? '#e74c3c' : pct < 0.9 ? '#f1c40f' : '#2ecc71';
      meterLabel.textContent = labels[ok];
      if (ok === rules.length) save.removeAttribute('disabled'); else save.setAttribute('disabled', 'true');
    });
    save.addEventListener('click', done);
    setTimeout(() => input.focus(), 50);
  };

  // ---------- 🎣 Phishing ----------
  GAMES.phishing = (root, done) => {
    const fakes = EMAILS.filter((e) => e.phishing), reals = EMAILS.filter((e) => !e.phishing);
    const chosen = shuffle(sample(fakes, 2).concat(sample(reals, 2)));
    let solved = 0;
    root.append(el('p', { text: 'Llegaron 4 correos. Marca cuáles son reales y cuáles son phishing (trampas).' }));
    const box = el('div', { class: 'emails' });
    root.append(box);
    chosen.forEach((m) => {
      const fb = el('p', { class: 'feedback' });
      const bReal = el('button', { class: 'btn small', text: '✅ Real' });
      const bFake = el('button', { class: 'btn small danger', text: '🎣 Phishing' });
      const card = el('div', { class: 'email' },
        el('div', { class: 'email-from', text: 'De: ' + m.from }),
        el('div', { class: 'email-subject', text: m.subject }),
        el('div', { class: 'email-body', text: m.body }),
        el('div', { class: 'row' }, bReal, bFake),
        fb);
      const answer = (saysFake) => {
        if (saysFake === m.phishing) {
          card.classList.add('right');
          feedback(fb, '¡Correcto! ' + m.why, true);
          bReal.remove(); bFake.remove();
          if (++solved === chosen.length) later(done, 1400);
        } else {
          card.classList.add('shake');
          feedback(fb, '¡Ups! ' + m.why + ' Intenta otra vez.', false);
          later(() => card.classList.remove('shake'), 500);
        }
      };
      bReal.addEventListener('click', () => answer(false));
      bFake.addEventListener('click', () => answer(true));
      box.append(card);
    });
  };

  // ---------- 🦠 Antivirus ----------
  GAMES.antivirus = (root, done) => {
    const bad = sample(FILES_BAD, 3).map((f) => ({ ...f, bad: true }));
    const ok = sample(FILES_OK, 5).map((f) => ({ ...f, bad: false }));
    const files = shuffle(bad.concat(ok));
    const selected = new Set();
    root.append(el('p', { text: 'Toca los archivos peligrosos para mandarlos a cuarentena 🧪. Mira bien cómo TERMINA el nombre.' }));
    const grid = el('div', { class: 'files' });
    const cards = files.map((f, i) => {
      const c = el('button', { class: 'file' }, el('span', { class: 'file-icon', text: '📄' }), el('span', { text: f.name }));
      c.addEventListener('click', () => {
        if (selected.has(i)) { selected.delete(i); c.classList.remove('sel'); }
        else { selected.add(i); c.classList.add('sel'); }
      });
      grid.append(c);
      return c;
    });
    const fb = el('p', { class: 'feedback' });
    const scan = el('button', { class: 'btn primary', text: '🔍 Escanear y poner en cuarentena' });
    scan.addEventListener('click', () => {
      const wrong = files.map((f, i) => (f.bad !== selected.has(i) ? i : -1)).filter((i) => i >= 0);
      if (wrong.length === 0) {
        feedback(fb, '¡Perfecto! Atrapaste: ' + bad.map((b) => b.name).join(', ') + '. ' + bad[0].why, true);
        scan.remove();
        later(done, 2200);
      } else {
        wrong.forEach((i) => { cards[i].classList.add('shake'); later(() => cards[i].classList.remove('shake'), 500); });
        const missed = wrong.find((i) => files[i].bad);
        feedback(fb, missed != null
          ? 'Aún queda un archivo peligroso. Pista: ' + files[missed].why
          : 'Marcaste un archivo normal. Los archivos .docx, .jpg, .mp3 o .pdf (sin otra extensión al final) son normales.', false);
      }
    });
    root.append(grid, scan, fb);
  };

  // ---------- 🔄 Actualizaciones ----------
  GAMES.updates = (root, done) => {
    const apps = sample(UPDATE_APPS, 3);
    let n = 0;
    root.append(el('p', { text: 'Estas apps tienen agujeros de seguridad que un exploit podría usar. Elige la forma SEGURA de actualizar cada una.' }));
    apps.forEach((a) => {
      const fb = el('p', { class: 'feedback' });
      const bar = el('div', { class: 'meter' }, el('div', { class: 'meter-bar' }));
      const opts = shuffle([{ t: a.good, ok: true }, { t: a.bad, ok: false }]);
      const row = el('div', { class: 'col' });
      opts.forEach((o) => {
        const b = el('button', { class: 'btn option', text: o.t });
        b.addEventListener('click', () => {
          if (o.ok) {
            row.remove();
            feedback(fb, 'Actualizando desde la fuente oficial…', true);
            let pct = 0;
            const t = every(() => {
              pct += 10;
              bar.firstChild.style.width = pct + '%';
              bar.firstChild.style.background = '#2ecc71';
              if (pct >= 100) {
                clearInterval(t);
                feedback(fb, '✔ ' + a.app + ' actualizado. ¡Agujero tapado!', true);
                if (++n === apps.length) later(done, 1200);
              }
            }, 120);
          } else {
            b.classList.add('shake');
            later(() => b.classList.remove('shake'), 500);
            feedback(fb, '¡Cuidado! Las ventanas emergentes, enlaces y correos "urgentes" pueden instalar malware. Actualiza siempre desde la app o tienda oficial.', false);
          }
        });
        row.append(b);
      });
      root.append(el('div', { class: 'update-card' }, el('h4', { text: a.app }), row, bar, fb));
    });
  };

  // ---------- 📶 Wi-Fi ----------
  GAMES.wifi = (root, done) => {
    const scenarios = sample(WIFI_SCENARIOS, 2);
    let step = 0;
    const show = () => {
      root.innerHTML = '';
      const sc = scenarios[step];
      root.append(el('p', { class: 'small muted', text: 'Escenario ' + (step + 1) + ' de ' + scenarios.length }), el('p', { text: sc.place }), el('p', { text: '¿A qué red te conectas?' }));
      const fb = el('p', { class: 'feedback' });
      const list = el('div', { class: 'col' });
      shuffle(sc.nets).forEach((n) => {
        const b = el('button', { class: 'btn option wifi' }, el('span', { text: (n.lock ? '🔒 ' : '🔓 ') + n.name }), el('span', { class: 'muted small', text: n.lock ? 'Con contraseña' : 'Abierta' }));
        b.addEventListener('click', () => {
          if (n.ok) {
            feedback(fb, '¡Bien! Es la red conocida y protegida con contraseña.', true);
            list.querySelectorAll('button').forEach((x) => (x.disabled = true));
            later(() => { step++; step < scenarios.length ? show() : done(); }, 1500);
          } else {
            b.classList.add('shake');
            later(() => b.classList.remove('shake'), 500);
            feedback(fb, n.why, false);
          }
        });
        list.append(b);
      });
      root.append(list, fb);
    };
    show();
  };

  // ---------- 🧱 Firewall ----------
  GAMES.firewall = (root, done) => {
    const reqs = shuffle(sample(FIREWALL_REQS.filter((r) => r.allow), 2).concat(sample(FIREWALL_REQS.filter((r) => !r.allow), 3)));
    let i = 0;
    const counter = el('p', { class: 'small muted' });
    const card = el('div', { class: 'fw-card' });
    const fb = el('p', { class: 'feedback' });
    const bAllow = el('button', { class: 'btn primary', text: '✅ Permitir' });
    const bBlock = el('button', { class: 'btn danger', text: '⛔ Bloquear' });
    root.append(el('p', { text: 'Eres el firewall 🧱. Decide qué conexiones pueden pasar.' }), counter, card, el('div', { class: 'row center' }, bAllow, bBlock), fb);
    let locked = false;
    const show = () => { counter.textContent = 'Conexión ' + (i + 1) + ' de ' + reqs.length; card.textContent = reqs[i].text; card.className = 'fw-card'; };
    const answer = (allow) => {
      if (locked) return;
      const r = reqs[i];
      if (allow === r.allow) {
        locked = true;
        card.classList.add(allow ? 'allowed' : 'blocked');
        feedback(fb, (allow ? '¡Permitida! ' : '¡Bloqueada! ') + r.why, true);
        later(() => { locked = false; i++; fb.textContent = ''; i < reqs.length ? show() : done(); }, 1400);
      } else {
        card.classList.add('shake');
        later(() => card.classList.remove('shake'), 500);
        feedback(fb, 'Mmm… piénsalo otra vez. ' + r.why, false);
      }
    };
    bAllow.addEventListener('click', () => answer(true));
    bBlock.addEventListener('click', () => answer(false));
    show();
  };

  // ---------- 🔐 Verificación en dos pasos ----------
  GAMES.twofa = (root, done) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const phone = el('div', { class: 'phone' }, el('div', { class: 'phone-notch' }), el('div', { class: 'phone-screen', text: '…' }));
    const input = el('input', { class: 'code-input', maxlength: '6', inputmode: 'numeric', placeholder: '______', autocomplete: 'off' });
    const fb = el('p', { class: 'feedback' });
    const login = el('div', { class: 'login-box' },
      el('p', { text: '👤 Usuario: estudiante' }),
      el('p', { text: '🔑 Contraseña: ••••••••••  ✔' }),
      el('p', { text: '📲 Paso 2: escribe el código que llegó a tu celular' }),
      input);
    root.append(el('p', { text: 'Activa la verificación en dos pasos. Además de la contraseña, se necesita un código que llega a tu celular.' }),
      el('div', { class: 'twofa' }, login, phone), fb);
    later(() => { phone.lastChild.innerHTML = ''; phone.lastChild.append(el('div', { class: 'sms' }, el('b', { text: 'Código de verificación' }), el('div', { class: 'sms-code', text: code }), el('small', { text: 'No compartas este código con NADIE.' }))); }, 900);
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
      if (input.value.length < 6) return;
      if (input.value === code) {
        login.remove(); phone.remove();
        question();
      } else {
        feedback(fb, 'Ese código no coincide. Míralo bien en el celular.', false);
        input.value = '';
      }
    });
    function question() {
      fb.textContent = '';
      root.append(el('p', { text: '✔ ¡Listo! Ahora una pregunta: un día te llega un código que TÚ NO pediste y alguien te escribe "pásame el código que te llegó, es un error". ¿Qué haces?' }));
      const opts = shuffle([
        { t: 'Se lo paso, parece amable', ok: false },
        { t: 'No lo comparto y cambio mi contraseña, alguien la tiene', ok: true },
        { t: 'Lo publico en mis redes', ok: false },
      ]);
      const col = el('div', { class: 'col' });
      opts.forEach((o) => {
        const b = el('button', { class: 'btn option', text: o.t });
        b.addEventListener('click', () => {
          if (o.ok) { feedback(fb, '¡Exacto! Si llega un código que no pediste, alguien conoce tu contraseña.', true); col.remove(); later(done, 1600); }
          else { feedback(fb, '¡No! Ese código es la llave de tu cuenta. Nunca lo compartas.', false); b.classList.add('shake'); later(() => b.classList.remove('shake'), 500); }
        });
        col.append(b);
      });
      root.append(col, fb);
    }
    setTimeout(() => input.focus(), 50);
  };

  // ---------- 💾 Copia de seguridad ----------
  GAMES.backup = (root, done) => {
    const files = shuffle(sample(BACKUP_FILES.filter((f) => f.important), 4).concat(sample(BACKUP_FILES.filter((f) => !f.important), 2)));
    const sel = new Set();
    root.append(el('p', { text: 'Un ransomware podría bloquear este PC. Escoge los archivos IMPORTANTES para copiarlos a la nube ☁️.' }));
    const grid = el('div', { class: 'files' });
    const cards = files.map((f, i) => {
      const b = el('button', { class: 'file', text: f.name });
      b.addEventListener('click', () => { sel.has(i) ? (sel.delete(i), b.classList.remove('sel')) : (sel.add(i), b.classList.add('sel')); });
      grid.append(b);
      return b;
    });
    const bar = el('div', { class: 'meter' }, el('div', { class: 'meter-bar' }));
    const fb = el('p', { class: 'feedback' });
    const go = el('button', { class: 'btn primary', text: '☁️ Copiar a la nube' });
    go.addEventListener('click', () => {
      const wrong = files.map((f, i) => (f.important !== sel.has(i) ? i : -1)).filter((i) => i >= 0);
      if (wrong.length) {
        wrong.forEach((i) => { cards[i].classList.add('shake'); later(() => cards[i].classList.remove('shake'), 500); });
        const missed = wrong.some((i) => files[i].important);
        feedback(fb, missed ? 'Te falta algún archivo importante: ¿tareas, fotos, proyectos, contactos?' : 'Los archivos temporales, la publicidad o los instaladores viejos no hace falta guardarlos.', false);
        return;
      }
      go.remove();
      feedback(fb, 'Copiando…', true);
      let pct = 0;
      const t = every(() => {
        pct += 5;
        bar.firstChild.style.width = pct + '%';
        bar.firstChild.style.background = '#3498db';
        if (pct >= 100) { clearInterval(t); feedback(fb, '¡Copia lista! Consejo: guarda copias en 2 lugares distintos.', true); later(done, 1200); }
      }, 80);
    });
    root.append(grid, go, bar, fb);
  };

  // ---------- 🕵️ Privacidad ----------
  GAMES.privacy = (root, done) => {
    const items = shuffle(sample(PRIVACY_ITEMS.filter((p) => !p.ok), 3).concat(sample(PRIVACY_ITEMS.filter((p) => p.ok), 2)));
    let i = 0, locked = false;
    const counter = el('p', { class: 'small muted' });
    const card = el('div', { class: 'fw-card' });
    const fb = el('p', { class: 'feedback' });
    const bPub = el('button', { class: 'btn primary', text: '🌍 Se puede publicar' });
    const bPriv = el('button', { class: 'btn danger', text: '🔒 Es privado' });
    root.append(el('p', { text: 'Vas a publicar en redes sociales. ¿Qué se puede compartir y qué es privado?' }), counter, card, el('div', { class: 'row center' }, bPub, bPriv), fb);
    const show = () => { counter.textContent = (i + 1) + ' de ' + items.length; card.textContent = items[i].text; card.className = 'fw-card'; };
    const answer = (pub) => {
      if (locked) return;
      const it = items[i];
      if (pub === it.ok) {
        locked = true;
        card.classList.add(pub ? 'allowed' : 'blocked');
        feedback(fb, pub ? '¡Sí! No revela dónde estás ni quién eres.' : '¡Bien! Ese dato podría usarlo un desconocido para encontrarte o robar tu cuenta.', true);
        later(() => { locked = false; i++; fb.textContent = ''; i < items.length ? show() : done(); }, 1300);
      } else {
        card.classList.add('shake');
        later(() => card.classList.remove('shake'), 500);
        feedback(fb, pub ? 'Mmm… ese dato le dice a un desconocido dónde encontrarte o cómo entrar a tus cuentas.' : 'Eso no tiene peligro: no dice dónde vives ni da acceso a tus cuentas.', false);
      }
    };
    bPub.addEventListener('click', () => answer(true));
    bPriv.addEventListener('click', () => answer(false));
    show();
  };

  // ---------- 🌊 Arreglar DDoS ----------
  GAMES.ddos = (root, done) => {
    const goal = 8;
    let blocked = 0;
    const counter = el('p', { class: 'center', text: 'Peticiones falsas bloqueadas: 0 / ' + goal });
    const field = el('div', { class: 'ddos-field' });
    const fb = el('p', { class: 'feedback' });
    root.append(el('p', { text: '¡Miles de peticiones falsas! Toca las 🔴 FALSAS para bloquearlas. No bloquees a los usuarios reales 🟢.' }), counter, field, fb);
    every(() => {
      const fake = Math.random() < 0.7;
      const b = el('button', { class: 'packet ' + (fake ? 'fake' : 'real'), text: fake ? '🔴 falsa' : '🟢 usuario' });
      b.style.left = Math.random() * 78 + '%';
      b.style.top = Math.random() * 80 + '%';
      b.addEventListener('click', () => {
        if (fake) { blocked++; b.remove(); }
        else { blocked = Math.max(0, blocked - 1); feedback(fb, '¡Ese era un usuario real! Un buen filtro solo bloquea lo falso.', false); b.remove(); }
        counter.textContent = 'Peticiones falsas bloqueadas: ' + blocked + ' / ' + goal;
        if (blocked >= goal) done();
      });
      field.append(b);
      later(() => b.remove(), 2200);
    }, 450);
  };

  // ---------- 🔒 Llave contra ransomware ----------
  GAMES.key = (root, done, opts) => {
    const status = el('div', { class: 'keys-status' });
    const hold = el('button', { class: 'hold-btn', text: '🗝️ Mantén presionado' });
    root.append(
      el('p', { text: 'El ransomware está cifrando los archivos. Para detenerlo, DOS personas deben usar las llaves AL MISMO TIEMPO: una en Base de Datos (A) y otra en Nube y Backups (B).' }),
      el('p', { class: 'center', text: 'Estás en la llave ' + opts.key }),
      hold, status);
    let holding = false;
    const set = (v) => { if (v === holding) return; holding = v; hold.classList.toggle('on', v); opts.onHold && opts.onHold(v); };
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, () => set(false)));
    current.cleanup.push(() => set(false));
    current.updateKeys = (keys) => {
      status.innerHTML = '';
      ['A', 'B'].forEach((k) => status.append(el('span', { class: 'key-pill ' + (keys[k] ? 'on' : ''), text: 'Llave ' + k + (keys[k] ? ' ✔' : ' …') })));
    };
    current.updateKeys(opts.keys || { A: false, B: false });
  };

  function updateKeys(keys) { if (current && current.updateKeys) current.updateKeys(keys); }

  return { open, close, isOpen, openId, updateKeys };
})();
