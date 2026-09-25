import { beforeEach, describe, expect, it, vi } from 'vitest';
import { leerCache } from './cache';

const almacen = new Map<string, string>();
beforeEach(() => {
  almacen.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
});

describe('leerCache', () => {
  it('descarta las ideas guardadas con el formato antiguo de la bandeja', () => {
    almacen.set('sc-datos', JSON.stringify({
      tareas: [], areas: [], proyectos: [], asignaturas: [],
      ideas: [{ tipo: 'otra', texto: '# Bandeja' }, { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'X' } }, { id: 'i-1', fecha: '2026-09-25', texto: 'Buena' }],
    }));
    expect(leerCache()?.ideas).toEqual([{ id: 'i-1', fecha: '2026-09-25', texto: 'Buena' }]);
  });
  it('las áreas antiguas (sin subareas) se leen con subareas vacías', () => {
    almacen.set('sc-datos', JSON.stringify({ areas: [{ id: 'uni', nombre: 'Uni', color: '#3b82f6' }] }));
    expect(leerCache()?.areas).toEqual([{ id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] }]);
  });
});
