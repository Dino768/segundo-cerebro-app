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
    if (!c) return null;
    // Una caché antigua puede no tener ideas ni asignaturas, tener ideas con el formato de la bandeja o áreas sin subáreas.
    const ideas = (c.ideas ?? []).filter((i) => typeof i?.id === 'string' && typeof i?.texto === 'string');
    const areas = (c.areas ?? []).map((a) => ({ ...a, subareas: a.subareas ?? [] }));
    return { tareas: c.tareas ?? [], areas, proyectos: c.proyectos ?? [], ideas, asignaturas: c.asignaturas ?? [] };
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
