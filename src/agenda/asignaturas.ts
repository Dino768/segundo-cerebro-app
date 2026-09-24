import { GENERAL, type Asignatura } from '../datos/asignaturas';
import { aSlug } from '../texto';

export const COLORES_ASIGNATURA = ['#3d7bb8', '#b8603d', '#5a8f4e', '#8a5bb0', '#c08a2e', '#3f8f8a', '#b84a6a'];

export function idAsignaturaDesdeNombre(nombre: string, existentes: string[]): string {
  const base = aSlug(nombre, 36) || 'asignatura';
  const ocupados = new Set([...existentes, GENERAL.id]);
  if (!ocupados.has(base)) return base;
  for (let n = 2; ; n++) if (!ocupados.has(`${base}-${n}`)) return `${base}-${n}`;
}

export function anadirAsignatura(lista: Asignatura[], nombre: string, color?: string): Asignatura[] {
  const limpio = nombre.trim();
  if (!limpio) return lista;
  const id = idAsignaturaDesdeNombre(limpio, lista.map((a) => a.id));
  return [...lista, { id, nombre: limpio, color: color ?? COLORES_ASIGNATURA[lista.length % COLORES_ASIGNATURA.length] }];
}

export function editarAsignatura(lista: Asignatura[], id: string, cambios: { nombre?: string; color?: string }): Asignatura[] {
  return lista.map((a) =>
    a.id === id ? { ...a, nombre: cambios.nombre?.trim() || a.nombre, color: cambios.color ?? a.color } : a,
  );
}

// Solo la quita de la lista: su carpeta y su historial no se borran.
export function quitarAsignatura(lista: Asignatura[], id: string): Asignatura[] {
  return lista.filter((a) => a.id !== id);
}
