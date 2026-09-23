export type ISODate = string;

export const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
export type Dia = (typeof DIAS)[number];

export function toISO(d: Date): ISODate {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function sumarMeses(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function diaDeSemana(iso: ISODate): Dia {
  return DIAS[(fromISO(iso).getDay() + 6) % 7];
}

export function isISODate(x: unknown): x is ISODate {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && toISO(fromISO(x)) === x;
}

export function isHora(x: unknown): x is string {
  return typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
}

export function diasSemana(iso: ISODate): ISODate[] {
  const lunes = addDays(iso, -DIAS.indexOf(diaDeSemana(iso)));
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
}

export function cuadriculaMes(year: number, month: number): ISODate[][] {
  const semanas: ISODate[][] = [];
  let lunes = diasSemana(toISO(new Date(year, month - 1, 1)))[0];
  do {
    semanas.push(diasSemana(lunes));
    lunes = addDays(lunes, 7);
  } while (fromISO(lunes).getMonth() === month - 1);
  return semanas;
}

export function formatoLargo(iso: ISODate): string {
  return fromISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatoCorto(iso: ISODate): string {
  return fromISO(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function nombreMes(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}
