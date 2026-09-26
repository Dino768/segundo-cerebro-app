import type { Punto, Rect } from './geometria';
import type { Seleccion } from './gestos';
import type { Flecha, Operacion, Pieza, Pizarra } from './pizarra';
import { cajaDeTrazo, moverTrazo, nuevoId, type Trazo } from './tinta';

// Lo copiado. `origen` dice dónde viven sus imágenes; `clave`, de qué pizarra salió.
export interface Recorte {
  trazos: Trazo[];
  piezas: Pieza[];
  flechas: Flecha[];
  origen: string;
  clave: string;
}

// El portapapeles de la app: dura mientras esté abierta y sirve entre pizarras.
let recorte: Recorte | null = null;
export const guardarRecorte = (r: Recorte | null) => {
  recorte = r;
};
export const leerRecorte = () => recorte;

export function copiar(p: Pizarra, sel: Seleccion, origen: string, clave: string): Recorte | null {
  const piezas = p.piezas.filter((x) => sel.piezas.includes(x.id));
  const trazos = p.trazos.filter((t) => sel.trazos.includes(t.id));
  if (!piezas.length && !trazos.length) return null;
  const ids = new Set(piezas.map((x) => x.id));
  return { piezas, trazos, flechas: p.flechas.filter((f) => ids.has(f.de) && ids.has(f.a)), origen, clave };
}

export const DESPLAZAMIENTO = 24;

// Caja de lo copiado (las piezas cuentan 60 de alto, como antes de medirlas).
function cajaDe(r: Recorte): Rect {
  const cajas = [...r.piezas.map((x) => ({ x: x.x, y: x.y, w: x.ancho, h: 60 })), ...r.trazos.map(cajaDeTrazo)];
  const x0 = Math.min(...cajas.map((c) => c.x));
  const y0 = Math.min(...cajas.map((c) => c.y));
  return { x: x0, y: y0, w: Math.max(...cajas.map((c) => c.x + c.w)) - x0, h: Math.max(...cajas.map((c) => c.y + c.h)) - y0 };
}

// Pega en la capa `capa` con ids nuevos: desplazado un poco o, si `centro`, centrado ahí. Lo de Claude pasa a ser de Diego.
export function pegar(
  r: Recorte, p: Pizarra, capa: string, origen: string, centro: Punto | null, azar: () => number = Math.random,
): { op: Operacion; seleccion: Seleccion } | { error: string } {
  if (r.origen !== origen && r.piezas.some((x) => x.tipo === 'imagen'))
    return { error: 'Esta imagen no se puede pegar aquí: las imágenes solo se pegan en la misma asignatura y el mismo sitio (historial o PC).' };
  const caja = cajaDe(r);
  const dx = centro ? centro.x - (caja.x + caja.w / 2) : DESPLAZAMIENTO;
  const dy = centro ? centro.y - (caja.y + caja.h / 2) : DESPLAZAMIENTO;
  const usados = new Set([...p.piezas.map((x) => x.id), ...p.trazos.map((t) => t.id), ...p.flechas.map((f) => f.id)]);
  const otroId = () => {
    const id = nuevoId('d', usados, azar);
    usados.add(id);
    return id;
  };
  const mapa = new Map<string, string>();
  const piezas = r.piezas.map((x) => {
    const id = otroId();
    mapa.set(x.id, id);
    return { ...x, id, capa, x: Math.round(x.x + dx), y: Math.round(x.y + dy) };
  });
  const trazos = r.trazos.map((t) => {
    const { autor: _autor, ...resto } = moverTrazo(t, dx, dy);
    return { ...resto, id: otroId(), capa };
  });
  const flechas = r.flechas.map((f) => ({ ...f, id: otroId(), de: mapa.get(f.de)!, a: mapa.get(f.a)! }));
  return {
    op: { tipo: 'lote', ops: [{ tipo: 'piezas', quitar: [], poner: piezas, flechas }, { tipo: 'trazos', quitar: [], poner: trazos }] },
    seleccion: { piezas: piezas.map((x) => x.id), trazos: trazos.map((t) => t.id) },
  };
}
