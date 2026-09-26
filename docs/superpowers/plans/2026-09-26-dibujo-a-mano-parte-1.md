# Dibujo a mano, parte 1 (herramientas, capas y copiar y pegar): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diego puede dibujar en la pizarra (lápiz, subrayador, formas, lazo, dos borradores, texto, colores, grosores, deshacer/rehacer), con capas como en Procreate (la de Claude y las suyas) y copiar/pegar, en la zona de estudio del PC y en las pizarras del historial (móvil, iPad, web).

**Architecture:** Los trazos se guardan como vectores en el mismo JSON de la pizarra (`trazos`, `capas`, `version: 2`). Todo lo que hace Diego es una **operación** idempotente que se aplica sobre la versión más nueva del archivo: en el PC la aplica el programa local; en el historial se juntan y se suben de golpe a GitHub tras 3 s sin tocar nada. La lógica va en módulos sin pantalla de `src/estudio/` con pruebas; la pantalla (`Pizarra.tsx`) solo traduce punteros a operaciones.

**Tech Stack:** React 19 + TypeScript, Vitest (pruebas con `renderToString` para la pantalla), `perfect-freehand` (nuevo, MIT) para el trazo con presión. Programa local en Node (sin compilar, imports con `.ts`).

**Spec:** `docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md` (secciones 1 a 5 y 7-8; la sección 6, «Claude dibuja y ve», es la parte 2 y tendrá su propio plan).

## Global Constraints

- Node está en `C:\Program Files\nodejs`: en Bash, empieza los comandos con `export PATH="$PATH:/c/Program Files/nodejs";`.
- Los módulos que usa el programa local (`src/estudio/pizarra.ts` y lo que importa: `tinta.ts`, `capas.ts`, `fusion.ts`, `geometria.ts`, `expresion.ts`) importan con extensión `.ts`. El resto de la app, sin extensión (como ahora).
- **Toda operación es idempotente**: aplicarla dos veces da lo mismo que una (la pantalla la enseña al momento y luego llega la respuesta con la misma operación ya aplicada).
- Formato: `version` 1 o 2; una pizarra se escribe como 2 solo si tiene trazos, `letra`, capas distintas de las iniciales o una pieza en una capa que no es la suya por defecto. Límites: 5000 puntos por trazo, 3000 trazos por pizarra, 50 capas, `grosor` de 1 a 40, `color` `#rrggbb`, puntos con un decimal y presión con dos.
- Capa de Claude: id `claude`, nombre «Claude», siempre existe, solo se puede cambiar de sitio (ni borrar ni renombrar). Siempre hay al menos una capa de Diego (si falta, «Capa 1» con id `capa-1`).
- Textos de la pantalla en español sencillo. Comentarios escasos y en español, como el resto del código.
- Dependencia nueva solo `perfect-freehand` en esta parte.
- Cada tarea termina con `npx vitest run` en verde, un commit (mensaje en español + línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`) y su línea en `.superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md` (`Task N: hecho — <resumen>`; decisiones fuera del plan como `Ruling:`). No se hace `git push` sin que Diego lo sepa.

## Review Focus

1. **Pizarras antiguas** (versión 1, también las guardadas en la caché del móvil) se abren con las capas por defecto y, si no se les añade nada nuevo, se siguen escribiendo como versión 1 → pruebas en Tareas 3 y 10.
2. **Claude escribe una pizarra con trazos sin `capa`**, o con una capa que no existe → lo de Claude va a su capa y lo de Diego a su primera capa, sin error → prueba en Tarea 3.
3. **Dibujar en el historial sin conexión y cerrar la app** → al volver a abrirla, lo pendiente se sube una sola vez, sin duplicar → pruebas en Tareas 5 (idempotencia) y 10 (pendientes iniciales).
4. **Deshacer algo que Claude (u otro dispositivo) ya borró** → no pasa nada ni se rompe → prueba en Tarea 6.
5. **Borrar la última capa de Diego** → aparece «Capa 1» vacía, y deshacer lo devuelve todo → pruebas en Tareas 5 y 6.

---

### Task 1: Trazos: formato y utilidades

**Files:**
- Create: `src/estudio/tinta.ts`
- Test: `src/estudio/tinta.test.ts`

**Interfaces:**
- Consumes: `Punto`, `Rect` de `src/estudio/geometria.ts`.
- Produces: `type Herramienta`, `HERRAMIENTAS`, `esLibre(h)`, `interface Trazo { id; herramienta; color; grosor; puntos: number[]; presion?: number[]; autor?: 'claude'; capa?: string }`, `LIMITE_PUNTOS = 5000`, `LIMITE_TRAZOS = 3000`, `class ErrorTrazo`, `redondear(v, decimales)`, `pares(puntos): Punto[]`, `aPlano(ps): number[]`, `validarTrazo(bruto, donde): Trazo`, `distanciaASegmento(p, a, b)`, `puntosQueQuedan(ps, tolerancia): number[]`, `interface TrazoNuevo`, `terminarTrazo(t: TrazoNuevo, tolerancia = 0.5): Trazo`, `polilineas(t): Punto[][]`, `cajaDeTrazo(t): Rect`, `nuevoId(prefijo, usados: Set<string>, azar = Math.random): string`.

- [ ] **Step 1: Write the failing test**

`src/estudio/tinta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cajaDeTrazo, ErrorTrazo, nuevoId, polilineas, puntosQueQuedan, terminarTrazo, validarTrazo } from './tinta.ts';

const lapiz = { id: 'd-1', herramienta: 'lapiz', color: '#B8603D', grosor: 4, puntos: [0, 0, 10.26, 0, 20, 0], presion: [0.5, 0.555, 0.6] };

describe('validarTrazo', () => {
  it('acepta un trazo y lo redondea', () => {
    expect(validarTrazo(lapiz, 't')).toEqual({ id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 10.3, 0, 20, 0], presion: [0.5, 0.56, 0.6] });
  });
  it('las formas llevan dos puntos y la presión solo se guarda en el lápiz', () => {
    expect(validarTrazo({ id: 'c1', herramienta: 'flecha', color: '#3b82f6', grosor: 4, puntos: [0, 0, 10, 10], autor: 'claude' }, 't')).toMatchObject({ herramienta: 'flecha', autor: 'claude' });
    expect(validarTrazo({ ...lapiz, herramienta: 'subrayador' }, 't').presion).toBeUndefined();
  });
  it('rechaza lo que está mal', () => {
    const malos: [Record<string, unknown>, RegExp][] = [
      [{ ...lapiz, id: '' }, /id/],
      [{ ...lapiz, herramienta: 'spray' }, /herramienta/],
      [{ ...lapiz, color: 'rojo' }, /color/],
      [{ ...lapiz, grosor: 0 }, /grosor/],
      [{ ...lapiz, puntos: [0, 0, 1], presion: undefined }, /pares/],
      [{ ...lapiz, puntos: [0, 'x'] }, /números/],
      [{ ...lapiz, herramienta: 'linea', presion: undefined }, /dos puntos/],
      [{ ...lapiz, presion: [0.5] }, /presion/],
      [{ ...lapiz, autor: 'diego' }, /autor/],
      [{ ...lapiz, puntos: new Array(10002).fill(1), presion: undefined }, /5000/],
    ];
    for (const [malo, patron] of malos) expect(() => validarTrazo(malo, 't')).toThrow(patron);
    expect(() => validarTrazo('x', 't')).toThrow(ErrorTrazo);
  });
});

describe('simplificar', () => {
  it('quita los puntos casi alineados y deja siempre el primero y el último', () => {
    const ps = [{ x: 0, y: 0 }, { x: 5, y: 0.2 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(puntosQueQuedan(ps, 0.5)).toEqual([0, 2, 3]);
  });
  it('terminarTrazo simplifica, redondea y mantiene la presión con sus puntos', () => {
    const t = terminarTrazo({
      id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1',
      puntos: [{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10.04, y: 0 }], presion: [0.1, 0.5, 0.9],
    });
    expect(t).toEqual({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [0, 0, 10, 0], presion: [0.1, 0.9] });
  });
  it('con tolerancia 0 no simplifica (para enseñar el trazo mientras se dibuja)', () => {
    const t = terminarTrazo({ id: 'd', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }] }, 0);
    expect(t.puntos).toEqual([0, 0, 5, 0, 10, 0]);
  });
  it('una forma se queda con el primer y el último punto', () => {
    const t = terminarTrazo({ id: 'd-2', herramienta: 'rectangulo', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 8, y: 5 }] });
    expect(t.puntos).toEqual([0, 0, 8, 5]);
  });
});

describe('formas', () => {
  const forma = (herramienta: string) => validarTrazo({ id: 'f', herramienta, color: '#000000', grosor: 2, puntos: [0, 0, 20, 10] }, 't');
  it('cada forma se dibuja con sus líneas', () => {
    expect(polilineas(forma('linea'))).toEqual([[{ x: 0, y: 0 }, { x: 20, y: 10 }]]);
    expect(polilineas(forma('flecha'))).toHaveLength(2);
    expect(polilineas(forma('rectangulo'))[0]).toEqual([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }]);
    expect(polilineas(forma('elipse'))[0]).toHaveLength(49);
  });
  it('caja de un trazo, con su grosor', () => {
    expect(cajaDeTrazo(forma('linea'))).toEqual({ x: -1, y: -1, w: 22, h: 12 });
  });
});

describe('nuevoId', () => {
  it('no repite ninguno usado', () => {
    const azar = [0, 0, 0.5].values();
    const id = nuevoId('d', new Set(['d-000000']), () => azar.next().value!);
    expect(id).not.toBe('d-000000');
    expect(id).toMatch(/^d-[0-9a-z]{6}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts`
Expected: FAIL (no existe `./tinta.ts`).

- [ ] **Step 3: Write the implementation**

`src/estudio/tinta.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
mkdir -p .superpowers/sdd/2026-09-26-dibujo-a-mano
echo "Task 1: hecho — tinta.ts (formato de trazos, simplificar, formas, ids)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/tinta.ts src/estudio/tinta.test.ts
git commit -m "Dibujo a mano: formato de los trazos y utilidades

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Goma, borrador de trazos y lazo

**Files:**
- Modify: `src/estudio/tinta.ts` (añadir al final)
- Test: `src/estudio/tinta.test.ts` (añadir al final)

**Interfaces:**
- Consumes: lo de la Tarea 1.
- Produces: `distanciaATrazo(t, p)`, `tocaTrazo(t, p, radio): boolean`, `cortarConGoma(t, camino: Punto[], radio, crearId: () => string): Trazo[] | null` (null = no lo toca; `[]` = lo borra entero; las formas pasan a `lapiz`), `dentroDePoligono(p, poligono): boolean`, `trazoEnLazo(t, poligono): boolean`, `moverTrazo(t, dx, dy): Trazo`.

- [ ] **Step 1: Write the failing test** (añadir a `src/estudio/tinta.test.ts`, y añadir `cortarConGoma, dentroDePoligono, moverTrazo, tocaTrazo, trazoEnLazo` al import)

```ts
describe('goma y lazo', () => {
  const linea = (extra: Record<string, unknown> = {}) =>
    validarTrazo({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 100, 0], capa: 'capa-1', ...extra }, 't');
  let n = 0;
  const crearId = () => `d-n${++n}`;

  it('tocaTrazo mira la distancia a la línea (más medio grosor)', () => {
    expect(tocaTrazo(linea(), { x: 50, y: 8 }, 8)).toBe(true);
    expect(tocaTrazo(linea(), { x: 50, y: 12 }, 8)).toBe(false);
  });
  it('la goma en el centro parte la línea en dos trozos, con el mismo color, capa y autor', () => {
    const r = cortarConGoma(linea({ autor: 'claude' }), [{ x: 50, y: -20 }, { x: 50, y: 20 }], 5, crearId)!;
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', autor: 'claude' });
    expect(r[0].puntos[0]).toBe(0);
    expect(r[0].puntos.at(-2)).toBeLessThan(50);
    expect(r[1].puntos[0]).toBeGreaterThan(50);
    expect(r[1].puntos.at(-2)).toBe(100);
    expect(new Set(r.map((t) => t.id)).size).toBe(2);
  });
  it('si no toca, null; si lo cubre entero, lista vacía', () => {
    expect(cortarConGoma(linea(), [{ x: 50, y: 40 }], 5, crearId)).toBeNull();
    expect(cortarConGoma(linea(), [{ x: -10, y: 0 }, { x: 110, y: 0 }], 5, crearId)).toEqual([]);
  });
  it('un tramo rápido que cruza la línea también la corta', () => {
    expect(cortarConGoma(linea(), [{ x: 50, y: -300 }, { x: 50, y: 300 }], 5, crearId)).toHaveLength(2);
  });
  it('la presión sigue alineada con los puntos en los trozos', () => {
    const conPresion = validarTrazo({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 50, 30, 100, 0], presion: [0.2, 0.6, 1] }, 't');
    for (const t of cortarConGoma(conPresion, [{ x: 50, y: 30 }], 5, crearId)!) expect(t.presion).toHaveLength(t.puntos.length / 2);
  });
  it('una forma tocada por la goma pasa a trazo libre', () => {
    const rect = validarTrazo({ id: 'r', herramienta: 'rectangulo', color: '#000000', grosor: 2, puntos: [0, 0, 100, 100] }, 't');
    const r = cortarConGoma(rect, [{ x: 50, y: 0 }], 5, crearId)!;
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.herramienta === 'lapiz')).toBe(true);
  });
  it('lazo: trazos con más de la mitad de sus puntos dentro', () => {
    const cuadro = [{ x: -10, y: -10 }, { x: 60, y: -10 }, { x: 60, y: 10 }, { x: -10, y: 10 }];
    expect(dentroDePoligono({ x: 0, y: 0 }, cuadro)).toBe(true);
    expect(dentroDePoligono({ x: 100, y: 0 }, cuadro)).toBe(false);
    const tres = validarTrazo({ id: 'd', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 50, 0, 100, 0] }, 't');
    expect(trazoEnLazo(tres, cuadro)).toBe(true);
    expect(trazoEnLazo(linea(), cuadro)).toBe(false);
  });
  it('mover un trazo', () => {
    expect(moverTrazo(linea(), 5, -2.26).puntos).toEqual([5, -2.3, 105, -2.3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts`
Expected: FAIL (`cortarConGoma` y demás no existen).

- [ ] **Step 3: Write the implementation** (añadir al final de `src/estudio/tinta.ts`)

```ts
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
      const indices = puntosQueQuedan(tr, 0.5);
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
  return { ...t, puntos: t.puntos.map((v, i) => redondear(v + (i % 2 === 0 ? dx : dy), 1)) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
echo "Task 2: hecho — goma (corta trazos), borrador de trazos, lazo y mover" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/tinta.ts src/estudio/tinta.test.ts
git commit -m "Dibujo a mano: goma, borrador de trazos y lazo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Capas y formato de la versión 2

**Files:**
- Create: `src/estudio/capas.ts`, `src/estudio/capas.test.ts`
- Modify: `src/estudio/pizarra.ts` (la mitad del formato: desde el principio hasta `pizarraVacia`, incluidas; y `aplicarOperacion`)
- Test: `src/estudio/pizarra.test.ts`

**Interfaces:**
- Consumes: `Trazo`, `validarTrazo`, `ErrorTrazo`, `LIMITE_TRAZOS` (Tarea 1).
- Produces (capas.ts): `interface Capa { id; nombre }`, `CAPA_CLAUDE = 'claude'`, `CAPA_DE_CLAUDE`, `CAPAS_INICIALES`, `idCapaLibre(capas)`, `completarCapas(capas)`, `capaDeDiego(capas)`, `capaPorDefecto(capas, deClaude)`, `esDeClaudePieza(x)`, `esDeClaudeTrazo(t)`, `normalizarCapas(p)`, `esCapaInicial(capas)`, `porCapas(capas, piezas, trazos, ocultas)` → `{ capa, piezas, subrayados, trazos }[]`, `activaInicial(capas)`, `activaVisible(capas, ocultas, activa): string | null`.
- Produces (pizarra.ts): `Pizarra` con `version: 1 | 2`, `capas: Capa[]`, `trazos: Trazo[]`; piezas con `capa?` y `letra?: 'mano'`; `necesitaVersion2(p)`; `validarPizarra` y `serializarPizarra` con el formato nuevo. Después de validar o de aplicar una operación, **toda** pieza y trazo tiene `capa` y `version` está bien calculada.

- [ ] **Step 1: Write the failing tests**

`src/estudio/capas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activaInicial, activaVisible, CAPAS_INICIALES, completarCapas, idCapaLibre, normalizarCapas, porCapas } from './capas.ts';

describe('capas', () => {
  it('siempre están la de Claude (abajo si falta) y una de Diego', () => {
    expect(completarCapas([])).toEqual(CAPAS_INICIALES);
    expect(completarCapas([{ id: 'capa-2', nombre: 'Ejercicio' }])).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-2', nombre: 'Ejercicio' }]);
    expect(completarCapas([{ id: 'capa-2', nombre: 'A' }, { id: 'claude', nombre: 'Otra' }])).toEqual([{ id: 'capa-2', nombre: 'A' }, { id: 'claude', nombre: 'Claude' }]);
    expect(completarCapas([{ id: 'claude', nombre: 'Claude' }])).toEqual(CAPAS_INICIALES);
  });
  it('lo que no tiene capa (o tiene una que no existe) va a la de Claude o a la primera de Diego', () => {
    const p = normalizarCapas({
      capas: [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-2', nombre: 'Mía' }, { id: 'capa-3', nombre: 'Otra' }],
      piezas: [{ id: 't1', tipo: 'texto' }, { id: 'n1', tipo: 'nota' }, { id: 'n2', tipo: 'nota', capa: 'capa-3' }, { id: 'n3', tipo: 'nota', capa: 'no-existe' }],
      trazos: [{ id: 'a', autor: 'claude' }, { id: 'b' }],
    });
    expect(p.piezas.map((x) => x.capa)).toEqual(['claude', 'capa-2', 'capa-3', 'capa-2']);
    expect(p.trazos.map((x) => x.capa)).toEqual(['claude', 'capa-2']);
  });
  it('ids libres, capa activa al empezar y al ocultar', () => {
    const capas = [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'A' }, { id: 'capa-2', nombre: 'B' }];
    expect(idCapaLibre(capas)).toBe('capa-3');
    expect(activaInicial(capas)).toBe('capa-2');
    expect(activaVisible(capas, new Set(['capa-2']), 'capa-2')).toBe('capa-1');
    expect(activaVisible(capas, new Set(['capa-1', 'capa-2']), 'capa-2')).toBe('claude');
    expect(activaVisible(capas, new Set(['claude', 'capa-1', 'capa-2']), 'capa-2')).toBeNull();
    expect(activaVisible(capas, new Set(), 'borrada')).toBe('capa-2');
  });
  it('porCapas reparte por capa, con el subrayador aparte, y se salta las ocultas', () => {
    const r = porCapas(
      CAPAS_INICIALES,
      [{ id: 't1', capa: 'claude' }],
      [{ id: 'a', capa: 'capa-1', herramienta: 'subrayador' }, { id: 'b', capa: 'capa-1', herramienta: 'lapiz' }],
      new Set(['claude']),
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ capa: { id: 'capa-1' }, piezas: [], subrayados: [{ id: 'a' }], trazos: [{ id: 'b' }] });
  });
});
```

En `src/estudio/pizarra.test.ts`:
- Cambia el import a `import { aplicarOperacion, ErrorPizarra, pizarraVacia, serializarPizarra, validarOperacion, validarPizarra, type Pizarra } from './pizarra.ts';`.
- En el test `errores`, cambia `[con({ version: 2 }), /version/]` por `[con({ version: 3 }), /version/]` y `expect(() => validarPizarra(con({ version: 2 }))).toThrow(ErrorPizarra);` por `expect(() => validarPizarra(con({ version: 3 }))).toThrow(ErrorPizarra);`.
- Cambia el título `'ignora con aviso los tipos que no conoce (como los trazos de la fase siguiente)'` por `'ignora con aviso los tipos de pieza que no conoce'`.
- Añade al final:

```ts
describe('formato de la v1.4', () => {
  const trazo = { id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 10, 10] };
  it('una pizarra antigua se abre con las capas por defecto y se sigue escribiendo como versión 1', () => {
    const { pizarra } = validarPizarra(ejemplo);
    expect(pizarra.version).toBe(1);
    expect(pizarra.capas.map((c) => c.id)).toEqual(['claude', 'capa-1']);
    expect(pizarra.piezas.find((x) => x.id === 'n1')?.capa).toBe('capa-1');
    expect(pizarra.piezas.find((x) => x.id === 't1')?.capa).toBe('claude');
    const json = JSON.parse(serializarPizarra(pizarra));
    expect(json.version).toBe(1);
    expect(json).not.toHaveProperty('capas');
    expect(json).not.toHaveProperty('trazos');
    expect(json.piezas[0]).not.toHaveProperty('capa');
  });
  it('con trazos se escribe como versión 2, y se vuelve a leer igual', () => {
    const { pizarra } = validarPizarra({ ...ejemplo, trazos: [trazo] });
    expect(pizarra.version).toBe(2);
    expect(pizarra.trazos[0].capa).toBe('capa-1');
    const texto = serializarPizarra(pizarra);
    expect(JSON.parse(texto).version).toBe(2);
    expect(validarPizarra(JSON.parse(texto)).pizarra).toEqual(pizarra);
  });
  it('trazos de Claude sin capa, o con una capa que no existe, van a su sitio', () => {
    const { pizarra } = validarPizarra({ ...ejemplo, version: 2, trazos: [{ ...trazo, autor: 'claude' }, { ...trazo, id: 'd-2', capa: 'inventada' }] });
    expect(pizarra.trazos.map((t) => t.capa)).toEqual(['claude', 'capa-1']);
  });
  it('un trazo roto o repetido se ignora con aviso', () => {
    const r = validarPizarra({ ...ejemplo, trazos: [trazo, { ...trazo }, { ...trazo, id: 'd-2', color: 'rojo' }] });
    expect(r.pizarra.trazos).toHaveLength(1);
    expect(r.avisos).toHaveLength(2);
  });
  it('capas, letra a mano y versión', () => {
    const r = validarPizarra({ ...ejemplo, version: 2, flechas: [], capas: [{ id: 'capa-5', nombre: '  Ejercicio  ' }], piezas: [{ ...ejemplo.piezas[0], letra: 'mano' }] });
    expect(r.pizarra.capas).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-5', nombre: 'Ejercicio' }]);
    expect(r.pizarra.piezas[0].letra).toBe('mano');
    expect(() => validarPizarra({ ...ejemplo, version: 3 })).toThrow(/version/);
    expect(() => validarPizarra({ ...ejemplo, capas: [{ id: 'A B', nombre: 'x' }] })).toThrow(/capas/);
    expect(() => validarPizarra({ ...ejemplo, flechas: [], piezas: [{ ...ejemplo.piezas[0], letra: 'gotica' }] })).toThrow(/letra/);
  });
  it('una nota nueva lleva la capa de Diego y la pizarra sigue siendo versión 1', () => {
    const p = aplicarOperacion(pizarraVacia('x'), { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'Hola' });
    expect(p.piezas[0].capa).toBe('capa-1');
    expect(p.version).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/capas.test.ts src/estudio/pizarra.test.ts`
Expected: FAIL (no existe `capas.ts`; `pizarra.capas` no existe).

- [ ] **Step 3: Write `src/estudio/capas.ts`**

```ts
// Capas de la pizarra, como en Procreate: la de Claude (id «claude», con todo lo suyo) y las de Diego.
export interface Capa {
  id: string;
  nombre: string;
}

export const CAPA_CLAUDE = 'claude';
export const CAPA_DE_CLAUDE: Capa = { id: CAPA_CLAUDE, nombre: 'Claude' };
export const CAPAS_INICIALES: Capa[] = [CAPA_DE_CLAUDE, { id: 'capa-1', nombre: 'Capa 1' }];

interface ConCapa {
  capa?: string;
}

export function idCapaLibre(capas: Capa[]): string {
  const usados = new Set(capas.map((c) => c.id));
  for (let n = 1; ; n++) if (!usados.has(`capa-${n}`)) return `capa-${n}`;
}

// Siempre está la de Claude (si falta, abajo del todo) y al menos una de Diego (si falta, «Capa N» encima).
export function completarCapas(capas: Capa[]): Capa[] {
  let r = capas.map((c) => (c.id === CAPA_CLAUDE ? CAPA_DE_CLAUDE : c));
  if (!r.some((c) => c.id === CAPA_CLAUDE)) r = [CAPA_DE_CLAUDE, ...r];
  if (!r.some((c) => c.id !== CAPA_CLAUDE)) {
    const id = idCapaLibre(r);
    r = [...r, { id, nombre: `Capa ${id.slice('capa-'.length)}` }];
  }
  return r;
}

export const capaDeDiego = (capas: Capa[]) => capas.find((c) => c.id !== CAPA_CLAUDE)?.id ?? 'capa-1';
export const capaPorDefecto = (capas: Capa[], deClaude: boolean) => (deClaude ? CAPA_CLAUDE : capaDeDiego(capas));
// Sin capa escrita, las notas son de Diego y el resto de piezas, de Claude.
export const esDeClaudePieza = (x: { tipo: string }) => x.tipo !== 'nota';
export const esDeClaudeTrazo = (t: { autor?: string }) => t.autor === 'claude';

function conCapa<T extends ConCapa>(x: T, capas: Capa[], deClaude: boolean): T {
  return x.capa && capas.some((c) => c.id === x.capa) ? x : { ...x, capa: capaPorDefecto(capas, deClaude) };
}

// Capas completas y cada pieza y trazo en una capa que existe.
export function normalizarCapas<P extends { capas: Capa[]; piezas: (ConCapa & { tipo: string })[]; trazos: (ConCapa & { autor?: string })[] }>(p: P): P {
  const capas = completarCapas(p.capas);
  return {
    ...p,
    capas,
    piezas: p.piezas.map((x) => conCapa(x, capas, esDeClaudePieza(x))),
    trazos: p.trazos.map((t) => conCapa(t, capas, esDeClaudeTrazo(t))),
  };
}

export const esCapaInicial = (capas: Capa[]) =>
  capas.length === 2 && capas[0].id === CAPA_CLAUDE && capas[1].id === 'capa-1' && capas[1].nombre === 'Capa 1';

// Lo que hay en cada capa visible, de abajo arriba. Dentro de una capa: piezas, subrayador y, encima, lo demás.
export function porCapas<Pz extends ConCapa, T extends ConCapa & { herramienta: string }>(
  capas: Capa[], piezas: Pz[], trazos: T[], ocultas: ReadonlySet<string>,
): { capa: Capa; piezas: Pz[]; subrayados: T[]; trazos: T[] }[] {
  return capas
    .filter((c) => !ocultas.has(c.id))
    .map((capa) => ({
      capa,
      piezas: piezas.filter((x) => x.capa === capa.id),
      subrayados: trazos.filter((t) => t.capa === capa.id && t.herramienta === 'subrayador'),
      trazos: trazos.filter((t) => t.capa === capa.id && t.herramienta !== 'subrayador'),
    }));
}

// Como en Procreate, al empezar está activa la capa de Diego de más arriba.
export const activaInicial = (capas: Capa[]) => [...capas].reverse().find((c) => c.id !== CAPA_CLAUDE)?.id ?? CAPA_CLAUDE;

// La capa activa tiene que verse: si está oculta, pasa a la de debajo que se vea (o a la de encima). null si no se ve ninguna.
export function activaVisible(capas: Capa[], ocultas: ReadonlySet<string>, activa: string): string | null {
  const i = capas.findIndex((c) => c.id === activa);
  if (i < 0) {
    const d = [...capas].reverse().find((c) => c.id !== CAPA_CLAUDE && !ocultas.has(c.id));
    return d?.id ?? (ocultas.has(CAPA_CLAUDE) ? null : CAPA_CLAUDE);
  }
  if (!ocultas.has(activa)) return activa;
  for (let k = i - 1; k >= 0; k--) if (!ocultas.has(capas[k].id)) return capas[k].id;
  for (let k = i + 1; k < capas.length; k++) if (!ocultas.has(capas[k].id)) return capas[k].id;
  return null;
}
```

- [ ] **Step 4: Change the format half of `src/estudio/pizarra.ts`**

Sustituye todo desde la primera línea hasta el final de `pizarraVacia` (incluida; deja `serializarPizarra` sustituida también) por esto. Lo que viene después (`idLibre`, `aplicarOperacion`, `validarOperacion`) se queda como está salvo el cambio del Step 5.

```ts
import { CAPAS_INICIALES, capaPorDefecto, esCapaInicial, esDeClaudePieza, normalizarCapas, type Capa } from './capas.ts';
import { compilarExpresion, ErrorExpresion } from './expresion.ts';
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
  if (necesitaVersion2(p)) return JSON.stringify({ ...p, version: 2 }, null, 2) + '\n';
  const { capas: _capas, trazos: _trazos, ...resto } = p;
  return JSON.stringify({ ...resto, version: 1, piezas: p.piezas.map(({ capa: _capa, ...x }) => x) }, null, 2) + '\n';
}
```

- [ ] **Step 5: Normalize after every operation**

En la mitad de las operaciones de `src/estudio/pizarra.ts`, cambia `export function aplicarOperacion(p: Pizarra, op: Operacion): Pizarra {` por `function aplicar(p: Pizarra, op: Operacion): Pizarra {` (el cuerpo no cambia) y añade justo después de esa función:

```ts
export function aplicarOperacion(p: Pizarra, op: Operacion): Pizarra {
  return lista(aplicar(p, op));
}
```

- [ ] **Step 6: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: todo PASS y sin errores de tipos. (Si alguna prueba antigua compara una pizarra entera y falla solo por `capas`/`trazos`/`capa`, cambia su `toEqual` por `toMatchObject` y apúntalo como `Ruling:`.)

- [ ] **Step 7: Commit**

```bash
echo "Task 3: hecho — capas.ts y formato v2 (capas, trazos, letra; v1 si no hay nada nuevo)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/capas.ts src/estudio/capas.test.ts src/estudio/pizarra.ts src/estudio/pizarra.test.ts
git commit -m "Dibujo a mano: capas y formato de la versión 2 de la pizarra

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fusión a tres bandas

**Files:**
- Create: `src/estudio/fusion.ts`
- Test: `src/estudio/fusion.test.ts`

**Interfaces:**
- Consumes: `normalizarCapas`, `Capa` (Tarea 3); tipos `Pizarra`, `Pieza`, `Flecha` (Tarea 3); `Trazo` (Tarea 1).
- Produces: `fusionarLista<T extends { id: string }>(base: T[] | null, mia: T[], suya: T[]): T[]`, `fusionar(base: Pizarra | null, mia: Pizarra, suya: Pizarra): Pizarra` (resultado normalizado; `version` la recalcula quien la aplique con `aplicarOperacion` en la Tarea 5).

- [ ] **Step 1: Write the failing test**

`src/estudio/fusion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fusionar, fusionarLista } from './fusion.ts';
import { pizarraVacia, validarPizarra, type Pieza, type Pizarra } from './pizarra.ts';

const x = (id: string, v = 0) => ({ id, v });

describe('fusionarLista', () => {
  const base = [x('a'), x('b'), x('c')];
  it('lo nuevo de los dos lados se queda', () => {
    expect(fusionarLista(base, [...base, x('m')], [...base, x('s')]).map((e) => e.id)).toEqual(['a', 'b', 'c', 'm', 's']);
  });
  it('lo que borra un lado sin que el otro lo cambie, se borra', () => {
    expect(fusionarLista(base, [x('a'), x('c')], base).map((e) => e.id)).toEqual(['a', 'c']);
    expect(fusionarLista(base, base, [x('a'), x('c')]).map((e) => e.id)).toEqual(['a', 'c']);
  });
  it('lo que cambia un solo lado gana; si cambian los dos, gana el mío', () => {
    expect(fusionarLista(base, base, [x('a', 1), x('b'), x('c')])[0]).toEqual(x('a', 1));
    expect(fusionarLista(base, [x('a', 2), x('b'), x('c')], [x('a', 1), x('b'), x('c')])[0]).toEqual(x('a', 2));
  });
  it('si yo lo cambié y el otro lo borró, se queda lo mío', () => {
    expect(fusionarLista(base, [x('a', 2), x('b'), x('c')], [x('b'), x('c')]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
  it('sin base, junta los dos sin borrar nada (gana el mío si coinciden)', () => {
    expect(fusionarLista(null, [x('a', 2)], [x('a', 1), x('s')])).toEqual([x('a', 2), x('s')]);
  });
  it('el orden de las claves no cuenta como cambio', () => {
    expect(fusionarLista([{ id: 'a', v: 1, w: 2 }], [{ w: 2, v: 1, id: 'a' }], [{ id: 'a', v: 5, w: 2 }])[0]).toEqual({ id: 'a', v: 5, w: 2 });
  });
});

describe('fusionar', () => {
  const con = (cambios: Partial<Pizarra>): Pizarra => ({ ...pizarraVacia('Física'), ...cambios });
  const trazo = (id: string) =>
    validarPizarra({ version: 2, titulo: 'x', piezas: [], flechas: [], trazos: [{ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 1, 1] }] }).pizarra.trazos[0];
  it('junta los trazos de los dos lados y deja los datos del PC', () => {
    const r = fusionar(con({}), con({ trazos: [trazo('pc')], guardadaEn: 'estudios/f/pizarras/a.json' }), con({ trazos: [trazo('ipad')] }));
    expect(r.trazos.map((t) => t.id)).toEqual(['pc', 'ipad']);
    expect(r.guardadaEn).toBe('estudios/f/pizarras/a.json');
  });
  it('quita las flechas que se quedan sin pieza', () => {
    const t1: Pieza = { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a', capa: 'claude' };
    const t2: Pieza = { ...t1, id: 't2' };
    const base = con({ piezas: [t1, t2], flechas: [{ id: 'a1', de: 't1', a: 't2' }] });
    const r = fusionar(base, base, con({ piezas: [t1], flechas: [{ id: 'a1', de: 't1', a: 't2' }] }));
    expect(r.piezas.map((p) => p.id)).toEqual(['t1']);
    expect(r.flechas).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/fusion.test.ts`
Expected: FAIL (no existe `fusion.ts`).

- [ ] **Step 3: Write `src/estudio/fusion.ts`**

```ts
import { normalizarCapas, type Capa } from './capas.ts';
import type { Flecha, Pieza, Pizarra } from './pizarra.ts';
import type { Trazo } from './tinta.ts';

// Igual aunque las claves estén en otro orden.
function clave(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(clave).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${clave((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
const igual = (a: unknown, b: unknown) => clave(a) === clave(b);

// Junta dos listas por id respecto a la versión común (`base`). Si los dos cambiaron lo mismo, gana `mia`.
// Sin base, junta las dos sin borrar nada.
export function fusionarLista<T extends { id: string }>(base: T[] | null, mia: T[], suya: T[]): T[] {
  const deBase = new Map((base ?? []).map((x) => [x.id, x]));
  const deSuya = new Map(suya.map((x) => [x.id, x]));
  const deMia = new Set(mia.map((x) => x.id));
  const r: T[] = [];
  for (const x of mia) {
    const s = deSuya.get(x.id);
    const b = deBase.get(x.id);
    if (s) r.push(b && igual(x, b) ? s : x);
    else if (!base || !b || !igual(x, b)) r.push(x); // nuevo mío, sin base, o cambiado por mí (aunque el otro lo borrara)
  }
  for (const s of suya) if (!deMia.has(s.id) && (!base || !deBase.has(s.id))) r.push(s); // nuevo del otro
  return r;
}

// Fusión a tres bandas entre la pizarra del PC (`mia`) y la del historial (`suya`), con la última que subió el PC (`base`).
export function fusionar(base: Pizarra | null, mia: Pizarra, suya: Pizarra): Pizarra {
  const piezas = fusionarLista<Pieza>(base?.piezas ?? null, mia.piezas, suya.piezas);
  const ids = new Set(piezas.map((x) => x.id));
  return normalizarCapas({
    ...mia,
    titulo: base && mia.titulo === base.titulo ? suya.titulo : mia.titulo,
    capas: fusionarLista<Capa>(base?.capas ?? null, mia.capas, suya.capas),
    piezas,
    flechas: fusionarLista<Flecha>(base?.flechas ?? null, mia.flechas, suya.flechas).filter((f) => ids.has(f.de) && ids.has(f.a)),
    trazos: fusionarLista<Trazo>(base?.trazos ?? null, mia.trazos, suya.trazos),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/fusion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
echo "Task 4: hecho — fusion.ts (fusión a tres bandas por id)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/fusion.ts src/estudio/fusion.test.ts
git commit -m "Dibujo a mano: fusión a tres bandas entre el PC y el historial

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Operaciones nuevas (trazos, piezas, capas, lote, fusionar)

**Files:**
- Modify: `src/estudio/pizarra.ts` (tipo `Operacion` y toda la mitad de operaciones, desde `function idLibre` hasta el final)
- Modify: `src/estudio/capas.ts` (añadir al final las operaciones de capas)
- Test: `src/estudio/pizarra.test.ts`, `src/estudio/capas.test.ts`

**Interfaces:**
- Consumes: Tareas 1, 3 y 4 (`fusionar`).
- Produces: `Operacion` con `nota` (`nuevoId?`, `capa?`), `guardada` (`subida?: Pizarra`), `trazos { quitar: string[]; poner: Trazo[] }`, `piezas { quitar: string[]; poner: Pieza[]; flechas?: Flecha[] }`, `capa { accion: 'crear' | 'borrar' | 'renombrar' | 'ordenar'; id; nombre?; posicion? }`, `lote { ops: Operacion[] }`, `fusionar { base: Pizarra | null; suya: Pizarra }`; `aplicarOperacion` (idempotente) y `validarOperacion` para todas. En capas.ts: `opCrearCapa(p, activa): { op; id }`, `opDuplicarCapa(p, id, azar?): { op; id } | null`, `opMoverCapa(p, id, delta: 1 | -1): Operacion | null`.

- [ ] **Step 1: Write the failing tests**

En `src/estudio/pizarra.test.ts`, añade `type Operacion` al import de `./pizarra.ts`, añade `import { validarTrazo } from './tinta.ts';` y al final:

```ts
describe('operaciones de la v1.4', () => {
  const base = validarPizarra(ejemplo).pizarra;
  const trazo = (id: string, extra: Record<string, unknown> = {}) =>
    validarTrazo({ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5], capa: 'capa-1', ...extra }, 't');
  it('trazos: pone, sustituye en su sitio y quita', () => {
    const a = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1'), trazo('d-2')] });
    expect(a.trazos.map((t) => t.id)).toEqual(['d-1', 'd-2']);
    expect(a.version).toBe(2);
    const b = aplicarOperacion(a, { tipo: 'trazos', quitar: ['d-1'], poner: [trazo('d-2', { color: '#ff0000' }), trazo('d-3')] });
    expect(b.trazos.map((t) => [t.id, t.color])).toEqual([['d-2', '#ff0000'], ['d-3', '#000000']]);
  });
  it('aplicar dos veces la misma operación da lo mismo que una', () => {
    const ops: Operacion[] = [
      { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] },
      { tipo: 'nota', id: null, nuevoId: 'd-n', x: 0, y: 0, contenido: 'Hola', capa: 'capa-1' },
      { tipo: 'piezas', quitar: ['t1'], poner: [] },
      { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 2 },
      { tipo: 'lote', ops: [{ tipo: 'mover', id: 'f1', x: 3, y: 3 }, { tipo: 'trazos', quitar: [], poner: [trazo('d-9')] }] },
    ];
    for (const op of ops) {
      const una = aplicarOperacion(base, op);
      expect(aplicarOperacion(una, op)).toEqual(una);
    }
    expect(aplicarOperacion(base, ops[1]).piezas.at(-1)).toMatchObject({ id: 'd-n', capa: 'capa-1' });
  });
  it('piezas: quitar se lleva sus flechas; poner puede traer flechas', () => {
    const t1 = base.piezas[0];
    const sin = aplicarOperacion(base, { tipo: 'piezas', quitar: ['t1'], poner: [] });
    expect(sin.flechas).toEqual([]);
    const otra = aplicarOperacion(sin, { tipo: 'piezas', quitar: [], poner: [t1], flechas: [{ id: 'a1', de: 't1', a: 'f1' }] });
    expect(otra.flechas).toHaveLength(1);
  });
  it('capas: crear, renombrar, ordenar y borrar (con lo que tiene)', () => {
    let p = aplicarOperacion(base, { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'Ejercicio', posicion: 2 });
    p = aplicarOperacion(p, { tipo: 'trazos', quitar: [], poner: [trazo('d-1', { capa: 'capa-2' })] });
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'renombrar', id: 'capa-2', nombre: 'Mío' });
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 2 });
    expect(p.capas.map((c) => `${c.id}:${c.nombre}`)).toEqual(['capa-1:Capa 1', 'capa-2:Mío', 'claude:Claude']);
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'borrar', id: 'capa-2' });
    expect(p.capas.map((c) => c.id)).toEqual(['capa-1', 'claude']);
    expect(p.trazos).toEqual([]);
  });
  it('la capa de Claude no se borra ni se renombra, y borrar la última de Diego crea «Capa 1»', () => {
    expect(aplicarOperacion(base, { tipo: 'capa', accion: 'borrar', id: 'claude' }).capas).toEqual(base.capas);
    expect(aplicarOperacion(base, { tipo: 'capa', accion: 'renombrar', id: 'claude', nombre: 'X' }).capas[0].nombre).toBe('Claude');
    const p = aplicarOperacion(base, { tipo: 'capa', accion: 'borrar', id: 'capa-1' });
    expect(p.capas).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'Capa 1' }]);
    expect(p.piezas.find((x) => x.id === 'n1')).toBeUndefined();
  });
  it('lote aplica todas en orden', () => {
    const p = aplicarOperacion(base, {
      tipo: 'lote',
      ops: [{ tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }, { tipo: 'trazos', quitar: ['d-1'], poner: [] }, { tipo: 'borrar', id: 'f1' }],
    });
    expect(p.trazos).toEqual([]);
    expect(p.piezas.map((x) => x.id)).not.toContain('f1');
  });
  it('fusionar junta con la versión del historial', () => {
    const suya = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('ipad')] });
    expect(aplicarOperacion(base, { tipo: 'fusionar', base, suya }).trazos.map((t) => t.id)).toEqual(['ipad']);
  });
  it('validarOperacion con las nuevas', () => {
    expect(validarOperacion({ tipo: 'trazos', quitar: ['a'], poner: [{ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0] }] })).toMatchObject({ tipo: 'trazos' });
    expect(() => validarOperacion({ tipo: 'trazos', quitar: [], poner: [{ id: 'd-1' }] })).toThrow(ErrorPizarra);
    expect(validarOperacion({ tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 1 })).toEqual({ tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 1 });
    expect(() => validarOperacion({ tipo: 'capa', accion: 'volar', id: 'x' })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'lote', ops: [{ tipo: 'guardada', ruta: 'estudios/f/pizarras/a.json' }] })).toThrow(ErrorPizarra);
    expect(validarOperacion({ tipo: 'nota', id: null, x: 0, y: 0, contenido: 'a', nuevoId: 'd-1', capa: 'capa-1' })).toMatchObject({ nuevoId: 'd-1', capa: 'capa-1' });
    expect(validarOperacion({ tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json', subida: pizarraVacia('x') })).toMatchObject({ tipo: 'guardada', subida: { titulo: 'x' } });
    expect(validarOperacion({ tipo: 'fusionar', base: null, suya: pizarraVacia('x') })).toMatchObject({ tipo: 'fusionar', base: null });
    expect(validarOperacion({ tipo: 'piezas', quitar: [], poner: [ejemplo.piezas[5]] })).toMatchObject({ tipo: 'piezas' });
  });
});
```

En `src/estudio/capas.test.ts`, cambia el import a `import { activaInicial, activaVisible, CAPAS_INICIALES, completarCapas, idCapaLibre, normalizarCapas, opCrearCapa, opDuplicarCapa, opMoverCapa, porCapas } from './capas.ts';`, añade `import { aplicarOperacion, validarPizarra } from './pizarra.ts';` y al final:

```ts
describe('operaciones de capas', () => {
  const p = validarPizarra({
    version: 2, titulo: 'x',
    piezas: [{ id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' }, { id: 't2', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'b' }],
    flechas: [{ id: 'a1', de: 't1', a: 't2' }],
    trazos: [{ id: 'c1', herramienta: 'flecha', color: '#000000', grosor: 2, puntos: [0, 0, 9, 9], autor: 'claude' }],
  }).pizarra;
  it('crear pone la capa encima de la activa', () => {
    expect(opCrearCapa(p, 'claude')).toEqual({ id: 'capa-2', op: { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'Capa 2', posicion: 1 } });
  });
  it('duplicar la de Claude da una capa de Diego con copias (flechas incluidas) y sin autor', () => {
    const r = opDuplicarCapa(p, 'claude')!;
    const q = aplicarOperacion(p, r.op);
    expect(q.capas.map((c) => c.nombre)).toEqual(['Claude', 'Claude (copia)', 'Capa 1']);
    expect(q.piezas.filter((x) => x.capa === r.id)).toHaveLength(2);
    expect(q.flechas).toHaveLength(2);
    expect(q.trazos.find((t) => t.capa === r.id)?.autor).toBeUndefined();
  });
  it('subir y bajar una capa', () => {
    expect(opMoverCapa(p, 'claude', 1)).toEqual({ tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 1 });
    expect(opMoverCapa(p, 'claude', -1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/pizarra.test.ts src/estudio/capas.test.ts`
Expected: FAIL (tipos de operación desconocidos, `opCrearCapa` no existe).

- [ ] **Step 3: Replace the `Operacion` type in `src/estudio/pizarra.ts`**

```ts
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
```

Y añade a los imports de arriba `import { fusionar } from './fusion.ts';` y `CAPA_CLAUDE` al import de `./capas.ts`.

- [ ] **Step 4: Replace the operations half of `src/estudio/pizarra.ts`** (desde `function idLibre` hasta el final del archivo)

```ts
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
```

- [ ] **Step 5: Add the layer operations at the end of `src/estudio/capas.ts`**

Añade arriba `import type { Operacion, Pizarra } from './pizarra.ts';` y `import { nuevoId } from './tinta.ts';`, y al final:

```ts
// Una capa nueva de Diego, justo encima de la activa.
export function opCrearCapa(p: Pizarra, activa: string): { op: Operacion; id: string } {
  const id = idCapaLibre(p.capas);
  const posicion = p.capas.findIndex((c) => c.id === activa) + 1 || p.capas.length;
  return { id, op: { tipo: 'capa', accion: 'crear', id, nombre: `Capa ${id.slice('capa-'.length)}`, posicion } };
}

// Copia de una capa justo encima, con ids nuevos. La copia de la de Claude es de Diego (sin autor).
export function opDuplicarCapa(p: Pizarra, id: string, azar: () => number = Math.random): { op: Operacion; id: string } | null {
  const capa = p.capas.find((c) => c.id === id);
  if (!capa) return null;
  const nueva = idCapaLibre(p.capas);
  const usados = new Set([...p.piezas.map((x) => x.id), ...p.trazos.map((t) => t.id), ...p.flechas.map((f) => f.id)]);
  const otroId = () => {
    const n = nuevoId('d', usados, azar);
    usados.add(n);
    return n;
  };
  const mapa = new Map<string, string>();
  const piezas = p.piezas.filter((x) => x.capa === id).map((x) => {
    const n = otroId();
    mapa.set(x.id, n);
    return { ...x, id: n, capa: nueva };
  });
  const trazos = p.trazos.filter((t) => t.capa === id).map(({ autor: _autor, ...t }) => ({ ...t, id: otroId(), capa: nueva }));
  const flechas = p.flechas
    .filter((f) => mapa.has(f.de) && mapa.has(f.a))
    .map((f) => ({ ...f, id: otroId(), de: mapa.get(f.de)!, a: mapa.get(f.a)! }));
  return {
    id: nueva,
    op: {
      tipo: 'lote',
      ops: [
        { tipo: 'capa', accion: 'crear', id: nueva, nombre: `${capa.nombre} (copia)`.slice(0, 40), posicion: p.capas.findIndex((c) => c.id === id) + 1 },
        { tipo: 'piezas', quitar: [], poner: piezas, flechas },
        { tipo: 'trazos', quitar: [], poner: trazos },
      ],
    },
  };
}

// delta 1 = subir (hacia encima), -1 = bajar. null si ya está en el borde.
export function opMoverCapa(p: Pizarra, id: string, delta: 1 | -1): Operacion | null {
  const i = p.capas.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.capas.length) return null;
  return { tipo: 'capa', accion: 'ordenar', id, posicion: j };
}
```

- [ ] **Step 6: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: todo PASS, sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
echo "Task 5: hecho — operaciones trazos, piezas, capa, lote y fusionar (idempotentes) + operaciones de capas" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/pizarra.ts src/estudio/pizarra.test.ts src/estudio/capas.ts src/estudio/capas.test.ts
git commit -m "Dibujo a mano: operaciones nuevas de la pizarra y de las capas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Deshacer y rehacer

**Files:**
- Create: `src/estudio/deshacer.ts`
- Test: `src/estudio/deshacer.test.ts`

**Interfaces:**
- Consumes: `aplicarOperacion`, `Operacion`, `Pizarra` (Tarea 5), `CAPA_CLAUDE` (Tarea 3).
- Produces: `contraria(p, op): Operacion | null`, `interface Pila { hechas: { op; contraria }[]; deshechas: Operacion[] }`, `pilaVacia()`, `registrar(pila, p, op): Pila`, `deshacer(pila): { pila; op } | null`, `rehacer(pila, p): { pila; op } | null`. Como mucho 100 pasos.

- [ ] **Step 1: Write the failing test**

`src/estudio/deshacer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contraria, deshacer, pilaVacia, registrar, rehacer } from './deshacer';
import { aplicarOperacion, validarPizarra, type Operacion, type Pizarra } from './pizarra';
import { validarTrazo } from './tinta';

const base = validarPizarra({
  version: 1, titulo: 'x',
  piezas: [{ id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' }, { id: 'n1', tipo: 'nota', x: 5, y: 5, ancho: 240, contenido: 'Hola' }],
  flechas: [{ id: 'a1', de: 't1', a: 'n1' }],
}).pizarra;
const trazo = (id: string) => validarTrazo({ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5], capa: 'capa-1' }, 't');
const conTrazo = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] });

// El orden dentro de las listas puede cambiar al deshacer (lo restaurado va encima): se compara sin orden.
const porId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
const sinOrden = (p: Pizarra) => ({ ...p, piezas: [...p.piezas].sort(porId), trazos: [...p.trazos].sort(porId), flechas: [...p.flechas].sort(porId) });

describe('contraria: hacer y deshacer deja la pizarra como estaba', () => {
  const casos: [string, Pizarra, Operacion][] = [
    ['mover', base, { tipo: 'mover', id: 't1', x: 50, y: 60 }],
    ['borrar una pieza con su flecha', base, { tipo: 'borrar', id: 't1' }],
    ['nota nueva', base, { tipo: 'nota', id: null, nuevoId: 'd-n', x: 1, y: 2, contenido: 'Otra', capa: 'capa-1' }],
    ['editar una nota', base, { tipo: 'nota', id: 'n1', x: 5, y: 5, contenido: 'Cambiada' }],
    ['poner trazos', base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }],
    ['goma (quitar y poner trozos)', conTrazo, { tipo: 'trazos', quitar: ['d-1'], poner: [trazo('d-2'), trazo('d-3')] }],
    ['quitar piezas', base, { tipo: 'piezas', quitar: ['n1'], poner: [] }],
    ['crear capa', base, { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 2 }],
    ['renombrar capa', base, { tipo: 'capa', accion: 'renombrar', id: 'capa-1', nombre: 'Mía' }],
    ['ordenar capa', base, { tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 1 }],
    ['borrar la última capa de Diego con lo que tiene', conTrazo, { tipo: 'capa', accion: 'borrar', id: 'capa-1' }],
    ['lote', base, { tipo: 'lote', ops: [{ tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }, { tipo: 'mover', id: 't1', x: 9, y: 9 }] }],
  ];
  for (const [nombre, p, op] of casos)
    it(nombre, () => {
      const c = contraria(p, op);
      expect(c).not.toBeNull();
      expect(sinOrden(aplicarOperacion(aplicarOperacion(p, op), c!))).toEqual(sinOrden(p));
    });
  it('guardada y fusionar no se deshacen', () => {
    expect(contraria(base, { tipo: 'guardada', ruta: 'estudios/f/pizarras/a.json' })).toBeNull();
    expect(contraria(base, { tipo: 'fusionar', base: null, suya: base })).toBeNull();
  });
});

describe('pila de deshacer', () => {
  const op: Operacion = { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] };
  it('deshacer y rehacer', () => {
    let pila = registrar(pilaVacia(), base, op);
    let p = aplicarOperacion(base, op);
    const d = deshacer(pila)!;
    p = aplicarOperacion(p, d.op);
    pila = d.pila;
    expect(p.trazos).toEqual([]);
    const r = rehacer(pila, p)!;
    p = aplicarOperacion(p, r.op);
    pila = r.pila;
    expect(p.trazos.map((t) => t.id)).toEqual(['d-1']);
    expect(deshacer(pila)).not.toBeNull();
    expect(rehacer(pila, p)).toBeNull();
  });
  it('hacer algo nuevo borra lo que se podía rehacer', () => {
    const d = deshacer(registrar(pilaVacia(), base, op))!;
    expect(registrar(d.pila, base, op).deshechas).toEqual([]);
  });
  it('si Claude ya borró lo que se deshace, no pasa nada', () => {
    const d = deshacer(registrar(pilaVacia(), base, op))!;
    expect(aplicarOperacion(base, d.op)).toEqual(base);
  });
  it('guarda como mucho 100 pasos', () => {
    let pila = pilaVacia();
    for (let i = 0; i < 120; i++) pila = registrar(pila, base, { tipo: 'mover', id: 't1', x: i, y: 0 });
    expect(pila.hechas).toHaveLength(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/deshacer.test.ts`
Expected: FAIL (no existe `deshacer.ts`).

- [ ] **Step 3: Write `src/estudio/deshacer.ts`**

```ts
import { CAPA_CLAUDE } from './capas';
import { aplicarOperacion, type Operacion, type Pizarra } from './pizarra';

function devolverPiezas(p: Pizarra, ids: string[]): Operacion | null {
  const fuera = new Set(ids);
  const piezas = p.piezas.filter((x) => fuera.has(x.id));
  if (!piezas.length) return null;
  return { tipo: 'piezas', quitar: [], poner: piezas, flechas: p.flechas.filter((f) => fuera.has(f.de) || fuera.has(f.a)) };
}

// La operación que deshace `op`, calculada sobre la pizarra de antes (`p`). null si no hay nada que deshacer.
export function contraria(p: Pizarra, op: Operacion): Operacion | null {
  switch (op.tipo) {
    case 'mover': {
      const x = p.piezas.find((y) => y.id === op.id);
      return x ? { tipo: 'mover', id: x.id, x: x.x, y: x.y } : null;
    }
    case 'borrar':
      return devolverPiezas(p, [op.id]);
    case 'nota': {
      const objetivo = op.id ?? op.nuevoId;
      const vieja = p.piezas.find((x) => x.id === objetivo && x.tipo === 'nota');
      if (vieja?.tipo === 'nota') return { tipo: 'nota', id: vieja.id, x: vieja.x, y: vieja.y, contenido: vieja.contenido };
      const nueva = aplicarOperacion(p, op).piezas.find((x) => !p.piezas.some((y) => y.id === x.id));
      return nueva ? { tipo: 'borrar', id: nueva.id } : null;
    }
    case 'trazos': {
      const tocados = new Set([...op.quitar, ...op.poner.map((t) => t.id)]);
      return { tipo: 'trazos', quitar: op.poner.map((t) => t.id), poner: p.trazos.filter((t) => tocados.has(t.id)) };
    }
    case 'piezas': {
      const tocadas = new Set([...op.quitar, ...op.poner.map((x) => x.id)]);
      return {
        tipo: 'piezas',
        quitar: op.poner.map((x) => x.id),
        poner: p.piezas.filter((x) => tocadas.has(x.id)),
        flechas: p.flechas.filter((f) => tocadas.has(f.de) || tocadas.has(f.a)),
      };
    }
    case 'capa': {
      const i = p.capas.findIndex((c) => c.id === op.id);
      const capa = p.capas[i];
      switch (op.accion) {
        case 'crear':
          return i >= 0 ? null : { tipo: 'capa', accion: 'borrar', id: op.id };
        case 'renombrar':
          return capa ? { tipo: 'capa', accion: 'renombrar', id: op.id, nombre: capa.nombre } : null;
        case 'ordenar':
          return capa ? { tipo: 'capa', accion: 'ordenar', id: op.id, posicion: i } : null;
        case 'borrar': {
          if (!capa || capa.id === CAPA_CLAUDE) return null;
          const piezas = p.piezas.filter((x) => x.capa === op.id);
          const ids = new Set(piezas.map((x) => x.id));
          return {
            tipo: 'lote',
            ops: [
              { tipo: 'capa', accion: 'crear', id: capa.id, nombre: capa.nombre, posicion: i },
              { tipo: 'piezas', quitar: [], poner: piezas, flechas: p.flechas.filter((f) => ids.has(f.de) || ids.has(f.a)) },
              { tipo: 'trazos', quitar: [], poner: p.trazos.filter((t) => t.capa === op.id) },
            ],
          };
        }
      }
      return null;
    }
    case 'lote': {
      const pasos: Operacion[] = [];
      let actual = p;
      for (const o of op.ops) {
        const c = contraria(actual, o);
        if (c) pasos.unshift(c);
        actual = aplicarOperacion(actual, o);
      }
      return { tipo: 'lote', ops: pasos };
    }
    case 'guardada':
    case 'fusionar':
      return null;
  }
}

const LIMITE = 100;

export interface Pila {
  hechas: { op: Operacion; contraria: Operacion }[];
  deshechas: Operacion[];
}

export const pilaVacia = (): Pila => ({ hechas: [], deshechas: [] });

// Apunta una operación de Diego (antes de aplicarla sobre `p`). Lo que se podía rehacer se pierde.
export function registrar(pila: Pila, p: Pizarra, op: Operacion): Pila {
  const c = contraria(p, op);
  if (!c) return pila;
  return { hechas: [...pila.hechas, { op, contraria: c }].slice(-LIMITE), deshechas: [] };
}

export function deshacer(pila: Pila): { pila: Pila; op: Operacion } | null {
  const ultimo = pila.hechas.at(-1);
  if (!ultimo) return null;
  return { op: ultimo.contraria, pila: { hechas: pila.hechas.slice(0, -1), deshechas: [...pila.deshechas, ultimo.op] } };
}

export function rehacer(pila: Pila, p: Pizarra): { pila: Pila; op: Operacion } | null {
  const op = pila.deshechas.at(-1);
  if (!op) return null;
  const c = contraria(p, op);
  return { op, pila: { hechas: c ? [...pila.hechas, { op, contraria: c }] : pila.hechas, deshechas: pila.deshechas.slice(0, -1) } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/deshacer.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
echo "Task 6: hecho — deshacer.ts (contrarias y pila de 100 pasos)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/deshacer.ts src/estudio/deshacer.test.ts
git commit -m "Dibujo a mano: deshacer y rehacer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Herramientas y gestos

**Files:**
- Create: `src/estudio/herramientas.ts`, `src/estudio/gestos.ts`
- Test: `src/estudio/herramientas.test.ts`, `src/estudio/gestos.test.ts`

**Interfaces:**
- Consumes: Tareas 1, 2, 5.
- Produces (herramientas.ts): `type NombreHerramienta = 'mover' | 'lapiz' | 'subrayador' | 'forma' | 'lazo' | 'borrador' | 'texto'`, `type Forma`, `type Grosor = 'fino' | 'medio' | 'grueso'`, `interface EstadoHerramientas { herramienta; forma; borrador: 'trazos' | 'goma'; color; propio: string | null; grosor }`, `COLORES` (8), `GROSORES = { fino: 2, medio: 4, grueso: 8 }`, `INICIALES`, `leerHerramientas(texto)`, `CLAVE_HERRAMIENTAS`, `claveOcultas(clave)`, `leerOcultas(texto)`, `dibuja(h)`.
- Produces (gestos.ts): `interface Seleccion { trazos: string[]; piezas: string[] }`, `SIN_SELECCION`, `haySeleccion(s)`, `limpiarSeleccion(p, s)`, `grosorDe(h)`, `ajustarForma(forma, a, b, mayus)`, `trazoDeGesto(h, id, capa, puntos, presiones, mayus, tolerancia = 0.5): Trazo | null`, `trazosTocados(trazos, capa, p, radio): string[]`, `pasarGoma(trazos, capa, tramo, radio, crearId)`, `resultadoGoma(originales, trabajo)`, `seleccionarConLazo(p, capa, poligono, rect: (x: Pieza) => Rect)`, `cajaDeSeleccion(p, sel, rect)`, `moverSeleccion(p, sel, dx, dy): Operacion`, `borrarSeleccion(sel): Operacion`, `toqueMultiple(dedos, duracionMs, movidoPx)`.

- [ ] **Step 1: Write the failing tests**

`src/estudio/herramientas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { INICIALES, leerHerramientas, leerOcultas } from './herramientas';

describe('herramientas', () => {
  it('lee lo guardado y rellena lo que falte o esté mal', () => {
    expect(leerHerramientas(null)).toEqual(INICIALES);
    expect(leerHerramientas('no es json')).toEqual(INICIALES);
    expect(leerHerramientas(JSON.stringify({ herramienta: 'lapiz', color: '#FF0000', grosor: 'enorme', borrador: 'goma' })))
      .toEqual({ ...INICIALES, herramienta: 'lapiz', color: '#ff0000', borrador: 'goma' });
  });
  it('capas ocultas', () => {
    expect(leerOcultas('["capa-1", 3]')).toEqual(['capa-1']);
    expect(leerOcultas(null)).toEqual([]);
  });
});
```

`src/estudio/gestos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ajustarForma, borrarSeleccion, cajaDeSeleccion, grosorDe, limpiarSeleccion, moverSeleccion, pasarGoma, resultadoGoma, seleccionarConLazo,
  toqueMultiple, trazoDeGesto, trazosTocados,
} from './gestos';
import { INICIALES } from './herramientas';
import { aplicarOperacion, validarPizarra } from './pizarra';

const lapiz = { ...INICIALES, herramienta: 'lapiz' as const };

describe('el trazo de un gesto', () => {
  it('lápiz: grosor, color, capa y presión', () => {
    const t = trazoDeGesto(lapiz, 'd-1', 'capa-1', [{ x: 0, y: 0 }, { x: 10, y: 0 }], [0.3, 0.7], false)!;
    expect(t).toMatchObject({ id: 'd-1', herramienta: 'lapiz', color: INICIALES.color, grosor: 4, capa: 'capa-1', puntos: [0, 0, 10, 0], presion: [0.3, 0.7] });
  });
  it('un toque suelto deja un punto', () => {
    expect(trazoDeGesto(lapiz, 'd-1', 'capa-1', [{ x: 5, y: 5 }], null, false)!.puntos).toEqual([5, 5, 5.1, 5]);
  });
  it('subrayador: el triple de grosor y sin presión', () => {
    const t = trazoDeGesto({ ...INICIALES, herramienta: 'subrayador' }, 'd-1', 'capa-1', [{ x: 0, y: 0 }, { x: 9, y: 0 }], [0.5, 0.5], false)!;
    expect(t.grosor).toBe(12);
    expect(t.presion).toBeUndefined();
    expect(grosorDe({ ...INICIALES, herramienta: 'subrayador', grosor: 'grueso' })).toBe(24);
  });
  it('formas: dos puntos, con Mayús rectas a 45° y cuadrados; sin tamaño no hay forma', () => {
    const forma = { ...INICIALES, herramienta: 'forma' as const, forma: 'rectangulo' as const };
    expect(trazoDeGesto(forma, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: 10, y: 4 }], null, true)!.puntos).toEqual([0, 0, 10, 10]);
    expect(trazoDeGesto(forma, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 1, y: 0 }], null, false)).toBeNull();
    const b = ajustarForma('linea', { x: 0, y: 0 }, { x: 10, y: 1 }, true);
    expect(b.y).toBeCloseTo(0);
    expect(b.x).toBeCloseTo(Math.hypot(10, 1));
  });
  it('mover, lazo, borrador y texto no dibujan', () => {
    expect(trazoDeGesto(INICIALES, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 9, y: 9 }], null, false)).toBeNull();
  });
});

describe('borradores, lazo y selección', () => {
  const p = validarPizarra({
    version: 2, titulo: 'x',
    piezas: [{ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 40, contenido: 'a' }],
    flechas: [],
    trazos: [
      { id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 100, 100, 100] },
      { id: 'c1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 100, 100, 100], autor: 'claude' },
    ],
  }).pizarra;
  const rect = () => ({ x: 0, y: 0, w: 40, h: 60 });
  it('los borradores solo tocan la capa activa', () => {
    expect(trazosTocados(p.trazos, 'capa-1', { x: 50, y: 100 }, 5)).toEqual(['d-1']);
    let n = 0;
    const r = pasarGoma(p.trazos, 'claude', [{ x: 50, y: 90 }, { x: 50, y: 110 }], 5, () => `d-g${++n}`);
    expect(r.quitar).toEqual(['c1']);
    expect(r.poner).toHaveLength(2);
    expect(resultadoGoma(p.trazos, [p.trazos[0], ...r.poner])).toEqual({ quitar: ['c1'], poner: r.poner });
  });
  it('lazo, caja, mover y borrar lo seleccionado', () => {
    const sel = seleccionarConLazo(p, 'capa-1', [{ x: -10, y: -10 }, { x: 200, y: -10 }, { x: 200, y: 200 }, { x: -10, y: 200 }], rect);
    expect(sel).toEqual({ trazos: ['d-1'], piezas: ['n1'] });
    expect(cajaDeSeleccion(p, sel, rect)).toEqual({ x: -1, y: 0, w: 102, h: 101 });
    const movida = aplicarOperacion(p, moverSeleccion(p, sel, 10, 5));
    expect(movida.trazos[0].puntos).toEqual([10, 105, 110, 105]);
    expect(movida.piezas[0]).toMatchObject({ x: 10, y: 5 });
    const borrada = aplicarOperacion(p, borrarSeleccion(sel));
    expect(borrada.trazos.map((t) => t.id)).toEqual(['c1']);
    expect(borrada.piezas).toEqual([]);
    expect(limpiarSeleccion(borrada, sel)).toEqual({ trazos: [], piezas: [] });
    expect(limpiarSeleccion(p, sel)).toBe(sel);
  });
  it('toque con dos dedos = deshacer, con tres = rehacer (si es rápido y sin moverse)', () => {
    expect(toqueMultiple(2, 150, 3)).toBe('deshacer');
    expect(toqueMultiple(3, 150, 3)).toBe('rehacer');
    expect(toqueMultiple(2, 500, 3)).toBeNull();
    expect(toqueMultiple(2, 150, 40)).toBeNull();
    expect(toqueMultiple(1, 100, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/herramientas.test.ts src/estudio/gestos.test.ts`
Expected: FAIL (no existen los módulos).

- [ ] **Step 3: Write `src/estudio/herramientas.ts`**

```ts
// Herramienta, color y grosor elegidos (se recuerdan en cada dispositivo).
export type NombreHerramienta = 'mover' | 'lapiz' | 'subrayador' | 'forma' | 'lazo' | 'borrador' | 'texto';
export type Forma = 'linea' | 'flecha' | 'rectangulo' | 'elipse';
export type Grosor = 'fino' | 'medio' | 'grueso';

export interface EstadoHerramientas {
  herramienta: NombreHerramienta;
  forma: Forma;
  borrador: 'trazos' | 'goma';
  color: string;
  propio: string | null; // el color elegido a mano (el noveno hueco)
  grosor: Grosor;
}

// Combinan con el tema «papel cálido».
export const COLORES = ['#3b3027', '#b8603d', '#b3412e', '#e0b53a', '#4d8b4a', '#3b82f6', '#7c5cc4', '#8b7b6a'] as const;
export const GROSORES: Record<Grosor, number> = { fino: 2, medio: 4, grueso: 8 };
export const INICIALES: EstadoHerramientas = { herramienta: 'mover', forma: 'flecha', borrador: 'trazos', color: COLORES[0], propio: null, grosor: 'medio' };

const NOMBRES: readonly NombreHerramienta[] = ['mover', 'lapiz', 'subrayador', 'forma', 'lazo', 'borrador', 'texto'];
const FORMAS: readonly Forma[] = ['linea', 'flecha', 'rectangulo', 'elipse'];
const TAMANOS: readonly Grosor[] = ['fino', 'medio', 'grueso'];
const esColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export const CLAVE_HERRAMIENTAS = 'sc-pizarra-herramientas';
export const claveOcultas = (clave: string) => `sc-capas-ocultas-${clave}`;

export function leerHerramientas(texto: string | null): EstadoHerramientas {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(texto ?? '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    // se queda con lo de por defecto
  }
  return {
    herramienta: NOMBRES.includes(o.herramienta as NombreHerramienta) ? (o.herramienta as NombreHerramienta) : INICIALES.herramienta,
    forma: FORMAS.includes(o.forma as Forma) ? (o.forma as Forma) : INICIALES.forma,
    borrador: o.borrador === 'goma' ? 'goma' : 'trazos',
    color: esColor(o.color) ? o.color.toLowerCase() : INICIALES.color,
    propio: esColor(o.propio) ? o.propio.toLowerCase() : null,
    grosor: TAMANOS.includes(o.grosor as Grosor) ? (o.grosor as Grosor) : INICIALES.grosor,
  };
}

export function leerOcultas(texto: string | null): string[] {
  try {
    const v: unknown = JSON.parse(texto ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  } catch {
    return [];
  }
}

// Las herramientas que escriben en la capa activa (no valen en la de Claude).
export const dibuja = (h: NombreHerramienta) => h === 'lapiz' || h === 'subrayador' || h === 'forma' || h === 'texto';
```

- [ ] **Step 4: Write `src/estudio/gestos.ts`**

```ts
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
```

- [ ] **Step 5: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/herramientas.test.ts src/estudio/gestos.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
echo "Task 7: hecho — herramientas.ts (preferencias) y gestos.ts (trazo, goma, lazo, selección, toques)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/herramientas.ts src/estudio/herramientas.test.ts src/estudio/gestos.ts src/estudio/gestos.test.ts
git commit -m "Dibujo a mano: herramientas y gestos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Copiar y pegar

**Files:**
- Create: `src/estudio/portapapeles.ts`
- Test: `src/estudio/portapapeles.test.ts`

**Interfaces:**
- Consumes: `Seleccion` (Tarea 7), `nuevoId`, `moverTrazo`, `cajaDeTrazo` (Tareas 1-2).
- Produces: `interface Recorte { trazos; piezas; flechas; origen: string; clave: string }`, `guardarRecorte(r)`, `leerRecorte()`, `copiar(p, sel, origen, clave): Recorte | null`, `DESPLAZAMIENTO = 24`, `pegar(r, p, capa, origen, centro: Punto | null, azar?): { op; seleccion } | { error }`.

- [ ] **Step 1: Write the failing test**

`src/estudio/portapapeles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aplicarOperacion, validarPizarra } from './pizarra';
import { copiar, pegar } from './portapapeles';

const p = validarPizarra({
  version: 2, titulo: 'x',
  piezas: [
    { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' },
    { id: 't2', tipo: 'texto', x: 200, y: 0, ancho: 100, contenido: 'b' },
    { id: 'i1', tipo: 'imagen', x: 0, y: 300, ancho: 100, contenido: 'imagenes/a.png' },
  ],
  flechas: [{ id: 'a1', de: 't1', a: 't2' }],
  trazos: [{ id: 'c1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 10, 10], autor: 'claude' }],
}).pizarra;

describe('copiar y pegar', () => {
  it('copia lo seleccionado, con las flechas entre piezas copiadas', () => {
    expect(copiar(p, { piezas: ['t1', 't2'], trazos: ['c1'] }, 'o', 'c')!.flechas).toHaveLength(1);
    expect(copiar(p, { piezas: ['t1'], trazos: [] }, 'o', 'c')!.flechas).toEqual([]);
    expect(copiar(p, { piezas: [], trazos: [] }, 'o', 'c')).toBeNull();
  });
  it('pega en la capa activa, desplazado, con ids nuevos y sin autor', () => {
    const r = copiar(p, { piezas: ['t1', 't2'], trazos: ['c1'] }, 'o', 'c')!;
    const res = pegar(r, p, 'capa-1', 'o', null);
    if ('error' in res) throw new Error(res.error);
    const q = aplicarOperacion(p, res.op);
    expect(q.piezas.filter((x) => res.seleccion.piezas.includes(x.id)).map((x) => [x.x, x.y, x.capa])).toEqual([[24, 24, 'capa-1'], [224, 24, 'capa-1']]);
    const t = q.trazos.find((x) => res.seleccion.trazos.includes(x.id))!;
    expect(t).toMatchObject({ capa: 'capa-1', puntos: [24, 24, 34, 34] });
    expect(t.autor).toBeUndefined();
    expect(q.flechas).toHaveLength(2);
    expect(new Set([...q.piezas, ...q.trazos].map((x) => x.id)).size).toBe(q.piezas.length + q.trazos.length);
  });
  it('en otra pizarra se pega centrado donde se está mirando', () => {
    const res = pegar(copiar(p, { piezas: ['t1'], trazos: [] }, 'o', 'c')!, p, 'capa-1', 'o', { x: 500, y: 500 });
    if ('error' in res) throw new Error(res.error);
    expect(aplicarOperacion(p, res.op).piezas.at(-1)).toMatchObject({ x: 450, y: 470 });
  });
  it('una imagen solo se pega en el mismo sitio', () => {
    const r = copiar(p, { piezas: ['i1'], trazos: [] }, 'historial:fisica', 'c')!;
    expect(pegar(r, p, 'capa-1', 'local:fisica:conv', null)).toHaveProperty('error');
    expect(pegar(r, p, 'capa-1', 'historial:fisica', null)).toHaveProperty('op');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/portapapeles.test.ts`
Expected: FAIL (no existe `portapapeles.ts`).

- [ ] **Step 3: Write `src/estudio/portapapeles.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/portapapeles.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
echo "Task 8: hecho — portapapeles.ts (copiar y pegar entre pizarras; imágenes solo en el mismo origen)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/portapapeles.ts src/estudio/portapapeles.test.ts
git commit -m "Dibujo a mano: copiar y pegar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Programa local: copia base, fusionar e instrucciones de Claude

**Files:**
- Modify: `src/estudio/tipos.ts` (`EstadoPizarra`), `local/pizarras.ts`, `local/servidor.ts`, `local/instrucciones-estudio.md`
- Test: `local/pizarras.test.ts`, `local/servidor.test.ts`

**Interfaces:**
- Consumes: operaciones `guardada` (con `subida`) y `fusionar` (Tarea 5).
- Produces: `EstadoPizarra.base: Pizarra | null` (la copia de lo último que subió el PC al historial, en `pizarra-<n>.subida.json`); el programa local guarda la base al aplicar `guardada` con `subida` y al aplicar `fusionar` (la base pasa a ser `suya`); `POST pizarra/operacion` acepta hasta 8 MB.

- [ ] **Step 1: Write the failing tests**

En `local/pizarras.test.ts`, añade `existsSync` al import de `node:fs`, añade `import { aplicarOperacion, pizarraVacia } from '../src/estudio/pizarra.ts';` y, dentro de `describe('pizarras en el disco', …)`:

```ts
  it('guardar en el historial deja una copia base, y fusionar la cambia por la del historial', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    const subida = pizarraVacia('Newton');
    await operarPizarra(c, 1, { tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json', subida });
    expect((await leerPizarra(c, 1)).base?.titulo).toBe('Newton');
    const suya = aplicarOperacion(pizarraVacia('Newton'), { tipo: 'nota', id: null, nuevoId: 'd-ipad', x: 0, y: 0, contenido: 'Del iPad' });
    const p = await operarPizarra(c, 1, { tipo: 'fusionar', base: subida, suya });
    expect(p.piezas.map((x) => x.id)).toEqual(['d-ipad']);
    expect(p.guardadaEn).toBe('estudios/fisica/pizarras/a.json');
    expect((await leerPizarra(c, 1)).base?.piezas).toHaveLength(1);
    await borrarPizarra(c, 1);
    expect(existsSync(path.join(c, 'pizarra-1.subida.json'))).toBe(false);
  });
  it('sin copia base, base es null', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    expect((await leerPizarra(c, 1)).base).toBeNull();
  });
```

En `local/servidor.test.ts`, dentro de `it('nueva, operación y lista', …)`, antes de la línea con `{ tipo: 'volar' }`:

```ts
    const t = await (await post('pizarra/operacion', {
      asignatura: 'fisica', id, n: 1,
      op: { tipo: 'trazos', quitar: [], poner: [{ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5] }] },
    })).json();
    expect(t.trazos).toHaveLength(1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/pizarras.test.ts local/servidor.test.ts`
Expected: FAIL (`base` no existe). La del servidor puede pasar ya (la operación existe desde la Tarea 5); está bien.

- [ ] **Step 3: Add `base` to `EstadoPizarra`** en `src/estudio/tipos.ts`:

```ts
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
```

- [ ] **Step 4: Change `local/pizarras.ts`**

Añade tras `rutaPizarra`:

```ts
export const rutaBase = (carpeta: string, n: number) => path.join(carpeta, `pizarra-${n}.subida.json`);

async function leerBase(carpeta: string, n: number): Promise<Pizarra | null> {
  try {
    return validarPizarra(JSON.parse(await readFile(rutaBase(carpeta, n), 'utf8'))).pizarra;
  } catch {
    return null;
  }
}
```

En `leerPizarra`, los dos `return` pasan a llevar `base: await leerBase(carpeta, n)`:

```ts
    return { n, pizarra, error: null, avisos, base: await leerBase(carpeta, n) };
  } catch (e) {
    const error = e instanceof SyntaxError ? `JSON mal escrito: ${e.message}` : e instanceof Error ? e.message : String(e);
    return { n, pizarra: ultimasBuenas.get(ruta) ?? null, error, avisos: [], base: await leerBase(carpeta, n) };
  }
```

En `operarPizarra`, después de `ultimasBuenas.set(ruta, nueva);`:

```ts
      // La copia base es lo que hay ahora en el historial: lo que se acaba de subir, o lo que se acaba de juntar.
      if (op.tipo === 'guardada' && op.subida) await escribirAtomico(rutaBase(carpeta, n), serializarPizarra(op.subida));
      if (op.tipo === 'fusionar') await escribirAtomico(rutaBase(carpeta, n), serializarPizarra(op.suya));
```

En `borrarPizarra`, después de `await rm(ruta, { force: true });`: `await rm(rutaBase(carpeta, n), { force: true });`.

- [ ] **Step 5: Allow bigger operations in `local/servidor.ts`**

Cambia la firma de `leerJson` a `export async function leerJson(req: IncomingMessage, limite = 1_000_000): Promise<Record<string, unknown>> {` y su primera línea a `const cuerpo = await leerCuerpo(req, limite);`. En `'POST pizarra/operacion'`, cambia `const b = await leerJson(req);` por:

```ts
      // Una fusión lleva dos pizarras enteras: se deja más sitio que en el resto de peticiones.
      const b = await leerJson(req, 8_000_000);
```

- [ ] **Step 6: Tell Claude to respect drawings** en `local/instrucciones-estudio.md`, justo debajo de la línea que empieza por `- Antes de cambiar una pizarra, léela:`:

```md
- La pizarra puede tener `capas`, `trazos` (dibujos a mano de Diego) y un campo `capa` en las piezas. Son de Diego: no los cambies ni los borres, y deja `version` como esté (1 o 2). Tus piezas nuevas no necesitan `capa` (van solas a tu capa, «Claude»).
```

- [ ] **Step 7: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
echo "Task 9: hecho — programa local: copia base (.subida.json), fusionar, 8 MB en operaciones e instrucciones de Claude" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/tipos.ts local/pizarras.ts local/pizarras.test.ts local/servidor.ts local/servidor.test.ts local/instrucciones-estudio.md
git commit -m "Dibujo a mano: el programa local guarda la copia base y junta con el historial

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Historial editable: subir operaciones, cola y caché

**Files:**
- Create: `src/estudio/colaHistorial.ts`, `src/estudio/colaHistorial.test.ts`, `src/estado/cacheEstudio.test.ts`
- Modify: `src/estudio/historialRemoto.ts`, `src/estado/cacheEstudio.ts`
- Test: `src/estudio/historialRemoto.test.ts`

**Interfaces:**
- Consumes: `aplicarOperacion`, `validarOperacion`, `validarPizarra` (Tarea 5).
- Produces: `operarEnHistorial(cfg, asignatura, archivo, ops, titulo): Promise<Pizarra>`; `type EstadoCola = 'al-dia' | 'guardando' | 'pendiente'`; `crearColaHistorial(opciones, iniciales)` → `{ poner(op), vaciar(): Promise<void>, pendientes(): Operacion[], parar() }`; en cacheEstudio: `leerPizarraCache` valida (formato antiguo → capas por defecto; roto → null), `guardarOpsPendientes(asig, archivo, ops)`, `leerOpsPendientes(asig, archivo): Operacion[]`.

- [ ] **Step 1: Write the failing tests**

En `src/estudio/historialRemoto.test.ts`, añade `operarEnHistorial` al import de `./historialRemoto` y al final:

```ts
describe('operarEnHistorial', () => {
  it('aplica las operaciones sobre la versión más nueva del historial y la devuelve', async () => {
    const remota = serializarPizarra(pizarraVacia('Newton'));
    let escrito = '';
    actualizar.mockImplementation(async (_c, _r, transformar) => (escrito = transformar(remota)));
    const p = await operarEnHistorial(cfg, 'fisica', 'a.json', [{ tipo: 'nota', id: null, nuevoId: 'd-1', x: 0, y: 0, contenido: 'Hola' }], 'Newton');
    expect(p.piezas.map((x) => x.id)).toEqual(['d-1']);
    expect(JSON.parse(escrito).piezas).toHaveLength(1);
    expect(actualizar).toHaveBeenCalledWith(cfg, 'estudios/fisica/pizarras/a.json', expect.any(Function), 'Pizarra: Newton (dibujo)');
  });
  it('si la pizarra ya no está en el historial, falla', async () => {
    actualizar.mockImplementation(async (_c, _r, transformar) => transformar(null));
    await expect(operarEnHistorial(cfg, 'fisica', 'a.json', [], 'x')).rejects.toThrow();
  });
});
```

(Si en ese archivo el mock de `actualizarArchivo` tiene otro nombre, usa el que tenga.)

`src/estudio/colaHistorial.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearColaHistorial, type EstadoCola } from './colaHistorial';
import { pizarraVacia, type Operacion, type Pizarra } from './pizarra';

const op = (n: number): Operacion => ({ tipo: 'mover', id: `p${n}`, x: n, y: 0 });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function montar(subir: (ops: Operacion[]) => Promise<Pizarra>, iniciales: Operacion[] = []) {
  const estados: EstadoCola[] = [];
  const guardadas: Operacion[][] = [];
  const subidas: Operacion[][] = [];
  const cola = crearColaHistorial(
    {
      subir: (ops) => {
        subidas.push(ops);
        return subir(ops);
      },
      alSubir: () => undefined,
      alCambiarEstado: (e) => estados.push(e),
      guardarPendientes: (ops) => guardadas.push(ops),
    },
    iniciales,
  );
  return { cola, estados, guardadas, subidas };
}

describe('cola del historial', () => {
  it('junta lo que se hace seguido y lo sube de una vez a los 3 segundos', async () => {
    const m = montar(async () => pizarraVacia('x'));
    m.cola.poner(op(1));
    await vi.advanceTimersByTimeAsync(2000);
    m.cola.poner(op(2));
    await vi.advanceTimersByTimeAsync(2999);
    expect(m.subidas).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(m.subidas).toEqual([[op(1), op(2)]]);
    expect(m.estados.at(-1)).toBe('al-dia');
    expect(m.guardadas.at(-1)).toEqual([]);
  });
  it('sin conexión queda pendiente, se guarda en el navegador y se reintenta', async () => {
    let falla = true;
    const m = montar(async () => {
      if (falla) throw new Error('sin red');
      return pizarraVacia('x');
    });
    m.cola.poner(op(1));
    await vi.advanceTimersByTimeAsync(3000);
    expect(m.estados.at(-1)).toBe('pendiente');
    expect(m.guardadas.at(-1)).toEqual([op(1)]);
    falla = false;
    await vi.advanceTimersByTimeAsync(15000);
    expect(m.subidas.at(-1)).toEqual([op(1)]);
    expect(m.estados.at(-1)).toBe('al-dia');
  });
  it('lo que quedó pendiente de otra vez se sube al empezar', async () => {
    const m = montar(async () => pizarraVacia('x'), [op(7)]);
    await vi.advanceTimersByTimeAsync(0);
    expect(m.subidas).toEqual([[op(7)]]);
  });
  it('vaciar sube ya, y lo que se hace mientras sube va en la siguiente', async () => {
    let soltar!: () => void;
    const m = montar(() => new Promise((r) => { soltar = () => r(pizarraVacia('x')); }));
    m.cola.poner(op(1));
    const v = m.cola.vaciar();
    m.cola.poner(op(2));
    expect(m.cola.pendientes()).toEqual([op(1), op(2)]);
    soltar();
    await v;
    await vi.advanceTimersByTimeAsync(3000);
    expect(m.subidas).toEqual([[op(1)], [op(2)]]);
  });
  it('parar no programa más reintentos', async () => {
    const m = montar(async () => {
      throw new Error('x');
    });
    m.cola.poner(op(1));
    m.cola.parar();
    await m.cola.vaciar();
    await vi.advanceTimersByTimeAsync(60000);
    expect(m.subidas).toHaveLength(1);
  });
});
```

`src/estado/cacheEstudio.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guardarOpsPendientes, leerOpsPendientes, leerPizarraCache } from './cacheEstudio';

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  });
});

describe('caché del historial', () => {
  it('una pizarra guardada con el formato antiguo se abre con sus capas', () => {
    localStorage.setItem('sc-historial-fisica-a.json', JSON.stringify({ version: 1, titulo: 'x', piezas: [], flechas: [], guardarComo: null, guardadaEn: null }));
    expect(leerPizarraCache('fisica', 'a.json')?.capas.map((c) => c.id)).toEqual(['claude', 'capa-1']);
  });
  it('algo roto en la caché cuenta como vacío', () => {
    localStorage.setItem('sc-historial-fisica-a.json', '{"version": 9}');
    expect(leerPizarraCache('fisica', 'a.json')).toBeNull();
  });
  it('operaciones pendientes: se guardan y las que no valen se descartan', () => {
    guardarOpsPendientes('fisica', 'a.json', [{ tipo: 'borrar', id: 'x' }]);
    expect(leerOpsPendientes('fisica', 'a.json')).toEqual([{ tipo: 'borrar', id: 'x' }]);
    localStorage.setItem('sc-pendientes-fisica-a.json', '[{"tipo":"volar"},{"tipo":"borrar","id":"y"}]');
    expect(leerOpsPendientes('fisica', 'a.json')).toEqual([{ tipo: 'borrar', id: 'y' }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/historialRemoto.test.ts src/estudio/colaHistorial.test.ts src/estado/cacheEstudio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `operarEnHistorial` to `src/estudio/historialRemoto.ts`**

Cambia el import de `./pizarra` a `import { aplicarOperacion, serializarPizarra, validarPizarra, type Operacion, type Pizarra } from './pizarra';` y añade al final:

```ts
// Aplica las operaciones de Diego sobre la versión más nueva del historial, en un solo guardado.
export async function operarEnHistorial(cfg: Config, asignatura: string, archivo: string, ops: Operacion[], titulo: string): Promise<Pizarra> {
  let resultado: Pizarra | null = null;
  await actualizarArchivo(cfg, `${carpetaHistorial(asignatura)}/${archivo}`, (texto) => {
    if (texto === null) throw new ErrorGitHub('no-existe', 'Esta pizarra ya no está en el historial');
    resultado = ops.reduce(aplicarOperacion, validarPizarra(JSON.parse(texto)).pizarra);
    return serializarPizarra(resultado);
  }, `Pizarra: ${titulo} (dibujo)`);
  if (!resultado) throw new ErrorGitHub('no-existe', 'Esta pizarra ya no está en el historial');
  return resultado;
}
```

- [ ] **Step 4: Write `src/estudio/colaHistorial.ts`**

```ts
import type { Operacion, Pizarra } from './pizarra';

export type EstadoCola = 'al-dia' | 'guardando' | 'pendiente';

export interface OpcionesCola {
  subir(ops: Operacion[]): Promise<Pizarra>; // las aplica sobre la versión más nueva y devuelve el resultado
  alSubir(p: Pizarra, quedan: Operacion[]): void; // `quedan`: lo que se hizo mientras se subía
  alCambiarEstado(e: EstadoCola): void;
  guardarPendientes(ops: Operacion[]): void; // en el navegador, por si se cierra la app sin conexión
  espera?: number; // ms sin tocar nada antes de subir
  reintento?: number; // ms antes de reintentar si falló
}

// Junta las operaciones del historial y las sube de una vez (un solo commit) cuando Diego deja de tocar.
export function crearColaHistorial(o: OpcionesCola, iniciales: Operacion[] = []) {
  const espera = o.espera ?? 3000;
  const reintento = o.reintento ?? 15000;
  let cola = [...iniciales];
  let enVuelo: Operacion[] = [];
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let subiendo: Promise<void> | null = null;
  let parado = false;

  const guardar = () => o.guardarPendientes([...enVuelo, ...cola]);
  const programar = (ms: number) => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = parado ? null : setTimeout(() => void vaciar(), ms);
  };

  async function vaciar(): Promise<void> {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    if (subiendo) {
      await subiendo;
      return cola.length ? vaciar() : undefined;
    }
    if (!cola.length) return;
    enVuelo = cola;
    cola = [];
    o.alCambiarEstado('guardando');
    subiendo = (async () => {
      try {
        const p = await o.subir(enVuelo);
        enVuelo = [];
        guardar();
        o.alSubir(p, [...cola]);
        o.alCambiarEstado(cola.length ? 'guardando' : 'al-dia');
        if (cola.length) programar(espera);
      } catch {
        cola = [...enVuelo, ...cola];
        enVuelo = [];
        guardar();
        o.alCambiarEstado('pendiente');
        programar(reintento);
      } finally {
        subiendo = null;
      }
    })();
    await subiendo;
  }

  if (cola.length) programar(0);

  return {
    poner(op: Operacion) {
      cola.push(op);
      guardar();
      o.alCambiarEstado('guardando');
      programar(espera);
    },
    vaciar,
    pendientes: () => [...enVuelo, ...cola],
    parar() {
      parado = true;
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
    },
  };
}
```

- [ ] **Step 5: Change `src/estado/cacheEstudio.ts`**

Cambia el import de `../estudio/pizarra` a `import { validarOperacion, validarPizarra, type Operacion, type Pizarra } from '../estudio/pizarra';` y sustituye la línea de `leerPizarraCache` por:

```ts
// Se valida al leer: una copia antigua se abre con el formato nuevo y una rota cuenta como vacía.
export function leerPizarraCache(asig: string, archivo: string): Pizarra | null {
  const v = leer<unknown>(clave([asig, archivo]));
  if (v === null) return null;
  try {
    return validarPizarra(v).pizarra;
  } catch {
    return null;
  }
}

// Lo dibujado en el historial que aún no se ha subido.
const clavePendientes = (asig: string, archivo: string) => `sc-pendientes-${asig}-${archivo}`;
export const guardarOpsPendientes = (asig: string, archivo: string, ops: Operacion[]) => guardar(clavePendientes(asig, archivo), ops);
export function leerOpsPendientes(asig: string, archivo: string): Operacion[] {
  const v = leer<unknown>(clavePendientes(asig, archivo));
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => {
    try {
      return [validarOperacion(o)];
    } catch {
      return [];
    }
  });
}
```

- [ ] **Step 6: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
echo "Task 10: hecho — operarEnHistorial, cola del historial (3 s, reintento, pendientes) y caché validada" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/historialRemoto.ts src/estudio/historialRemoto.test.ts src/estudio/colaHistorial.ts src/estudio/colaHistorial.test.ts src/estado/cacheEstudio.ts src/estado/cacheEstudio.test.ts
git commit -m "Dibujo a mano: el historial se puede editar (cola que sube de golpe y funciona sin conexión)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Dibujar los trazos (perfect-freehand y CapaTinta)

**Files:**
- Modify: `package.json` (dependencia)
- Create: `src/estudio/dibujoSvg.ts`, `src/estudio/dibujoSvg.test.ts`, `src/componentes/estudio/CapaTinta.tsx`, `src/componentes/estudio/CapaTinta.test.tsx`
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: `Trazo`, `pares`, `polilineas` (Tarea 1).
- Produces: `figuraDe(t): { d: string; relleno: boolean }`; componente `CapaTinta({ subrayados, trazos })` (un `<svg class="tinta">` o nada si no hay trazos).

- [ ] **Step 1: Install the dependency**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm install perfect-freehand@^1.2.2`
Expected: `perfect-freehand` en `dependencies` de `package.json`.

- [ ] **Step 2: Write the failing tests**

`src/estudio/dibujoSvg.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { figuraDe } from './dibujoSvg';
import { validarTrazo } from './tinta';

const t = (herramienta: string, puntos: number[], extra: Record<string, unknown> = {}) =>
  validarTrazo({ id: 'd', herramienta, color: '#000000', grosor: 4, puntos, ...extra }, 't');

describe('figuraDe', () => {
  it('el lápiz es un contorno relleno (grosor variable)', () => {
    const f = figuraDe(t('lapiz', [0, 0, 20, 5, 40, 0], { presion: [0.2, 0.8, 0.4] }));
    expect(f.relleno).toBe(true);
    expect(f.d).toMatch(/^M-?[\d.]+ -?[\d.]+ L/);
    expect(f.d.endsWith('Z')).toBe(true);
  });
  it('el subrayador y las formas son líneas', () => {
    expect(figuraDe(t('subrayador', [0, 0, 20, 5, 40, 0]))).toEqual({ relleno: false, d: 'M0 0 L20 5 L40 0' });
    expect(figuraDe(t('flecha', [0, 0, 40, 0])).d.match(/M/g)).toHaveLength(2);
  });
});
```

`src/componentes/estudio/CapaTinta.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { validarTrazo } from '../../estudio/tinta';
import { CapaTinta } from './CapaTinta';

const lapiz = validarTrazo({ id: 'l', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 30, 30] }, 't');
const sub = validarTrazo({ id: 's', herramienta: 'subrayador', color: '#e0b53a', grosor: 12, puntos: [0, 10, 60, 10] }, 't');

describe('CapaTinta', () => {
  it('dibuja primero el subrayador (semitransparente) y luego el lápiz', () => {
    const html = renderToString(<CapaTinta subrayados={[sub]} trazos={[lapiz]} />);
    expect(html).toContain('class="tinta"');
    expect(html.indexOf('stroke-opacity="0.35"')).toBeGreaterThan(-1);
    expect(html.indexOf('stroke-opacity="0.35"')).toBeLessThan(html.indexOf('fill="#b8603d"'));
  });
  it('una capa sin trazos no dibuja nada', () => {
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[]} />)).toBe('');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/dibujoSvg.test.ts src/componentes/estudio/CapaTinta.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Write `src/estudio/dibujoSvg.ts`**

```ts
import { getStroke } from 'perfect-freehand';
import type { Punto } from './geometria';
import { pares, polilineas, type Trazo } from './tinta';

const r = (v: number) => Math.round(v * 10) / 10;
const camino = (linea: Punto[]) => linea.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ');

// Cómo se dibuja un trazo en SVG: el lápiz es un contorno relleno (su grosor cambia con la presión); lo demás, líneas.
export function figuraDe(t: Trazo): { d: string; relleno: boolean } {
  if (t.herramienta !== 'lapiz') return { d: polilineas(t).map(camino).join(' '), relleno: false };
  const puntos = pares(t.puntos).map((p, i) => [p.x, p.y, t.presion?.[i] ?? 0.5]);
  const borde = getStroke(puntos, { size: t.grosor, thinning: t.presion ? 0.6 : 0, smoothing: 0.5, streamline: 0.4, simulatePressure: false, last: true });
  if (!borde.length) return { d: '', relleno: true };
  return { d: `M${borde.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L')} Z`, relleno: true };
}
```

- [ ] **Step 5: Write `src/componentes/estudio/CapaTinta.tsx`**

```tsx
import { memo } from 'react';
import { figuraDe } from '../../estudio/dibujoSvg';
import type { Trazo } from '../../estudio/tinta';

// memo: al dibujar solo cambia el trazo nuevo; los demás no se vuelven a calcular.
const TrazoSvg = memo(function TrazoSvg({ trazo }: { trazo: Trazo }) {
  const f = figuraDe(trazo);
  if (f.relleno) return <path d={f.d} fill={trazo.color} />;
  return (
    <path
      d={f.d}
      fill="none"
      stroke={trazo.color}
      strokeWidth={trazo.grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={trazo.herramienta === 'subrayador' ? 0.35 : undefined}
    />
  );
});

// Los trazos de una capa: primero el subrayador (queda por debajo) y encima el lápiz y las formas.
export function CapaTinta({ subrayados, trazos }: { subrayados: Trazo[]; trazos: Trazo[] }) {
  if (!subrayados.length && !trazos.length) return null;
  return (
    <svg className="tinta" width="1" height="1" overflow="visible" aria-hidden>
      {subrayados.length > 0 && (
        <g className="subrayados">
          {subrayados.map((t) => <TrazoSvg key={t.id} trazo={t} />)}
        </g>
      )}
      {trazos.map((t) => <TrazoSvg key={t.id} trazo={t} />)}
    </svg>
  );
}
```

- [ ] **Step 6: Add the styles** al final del bloque `/* Pizarra */` de `src/estilos.css`:

```css
.tinta { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.tinta .subrayados { mix-blend-mode: multiply; }
```

- [ ] **Step 7: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
echo "Task 11: hecho — perfect-freehand, dibujoSvg.ts y CapaTinta" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add package.json package-lock.json src/estudio/dibujoSvg.ts src/estudio/dibujoSvg.test.ts src/componentes/estudio/CapaTinta.tsx src/componentes/estudio/CapaTinta.test.tsx src/estilos.css
git commit -m "Dibujo a mano: dibujar los trazos en SVG (lápiz con presión)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Barra de herramientas y panel de capas

**Files:**
- Create: `src/componentes/estudio/BarraHerramientas.tsx`, `src/componentes/estudio/BarraHerramientas.test.tsx`, `src/componentes/estudio/PanelCapas.tsx`, `src/componentes/estudio/PanelCapas.test.tsx`
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: `EstadoHerramientas`, `COLORES`, `dibuja` (Tarea 7); `Capa`, `CAPA_CLAUDE` (Tarea 3).
- Produces: `BarraHerramientas(props)` con `estado, cambiar(e), enClaude, puedeDeshacer, puedeRehacer, deshacer(), rehacer(), haySeleccion, hayRecorte, copiar(), cortar(), pegar(), capasAbiertas, alternarCapas()`; `PanelCapas(props)` con `capas, activa: string | null, ocultas: ReadonlySet<string>, bloqueado, elegir(id), alternar(id), crear(), borrar(id), renombrar(id), duplicar(id), mover(id, delta: 1 | -1), cerrar()`.

- [ ] **Step 1: Write the failing tests**

`src/componentes/estudio/BarraHerramientas.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INICIALES } from '../../estudio/herramientas';
import { BarraHerramientas } from './BarraHerramientas';

const nada = () => undefined;
const base = {
  estado: INICIALES, cambiar: nada, enClaude: false, puedeDeshacer: false, puedeRehacer: true, deshacer: nada, rehacer: nada,
  haySeleccion: false, hayRecorte: false, copiar: nada, cortar: nada, pegar: nada, capasAbiertas: false, alternarCapas: nada,
};

describe('BarraHerramientas', () => {
  it('todas las herramientas, con la elegida encendida', () => {
    const html = renderToString(<BarraHerramientas {...base} />);
    for (const n of ['Mover', 'Lápiz', 'Subrayador', 'Formas', 'Lazo', 'Borrador', 'Texto']) expect(html).toContain(`aria-label="${n}"`);
    expect(html).toContain('aria-pressed="true" title="Mover"');
    expect(html).toMatch(/disabled="" title="Deshacer/);
    expect(html).not.toMatch(/disabled="" title="Rehacer/);
  });
  it('con el lápiz salen colores y grosores; con formas, las formas; con el borrador, sus dos modos', () => {
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'lapiz' }} />)).toContain('Grueso');
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'forma' }} />)).toContain('Elipse');
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'borrador' }} />)).toContain('Goma');
  });
  it('en la capa de Claude no se puede dibujar ni escribir', () => {
    const html = renderToString(<BarraHerramientas {...base} enClaude />);
    expect(html).toContain('aria-label="Lápiz" disabled=""');
    expect(html).toContain('aria-label="Texto" disabled=""');
    expect(html).not.toContain('aria-label="Lazo" disabled=""');
  });
});
```

`src/componentes/estudio/PanelCapas.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelCapas } from './PanelCapas';

const nada = () => undefined;
const props = {
  capas: [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'Capa 1' }, { id: 'capa-2', nombre: 'Ejercicio' }],
  activa: 'capa-2', ocultas: new Set(['capa-1']), bloqueado: false,
  elegir: nada, alternar: nada, crear: nada, borrar: nada, renombrar: nada, duplicar: nada, mover: nada, cerrar: nada,
};

describe('PanelCapas', () => {
  it('arriba la que se ve por encima, la activa marcada y la oculta con «Mostrar»', () => {
    const html = renderToString(<PanelCapas {...props} />);
    expect(html.indexOf('Ejercicio')).toBeLessThan(html.indexOf('Capa 1'));
    expect(html.indexOf('Capa 1')).toBeLessThan(html.indexOf('🤖'));
    expect(html).toContain('class="capa activa"');
    expect(html).toContain('aria-label="Mostrar Capa 1"');
  });
  it('la de Claude no se borra ni se renombra, pero se duplica', () => {
    const html = renderToString(<PanelCapas {...props} />);
    expect(html).toContain('aria-label="Borrar Ejercicio"');
    expect(html).not.toContain('aria-label="Borrar Claude"');
    expect(html).not.toContain('aria-label="Renombrar Claude"');
    expect(html).toContain('aria-label="Duplicar Claude"');
  });
  it('bloqueado (solo lectura): solo mostrar u ocultar', () => {
    const html = renderToString(<PanelCapas {...props} bloqueado />);
    expect(html).not.toContain('Duplicar');
    expect(html).toContain('Ocultar Ejercicio');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/BarraHerramientas.test.tsx src/componentes/estudio/PanelCapas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/componentes/estudio/BarraHerramientas.tsx`**

```tsx
import { COLORES, dibuja, type EstadoHerramientas, type Forma, type Grosor, type NombreHerramienta } from '../../estudio/herramientas';

interface Props {
  estado: EstadoHerramientas;
  cambiar(e: EstadoHerramientas): void;
  enClaude: boolean; // la capa activa es la de Claude: no se puede dibujar ni escribir
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  deshacer(): void;
  rehacer(): void;
  haySeleccion: boolean;
  hayRecorte: boolean;
  copiar(): void;
  cortar(): void;
  pegar(): void;
  capasAbiertas: boolean;
  alternarCapas(): void;
}

const HERRAMIENTAS: { id: NombreHerramienta; icono: string; nombre: string }[] = [
  { id: 'mover', icono: '✋', nombre: 'Mover' },
  { id: 'lapiz', icono: '✏️', nombre: 'Lápiz' },
  { id: 'subrayador', icono: '🖍', nombre: 'Subrayador' },
  { id: 'forma', icono: '⬜', nombre: 'Formas' },
  { id: 'lazo', icono: '➰', nombre: 'Lazo' },
  { id: 'borrador', icono: '🧽', nombre: 'Borrador' },
  { id: 'texto', icono: 'T', nombre: 'Texto' },
];
const FORMAS: { id: Forma; nombre: string }[] = [
  { id: 'linea', nombre: '╱ Línea' },
  { id: 'flecha', nombre: '→ Flecha' },
  { id: 'rectangulo', nombre: '▭ Rectángulo' },
  { id: 'elipse', nombre: '◯ Elipse' },
];
const GROSORES: { id: Grosor; nombre: string }[] = [
  { id: 'fino', nombre: 'Fino' },
  { id: 'medio', nombre: 'Medio' },
  { id: 'grueso', nombre: 'Grueso' },
];

export function BarraHerramientas(p: Props) {
  const { estado: e, cambiar } = p;
  const pinta = e.herramienta === 'lapiz' || e.herramienta === 'subrayador' || e.herramienta === 'forma';
  const colores = [...COLORES, ...(e.propio && !(COLORES as readonly string[]).includes(e.propio) ? [e.propio] : [])];
  const pastilla = (activa: boolean) => `pastilla${activa ? ' encendida' : ''}`;
  return (
    <div className="barra-herramientas" role="toolbar" aria-label="Herramientas de la pizarra">
      <div className="grupo-herramientas">
        {HERRAMIENTAS.map((h) => (
          <button
            key={h.id}
            className={`herramienta${e.herramienta === h.id ? ' encendida' : ''}`}
            aria-pressed={e.herramienta === h.id}
            title={h.nombre}
            aria-label={h.nombre}
            disabled={p.enClaude && dibuja(h.id)}
            onClick={() => cambiar({ ...e, herramienta: h.id })}
          >
            {h.icono}
          </button>
        ))}
        <span className="hueco-barra" />
        <button onClick={p.deshacer} disabled={!p.puedeDeshacer} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶</button>
        <button onClick={p.rehacer} disabled={!p.puedeRehacer} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">↷</button>
        <button className={p.capasAbiertas ? 'encendida' : ''} aria-pressed={p.capasAbiertas} onClick={p.alternarCapas}>📚 Capas</button>
      </div>
      <div className="opciones-herramienta">
        {e.herramienta === 'forma' &&
          FORMAS.map((f) => (
            <button key={f.id} className={pastilla(e.forma === f.id)} aria-pressed={e.forma === f.id} onClick={() => cambiar({ ...e, forma: f.id })}>
              {f.nombre}
            </button>
          ))}
        {e.herramienta === 'borrador' && (
          <>
            <button className={pastilla(e.borrador === 'trazos')} aria-pressed={e.borrador === 'trazos'} onClick={() => cambiar({ ...e, borrador: 'trazos' })}>
              Borra trazos enteros
            </button>
            <button className={pastilla(e.borrador === 'goma')} aria-pressed={e.borrador === 'goma'} onClick={() => cambiar({ ...e, borrador: 'goma' })}>
              Goma
            </button>
          </>
        )}
        {pinta && (
          <>
            {colores.map((c) => (
              <button
                key={c}
                className={`color${e.color === c ? ' encendida' : ''}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
                aria-pressed={e.color === c}
                onClick={() => cambiar({ ...e, color: c })}
              />
            ))}
            <label className="color color-propio" title="Otro color">
              +
              <input type="color" value={e.propio ?? e.color} aria-label="Elegir otro color" onChange={(ev) => cambiar({ ...e, color: ev.target.value, propio: ev.target.value })} />
            </label>
            {GROSORES.map((g) => (
              <button key={g.id} className={pastilla(e.grosor === g.id)} aria-pressed={e.grosor === g.id} onClick={() => cambiar({ ...e, grosor: g.id })}>
                {g.nombre}
              </button>
            ))}
          </>
        )}
        {(e.herramienta === 'lazo' || e.herramienta === 'mover') && (
          <>
            <button disabled={!p.haySeleccion} onClick={p.copiar}>Copiar</button>
            <button disabled={!p.haySeleccion} onClick={p.cortar}>Cortar</button>
            <button disabled={!p.hayRecorte} onClick={p.pegar}>Pegar</button>
          </>
        )}
        {p.enClaude && <span className="detalle">La capa de Claude es suya: elige una tuya en 📚 Capas para dibujar.</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/componentes/estudio/PanelCapas.tsx`**

```tsx
import { CAPA_CLAUDE, type Capa } from '../../estudio/capas';

interface Props {
  capas: Capa[];
  activa: string | null;
  ocultas: ReadonlySet<string>;
  bloqueado: boolean; // solo lectura: solo mostrar u ocultar
  elegir(id: string): void;
  alternar(id: string): void;
  crear(): void;
  borrar(id: string): void;
  renombrar(id: string): void;
  duplicar(id: string): void;
  mover(id: string, delta: 1 | -1): void;
  cerrar(): void;
}

export function PanelCapas(p: Props) {
  const lista = [...p.capas].reverse(); // como en Procreate: arriba, la que se ve por encima
  return (
    <aside className="panel-capas" aria-label="Capas">
      <div className="cabecera-capas">
        <strong>Capas</strong>
        <button onClick={p.crear} disabled={p.bloqueado}>+ Capa</button>
        <button className="enlace" onClick={p.cerrar} aria-label="Cerrar capas">×</button>
      </div>
      <ul className="lista-capas">
        {lista.map((c, i) => {
          const deClaude = c.id === CAPA_CLAUDE;
          const oculta = p.ocultas.has(c.id);
          return (
            <li key={c.id} className={`capa${p.activa === c.id ? ' activa' : ''}${oculta ? ' oculta' : ''}`}>
              <button className="ojo" onClick={() => p.alternar(c.id)} aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${c.nombre}`}>
                {oculta ? '◌' : '👁'}
              </button>
              <button
                className="nombre-capa"
                disabled={oculta}
                onClick={() => p.elegir(c.id)}
                onDoubleClick={() => !deClaude && !p.bloqueado && p.renombrar(c.id)}
                title={deClaude ? 'Todo lo de Claude' : 'Doble clic para renombrar'}
              >
                {deClaude ? '🤖 ' : ''}
                {c.nombre}
              </button>
              {!p.bloqueado && (
                <span className="acciones-capa">
                  <button onClick={() => p.mover(c.id, 1)} disabled={i === 0} aria-label={`Subir ${c.nombre}`}>↑</button>
                  <button onClick={() => p.mover(c.id, -1)} disabled={i === lista.length - 1} aria-label={`Bajar ${c.nombre}`}>↓</button>
                  <button onClick={() => p.duplicar(c.id)} aria-label={`Duplicar ${c.nombre}`}>⧉</button>
                  {!deClaude && <button onClick={() => p.renombrar(c.id)} aria-label={`Renombrar ${c.nombre}`}>✎</button>}
                  {!deClaude && <button className="peligro" onClick={() => p.borrar(c.id)} aria-label={`Borrar ${c.nombre}`}>🗑</button>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 5: Add the styles** al final de `src/estilos.css`:

```css
/* Pizarra: herramientas y capas (v1.4) */
.barra-herramientas { display: flex; flex-direction: column; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--borde); background: var(--superficie); }
.grupo-herramientas, .opciones-herramienta { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.opciones-herramienta:empty { display: none; }
.barra-herramientas button { padding: 4px 10px; font-size: 14px; }
.barra-herramientas .herramienta { min-width: 38px; font-size: 16px; }
.barra-herramientas .encendida { border-color: var(--acento); background: var(--acento-suave); }
.hueco-barra { flex: 1; }
.barra-herramientas .color { width: 24px; height: 24px; min-width: 0; padding: 0; border-radius: 50%; border: 2px solid var(--borde); }
.barra-herramientas .color.encendida { outline: 2px solid var(--acento); outline-offset: 1px; }
.color-propio { display: inline-grid; place-items: center; font-size: 14px; color: var(--suave); cursor: pointer; position: relative; overflow: hidden; background: var(--superficie); }
.color-propio input { position: absolute; inset: 0; opacity: 0; cursor: pointer; padding: 0; }
.panel-capas { position: absolute; right: 10px; top: 10px; z-index: 4; width: 270px; max-height: calc(100% - 20px); overflow-y: auto; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; box-shadow: 0 8px 24px rgb(59 48 39 / 0.18); padding: 8px; }
.cabecera-capas { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.cabecera-capas strong { flex: 1; }
.lista-capas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.capa { display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 8px; }
.capa.activa { background: var(--acento-suave); }
.capa.oculta .nombre-capa { opacity: 0.5; }
.capa button { padding: 2px 6px; font-size: 13px; border: none; background: none; }
.capa .nombre-capa { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.acciones-capa { display: flex; }
@media (max-width: 899px) {
  .panel-capas { left: 10px; right: 10px; top: auto; bottom: 10px; width: auto; max-height: 55%; }
}
```

- [ ] **Step 6: Run the tests**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
echo "Task 12: hecho — BarraHerramientas y PanelCapas" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/componentes/estudio/BarraHerramientas.tsx src/componentes/estudio/BarraHerramientas.test.tsx src/componentes/estudio/PanelCapas.tsx src/componentes/estudio/PanelCapas.test.tsx src/estilos.css
git commit -m "Dibujo a mano: barra de herramientas y panel de capas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: La pizarra con herramientas, capas y portapapeles

**Files:**
- Create: `src/componentes/estudio/usePizarraEditable.ts`, `src/componentes/estudio/Pizarra.test.tsx`
- Modify (reescribir entero): `src/componentes/estudio/Pizarra.tsx`
- Modify: `src/componentes/estudio/EstudioLocal.tsx` y `src/componentes/estudio/Historial.tsx` (solo las props nuevas `clave` y `origen`, para que compile; el resto va en las Tareas 14 y 15)
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `usePizarraEditable(pizarra, clave, alOperar?)` → `{ mostrada, hacer(op), deshacer(), rehacer(), puedeDeshacer, puedeRehacer, herramientas, setHerramientas, ocultas, alternarOculta(id), activa: string | null, elegir(id) }`. `Pizarra` con props `pizarra, imagen, alOperar?(op): Promise<unknown>, clave: string, origen: string, children?`.

- [ ] **Step 1: Write the failing test**

`src/componentes/estudio/Pizarra.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { validarPizarra } from '../../estudio/pizarra';
import { Pizarra } from './Pizarra';

vi.mock('../../estado/dialogos', () => ({ confirmar: vi.fn(), pedirTexto: vi.fn() }));

const p = validarPizarra({
  version: 2, titulo: 'x',
  piezas: [{ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 240, contenido: 'Mi nota' }],
  flechas: [],
  trazos: [{ id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 50, 50] }],
}).pizarra;

describe('Pizarra', () => {
  it('de solo lectura: se ven las piezas y los trazos, sin herramientas pero con capas', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" />);
    expect(html).toContain('Mi nota');
    expect(html).toContain('class="tinta"');
    expect(html).not.toContain('Herramientas de la pizarra');
    expect(html).toContain('📚 Capas');
  });
  it('editable: con la barra de herramientas', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" alOperar={async () => undefined} />);
    expect(html).toContain('Herramientas de la pizarra');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/Pizarra.test.tsx`
Expected: FAIL (no hay trazos ni barra).

- [ ] **Step 3: Write `src/componentes/estudio/usePizarraEditable.ts`**

```ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { activaInicial, activaVisible } from '../../estudio/capas';
import { deshacer as sacarDeshacer, pilaVacia, registrar, rehacer as sacarRehacer, type Pila } from '../../estudio/deshacer';
import { CLAVE_HERRAMIENTAS, claveOcultas, leerHerramientas, leerOcultas, type EstadoHerramientas } from '../../estudio/herramientas';
import { aplicarOperacion, type Operacion, type Pizarra } from '../../estudio/pizarra';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';

// Estado de una pizarra que Diego edita: lo que se ve (con lo que aún se está guardando), deshacer, herramientas y capas.
export function usePizarraEditable(pizarra: Pizarra, clave: string, alOperar?: (op: Operacion) => Promise<unknown>) {
  const [pendientes, setPendientes] = useState<{ n: number; op: Operacion }[]>([]);
  const contador = useRef(0);
  // Lo que se ve: la pizarra más las operaciones que aún no han vuelto (se ven al momento).
  const mostrada = useMemo(() => pendientes.reduce((p, x) => aplicarOperacion(p, x.op), pizarra), [pizarra, pendientes]);
  const actual = useRef(mostrada);
  actual.current = mostrada;
  const [pila, setPila] = useState<Pila>(pilaVacia);
  const pilaActual = useRef(pila);
  const [herramientas, setHerramientasEstado] = useState(() => leerHerramientas(leerPreferencia(CLAVE_HERRAMIENTAS)));
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(() => new Set(leerOcultas(leerPreferencia(claveOcultas(clave)))));
  const [elegida, setElegida] = useState(() => activaInicial(pizarra.capas));
  const activa = activaVisible(mostrada.capas, ocultas, elegida);

  const enviar = useCallback(
    (op: Operacion) => {
      if (!alOperar) return;
      const n = ++contador.current;
      setPendientes((ps) => [...ps, { n, op }]);
      void alOperar(op).finally(() => setPendientes((ps) => ps.filter((x) => x.n !== n)));
    },
    [alOperar],
  );

  const cambiarPila = (nueva: Pila) => {
    pilaActual.current = nueva;
    setPila(nueva);
  };

  // Una operación de Diego: se ve al momento, se guarda y se puede deshacer.
  const hacer = useCallback(
    (op: Operacion) => {
      cambiarPila(registrar(pilaActual.current, actual.current, op));
      actual.current = aplicarOperacion(actual.current, op);
      enviar(op);
    },
    [enviar],
  );

  const deshacer = useCallback(() => {
    const r = sacarDeshacer(pilaActual.current);
    if (!r) return;
    cambiarPila(r.pila);
    actual.current = aplicarOperacion(actual.current, r.op);
    enviar(r.op);
  }, [enviar]);

  const rehacer = useCallback(() => {
    const r = sacarRehacer(pilaActual.current, actual.current);
    if (!r) return;
    cambiarPila(r.pila);
    actual.current = aplicarOperacion(actual.current, r.op);
    enviar(r.op);
  }, [enviar]);

  const setHerramientas = useCallback((h: EstadoHerramientas) => {
    setHerramientasEstado(h);
    guardarPreferencia(CLAVE_HERRAMIENTAS, JSON.stringify(h));
  }, []);

  // Mostrar u ocultar lo recuerda este dispositivo (no se guarda en GitHub).
  const alternarOculta = useCallback(
    (id: string) =>
      setOcultas((o) => {
        const n = new Set(o);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        guardarPreferencia(claveOcultas(clave), JSON.stringify([...n]));
        return n;
      }),
    [clave],
  );

  return {
    mostrada, hacer, deshacer, rehacer,
    puedeDeshacer: pila.hechas.length > 0, puedeRehacer: pila.deshechas.length > 0,
    herramientas, setHerramientas, ocultas, alternarOculta, activa, elegir: setElegida,
  };
}
```

- [ ] **Step 4: Rewrite `src/componentes/estudio/Pizarra.tsx`**

```tsx
import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { confirmar, pedirTexto } from '../../estado/dialogos';
import { CAPA_CLAUDE, opCrearCapa, opDuplicarCapa, opMoverCapa, porCapas } from '../../estudio/capas';
import { aMundo, centro, encuadrar, puntoEnBorde, zoomEn, type Punto, type Rect, type Vista } from '../../estudio/geometria';
import {
  borrarSeleccion, cajaDeSeleccion, haySeleccion, limpiarSeleccion, moverSeleccion, pasarGoma, resultadoGoma, seleccionarConLazo, SIN_SELECCION,
  toqueMultiple, trazoDeGesto, trazosTocados, type Seleccion,
} from '../../estudio/gestos';
import { aplicarOperacion, type Operacion, type Pieza, type Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { copiar, guardarRecorte, leerRecorte, pegar } from '../../estudio/portapapeles';
import { cajaDeTrazo, nuevoId, type Trazo } from '../../estudio/tinta';
import { BarraHerramientas } from './BarraHerramientas';
import { CapaTinta } from './CapaTinta';
import { PanelCapas } from './PanelCapas';
import { PiezaPizarra } from './PiezaPizarra';
import { usePizarraEditable } from './usePizarraEditable';

interface Props {
  pizarra: TipoPizarra;
  imagen(ruta: string): Promise<string>;
  alOperar?(op: Operacion): Promise<unknown>; // sin esto, la pizarra es de solo lectura
  clave: string; // esta pizarra en este dispositivo (capas ocultas, de dónde viene lo copiado)
  origen: string; // dónde viven sus imágenes: solo se pegan imágenes copiadas del mismo origen
  children?: ReactNode; // botones extra en la barra de abajo
}

const RADIO_BORRADOR = 10; // en píxeles de pantalla

type Gesto =
  | { tipo: 'fondo'; desde: Punto; vista: Vista }
  | { tipo: 'pieza'; id: string; desde: Punto; origen: Punto; movido: boolean }
  | { tipo: 'trazo'; id: string; puntos: Punto[]; presiones: number[] | null }
  | { tipo: 'borrar-trazos'; ids: Set<string> }
  | { tipo: 'goma'; ultimo: Punto; trabajo: Trazo[] }
  | { tipo: 'lazo'; poligono: Punto[] }
  | { tipo: 'mover-seleccion'; desde: Punto; dx: number; dy: number };

interface Edicion { id: string | null; nuevoId: string; x: number; y: number; texto: string }

export function Pizarra({ pizarra, imagen, alOperar, clave, origen, children }: Props) {
  const editable = !!alOperar;
  const ed = usePizarraEditable(pizarra, clave, alOperar);
  const { mostrada, herramientas: h, activa } = ed;
  const marco = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>({ x: 40, y: 40, escala: 1 });
  const [tamanos, setTamanos] = useState<Record<string, { w: number; h: number }>>({});
  const [posiciones, setPosiciones] = useState<Record<string, Punto>>({});
  const [seleccion, setSeleccion] = useState<Seleccion>(SIN_SELECCION);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [provisional, setProvisional] = useState<Operacion | null>(null);
  const [lazo, setLazo] = useState<Punto[] | null>(null);
  const [capasAbiertas, setCapasAbiertas] = useState(false);
  const [hayRecorte, setHayRecorte] = useState(() => leerRecorte() !== null);
  const [aviso, setAviso] = useState<string | null>(null);
  const gesto = useRef<Gesto | null>(null);
  const punteros = useRef(new Map<number, Punto>());
  const pinza = useRef<{ d: number; medio: Punto } | null>(null);
  const toque = useRef<{ inicio: number; dedos: number; movido: number; origen: Map<number, Punto> } | null>(null);
  const lapizVisto = useRef(false);
  const espacio = useRef(false);
  const encuadrada = useRef(false);

  // Cuando llega una versión nueva de la pizarra, las posiciones provisionales ya no hacen falta.
  useEffect(() => setPosiciones({}), [pizarra]);
  // Lo seleccionado que ya no existe (lo borró Claude, o se deshizo) deja de estar seleccionado.
  useEffect(() => setSeleccion((s) => limpiarSeleccion(mostrada, s)), [mostrada]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Lo que se ve mientras se dibuja, se borra o se mueve algo (aún sin guardar).
  const vistaPizarra = provisional ? aplicarOperacion(mostrada, provisional) : mostrada;
  const puedeDibujar = editable && activa !== null && activa !== CAPA_CLAUDE;

  const medir = useCallback((id: string, w: number, alto: number) => {
    setTamanos((t) => (t[id]?.w === w && t[id]?.h === alto ? t : { ...t, [id]: { w, h: alto } }));
  }, []);

  const rectDe = (p: Pieza): Rect => {
    const pos = posiciones[p.id] ?? p;
    const t = tamanos[p.id] ?? { w: p.ancho, h: 60 };
    return { x: pos.x, y: pos.y, w: t.w, h: t.h };
  };

  const verTodo = () => {
    const m = marco.current;
    if (m) setVista(encuadrar([...vistaPizarra.piezas.map(rectDe), ...vistaPizarra.trazos.map(cajaDeTrazo)], m.clientWidth, m.clientHeight));
  };

  // La primera vez, se encuadra cuando ya se han medido todas las piezas.
  useEffect(() => {
    const { piezas, trazos } = pizarra;
    if (!encuadrada.current && (piezas.length || trazos.length) && piezas.every((p) => tamanos[p.id])) {
      encuadrada.current = true;
      verTodo();
    }
  });

  useEffect(() => {
    const m = marco.current;
    if (!m) return;
    const alRueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = m.getBoundingClientRect();
      setVista((v) => zoomEn(v, Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top }));
    };
    m.addEventListener('wheel', alRueda, { passive: false });
    return () => m.removeEventListener('wheel', alRueda);
  }, []);

  const local = (e: { clientX: number; clientY: number }): Punto => {
    const r = marco.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoomCentro = (factor: number) => {
    const m = marco.current;
    if (m) setVista((v) => zoomEn(v, factor, { x: m.clientWidth / 2, y: m.clientHeight / 2 }));
  };

  const idNuevo = () => nuevoId('d', new Set([...mostrada.piezas.map((x) => x.id), ...mostrada.trazos.map((t) => t.id)]));
  const radio = () => RADIO_BORRADOR / vista.escala;
  const avisarCapa = () =>
    setAviso(activa === CAPA_CLAUDE ? 'La capa de Claude es suya: elige una capa tuya en 📚 Capas para dibujar o escribir.' : 'Todas las capas están ocultas: enseña alguna en 📚 Capas.');

  function actualizarTrazo(mayus: boolean) {
    const g = gesto.current;
    if (g?.tipo !== 'trazo' || !activa) return;
    const t = trazoDeGesto(h, g.id, activa, g.puntos, g.presiones, mayus, 0);
    setProvisional(t ? { tipo: 'trazos', quitar: [], poner: [t] } : null);
  }

  function pasarLaGoma(m: Punto) {
    const g = gesto.current;
    if (g?.tipo !== 'goma' || !activa) return;
    const usados = new Set([...g.trabajo.map((t) => t.id), ...mostrada.trazos.map((t) => t.id)]);
    const r = pasarGoma(g.trabajo, activa, [g.ultimo, m], radio(), () => {
      const id = nuevoId('d', usados);
      usados.add(id);
      return id;
    });
    if (r.quitar.length) {
      const fuera = new Set(r.quitar);
      g.trabajo = [...g.trabajo.filter((t) => !fuera.has(t.id)), ...r.poner];
    }
    g.ultimo = m;
    const res = resultadoGoma(mostrada.trazos, g.trabajo);
    setProvisional(res.quitar.length ? { tipo: 'trazos', ...res } : null);
  }

  function alPulsar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('textarea, a') || e.button === 2) return;
    if (e.pointerType === 'pen') lapizVisto.current = true;
    marco.current?.focus({ preventScroll: true });
    marco.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    punteros.current.set(e.pointerId, p);
    if (e.pointerType === 'touch') {
      if (punteros.current.size === 1) toque.current = { inicio: e.timeStamp, dedos: 1, movido: 0, origen: new Map() };
      if (toque.current) {
        toque.current.dedos = Math.max(toque.current.dedos, punteros.current.size);
        toque.current.origen.set(e.pointerId, p);
      }
    }
    if (punteros.current.size >= 2) {
      // Dos dedos: zoom y mover. Lo que se estuviera dibujando se descarta.
      const [a, b] = [...punteros.current.values()];
      pinza.current = { d: Math.hypot(a.x - b.x, a.y - b.y), medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      gesto.current = null;
      setProvisional(null);
      setLazo(null);
      return;
    }
    const m = aMundo(vista, p);
    // La rueda del ratón, la barra espaciadora o el dedo cuando hay lápiz: mover la pizarra.
    if (!editable || e.button === 1 || espacio.current || (e.pointerType === 'touch' && lapizVisto.current)) {
      gesto.current = { tipo: 'fondo', desde: p, vista };
      return;
    }
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    switch (h.herramienta) {
      case 'mover': {
        const pieza = el ? vistaPizarra.piezas.find((x) => x.id === el.dataset.pieza) : undefined;
        if (pieza) {
          setSeleccion({ trazos: [], piezas: [pieza.id] });
          gesto.current = { tipo: 'pieza', id: pieza.id, desde: p, origen: { x: pieza.x, y: pieza.y }, movido: false };
        } else {
          setSeleccion(SIN_SELECCION);
          gesto.current = { tipo: 'fondo', desde: p, vista };
        }
        return;
      }
      case 'texto': {
        if (!puedeDibujar) return avisarCapa();
        e.preventDefault();
        const nota = el ? vistaPizarra.piezas.find((x) => x.id === el.dataset.pieza) : undefined;
        if (nota?.tipo === 'nota') setEditando({ id: nota.id, nuevoId: nota.id, x: nota.x, y: nota.y, texto: nota.contenido });
        else setEditando({ id: null, nuevoId: idNuevo(), x: m.x, y: m.y, texto: '' });
        return;
      }
      case 'lazo': {
        if (activa === null) return avisarCapa();
        const caja = cajaDeSeleccion(mostrada, seleccion, rectDe);
        if (caja && m.x >= caja.x && m.x <= caja.x + caja.w && m.y >= caja.y && m.y <= caja.y + caja.h) {
          gesto.current = { tipo: 'mover-seleccion', desde: m, dx: 0, dy: 0 };
          return;
        }
        setSeleccion(SIN_SELECCION);
        gesto.current = { tipo: 'lazo', poligono: [m] };
        setLazo([m]);
        return;
      }
      case 'borrador': {
        if (activa === null) return avisarCapa();
        if (h.borrador === 'trazos') {
          const ids = new Set(trazosTocados(mostrada.trazos, activa, m, radio()));
          gesto.current = { tipo: 'borrar-trazos', ids };
          setProvisional({ tipo: 'trazos', quitar: [...ids], poner: [] });
        } else {
          gesto.current = { tipo: 'goma', ultimo: m, trabajo: mostrada.trazos };
          pasarLaGoma(m);
        }
        return;
      }
      default: {
        if (!puedeDibujar) return avisarCapa();
        gesto.current = { tipo: 'trazo', id: idNuevo(), puntos: [m], presiones: e.pointerType === 'pen' ? [e.pressure] : null };
        actualizarTrazo(e.shiftKey);
      }
    }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    const p = local(e);
    punteros.current.set(e.pointerId, p);
    const t = toque.current;
    const inicio = t?.origen.get(e.pointerId);
    if (t && inicio) t.movido = Math.max(t.movido, Math.hypot(p.x - inicio.x, p.y - inicio.y));
    if (pinza.current && punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const antes = pinza.current;
      setVista((v) => {
        const z = zoomEn(v, d / antes.d, medio);
        return { ...z, x: z.x + medio.x - antes.medio.x, y: z.y + medio.y - antes.medio.y };
      });
      pinza.current = { d, medio };
      return;
    }
    const g = gesto.current;
    if (!g) return;
    const m = aMundo(vista, p);
    switch (g.tipo) {
      case 'fondo':
        setVista({ ...g.vista, x: g.vista.x + p.x - g.desde.x, y: g.vista.y + p.y - g.desde.y });
        return;
      case 'pieza': {
        const dx = p.x - g.desde.x;
        const dy = p.y - g.desde.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) g.movido = true;
        if (g.movido) setPosiciones((ps) => ({ ...ps, [g.id]: { x: g.origen.x + dx / vista.escala, y: g.origen.y + dy / vista.escala } }));
        return;
      }
      case 'trazo': {
        // Con el lápiz llegan varios puntos por evento: se usan todos para que el trazo salga suave.
        const juntos = e.nativeEvent.getCoalescedEvents?.();
        for (const ev of juntos && juntos.length ? juntos : [e.nativeEvent]) {
          g.puntos.push(aMundo(vista, local(ev)));
          if (g.presiones) g.presiones.push(ev.pressure);
        }
        actualizarTrazo(e.shiftKey);
        return;
      }
      case 'borrar-trazos':
        if (!activa) return;
        for (const id of trazosTocados(mostrada.trazos, activa, m, radio())) g.ids.add(id);
        setProvisional({ tipo: 'trazos', quitar: [...g.ids], poner: [] });
        return;
      case 'goma':
        pasarLaGoma(m);
        return;
      case 'lazo':
        g.poligono.push(m);
        setLazo([...g.poligono]);
        return;
      case 'mover-seleccion':
        g.dx = m.x - g.desde.x;
        g.dy = m.y - g.desde.y;
        setProvisional(moverSeleccion(mostrada, seleccion, g.dx, g.dy));
        return;
    }
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    const t = toque.current;
    if (t && punteros.current.size === 0) {
      toque.current = null;
      const accion = toqueMultiple(t.dedos, e.timeStamp - t.inicio, t.movido);
      if (accion) {
        if (accion === 'deshacer') ed.deshacer();
        else ed.rehacer();
        gesto.current = null;
        setProvisional(null);
        return;
      }
    }
    const g = gesto.current;
    if (!g || punteros.current.size > 0) return;
    gesto.current = null;
    switch (g.tipo) {
      case 'pieza':
        if (g.movido) {
          const pos = posiciones[g.id];
          if (pos) ed.hacer({ tipo: 'mover', id: g.id, x: pos.x, y: pos.y });
        }
        return;
      case 'trazo': {
        setProvisional(null);
        const tr = activa ? trazoDeGesto(h, g.id, activa, g.puntos, g.presiones, e.shiftKey) : null;
        if (tr) ed.hacer({ tipo: 'trazos', quitar: [], poner: [tr] });
        return;
      }
      case 'borrar-trazos':
        setProvisional(null);
        if (g.ids.size) ed.hacer({ tipo: 'trazos', quitar: [...g.ids], poner: [] });
        return;
      case 'goma': {
        setProvisional(null);
        const r = resultadoGoma(mostrada.trazos, g.trabajo);
        if (r.quitar.length) ed.hacer({ tipo: 'trazos', ...r });
        return;
      }
      case 'lazo':
        setLazo(null);
        if (activa) setSeleccion(seleccionarConLazo(mostrada, activa, g.poligono, rectDe));
        return;
      case 'mover-seleccion':
        setProvisional(null);
        if (g.dx || g.dy) ed.hacer(moverSeleccion(mostrada, seleccion, g.dx, g.dy));
        return;
      default:
        return;
    }
  }

  function alCancelar(e: PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    toque.current = null;
    gesto.current = null;
    setProvisional(null);
    setLazo(null);
  }

  function alDobleClic(e: MouseEvent<HTMLDivElement>) {
    if (!editable || h.herramienta !== 'mover') return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    if (el) {
      const p = mostrada.piezas.find((x) => x.id === el.dataset.pieza);
      if (p?.tipo === 'nota') setEditando({ id: p.id, nuevoId: p.id, x: p.x, y: p.y, texto: p.contenido });
      return;
    }
    if (!puedeDibujar) return avisarCapa();
    const m = aMundo(vista, local(e));
    setEditando({ id: null, nuevoId: idNuevo(), x: m.x, y: m.y, texto: '' });
  }

  function terminarNota() {
    const nota = editando;
    setEditando(null);
    if (!nota) return;
    const texto = nota.texto.trim();
    if (!texto) {
      if (nota.id) ed.hacer({ tipo: 'borrar', id: nota.id });
      return;
    }
    const antes = mostrada.piezas.find((x) => x.id === nota.id);
    if (antes?.tipo === 'nota' && antes.contenido === texto) return;
    ed.hacer({ tipo: 'nota', id: nota.id, nuevoId: nota.nuevoId, x: nota.x, y: nota.y, contenido: texto, capa: puedeDibujar ? activa! : undefined });
  }

  function borrarSel() {
    if (!haySeleccion(seleccion)) return;
    ed.hacer(borrarSeleccion(seleccion));
    setSeleccion(SIN_SELECCION);
  }

  function copiarSel() {
    const r = copiar(mostrada, seleccion, origen, clave);
    if (!r) return;
    guardarRecorte(r);
    setHayRecorte(true);
  }

  function cortarSel() {
    copiarSel();
    borrarSel();
  }

  function pegarAqui() {
    const r = leerRecorte();
    if (!r) return;
    if (!puedeDibujar || !activa) return avisarCapa();
    const m = marco.current;
    // Si viene de otra pizarra, se pega en el centro de lo que se ve.
    const centroVista = m && r.clave !== clave ? aMundo(vista, { x: m.clientWidth / 2, y: m.clientHeight / 2 }) : null;
    const res = pegar(r, mostrada, activa, origen, centroVista);
    if ('error' in res) {
      setAviso(res.error);
      return;
    }
    ed.hacer(res.op);
    setSeleccion(res.seleccion);
  }

  function alTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (editando) return;
    if (e.key === ' ') {
      espacio.current = true;
      e.preventDefault();
      return;
    }
    if (!editable) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const atajos: Record<string, () => void> = {
      z: () => (e.shiftKey ? ed.rehacer() : ed.deshacer()),
      y: ed.rehacer,
      c: copiarSel,
      x: cortarSel,
      v: pegarAqui,
    };
    if (ctrl && atajos[k]) {
      e.preventDefault();
      atajos[k]();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && haySeleccion(seleccion)) {
      e.preventDefault();
      borrarSel();
    }
  }

  const crearCapa = () => {
    const r = opCrearCapa(mostrada, activa ?? CAPA_CLAUDE);
    ed.hacer(r.op);
    ed.elegir(r.id);
  };
  const duplicarCapa = (id: string) => {
    const r = opDuplicarCapa(mostrada, id);
    if (!r) return;
    ed.hacer(r.op);
    ed.elegir(r.id);
  };
  const moverCapa = (id: string, delta: 1 | -1) => {
    const op = opMoverCapa(mostrada, id, delta);
    if (op) ed.hacer(op);
  };
  async function borrarCapa(id: string) {
    const capa = mostrada.capas.find((c) => c.id === id);
    if (!capa || id === CAPA_CLAUDE) return;
    const cuantos = mostrada.piezas.filter((x) => x.capa === id).length + mostrada.trazos.filter((t) => t.capa === id).length;
    if (cuantos && !(await confirmar(`¿Borrar la capa «${capa.nombre}» con todo lo que tiene (${cuantos})? Puedes deshacerlo.`, { aceptar: 'Borrar', peligro: true })))
      return;
    ed.hacer({ tipo: 'capa', accion: 'borrar', id });
  }
  async function renombrarCapa(id: string) {
    const capa = mostrada.capas.find((c) => c.id === id);
    if (!capa || id === CAPA_CLAUDE) return;
    const nombre = await pedirTexto('Nombre de la capa', { inicial: capa.nombre });
    if (nombre && nombre !== capa.nombre) ed.hacer({ tipo: 'capa', accion: 'renombrar', id, nombre });
  }

  const grupos = porCapas(vistaPizarra.capas, vistaPizarra.piezas.filter((p) => p.id !== editando?.id), vistaPizarra.trazos, ed.ocultas);
  const visibles = new Set(grupos.flatMap((g) => g.piezas.map((x) => x.id)));
  const porId = new Map(vistaPizarra.piezas.map((p) => [p.id, p]));
  const cajaSel = h.herramienta === 'lazo' && haySeleccion(seleccion) ? cajaDeSeleccion(vistaPizarra, seleccion, rectDe) : null;
  const vacia = vistaPizarra.piezas.length === 0 && vistaPizarra.trazos.length === 0 && !editando;

  return (
    <div className="pizarra">
      {editable && (
        <BarraHerramientas
          estado={h}
          cambiar={ed.setHerramientas}
          enClaude={activa === CAPA_CLAUDE}
          puedeDeshacer={ed.puedeDeshacer}
          puedeRehacer={ed.puedeRehacer}
          deshacer={ed.deshacer}
          rehacer={ed.rehacer}
          haySeleccion={haySeleccion(seleccion)}
          hayRecorte={hayRecorte}
          copiar={copiarSel}
          cortar={cortarSel}
          pegar={pegarAqui}
          capasAbiertas={capasAbiertas}
          alternarCapas={() => setCapasAbiertas((a) => !a)}
        />
      )}
      <div className="zona-lienzo">
        <div
          ref={marco}
          className={`lienzo${editable && h.herramienta !== 'mover' ? ' dibujando' : ''}`}
          tabIndex={0}
          onPointerDown={alPulsar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          onDoubleClick={alDobleClic}
          onKeyDown={alTecla}
          onKeyUp={(e) => {
            if (e.key === ' ') espacio.current = false;
          }}
        >
          <div className="mundo" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}>
            <svg className="flechas" width="1" height="1" overflow="visible">
              <defs>
                <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#8b7b6a" />
                </marker>
              </defs>
              {vistaPizarra.flechas.map((f) => {
                const de = porId.get(f.de);
                const a = porId.get(f.a);
                if (!de || !a || !visibles.has(f.de) || !visibles.has(f.a)) return null;
                const rde = rectDe(de);
                const ra = rectDe(a);
                const p1 = puntoEnBorde(rde, centro(ra));
                const p2 = puntoEnBorde(ra, centro(rde));
                return (
                  <g key={f.id}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8b7b6a" strokeWidth={2} markerEnd="url(#punta-flecha)" />
                    {f.etiqueta && <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" className="etiqueta-flecha">{f.etiqueta}</text>}
                  </g>
                );
              })}
            </svg>
            {grupos.map((g) => (
              <Fragment key={g.capa.id}>
                {g.piezas.map((p) => {
                  const pos = posiciones[p.id] ?? p;
                  return <PiezaPizarra key={p.id} pieza={p} x={pos.x} y={pos.y} seleccionada={seleccion.piezas.includes(p.id)} imagen={imagen} alMedir={medir} />;
                })}
                <CapaTinta subrayados={g.subrayados} trazos={g.trazos} />
              </Fragment>
            ))}
            {(lazo || cajaSel) && (
              <svg className="tinta guias" width="1" height="1" overflow="visible" aria-hidden>
                {lazo && <polygon className="lazo" points={lazo.map((q) => `${q.x},${q.y}`).join(' ')} vectorEffect="non-scaling-stroke" />}
                {cajaSel && (
                  <rect className="caja-seleccion" x={cajaSel.x - 4} y={cajaSel.y - 4} width={cajaSel.w + 8} height={cajaSel.h + 8} vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            )}
            {editando && (
              <textarea
                className="editor-nota"
                autoFocus
                style={{ left: editando.x, top: editando.y }}
                value={editando.texto}
                placeholder="Escribe… (Ctrl+Enter para terminar)"
                onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                onBlur={terminarNota}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditando(null);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) terminarNota();
                }}
              />
            )}
          </div>
          {aviso && <p className="aviso-herramienta" role="status">{aviso}</p>}
          {vacia && (
            <p className="pizarra-vacia">
              {editable ? 'Pizarra en blanco. Pídele a Claude que te lo explique aquí, dibuja con ✏️ o escribe con T.' : 'Esta pizarra está vacía.'}
            </p>
          )}
        </div>
        {capasAbiertas && (
          <PanelCapas
            capas={mostrada.capas}
            activa={activa}
            ocultas={ed.ocultas}
            bloqueado={!editable}
            elegir={ed.elegir}
            alternar={ed.alternarOculta}
            crear={crearCapa}
            borrar={(id) => void borrarCapa(id)}
            renombrar={(id) => void renombrarCapa(id)}
            duplicar={duplicarCapa}
            mover={moverCapa}
            cerrar={() => setCapasAbiertas(false)}
          />
        )}
      </div>
      <div className="controles-pizarra">
        <button onClick={verTodo}>Ver todo</button>
        <button onClick={() => zoomCentro(1 / 1.2)} aria-label="Alejar">−</button>
        <button onClick={() => zoomCentro(1.2)} aria-label="Acercar">+</button>
        {!editable && <button className={capasAbiertas ? 'encendida' : ''} onClick={() => setCapasAbiertas((a) => !a)}>📚 Capas</button>}
        {editable && haySeleccion(seleccion) && <button className="peligro" onClick={borrarSel}>🗑 Borrar</button>}
        <span className="hueco" />
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Pass the new props so everything compiles**

En `src/componentes/estudio/EstudioLocal.tsx`, cambia la línea del `<Pizarra key=…>` por:

```tsx
              <Pizarra
                key={`${conv.id}-${actual.n}`}
                pizarra={actual.pizarra}
                imagen={imagen}
                alOperar={(op) => operar(actual.n, op)}
                clave={`local-${asignatura.id}-${conv.id}-${actual.n}`}
                origen={`local:${asignatura.id}:${conv.id}`}
              >
```

En `src/componentes/estudio/Historial.tsx`, cambia `<Pizarra pizarra={pizarra} imagen={imagen} />` por `<Pizarra pizarra={pizarra} imagen={imagen} clave={`historial-${asignatura.id}-${entrada.archivo}`} origen={`historial:${asignatura.id}`} />`.

- [ ] **Step 6: Add the styles** al final de `src/estilos.css`:

```css
.zona-lienzo { position: relative; flex: 1; min-height: 0; display: flex; }
.zona-lienzo > .lienzo { flex: 1; }
.lienzo.dibujando, .lienzo.dibujando:active { cursor: crosshair; }
.guias .lazo { fill: rgb(184 96 61 / 0.06); stroke: var(--acento); stroke-width: 1.5; stroke-dasharray: 6 4; }
.guias .caja-seleccion { fill: none; stroke: var(--acento); stroke-width: 1.5; stroke-dasharray: 4 4; }
.aviso-herramienta { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 3; margin: 0; padding: 6px 12px; border-radius: 8px; background: var(--aviso); font-size: 13px; pointer-events: none; max-width: calc(100% - 20px); }
```

- [ ] **Step 7: Run the tests and the build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 8: Try it by hand** (Claude, con la app en local)

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm run local` y abre http://127.0.0.1:5174/segundo-cerebro-app/ → Estudio → una conversación con pizarra. Comprueba con el ratón: lápiz (colores y grosores), subrayador por debajo del lápiz, formas (con Mayús), lazo (mover, copiar, pegar, borrar), borrador de trazos y goma, texto, deshacer/rehacer (botones y Ctrl+Z/Y), panel de capas (crear, ocultar, duplicar la de Claude, subir/bajar, borrar y deshacer), barra espaciadora para mover. Apunta en el registro lo que no vaya como `Ruling:` o arréglalo antes del commit.

- [ ] **Step 9: Commit**

```bash
echo "Task 13: hecho — Pizarra con herramientas, capas, deshacer, portapapeles y gestos (lápiz, dedos, toques de Procreate)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/componentes/estudio/usePizarraEditable.ts src/componentes/estudio/Pizarra.tsx src/componentes/estudio/Pizarra.test.tsx src/componentes/estudio/EstudioLocal.tsx src/componentes/estudio/Historial.tsx src/estilos.css
git commit -m "Dibujo a mano: la pizarra con herramientas, capas y copiar y pegar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Zona de estudio del PC: juntar con el historial al abrir y al guardar

**Files:**
- Modify: `src/estudio/historial.ts`, `src/componentes/estudio/EstudioLocal.tsx`
- Test: `src/estudio/historial.test.ts`

**Interfaces:**
- Consumes: `EstadoPizarra.base` (Tarea 9), `leerDeHistorial`, operación `fusionar` y `guardada` con `subida` (Tarea 5), `paraHistorial`.
- Produces: `cambioEnHistorial(base, suya): boolean`, `archivoDeRuta(ruta): string`; en `EstudioLocal`, `operar` devuelve `Promise<Pizarra | null>` y existe `traerDelHistorial(n)`.

- [ ] **Step 1: Write the failing test** (al final de `src/estudio/historial.test.ts`; añade `archivoDeRuta, cambioEnHistorial` al import de `./historial` y `aplicarOperacion` al de `./pizarra` si no está)

```ts
describe('juntar con el historial', () => {
  it('solo hay que juntar si el historial cambió desde la copia base (o si no hay base)', () => {
    const base = pizarraVacia('Newton');
    expect(cambioEnHistorial(base, pizarraVacia('Newton'))).toBe(false);
    expect(cambioEnHistorial(base, aplicarOperacion(base, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'iPad' }))).toBe(true);
    expect(cambioEnHistorial(null, base)).toBe(true);
  });
  it('archivo de una ruta del historial', () => {
    expect(archivoDeRuta('estudios/fisica/pizarras/2026-09-26-newton.json')).toBe('2026-09-26-newton.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/historial.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add to `src/estudio/historial.ts`**

Cambia el import de `./pizarra` a `import { serializarPizarra, type Pizarra } from './pizarra';` y añade al final:

```ts
// ¿La copia del historial ha cambiado desde que el PC la subió? Sin copia base, se junta por si acaso.
export const cambioEnHistorial = (base: Pizarra | null, suya: Pizarra) => !base || serializarPizarra(base) !== serializarPizarra(suya);

export const archivoDeRuta = (ruta: string) => ruta.slice(ruta.lastIndexOf('/') + 1);
```

- [ ] **Step 4: Change `src/componentes/estudio/EstudioLocal.tsx`**

1. Imports: `import { archivoDeRuta, cambioEnHistorial, paraHistorial, type EntradaHistorial } from '../../estudio/historial';` (sustituye el import de tipo que había), `import { leerDeHistorial, subirAlHistorial } from '../../estudio/historialRemoto';` y `import type { Operacion, Pizarra as TipoPizarra } from '../../estudio/pizarra';`.

2. Justo después de `const [pizarras, setPizarras] = useState<EstadoPizarra[]>([]);`:

```tsx
  const pizarrasActuales = useRef(pizarras);
  pizarrasActuales.current = pizarras;
  // Pizarras ya juntadas con el historial en esta sesión (al abrirlas).
  const traidas = useRef(new Set<string>());
```

3. Sustituye la función `operar` entera por:

```tsx
  // Devuelve la pizarra ya cambiada, o null si no se pudo (para que el guardado sepa si quedó marcado).
  async function operar(n: number, op: Operacion): Promise<TipoPizarra | null> {
    if (!conv) return null;
    try {
      const p = await operarPizarra(asignatura.id, conv.id, n, op);
      setPizarras((ps) => ps.map((e) => (e.n === n ? { ...e, pizarra: p, error: null } : e)));
      // Guardar y juntar cambian también la copia base: se vuelve a leer.
      if (op.tipo === 'guardada' || op.tipo === 'fusionar') await recargarPizarras(conv.id);
      return p;
    } catch (e) {
      setAvisoPizarra(e instanceof Error ? e.message : String(e));
      await recargarPizarras(conv.id);
      return null;
    }
  }

  // Si la pizarra ya está en el historial y allí la cambiaron (iPad, móvil), se junta con la del PC.
  async function traerDelHistorial(n: number): Promise<TipoPizarra | null> {
    const estado = pizarrasActuales.current.find((e) => e.n === n);
    const p = estado?.pizarra ?? null;
    if (!config || !estado || !p?.guardadaEn) return p;
    let suya: TipoPizarra;
    try {
      suya = await leerDeHistorial(config, asignatura.id, archivoDeRuta(p.guardadaEn));
    } catch {
      return p; // sin conexión o ya no está: se sigue con la del PC
    }
    if (!cambioEnHistorial(estado.base, suya)) return p;
    return (await operar(n, { tipo: 'fusionar', base: estado.base, suya })) ?? p;
  }
```

4. En `guardarEnHistorial`, sustituye la llamada a `guardarYMarcar` por:

```tsx
    const fresca = (await traerDelHistorial(n)) ?? estado.pizarra;
    const r = await guardarYMarcar(fresca, rutasSubidas.current.get(n) ?? null, {
      subir: (p) => subirAlHistorial(config, asignatura.id, p, titulo, hoy, (ruta) => leerArchivoBase64(asignatura.id, conv.id, ruta)),
      // Lo subido queda como copia base para la próxima vez que haya que juntar.
      marcar: async (ruta) => (await operar(n, { tipo: 'guardada', ruta, subida: paraHistorial(fresca, titulo) })) !== null,
    });
```

5. Antes de `if (!conv) return <p className="cargando">Cargando…</p>;` añade:

```tsx
  // Al abrir una pizarra que ya está en el historial, se trae lo que se haya cambiado en otro dispositivo (una vez por sesión).
  const abiertaAhora = pizarras.find((e) => e.n === abierta) ?? pizarras.at(-1) ?? null;
  useEffect(() => {
    if (!conv || !abiertaAhora?.pizarra?.guardadaEn) return;
    const k = `${conv.id}-${abiertaAhora.n}`;
    if (traidas.current.has(k)) return;
    traidas.current.add(k);
    void traerDelHistorial(abiertaAhora.n);
  });
```

(Si `useEffect` no está importado en este archivo, añádelo al import de `react`.)

- [ ] **Step 5: Run the tests and the build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
echo "Task 14: hecho — EstudioLocal junta con el historial al abrir y antes de guardar; la subida queda como copia base" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/estudio/historial.ts src/estudio/historial.test.ts src/componentes/estudio/EstudioLocal.tsx
git commit -m "Dibujo a mano: el PC junta sus pizarras con lo cambiado en el historial

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Pizarras del historial editables (móvil, iPad, web y PC)

**Files:**
- Modify: `src/componentes/estudio/Historial.tsx` (función `VisorHistorial`)
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: `crearColaHistorial`, `operarEnHistorial` (Tarea 10), `leerOpsPendientes`, `guardarOpsPendientes`, `leerPizarraCache`, `guardarPizarraCache` (Tarea 10), `Pizarra` (Tarea 13).
- Produces: el visor del historial deja dibujar y escribir si hay token, con el estado «Guardando…» / «Guardado ✓» / «Pendiente de subir».

- [ ] **Step 1: Replace `VisorHistorial` in `src/componentes/estudio/Historial.tsx`**

Imports: añade `useCallback, useRef` al de `react`; cambia el de `cacheEstudio` a `import { guardarHistorialCache, guardarOpsPendientes, guardarPizarraCache, leerHistorialCache, leerOpsPendientes, leerPizarraCache } from '../../estado/cacheEstudio';`; añade `import { crearColaHistorial, type EstadoCola } from '../../estudio/colaHistorial';`; cambia el de `historialRemoto` a `import { imagenDeHistorial, leerDeHistorial, listarHistorial, operarEnHistorial } from '../../estudio/historialRemoto';` y el de `pizarra` a `import { aplicarOperacion, type Operacion, type Pizarra as TipoPizarra } from '../../estudio/pizarra';`.

```tsx
const TEXTO_COLA: Record<EstadoCola, string> = { 'al-dia': 'Guardado ✓', guardando: 'Guardando…', pendiente: 'Pendiente de subir' };

export function VisorHistorial({ asignatura, entrada, alVolver }: { asignatura: Asignatura; entrada: EntradaHistorial; alVolver(): void }) {
  const { config } = useDatos();
  // Lo guardado en el navegador, más lo dibujado aquí que aún no se había subido.
  const [pizarra, setPizarra] = useState<TipoPizarra | null>(() => {
    const c = leerPizarraCache(asignatura.id, entrada.archivo);
    return c ? leerOpsPendientes(asignatura.id, entrada.archivo).reduce(aplicarOperacion, c) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [estadoCola, setEstadoCola] = useState<EstadoCola>('al-dia');
  const cola = useRef<ReturnType<typeof crearColaHistorial> | null>(null);
  const imagen = useMemo(
    () => (config ? imagenDeHistorial(config, asignatura.id) : () => Promise.reject(new Error('Sin conexión'))),
    [config, asignatura.id],
  );

  // Lo que Diego dibuja aquí se junta y se sube de golpe (3 s sin tocar nada, al salir o al pasar a segundo plano).
  useEffect(() => {
    if (!config) return;
    const c = crearColaHistorial(
      {
        subir: (ops) => operarEnHistorial(config, asignatura.id, entrada.archivo, ops, entrada.titulo),
        alSubir: (p, quedan) => {
          guardarPizarraCache(asignatura.id, entrada.archivo, p);
          setPizarra(quedan.reduce(aplicarOperacion, p));
        },
        alCambiarEstado: setEstadoCola,
        guardarPendientes: (ops) => guardarOpsPendientes(asignatura.id, entrada.archivo, ops),
      },
      leerOpsPendientes(asignatura.id, entrada.archivo),
    );
    cola.current = c;
    const alVolverConexion = () => void c.vaciar();
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void c.vaciar();
    };
    window.addEventListener('online', alVolverConexion);
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      window.removeEventListener('online', alVolverConexion);
      document.removeEventListener('visibilitychange', alOcultar);
      void c.vaciar();
      c.parar();
      cola.current = null;
    };
  }, [config, asignatura.id, entrada.archivo, entrada.titulo]);

  useEffect(() => {
    if (!config) return;
    leerDeHistorial(config, asignatura.id, entrada.archivo).then(
      (p) => {
        guardarPizarraCache(asignatura.id, entrada.archivo, p);
        setPizarra((cola.current?.pendientes() ?? []).reduce(aplicarOperacion, p));
      },
      (e: Error) => setError(e.message),
    );
  }, [config, asignatura.id, entrada.archivo]);

  const operar = useCallback(async (op: Operacion) => {
    setPizarra((p) => (p ? aplicarOperacion(p, op) : p));
    cola.current?.poner(op);
  }, []);

  return (
    <div className="visor-historial">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">{pizarra?.titulo ?? entrada.titulo}{entrada.fecha ? ` · ${formatoCorto(entrada.fecha)}` : ''}</span>
      </div>
      {error && !pizarra && <p className="banner error">No se ha podido abrir: {error}</p>}
      {pizarra ? (
        <Pizarra
          pizarra={pizarra}
          imagen={imagen}
          alOperar={config ? operar : undefined}
          clave={`historial-${asignatura.id}-${entrada.archivo}`}
          origen={`historial:${asignatura.id}`}
        >
          {config && <span className={`detalle estado-cola ${estadoCola}`}>{TEXTO_COLA[estadoCola]}</span>}
        </Pizarra>
      ) : (
        !error && <p className="cargando">Cargando…</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the style** al final de `src/estilos.css`:

```css
.estado-cola { font-size: 13px; }
.estado-cola.pendiente { color: var(--peligro); }
```

- [ ] **Step 3: Run the tests and the build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 4: Try it by hand**

Con `npm run dev` (http://localhost:5173/segundo-cerebro-app/, con el token del PC ya guardado en ese navegador): Estudio → una asignatura con pizarras guardadas → abrir una → dibujar. Debe salir «Guardando…» y a los 3 s «Guardado ✓»; en `my-context` (tras `git pull`) aparece un commit «Pizarra: <título> (dibujo)». Con la red cortada (herramientas del navegador, «Offline»): «Pendiente de subir»; al volver la red, se sube sola.

- [ ] **Step 5: Commit**

```bash
echo "Task 15: hecho — pizarras del historial editables con cola (Guardando…/Guardado ✓/Pendiente de subir)" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add src/componentes/estudio/Historial.tsx src/estilos.css
git commit -m "Dibujo a mano: se puede dibujar en las pizarras del historial desde cualquier dispositivo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Documentación y prueba final

**Files:**
- Modify: `docs/diseno.md` (sección «Estudio: pizarras»), `AGENTS.md` (estructura y «Estado actual»)

- [ ] **Step 1: Document the format** en `docs/diseno.md`, al final de la sección `### Estudio: pizarras`:

```md
- Desde la v1.4, una pizarra puede tener `capas` (de abajo arriba; la de Claude, id `claude`, siempre existe), `trazos` (dibujo a mano: `id`, `herramienta` = `lapiz` | `subrayador` | `linea` | `flecha` | `rectangulo` | `elipse`, `color` `#rrggbb`, `grosor` 1-40, `puntos` `[x, y, x, y…]`, `presion` opcional, `autor: "claude"` opcional, `capa`) y un campo `capa` en las piezas. Con algo de esto se escribe como `version: 2`; si no, sigue siendo `version: 1`. Detalle en `docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md`, sección 3.
- Junto a cada pizarra en curso ya guardada en el historial está `pizarra-<n>.subida.json`: lo último que subió el PC, para juntarlo con lo que se dibuje en otro dispositivo.
```

- [ ] **Step 2: Update `AGENTS.md`**

En «Estructura del código», añade tras la línea de `src/estudio/`:

```md
- Dibujo a mano (v1.4): `src/estudio/tinta.ts` (trazos, goma, lazo), `capas.ts`, `fusion.ts` (PC ↔ historial), `deshacer.ts`, `gestos.ts`, `herramientas.ts`, `portapapeles.ts`, `colaHistorial.ts` (subir de golpe lo dibujado en el historial), `dibujoSvg.ts`. Pantalla: `src/componentes/estudio/Pizarra.tsx`, `usePizarraEditable.ts`, `BarraHerramientas.tsx`, `PanelCapas.tsx`, `CapaTinta.tsx`.
```

En «Estado actual», cambia la línea de «Última actualización» a `Última actualización: <fecha de hoy> (v1.4 parte 1 hecha, falta que Diego la pruebe).` y añade al final:

```md
- **Versión 1.4 (dibujo a mano), parte 1 hecha** (sin publicar): herramientas (lápiz con presión, subrayador, formas, lazo, borrador de trazos y goma, texto, colores, grosores, deshacer/rehacer y toques de Procreate), capas (la de Claude con todo lo suyo y las de Diego) y copiar/pegar, en la zona de estudio del PC y en las pizarras del historial (móvil, iPad, web). Diseño: `docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md`. Plan: `docs/superpowers/plans/2026-09-26-dibujo-a-mano-parte-1.md`. Registro: `.superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md`.
  - **Siguiente:** Diego prueba la parte 1 (ratón en el PC; Apple Pencil en el iPad, con un token propio para el iPad). Después, plan de la parte 2 (Claude dibuja con animación y ve la pizarra).
```

- [ ] **Step 3: Final check**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todas las pruebas en verde y compilación sin errores. Anota el número de pruebas.

- [ ] **Step 4: Commit**

```bash
echo "Task 16: hecho — documentación (diseno.md, AGENTS.md); <N> pruebas en verde" >> .superpowers/sdd/2026-09-26-dibujo-a-mano/progress.md
git add docs/diseno.md AGENTS.md
git commit -m "Dibujo a mano (parte 1): documentación y estado

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Final review** (con un revisor nuevo, sobre todo lo de esta parte; ver `superpowers:requesting-code-review`). Después, contarle a Diego qué probar y pedirle permiso para publicar (`git push`).
