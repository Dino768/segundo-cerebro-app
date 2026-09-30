import { describe, expect, it } from 'vitest';
import { parseVistos, serializarVistos } from './vistos.ts';

describe('uni-sincronizacion.yaml', () => {
  it('sin archivo o vacío → nada visto', () => {
    expect(parseVistos(null)).toEqual({});
    expect(parseVistos('')).toEqual({});
    expect(parseVistos('vistos:\n')).toEqual({});
  });
  it('ida y vuelta', () => {
    const v = {
      'urjc-examen:2026-27:2327007:E:AM': { fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204' },
      'moodle:1@aula': { fecha: '2026-10-05', hora: '23:59' },
    };
    // La hora tiene que volver como texto '09:00', no como número.
    expect(parseVistos(serializarVistos(v))).toEqual(v);
  });
  it('un archivo mal hecho es un error (no se sincroniza a ciegas)', () => {
    expect(() => parseVistos('- a\n- b\n')).toThrow('vistos');
    expect(() => parseVistos('vistos:\n  x:\n    fecha: mañana\n')).toThrow('fecha');
  });
});
