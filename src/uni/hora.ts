import type { ISODate } from '../fechas.ts';

export interface FechaHora {
  fecha: ISODate;
  hora: string;
}

const FORMATO = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Fecha y hora de Madrid de un instante, sea cual sea la zona horaria del ordenador (los servidores de GitHub van en UTC).
export function enMadrid(instante: Date): FechaHora {
  const p = Object.fromEntries(FORMATO.formatToParts(instante).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export function hoyEnMadrid(ahora: Date): ISODate {
  return enMadrid(ahora).fecha;
}

// Moodle escribe «a las 00:00 del día 6» cuando quiere decir «hasta el final del día 5».
export function plazoEnMadrid(instante: Date): FechaHora {
  const r = enMadrid(instante);
  return r.hora === '00:00' ? { fecha: diaAnterior(r.fecha), hora: '23:59' } : r;
}

function diaAnterior(iso: ISODate): ISODate {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
