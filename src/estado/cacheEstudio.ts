import type { EntradaHistorial } from '../estudio/historial';
import { validarOperacion, validarPizarra, type Operacion, type Pizarra } from '../estudio/pizarra';

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
// Se valida al leer: una copia antigua se abre con el formato nuevo y una rota cuenta como vacía.
export function leerPizarraCache(asig: string, archivo: string): Pizarra | null {
  const v = leer<unknown>(clave([asig, archivo]));
  if (v === null) return null;
  try {
    return validarPizarra(v).pizarra;
  } catch {
    return null;
  }
}

// Lo dibujado en el historial que aún no se ha subido.
const clavePendientes = (asig: string, archivo: string) => `sc-pendientes-${asig}-${archivo}`;
export const guardarOpsPendientes = (asig: string, archivo: string, ops: Operacion[]) => guardar(clavePendientes(asig, archivo), ops);
export function leerOpsPendientes(asig: string, archivo: string): Operacion[] {
  const v = leer<unknown>(clavePendientes(asig, archivo));
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => {
    try {
      return [validarOperacion(o)];
    } catch {
      return [];
    }
  });
}
