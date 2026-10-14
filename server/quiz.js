// ============================================================
//  PREGUNTAS DE LAS REUNIONES
//  Están SOLO en el servidor: así nadie puede ver las respuestas
//  correctas abriendo el código del navegador (¡no confíes en el cliente!).
//  Quien responda bien tiene VOTO DOBLE en esa reunión.
//  Para agregar preguntas: copia un bloque y cambia el texto.
//  "correct" es la posición de la respuesta correcta (empieza en 0).
// ============================================================
module.exports = [
  {
    q: '¿Cuál de estas contraseñas es la más segura?',
    options: ['123456', 'MiPerro2010', 'Tr3n-Azul!Galleta#9', 'contraseña'],
    correct: 2,
    explanation: 'Es larga y mezcla mayúsculas, minúsculas, números y símbolos. Las otras son muy fáciles de adivinar.',
  },
  {
    q: 'Te llega un mensaje: "¡Ganaste un celular! Haz clic aquí y escribe tus datos". ¿Qué haces?',
    options: ['Hago clic rápido antes de que se acabe', 'Lo reenvío a mis amigos', 'No hago clic, lo borro y le aviso a un adulto', 'Respondo con mis datos'],
    correct: 2,
    explanation: 'Eso es phishing: un mensaje falso para robar tus datos. Si no participaste en nada, no ganaste nada.',
  },
  {
    q: '¿Qué es un virus informático?',
    options: ['Un programa que se copia solo y puede dañar tu computador', 'Un resfriado que le da al computador por el frío', 'Un tipo de cable', 'Un juego gratis'],
    correct: 0,
    explanation: 'Un virus es un programa malicioso (malware) que se esconde en archivos y se propaga a otros equipos.',
  },
  {
    q: '¿Qué es un "exploit"?',
    options: ['Un antivirus muy rápido', 'Una forma de aprovechar un error de un programa para atacarlo', 'Una red Wi‑Fi', 'Un tipo de contraseña'],
    correct: 1,
    explanation: 'Los programas a veces tienen errores (vulnerabilidades). Un exploit es el "truco" que usa un atacante para aprovecharlos.',
  },
  {
    q: '¿Por qué es importante instalar las actualizaciones de tus apps?',
    options: ['Solo para que cambien de color', 'Porque arreglan errores de seguridad que usan los atacantes', 'No sirven para nada', 'Para que el celular sea más lento'],
    correct: 1,
    explanation: 'Las actualizaciones tapan los "agujeros" que los atacantes usan con exploits.',
  },
  {
    q: '¿Qué es la verificación en dos pasos (2FA)?',
    options: ['Escribir la contraseña dos veces', 'Tener dos computadores', 'Pedir un código extra (por ejemplo al celular) además de la contraseña', 'Cambiar de contraseña cada día'],
    correct: 2,
    explanation: 'Así, aunque alguien robe tu contraseña, no puede entrar sin el código de tu celular.',
  },
  {
    q: '¿Es buena idea usar la misma contraseña para todas tus cuentas?',
    options: ['Sí, así no se me olvida', 'No, si roban una, pueden entrar a todas', 'Sí, si es larga', 'Solo en los juegos'],
    correct: 1,
    explanation: 'Cada cuenta debe tener su propia contraseña. Un administrador de contraseñas te ayuda a recordarlas.',
  },
  {
    q: '¿Qué es un ransomware?',
    options: ['Un programa que bloquea tus archivos y pide dinero para devolverlos', 'Un videojuego de carreras', 'Una actualización oficial', 'Un tipo de mouse'],
    correct: 0,
    explanation: 'El ransomware "secuestra" tus archivos. Tener copias de seguridad es la mejor defensa.',
  },
  {
    q: '¿Cuál de estos datos NO deberías publicar en redes sociales?',
    options: ['Tu película favorita', 'Un dibujo que hiciste', 'La dirección de tu casa', 'Tu color favorito'],
    correct: 2,
    explanation: 'Tu dirección, tu colegio, tu horario y tus contraseñas son datos privados.',
  },
  {
    q: '¿Qué hace un firewall (cortafuegos)?',
    options: ['Apaga incendios en el computador', 'Revisa las conexiones y bloquea las sospechosas', 'Hace que el internet sea gratis', 'Borra fotos viejas'],
    correct: 1,
    explanation: 'El firewall es como el portero de un edificio: deja pasar a los conocidos y bloquea a los extraños.',
  },
  {
    q: 'Un archivo se llama "fotos_paseo.jpg.exe". ¿Qué es lo más probable?',
    options: ['Es una foto normal', 'Es un programa disfrazado de foto, puede ser un virus', 'Es una canción', 'Es un documento del colegio'],
    correct: 1,
    explanation: 'La extensión real es la última: ".exe" es un programa. Los virus se disfrazan con dobles extensiones.',
  },
  {
    q: '¿Qué es el phishing?',
    options: ['Un deporte de pesca', 'Mensajes falsos que se hacen pasar por alguien de confianza para robar datos', 'Una app de música', 'Un antivirus'],
    correct: 1,
    explanation: 'Los atacantes "pescan" víctimas con mensajes falsos de bancos, juegos o amigos.',
  },
  {
    q: '¿Para qué sirve una copia de seguridad (backup)?',
    options: ['Para recuperar tus archivos si se pierden o los bloquea un virus', 'Para que el PC vaya más rápido', 'Para jugar en línea', 'Para borrar virus'],
    correct: 0,
    explanation: 'Si un ransomware o un daño borra tus archivos, puedes recuperarlos desde tu copia.',
  },
  {
    q: 'Alguien te escribe: "Soy de soporte técnico, dame tu contraseña para arreglar tu cuenta". ¿Qué haces?',
    options: ['Se la doy, es de soporte', 'Nunca la comparto y le cuento a un adulto', 'Le doy solo la mitad', 'Le mando una foto de la contraseña'],
    correct: 1,
    explanation: 'Ninguna empresa real te pide tu contraseña. Eso se llama ingeniería social.',
  },
  {
    q: '¿Qué es un ataque DDoS?',
    options: ['Un virus que borra fotos', 'Enviar muchísimas peticiones falsas a un servicio para que se caiga', 'Una contraseña débil', 'Una red Wi‑Fi segura'],
    correct: 1,
    explanation: 'Es como si miles de personas llamaran al mismo tiempo a un teléfono: nadie más puede comunicarse.',
  },
  {
    q: '¿Qué red Wi‑Fi es más segura para entrar a tu correo?',
    options: ['"WiFi_GRATIS" sin contraseña', 'La red de tu casa con contraseña', 'Una red con nombre raro como "Hackeo_123"', 'Cualquiera, todas son iguales'],
    correct: 1,
    explanation: 'Las redes abiertas o desconocidas pueden ser trampas para espiar lo que haces.',
  },
];
