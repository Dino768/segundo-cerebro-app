import { addDays, toISO, type ISODate } from '../fechas';

export type Unidad = 'semanas' | 'meses' | 'años';

// «Durante 1 mes» desde el 1 de octubre = hasta el 31 de octubre: el día antes de cumplirse.
// Si el día no existe en el mes de destino (31 de enero + 1 mes), se usa el último día de ese mes.
export function hastaDurante(inicio: ISODate, n: number, unidad: Unidad): ISODate {
  const veces = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  if (unidad === 'semanas') return addDays(inicio, 7 * veces - 1);
  const [y, m, d] = inicio.split('-').map(Number);
  const mesDestino = m - 1 + (unidad === 'meses' ? veces : 12 * veces);
  const ultimoDia = new Date(y, mesDestino + 1, 0).getDate();
  return addDays(toISO(new Date(y, mesDestino, Math.min(d, ultimoDia))), -1);
}
