// Convierte la letra de un solo trazo EMS Readability (scripts/fuentes/, licencia OFL) en src/estudio/letraMano.datos.ts.
// Se ejecuta a mano (npm run letra) solo si cambia la fuente o los símbolos de abajo; el resultado sí se sube.
import { readFileSync, writeFileSync } from 'node:fs';

type Glifo = { a: number; t: number[][] }; // avance y trazos [x, y, x, y…] (unidades de la fuente, y hacia arriba)

const svg = readFileSync(new URL('./fuentes/EMSReadability.svg', import.meta.url), 'utf8');
const entidades = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Las del diseño que trae la fuente.
const DE_LA_FUENTE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ¿¡?!0123456789 .,;:\'"()[]+-=×·÷/^_<>²³±%';

// Algunas letras que no usamos (ç, ß, £…) traen curvas: se saltan; las que usamos solo pueden tener M y L.
const DE_LA_FUENTE_SET = new Set([...DE_LA_FUENTE]);
const fuente = new Map<string, Glifo>();
for (const m of svg.matchAll(/<glyph\b([^>]*)\/>/g)) {
  const atributo = (n: string) => new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(m[1])?.[1];
  const u = atributo('unicode');
  if (u === undefined) continue;
  const letra = entidades(u);
  // Si no la usamos, saltamos sin analizar.
  if (!DE_LA_FUENTE_SET.has(letra)) continue;
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
