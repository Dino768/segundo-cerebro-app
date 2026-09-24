import type { Datos } from '../repositorio';

const CLAVE = 'sc-datos';
type DatosCache = Omit<Datos, 'errores'>;

export function guardarCache(d: Datos): void {
  try {
    const copia: DatosCache = { tareas: d.tareas, areas: d.areas, proyectos: d.proyectos, ideas: d.ideas, asignaturas: d.asignaturas };
    localStorage.setItem(CLAVE, JSON.stringify(copia));
  } catch {
    // sin almacenamiento: no habrá modo sin conexión
  }
}

export function leerCache(): DatosCache | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<DatosCache> | null;
    // Una caché antigua no tiene ideas ni asignaturas.
    return c ? { tareas: c.tareas ?? [], areas: c.areas ?? [], proyectos: c.proyectos ?? [], ideas: c.ideas ?? [], asignaturas: c.asignaturas ?? [] } : null;
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
