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
