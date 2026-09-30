import { siguienteIdTarea, type Prioridad, type Tarea } from '../datos/tareas';
import type { Area } from '../datos/areas';
import { diaDeSemana, formatoCorto, toISO, type Dia, type ISODate } from '../fechas';
import { areaMadre } from './areas';
import { mezclarCambios } from './cambios';
import { tipoDe } from './tipos';

export type TareaSinId = Omit<Tarea, 'id'> & { id?: string };

const RANGO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export function prioridadDe(x: { prioridad?: Prioridad }): Prioridad {
  return x.prioridad ?? 'media';
}

export function compararPrioridad(a: { prioridad?: Prioridad }, b: { prioridad?: Prioridad }): number {
  return RANGO[prioridadDe(a)] - RANGO[prioridadDe(b)];
}

export function esRepetida(t: Tarea): boolean {
  return t.repetir === 'mes' || t.repetir === 'año' || (Array.isArray(t.repetir) && t.repetir.length > 0);
}

const diasDelMes = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

// Cada mes el mismo día que `inicio`; si ese mes no lo tiene (31 en abril…), el último día del mes.
function mismoDiaDelMes(inicio: ISODate, dia: ISODate): boolean {
  const [y, m, d] = dia.split('-').map(Number);
  return d === Math.min(Number(inicio.slice(8, 10)), diasDelMes(y, m));
}

// Cada año el mismo día y mes; el 29 de febrero, el 28 en los años no bisiestos.
function mismoDiaDelAno(inicio: ISODate, dia: ISODate): boolean {
  const m = Number(dia.slice(5, 7));
  return Number(inicio.slice(5, 7)) === m && mismoDiaDelMes(inicio, dia);
}

export function ocurreEl(t: Tarea, dia: ISODate): boolean {
  if (!esRepetida(t)) return t.fecha === dia;
  if ((t.fecha && dia < t.fecha) || (t.hasta && dia > t.hasta)) return false;
  if (t.repetir === 'mes') return mismoDiaDelMes(t.fecha!, dia);
  if (t.repetir === 'año') return mismoDiaDelAno(t.fecha!, dia);
  return (t.repetir as Dia[]).includes(diaDeSemana(dia));
}

export function hechaEl(t: Tarea, dia: ISODate): boolean {
  if (tipoDe(t) === 'evento') return false; // los eventos no se marcan
  return esRepetida(t) ? (t.hechas ?? []).includes(dia) : t.hecha === true;
}

export function describirRepeticion(t: Tarea): string | undefined {
  if (!esRepetida(t)) return undefined;
  const cada = t.repetir === 'mes' ? 'cada mes' : t.repetir === 'año' ? 'cada año' : `cada ${(t.repetir as Dia[]).join(', ')}`;
  return t.hasta ? `${cada} hasta ${formatoCorto(t.hasta)}` : cada;
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
    .filter((t) => !esRepetida(t) && !!t.fecha && t.fecha < hoy && !t.hecha && tipoDe(t) !== 'examen' && tipoDe(t) !== 'evento')
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!) || compararPrioridad(a, b));
}

export function repetidas(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts.filter((t) => esRepetida(t) && !(t.hasta && t.hasta < hoy)).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
}

export function sinFecha(ts: Tarea[]): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !t.fecha && tipoDe(t) !== 'recado')
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
  return siguienteIdTarea(toISO(ahora), existentes);
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

// Un área nueva (creada aquí o en otra pantalla) sale visible aunque haya un filtro guardado, hasta que se vuelva
// a tocar el filtro: se compara contra `conocidas` (las áreas que había cuando se guardó `encendidas` la última vez).
export function encendidasEfectivas(encendidas: string[], conocidas: string[], todas: string[]): string[] {
  const validas = encendidas.filter((a) => todas.includes(a));
  if (validas.length === 0) return [];
  const nuevas = todas.filter((a) => !conocidas.includes(a) && !validas.includes(a));
  return [...validas, ...nuevas];
}
