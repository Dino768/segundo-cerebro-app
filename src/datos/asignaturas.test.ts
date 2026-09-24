import { describe, expect, it } from 'vitest';
import { parseAsignaturas, serializarAsignaturas } from './asignaturas';

describe('asignaturas.yaml', () => {
  it('lee la lista', () => {
    expect(parseAsignaturas('asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n')).toEqual([
      { id: 'fisica', nombre: 'Física', color: '#3d7bb8' },
    ]);
  });
  it('vacío o sin lista → nada', () => {
    expect(parseAsignaturas('')).toEqual([]);
    expect(parseAsignaturas('asignaturas:\n')).toEqual([]);
  });
  it('errores claros', () => {
    expect(() => parseAsignaturas('- id: x\n')).toThrow(/asignaturas/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: general\n    nombre: G\n    color: "#000000"\n')).toThrow(/reservado/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: Fí sica\n    nombre: F\n    color: "#000000"\n')).toThrow(/id/);
    expect(() =>
      parseAsignaturas('asignaturas:\n  - id: a\n    nombre: A\n    color: "#000000"\n  - id: a\n    nombre: B\n    color: "#000000"\n'),
    ).toThrow(/repetido/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: a\n    nombre: A\n    color: #000000\n')).toThrow(/color/);
  });
  it('ida y vuelta', () => {
    const lista = [{ id: 'fisica', nombre: 'Física', color: '#3d7bb8' }];
    expect(parseAsignaturas(serializarAsignaturas(lista))).toEqual(lista);
  });
});
