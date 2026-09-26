import { isISODate, type ISODate } from '../fechas';
import { aSlug } from '../texto';
import { serializarPizarra, type Pizarra } from './pizarra';

export interface EntradaHistorial {
  archivo: string;
  fecha: ISODate | null;
  titulo: string;
}

export const carpetaHistorial = (asignatura: string) => `estudios/${asignatura}/pizarras`;

export function nombreHistorial(fecha: ISODate, titulo: string, existentes: string[]): string {
  const base = `${fecha}-${aSlug(titulo, 60) || 'pizarra'}`;
  const usados = new Set(existentes);
  if (!usados.has(`${base}.json`)) return `${base}.json`;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}.json`)) return `${base}-${n}.json`;
}

// «2026-09-24-leyes-de-newton.json» → fecha y «Leyes de newton» (para la lista, sin abrir el archivo).
export function entradaDeArchivo(archivo: string): EntradaHistorial | null {
  if (!archivo.endsWith('.json')) return null;
  const nombre = archivo.slice(0, -'.json'.length);
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(nombre);
  const fecha = m && isISODate(m[1]) ? m[1] : null;
  const resto = (fecha ? m![2] : nombre).replace(/-/g, ' ').trim();
  return { archivo, fecha, titulo: resto.charAt(0).toUpperCase() + resto.slice(1) };
}

export function ordenarHistorial(entradas: EntradaHistorial[]): EntradaHistorial[] {
  return [...entradas].sort((a, b) => b.archivo.localeCompare(a.archivo));
}

export function imagenesDe(p: Pizarra): string[] {
  return [...new Set(p.piezas.filter((x) => x.tipo === 'imagen').map((x) => x.contenido as string))];
}

export function paraHistorial(p: Pizarra, titulo: string): Pizarra {
  return { ...p, titulo, guardarComo: null, guardadaEn: null };
}

// ¿La copia del historial ha cambiado desde que el PC la subió? Sin copia base, se junta por si acaso.
export const cambioEnHistorial = (base: Pizarra | null, suya: Pizarra) => !base || serializarPizarra(base) !== serializarPizarra(suya);

export const archivoDeRuta = (ruta: string) => ruta.slice(ruta.lastIndexOf('/') + 1);
