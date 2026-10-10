// Tipos que comparten la app y el programa local.
import type { Pizarra } from './pizarra.ts';

// Sube cuando el programa local cambia de forma que la app necesita el nuevo (si no, hay que reiniciarlo).
export const VERSION_PROGRAMA = 6;

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

// Un archivo de un chat compartido: ruta relativa con / (p. ej. "imagenes/captura-1.png") y su contenido en base64.
export interface ArchivoPaquete {
  ruta: string;
  base64: string;
}

// chat.json de un chat compartido.
export interface InfoChat {
  nombre?: string;
  compartidoEl: string;
  actualizado: string;
  dispositivo: string;
}

// compartidos.json de cada ordenador. version: sha de la carpeta del chat en GitHub tras la última subida o bajada ('' = aún no subido).
export interface EntradaCompartido {
  version: string;
  pendiente: boolean;
  compartidoEl: string;
}
export type Compartidos = Record<string, EntradaCompartido>;

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
