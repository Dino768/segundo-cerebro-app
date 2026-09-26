import { describe, expect, it } from 'vitest';
import { INICIALES, leerHerramientas, leerOcultas } from './herramientas';

describe('herramientas', () => {
  it('lee lo guardado y rellena lo que falte o esté mal', () => {
    expect(leerHerramientas(null)).toEqual(INICIALES);
    expect(leerHerramientas('no es json')).toEqual(INICIALES);
    expect(leerHerramientas(JSON.stringify({ herramienta: 'lapiz', color: '#FF0000', grosor: 'enorme', borrador: 'goma' })))
      .toEqual({ ...INICIALES, herramienta: 'lapiz', color: '#ff0000', borrador: 'goma' });
  });
  it('capas ocultas', () => {
    expect(leerOcultas('["capa-1", 3]')).toEqual(['capa-1']);
    expect(leerOcultas(null)).toEqual([]);
  });
});
