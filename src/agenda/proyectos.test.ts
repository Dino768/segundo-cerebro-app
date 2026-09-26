import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../datos/proyectos';
import type { Tarea } from '../datos/tareas';
import { necesitaAvisoActivos, ordenarProyectos, progresoProyecto, soltarProyecto } from './proyectos';

const p = (x: Partial<Proyecto> & { id: string }): Proyecto => ({
  estado: 'idea', titulo: x.id, cuerpo: '', meta: {}, ...x,
});

describe('necesitaAvisoActivos', () => {
  const ps = [p({ id: 'a', estado: 'activo' }), p({ id: 'b', estado: 'activo' }), p({ id: 'c' })];
  it('avisa al activar un tercer proyecto', () => {
    expect(necesitaAvisoActivos(ps, 'c', 'activo')).toBe(true);
  });
  it('no avisa si el proyecto ya estaba activo', () => {
    expect(necesitaAvisoActivos(ps, 'a', 'activo')).toBe(false);
  });
  it('no avisa con menos de 2 activos', () => {
    expect(necesitaAvisoActivos(ps.slice(1), 'c', 'activo')).toBe(false);
  });
  it('no avisa si el nuevo estado no es activo', () => {
    expect(necesitaAvisoActivos(ps, 'c', 'parado')).toBe(false);
  });
});

describe('ordenarProyectos', () => {
  it('por estado, prioridad y título', () => {
    const r = ordenarProyectos([
      p({ id: 'fin', estado: 'terminado' }),
      p({ id: 'idea' }),
      p({ id: 'zeta', estado: 'activo' }),
      p({ id: 'alfa', estado: 'activo' }),
      p({ id: 'urgente', estado: 'activo', prioridad: 'alta' }),
      p({ id: 'parado', estado: 'parado' }),
    ]);
    expect(r.map((x) => x.id)).toEqual(['urgente', 'alfa', 'zeta', 'parado', 'idea', 'fin']);
  });
});

describe('progresoProyecto', () => {
  const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'uni', ...x });
  it('cuenta las tareas normales del proyecto y cuántas están hechas', () => {
    const ts = [
      t({ id: 'a', proyecto: 'juego', hecha: true }),
      t({ id: 'b', proyecto: 'juego' }),
      t({ id: 'c', proyecto: 'juego', repetir: ['lun'], hechas: ['2026-09-21'] }),
      t({ id: 'd', proyecto: 'otro', hecha: true }),
      t({ id: 'e' }),
    ];
    expect(progresoProyecto(ts, 'juego')).toEqual({ hechas: 1, total: 2 });
  });
  it('un proyecto sin tareas da 0 de 0', () => {
    expect(progresoProyecto([], 'juego')).toEqual({ hechas: 0, total: 0 });
  });
});

describe('soltarProyecto', () => {
  it('quita el proyecto solo a lo que era suyo y deja lo demás igual', () => {
    const xs = [{ id: 'a', proyecto: 'juego' }, { id: 'b', proyecto: 'otro' }, { id: 'c' }];
    expect(soltarProyecto(xs, 'juego')).toEqual([{ id: 'a' }, { id: 'b', proyecto: 'otro' }, { id: 'c' }]);
  });
});
