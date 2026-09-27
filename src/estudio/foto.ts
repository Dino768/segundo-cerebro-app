import type { Rect, Vista } from './geometria.ts';
import type { Operacion } from './pizarra.ts';

// La foto de la pizarra que ve Claude: lo que Diego tiene en pantalla, con el id de cada pieza.
export interface Zona { x1: number; y1: number; x2: number; y2: number }
export interface FotoEnviada { nombre: string; zona: Zona }
export const ANCHO_FOTO = 1280;

export function zonaVisible(v: Vista, ancho: number, alto: number): Zona {
  const r = Math.round;
  return { x1: r(-v.x / v.escala), y1: r(-v.y / v.escala), x2: r((ancho - v.x) / v.escala), y2: r((alto - v.y) / v.escala) };
}

export const escalaFoto = (ancho: number) => Math.min(1, ANCHO_FOTO / Math.max(1, ancho));

export interface Etiqueta { texto: string; x: number; y: number }

// Una etiqueta por pieza que se ve (aunque sea en parte), en píxeles de la foto.
export function etiquetasFoto(piezas: { id: string; rect: Rect }[], v: Vista, ancho: number, alto: number, escala: number): Etiqueta[] {
  return piezas.flatMap(({ id, rect }) => {
    const x = v.x + rect.x * v.escala;
    const y = v.y + rect.y * v.escala;
    if (x + rect.w * v.escala < 0 || y + rect.h * v.escala < 0 || x > ancho || y > alto) return [];
    return [{ texto: id, x: Math.max(0, x) * escala, y: Math.max(0, y) * escala }];
  });
}

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function esZona(v: unknown): v is Zona {
  if (!v || typeof v !== 'object') return false;
  const z = v as Record<string, unknown>;
  return finito(z.x1) && finito(z.y1) && finito(z.x2) && finito(z.y2) && z.x1 < z.x2 && z.y1 < z.y2;
}

// Lo que hace Diego en la pizarra (para saber si hay que mandar foto). Guardar y juntar los hace la app.
export const esOperacionDeDiego = (op: Operacion) => op.tipo !== 'guardada' && op.tipo !== 'fusionar';
