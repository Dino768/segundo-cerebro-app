// Área de la última tarea creada en este dispositivo, para proponerla en la siguiente (spec §4, recados).
const CLAVE = 'ultima-area';

export function leerUltimaArea(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function guardarUltimaArea(id: string): void {
  try {
    localStorage.setItem(CLAVE, id);
  } catch {
    /* sin almacenamiento */
  }
}
