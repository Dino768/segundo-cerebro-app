import { describe, expect, it } from 'vitest';
import { compilarExpresion, ErrorExpresion } from './expresion.ts';

const valor = (expr: string, x = 0) => compilarExpresion(expr)(x);

describe('compilarExpresion', () => {
  it('operaciones y prioridades', () => {
    expect(valor('x^2', 3)).toBe(9);
    expect(valor('2x+1', 2)).toBe(5);
    expect(valor('-x^2', 2)).toBe(-4);
    expect(valor('2^3^2')).toBe(512);
    expect(valor('(x+1)(x-1)', 3)).toBe(8);
    expect(valor('3·x', 2)).toBe(6);
    expect(valor('x**2', 2)).toBe(4);
    expect(valor('10/4')).toBe(2.5);
    expect(valor('2^-1')).toBe(0.5);
  });
  it('funciones y constantes', () => {
    expect(valor('sin(pi/2)')).toBeCloseTo(1);
    expect(valor('sqrt(x)', 4)).toBe(2);
    expect(valor('ln(e)')).toBeCloseTo(1);
    expect(valor('log(100)')).toBeCloseTo(2);
    expect(valor('abs(-3)')).toBe(3);
    expect(valor('2π')).toBeCloseTo(2 * Math.PI);
  });
  it('errores claros, y nunca ejecuta código', () => {
    for (const mala of ['', 'x+', 'sin x', 'foo(x)', 'x)', '2 $ 3', 'constructor', '(x+1', 'alert(1)'])
      expect(() => compilarExpresion(mala), mala).toThrow(ErrorExpresion);
  });
});
