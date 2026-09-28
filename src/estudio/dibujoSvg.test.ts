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
