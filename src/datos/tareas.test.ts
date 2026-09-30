import { describe, expect, it } from 'vitest';
import { parseTareas, serializarTareas, siguienteIdTarea } from './tareas';
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

describe('origen', () => {
  it('se lee y se vuelve a escribir', () => {
    const texto = '- id: t-1\n  titulo: Entrega\n  area: uni\n  origen: moodle:123@aula\n';
    const ts = parseTareas(texto);
    expect(ts[0].origen).toBe('moodle:123@aula');
    expect(serializarTareas(ts)).toContain('origen: moodle:123@aula');
  });
  it('tiene que ser texto', () => {
    expect(() => parseTareas('- id: t-1\n  titulo: X\n  area: uni\n  origen: 5\n')).toThrow('origen debe ser texto');
  });
});

describe('siguienteIdTarea', () => {
  it('sigue la numeración del día sin repetir', () => {
    expect(siguienteIdTarea('2026-09-30', [])).toBe('t-20260930-1');
    expect(siguienteIdTarea('2026-09-30', [{ id: 't-20260930-1' }, { id: 't-20260930-7' }, { id: 't-20260929-9' }])).toBe('t-20260930-8');
  });
});

describe('tipo, repetir mes/año y hasta', () => {
  const una = (extra: string) => parseTareas(`- id: t-1\n  titulo: X\n  area: uni\n${extra}`)[0];
  it('se leen', () => {
    expect(una('  tipo: evento\n  fecha: 2026-10-01\n  repetir: [lun, mie]\n  hasta: 2026-10-31\n')).toMatchObject({ tipo: 'evento', repetir: ['lun', 'mie'], hasta: '2026-10-31' });
    expect(una('  fecha: 2026-10-05\n  repetir: mes\n').repetir).toBe('mes');
    expect(una('  fecha: 2027-03-14\n  repetir: año\n').repetir).toBe('año');
  });
  it('una tarea antigua sin tipo sigue igual', () => {
    const t = una('  repetir: [vie]\n');
    expect(t.tipo).toBeUndefined();
    expect(t.repetir).toEqual(['vie']);
  });
  it('una versión antigua de la app puede dejar «hasta» sin repetir o anterior a la fecha: se lee igual (no rompe el archivo)', () => {
    expect(una('  hasta: 2026-10-31\n').hasta).toBe('2026-10-31');
    expect(una('  fecha: 2026-10-10\n  repetir: [lun]\n  hasta: 2026-10-01\n').hasta).toBe('2026-10-01');
  });
  it('errores', () => {
    expect(() => una('  tipo: cita\n')).toThrow('tipo debe ser');
    expect(() => una('  repetir: semana\n')).toThrow('repetir debe ser');
    expect(() => una('  repetir: mes\n')).toThrow('necesita fecha');
    expect(() => una('  repetir: [lun]\n  hasta: mañana\n')).toThrow('hasta debe tener');
  });
});
