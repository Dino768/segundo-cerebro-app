import { compilarExpresion, ErrorExpresion } from './expresion.ts';

// Formato de pizarra-<n>.json. Lo escribe Claude y lo lee la app (ver docs/diseno.md).
export type TipoTexto = 'texto' | 'formula' | 'dibujo' | 'imagen' | 'nota';
export interface Curva { expr: string; etiqueta?: string; color?: string }
export interface PuntoGrafica { x: number; y: number; etiqueta?: string }
export interface ContenidoGrafica { x: [number, number]; y: [number, number]; curvas: Curva[]; puntos: PuntoGrafica[] }
interface BasePieza { id: string; x: number; y: number; ancho: number; color?: string }
export type Pieza =
  | (BasePieza & { tipo: TipoTexto; contenido: string })
  | (BasePieza & { tipo: 'grafica'; contenido: ContenidoGrafica });
export interface Flecha { id: string; de: string; a: string; etiqueta?: string }
export interface Pizarra {
  version: 1;
  titulo: string;
  piezas: Pieza[];
  flechas: Flecha[];
  guardarComo: string | null;
  guardadaEn: string | null;
}
export type Operacion =
  | { tipo: 'mover'; id: string; x: number; y: number }
  | { tipo: 'borrar'; id: string }
  | { tipo: 'nota'; id: string | null; x: number; y: number; contenido: string }
  | { tipo: 'guardada'; ruta: string };

export class ErrorPizarra extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPizarra';
  }
}

const TIPOS_TEXTO: readonly string[] = ['texto', 'formula', 'dibujo', 'imagen', 'nota'];
const LIMITE = 100_000;

function objeto(v: unknown, donde: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ErrorPizarra(`${donde} debe ser un objeto`);
  return v as Record<string, unknown>;
}
function numero(v: unknown, donde: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITE)
    throw new ErrorPizarra(`${donde} debe ser un número entre -${LIMITE} y ${LIMITE}`);
  return v;
}
function texto(v: unknown, donde: string): string {
  if (typeof v !== 'string') throw new ErrorPizarra(`${donde} debe ser un texto`);
  return v;
}
function opcional(v: unknown, donde: string): string | undefined {
  return v === undefined || v === null ? undefined : texto(v, donde);
}
function rango(v: unknown, donde: string): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) throw new ErrorPizarra(`${donde} debe ser [mínimo, máximo]`);
  const a = numero(v[0], `${donde}[0]`);
  const b = numero(v[1], `${donde}[1]`);
  if (a >= b) throw new ErrorPizarra(`${donde}: el primer número debe ser menor que el segundo`);
  return [a, b];
}
function sinVacios<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function validarGrafica(v: unknown, donde: string): ContenidoGrafica {
  const g = objeto(v, donde);
  if (!Array.isArray(g.curvas) || g.curvas.length === 0 || g.curvas.length > 8)
    throw new ErrorPizarra(`${donde}.curvas debe tener entre 1 y 8 curvas`);
  const curvas = g.curvas.map((c, i) => {
    const o = objeto(c, `${donde}.curvas[${i}]`);
    const expr = texto(o.expr, `${donde}.curvas[${i}].expr`);
    try {
      compilarExpresion(expr);
    } catch (e) {
      if (e instanceof ErrorExpresion) throw new ErrorPizarra(`${donde}.curvas[${i}] «${expr}»: ${e.message}`);
      throw e;
    }
    return sinVacios({ expr, etiqueta: opcional(o.etiqueta, 'etiqueta'), color: opcional(o.color, 'color') });
  });
  if (g.puntos !== undefined && !Array.isArray(g.puntos)) throw new ErrorPizarra(`${donde}.puntos debe ser una lista`);
  const puntos = ((g.puntos as unknown[] | undefined) ?? []).map((pt, i) => {
    const o = objeto(pt, `${donde}.puntos[${i}]`);
    return sinVacios({ x: numero(o.x, `${donde}.puntos[${i}].x`), y: numero(o.y, `${donde}.puntos[${i}].y`), etiqueta: opcional(o.etiqueta, 'etiqueta') });
  });
  return { x: rango(g.x, `${donde}.x`), y: rango(g.y, `${donde}.y`), curvas, puntos };
}

export function validarPizarra(bruto: unknown): { pizarra: Pizarra; avisos: string[] } {
  const p = objeto(bruto, 'La pizarra');
  if (p.version !== 1) throw new ErrorPizarra('version debe ser 1');
  if (!Array.isArray(p.piezas)) throw new ErrorPizarra('piezas debe ser una lista');
  const flechasBrutas = p.flechas ?? [];
  if (!Array.isArray(flechasBrutas)) throw new ErrorPizarra('flechas debe ser una lista');
  const avisos: string[] = [];
  const ids = new Set<string>();
  const piezas: Pieza[] = [];

  p.piezas.forEach((bruta, i) => {
    const donde = `piezas[${i}]`;
    const o = objeto(bruta, donde);
    const id = texto(o.id, `${donde}.id`);
    if (!id || ids.has(id)) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
    if (o.tipo !== 'grafica' && !TIPOS_TEXTO.includes(o.tipo as string)) {
      avisos.push(`${donde}: no conozco el tipo «${String(o.tipo)}», la ignoro`);
      return;
    }
    ids.add(id);
    const ancho = numero(o.ancho, `${donde}.ancho`);
    if (ancho < 40 || ancho > 2000) throw new ErrorPizarra(`${donde}.ancho debe estar entre 40 y 2000`);
    const base = sinVacios({ id, x: numero(o.x, `${donde}.x`), y: numero(o.y, `${donde}.y`), ancho, color: opcional(o.color, `${donde}.color`) });
    if (o.tipo === 'grafica') {
      piezas.push({ ...base, tipo: 'grafica', contenido: validarGrafica(o.contenido, `${donde}.contenido`) });
      return;
    }
    const contenido = texto(o.contenido, `${donde}.contenido`);
    if (o.tipo === 'imagen' && (!/^imagenes\/[\w.-]+$/.test(contenido) || contenido.includes('..')))
      throw new ErrorPizarra(`${donde}: una imagen debe ser «imagenes/<nombre>»`);
    if (o.tipo === 'dibujo' && !contenido.trimStart().startsWith('<svg'))
      throw new ErrorPizarra(`${donde}: un dibujo debe empezar por <svg`);
    piezas.push({ ...base, tipo: o.tipo as TipoTexto, contenido });
  });

  const idsFlechas = new Set<string>();
  const flechas = flechasBrutas.map((b, i): Flecha => {
    const donde = `flechas[${i}]`;
    const o = objeto(b, donde);
    const id = texto(o.id, `${donde}.id`);
    if (!id || idsFlechas.has(id)) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
    idsFlechas.add(id);
    const de = texto(o.de, `${donde}.de`);
    const a = texto(o.a, `${donde}.a`);
    if (!ids.has(de) || !ids.has(a)) throw new ErrorPizarra(`flecha ${id}: une piezas que no existen`);
    return sinVacios({ id, de, a, etiqueta: opcional(o.etiqueta, `${donde}.etiqueta`) });
  });

  return {
    pizarra: {
      version: 1,
      titulo: typeof p.titulo === 'string' && p.titulo.trim() ? p.titulo : 'Pizarra',
      piezas,
      flechas,
      guardarComo: opcional(p.guardarComo, 'guardarComo')?.trim() || null,
      guardadaEn: opcional(p.guardadaEn, 'guardadaEn') ?? null,
    },
    avisos,
  };
}

export function pizarraVacia(titulo: string): Pizarra {
  return { version: 1, titulo, piezas: [], flechas: [], guardarComo: null, guardadaEn: null };
}

export function serializarPizarra(p: Pizarra): string {
  return JSON.stringify(p, null, 2) + '\n';
}

function idLibre(p: Pizarra, prefijo: string): string {
  const usados = new Set(p.piezas.map((x) => x.id));
  for (let n = 1; ; n++) if (!usados.has(`${prefijo}${n}`)) return `${prefijo}${n}`;
}

export function aplicarOperacion(p: Pizarra, op: Operacion): Pizarra {
  switch (op.tipo) {
    case 'mover':
      return { ...p, piezas: p.piezas.map((x) => (x.id === op.id ? { ...x, x: Math.round(op.x), y: Math.round(op.y) } : x)) };
    case 'borrar':
      return { ...p, piezas: p.piezas.filter((x) => x.id !== op.id), flechas: p.flechas.filter((f) => f.de !== op.id && f.a !== op.id) };
    case 'nota': {
      const existe = op.id !== null && p.piezas.some((x) => x.id === op.id && x.tipo === 'nota');
      if (existe) return { ...p, piezas: p.piezas.map((x) => (x.id === op.id && x.tipo === 'nota' ? { ...x, contenido: op.contenido } : x)) };
      const nueva: Pieza = { id: idLibre(p, 'nota'), tipo: 'nota', x: Math.round(op.x), y: Math.round(op.y), ancho: 240, contenido: op.contenido };
      return { ...p, piezas: [...p.piezas, nueva] };
    }
    case 'guardada':
      return { ...p, guardadaEn: op.ruta, guardarComo: null };
  }
}

export function validarOperacion(bruto: unknown): Operacion {
  const o = objeto(bruto, 'La operación');
  switch (o.tipo) {
    case 'mover':
      return { tipo: 'mover', id: texto(o.id, 'id'), x: numero(o.x, 'x'), y: numero(o.y, 'y') };
    case 'borrar':
      return { tipo: 'borrar', id: texto(o.id, 'id') };
    case 'nota':
      return { tipo: 'nota', id: o.id === null ? null : texto(o.id, 'id'), x: numero(o.x, 'x'), y: numero(o.y, 'y'), contenido: texto(o.contenido, 'contenido').slice(0, 5000) };
    case 'guardada': {
      const ruta = texto(o.ruta, 'ruta');
      if (!/^estudios\/[a-z0-9-]+\/pizarras\/[\w.-]+\.json$/.test(ruta) || ruta.includes('..')) throw new ErrorPizarra('ruta no válida');
      return { tipo: 'guardada', ruta };
    }
    default:
      throw new ErrorPizarra('Operación desconocida');
  }
}
