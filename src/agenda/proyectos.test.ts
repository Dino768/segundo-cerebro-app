import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../datos/proyectos';
import { necesitaAvisoActivos, ordenarProyectos } from './proyectos';

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
