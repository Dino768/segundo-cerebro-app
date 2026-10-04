// La pastilla «🎓 Clases» del calendario: apagada por defecto y recordada en cada dispositivo (spec horario §6).
const CLAVE = 'sc-calendario-clases';

export function leerClasesVisibles(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function guardarClasesVisibles(v: boolean): void {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0');
  } catch {
    // sin almacenamiento: no se recuerda
  }
}
