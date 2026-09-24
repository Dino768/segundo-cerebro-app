import type { EntradaHistorial } from '../estudio/historial';
import type { Pizarra } from '../estudio/pizarra';

// Copia del historial para verlo sin internet. Si no hay almacenamiento, no pasa nada.
const clave = (partes: string[]) => `sc-historial-${partes.join('-')}`;

function leer<T>(k: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function guardar(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // sin almacenamiento o lleno
  }
}

export const guardarHistorialCache = (asig: string, es: EntradaHistorial[]) => guardar(clave([asig]), es);
export const leerHistorialCache = (asig: string) => leer<EntradaHistorial[]>(clave([asig]));
export const guardarPizarraCache = (asig: string, archivo: string, p: Pizarra) => guardar(clave([asig, archivo]), p);
export const leerPizarraCache = (asig: string, archivo: string) => leer<Pizarra>(clave([asig, archivo]));
