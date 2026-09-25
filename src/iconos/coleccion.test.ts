import { describe, expect, it } from 'vitest';
import { buscarIconos, type Coleccion } from './coleccion';

const COLECCION: Coleccion = {
  nodos: { 'music': [], 'music-off': [], 'piano': [], 'cube': [], 'box': [] },
  etiquetas: { 'music': ['sound'], 'music-off': ['sound'], 'piano': ['instrument'], 'cube': ['3d'], 'box': ['cube', 'package'] },
};

describe('buscarIconos', () => {
  it('busca en español con el diccionario (salen primero)', () => {
    expect(buscarIconos('música', COLECCION).slice(0, 2)).toEqual(['music', 'piano']);
  });
  it('busca en inglés por nombre y por etiquetas', () => {
    expect(buscarIconos('cube', COLECCION)).toEqual(['cube', 'box']);
    expect(buscarIconos('instrument', COLECCION)).toContain('piano');
  });
  it('sin colección busca solo en el diccionario', () => {
    expect(buscarIconos('piano', null)).toEqual(['piano']);
  });
  it('vacío → los del diccionario', () => {
    expect(buscarIconos('', null).length).toBeGreaterThan(10);
  });
  it('respeta el límite', () => {
    expect(buscarIconos('', COLECCION, 3)).toHaveLength(3);
  });
});
