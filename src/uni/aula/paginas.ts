// Lee lo que devuelve el aula virtual (Moodle 4.5 de la URJC). Sin red: solo texto → datos.
import { ErrorFormato } from '../tipos.ts';

// La URJC ha cerrado la sesión: hay que volver a entrar (con ventana).
export class SesionCaducada extends Error {
  constructor() {
    super('la sesión del aula virtual ha caducado: hay que volver a entrar');
    this.name = 'SesionCaducada';
  }
}

export function esPaginaDeEntrada(url: string): boolean {
  return /^https:\/\/identifica\.urjc\.es\//.test(url) || /\/moodle\/login\/index\.php/.test(url);
}

export function leerSesskey(html: string): string {
  const m = /"sesskey":"([A-Za-z0-9]+)"/.exec(html);
  if (!m) throw new ErrorFormato('no encuentro la sesskey en la página del aula virtual');
  return m[1];
}
