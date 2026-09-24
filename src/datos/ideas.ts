import { isISODate, type ISODate } from '../fechas';

export interface Idea {
  fecha: ISODate;
  proyecto?: string;
  texto: string;
}

export type Linea = { tipo: 'idea'; idea: Idea } | { tipo: 'otra'; texto: string };

export const CABECERA_BANDEJA =
  '# Bandeja de ideas\n\nAquí van las ideas nuevas, para no dejar lo que estoy haciendo. Una línea por idea, con la fecha. Ya las revisaremos.\n\n';

// - 2026-09-24: texto   o   - 2026-09-24 [id-proyecto]: texto
// El id es el nombre del archivo del proyecto: cualquier cosa sin espacios ni corchetes.
const PATRON = /^- (\d{4}-\d{2}-\d{2})(?: \[([^\]\s]+)\])?: (.+)$/;

export function parseBandeja(texto: string): Linea[] {
  const normal = texto.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (normal === '') return [];
  const lineas = (normal.endsWith('\n') ? normal.slice(0, -1) : normal).split('\n');
  return lineas.map((l): Linea => {
    const m = PATRON.exec(l);
    if (!m || !isISODate(m[1])) return { tipo: 'otra', texto: l };
    const idea: Idea = m[2] ? { fecha: m[1], proyecto: m[2], texto: m[3] } : { fecha: m[1], texto: m[3] };
    return { tipo: 'idea', idea };
  });
}

export function lineaDeIdea(idea: Idea): string {
  return `- ${idea.fecha}${idea.proyecto ? ` [${idea.proyecto}]` : ''}: ${idea.texto}`;
}

export function serializarBandeja(lineas: Linea[]): string {
  if (lineas.length === 0) return '';
  return lineas.map((l) => (l.tipo === 'idea' ? lineaDeIdea(l.idea) : l.texto)).join('\n') + '\n';
}

// Si el archivo original usaba fin de línea de Windows (CRLF), se conserva al escribirlo.
export function mismoFinDeLinea(nuevo: string, original: string | null): string {
  return original?.includes('\r\n') ? nuevo.replace(/\r?\n/g, '\r\n') : nuevo;
}

export function ideasDe(lineas: Linea[]): Idea[] {
  return lineas
    .map((l, i) => ({ l, i }))
    .filter((x): x is { l: { tipo: 'idea'; idea: Idea }; i: number } => x.l.tipo === 'idea')
    .sort((a, b) => b.l.idea.fecha.localeCompare(a.l.idea.fecha) || b.i - a.i)
    .map((x) => x.l.idea);
}
