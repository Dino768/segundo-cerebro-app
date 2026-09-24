import { describe, expect, it } from 'vitest';
import { aMundo, encuadrar, puntoEnBorde, zoomEn } from './geometria';

describe('geometría de la pizarra', () => {
  const r = { x: 0, y: 0, w: 100, h: 50 };
  it('la flecha sale del borde de la pieza, no del centro', () => {
    expect(puntoEnBorde(r, { x: 500, y: 25 })).toEqual({ x: 100, y: 25 });
    expect(puntoEnBorde(r, { x: 50, y: -500 })).toEqual({ x: 50, y: 0 });
    expect(puntoEnBorde(r, { x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
  });
  it('encuadrar centra las piezas y no hace un zoom exagerado', () => {
    const v = encuadrar([r], 1000, 600);
    expect(v.escala).toBe(1.5);
    expect(v.x + (50 * v.escala)).toBeCloseTo(500);
    expect(v.y + (25 * v.escala)).toBeCloseTo(300);
    expect(encuadrar([], 1000, 600)).toEqual({ x: 40, y: 40, escala: 1 });
  });
  it('el zoom deja quieto el punto del ratón', () => {
    const v = { x: 10, y: 20, escala: 1 };
    const p = { x: 300, y: 200 };
    const antes = aMundo(v, p);
    const despues = aMundo(zoomEn(v, 2, p), p);
    expect(despues.x).toBeCloseTo(antes.x);
    expect(despues.y).toBeCloseTo(antes.y);
    expect(zoomEn(v, 1000, p).escala).toBe(4);
  });
});
