// Tipos que comparten la app y el programa local.

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
