# 🛡️ Red Segura

Juego multijugador 2D en el navegador, tipo *Among Us*, para aprender ciberseguridad.
Los **Defensores** hacen tareas de seguridad (contraseñas, phishing, virus, actualizaciones…) y uno o dos jugadores son el **Malware**, que infecta a los demás y sabotea la red.

---

## ▶️ Cómo encenderlo

1. Instala **Node.js** (versión LTS) desde https://nodejs.org
2. Haz doble clic en **`INICIAR.bat`**
   (la primera vez instala lo necesario y luego abre el juego en el navegador).

O desde una terminal en esta carpeta:

```bash
npm install      # solo la primera vez
npm start        # partida normal (mínimo 3 jugadores)
npm run prueba   # modo prueba: puedes empezar con 1 o 2 jugadores
```

Luego abre **http://localhost:3000**

### Jugar con tus compañeros (misma red Wi‑Fi del colegio)
Al encender el servidor, la consola muestra una línea como:

```
En la misma red:     http://192.168.1.25:3000
```

Tus compañeros abren **esa dirección** en su navegador (PC, tablet o celular).
Si Windows pregunta por el firewall, dale **Permitir acceso**.

### Para probar solo en tu PC
Ejecuta `npm run prueba` y abre varias pestañas del navegador (o una normal y otra en modo incógnito), cada una es un jugador.

---

## 🤖 Los Bytebots
Los personajes son robots propios: cabeza-pantalla con ojos de píxel que parpadean, núcleo brillante en el pecho y propulsor en vez de piernas. Hay 6 accesorios (antena, doble antena, hélice, radar, cresta y audífonos): **en la sala de espera, toca tu robot para cambiarlo**. El malware ve a los suyos con ojos rojos.

## 🎮 Cómo se juega

| Rol | Objetivo |
|---|---|
| 🛡️ Defensor | Completar todas las tareas **o** expulsar al malware en una votación |
| 🦠 Malware | Infectar hasta que queden tantos malware como defensores **o** que el ransomware no se detenga a tiempo |

**Controles:** WASD / flechas para moverse · **E** usar · **R** reportar · **Q** infectar · **V** puerto. En celular aparece un joystick y botones.

- **Reuniones:** al reportar a un infectado o pulsar el botón **ALERTA** de Recepción. Primero sale una **pregunta de ciberseguridad**: quien acierta tiene **voto doble** ⭐. Luego chatean y votan.
- **Fantasmas:** los infectados siguen haciendo tareas, pero no votan ni hablan con los vivos.
- **Sabotajes del malware:**
  - 🌊 **DDoS:** los defensores casi no ven. Se arregla en la Sala de Servidores bloqueando tráfico falso.
  - 🔒 **Ransomware:** 45 s para que **dos personas** usen a la vez las llaves A (Base de Datos) y B (Nube).
- **Puertos abiertos 🕳️:** atajos que solo usa el malware (como las ventilaciones).

### Tareas (conceptos del curso)
| Tarea | Concepto | Sala |
|---|---|---|
| 🔑 Contraseña fuerte | Contraseñas seguras | Servidores |
| 🦠 Escanear archivos | Virus / malware, dobles extensiones | Servidores |
| 🎣 ¿Real o phishing? | Phishing / ingeniería social | Correo |
| 📶 Wi‑Fi seguro | Redes públicas y falsas | Torre Wi‑Fi |
| 🧱 Firewall | Cortafuegos, fuerza bruta, spyware | Torre Wi‑Fi |
| 🕵️ ¿Qué se puede compartir? | Privacidad / datos personales | Base de Datos |
| 🔄 Actualizaciones | Exploits y parches | Laboratorio |
| 🔐 Verificación en dos pasos | 2FA | Laboratorio |
| 💾 Copia de seguridad | Backups contra ransomware | Nube y Backups |

---

## 📁 Estructura

```
juegociber/
├── server.js            ← servidor (salas, roles, reglas, votos)
├── server/quiz.js       ← preguntas de las reuniones (con respuestas)
├── public/
│   ├── index.html       ← pantallas del juego
│   ├── css/style.css    ← estilos
│   ├── shared/map.js    ← mapa (lo usan servidor y navegador)
│   └── js/
│       ├── content.js   ← textos educativos: correos, archivos, redes Wi‑Fi…
│       ├── tasks.js     ← minijuegos de cada tarea
│       ├── robots.js    ← los Bytebots (personajes dibujados con código)
│       ├── fx.js        ← partículas, confeti, temblor y fondo animado
│       └── main.js      ← movimiento, dibujo, red, reuniones
└── INICIAR.bat          ← encender con doble clic (Windows)
```

### Cambios fáciles
- **Agregar preguntas:** `server/quiz.js`
- **Agregar correos, archivos, redes, etc.:** `public/js/content.js`
- **Cambiar tiempos** (enfriamiento, duración de votos…): arriba de `server.js`
- **Mover salas o estaciones:** `public/shared/map.js`

### 🔒 Ciberseguridad dentro del propio juego (para explicar en clase)
- El **servidor es el árbitro**: valida distancias, velocidad y paredes, así nadie puede hacer trampa modificando el navegador.
- Los roles son secretos: cada jugador solo recibe **su** rol.
- Las respuestas del quiz **solo están en el servidor**.
- Los jugadores vivos no reciben la posición de los fantasmas.
- El chat filtra groserías y escapa el texto (evita inyección de HTML/XSS).

---

## 🌐 Publicarlo en internet (opcional)

Se puede publicar gratis en **[Railway](https://railway.com)** (incluye un crédito de prueba):

1. Sube el proyecto a GitHub.
2. Entra a railway.com e inicia sesión con GitHub.
3. **New Project → Deploy from GitHub repo** y elige este repositorio. Railway detecta Node.js solo y ejecuta `npm install` y `npm start`.
4. Cuando el servicio aparezca como **Online**, ábrelo y ve a **Settings → Networking → Generate Domain** (si pide el puerto, pon `3000`).
5. Railway te da un enlace público tipo `https://tu-proyecto.up.railway.app` para jugar desde cualquier lugar.

**Notas:**
- Para partidas normales se necesitan mínimo 3 jugadores. Para una demo con menos gente, en **Settings → Deploy → Custom Start Command** usa `npm run prueba`.
- No requiere variables de entorno.
- El servidor funciona con WebSockets, por eso necesita un servicio que corra continuamente (no sirve GitHub Pages).
