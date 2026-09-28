import { describe, expect, it } from 'vitest';
import { figuraDe, figuraParcial } from './dibujoSvg';
import { validarTrazo } from './tinta';

const t = (herramienta: string, puntos: number[], extra: Record<string, unknown> = {}) =>
  validarTrazo({ id: 'd', herramienta, color: '#000000', grosor: 4, puntos, ...extra }, 't');

describe('figuraDe', () => {
  it('el lápiz es un contorno relleno (grosor variable)', () => {
    const f = figuraDe(t('lapiz', [0, 0, 20, 5, 40, 0], { presion: [0.2, 0.8, 0.4] }));
    expect(f.relleno).toBe(true);
    expect(f.d).toMatch(/^M-?[\d.]+ -?[\d.]+ L/);
    expect(f.d.endsWith('Z')).toBe(true);
  });
  it('el subrayador y las formas son líneas', () => {
    expect(figuraDe(t('subrayador', [0, 0, 20, 5, 40, 0]))).toEqual({ relleno: false, d: 'M0 0 L20 5 L40 0' });
    expect(figuraDe(t('flecha', [0, 0, 40, 0])).d.match(/M/g)).toHaveLength(2);
  });
});

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
