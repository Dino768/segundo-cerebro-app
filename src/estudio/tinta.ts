import type { Punto, Rect } from './geometria.ts';
import { letrasDeTexto } from './letraMano.ts';

// Trazos a mano de la pizarra (de Diego o de Claude). Formato en docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md;
// la letra a mano (`letra`, solo de Claude), en 2026-09-27-dibujo-a-mano-parte-2-design.md, sección 5.
export type Herramienta = 'lapiz' | 'subrayador' | 'linea' | 'flecha' | 'rectangulo' | 'elipse' | 'letra';
export const HERRAMIENTAS: readonly Herramienta[] = ['lapiz', 'subrayador', 'linea', 'flecha', 'rectangulo', 'elipse', 'letra'];
export const esLibre = (h: Herramienta) => h === 'lapiz' || h === 'subrayador';

export interface Trazo {
  id: string;
  herramienta: Herramienta;
  color: string;
  grosor: number;
  puntos: number[]; // x, y, x, y… en coordenadas de la pizarra (vacío en `letra`: sus líneas salen del texto)
  presion?: number[]; // una por punto, de 0 a 1 (solo lápiz)
  texto?: string; // solo `letra`: una línea
  x?: number; // solo `letra`: principio de la línea base
  y?: number;
  tamano?: number; // solo `letra`: alto de las mayúsculas
  autor?: 'claude';
  capa?: string;
}

export const LIMITE_PUNTOS = 5000;
export const LIMITE_TRAZOS = 3000;
export const LIMITE_TEXTO_LETRA = 200;
export const GROSOR_LETRA = 3;
const LIMITE_COORD = 100_000;

export class ErrorTrazo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorTrazo';
  }
}

export const redondear = (v: number, decimales: number) => {
  const f = 10 ** decimales;
  return Math.round(v * f) / f;
};

export function pares(puntos: number[]): Punto[] {
  const r: Punto[] = [];
  for (let i = 0; i + 1 < puntos.length; i += 2) r.push({ x: puntos[i], y: puntos[i + 1] });
  return r;
}

export const aPlano = (ps: Punto[]): number[] => ps.flatMap((p) => [redondear(p.x, 1), redondear(p.y, 1)]);

function sinVacios<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export function validarTrazo(bruto: unknown, donde: string): Trazo {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) throw new ErrorTrazo(`${donde} debe ser un objeto`);
  const o = bruto as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id || o.id.length > 64) throw new ErrorTrazo(`${donde}.id debe ser un texto de 1 a 64 letras`);
  if (!HERRAMIENTAS.includes(o.herramienta as Herramienta)) throw new ErrorTrazo(`${donde}: herramienta «${String(o.herramienta)}» desconocida`);
  const herramienta = o.herramienta as Herramienta;
  const esLetra = herramienta === 'letra';
  if (typeof o.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.color)) throw new ErrorTrazo(`${donde}.color debe ser #rrggbb`);
  const grosor = o.grosor ?? (esLetra ? GROSOR_LETRA : undefined);
  if (typeof grosor !== 'number' || !Number.isFinite(grosor) || grosor < 1 || grosor > 40) throw new ErrorTrazo(`${donde}.grosor debe estar entre 1 y 40`);
  let puntos: number[] = [];
  let presion: number[] | undefined;
  let letra: Pick<Trazo, 'texto' | 'x' | 'y' | 'tamano'> = {};
  if (esLetra) {
    if (typeof o.texto !== 'string' || /[\r\n]/.test(o.texto) || !o.texto.trim()) throw new ErrorTrazo(`${donde}.texto debe ser una línea de texto`);
    const texto = o.texto.normalize('NFC');
    if ([...texto].length > LIMITE_TEXTO_LETRA) throw new ErrorTrazo(`${donde}.texto tiene más de ${LIMITE_TEXTO_LETRA} letras`);
    const coord = (v: unknown, campo: string) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITE_COORD) throw new ErrorTrazo(`${donde}.${campo} debe ser un número`);
      return redondear(v, 1);
    };
    if (typeof o.tamano !== 'number' || !Number.isFinite(o.tamano) || o.tamano < 8 || o.tamano > 200) throw new ErrorTrazo(`${donde}.tamano debe estar entre 8 y 200`);
    letra = { texto, x: coord(o.x, 'x'), y: coord(o.y, 'y'), tamano: redondear(o.tamano, 1) };
  } else {
    if (!Array.isArray(o.puntos) || o.puntos.some((v) => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITE_COORD))
      throw new ErrorTrazo(`${donde}.puntos debe ser una lista de números`);
    const n = o.puntos.length;
    if (n === 0 || n % 2 !== 0) throw new ErrorTrazo(`${donde}.puntos debe tener pares x, y`);
    if (n / 2 > LIMITE_PUNTOS) throw new ErrorTrazo(`${donde} tiene más de ${LIMITE_PUNTOS} puntos`);
    if (!esLibre(herramienta) && n !== 4) throw new ErrorTrazo(`${donde}: una forma lleva exactamente dos puntos`);
    if (o.presion !== undefined && o.presion !== null) {
      if (!Array.isArray(o.presion) || o.presion.length !== n / 2 || o.presion.some((v) => typeof v !== 'number' || !(v >= 0 && v <= 1)))
        throw new ErrorTrazo(`${donde}.presion debe tener un número de 0 a 1 por punto`);
      if (herramienta === 'lapiz') presion = (o.presion as number[]).map((v) => redondear(v, 2));
    }
    puntos = (o.puntos as number[]).map((v) => redondear(v, 1));
  }
  if (o.autor !== undefined && o.autor !== null && o.autor !== 'claude') throw new ErrorTrazo(`${donde}.autor solo puede ser «claude»`);
  if (o.capa !== undefined && o.capa !== null && typeof o.capa !== 'string') throw new ErrorTrazo(`${donde}.capa debe ser un texto`);
  return sinVacios({
    id: o.id,
    herramienta,
    color: o.color.toLowerCase(),
    grosor: redondear(grosor, 1),
    puntos,
    presion,
    ...letra,
    autor: o.autor === 'claude' ? ('claude' as const) : undefined,
    capa: typeof o.capa === 'string' ? o.capa : undefined,
  });
}

// Cómo se escribe un trazo en el archivo: la letra a mano no lleva `puntos`.
export function paraGuardar(t: Trazo): Record<string, unknown> {
  if (t.herramienta !== 'letra') return { ...t };
  const { puntos: _puntos, ...resto } = t;
  return resto;
}

// Las letras de un trazo `letra`, con sus líneas. Se guardan por objeto: los trazos no se cambian, se sustituyen.
const cacheLetras = new WeakMap<Trazo, Punto[][][]>();
export function letrasDe(t: Trazo): Punto[][][] {
  if (t.herramienta !== 'letra') return [];
  let r = cacheLetras.get(t);
  if (!r) {
    r = letrasDeTexto(t.texto ?? '', t.x ?? 0, t.y ?? 0, t.tamano ?? 28, t.id);
    cacheLetras.set(t, r);
  }
  return r;
}

export function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Ramer-Douglas-Peucker: índices de los puntos que se quedan (siempre el primero y el último).
export function puntosQueQuedan(ps: Punto[], tolerancia: number): number[] {
  if (ps.length <= 2 || tolerancia <= 0) return ps.map((_, i) => i);
  const quedan = new Array<boolean>(ps.length).fill(false);
  quedan[0] = quedan[ps.length - 1] = true;
  const pila: [number, number][] = [[0, ps.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop()!;
    let max = -1;
    let indice = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanciaASegmento(ps[i], ps[a], ps[b]);
      if (d > max) {
        max = d;
        indice = i;
      }
    }
    if (indice !== -1 && max > tolerancia) {
      quedan[indice] = true;
      pila.push([a, indice], [indice, b]);
    }
  }
  return quedan.flatMap((q, i) => (q ? [i] : []));
}

export interface TrazoNuevo {
  id: string;
  herramienta: Herramienta;
  color: string;
  grosor: number;
  puntos: Punto[];
  presion?: number[];
  capa: string;
}

// Tolerancia de la goma en el lápiz: solo quita los puntos que ella misma añadió en línea recta.
const TOLERANCIA_GOMA_LAPIZ = 0.01;

// El trazo tal y como se guarda: redondeado y, el subrayador, simplificado (menos puntos casi alineados).
// El lápiz guarda todos sus puntos: su contorno (perfect-freehand) depende de cada punto y su presión,
// y al quitarle puntos cambiaba de forma al levantar el lápiz (como si le dieran mordiscos).
export function terminarTrazo(t: TrazoNuevo, tolerancia = 0.5): Trazo {
  const { id, herramienta, color, grosor, capa } = t;
  if (!esLibre(herramienta)) return { id, herramienta, color, grosor, puntos: aPlano([t.puntos[0], t.puntos[t.puntos.length - 1]]), capa };
  const indices = puntosQueQuedan(t.puntos, herramienta === 'lapiz' ? 0 : tolerancia).slice(0, LIMITE_PUNTOS);
  const trazo: Trazo = { id, herramienta, color, grosor, puntos: aPlano(indices.map((i) => t.puntos[i])), capa };
  if (herramienta === 'lapiz' && t.presion && t.presion.length === t.puntos.length) trazo.presion = indices.map((i) => redondear(t.presion![i], 2));
  return trazo;
}

// Las líneas con las que se dibuja un trazo (una forma puede tener varias, como la flecha).
export function polilineas(t: Trazo): Punto[][] {
  if (t.herramienta === 'letra') return letrasDe(t).flat();
  const ps = pares(t.puntos);
  if (esLibre(t.herramienta)) return [ps];
  const [a, b] = ps;
  switch (t.herramienta) {
    case 'linea':
      return [[a, b]];
    case 'flecha': {
      const angulo = Math.atan2(b.y - a.y, b.x - a.x);
      const largo = Math.max(10, t.grosor * 3);
      const punta = (d: number) => ({ x: b.x - largo * Math.cos(angulo + d), y: b.y - largo * Math.sin(angulo + d) });
      return [[a, b], [punta(0.5), b, punta(-0.5)]];
    }
    case 'rectangulo':
      return [[a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a]];
    case 'elipse': {
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rx = Math.abs(b.x - a.x) / 2;
      const ry = Math.abs(b.y - a.y) / 2;
      return [Array.from({ length: 49 }, (_, i) => {
        const ang = (i / 48) * 2 * Math.PI;
        return { x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) };
      })];
    }
    default:
      return [ps];
  }
}

export function cajaDeTrazo(t: Trazo): Rect {
  const ps = polilineas(t).flat();
  const m = t.grosor / 2;
  const x = Math.min(...ps.map((p) => p.x)) - m;
  const y = Math.min(...ps.map((p) => p.y)) - m;
  return { x, y, w: Math.max(...ps.map((p) => p.x)) + m - x, h: Math.max(...ps.map((p) => p.y)) + m - y };
}

export function nuevoId(prefijo: string, usados: Set<string>, azar: () => number = Math.random): string {
  for (;;) {
    const id = `${prefijo}-${Math.floor(azar() * 36 ** 6).toString(36).padStart(6, '0')}`;
    if (!usados.has(id)) return id;
  }
}

export function distanciaATrazo(t: Trazo, p: Punto): number {
  let min = Infinity;
  for (const linea of polilineas(t)) {
    if (linea.length === 1) min = Math.min(min, Math.hypot(p.x - linea[0].x, p.y - linea[0].y));
    for (let i = 1; i < linea.length; i++) min = Math.min(min, distanciaASegmento(p, linea[i - 1], linea[i]));
  }
  return min;
}

export const tocaTrazo = (t: Trazo, p: Punto, radio: number) => distanciaATrazo(t, p) <= radio + t.grosor / 2;

function distanciaACamino(p: Punto, camino: Punto[]): number {
  if (camino.length === 1) return Math.hypot(p.x - camino[0].x, p.y - camino[0].y);
  let min = Infinity;
  for (let i = 1; i < camino.length; i++) min = Math.min(min, distanciaASegmento(p, camino[i - 1], camino[i]));
  return min;
}

interface PuntoP extends Punto {
  p?: number;
}

// Añade puntos intermedios para que ningún tramo mida más de `paso` (así la goma corta justo por donde pasa).
function densificar(ps: PuntoP[], paso: number): PuntoP[] {
  const r: PuntoP[] = [];
  ps.forEach((b, i) => {
    if (i > 0) {
      const a = ps[i - 1];
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / paso);
      for (let k = 1; k < n; k++) {
        const f = k / n;
        r.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, p: a.p === undefined || b.p === undefined ? undefined : a.p + (b.p - a.p) * f });
      }
    }
    r.push(b);
  });
  return r;
}

// Goma: borra de `t` lo que queda cerca del camino. null = no lo toca; [] = lo borra entero.
// Las formas tocadas pasan a ser trazos de lápiz, cortados igual.
export function cortarConGoma(t: Trazo, camino: Punto[], radio: number, crearId: () => string): Trazo[] | null {
  const alcance = radio + t.grosor / 2;
  const caja = cajaDeTrazo(t);
  const xs = camino.map((c) => c.x);
  const ys = camino.map((c) => c.y);
  if (Math.max(...xs) < caja.x - alcance || Math.min(...xs) > caja.x + caja.w + alcance || Math.max(...ys) < caja.y - alcance || Math.min(...ys) > caja.y + caja.h + alcance)
    return null;
  const trozos: PuntoP[][] = [];
  let tocado = false;
  for (const linea of polilineas(t)) {
    const conPresion: PuntoP[] = linea.map((q, i) => ({ ...q, p: t.presion?.[i] }));
    let actual: PuntoP[] = [];
    for (const q of densificar(conPresion, Math.max(1, radio / 2))) {
      if (distanciaACamino(q, camino) <= alcance) {
        tocado = true;
        if (actual.length) trozos.push(actual);
        actual = [];
      } else actual.push(q);
    }
    if (actual.length) trozos.push(actual);
  }
  if (!tocado) return null;
  const herramienta: Herramienta = t.herramienta === 'subrayador' ? 'subrayador' : 'lapiz';
  return trozos
    .filter((tr) => tr.length >= 2)
    .map((tr) => {
      const indices = puntosQueQuedan(tr, herramienta === 'lapiz' ? TOLERANCIA_GOMA_LAPIZ : 0.5);
      const nuevo: Trazo = { id: crearId(), herramienta, color: t.color, grosor: t.grosor, puntos: aPlano(indices.map((i) => tr[i])) };
      if (herramienta === 'lapiz' && tr.every((q) => q.p !== undefined)) nuevo.presion = indices.map((i) => redondear(tr[i].p!, 2));
      if (t.autor) nuevo.autor = t.autor;
      if (t.capa) nuevo.capa = t.capa;
      return nuevo;
    });
}

export function dentroDePoligono(p: Punto, poligono: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

export function trazoEnLazo(t: Trazo, poligono: Punto[]): boolean {
  const ps = polilineas(t).flat();
  return ps.filter((p) => dentroDePoligono(p, poligono)).length * 2 > ps.length;
}

export function moverTrazo(t: Trazo, dx: number, dy: number): Trazo {
  if (t.herramienta === 'letra') return { ...t, x: redondear((t.x ?? 0) + dx, 1), y: redondear((t.y ?? 0) + dy, 1) };
  return { ...t, puntos: t.puntos.map((v, i) => redondear(v + (i % 2 === 0 ? dx : dy), 1)) };
}
