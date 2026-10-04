import type { AjustesHorario, Clase, Quitada, Suelta } from '../datos/horario';
import { addDays, toISO, type ISODate } from '../fechas';

// Una clase tal y como se enseña: las del horario de la URJC más las sueltas, con las quitadas marcadas.
export interface ClaseDelDia extends Clase {
  suelta?: boolean;
  nota?: string;
  quitada?: boolean;
}

const mismaClase = (a: Quitada, b: Quitada) => a.fecha === b.fecha && a.inicio === b.inicio && a.asignatura === b.asignatura;

export function clasesDelDia(clases: Clase[], ajustes: AjustesHorario, dia: ISODate): ClaseDelDia[] {
  const delHorario: ClaseDelDia[] = clases
    .filter((c) => c.fecha === dia)
    .map((c) => (ajustes.quitadas.some((q) => mismaClase(q, c)) ? { ...c, quitada: true } : c));
  const sueltas: ClaseDelDia[] = ajustes.sueltas.filter((s) => s.fecha === dia).map((s) => ({ ...s, suelta: true }));
  return [...delHorario, ...sueltas].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.asignatura.localeCompare(b.asignatura));
}

export function clasesActivas(clases: Clase[], ajustes: AjustesHorario, dia: ISODate): ClaseDelDia[] {
  return clasesDelDia(clases, ajustes, dia).filter((c) => !c.quitada);
}

export interface AhoraYSiguiente {
  enCurso: ClaseDelDia | null;
  siguiente: ClaseDelDia | null;
  esManana: boolean;
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

export function ahoraYSiguiente(clases: Clase[], ajustes: AjustesHorario, ahora: Date): AhoraYSiguiente {
  const hoy = toISO(ahora);
  const hm = `${dosCifras(ahora.getHours())}:${dosCifras(ahora.getMinutes())}`;
  const deHoy = clasesActivas(clases, ajustes, hoy);
  // Si una acaba justo cuando empieza otra, manda la que empieza (fin no incluido).
  const enCurso = deHoy.find((c) => c.inicio <= hm && hm < c.fin) ?? null;
  const siguiente = deHoy.find((c) => c.inicio > hm && c !== enCurso) ?? null;
  if (enCurso || siguiente) return { enCurso, siguiente, esManana: false };
  const manana = clasesActivas(clases, ajustes, addDays(hoy, 1))[0] ?? null;
  return { enCurso: null, siguiente: manana, esManana: manana !== null };
}

export function quitarClase(a: AjustesHorario, q: Quitada): AjustesHorario {
  if (a.quitadas.some((x) => mismaClase(x, q))) return a;
  return { ...a, quitadas: [...a.quitadas, { fecha: q.fecha, inicio: q.inicio, asignatura: q.asignatura }] };
}

export function volverAPoner(a: AjustesHorario, q: Quitada): AjustesHorario {
  return { ...a, quitadas: a.quitadas.filter((x) => !mismaClase(x, q)) };
}

export function anadirSuelta(a: AjustesHorario, s: Suelta): AjustesHorario {
  return { ...a, sueltas: [...a.sueltas, s] };
}

export function borrarSuelta(a: AjustesHorario, s: Quitada): AjustesHorario {
  return { ...a, sueltas: a.sueltas.filter((x) => !mismaClase(x, s)) };
}

export function minutos(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

// Horas que enseña la cuadrícula: como mínimo de 9 a 15.
export function horasCuadricula(clases: ClaseDelDia[]): { desde: number; hasta: number } {
  let desde = 9;
  let hasta = 15;
  for (const c of clases) {
    desde = Math.min(desde, Math.floor(minutos(c.inicio) / 60));
    hasta = Math.max(hasta, Math.ceil(minutos(c.fin) / 60));
  }
  return { desde, hasta };
}

export function horaBonita(h: string): string {
  return h.replace(/^0(\d)/, '$1');
}
