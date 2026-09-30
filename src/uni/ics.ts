import { ErrorFormato } from './tipos.ts';

export interface EventoIcs {
  uid: string;
  titulo: string;
  descripcion: string;
  inicio: Date;
  // DTSTART;VALUE=DATE: evento de todo el día (sin hora).
  soloDia: boolean;
  categorias: string[];
}

export interface ResultadoIcs {
  eventos: EventoIcs[];
  saltados: number;
}

interface Propiedad {
  params: string;
  valor: string;
}

// Lee un calendario iCalendar (lo que exporta Moodle). Los eventos sin UID o sin fecha legible se saltan y se cuentan.
export function leerIcs(texto: string): ResultadoIcs {
  const lineas = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  if (lineas[0]?.trim() !== 'BEGIN:VCALENDAR')
    throw new ErrorFormato('el aula virtual no ha devuelto un calendario (¿ha caducado el enlace?)');
  const eventos: EventoIcs[] = [];
  let saltados = 0;
  let actual: Map<string, Propiedad> | null = null;
  for (const linea of lineas) {
    if (linea === 'BEGIN:VEVENT') {
      actual = new Map();
    } else if (linea === 'END:VEVENT') {
      const e = actual && aEvento(actual);
      if (e) eventos.push(e);
      else saltados++;
      actual = null;
    } else if (actual) {
      const dosPuntos = linea.indexOf(':');
      if (dosPuntos < 0) continue;
      const [nombre, ...params] = linea.slice(0, dosPuntos).split(';');
      actual.set(nombre.toUpperCase(), { params: params.join(';'), valor: linea.slice(dosPuntos + 1) });
    }
  }
  return { eventos, saltados };
}

function aEvento(p: Map<string, Propiedad>): EventoIcs | null {
  const uid = p.get('UID')?.valor.trim();
  const inicio = leerFecha(p.get('DTSTART')?.valor.trim() ?? '');
  if (!uid || !inicio) return null;
  return {
    uid,
    titulo: desescapar(p.get('SUMMARY')?.valor ?? '').trim(),
    descripcion: desescapar(p.get('DESCRIPTION')?.valor ?? ''),
    inicio: inicio.instante,
    soloDia: inicio.soloDia,
    categorias: (p.get('CATEGORIES')?.valor ?? '')
      .split(/(?<!\\),/)
      .map((c) => desescapar(c).trim())
      .filter(Boolean),
  };
}

// Moodle exporta en UTC (terminado en Z) o, para eventos de todo el día, solo la fecha.
function leerFecha(v: string): { instante: Date; soloDia: boolean } | null {
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v);
  if (m) return { instante: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])), soloDia: false };
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  // A mediodía UTC para que en Madrid siga siendo el mismo día.
  if (m) return { instante: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)), soloDia: true };
  return null;
}

function desescapar(v: string): string {
  return v.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}
