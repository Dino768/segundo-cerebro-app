import { describe, expect, it } from 'vitest';
import { aplicarEvento } from './chat';
import type { Mensaje } from './tipos';

const base: Mensaje[] = [{ rol: 'diego', texto: 'Hola' }];

describe('aplicarEvento', () => {
  it('el texto de Claude se va juntando en un mismo mensaje', () => {
    const a = aplicarEvento(base, { tipo: 'texto', texto: 'Ho' });
    const b = aplicarEvento(a, { tipo: 'texto', texto: 'la' });
    expect(b).toEqual([...base, { rol: 'claude', texto: 'Hola' }]);
  });
  it('una herramienta corta el mensaje y el texto siguiente empieza otro, sin líneas en blanco delante', () => {
    let ms = aplicarEvento(base, { tipo: 'texto', texto: 'Mira' });
    ms = aplicarEvento(ms, { tipo: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' });
    ms = aplicarEvento(ms, { tipo: 'texto', texto: '\n\n' });
    ms = aplicarEvento(ms, { tipo: 'texto', texto: 'Ya está' });
    expect(ms).toEqual([
      ...base,
      { rol: 'claude', texto: 'Mira' },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' },
      { rol: 'claude', texto: 'Ya está' },
    ]);
  });
  it('fin y error no cambian los mensajes', () => {
    expect(aplicarEvento(base, { tipo: 'fin' })).toBe(base);
    expect(aplicarEvento(base, { tipo: 'error', mensaje: 'x' })).toBe(base);
  });
});
