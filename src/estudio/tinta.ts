import type { Punto, Rect } from './geometria.ts';

// Trazos a mano de la pizarra (de Diego o de Claude). Formato en docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md.
export type Herramienta = 'lapiz' | 'subrayador' | 'linea' | 'flecha' | 'rectangulo' | 'elipse';
export const HERRAMIENTAS: readonly Herramienta[] = ['lapiz', 'subrayador', 'linea', 'flecha', 'rectangulo', 'elipse'];
export const esLibre = (h: Herramienta) => h === 'lapiz' || h === 'subrayador';

export interface Trazo {
  id: string;
  herramienta: Herramienta;
  color: string;
  grosor: number;
  puntos: number[]; // x, y, x, y… en coordenadas de la pizarra
  presion?: number[]; // una por punto, de 0 a 1 (solo lápiz)
  autor?: 'claude';
  capa?: string;
}

export const LIMITE_PUNTOS = 5000;
export const LIMITE_TRAZOS = 3000;
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
  if (typeof o.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.color)) throw new ErrorTrazo(`${donde}.color debe ser #rrggbb`);
  if (typeof o.grosor !== 'number' || !Number.isFinite(o.grosor) || o.grosor < 1 || o.grosor > 40)
    throw new ErrorTrazo(`${donde}.grosor debe estar entre 1 y 40`);
  if (!Array.isArray(o.puntos) || o.puntos.some((v) => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITE_COORD))
    throw new ErrorTrazo(`${donde}.puntos debe ser una lista de números`);
  const n = o.puntos.length;
  if (n === 0 || n % 2 !== 0) throw new ErrorTrazo(`${donde}.puntos debe tener pares x, y`);
  if (n / 2 > LIMITE_PUNTOS) throw new ErrorTrazo(`${donde} tiene más de ${LIMITE_PUNTOS} puntos`);
  if (!esLibre(herramienta) && n !== 4) throw new ErrorTrazo(`${donde}: una forma lleva exactamente dos puntos`);
  let presion: number[] | undefined;
  if (o.presion !== undefined && o.presion !== null) {
    if (!Array.isArray(o.presion) || o.presion.length !== n / 2 || o.presion.some((v) => typeof v !== 'number' || !(v >= 0 && v <= 1)))
      throw new ErrorTrazo(`${donde}.presion debe tener un número de 0 a 1 por punto`);
    if (herramienta === 'lapiz') presion = (o.presion as number[]).map((v) => redondear(v, 2));
  }
  if (o.autor !== undefined && o.autor !== null && o.autor !== 'claude') throw new ErrorTrazo(`${donde}.autor solo puede ser «claude»`);
  if (o.capa !== undefined && o.capa !== null && typeof o.capa !== 'string') throw new ErrorTrazo(`${donde}.capa debe ser un texto`);
  return sinVacios({
    id: o.id,
    herramienta,
    color: o.color.toLowerCase(),
    grosor: redondear(o.grosor, 1),
    puntos: (o.puntos as number[]).map((v) => redondear(v, 1)),
    presion,
    autor: o.autor === 'claude' ? ('claude' as const) : undefined,
    capa: typeof o.capa === 'string' ? o.capa : undefined,
  });
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

// El trazo tal y como se guarda: simplificado (menos puntos casi alineados) y redondeado.
export function terminarTrazo(t: TrazoNuevo, tolerancia = 0.5): Trazo {
  const { id, herramienta, color, grosor, capa } = t;
  if (!esLibre(herramienta)) return { id, herramienta, color, grosor, puntos: aPlano([t.puntos[0], t.puntos[t.puntos.length - 1]]), capa };
  const indices = puntosQueQuedan(t.puntos, tolerancia).slice(0, LIMITE_PUNTOS);
  const trazo: Trazo = { id, herramienta, color, grosor, puntos: aPlano(indices.map((i) => t.puntos[i])), capa };
  if (herramienta === 'lapiz' && t.presion && t.presion.length === t.puntos.length) trazo.presion = indices.map((i) => redondear(t.presion![i], 2));
  return trazo;
}

// Las líneas con las que se dibuja un trazo (una forma puede tener varias, como la flecha).
export function polilineas(t: Trazo): Punto[][] {
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
