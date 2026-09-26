import { CAPA_CLAUDE, CAPAS_INICIALES, capaPorDefecto, esCapaInicial, esDeClaudePieza, normalizarCapas, type Capa } from './capas.ts';
import { compilarExpresion, ErrorExpresion } from './expresion.ts';
import { fusionar } from './fusion.ts';
import { ErrorTrazo, LIMITE_TRAZOS, validarTrazo, type Trazo } from './tinta.ts';

// Formato de pizarra-<n>.json. Lo escribe Claude y lo lee la app (ver docs/diseno.md).
export type TipoTexto = 'texto' | 'formula' | 'dibujo' | 'imagen' | 'nota';
export interface Curva { expr: string; etiqueta?: string; color?: string }
export interface PuntoGrafica { x: number; y: number; etiqueta?: string }
export interface ContenidoGrafica { x: [number, number]; y: [number, number]; curvas: Curva[]; puntos: PuntoGrafica[] }
interface BasePieza { id: string; x: number; y: number; ancho: number; color?: string; capa?: string; letra?: 'mano' }
export type Pieza =
  | (BasePieza & { tipo: TipoTexto; contenido: string })
  | (BasePieza & { tipo: 'grafica'; contenido: ContenidoGrafica });
export interface Flecha { id: string; de: string; a: string; etiqueta?: string }
export interface Pizarra {
  version: 1 | 2;
  titulo: string;
  capas: Capa[];
  piezas: Pieza[];
  flechas: Flecha[];
  trazos: Trazo[];
  guardarComo: string | null;
  guardadaEn: string | null;
}
export type Operacion =
  | { tipo: 'mover'; id: string; x: number; y: number }
  | { tipo: 'borrar'; id: string }
  | { tipo: 'nota'; id: string | null; x: number; y: number; contenido: string; nuevoId?: string; capa?: string }
  | { tipo: 'guardada'; ruta: string; subida?: Pizarra }
  | { tipo: 'trazos'; quitar: string[]; poner: Trazo[] }
  | { tipo: 'piezas'; quitar: string[]; poner: Pieza[]; flechas?: Flecha[] }
  | { tipo: 'capa'; accion: 'crear' | 'borrar' | 'renombrar' | 'ordenar'; id: string; nombre?: string; posicion?: number }
  | { tipo: 'lote'; ops: Operacion[] }
  | { tipo: 'fusionar'; base: Pizarra | null; suya: Pizarra };

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

// Una pieza del archivo. null = tipo desconocido (se ignora con un aviso).
function validarPieza(bruta: unknown, donde: string, avisos: string[]): Pieza | null {
  const o = objeto(bruta, donde);
  const id = texto(o.id, `${donde}.id`);
  if (!id) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
  if (o.tipo !== 'grafica' && !TIPOS_TEXTO.includes(o.tipo as string)) {
    avisos.push(`${donde}: no conozco el tipo «${String(o.tipo)}», la ignoro`);
    return null;
  }
  const ancho = numero(o.ancho, `${donde}.ancho`);
  if (ancho < 40 || ancho > 2000) throw new ErrorPizarra(`${donde}.ancho debe estar entre 40 y 2000`);
  if (o.letra !== undefined && o.letra !== null && o.letra !== 'mano') throw new ErrorPizarra(`${donde}.letra solo puede ser «mano»`);
  const base = sinVacios({
    id,
    x: numero(o.x, `${donde}.x`),
    y: numero(o.y, `${donde}.y`),
    ancho,
    color: opcional(o.color, `${donde}.color`),
    capa: opcional(o.capa, `${donde}.capa`),
    letra: o.letra === 'mano' && (o.tipo === 'texto' || o.tipo === 'nota') ? ('mano' as const) : undefined,
  });
  if (o.tipo === 'grafica') return { ...base, tipo: 'grafica', contenido: validarGrafica(o.contenido, `${donde}.contenido`) };
  const contenido = texto(o.contenido, `${donde}.contenido`);
  if (o.tipo === 'imagen' && (!/^imagenes\/[\w.-]+$/.test(contenido) || contenido.includes('..')))
    throw new ErrorPizarra(`${donde}: una imagen debe ser «imagenes/<nombre>»`);
  if (o.tipo === 'dibujo' && !contenido.trimStart().startsWith('<svg'))
    throw new ErrorPizarra(`${donde}: un dibujo debe empezar por <svg`);
  return { ...base, tipo: o.tipo as TipoTexto, contenido };
}

function validarFlecha(b: unknown, donde: string): Flecha {
  const o = objeto(b, donde);
  const id = texto(o.id, `${donde}.id`);
  if (!id) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
  return sinVacios({ id, de: texto(o.de, `${donde}.de`), a: texto(o.a, `${donde}.a`), etiqueta: opcional(o.etiqueta, `${donde}.etiqueta`) });
}

function validarCapas(v: unknown): Capa[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 50) throw new ErrorPizarra('capas debe ser una lista de 50 capas como mucho');
  const ids = new Set<string>();
  return v.map((b, i) => {
    const o = objeto(b, `capas[${i}]`);
    const id = texto(o.id, `capas[${i}].id`);
    if (!/^[a-z0-9-]{1,40}$/.test(id) || ids.has(id)) throw new ErrorPizarra(`capas[${i}]: el id «${id}» no vale o está repetido`);
    ids.add(id);
    return { id, nombre: (opcional(o.nombre, `capas[${i}].nombre`) ?? '').trim().slice(0, 40) || 'Capa' };
  });
}

function validarTrazos(v: unknown, avisos: string[]): Trazo[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new ErrorPizarra('trazos debe ser una lista');
  if (v.length > LIMITE_TRAZOS) throw new ErrorPizarra(`hay más de ${LIMITE_TRAZOS} trazos`);
  const ids = new Set<string>();
  const trazos: Trazo[] = [];
  v.forEach((b, i) => {
    try {
      const t = validarTrazo(b, `trazos[${i}]`);
      if (ids.has(t.id)) {
        avisos.push(`trazos[${i}]: el id «${t.id}» está repetido, lo ignoro`);
        return;
      }
      ids.add(t.id);
      trazos.push(t);
    } catch (e) {
      if (!(e instanceof ErrorTrazo)) throw e;
      avisos.push(`${e.message}; ignoro ese trazo`);
    }
  });
  return trazos;
}

// Con algo de la v1.4 (trazos, letra a mano, capas propias, notas en otra capa) la pizarra es de la versión 2.
export function necesitaVersion2(p: Pick<Pizarra, 'capas' | 'piezas' | 'trazos'>): boolean {
  return (
    p.trazos.length > 0 ||
    !esCapaInicial(p.capas) ||
    p.piezas.some((x) => x.letra !== undefined || x.capa !== capaPorDefecto(p.capas, esDeClaudePieza(x)))
  );
}

// Capas completas, todo con su capa y la versión que le toca.
function lista(p: Omit<Pizarra, 'version'> & { version?: number }): Pizarra {
  const { version: _version, ...resto } = normalizarCapas(p);
  return { version: necesitaVersion2(resto) ? 2 : 1, ...resto };
}

export function validarPizarra(bruto: unknown): { pizarra: Pizarra; avisos: string[] } {
  const p = objeto(bruto, 'La pizarra');
  if (p.version !== 1 && p.version !== 2) throw new ErrorPizarra('version debe ser 1 o 2');
  if (!Array.isArray(p.piezas)) throw new ErrorPizarra('piezas debe ser una lista');
  const flechasBrutas = p.flechas ?? [];
  if (!Array.isArray(flechasBrutas)) throw new ErrorPizarra('flechas debe ser una lista');
  const avisos: string[] = [];
  const ids = new Set<string>();
  const piezas: Pieza[] = [];
  p.piezas.forEach((bruta, i) => {
    const pieza = validarPieza(bruta, `piezas[${i}]`, avisos);
    if (!pieza) return;
    if (ids.has(pieza.id)) throw new ErrorPizarra(`piezas[${i}]: el id «${pieza.id}» está vacío o repetido`);
    ids.add(pieza.id);
    piezas.push(pieza);
  });
  const idsFlechas = new Set<string>();
  const flechas = flechasBrutas.map((b, i) => {
    const f = validarFlecha(b, `flechas[${i}]`);
    if (idsFlechas.has(f.id)) throw new ErrorPizarra(`flechas[${i}]: el id «${f.id}» está vacío o repetido`);
    idsFlechas.add(f.id);
    if (!ids.has(f.de) || !ids.has(f.a)) throw new ErrorPizarra(`flecha ${f.id}: une piezas que no existen`);
    return f;
  });
  return {
    pizarra: lista({
      titulo: typeof p.titulo === 'string' && p.titulo.trim() ? p.titulo : 'Pizarra',
      capas: validarCapas(p.capas),
      piezas,
      flechas,
      trazos: validarTrazos(p.trazos, avisos),
      guardarComo: opcional(p.guardarComo, 'guardarComo')?.trim() || null,
      guardadaEn: opcional(p.guardadaEn, 'guardadaEn') ?? null,
    }),
    avisos,
  };
}

export function pizarraVacia(titulo: string): Pizarra {
  return { version: 1, titulo, capas: CAPAS_INICIALES, piezas: [], flechas: [], trazos: [], guardarComo: null, guardadaEn: null };
}

// Sin nada de la v1.4 se escribe igual que siempre (versión 1, sin capas ni trazos), para que Claude y las apps antiguas la lean igual.
export function serializarPizarra(p: Pizarra): string {
  if (necesitaVersion2(p)) {
    // Cada trazo en una sola línea: con un número por línea, una página de dibujo pasaría de 1 MB.
    const marca = '__trazos__';
    const trazos = p.trazos.length ? `[\n${p.trazos.map((t) => `    ${JSON.stringify(t)}`).join(',\n')}\n  ]` : '[]';
    return JSON.stringify({ ...p, version: 2, trazos: marca }, null, 2).replace(`"${marca}"`, () => trazos) + '\n';
  }
  const { capas: _capas, trazos: _trazos, ...resto } = p;
  return JSON.stringify({ ...resto, version: 1, piezas: p.piezas.map(({ capa: _capa, ...x }) => x) }, null, 2) + '\n';
}

function idLibre(p: Pizarra, prefijo: string): string {
  const usados = new Set(p.piezas.map((x) => x.id));
  for (let n = 1; ; n++) if (!usados.has(`${prefijo}${n}`)) return `${prefijo}${n}`;
}

// Quita (por id) y luego pone: lo que se sustituye se queda en su sitio y lo nuevo va al final (encima).
function quitarYPoner<T extends { id: string }>(xs: T[], quitar: string[], poner: T[]): T[] {
  const fuera = new Set(quitar);
  const nuevos = new Map(poner.map((x) => [x.id, x]));
  const quedan = xs.filter((x) => !fuera.has(x.id) || nuevos.has(x.id)).map((x) => nuevos.get(x.id) ?? x);
  const estan = new Set(quedan.map((x) => x.id));
  return [...quedan, ...poner.filter((x) => !estan.has(x.id))];
}

function colocar<T>(xs: T[], x: T, posicion: number | undefined): T[] {
  const r = [...xs];
  r.splice(Math.max(0, Math.min(r.length, posicion ?? r.length)), 0, x);
  return r;
}

const nombreCapa = (v: string | undefined) => (v ?? '').trim().slice(0, 40);

function aplicarCapa(p: Pizarra, op: Extract<Operacion, { tipo: 'capa' }>): Pizarra {
  const i = p.capas.findIndex((c) => c.id === op.id);
  if (op.accion === 'ordenar')
    return i < 0 ? p : { ...p, capas: colocar(p.capas.filter((c) => c.id !== op.id), p.capas[i], op.posicion) };
  if (op.id === CAPA_CLAUDE) return p; // la de Claude solo se cambia de sitio
  switch (op.accion) {
    case 'crear':
      return i >= 0 ? p : { ...p, capas: colocar(p.capas, { id: op.id, nombre: nombreCapa(op.nombre) || 'Capa' }, op.posicion) };
    case 'renombrar':
      return i < 0 ? p : { ...p, capas: p.capas.map((c) => (c.id === op.id ? { ...c, nombre: nombreCapa(op.nombre) || c.nombre } : c)) };
    case 'borrar': {
      if (i < 0) return p;
      const fuera = new Set(p.piezas.filter((x) => x.capa === op.id).map((x) => x.id));
      return {
        ...p,
        capas: p.capas.filter((c) => c.id !== op.id),
        piezas: p.piezas.filter((x) => !fuera.has(x.id)),
        trazos: p.trazos.filter((t) => t.capa !== op.id),
        flechas: p.flechas.filter((f) => !fuera.has(f.de) && !fuera.has(f.a)),
      };
    }
    default:
      return p;
  }
}

// Todas las operaciones son idempotentes: aplicarlas dos veces da lo mismo que una.
function aplicar(p: Pizarra, op: Operacion): Pizarra {
  switch (op.tipo) {
    case 'mover':
      return { ...p, piezas: p.piezas.map((x) => (x.id === op.id ? { ...x, x: Math.round(op.x), y: Math.round(op.y) } : x)) };
    case 'borrar':
      return { ...p, piezas: p.piezas.filter((x) => x.id !== op.id), flechas: p.flechas.filter((f) => f.de !== op.id && f.a !== op.id) };
    case 'nota': {
      const objetivo = op.id ?? op.nuevoId;
      if (objetivo !== undefined && p.piezas.some((x) => x.id === objetivo && x.tipo === 'nota'))
        return { ...p, piezas: p.piezas.map((x) => (x.id === objetivo && x.tipo === 'nota' ? { ...x, contenido: op.contenido } : x)) };
      const usados = new Set(p.piezas.map((x) => x.id));
      const id = op.nuevoId && !usados.has(op.nuevoId) ? op.nuevoId : idLibre(p, 'nota');
      const nueva = sinVacios({ id, tipo: 'nota' as const, x: Math.round(op.x), y: Math.round(op.y), ancho: 240, contenido: op.contenido, capa: op.capa });
      return { ...p, piezas: [...p.piezas, nueva] };
    }
    case 'guardada':
      return { ...p, guardadaEn: op.ruta, guardarComo: null };
    case 'trazos':
      return { ...p, trazos: quitarYPoner(p.trazos, op.quitar, op.poner).slice(0, LIMITE_TRAZOS) };
    case 'piezas': {
      const piezas = quitarYPoner(p.piezas, op.quitar, op.poner);
      const ids = new Set(piezas.map((x) => x.id));
      return { ...p, piezas, flechas: quitarYPoner(p.flechas, [], op.flechas ?? []).filter((f) => ids.has(f.de) && ids.has(f.a)) };
    }
    case 'capa':
      return aplicarCapa(p, op);
    case 'lote':
      return op.ops.reduce(aplicar, p);
    case 'fusionar':
      return fusionar(op.base, p, op.suya);
  }
}

export function aplicarOperacion(p: Pizarra, op: Operacion): Pizarra {
  return lista(aplicar(p, op));
}

function listaIds(v: unknown, donde: string): string[] {
  if (!Array.isArray(v) || v.length > 2 * LIMITE_TRAZOS || v.some((x) => typeof x !== 'string')) throw new ErrorPizarra(`${donde} debe ser una lista de ids`);
  return v as string[];
}

const ACCIONES_CAPA = ['crear', 'borrar', 'renombrar', 'ordenar'] as const;

export function validarOperacion(bruto: unknown): Operacion {
  const o = objeto(bruto, 'La operación');
  switch (o.tipo) {
    case 'mover':
      return { tipo: 'mover', id: texto(o.id, 'id'), x: numero(o.x, 'x'), y: numero(o.y, 'y') };
    case 'borrar':
      return { tipo: 'borrar', id: texto(o.id, 'id') };
    case 'nota':
      return sinVacios({
        tipo: 'nota' as const,
        id: o.id === null ? null : texto(o.id, 'id'),
        x: numero(o.x, 'x'),
        y: numero(o.y, 'y'),
        contenido: texto(o.contenido, 'contenido').slice(0, 5000),
        nuevoId: opcional(o.nuevoId, 'nuevoId'),
        capa: opcional(o.capa, 'capa'),
      });
    case 'guardada': {
      const ruta = texto(o.ruta, 'ruta');
      if (!/^estudios\/[a-z0-9-]+\/pizarras\/[\w.-]+\.json$/.test(ruta) || ruta.includes('..')) throw new ErrorPizarra('ruta no válida');
      return sinVacios({ tipo: 'guardada' as const, ruta, subida: o.subida === undefined || o.subida === null ? undefined : validarPizarra(o.subida).pizarra });
    }
    case 'trazos': {
      if (!Array.isArray(o.poner) || o.poner.length > LIMITE_TRAZOS) throw new ErrorPizarra('poner debe ser una lista de trazos');
      const poner = o.poner.map((t, i) => {
        try {
          return validarTrazo(t, `poner[${i}]`);
        } catch (e) {
          if (e instanceof ErrorTrazo) throw new ErrorPizarra(e.message);
          throw e;
        }
      });
      return { tipo: 'trazos', quitar: listaIds(o.quitar, 'quitar'), poner };
    }
    case 'piezas': {
      if (!Array.isArray(o.poner) || o.poner.length > 500) throw new ErrorPizarra('poner debe ser una lista de 500 piezas como mucho');
      const avisos: string[] = [];
      const poner = o.poner.map((x, i) => validarPieza(x, `poner[${i}]`, avisos)).filter((x): x is Pieza => x !== null);
      if (avisos.length) throw new ErrorPizarra(avisos[0]);
      if (o.flechas !== undefined && !Array.isArray(o.flechas)) throw new ErrorPizarra('flechas debe ser una lista');
      const flechas = (o.flechas as unknown[] | undefined)?.map((f, i) => validarFlecha(f, `flechas[${i}]`));
      return sinVacios({ tipo: 'piezas' as const, quitar: listaIds(o.quitar, 'quitar'), poner, flechas });
    }
    case 'capa': {
      if (!ACCIONES_CAPA.includes(o.accion as (typeof ACCIONES_CAPA)[number])) throw new ErrorPizarra('Acción de capa desconocida');
      const id = texto(o.id, 'id');
      if (!/^[a-z0-9-]{1,40}$/.test(id)) throw new ErrorPizarra('id de capa no válido');
      return sinVacios({
        tipo: 'capa' as const,
        accion: o.accion as (typeof ACCIONES_CAPA)[number],
        id,
        nombre: opcional(o.nombre, 'nombre'),
        posicion: o.posicion === undefined || o.posicion === null ? undefined : numero(o.posicion, 'posicion'),
      });
    }
    case 'lote': {
      if (!Array.isArray(o.ops) || o.ops.length > 500) throw new ErrorPizarra('ops debe ser una lista de 500 operaciones como mucho');
      return {
        tipo: 'lote',
        ops: o.ops.map((x) => {
          const op = validarOperacion(x);
          if (op.tipo === 'guardada' || op.tipo === 'fusionar') throw new ErrorPizarra('Esa operación no puede ir en un lote');
          return op;
        }),
      };
    }
    case 'fusionar':
      return { tipo: 'fusionar', base: o.base === undefined || o.base === null ? null : validarPizarra(o.base).pizarra, suya: validarPizarra(o.suya).pizarra };
    default:
      throw new ErrorPizarra('Operación desconocida');
  }
}
