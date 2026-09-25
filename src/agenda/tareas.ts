import type { Prioridad, Tarea } from '../datos/tareas';
import type { Area } from '../datos/areas';
import { diaDeSemana, toISO, type ISODate } from '../fechas';
import { areaMadre } from './areas';
import { mezclarCambios } from './cambios';

export type TareaSinId = Omit<Tarea, 'id'> & { id?: string };

const RANGO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export function prioridadDe(x: { prioridad?: Prioridad }): Prioridad {
  return x.prioridad ?? 'media';
}

export function compararPrioridad(a: { prioridad?: Prioridad }, b: { prioridad?: Prioridad }): number {
  return RANGO[prioridadDe(a)] - RANGO[prioridadDe(b)];
}

export function esRepetida(t: Tarea): boolean {
  return (t.repetir?.length ?? 0) > 0;
}

export function ocurreEl(t: Tarea, dia: ISODate): boolean {
  if (esRepetida(t)) return t.repetir!.includes(diaDeSemana(dia)) && (!t.fecha || dia >= t.fecha);
  return t.fecha === dia;
}

export function hechaEl(t: Tarea, dia: ISODate): boolean {
  return esRepetida(t) ? (t.hechas ?? []).includes(dia) : t.hecha === true;
}

function compararHora(a: Tarea, b: Tarea): number {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return 0;
}

export function tareasDelDia(ts: Tarea[], dia: ISODate): Tarea[] {
  return ts.filter((t) => ocurreEl(t, dia)).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
}

export function atrasadas(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !!t.fecha && t.fecha < hoy && !t.hecha)
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!) || compararPrioridad(a, b));
}

export function proximas(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !!t.fecha && t.fecha >= hoy && !t.hecha)
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!) || compararHora(a, b) || compararPrioridad(a, b));
}

export function repetidas(ts: Tarea[]): Tarea[] {
  return ts.filter(esRepetida).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
}

export function sinFecha(ts: Tarea[]): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !t.fecha)
    .sort((a, b) => Number(!!a.hecha) - Number(!!b.hecha) || compararPrioridad(a, b));
}

export function topSinFecha(ts: Tarea[], n = 3): Tarea[] {
  return sinFecha(ts)
    .filter((t) => !t.hecha)
    .slice(0, n);
}

export function fijarHecha(t: Tarea, dia: ISODate, valor: boolean): Tarea {
  if (esRepetida(t)) {
    const otras = (t.hechas ?? []).filter((d) => d !== dia);
    const hechas = valor ? [...otras, dia].sort() : otras;
    return { ...t, hechas: hechas.length ? hechas : undefined };
  }
  return { ...t, hecha: valor };
}

export function nuevoIdTarea(ahora: Date, existentes: Tarea[]): string {
  const prefijo = `t-${toISO(ahora).replace(/-/g, '')}-`;
  let max = 0;
  for (const t of existentes) {
    if (!t.id.startsWith(prefijo)) continue;
    const n = Number(t.id.slice(prefijo.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefijo}${max + 1}`;
}

export function aplicarEdicion(ts: Tarea[], original: Tarea | null, editada: TareaSinId, ahora: Date): Tarea[] {
  if (!original) return [...ts, { ...editada, id: nuevoIdTarea(ahora, ts) } as Tarea];
  const remota = ts.find((x) => x.id === original.id);
  if (!remota) return [...ts, { ...editada, id: original.id } as Tarea];
  return ts.map((x) => (x === remota ? (mezclarCambios(remota, original, editada) as Tarea) : x));
}

export function borrarDeLista(ts: Tarea[], id: string): Tarea[] {
  return ts.filter((t) => t.id !== id);
}

export function fijarEnLista(ts: Tarea[], id: string, dia: ISODate, valor: boolean): Tarea[] {
  return ts.map((t) => (t.id === id ? fijarHecha(t, dia, valor) : t));
}

export function contarPendientes(ts: Tarea[]): number {
  return ts.filter((t) => !esRepetida(t) && !t.hecha).length;
}

// Filtro de "calendarios" por área. `encendidas` vacía = todas. OTRAS agrupa las áreas que no están en areas.yaml.
export const OTRAS = 'otras';

export function hayOtrasAreas(ts: Tarea[], areas: Area[]): boolean {
  return ts.some((t) => areaMadre(areas, t.area) === undefined);
}

// Cada tarea cuenta para su área grande: encender «Videojuegos» enseña también Blender, Unreal…
export function filtrarPorAreas(ts: Tarea[], encendidas: string[], areas: Area[]): Tarea[] {
  // «Otras» solo cuenta si de verdad hay tareas con áreas desconocidas; si no, el calendario saldría vacío.
  const conocidas = areas.map((a) => a.id);
  const hayOtras = hayOtrasAreas(ts, areas);
  const validas = encendidas.filter((a) => conocidas.includes(a) || (a === OTRAS && hayOtras));
  if (validas.length === 0) return ts;
  return ts.filter((t) => validas.includes(areaMadre(areas, t.area) ?? OTRAS));
}

export function alternarArea(encendidas: string[], area: string, todas: string[]): string[] {
  const validas = encendidas.filter((a) => todas.includes(a));
  const actuales = validas.length ? validas : todas;
  const nuevas = actuales.includes(area) ? actuales.filter((a) => a !== area) : [...actuales, area];
  return nuevas.length === 0 || todas.every((a) => nuevas.includes(a)) ? [] : nuevas;
}
