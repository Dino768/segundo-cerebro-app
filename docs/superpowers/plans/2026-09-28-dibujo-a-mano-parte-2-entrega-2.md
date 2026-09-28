# v1.4 parte 2, entrega 2: Claude dibuja y escribe a mano con animación. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude dibuja en la pizarra con trazos de verdad (flechas, rodear, subrayar, esquemas, corregir encima) y escribe a mano con un trazo nuevo `letra`. Lo nuevo de Claude aparece animado, como si lo dibujara un lápiz.

**Architecture:** Una letra de un solo trazo (EMS Readability, licencia OFL) se convierte una vez, con un script, en un archivo de datos de la app. `src/estudio/letraMano.ts` convierte un texto en las líneas de cada letra (con un temblor fijo por id). `tinta.ts` añade la herramienta `letra`, cuyas líneas salen del texto en vez de `puntos`. Así la caja, el lazo, el borrador, la goma (que la convierte en lápiz), mover, copiar y dibujar funcionan casi sin cambios. `src/estudio/animacion.ts` (sin pantalla) decide qué es nuevo, en qué orden y cuánto dura cada trazo, y cómo se ve a medio dibujar. Un hook de la pizarra lo anima con `requestAnimationFrame` y `CapaTinta` dibuja cada trazo hasta donde toca.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (entorno `node`, pruebas de pantalla con `renderToString`), programa local en Node sin compilar (imports con `.ts`). Sin dependencias nuevas: la fuente se copia al repositorio.

**Spec:** `docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md` (secciones 5, 6 «Entrega 2», 7 y 8).

## Global Constraints

- Habla con Diego en español sencillo. Textos de la app, avisos y comentarios en español.
- Node está en `C:\Program Files\nodejs`. En Bash: `export PATH="$PATH:/c/Program Files/nodejs";` delante de cada comando.
- Pruebas: `npm test` (Vitest). Tipos y compilación: `npm run build`.
- Los archivos de `src/estudio/` que usa también `local/` (`pizarra.ts`, `tinta.ts`, `geometria.ts`, y ahora `letraMano.ts` y `letraMano.datos.ts`) importan con extensión `.ts`. El resto de la app, sin extensión (como ahora).
- Letra elegida por Diego (2026-09-28): **EMS Readability** (no EMS Allure, la candidata del diseño: Diego la prefiere «un poco más normal»). Se copia de `hersheytext@2.0.0` a `scripts/fuentes/`, con su licencia OFL.
- Trazo `letra`: `{ id, herramienta: "letra", texto, x, y, tamano, color, grosor?, autor?, capa? }`. `texto`: una línea, de 1 a 200 caracteres, con alguno que no sea espacio. `x`, `y`: principio de la línea base. `tamano`: alto de las mayúsculas, de 8 a 200. `grosor`: 1 a 40, por defecto 3. Sin `puntos` en el archivo.
- Letras: A–Z, a–z, á é í ó ú ü ñ y sus mayúsculas, ¿ ¡ ? !, 0–9, espacio y `. , ; : ' " ( ) [ ] + − - = × · ÷ / ^ _ < > ² ³ ± %`. Hechos para esta app: `∫ √ π ∞ ≤ ≥ ≠ → Δ θ α β λ ∑` (y `−`). Lo que no esté se dibuja como «?» y el validador avisa.
- Animación: formas 0,4 s; lápiz y subrayador a su ritmo, 0,6 s como mucho; letra a 12 letras por segundo. Lo que llega junto va en orden y, si pasa de 8 s, se acelera para caber en 8. Lo nuevo mientras se anima va a la cola. Con «reducir movimiento» no se anima. Al abrir una pizarra no se anima (salvo si Claude la acaba de crear, ver `Ruling` de la Tarea 5).
- Solo se animan los trazos con `autor: "claude"`. Las piezas (textos, fórmulas…) salen como ahora.
- Trabajo en la rama `v1.4-parte-2-entrega-2` (se crea en la Tarea 1). Nunca `git push` sin que Diego lo sepa.
- Cada tarea deja su línea en `.superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md`. Lo que se aparte del plan se apunta como `Ruling:`.

## Review Focus

- Claude escribe un símbolo que no está en la letra (`∮`, un emoji) → se dibuja «?» en su sitio, la pizarra carga y sale un aviso. Pruebas en las Tareas 2 y 3.
- Claude escribe una `letra` mal hecha (texto vacío, solo espacios, con salto de línea, sin `tamano`) → se ignora ese trazo con aviso y el resto de la pizarra sigue. Prueba en la Tarea 3.
- Diego abre una pizarra antigua llena de dibujos de Claude → sale todo dibujado al momento, sin esperar 8 s de animación. Prueba en la Tarea 4 (`recibir`).
- Diego pega o duplica algo de Claude → lo pegado no se anima (aparece primero en lo que Diego ve, no en lo que llega). Prueba en la Tarea 4 (`recibir`).
- Claude escribe 40 trazos de golpe → la animación acaba en 8 s y no se pierde ninguno. Prueba en la Tarea 4 (`encolar`).

---

### Task 1: La letra a mano: fuente y datos

**Files:**
- Create: `scripts/fuentes/EMSReadability.svg` (copiado de `hersheytext@2.0.0`)
- Create: `scripts/fuentes/OFL.txt`
- Create: `scripts/letraMano.ts`
- Create: `src/estudio/letraMano.datos.ts` (generado por el script)
- Modify: `package.json` (script `letra`)
- Test: `src/estudio/letraMano.datos.test.ts`

**Interfaces:**
- Produces: `export const LETRAS: Record<string, { a: number; t: number[][] }>` en `src/estudio/letraMano.datos.ts`. Unidades: 1 = alto de las mayúsculas (la «H»); `y` hacia arriba desde la línea base (0); `a` = avance hasta la letra siguiente; `t` = trazos, cada uno `[x, y, x, y…]`.

- [ ] **Step 1: Crear la rama y el registro**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout -b v1.4-parte-2-entrega-2
mkdir -p .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2
echo "Setup: rama v1.4-parte-2-entrega-2 (main queda intacta hasta que Diego pruebe). Letra: EMS Readability (elegida por Diego)." > .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

- [ ] **Step 2: Escribir la prueba que falla**

Crea `src/estudio/letraMano.datos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LETRAS } from './letraMano.datos.ts';

const PEDIDAS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ¿¡?!0123456789 .,;:\'"()[]+−-=×·÷/^_<>²³±%',
  ...'∫√π∞≤≥≠→Δθαβλ∑',
];

describe('datos de la letra a mano', () => {
  it('están todas las letras del diseño', () => {
    expect(PEDIDAS.filter((c) => !LETRAS[c])).toEqual([]);
  });
  it('la H mide 1 de alto y se apoya en la línea base', () => {
    const ys = LETRAS.H.t.flat().filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeCloseTo(0, 2);
    expect(Math.max(...ys)).toBeCloseTo(1, 2);
  });
  it('el espacio no tiene trazos pero sí avance', () => {
    expect(LETRAS[' '].t).toEqual([]);
    expect(LETRAS[' '].a).toBeGreaterThan(0.2);
  });
  it('cada trazo tiene pares x, y y al menos dos puntos, con números normales', () => {
    for (const [c, g] of Object.entries(LETRAS)) {
      for (const t of g.t) {
        expect(t.length % 2, c).toBe(0);
        expect(t.length, c).toBeGreaterThanOrEqual(4);
        expect(t.every((v) => Number.isFinite(v) && Math.abs(v) < 3), c).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 3: Ejecutar la prueba para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/letraMano.datos.test.ts`
Expected: FAIL (no encuentra `./letraMano.datos.ts`)

- [ ] **Step 4: Copiar la fuente y su licencia**

```bash
cd "$TEMP" && rm -rf letra && mkdir letra && cd letra
export PATH="$PATH:/c/Program Files/nodejs"; npm pack hersheytext@2.0.0 && tar xzf hersheytext-2.0.0.tgz
mkdir -p /c/Users/Diego/Desktop/segundo-cerebro-app/scripts/fuentes
cp package/svg_fonts/EMSReadability.svg /c/Users/Diego/Desktop/segundo-cerebro-app/scripts/fuentes/
curl -sL https://openfontlicense.org/documents/OFL.txt -o /c/Users/Diego/Desktop/segundo-cerebro-app/scripts/fuentes/OFL.txt
grep -c "SIL OPEN FONT LICENSE Version 1.1" /c/Users/Diego/Desktop/segundo-cerebro-app/scripts/fuentes/OFL.txt
```

Expected: el último comando imprime `1` o más. Si el `curl` falla o el archivo no tiene ese texto, baja el mismo texto de `https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesanspro/OFL.txt` (la fuente de la que deriva) y apúntalo como `Ruling:`.

- [ ] **Step 5: Escribir el script que genera los datos**

Crea `scripts/letraMano.ts`:

```ts
// Convierte la letra de un solo trazo EMS Readability (scripts/fuentes/, licencia OFL) en src/estudio/letraMano.datos.ts.
// Se ejecuta a mano (npm run letra) solo si cambia la fuente o los símbolos de abajo; el resultado sí se sube.
import { readFileSync, writeFileSync } from 'node:fs';

type Glifo = { a: number; t: number[][] }; // avance y trazos [x, y, x, y…] (unidades de la fuente, y hacia arriba)

const svg = readFileSync(new URL('./fuentes/EMSReadability.svg', import.meta.url), 'utf8');
const entidades = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const fuente = new Map<string, Glifo>();
for (const m of svg.matchAll(/<glyph\b([^>]*)\/>/g)) {
  const atributo = (n: string) => new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(m[1])?.[1];
  const u = atributo('unicode');
  if (u === undefined) continue;
  const letra = entidades(u);
  const trazos: number[][] = [];
  for (const [, orden, resto] of (atributo('d') ?? '').matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const nums = resto.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (orden === 'M') trazos.push(nums);
    else if (orden === 'L' && trazos.length) trazos[trazos.length - 1].push(...nums);
    else throw new Error(`Letra «${letra}»: no sé leer la orden «${orden}» (solo M y L)`);
  }
  // Un trazo de un solo punto no se ve (y la animación no sabría recorrerlo): fuera.
  fuente.set(letra, { a: Number(atributo('horiz-adv-x') ?? 378), t: trazos.filter((tr) => tr.length >= 4) });
}

// Las del diseño que trae la fuente.
const DE_LA_FUENTE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ¿¡?!0123456789 .,;:\'"()[]+-=×·÷/^_<>²³±%';

// Hechos para esta app, en las mismas unidades que la fuente (línea base ≈ 22, mayúsculas ≈ 652, minúsculas ≈ 485).
const curva = (n: number, f: (s: number) => [number, number]) => Array.from({ length: n + 1 }, (_, i) => f(i / n)).flat();
const EXTRAS: Record<string, Glifo> = {
  '−': { a: 501, t: [[57, 340, 450, 340]] },
  '≠': { a: 504, t: [[50, 441, 450, 441], [50, 239, 450, 239], [330, 560, 170, 120]] },
  '≤': { a: 504, t: [[450, 560, 54, 400, 450, 240], [54, 130, 450, 130]] },
  '≥': { a: 504, t: [[54, 560, 450, 400, 54, 240], [54, 130, 450, 130]] },
  '→': { a: 700, t: [[50, 340, 640, 340], [530, 440, 640, 340, 530, 240]] },
  'π': { a: 580, t: [[60, 450, 110, 485, 520, 485], [210, 485, 180, 22], [400, 485, 395, 90, 420, 30, 480, 22]] },
  'Δ': { a: 640, t: [[320, 652, 40, 22, 600, 22, 320, 652]] },
  '∑': { a: 580, t: [[520, 652, 60, 652, 320, 337, 60, 22, 520, 22]] },
  '√': { a: 620, t: [[30, 320, 100, 360, 230, 22, 340, 740, 600, 740]] },
  '∫': { a: 380, t: [[340, 700, 310, 730, 260, 735, 225, 705, 205, 630, 185, 100, 165, -130, 135, -180, 85, -185, 50, -150]] },
  'θ': { a: 540, t: [curva(40, (s) => [270 + 190 * Math.sin(2 * Math.PI * s), 337 + 315 * Math.cos(2 * Math.PI * s)]), [80, 337, 460, 337]] },
  'α': { a: 600, t: [[540, 485, 450, 250, 370, 90, 280, 22, 180, 40, 110, 150, 105, 300, 160, 430, 260, 485, 360, 430, 440, 250, 490, 70, 550, 22]] },
  'β': { a: 560, t: [[120, -195, 120, 560, 150, 660, 220, 715, 300, 715, 370, 670, 390, 590, 350, 510, 250, 470, 350, 450, 430, 390, 450, 280, 420, 140, 340, 50, 250, 22, 170, 40, 120, 90]] },
  'λ': { a: 540, t: [[90, 715, 160, 700, 210, 640, 480, 22], [290, 430, 60, 22]] },
  '∞': {
    a: 800,
    t: [curva(64, (s) => {
      const u = 2 * Math.PI * s;
      const d = 1 + Math.sin(u) ** 2;
      return [400 + (330 * Math.cos(u)) / d, 300 + (330 * Math.sin(u) * Math.cos(u)) / d];
    })],
  },
};

const faltan = [...DE_LA_FUENTE].filter((c) => !fuente.has(c));
if (faltan.length) throw new Error(`La fuente no trae: ${faltan.join(' ')}`);

// 1 = alto de la H; y desde su línea base.
const ysH = fuente.get('H')!.t.flat().filter((_, i) => i % 2 === 1);
const BASE = Math.min(...ysH);
const ALTO = Math.max(...ysH) - BASE;
const r = (v: number) => Math.round(v * 1000) / 1000;
const normal = (g: Glifo): Glifo => ({ a: r(g.a / ALTO), t: g.t.map((tr) => tr.map((v, i) => r(i % 2 === 0 ? v / ALTO : (v - BASE) / ALTO))) });

const letras: [string, Glifo][] = [...[...DE_LA_FUENTE].map((c) => [c, fuente.get(c)!] as [string, Glifo]), ...Object.entries(EXTRAS)];
const lineas = letras.map(([c, g]) => `  ${JSON.stringify(c)}: ${JSON.stringify(normal(g))},`);
writeFileSync(
  new URL('../src/estudio/letraMano.datos.ts', import.meta.url),
  `// Generado por scripts/letraMano.ts: no lo edites a mano.
// Letra: EMS Readability (Sheldon B. Michaels, derivada de Source Sans Pro de Paul D. Hunt, Adobe),
// con licencia SIL Open Font License 1.1 (scripts/fuentes/OFL.txt). Los símbolos de matemáticas son de esta app.
// Unidades: 1 = alto de las mayúsculas; y hacia arriba desde la línea base; a = avance hasta la letra siguiente.
export const LETRAS: Record<string, { a: number; t: number[][] }> = {
${lineas.join('\n')}
};
`,
);
console.log(`Letra a mano: ${letras.length} letras.`);
```

- [ ] **Step 6: Añadir el script a `package.json` y generar los datos**

En `package.json`, dentro de `"scripts"`, después de `"iconos": "node scripts/iconos.ts"`, añade `"letra": "node scripts/letraMano.ts"` (con la coma en la línea de antes).

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm run letra`
Expected: `Letra a mano: 121 letras.` (el número exacto puede variar poco; lo importante es que no haya error)

- [ ] **Step 7: Ejecutar la prueba para ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/letraMano.datos.test.ts`
Expected: PASS (4 pruebas)

- [ ] **Step 8: Commit**

```bash
git add scripts/fuentes scripts/letraMano.ts src/estudio/letraMano.datos.ts src/estudio/letraMano.datos.test.ts package.json
git commit -m "Letra a mano: fuente EMS Readability (OFL) convertida a datos de la app"
echo "Task 1: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 2: Texto → letras a mano (`letraMano.ts`)

**Files:**
- Create: `src/estudio/letraMano.ts`
- Test: `src/estudio/letraMano.test.ts`

**Interfaces:**
- Consumes: `LETRAS` de la Tarea 1; `type Punto` de `src/estudio/geometria.ts` (`{ x: number; y: number }`).
- Produces (en `src/estudio/letraMano.ts`):
  - `export const SUSTITUTO = '?'`
  - `export function caracteresQueFaltan(texto: string): string[]`: los caracteres (sin repetir, en orden de aparición) que no tiene la letra.
  - `export function letrasDeTexto(texto: string, x: number, y: number, tamano: number, id: string): Punto[][][]`: una entrada por letra visible (los espacios no tienen), cada una con sus líneas en coordenadas de la pizarra (y hacia abajo), redondeadas a 1 decimal.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crea `src/estudio/letraMano.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LETRAS } from './letraMano.datos.ts';
import { caracteresQueFaltan, letrasDeTexto, SUSTITUTO } from './letraMano.ts';

const ys = (letras: { x: number; y: number }[][][]) => letras.flat(2).map((p) => p.y);
const xs = (letras: { x: number; y: number }[][][]) => letras.flat(2).map((p) => p.x);

describe('letra a mano', () => {
  it('una H de tamaño 50 sobre la línea base y = 200 mide unos 50 de alto', () => {
    const h = letrasDeTexto('H', 100, 200, 50, 'c1');
    expect(h).toHaveLength(1);
    expect(h[0]).toHaveLength(LETRAS.H.t.length);
    expect(Math.max(...ys(h))).toBeLessThan(200 + 50 * 0.1);
    expect(Math.min(...ys(h))).toBeGreaterThan(200 - 50 * 1.1);
    expect(Math.max(...ys(h)) - Math.min(...ys(h))).toBeGreaterThan(50 * 0.85);
    expect(Math.min(...xs(h))).toBeGreaterThan(100 - 5);
  });
  it('el mismo id da siempre las mismas letras; otro id tiembla distinto', () => {
    expect(letrasDeTexto('dy/dx', 0, 0, 30, 'c7')).toEqual(letrasDeTexto('dy/dx', 0, 0, 30, 'c7'));
    expect(letrasDeTexto('dy/dx', 0, 0, 30, 'c7')).not.toEqual(letrasDeTexto('dy/dx', 0, 0, 30, 'c8'));
  });
  it('los espacios no dibujan nada pero separan las palabras', () => {
    const juntas = letrasDeTexto('ab', 0, 0, 40, 'x');
    const separadas = letrasDeTexto('a b', 0, 0, 40, 'x');
    expect(separadas).toHaveLength(2);
    expect(Math.min(...separadas[1].flat().map((p) => p.x))).toBeGreaterThan(Math.min(...juntas[1].flat().map((p) => p.x)) + 40 * LETRAS[' '].a * 0.8);
  });
  it('lo que no está en la letra se dibuja como «?» y se puede preguntar qué falta', () => {
    const r = letrasDeTexto('∮', 0, 0, 30, 'x');
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(LETRAS[SUSTITUTO].t.length);
    expect(caracteresQueFaltan('dy ∮ 😀 ∮')).toEqual(['∮', '😀']);
    expect(caracteresQueFaltan('¿Qué es ∫ f(x)·dx ≠ 0?')).toEqual([]);
  });
  it('una tilde escrita en dos partes (a + ´) cuenta como «á»', () => {
    expect(caracteresQueFaltan('a\u0301')).toEqual([]);
    expect(letrasDeTexto('a\u0301', 0, 0, 30, 'x')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/letraMano.test.ts`
Expected: FAIL (no encuentra `./letraMano.ts`)

- [ ] **Step 3: Escribir el código**

Crea `src/estudio/letraMano.ts`:

```ts
import type { Punto } from './geometria.ts';
import { LETRAS } from './letraMano.datos.ts';

// Letra a mano de Claude: un texto se convierte en las líneas de cada letra (una letra de un solo trazo,
// ver scripts/letraMano.ts). Diseño: docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md, sección 5.

export const SUSTITUTO = '?';

// Cuánto tiembla cada letra (en altos de mayúscula o radianes): poco, para que parezca escrita a mano sin dejar de leerse bien.
const TEMBLOR = { mover: 0.02, subir: 0.03, girar: 0.03, escala: 0.03 };

const letrasDe = (texto: string) => [...texto.normalize('NFC')];

export const caracteresQueFaltan = (texto: string): string[] => [...new Set(letrasDe(texto).filter((c) => !LETRAS[c]))];

// Números al azar, pero siempre los mismos para el mismo id (FNV-1a para la semilla y mulberry32),
// para que la letra no cambie al volver a abrir la pizarra.
function azarDe(id: string): () => number {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

// Las letras de un texto: una entrada por letra visible (los espacios no tienen), con sus líneas en coordenadas
// de la pizarra. (x, y) es el principio de la línea base y `tamano`, el alto de las mayúsculas.
export function letrasDeTexto(texto: string, x: number, y: number, tamano: number, id: string): Punto[][][] {
  const azar = azarDe(id);
  const entre = (m: number) => (azar() * 2 - 1) * m;
  const r: Punto[][][] = [];
  let cursor = 0;
  for (const c of letrasDe(texto)) {
    const g = LETRAS[c] ?? LETRAS[SUSTITUTO];
    // Se piden siempre los cuatro números (también en los espacios), para que una letra no cambie el temblor de las demás.
    const dx = entre(TEMBLOR.mover);
    const dy = entre(TEMBLOR.subir);
    const giro = entre(TEMBLOR.girar);
    const escala = 1 + entre(TEMBLOR.escala);
    if (g.t.length) {
      const medio = g.a / 2; // se gira alrededor del centro de la letra, en la línea base
      const cos = Math.cos(giro);
      const sin = Math.sin(giro);
      r.push(
        g.t.map((tr) => {
          const ps: Punto[] = [];
          for (let i = 0; i + 1 < tr.length; i += 2) {
            const lx = (tr[i] - medio) * escala;
            const ly = tr[i + 1] * escala;
            const gx = lx * cos - ly * sin + medio;
            const gy = lx * sin + ly * cos;
            ps.push({ x: r1(x + (cursor + gx + dx) * tamano), y: r1(y - (gy + dy) * tamano) });
          }
          return ps;
        }),
      );
    }
    cursor += g.a;
  }
  return r;
}
```

- [ ] **Step 4: Ejecutar para ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/letraMano.test.ts`
Expected: PASS (5 pruebas)

- [ ] **Step 5: Commit**

```bash
git add src/estudio/letraMano.ts src/estudio/letraMano.test.ts
git commit -m "Letra a mano: texto a letras con un temblor fijo por id"
echo "Task 2: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 3: Herramienta `letra` en los trazos y en el formato

**Files:**
- Modify: `src/estudio/tinta.ts`
- Modify: `src/estudio/pizarra.ts` (`validarTrazos` y `serializarPizarra`)
- Test: `src/estudio/tinta.test.ts`, `src/estudio/pizarra.test.ts`, `src/componentes/estudio/CapaTinta.test.tsx`

**Interfaces:**
- Consumes: `letrasDeTexto`, `caracteresQueFaltan` de la Tarea 2.
- Produces (en `src/estudio/tinta.ts`):
  - `Herramienta` gana `'letra'` (y `HERRAMIENTAS` también). `esLibre('letra')` sigue siendo `false`.
  - `Trazo` gana `texto?: string; x?: number; y?: number; tamano?: number` (solo en `letra`). En `letra`, `puntos` es `[]` en memoria.
  - `export const GROSOR_LETRA = 3`, `export const LIMITE_TEXTO_LETRA = 200`.
  - `export function letrasDe(t: Trazo): Punto[][][]`: las letras de un trazo `letra` (con caché por objeto). `[]` para las demás herramientas.
  - `polilineas(t)` de un `letra` = todas las líneas de sus letras. Por eso `cajaDeTrazo`, `tocaTrazo`, `trazoEnLazo`, `cortarConGoma` (que la convierte en trazos `lapiz`) y `figuraDe` (líneas) funcionan sin tocarlos.
  - `moverTrazo` de un `letra` cambia `x` e `y`.
  - `export function paraGuardar(t: Trazo): Record<string, unknown>`: el trazo tal y como se escribe en el archivo (sin `puntos` en `letra`).

- [ ] **Step 1: Escribir las pruebas que fallan (tinta.test.ts)**

En `src/estudio/tinta.test.ts`, cambia el import de la línea 2 por:

```ts
import { cajaDeTrazo, cortarConGoma, dentroDePoligono, ErrorTrazo, letrasDe, moverTrazo, nuevoId, paraGuardar, polilineas, puntosQueQuedan, terminarTrazo, tocaTrazo, trazoEnLazo, validarTrazo } from './tinta.ts';
```

y añade al final:

```ts
describe('letra a mano (herramienta letra)', () => {
  const bruta = { id: 'c7', herramienta: 'letra', texto: 'dy/dx = 2x', x: 300, y: 180, tamano: 28, color: '#B8603D', autor: 'claude' };
  const letra = validarTrazo(bruta, 't');
  it('se valida sin puntos y con grosor 3 si no lo trae', () => {
    expect(letra).toEqual({ id: 'c7', herramienta: 'letra', color: '#b8603d', grosor: 3, puntos: [], texto: 'dy/dx = 2x', x: 300, y: 180, tamano: 28, autor: 'claude' });
    expect(validarTrazo({ ...bruta, grosor: 5, puntos: [1, 2] }, 't')).toMatchObject({ grosor: 5, puntos: [] });
  });
  it('rechaza las letras mal hechas', () => {
    const malas: [Record<string, unknown>, RegExp][] = [
      [{ ...bruta, texto: '' }, /texto/],
      [{ ...bruta, texto: '   ' }, /texto/],
      [{ ...bruta, texto: 'dos\nlíneas' }, /texto/],
      [{ ...bruta, texto: 'x'.repeat(201) }, /200/],
      [{ ...bruta, texto: 7 }, /texto/],
      [{ ...bruta, tamano: undefined }, /tamano/],
      [{ ...bruta, tamano: 4 }, /tamano/],
      [{ ...bruta, x: 'a' }, /\.x/],
      [{ ...bruta, y: Infinity }, /\.y/],
    ];
    for (const [mala, patron] of malas) expect(() => validarTrazo(mala, 't')).toThrow(patron);
  });
  it('sus líneas salen del texto: caja, tocar y lazo funcionan como en las formas', () => {
    expect(letrasDe(letra)).toHaveLength(8); // «dy/dx=2x» sin los espacios
    expect(polilineas(letra)).toEqual(letrasDe(letra).flat());
    const caja = cajaDeTrazo(letra);
    expect(caja.x).toBeGreaterThan(290);
    expect(caja.y + caja.h).toBeLessThan(180 + 28 * 0.5);
    expect(caja.y).toBeGreaterThan(180 - 28 * 1.5);
    const primerPunto = polilineas(letra)[0][0];
    expect(tocaTrazo(letra, primerPunto, 1)).toBe(true);
    const rodea = [{ x: caja.x - 5, y: caja.y - 5 }, { x: caja.x + caja.w + 5, y: caja.y - 5 }, { x: caja.x + caja.w + 5, y: caja.y + caja.h + 5 }, { x: caja.x - 5, y: caja.y + caja.h + 5 }];
    expect(trazoEnLazo(letra, rodea)).toBe(true);
  });
  it('moverla cambia x e y (y sus letras se mueven igual)', () => {
    const movida = moverTrazo(letra, 10, -5);
    expect(movida).toMatchObject({ x: 310, y: 175, puntos: [] });
    expect(polilineas(movida)[0][0].x).toBeCloseTo(polilineas(letra)[0][0].x + 10, 0);
  });
  it('la goma la convierte en trazos de lápiz normales (de Claude y de su capa) y los corta', () => {
    const conCapa = { ...letra, capa: 'claude' };
    const caja = cajaDeTrazo(conCapa);
    const medio = { x: caja.x + caja.w / 2, y: caja.y + caja.h / 2 };
    let n = 0;
    const trozos = cortarConGoma(conCapa, [{ x: medio.x, y: caja.y - 10 }, { x: medio.x, y: caja.y + caja.h + 10 }], 6, () => `g${n++}`)!;
    expect(trozos.length).toBeGreaterThan(3);
    expect(trozos.every((t) => t.herramienta === 'lapiz' && t.autor === 'claude' && t.capa === 'claude' && t.texto === undefined)).toBe(true);
    expect(cortarConGoma(conCapa, [{ x: -500, y: -500 }], 6, () => 'z')).toBeNull();
  });
  it('en el archivo no lleva puntos', () => {
    expect(paraGuardar(letra)).not.toHaveProperty('puntos');
    expect(paraGuardar(validarTrazo(lapiz, 't'))).toHaveProperty('puntos');
  });
});
```

- [ ] **Step 2: Escribir las pruebas que fallan (pizarra.test.ts)**

Añade al final de `src/estudio/pizarra.test.ts`:

```ts
describe('trazos de letra a mano en la pizarra', () => {
  const letra = { id: 'c7', herramienta: 'letra', texto: 'dy/dx', x: 300, y: 180, tamano: 28, color: '#b8603d', autor: 'claude' };
  it('se lee, avisa de lo que no sabe escribir y sigue cargando', () => {
    const { pizarra, avisos } = validarPizarra(con({ version: 2, trazos: [letra, { ...letra, id: 'c8', texto: 'área ∮' }] }));
    expect(pizarra.trazos.map((t) => t.id)).toEqual(['c7', 'c8']);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/trazos\[1\].*∮/);
  });
  it('una letra mal hecha se ignora con aviso y el resto se queda', () => {
    const { pizarra, avisos } = validarPizarra(con({ version: 2, trazos: [{ ...letra, texto: 'a\nb' }, { ...letra, id: 'c9' }] }));
    expect(pizarra.trazos.map((t) => t.id)).toEqual(['c9']);
    expect(avisos[0]).toMatch(/texto/);
  });
  it('se escribe sin puntos y se vuelve a leer igual', () => {
    const { pizarra } = validarPizarra(con({ version: 2, trazos: [letra] }));
    const texto = serializarPizarra(pizarra);
    expect(texto).toContain('"herramienta":"letra"');
    expect(texto).not.toContain('"puntos":[]');
    expect(validarPizarra(JSON.parse(texto)).pizarra).toEqual(pizarra);
  });
  it('una operación de trazos con una letra (moverla, pegarla) se acepta', () => {
    const op = validarOperacion({ tipo: 'trazos', quitar: ['c7'], poner: [{ ...letra, x: 310, puntos: [] }] });
    expect(op).toMatchObject({ tipo: 'trazos', poner: [{ herramienta: 'letra', x: 310 }] });
  });
});
```

- [ ] **Step 3: Escribir la prueba que falla (CapaTinta.test.tsx)**

En `src/componentes/estudio/CapaTinta.test.tsx`, añade dentro del `describe`:

```ts
  it('la letra a mano se dibuja con líneas (una por trazo de cada letra)', () => {
    const letra = validarTrazo({ id: 'c7', herramienta: 'letra', texto: 'Hi', x: 0, y: 40, tamano: 30, color: '#3b82f6', autor: 'claude' }, 't');
    const html = renderToString(<CapaTinta subrayados={[]} trazos={[letra]} />);
    expect(html).toContain('stroke="#3b82f6"');
    expect(html).toContain('fill="none"');
    expect((html.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
```

- [ ] **Step 4: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts src/estudio/pizarra.test.ts src/componentes/estudio/CapaTinta.test.tsx`
Expected: FAIL (`letrasDe` y `paraGuardar` no existen; herramienta «letra» desconocida)

- [ ] **Step 5: Cambiar `tinta.ts`**

En `src/estudio/tinta.ts`:

1. Imports y tipos, al principio del archivo:

```ts
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
```

2. Sustituye entera la función `validarTrazo` por:

```ts
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
```

3. En `polilineas`, justo al principio de la función (antes de `const ps = pares(t.puntos);`), añade:

```ts
  if (t.herramienta === 'letra') return letrasDe(t).flat();
```

4. Sustituye `moverTrazo` por:

```ts
export function moverTrazo(t: Trazo, dx: number, dy: number): Trazo {
  if (t.herramienta === 'letra') return { ...t, x: redondear((t.x ?? 0) + dx, 1), y: redondear((t.y ?? 0) + dy, 1) };
  return { ...t, puntos: t.puntos.map((v, i) => redondear(v + (i % 2 === 0 ? dx : dy), 1)) };
}
```

`cortarConGoma` no cambia: recorre `polilineas(t)` (las letras), `t.presion` no existe y la herramienta de los trozos es `lapiz` porque no es `subrayador`.

- [ ] **Step 6: Cambiar `pizarra.ts`**

En `src/estudio/pizarra.ts`:

1. Cambia el import de la línea 4 por:

```ts
import { ErrorTrazo, LIMITE_TRAZOS, paraGuardar, validarTrazo, type Trazo } from './tinta.ts';
import { caracteresQueFaltan, SUSTITUTO } from './letraMano.ts';
```

2. En `validarTrazos`, justo después de `trazos.push(t);`, añade:

```ts
      if (t.herramienta === 'letra') {
        const faltan = caracteresQueFaltan(t.texto ?? '');
        if (faltan.length) avisos.push(`trazos[${i}]: no sé escribir a mano «${faltan.join(' ')}»; sale como «${SUSTITUTO}»`);
      }
```

3. En `serializarPizarra`, cambia `${JSON.stringify(t)}` por `${JSON.stringify(paraGuardar(t))}`.

- [ ] **Step 7: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/tinta.test.ts src/estudio/pizarra.test.ts src/componentes/estudio/CapaTinta.test.tsx`
Expected: PASS

- [ ] **Step 8: Toda la batería y los tipos**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde y la compilación sin errores. (El programa local usa `pizarra.ts` y `tinta.ts` con imports `.ts`: `node -e "import('./local/pizarras.ts').then(() => console.log('ok'))"` debe imprimir `ok`.)

- [ ] **Step 9: Commit**

```bash
git add src/estudio/tinta.ts src/estudio/tinta.test.ts src/estudio/pizarra.ts src/estudio/pizarra.test.ts src/componentes/estudio/CapaTinta.test.tsx
git commit -m "Pizarra: trazo letra (letra a mano de Claude): validar, caja, lazo, mover, goma y guardar sin puntos"
echo "Task 3: Ruling: el lazo selecciona la letra por sus puntos (más de la mitad dentro), como las demás herramientas, no por su caja — coste si está mal: hay que rodear casi toda la palabra para cogerla" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
echo "Task 3: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 4: Qué se anima, cuándo y cómo se ve a medias (`animacion.ts`)

**Files:**
- Create: `src/estudio/animacion.ts`
- Modify: `src/estudio/dibujoSvg.ts` (`figuraParcial`)
- Test: `src/estudio/animacion.test.ts`, `src/estudio/dibujoSvg.test.ts` (nuevo)

**Interfaces:**
- Consumes: `letrasDe`, `polilineas`, `pares`, `esLibre`, `type Trazo` de `tinta.ts`; `figuraDe` de `dibujoSvg.ts`.
- Produces (en `src/estudio/animacion.ts`):
  - `export const TOPE_LOTE = 8000`, `DURACION_FORMA = 400`, `TOPE_LAPIZ = 600`, `LETRAS_POR_SEGUNDO = 12` (ms y letras por segundo)
  - `export interface Tramo { id: string; inicio: number; fin: number }` (ms, reloj de `performance.now()`)
  - `export function duracion(t: Trazo): number`
  - `export function encolar(cola: Tramo[], nuevos: Trazo[], ahora: number): Tramo[]`
  - `export function progreso(tramo: Tramo, ahora: number): number` (0 a 1)
  - `export function pendientes(cola: Tramo[], ahora: number): Tramo[]`
  - `export function recibir(vistos: ReadonlySet<string> | null, externos: Trazo[], propios: Trazo[], animarPrimera: boolean): { vistos: Set<string>; nuevos: Trazo[] }`
  - `export function cortarPorLargo(lineas: Punto[][], f: number): Punto[][]`
  - `export function lineasParciales(t: Trazo, f: number): Punto[][]` (todas menos el lápiz)
  - `export function lapizParcial(t: Trazo, f: number): Trazo`
- Produces (en `src/estudio/dibujoSvg.ts`): `export function figuraParcial(t: Trazo, f: number): { d: string; relleno: boolean }`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crea `src/estudio/animacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  cortarPorLargo, DURACION_FORMA, duracion, encolar, lapizParcial, lineasParciales, pendientes, progreso, recibir, TOPE_LAPIZ, TOPE_LOTE, type Tramo,
} from './animacion';
import { letrasDe, validarTrazo, type Trazo } from './tinta';

const forma = (id: string, autor = true): Trazo => validarTrazo({ id, herramienta: 'linea', color: '#b8603d', grosor: 4, puntos: [0, 0, 100, 0], ...(autor ? { autor: 'claude' } : {}) }, 't');
const lapiz = (id: string, largo: number): Trazo =>
  validarTrazo({ id, herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, largo / 2, 0, largo, 0], presion: [0.2, 0.5, 0.8], autor: 'claude' }, 't');
const letra = (id: string, texto: string): Trazo => validarTrazo({ id, herramienta: 'letra', texto, x: 0, y: 40, tamano: 30, color: '#b8603d', autor: 'claude' }, 't');

describe('duración de cada trazo', () => {
  it('formas 0,4 s; lápiz a su ritmo, 0,6 s como mucho; letra a 12 letras por segundo', () => {
    expect(duracion(forma('a'))).toBe(DURACION_FORMA);
    expect(duracion(lapiz('l', 5000))).toBe(TOPE_LAPIZ);
    expect(duracion(lapiz('l', 30))).toBeGreaterThan(0);
    expect(duracion(lapiz('l', 30))).toBeLessThan(duracion(lapiz('m', 300)));
    expect(duracion(letra('t', 'Hola'))).toBeCloseTo(4000 / 12, 5);
    expect(duracion(letra('t', 'a b'))).toBeCloseTo(2000 / 12, 5); // los espacios no cuentan
  });
});

describe('cola de la animación', () => {
  it('lo que llega junto va uno detrás de otro, en el orden del archivo', () => {
    expect(encolar([], [forma('a'), forma('b')], 1000)).toEqual([
      { id: 'a', inicio: 1000, fin: 1400 },
      { id: 'b', inicio: 1400, fin: 1800 },
    ]);
  });
  it('lo nuevo espera a que acabe lo que se está animando', () => {
    const cola: Tramo[] = [{ id: 'a', inicio: 1000, fin: 5000 }];
    expect(encolar(cola, [forma('b')], 2000)).toEqual([...cola, { id: 'b', inicio: 5000, fin: 5400 }]);
  });
  it('40 trazos de golpe caben en 8 s y no se pierde ninguno', () => {
    const cola = encolar([], Array.from({ length: 40 }, (_, i) => forma(`f${i}`)), 0);
    expect(cola).toHaveLength(40);
    expect(cola.at(-1)!.fin).toBeCloseTo(TOPE_LOTE, 5);
    expect(cola.every((t, i) => i === 0 || t.inicio === cola[i - 1].fin)).toBe(true);
  });
  it('progreso de 0 a 1 y los que han acabado salen de la cola', () => {
    const t: Tramo = { id: 'a', inicio: 1000, fin: 1400 };
    expect(progreso(t, 500)).toBe(0);
    expect(progreso(t, 1200)).toBeCloseTo(0.5);
    expect(progreso(t, 2000)).toBe(1);
    expect(pendientes([t, { id: 'b', inicio: 1400, fin: 1800 }], 1500).map((x) => x.id)).toEqual(['b']);
  });
});

describe('qué es nuevo', () => {
  it('al abrir la pizarra no se anima nada (salvo si Claude la acaba de crear)', () => {
    expect(recibir(null, [forma('a')], [forma('a')], false).nuevos).toEqual([]);
    expect(recibir(null, [forma('a')], [forma('a')], true).nuevos.map((t) => t.id)).toEqual(['a']);
  });
  it('lo de Claude que llega después se anima; lo de Diego, no', () => {
    const { vistos } = recibir(null, [forma('a')], [forma('a')], false);
    const r = recibir(vistos, [forma('a'), forma('b'), forma('d', false)], [forma('a'), forma('b'), forma('d', false)], false);
    expect(r.nuevos.map((t) => t.id)).toEqual(['b']);
    expect(recibir(r.vistos, [forma('a'), forma('b')], [forma('a'), forma('b')], false).nuevos).toEqual([]);
  });
  it('lo que aparece primero en lo que ve Diego (pegar, duplicar una capa) no se anima al volver del programa local', () => {
    const { vistos } = recibir(null, [], [], false);
    const antes = recibir(vistos, [], [forma('copia')], false);
    expect(antes.nuevos).toEqual([]);
    expect(recibir(antes.vistos, [forma('copia')], [forma('copia')], false).nuevos).toEqual([]);
  });
});

describe('dibujar a medias', () => {
  it('cortarPorLargo sigue las líneas en orden hasta la fracción pedida', () => {
    const lineas = [[{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 10 }, { x: 100, y: 10 }]];
    expect(cortarPorLargo(lineas, 0)).toEqual([]);
    expect(cortarPorLargo(lineas, 0.75)).toEqual([lineas[0], [{ x: 0, y: 10 }, { x: 50, y: 10 }]]);
    expect(cortarPorLargo(lineas, 1)).toEqual(lineas);
  });
  it('la letra se escribe letra a letra', () => {
    const t = letra('t', 'ab');
    expect(lineasParciales(t, 0.5)).toEqual(letrasDe(t)[0]);
    expect(lineasParciales(t, 1)).toEqual(letrasDe(t).flat());
  });
  it('el lápiz a medias conserva sus primeros puntos y su presión', () => {
    const t = lapiz('l', 100);
    expect(lapizParcial(t, 0.5)).toMatchObject({ puntos: [0, 0, 50, 0], presion: [0.2, 0.5] });
    expect(lapizParcial(t, 1)).toBe(t);
  });
});
```

Crea `src/estudio/dibujoSvg.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { figuraDe, figuraParcial } from './dibujoSvg';
import { validarTrazo } from './tinta';

describe('figuraParcial', () => {
  const linea = validarTrazo({ id: 'a', herramienta: 'linea', color: '#b8603d', grosor: 4, puntos: [0, 0, 100, 0] }, 't');
  it('a medias, la línea llega hasta la mitad; entera, como siempre', () => {
    expect(figuraParcial(linea, 0.5)).toEqual({ d: 'M0 0 L50 0', relleno: false });
    expect(figuraParcial(linea, 1)).toEqual(figuraDe(linea));
  });
  it('el lápiz a medias sigue siendo un contorno relleno', () => {
    const lapiz = validarTrazo({ id: 'l', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 50, 0, 100, 0] }, 't');
    expect(figuraParcial(lapiz, 0.5).relleno).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/animacion.test.ts src/estudio/dibujoSvg.test.ts`
Expected: FAIL (no existen `./animacion` ni `figuraParcial`)

- [ ] **Step 3: Escribir `animacion.ts`**

Crea `src/estudio/animacion.ts`:

```ts
import type { Punto } from './geometria';
import { esLibre, letrasDe, polilineas, type Trazo } from './tinta';

// Animación de lo que dibuja Claude: qué es nuevo, en qué orden, cuánto dura y cómo se ve a medias.
// La pantalla (useAnimacion y CapaTinta) solo pregunta aquí. Diseño: 2026-09-27-dibujo-a-mano-parte-2-design.md, sección 5.

export const TOPE_LOTE = 8000; // lo que llega junto no tarda más de 8 s
export const DURACION_FORMA = 400;
export const TOPE_LAPIZ = 600;
export const LETRAS_POR_SEGUNDO = 12;
const VELOCIDAD_LAPIZ = 1.5; // píxeles de la pizarra por milisegundo
const MINIMO_LAPIZ = 120;

export interface Tramo { id: string; inicio: number; fin: number }

const largoDe = (l: Punto[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : 0), 0);

export function duracion(t: Trazo): number {
  if (t.herramienta === 'letra') return (Math.max(1, letrasDe(t).length) * 1000) / LETRAS_POR_SEGUNDO;
  if (esLibre(t.herramienta)) {
    const largo = polilineas(t).reduce((s, l) => s + largoDe(l), 0);
    return Math.min(TOPE_LAPIZ, Math.max(MINIMO_LAPIZ, largo / VELOCIDAD_LAPIZ));
  }
  return DURACION_FORMA;
}

// Los trazos que acaban de llegar juntos, a la cola: uno detrás de otro, en el orden del archivo, cuando acabe lo
// que ya se está animando (o ahora). Si juntos pasan de 8 s, se aceleran para caber en 8.
export function encolar(cola: Tramo[], nuevos: Trazo[], ahora: number): Tramo[] {
  if (!nuevos.length) return cola;
  const ds = nuevos.map(duracion);
  const total = ds.reduce((a, b) => a + b, 0);
  const f = total > TOPE_LOTE ? TOPE_LOTE / total : 1;
  let t = Math.max(ahora, ...cola.map((x) => x.fin));
  return [
    ...cola,
    ...nuevos.map((tr, i) => {
      const inicio = t;
      t += ds[i] * f;
      return { id: tr.id, inicio, fin: t };
    }),
  ];
}

export const progreso = (tramo: Tramo, ahora: number) =>
  ahora <= tramo.inicio ? 0 : ahora >= tramo.fin ? 1 : (ahora - tramo.inicio) / (tramo.fin - tramo.inicio);

export const pendientes = (cola: Tramo[], ahora: number) => cola.filter((x) => x.fin > ahora);

// Llega una versión de la pizarra. `externos`: los trazos tal y como llegan; `propios`: los que ve Diego (con lo suyo aún
// sin guardar). Nuevos son los de Claude que llegan y no se habían visto. Lo que aparece antes en `propios` lo ha hecho
// Diego (pegar, duplicar una capa): se da por visto. La primera vez (vistos = null) no hay nada nuevo, salvo si
// `animarPrimera` (Claude acaba de crear la pizarra).
export function recibir(vistos: ReadonlySet<string> | null, externos: Trazo[], propios: Trazo[], animarPrimera: boolean): { vistos: Set<string>; nuevos: Trazo[] } {
  const nuevos = vistos || animarPrimera ? externos.filter((t) => t.autor === 'claude' && !vistos?.has(t.id)) : [];
  const v = new Set(vistos);
  for (const t of externos) v.add(t.id);
  for (const t of propios) v.add(t.id);
  return { vistos: v, nuevos };
}

// Las líneas recorridas hasta la fracción f de su largo total, en orden, como las dibujaría un lápiz.
export function cortarPorLargo(lineas: Punto[][], f: number): Punto[][] {
  if (f >= 1) return lineas;
  let queda = Math.max(0, f) * lineas.reduce((s, l) => s + largoDe(l), 0);
  const r: Punto[][] = [];
  for (const l of lineas) {
    if (queda <= 0) break;
    const parte: Punto[] = [l[0]];
    for (let i = 1; i < l.length && queda > 0; i++) {
      const a = l[i - 1];
      const b = l[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= queda) {
        parte.push(b);
        queda -= d;
      } else {
        const k = queda / d;
        parte.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        queda = 0;
      }
    }
    if (parte.length > 1) r.push(parte);
  }
  return r;
}

// Un trazo que no es lápiz, dibujado hasta la fracción f. La letra, letra a letra (y cada letra, trazo a trazo).
export function lineasParciales(t: Trazo, f: number): Punto[][] {
  if (t.herramienta !== 'letra') return cortarPorLargo(polilineas(t), f);
  const letras = letrasDe(t);
  if (f >= 1) return letras.flat();
  const k = Math.max(0, f) * letras.length;
  const enteras = Math.floor(k);
  return [...letras.slice(0, enteras).flat(), ...(enteras < letras.length ? cortarPorLargo(letras[enteras], k - enteras) : [])];
}

// El lápiz a medias: sus primeros puntos (con su presión), para que se dibuje igual que entero.
export function lapizParcial(t: Trazo, f: number): Trazo {
  if (f >= 1) return t;
  const n = t.puntos.length / 2;
  const k = Math.max(1, Math.min(n, Math.ceil(Math.max(0, f) * n)));
  return { ...t, puntos: t.puntos.slice(0, k * 2), ...(t.presion ? { presion: t.presion.slice(0, k) } : {}) };
}
```

- [ ] **Step 4: Añadir `figuraParcial` a `dibujoSvg.ts`**

En `src/estudio/dibujoSvg.ts`, cambia los imports por:

```ts
import { getStroke } from 'perfect-freehand';
import { lapizParcial, lineasParciales } from './animacion';
import type { Punto } from './geometria';
import { pares, polilineas, type Trazo } from './tinta';
```

y añade al final:

```ts
// Un trazo dibujado hasta la fracción f (0 a 1), para la animación.
export function figuraParcial(t: Trazo, f: number): { d: string; relleno: boolean } {
  if (f >= 1) return figuraDe(t);
  if (t.herramienta === 'lapiz') return figuraDe(lapizParcial(t, f));
  return { d: lineasParciales(t, f).map(camino).join(' '), relleno: false };
}
```

- [ ] **Step 5: Ejecutar para ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/animacion.test.ts src/estudio/dibujoSvg.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/estudio/animacion.ts src/estudio/animacion.test.ts src/estudio/dibujoSvg.ts src/estudio/dibujoSvg.test.ts
git commit -m "Animación: qué es nuevo, cola de 8 s como mucho y trazos a medias"
echo "Task 4: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 5: La animación en la pantalla

**Files:**
- Create: `src/componentes/estudio/useAnimacion.ts`
- Modify: `src/componentes/estudio/CapaTinta.tsx`
- Modify: `src/componentes/estudio/Pizarra.tsx`
- Modify: `src/componentes/estudio/EstudioLocal.tsx`
- Test: `src/componentes/estudio/CapaTinta.test.tsx`, `src/componentes/estudio/Pizarra.test.tsx`

**Interfaces:**
- Consumes: `recibir`, `encolar`, `pendientes`, `progreso`, `type Tramo` (Tarea 4); `figuraParcial` (Tarea 4).
- Produces:
  - `export function useAnimacion(externos: Trazo[], propios: Trazo[], animarPrimera: boolean): ReadonlyMap<string, number>`: por dónde va cada trazo que se está animando (0 = aún no se ve). Los que no están en el mapa se dibujan enteros.
  - `CapaTinta` gana la prop opcional `progreso?: ReadonlyMap<string, number>`.
  - `Pizarra` gana la prop opcional `animarAlAbrir?: boolean`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/componentes/estudio/CapaTinta.test.tsx`, añade dentro del `describe`:

```ts
  it('un trazo que aún espera su turno no se ve; a medias, se ve un trozo', () => {
    const linea = validarTrazo({ id: 'a', herramienta: 'linea', color: '#3b82f6', grosor: 4, puntos: [0, 0, 100, 0] }, 't');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map([['a', 0]])} />)).not.toContain('<path');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map([['a', 0.5]])} />)).toContain('d="M0 0 L50 0"');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map()} />)).toContain('d="M0 0 L100 0"');
  });
```

En `src/componentes/estudio/Pizarra.test.tsx`, añade dentro del `describe`:

```ts
  it('al abrirla, lo de Claude se ve entero (la animación solo empieza después)', () => {
    const conClaude = validarPizarra({
      version: 2, titulo: 'x', piezas: [], flechas: [],
      trazos: [{ id: 'c1', herramienta: 'letra', texto: 'Hola', x: 0, y: 40, tamano: 30, color: '#3b82f6', autor: 'claude' }],
    }).pizarra;
    const html = renderToString(<Pizarra pizarra={conClaude} imagen={async () => ''} clave="k" origen="o" animarAlAbrir />);
    expect(html).toContain('stroke="#3b82f6"');
  });
```

(En `renderToString` no corren los efectos: la prueba comprueba que el primer dibujo no esconde nada y que la prop existe. La lógica de qué se anima ya tiene sus pruebas en la Tarea 4.)

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/CapaTinta.test.tsx src/componentes/estudio/Pizarra.test.tsx`
Expected: FAIL (el `progreso` se ignora y el trazo con 0 sale; y un error de tipos por `animarAlAbrir`, que Vitest no comprueba: lo verá `npm run build` en el paso 7)

- [ ] **Step 3: Escribir el hook**

Crea `src/componentes/estudio/useAnimacion.ts`:

```ts
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { encolar, pendientes, progreso, recibir, type Tramo } from '../../estudio/animacion';
import type { Trazo } from '../../estudio/tinta';

const reducirMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Anima los trazos de Claude que llegan con la pizarra abierta. Devuelve por dónde va cada uno (0 = aún no se ve);
// los que no están se dibujan enteros. useLayoutEffect: lo nuevo se esconde antes de pintarse entero en pantalla.
export function useAnimacion(externos: Trazo[], propios: Trazo[], animarPrimera: boolean): ReadonlyMap<string, number> {
  const vistos = useRef<Set<string> | null>(null);
  const [cola, setCola] = useState<Tramo[]>([]);
  const [ahora, setAhora] = useState(0);

  useLayoutEffect(() => {
    const r = recibir(vistos.current, externos, propios, animarPrimera);
    vistos.current = r.vistos;
    if (!r.nuevos.length || reducirMovimiento()) return;
    const t0 = performance.now();
    setAhora(t0);
    setCola((c) => encolar(pendientes(c, t0), r.nuevos, t0));
  }, [externos, propios, animarPrimera]);

  // Un fotograma cada vez, mientras quede algo por dibujar.
  useEffect(() => {
    if (!cola.length) return;
    const id = requestAnimationFrame((t) => {
      setAhora(t);
      setCola((c) => {
        const quedan = pendientes(c, t);
        return quedan.length === c.length ? c : quedan;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [cola, ahora]);

  return useMemo(() => new Map(cola.map((x) => [x.id, progreso(x, ahora)])), [cola, ahora]);
}
```

- [ ] **Step 4: Dibujar a medias en `CapaTinta`**

Sustituye `src/componentes/estudio/CapaTinta.tsx` por:

```tsx
import { memo } from 'react';
import { figuraParcial } from '../../estudio/dibujoSvg';
import type { Trazo } from '../../estudio/tinta';

// memo: al dibujar solo cambia el trazo nuevo; los demás no se vuelven a calcular.
// `parte`: por dónde va la animación (0 = aún no se ve, 1 = entero).
const TrazoSvg = memo(function TrazoSvg({ trazo, parte = 1 }: { trazo: Trazo; parte?: number }) {
  if (parte <= 0) return null;
  const f = figuraParcial(trazo, parte);
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
export function CapaTinta({ subrayados, trazos, progreso }: { subrayados: Trazo[]; trazos: Trazo[]; progreso?: ReadonlyMap<string, number> }) {
  if (!subrayados.length && !trazos.length) return null;
  return (
    <svg className="tinta" width="1" height="1" overflow="visible" aria-hidden>
      {subrayados.length > 0 && (
        <g className="subrayados">
          {subrayados.map((t) => <TrazoSvg key={t.id} trazo={t} parte={progreso?.get(t.id)} />)}
        </g>
      )}
      {trazos.map((t) => <TrazoSvg key={t.id} trazo={t} parte={progreso?.get(t.id)} />)}
    </svg>
  );
}
```

- [ ] **Step 5: Usarlo en `Pizarra.tsx`**

En `src/componentes/estudio/Pizarra.tsx`:

1. Añade el import junto a los demás de `./`: `import { useAnimacion } from './useAnimacion';`
2. En `interface Props`, después de `foto?: …`, añade:

```ts
  animarAlAbrir?: boolean; // Claude acaba de crear esta pizarra: lo suyo se anima también al abrirla
```

3. En la firma de `Pizarra`, añade `animarAlAbrir = false` a la lista desestructurada (después de `foto`).
4. Justo después de la línea `const puedeDibujar = …`, añade:

```ts
  // Lo que Claude dibuja con la pizarra abierta aparece animado (los trazos, no las piezas).
  const animando = useAnimacion(pizarra.trazos, vistaPizarra.trazos, animarAlAbrir);
```

5. Cambia `<CapaTinta subrayados={g.subrayados} trazos={g.trazos} />` por `<CapaTinta subrayados={g.subrayados} trazos={g.trazos} progreso={animando} />`.

- [ ] **Step 6: Animar la pizarra que Claude acaba de crear (`EstudioLocal.tsx`)**

En `src/componentes/estudio/EstudioLocal.tsx`:

1. Junto a `const [abierta, setAbierta] = useState<number | null>(null);`, añade:

```ts
  // La pizarra que Claude acaba de crear (conversación-número): al abrirse sola, lo que ha dibujado se anima.
  const [recienCreada, setRecienCreada] = useState<string | null>(null);
```

2. Sustituye `recargarPizarras` por:

```ts
  const recargarPizarras = useCallback(async (id: string, alAbrir = false) => {
    const lista = await leerPizarras(asignatura.id, id).catch(() => null);
    if (!lista) return;
    setPizarras(lista);
    // Si Claude crea una pizarra nueva, se abre sola (y lo que ha dibujado en ella se anima).
    if (lista.length > cuantas.current) {
      setAbierta(lista.at(-1)!.n);
      if (!alAbrir) setRecienCreada(`${id}-${lista.at(-1)!.n}`);
    }
    cuantas.current = lista.length;
  }, [asignatura.id]);
```

3. En `abrir`, cambia `await recargarPizarras(id);` por `await recargarPizarras(id, true);`.
4. En el `<Pizarra … />` de la zona de estudio (el que tiene `key={`${conv.id}-${actual.n}`}`), añade la prop:

```tsx
                animarAlAbrir={recienCreada === `${conv.id}-${actual.n}`}
```

- [ ] **Step 7: Ejecutar las pruebas, toda la batería y los tipos**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/CapaTinta.test.tsx src/componentes/estudio/Pizarra.test.tsx && npm test && npm run build`
Expected: todo en verde y la compilación sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/componentes/estudio/useAnimacion.ts src/componentes/estudio/CapaTinta.tsx src/componentes/estudio/CapaTinta.test.tsx src/componentes/estudio/Pizarra.tsx src/componentes/estudio/Pizarra.test.tsx src/componentes/estudio/EstudioLocal.tsx
git commit -m "Pizarra: lo que dibuja Claude aparece animado"
echo "Task 5: Ruling: una pizarra que Claude acaba de crear (se abre sola) anima lo suyo al abrirse; el diseño solo decía que al abrir no se anima — coste si está mal: una espera de hasta 8 s en una pizarra nueva" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
echo "Task 5: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 6: Instrucciones de Claude y documentación

**Files:**
- Modify: `local/instrucciones-estudio.md`
- Modify: `docs/diseno.md` (línea de la v1.4 sobre `trazos`, hacia la línea 174)
- Modify: `AGENTS.md` (estructura del código y estado)
- Test: `local/instrucciones.test.ts` si existe una prueba que lea las instrucciones (búscala con `grep -rln "instrucciones-estudio" local src`); si no, ninguna.

**Interfaces:**
- Consumes: el formato de `letra` (Tarea 3).

- [ ] **Step 1: Cambiar las instrucciones de Claude**

En `local/instrucciones-estudio.md`:

1. Sustituye la línea que empieza por `- La pizarra puede tener \`capas\`, \`trazos\`` por:

```md
- La pizarra puede tener `capas`, `trazos` (dibujos a mano) y un campo `capa` en las piezas. Los trazos sin `autor` son de Diego: no los cambies ni los borres. Los tuyos llevan `"autor": "claude"` y van solos a tu capa, «Claude»; esos sí puedes cambiarlos o borrarlos. Tus piezas nuevas no necesitan `capa`. Deja `version` como esté; si añades trazos, pon `"version": 2`.
```

2. Justo antes de la línea `- Reparte las piezas por el lienzo`, añade:

```md
- **Dibujar y escribir a mano.** Por defecto usa textos, fórmulas y gráficas. Dibuja a mano cuando se explique mejor: esquemas y diagramas, rodear o subrayar algo, flechas entre ideas y, sobre todo, corregir encima del ejercicio de Diego (en la foto ves dónde está cada cosa; «Zona de la foto» te dice sus coordenadas en la pizarra). Tus trazos van en la lista `trazos`, cada uno en una línea, con `"autor": "claude"`:
  - Formas: `{ "id": "c1", "herramienta": "flecha", "color": "#b8603d", "grosor": 3, "puntos": [x1, y1, x2, y2], "autor": "claude" }`. `herramienta`: `linea`, `flecha`, `rectangulo` o `elipse` (dos puntos: principio y final, o dos esquinas opuestas).
  - A mano alzada: `"herramienta": "lapiz"` con muchos puntos `[x, y, x, y…]` (para rodear algo, haz una curva cerrada con 20 o 30 puntos).
  - Letra a mano: `{ "id": "c7", "herramienta": "letra", "texto": "dy/dx = 2x", "x": 300, "y": 180, "tamano": 28, "color": "#b8603d", "autor": "claude" }`. Una línea de texto (hasta 200 letras); `x`, `y` es donde empieza la línea base (abajo a la izquierda de la primera letra) y `tamano`, el alto de las mayúsculas (20 a 40 va bien). Sabe letras con tildes y ñ, números, `+ − = × ÷ / ^ ( ) < > ² ³ ± %` y `∫ √ π ∞ ≤ ≥ ≠ → Δ θ α β λ ∑`. Para varias líneas, un trazo por línea (baja `tamano × 1,6` cada vez). Para fórmulas complicadas (fracciones grandes, matrices, integrales con límites) usa una pieza `formula`.
  - Colores: `#b8603d` (tu color), `#3b82f6` (azul), `#16a34a` (verde) y `#dc2626` (rojo, para corregir). Grosor 3 o 4.
  - Diego ve aparecer tus trazos animados, en el orden en que están en el archivo. Si el dibujo tiene varios pasos, escríbelos en varios `Edit` seguidos (primero el esquema, luego las flechas, luego las etiquetas).
  - Ids: `c1`, `c2`… sin repetir ninguno de la pizarra (ni de piezas, ni de flechas, ni de trazos).
```

3. En el ejemplo de formato (el bloque JSON), no cambies nada: sigue siendo válido.

- [ ] **Step 2: Comprobar que las instrucciones siguen cargando**

Run: `grep -rln "instrucciones-estudio" local src`
Si hay una prueba que las lea, ejecútala: `export PATH="$PATH:/c/Program Files/nodejs"; npm test`
Expected: todo en verde.

- [ ] **Step 3: Documentación**

1. En `docs/diseno.md`, en la línea de la v1.4 que explica `trazos` (empieza por `- Desde la v1.4, una pizarra puede tener \`capas\``), cambia `\`herramienta\` = \`lapiz\` | \`subrayador\` | \`linea\` | \`flecha\` | \`rectangulo\` | \`elipse\`` por `\`herramienta\` = \`lapiz\` | \`subrayador\` | \`linea\` | \`flecha\` | \`rectangulo\` | \`elipse\` | \`letra\``, y añade al final de esa línea:

```md
 La herramienta `letra` (letra a mano de Claude, v1.4 parte 2) no lleva `puntos` sino `texto` (una línea, 1-200 caracteres), `x`, `y` (principio de la línea base), `tamano` (alto de las mayúsculas, 8-200) y `grosor` opcional (por defecto 3); la app la dibuja con la letra EMS Readability (`src/estudio/letraMano.ts`). Detalle en `docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md`, sección 5.
```

2. En `AGENTS.md`, en la línea `- Dibujo a mano (v1.4): …`, añade al final: ` Entrega 2: \`letraMano.ts\` y \`letraMano.datos.ts\` (letra a mano; los datos los genera \`npm run letra\` con \`scripts/letraMano.ts\` a partir de \`scripts/fuentes/\`), \`animacion.ts\` (qué se anima y cómo); pantalla: \`useAnimacion.ts\`.`

3. En `AGENTS.md`, sección «Estado actual», después del punto de la entrega 1, añade:

```md
- **Versión 1.4, parte 2, entrega 2 hecha** (en la rama `v1.4-parte-2-entrega-2`, sin juntar en `main`): Claude dibuja con trazos de verdad (formas, lápiz) y escribe a mano (trazo `letra`, letra EMS Readability), y lo nuevo aparece animado. Plan: `docs/superpowers/plans/2026-09-28-dibujo-a-mano-parte-2-entrega-2.md`. Registro: `.superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md`.
  - **Siguiente:** Diego la prueba en la zona de estudio del PC (pedirle a Claude que corrija un ejercicio encima y que escriba a mano). Si va bien, se junta en `main` y se publica.
```

- [ ] **Step 4: Toda la batería y los tipos**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add local/instrucciones-estudio.md docs/diseno.md AGENTS.md
git commit -m "v1.4 parte 2, entrega 2: instrucciones de Claude (dibujar y letra a mano) y documentación"
echo "Task 6: complete" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

---

### Task 7: Prueba de Diego (a mano, no la hace un subagente)

- [ ] **Step 1: Arrancar la zona de estudio con la rama**

El acceso directo «Zona de estudio» del escritorio (o `npm run local`) arranca con el código de la rama. En una asignatura, pedirle a Claude:
1. «Escríbeme a mano la derivada de x² y rodéala» → tiene que salir la letra a mano, animada, y un círculo alrededor.
2. Hacer un ejercicio a mano con el lápiz, pulsar «👁 Enseñar la pizarra» y pedir «corrígemelo encima en rojo» → las marcas tienen que caer encima de lo escrito.
3. Pedirle un esquema con varias flechas → aparecen una detrás de otra, en menos de 8 s.
4. Cerrar la pizarra y volver a abrirla → todo sale dibujado al momento, y la letra igual que antes.
5. Con el lazo, mover una palabra suya copiada a una capa de Diego; con la goma, borrar media palabra.

- [ ] **Step 2: Apuntar el resultado**

```bash
echo "Task 7: prueba de Diego: <qué ha ido bien y qué no>" >> .superpowers/sdd/2026-09-28-dibujo-a-mano-parte-2-entrega-2/progress.md
```

Si va bien: juntar en `main` (`git checkout main && git merge --ff-only v1.4-parte-2-entrega-2`), publicar solo cuando Diego lo diga (`git push`), y sustituir «Dónde lo dejamos» en `my-context/proyectos/segundo-cerebro.md`. Recordarle a Diego que abra la app una vez en cada dispositivo después de publicar: una app antigua en caché ignora los trazos `letra` (con aviso) y, si reescribe esa pizarra del historial, los perdería.
