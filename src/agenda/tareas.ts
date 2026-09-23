import type { Prioridad, Tarea } from '../datos/tareas';
import { diaDeSemana, toISO, type ISODate } from '../fechas';

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

export function alternarHecha(t: Tarea, dia: ISODate): Tarea {
  if (esRepetida(t)) {
    const actuales = t.hechas ?? [];
    const hechas = actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia].sort();
    return { ...t, hechas: hechas.length ? hechas : undefined };
  }
  return { ...t, hecha: !t.hecha };
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

export function guardarEnLista(ts: Tarea[], t: TareaSinId, ahora: Date): Tarea[] {
  if (t.id && ts.some((x) => x.id === t.id)) return ts.map((x) => (x.id === t.id ? (t as Tarea) : x));
  return [...ts, { ...t, id: t.id ?? nuevoIdTarea(ahora, ts) }];
}

export function borrarDeLista(ts: Tarea[], id: string): Tarea[] {
  return ts.filter((t) => t.id !== id);
}

export function alternarEnLista(ts: Tarea[], id: string, dia: ISODate): Tarea[] {
  return ts.map((t) => (t.id === id ? alternarHecha(t, dia) : t));
}
