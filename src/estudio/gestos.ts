import { centro, type Punto, type Rect } from './geometria';
import { GROSORES, type EstadoHerramientas } from './herramientas';
import type { Operacion, Pieza, Pizarra } from './pizarra';
import { cajaDeTrazo, cortarConGoma, dentroDePoligono, moverTrazo, terminarTrazo, tocaTrazo, trazoEnLazo, type Herramienta, type Trazo } from './tinta';

export interface Seleccion {
  trazos: string[];
  piezas: string[];
}
export const SIN_SELECCION: Seleccion = { trazos: [], piezas: [] };
export const haySeleccion = (s: Seleccion) => s.trazos.length + s.piezas.length > 0;

// Quita de la selección lo que ya no existe (devuelve la misma si no cambia nada).
export function limpiarSeleccion(p: Pizarra, s: Seleccion): Seleccion {
  const piezas = s.piezas.filter((id) => p.piezas.some((x) => x.id === id));
  const trazos = s.trazos.filter((id) => p.trazos.some((t) => t.id === id));
  return piezas.length === s.piezas.length && trazos.length === s.trazos.length ? s : { piezas, trazos };
}

export const grosorDe = (h: EstadoHerramientas) => GROSORES[h.grosor] * (h.herramienta === 'subrayador' ? 3 : 1);

function herramientaDeTrazo(h: EstadoHerramientas): Herramienta | null {
  if (h.herramienta === 'lapiz' || h.herramienta === 'subrayador') return h.herramienta;
  if (h.herramienta === 'forma') return h.forma;
  return null;
}

// Con Mayús: líneas y flechas cada 45°, rectángulos cuadrados y elipses redondas.
export function ajustarForma(forma: Herramienta, a: Punto, b: Punto, mayus: boolean): Punto {
  if (!mayus) return b;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (forma === 'linea' || forma === 'flecha') {
    const angulo = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const largo = Math.hypot(dx, dy);
    return { x: a.x + largo * Math.cos(angulo), y: a.y + largo * Math.sin(angulo) };
  }
  const lado = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + Math.sign(dx || 1) * lado, y: a.y + Math.sign(dy || 1) * lado };
}

// El trazo que deja un gesto. null si la herramienta no dibuja o la forma no tiene tamaño.
// Con tolerancia 0 no se simplifica (para enseñarlo mientras se dibuja).
export function trazoDeGesto(
  h: EstadoHerramientas, id: string, capa: string, puntos: Punto[], presiones: number[] | null, mayus: boolean, tolerancia = 0.5,
): Trazo | null {
  const herramienta = herramientaDeTrazo(h);
  if (!herramienta || !puntos.length) return null;
  const comun = { id, herramienta, color: h.color, grosor: grosorDe(h), capa };
  if (herramienta === 'lapiz' || herramienta === 'subrayador') {
    const solo = puntos.length === 1;
    const ps = solo ? [puntos[0], { x: puntos[0].x + 0.1, y: puntos[0].y }] : puntos;
    const conPresion = herramienta === 'lapiz' && presiones && presiones.length === puntos.length;
    return terminarTrazo({ ...comun, puntos: ps, presion: conPresion ? (solo ? [presiones[0], presiones[0]] : presiones) : undefined }, tolerancia);
  }
  const a = puntos[0];
  const b = ajustarForma(herramienta, a, puntos[puntos.length - 1], mayus);
  if (Math.hypot(b.x - a.x, b.y - a.y) < 2) return null;
  return terminarTrazo({ ...comun, puntos: [a, b] });
}

export const trazosTocados = (trazos: Trazo[], capa: string, p: Punto, radio: number) =>
  trazos.filter((t) => t.capa === capa && tocaTrazo(t, p, radio)).map((t) => t.id);

// Un tramo de goma sobre los trazos de la capa: los que corta se quitan y sus trozos se ponen.
export function pasarGoma(trazos: Trazo[], capa: string, tramo: Punto[], radio: number, crearId: () => string): { quitar: string[]; poner: Trazo[] } {
  const quitar: string[] = [];
  const poner: Trazo[] = [];
  for (const t of trazos) {
    if (t.capa !== capa) continue;
    const r = cortarConGoma(t, tramo, radio, crearId);
    if (r) {
      quitar.push(t.id);
      poner.push(...r);
    }
  }
  return { quitar, poner };
}

// Lo que queda al soltar la goma: fuera los originales que ya no están y dentro los trozos nuevos.
export function resultadoGoma(originales: Trazo[], trabajo: Trazo[]): { quitar: string[]; poner: Trazo[] } {
  const ahora = new Set(trabajo.map((t) => t.id));
  const antes = new Set(originales.map((t) => t.id));
  return { quitar: originales.filter((t) => !ahora.has(t.id)).map((t) => t.id), poner: trabajo.filter((t) => !antes.has(t.id)) };
}

export function seleccionarConLazo(p: Pizarra, capa: string, poligono: Punto[], rect: (x: Pieza) => Rect): Seleccion {
  if (poligono.length < 3) return SIN_SELECCION;
  return {
    trazos: p.trazos.filter((t) => t.capa === capa && trazoEnLazo(t, poligono)).map((t) => t.id),
    piezas: p.piezas.filter((x) => x.capa === capa && dentroDePoligono(centro(rect(x)), poligono)).map((x) => x.id),
  };
}

export function cajaDeSeleccion(p: Pizarra, sel: Seleccion, rect: (x: Pieza) => Rect): Rect | null {
  const cajas = [...p.trazos.filter((t) => sel.trazos.includes(t.id)).map(cajaDeTrazo), ...p.piezas.filter((x) => sel.piezas.includes(x.id)).map(rect)];
  if (!cajas.length) return null;
  const x0 = Math.min(...cajas.map((c) => c.x));
  const y0 = Math.min(...cajas.map((c) => c.y));
  return { x: x0, y: y0, w: Math.max(...cajas.map((c) => c.x + c.w)) - x0, h: Math.max(...cajas.map((c) => c.y + c.h)) - y0 };
}

export function moverSeleccion(p: Pizarra, sel: Seleccion, dx: number, dy: number): Operacion {
  return {
    tipo: 'lote',
    ops: [
      { tipo: 'trazos', quitar: [], poner: p.trazos.filter((t) => sel.trazos.includes(t.id)).map((t) => moverTrazo(t, dx, dy)) },
      ...p.piezas.filter((x) => sel.piezas.includes(x.id)).map((x): Operacion => ({ tipo: 'mover', id: x.id, x: x.x + dx, y: x.y + dy })),
    ],
  };
}

export const borrarSeleccion = (sel: Seleccion): Operacion => ({
  tipo: 'lote',
  ops: [{ tipo: 'trazos', quitar: sel.trazos, poner: [] }, { tipo: 'piezas', quitar: sel.piezas, poner: [] }],
});

// Como en Procreate: un toque rápido con dos dedos deshace y con tres rehace.
export function toqueMultiple(dedos: number, duracionMs: number, movidoPx: number): 'deshacer' | 'rehacer' | null {
  if (duracionMs > 300 || movidoPx > 12) return null;
  return dedos === 2 ? 'deshacer' : dedos === 3 ? 'rehacer' : null;
}

// Una pasada de goma. Se compara siempre con la foto de al empezar: lo que llegue o se borre fuera mientras tanto no se toca.
export interface Goma {
  originales: Trazo[];
  trabajo: Trazo[];
  ultimo: Punto;
}
export const empezarGoma = (trazos: Trazo[], p: Punto): Goma => ({ originales: trazos, trabajo: trazos, ultimo: p });
export function seguirGoma(g: Goma, capa: string, p: Punto, radio: number, crearId: () => string): void {
  const r = pasarGoma(g.trabajo, capa, [g.ultimo, p], radio, crearId);
  if (r.quitar.length) {
    const fuera = new Set(r.quitar);
    g.trabajo = [...g.trabajo.filter((t) => !fuera.has(t.id)), ...r.poner];
  }
  g.ultimo = p;
}
export const terminarGoma = (g: Goma) => resultadoGoma(g.originales, g.trabajo);

// Como en Procreate: mientras el lápiz está apoyado, los dedos y la palma no cuentan.
export const ignorarPuntero = (tipo: string, lapizAbajo: boolean) => tipo === 'touch' && lapizAbajo;
