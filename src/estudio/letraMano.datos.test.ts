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
