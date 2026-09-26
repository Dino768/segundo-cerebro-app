import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guardarOpsPendientes, leerOpsPendientes, leerPizarraCache } from './cacheEstudio';

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  });
});

describe('caché del historial', () => {
  it('una pizarra guardada con el formato antiguo se abre con sus capas', () => {
    localStorage.setItem('sc-historial-fisica-a.json', JSON.stringify({ version: 1, titulo: 'x', piezas: [], flechas: [], guardarComo: null, guardadaEn: null }));
    expect(leerPizarraCache('fisica', 'a.json')?.capas.map((c) => c.id)).toEqual(['claude', 'capa-1']);
  });
  it('algo roto en la caché cuenta como vacío', () => {
    localStorage.setItem('sc-historial-fisica-a.json', '{"version": 9}');
    expect(leerPizarraCache('fisica', 'a.json')).toBeNull();
  });
  it('operaciones pendientes: se guardan y las que no valen se descartan', () => {
    guardarOpsPendientes('fisica', 'a.json', [{ tipo: 'borrar', id: 'x' }]);
    expect(leerOpsPendientes('fisica', 'a.json')).toEqual([{ tipo: 'borrar', id: 'x' }]);
    localStorage.setItem('sc-pendientes-fisica-a.json', '[{"tipo":"volar"},{"tipo":"borrar","id":"y"}]');
    expect(leerOpsPendientes('fisica', 'a.json')).toEqual([{ tipo: 'borrar', id: 'y' }]);
  });
});
