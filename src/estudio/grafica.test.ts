import { describe, expect, it } from 'vitest';
import { compilarExpresion } from './expresion.ts';
import { marcas, muestrear } from './grafica';

describe('muestrear', () => {
  it('una curva continua es un solo tramo', () => {
    const t = muestrear(compilarExpresion('x^2'), [-3, 3], [-1, 9]);
    expect(t).toHaveLength(1);
    expect(t[0][0]).toEqual({ x: -3, y: 9 });
  });
  it('1/x se parte en dos tramos', () => {
    expect(muestrear(compilarExpresion('1/x'), [-2, 2], [-5, 5])).toHaveLength(2);
  });
  it('sqrt(x) solo existe a partir de 0', () => {
    const t = muestrear(compilarExpresion('sqrt(x)'), [-2, 2], [-1, 2]);
    expect(t).toHaveLength(1);
    expect(t[0][0].x).toBeGreaterThanOrEqual(0);
  });
});

describe('marcas', () => {
  it('números redondos para los ejes', () => {
    expect(marcas(-3, 3)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(marcas(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(marcas(0, 1)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});
