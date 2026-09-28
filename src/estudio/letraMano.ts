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
