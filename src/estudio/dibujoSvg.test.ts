import { describe, expect, it } from 'vitest';
import { figuraDe } from './dibujoSvg';
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
