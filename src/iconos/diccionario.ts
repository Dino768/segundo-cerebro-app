// Palabras → icono de Tabler. Se compara por principio de palabra, sin tildes ni mayúsculas:
// «exámenes» encaja con «examen». El primero que encaje gana, así que lo más concreto va antes.
export type Nodo = [string, Record<string, string>];

export const DICCIONARIO: { icono: string; palabras: string[] }[] = [
  // Marcas primero: son lo más concreto.
  { icono: 'brand-blender', palabras: ['blender'] },
  { icono: 'brand-unity', palabras: ['unity'] },
  // Uni
  { icono: 'file-pencil', palabras: ['examen', 'parcial', 'test', 'recuperacion'] },
  { icono: 'clipboard-text', palabras: ['practica', 'entrega', 'trabajo', 'memoria', 'informe'] },
  { icono: 'school', palabras: ['clase', 'uni', 'universidad', 'tutoria', 'asignatura', 'carrera'] },
  { icono: 'math-function', palabras: ['mates', 'matematicas', 'calculo', 'algebra', 'integral', 'derivada'] },
  { icono: 'atom', palabras: ['fisica', 'quimica', 'newton'] },
  { icono: 'code', palabras: ['programacion', 'programar', 'codigo', 'python', 'java', 'c++', 'git', 'app'] },
  { icono: 'robot', palabras: ['robot', 'robotica', 'ros', 'arduino'] },
  { icono: 'cpu', palabras: ['electronica', 'circuito', 'hardware'] },
  { icono: 'books', palabras: ['estudiar', 'repasar', 'apuntes', 'temario', 'libro', 'leer'] },
  { icono: 'language', palabras: ['ingles', 'idioma', 'english'] },
  // Videojuegos y 3D
  { icono: 'device-gamepad-2', palabras: ['juego', 'videojuego', 'unreal', 'roblox', 'gamejam', 'jam', 'jugar', 'game'] },
  { icono: 'cube', palabras: ['3d', 'modelar', 'modelado', 'retopologia', 'render', 'escultura', 'malla'] },
  { icono: 'sword', palabras: ['combate', 'enemigo', 'jefe', 'arma', 'rpg'] },
  { icono: 'map-pin', palabras: ['nivel', 'mapa', 'escenario', 'mundo'] },
  { icono: 'ghost', palabras: ['personaje', 'npc', 'criatura'] },
  // Arte, música, vídeo
  { icono: 'movie', palabras: ['animacion', 'animar', 'video', 'pelicula', 'corto'] },
  { icono: 'brush', palabras: ['dibujo', 'dibujar', 'pintar', 'ilustracion', 'arte', 'boceto', 'sketch'] },
  { icono: 'palette', palabras: ['color', 'diseno', 'textura'] },
  { icono: 'music', palabras: ['musica', 'cancion', 'componer', 'composicion', 'melodia', 'banda'] },
  { icono: 'piano', palabras: ['piano', 'teclado', 'musica'] },
  { icono: 'headphones', palabras: ['escuchar', 'podcast', 'sonido', 'audio'] },
  { icono: 'writing', palabras: ['escribir', 'historia', 'guion', 'relato', 'lore'] },
  { icono: 'camera', palabras: ['foto', 'fotografia'] },
  // Salud y deporte
  { icono: 'barbell', palabras: ['gym', 'gimnasio', 'pesas', 'entrenar', 'entreno', 'musculacion'] },
  { icono: 'run', palabras: ['correr', 'running'] },
  { icono: 'bike', palabras: ['bici', 'bicicleta', 'ciclismo'] },
  { icono: 'swimming', palabras: ['nadar', 'natacion', 'piscina'] },
  { icono: 'ball-football', palabras: ['futbol', 'partido'] },
  { icono: 'yoga', palabras: ['yoga', 'estirar', 'meditar'] },
  { icono: 'stethoscope', palabras: ['medico', 'doctor', 'cita', 'dentista', 'revision'] },
  { icono: 'pill', palabras: ['pastilla', 'medicina', 'farmacia'] },
  // Vida diaria
  { icono: 'shopping-cart', palabras: ['compra', 'comprar', 'super', 'mercado'] },
  { icono: 'cake', palabras: ['cumple', 'cumpleanos', 'fiesta'] },
  { icono: 'gift', palabras: ['regalo'] },
  { icono: 'plane', palabras: ['viaje', 'viajar', 'vuelo', 'vacaciones'] },
  { icono: 'train', palabras: ['tren', 'cercanias'] },
  { icono: 'bus', palabras: ['bus', 'autobus'] },
  { icono: 'car', palabras: ['coche', 'carnet', 'conducir'] },
  { icono: 'home', palabras: ['casa', 'limpiar', 'ordenar', 'habitacion'] },
  { icono: 'users', palabras: ['amigos', 'quedar', 'familia', 'reunion'] },
  { icono: 'heart', palabras: ['pareja', 'amor', 'san valentin'] },
  { icono: 'briefcase', palabras: ['curro', 'empleo', 'entrevista', 'cv', 'portfolio'] },
  { icono: 'calculator', palabras: ['dinero', 'pagar', 'factura', 'ahorro', 'presupuesto'] },
  { icono: 'message', palabras: ['llamar', 'mensaje', 'email', 'correo', 'escribirle'] },
  { icono: 'alarm', palabras: ['recordar', 'recordatorio', 'despertar'] },
  { icono: 'bulb', palabras: ['idea', 'ideas', 'inventar'] },
  { icono: 'tools', palabras: ['arreglar', 'reparar', 'montar', 'configurar', 'instalar'] },
];

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function palabrasDe(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9+ñ]+/).filter(Boolean);
}

// ¿La palabra del título es la clave o una forma cercana (plural, «-ar»…)? Las claves cortas tienen que ser exactas.
function encaja(palabra: string, clave: string): boolean {
  if (clave.length <= 3) return palabra === clave || palabra === `${clave}s`;
  return palabra.startsWith(clave) && palabra.length - clave.length <= 3;
}

export function iconoPara(titulo: string): string | undefined {
  const palabras = palabrasDe(titulo);
  if (!palabras.length) return undefined;
  const seguidas = ` ${palabras.join(' ')} `;
  for (const e of DICCIONARIO)
    if (e.palabras.some((clave) => {
      const partes = palabrasDe(clave);
      // Una clave de varias palabras («san valentin») tiene que aparecer seguida.
      if (partes.length > 1) return seguidas.includes(` ${partes.join(' ')} `);
      return palabras.some((p) => encaja(p, partes[0]));
    }))
      return e.icono;
  return undefined;
}

// Mientras se escribe el título, el icono lo pone el diccionario; si Diego lo eligió (o quitó) a mano, se queda.
export function iconoAlEscribir(titulo: string, actual: string | undefined, fijado: boolean): string | undefined {
  return fijado ? actual : iconoPara(titulo);
}
