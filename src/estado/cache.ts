import type { Datos } from '../repositorio';

const CLAVE = 'sc-datos';
type DatosCache = Omit<Datos, 'errores'>;

export function guardarCache(d: Datos): void {
  try {
    const copia: DatosCache = { tareas: d.tareas, areas: d.areas, proyectos: d.proyectos };
    localStorage.setItem(CLAVE, JSON.stringify(copia));
  } catch {
    // sin almacenamiento: no habrá modo sin conexión
  }
}

export function leerCache(): DatosCache | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as DatosCache | null;
  } catch {
    return null;
  }
}

export function borrarCache(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
