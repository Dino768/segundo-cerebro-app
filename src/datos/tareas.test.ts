import { describe, expect, it } from 'vitest';
import { parseTareas, serializarTareas } from './tareas';
import { ErrorDatos } from './yaml';

const EJEMPLO = `- id: t-20260923-1
  titulo: Ir a entrenar
  area: salud
  hora: "18:00"
  repetir: [lun, mie, vie]
  hechas: [2026-09-21]

- id: t-20260923-2
  titulo: Entregar práctica 1 de Programación
  area: uni
  prioridad: alta
  fecha: 2026-10-05

- id: t-20260923-3
  titulo: Aprender retopología en Blender
  area: videojuegos
  prioridad: alta
`;

function errorDe(texto: string): ErrorDatos {
  try {
    parseTareas(texto);
  } catch (e) {
    if (e instanceof ErrorDatos) return e;
    throw e;
  }
  throw new Error('no lanzó ErrorDatos');
}

describe('parseTareas', () => {
  it('lee el ejemplo del diseño', () => {
    const ts = parseTareas(EJEMPLO);
    expect(ts).toHaveLength(3);
    expect(ts[0]).toEqual({
      id: 't-20260923-1', titulo: 'Ir a entrenar', area: 'salud', hora: '18:00',
      repetir: ['lun', 'mie', 'vie'], hechas: ['2026-09-21'],
    });
    expect(ts[1].fecha).toBe('2026-10-05');
    expect(ts[2].prioridad).toBe('alta');
  });

  it('un archivo vacío o con [] es una lista vacía', () => {
    expect(parseTareas('')).toEqual([]);
    expect(parseTareas('  \n')).toEqual([]);
    expect(parseTareas('[]\n')).toEqual([]);
  });

  it('los campos opcionales vacíos cuentan como ausentes', () => {
    expect(parseTareas('- id: a\n  titulo: X\n  area: uni\n  fecha:\n')[0]).toEqual({ id: 'a', titulo: 'X', area: 'uni' });
  });

  it('YAML mal escrito da la línea del error', () => {
    const e = errorDe('- id: a\n  titulo: [sin cerrar\n  area: uni\n');
    expect(e.archivo).toBe('agenda/tareas.yaml');
    expect(e.linea).toBeGreaterThan(0);
    expect(e.message).toContain('línea');
  });

  it('rechaza lo que no es una lista', () => {
    expect(errorDe('titulo: suelto\n').message).toContain('lista');
  });

  it.each([
    ['- titulo: X\n  area: uni\n', 'id'],
    ['- id: a\n  area: uni\n', 'titulo'],
    ['- id: a\n  titulo: X\n', 'area'],
    ['- id: a\n  titulo: X\n  area: uni\n  prioridad: urgente\n', 'prioridad'],
    ['- id: a\n  titulo: X\n  area: uni\n  fecha: 2026-02-30\n', 'fecha'],
    ['- id: a\n  titulo: X\n  area: uni\n  hora: "7:00"\n', 'hora'],
    ['- id: a\n  titulo: X\n  area: uni\n  repetir: [lunes]\n', 'repetir'],
    ['- id: a\n  titulo: X\n  area: uni\n- id: a\n  titulo: Y\n  area: uni\n', 'repetido'],
  ])('valida los campos: %j', (texto, palabra) => {
    const e = errorDe(texto);
    expect(e.message).toContain(palabra);
    expect(e.message).toMatch(/tarea \d/);
  });

  it('lee el icono y rechaza uno que no es texto', () => {
    expect(parseTareas('- id: a\n  titulo: A\n  area: uni\n  icono: cube\n')[0].icono).toBe('cube');
    expect(() => parseTareas('- id: a\n  titulo: A\n  area: uni\n  icono: 3\n')).toThrow(/icono/);
  });
});

describe('serializarTareas', () => {
  it('ida y vuelta sin perder campos desconocidos ni acentos', () => {
    const texto = '- id: a\n  titulo: Cálculo ñ 🎮\n  area: uni\n  inventado: 42\n';
    const ts = parseTareas(texto);
    expect(parseTareas(serializarTareas(ts))).toEqual(ts);
    expect((ts[0] as unknown as Record<string, unknown>).inventado).toBe(42);
  });

  it('omite los campos undefined', () => {
    expect(serializarTareas([{ id: 'a', titulo: 'X', area: 'uni', fecha: undefined }])).not.toContain('fecha');
  });

  it('una lista vacía se guarda como []', () => {
    expect(serializarTareas([])).toBe('[]\n');
  });
});
