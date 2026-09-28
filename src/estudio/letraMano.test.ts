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
    expect(caracteresQueFaltan('á')).toEqual([]);
    expect(letrasDeTexto('á', 0, 0, 30, 'x')).toHaveLength(1);
  });
});
