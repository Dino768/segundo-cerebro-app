import type { Area, Subarea } from '../datos/areas';
import { aSlug } from '../texto';

export const COLOR_DESCONOCIDO = '#9ca3af';

// Colores del tema para elegir rápido (también hay un selector libre).
export const PALETA = ['#3b82f6', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#78716c'];

export class ErrorArea extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorArea';
  }
}

export function buscarArea(areas: Area[], id: string | undefined): { area: Subarea; madre: Area } | undefined {
  if (!id) return undefined;
  for (const madre of areas) {
    if (madre.id === id) return { area: madre, madre };
    const sub = madre.subareas.find((s) => s.id === id);
    if (sub) return { area: sub, madre };
  }
  return undefined;
}

export function areaMadre(areas: Area[], id: string | undefined): string | undefined {
  return buscarArea(areas, id)?.madre.id;
}

// Un área grande cubre su id y los de sus subáreas; una subárea, solo el suyo.
export function idsDeArea(areas: Area[], id: string): string[] {
  const grande = areas.find((a) => a.id === id);
  if (grande) return [grande.id, ...grande.subareas.map((s) => s.id)];
  return buscarArea(areas, id) ? [id] : [];
}

export function todosLosIds(areas: Area[]): string[] {
  return areas.flatMap((a) => [a.id, ...a.subareas.map((s) => s.id)]);
}

export function colorDeArea(areas: Area[], id: string | undefined): string {
  return buscarArea(areas, id)?.area.color ?? COLOR_DESCONOCIDO;
}

export function nombreDeArea(areas: Area[], id: string | undefined): string | undefined {
  return buscarArea(areas, id)?.area.nombre;
}

// 'otras' es el id que usa el calendario para agrupar tareas con un área desconocida (OTRAS en agenda/tareas.ts);
// se repite aquí en vez de importarlo para no crear un import circular entre areas.ts y tareas.ts.
const ID_OTRAS = 'otras';

export function nuevoIdArea(nombre: string, areas: Area[]): string {
  const base = aSlug(nombre, 40) || 'area';
  const usados = [...todosLosIds(areas), ID_OTRAS];
  let id = base;
  for (let n = 2; usados.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function crearArea(areas: Area[], datos: { nombre: string; color?: string }, madre?: string): Area[] {
  const nombre = datos.nombre.trim();
  const id = nuevoIdArea(nombre, areas);
  if (!madre) return [...areas, { id, nombre, color: datos.color ?? PALETA[areas.length % PALETA.length], subareas: [] }];
  const grande = areas.find((a) => a.id === madre);
  if (!grande) throw new ErrorArea('Solo se pueden crear subáreas dentro de un área grande (y esta ya no existe o es una subárea).');
  return areas.map((a) => (a === grande ? { ...a, subareas: [...a.subareas, { id, nombre, color: datos.color ?? a.color }] } : a));
}

export function editarArea(areas: Area[], id: string, cambios: { nombre?: string; color?: string }): Area[] {
  if (!buscarArea(areas, id)) throw new ErrorArea('Esta área ha cambiado mientras tanto (quizá la borró Claude u otro dispositivo).');
  const aplicar = <T extends Subarea>(x: T): T =>
    x.id === id ? { ...x, ...(cambios.nombre?.trim() ? { nombre: cambios.nombre.trim() } : {}), ...(cambios.color ? { color: cambios.color } : {}) } : x;
  return areas.map((a) => aplicar({ ...a, subareas: a.subareas.map(aplicar) }));
}

export function quitarArea(areas: Area[], id: string): Area[] {
  return areas.filter((a) => a.id !== id).map((a) => ({ ...a, subareas: a.subareas.filter((s) => s.id !== id) }));
}

export function destinosPosibles(areas: Area[], id: string): string[] {
  const fuera = idsDeArea(areas, id);
  return todosLosIds(areas).filter((x) => !fuera.includes(x));
}

export function moverDeArea<T extends { area?: string }>(xs: T[], ids: string[], destino: string): T[] {
  if (ids.includes(destino)) throw new ErrorArea('El destino no puede ser el área que se borra ni una de sus subáreas.');
  return xs.map((x) => (x.area !== undefined && ids.includes(x.area) ? { ...x, area: destino } : x));
}

