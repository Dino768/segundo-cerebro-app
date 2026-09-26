// Tipos que comparten la app y el programa local.
import type { Pizarra } from './pizarra.ts';

export interface Mensaje {
  rol: 'diego' | 'claude' | 'herramienta';
  texto: string;
  imagenes?: string[];
}

export interface ResumenConversacion {
  id: string;
  titulo: string;
  fecha: string; // ISO con hora (última vez que cambió)
}

// Lo que el programa local va mandando mientras Claude contesta.
export type EventoChat =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramienta'; texto: string }
  | { tipo: 'fin'; parado?: boolean }
  | { tipo: 'error'; mensaje: string; uso?: boolean };

// Aviso de que una pizarra en curso ha cambiado en el disco.
export interface EventoPizarra {
  tipo: 'pizarra';
  asignatura: string;
  conversacion: string;
  n: number;
}

// Una pizarra en curso tal y como la devuelve el programa local.
// Si el archivo está roto, `pizarra` es la última versión buena y `error` explica qué pasa.
// `base` es lo último que el PC subió al historial (para juntarlo con lo que se cambie en otro dispositivo).
export interface EstadoPizarra {
  n: number;
  pizarra: Pizarra | null;
  error: string | null;
  avisos: string[];
  base: Pizarra | null;
}
