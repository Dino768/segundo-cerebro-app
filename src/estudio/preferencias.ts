// Pequeñas preferencias de este navegador (última asignatura, ancho del chat…). Si no hay almacenamiento, no pasa nada.
export function leerPreferencia(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardarPreferencia(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // sin almacenamiento
  }
}
