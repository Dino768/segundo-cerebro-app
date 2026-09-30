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

describe('codigo de la URJC', () => {
  it('se lee y se conserva al guardar', () => {
    const texto = 'asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n';
    const l = parseAsignaturas(texto);
    expect(l).toEqual([{ id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }]);
    expect(serializarAsignaturas(l)).toContain('codigo: "2327007"');
    expect(parseAsignaturas(serializarAsignaturas(l))).toEqual(l);
  });
  it('sin comillas (número) también vale', () => {
    expect(parseAsignaturas('asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: 2327007\n')[0].codigo).toBe('2327007');
  });
  it('sin codigo no aparece el campo', () => {
    const l = parseAsignaturas('asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n');
    expect('codigo' in l[0]).toBe(false);
    expect(serializarAsignaturas(l)).not.toContain('codigo');
  });
  it('un codigo que no son 7 cifras es un error', () => {
    expect(() => parseAsignaturas('asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "23A"\n')).toThrow('codigo');
  });
});
