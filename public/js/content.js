// ============================================================
//  CONTENIDO EDUCATIVO DE LAS TAREAS
//  Aquí puedes cambiar textos, agregar correos, archivos, etc.
// ============================================================

const TASK_INFO = {
  password:  { icon: '🔑', title: 'Crea una contraseña fuerte',
    tip: 'Una contraseña fuerte es larga, mezcla mayúsculas, minúsculas, números y símbolos, y no usa tu nombre. ¡Nunca la compartas!' },
  phishing:  { icon: '🎣', title: '¿Correo real o phishing?',
    tip: 'El phishing son mensajes falsos que se hacen pasar por alguien de confianza para robar tus datos. Desconfía de la urgencia, los premios y los remitentes raros.' },
  antivirus: { icon: '🦠', title: 'Escanea los archivos',
    tip: 'Los virus se esconden en archivos con doble extensión como "foto.jpg.exe". La extensión real es la última.' },
  updates:   { icon: '🔄', title: 'Instala las actualizaciones',
    tip: 'Los atacantes usan "exploits" para aprovechar errores de los programas. Las actualizaciones OFICIALES tapan esos agujeros.' },
  wifi:      { icon: '📶', title: 'Conéctate al Wi‑Fi seguro',
    tip: 'Las redes abiertas (sin contraseña) o con nombres raros pueden ser trampas para espiarte.' },
  firewall:  { icon: '🧱', title: 'Configura el firewall',
    tip: 'El firewall es el portero de la red: deja pasar las conexiones conocidas y bloquea las sospechosas.' },
  twofa:     { icon: '🔐', title: 'Activa la verificación en dos pasos',
    tip: 'Con la verificación en dos pasos (2FA), aunque roben tu contraseña, también necesitan el código de tu celular.' },
  backup:    { icon: '💾', title: 'Haz una copia de seguridad',
    tip: 'Una copia de seguridad (backup) te salva si un ransomware o un daño borra tus archivos.' },
  privacy:   { icon: '🕵️', title: '¿Qué se puede compartir?',
    tip: 'Tu dirección, contraseñas, colegio y horario son datos privados. ¡Piensa antes de publicar!' },
};

const SABOTAGE_INFO = {
  ddos: { icon: '🌊', title: 'Bloquea el ataque DDoS',
    tip: 'Un ataque DDoS envía miles de peticiones falsas para tumbar un servicio. Se defiende filtrando el tráfico falso.' },
  ransomware: { icon: '🔒', title: 'Detén el ransomware',
    tip: 'El ransomware bloquea tus archivos y pide dinero. Nunca pagues: usa tus copias de seguridad y avisa al equipo de sistemas.' },
};

// ---------- Phishing ----------
const EMAILS = [
  { from: 'soporte@netfIix-cuentas.com', subject: '¡Tu cuenta será BLOQUEADA en 1 hora!', body: 'Ingresa YA tu contraseña en este enlace para evitar el bloqueo: http://netfIix-login.xyz', phishing: true,
    why: 'Mucha urgencia, el remitente usa una "I" mayúscula en vez de "l" y el enlace es raro.' },
  { from: 'profe.matematicas@micolegio.edu.co', subject: 'Tarea para el lunes', body: 'Hola grupo, recuerden resolver los ejercicios de la página 45 del libro. ¡Buen fin de semana!', phishing: false,
    why: 'Viene del correo del colegio, no pide datos ni tiene enlaces extraños.' },
  { from: 'premios@ganaste-ya.net', subject: '🎁 ¡GANASTE UN CELULAR GRATIS!', body: 'Fuiste seleccionado. Envía tu nombre, dirección y el número de la tarjeta de tus papás para recibirlo.', phishing: true,
    why: 'Premios que no pediste + piden datos personales o de tarjeta = trampa.' },
  { from: 'no-reply@juegos-oficial.com', subject: 'Tu código de verificación', body: 'Tu código es 482913. Lo pediste para iniciar sesión. Si no fuiste tú, ignora este mensaje y nunca compartas el código.', phishing: false,
    why: 'Es un mensaje que esperabas, no pide nada y te recuerda no compartir el código.' },
  { from: 'seguridad@banco-nacional-alerta.info', subject: 'Actividad sospechosa en tu cuenta', body: 'Detectamos un problema. Confirma tu usuario y clave aquí: http://bit.ly/b4nc0-seguro', phishing: true,
    why: 'Los bancos nunca piden tu clave por correo. El dominio y el enlace acortado son sospechosos.' },
  { from: 'biblioteca@micolegio.edu.co', subject: 'Devolución de libro', body: 'Recuerda devolver "El Principito" antes del viernes en la biblioteca. ¡Gracias!', phishing: false,
    why: 'Mensaje normal del colegio, sin enlaces ni peticiones de datos.' },
  { from: 'juanito.2012@correo.com', subject: 'jaja mira esta foto tuya', body: 'no puedo creer que salgas aquí 😂 descárgala: foto_tuya.jpg.exe', phishing: true,
    why: 'Aunque parezca de un amigo, un ".exe" disfrazado de foto es un virus. Su cuenta pudo ser hackeada.' },
  { from: 'diamantes@gratis-diamantes-ff.com', subject: '10.000 diamantes GRATIS 💎', body: 'Solo inicia sesión con tu cuenta de Google en nuestra página y recibe tus diamantes al instante.', phishing: true,
    why: 'Nadie regala monedas de juegos: quieren robar tu cuenta.' },
  { from: 'no-reply@classroom.google.com', subject: 'Nueva tarea: Ensayo de ciencias', body: 'Tu profesora publicó una nueva tarea. Ábrela desde la app de Classroom para verla.', phishing: false,
    why: 'Notificación normal: te dice que entres desde la app oficial y no pide datos.' },
];

// ---------- Antivirus ----------
const FILES_BAD = [
  { name: 'foto_playa.jpg.exe', why: 'Doble extensión: parece foto pero es un programa (.exe).' },
  { name: 'tarea_final.pdf.scr', why: '.scr es un programa disfrazado de PDF.' },
  { name: 'minecraft_gratis_crack.exe', why: 'Los "cracks" y juegos piratas suelen traer virus.' },
  { name: 'abrir_regalo.bat', why: '.bat ejecuta comandos en tu PC: ¡no abras regalos misteriosos!' },
  { name: 'video_chistoso.mp4.exe', why: 'Un video nunca termina en .exe.' },
  { name: 'limpiador_virus_GRATIS.exe', why: 'Los falsos antivirus que aparecen en anuncios son malware.' },
];
const FILES_OK = [
  { name: 'tarea_ingles.docx' }, { name: 'foto_cumpleaños.jpg' }, { name: 'cancion_favorita.mp3' },
  { name: 'presentacion_ciencias.pptx' }, { name: 'notas.txt' }, { name: 'dibujo.png' }, { name: 'horario.pdf' },
];

// ---------- Actualizaciones ----------
const UPDATE_APPS = [
  { app: '🌐 Navegador', good: 'Configuración → Actualizar navegador', bad: '⚠️ ¡Tu navegador está MUY VIEJO! Descarga "NavegadorPro.exe" de esta ventana' },
  { app: '🎮 Juego', good: 'Actualizar desde la tienda oficial de apps', bad: '🎁 Descarga la versión "mejorada" con monedas infinitas desde un enlace' },
  { app: '📄 Lector PDF', good: 'Ayuda → Buscar actualizaciones (página oficial)', bad: '🚨 ¡Tienes 37 virus! Haz clic para instalar el actualizador urgente' },
  { app: '💻 Sistema operativo', good: 'Configuración → Windows Update', bad: '📧 Correo de "Microsft" con un archivo adjunto "update.zip"' },
  { app: '💬 Mensajería', good: 'Actualizar desde la tienda oficial de apps', bad: '🔗 Un mensaje en cadena dice: "instala la versión GOLD con este link"' },
];

// ---------- Wi-Fi ----------
const WIFI_SCENARIOS = [
  { place: '🏫 Estás en el colegio y el profe te dio la contraseña de la red de estudiantes.',
    nets: [
      { name: 'Colegio_Estudiantes', lock: true, ok: true },
      { name: 'Colegio-Estudiantes-GRATIS', lock: false, ok: false, why: 'Copia el nombre de la red real pero está abierta: puede ser una trampa.' },
      { name: 'iPhone de Carlos', lock: false, ok: false, why: 'Es el celular de un desconocido: no sabes quién ve lo que haces.' },
      { name: 'Internet_Rapido_FREE', lock: false, ok: false, why: 'Las redes abiertas con nombres llamativos pueden espiar tu información.' },
    ] },
  { place: '🏠 Estás en tu casa y quieres hacer la tarea.',
    nets: [
      { name: 'Familia_Morales', lock: true, ok: true },
      { name: 'Familia_Morales_5G_libre', lock: false, ok: false, why: 'Se parece a tu red pero no tiene contraseña: alguien la pudo crear para engañarte.' },
      { name: 'Vecino_abierto', lock: false, ok: false, why: 'No uses redes de desconocidos.' },
      { name: 'WiFi GRATIS 100%', lock: false, ok: false, why: 'Nada es "gratis 100%": las redes abiertas pueden robar tus datos.' },
    ] },
  { place: '☕ Estás en una cafetería. La contraseña de la red viene en tu recibo.',
    nets: [
      { name: 'Cafe_Aroma_Clientes', lock: true, ok: true },
      { name: 'Cafe Aroma GRATIS', lock: false, ok: false, why: 'Se hace pasar por la red del café pero no tiene contraseña.' },
      { name: 'Hackeo_123', lock: false, ok: false, why: '¡El nombre lo dice todo!' },
      { name: 'Free_Internet_Fast', lock: false, ok: false, why: 'Red abierta desconocida: puede ser una trampa.' },
    ] },
];

// ---------- Firewall ----------
const FIREWALL_REQS = [
  { text: '🌐 Navegador quiere abrir www.micolegio.edu.co', allow: true, why: 'Es la página de tu colegio desde tu navegador.' },
  { text: '🕷️ Programa desconocido "xX_spy.exe" quiere enviar tus fotos a un servidor extraño', allow: false, why: 'Un programa desconocido enviando tus fotos es spyware.' },
  { text: '🛡️ Antivirus quiere descargar su base de datos de virus', allow: true, why: 'El antivirus necesita actualizarse para reconocer virus nuevos.' },
  { text: '📷 Conexión desconocida desde internet quiere usar tu cámara', allow: false, why: 'Nadie desconocido debe acceder a tu cámara.' },
  { text: '📚 Classroom quiere enviar tu tarea', allow: true, why: 'Es una app conocida que usas para el colegio.' },
  { text: '🏴‍☠️ Juego pirata "crack_juego.exe" pide control total del PC', allow: false, why: 'Los programas piratas suelen traer malware.' },
  { text: '🎵 App de música quiere reproducir tu lista', allow: true, why: 'App conocida haciendo algo normal.' },
  { text: '🤖 Un robot desde internet intenta probar 1000 contraseñas en tu PC', allow: false, why: 'Eso es un ataque de "fuerza bruta": ¡bloquéalo!' },
];

// ---------- Copia de seguridad ----------
const BACKUP_FILES = [
  { name: '📚 Tareas del colegio', important: true },
  { name: '📷 Fotos de la familia', important: true },
  { name: '🔬 Proyecto de ciencias', important: true },
  { name: '📇 Contactos', important: true },
  { name: '🎨 Mis dibujos', important: true },
  { name: '🗑️ Archivos temporales', important: false },
  { name: '📢 Publicidad descargada', important: false },
  { name: '📦 Instalador viejo', important: false },
];

// ---------- Privacidad ----------
const PRIVACY_ITEMS = [
  { text: '🏠 La dirección de tu casa', ok: false },
  { text: '🎨 Un dibujo que hiciste', ok: true },
  { text: '🔑 Tu contraseña', ok: false },
  { text: '🏫 Tu colegio y a qué hora sales', ok: false },
  { text: '🎬 Tu película favorita', ok: true },
  { text: '🪪 Foto de tu documento de identidad', ok: false },
  { text: '📱 Tu número de celular', ok: false },
  { text: '😂 Un meme gracioso (sin datos de nadie)', ok: true },
  { text: '⚽ Que te gusta el fútbol', ok: true },
  { text: '📍 Tu ubicación en tiempo real', ok: false },
];

const QUICK_PHRASES = ['Yo estaba haciendo tareas 🛠️', '¿Dónde estaban? 🤔', 'Yo no fui 🙅', 'Vi a alguien sospechoso 👀', '¡Saltemos el voto! ⏭️', 'Estaba en Recepción', 'Estaba en Servidores'];
