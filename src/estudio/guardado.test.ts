import { describe, expect, it, vi } from 'vitest';
import { guardarYMarcar } from './guardado';
import { pizarraVacia } from './pizarra';

const p = { ...pizarraVacia('Newton'), guardarComo: 'Newton' };

describe('guardarYMarcar', () => {
  it('sube y marca: hecho', async () => {
    const r = await guardarYMarcar(p, null, { subir: async () => 'estudios/fisica/pizarras/a.json', marcar: async () => true });
    expect(r).toEqual({ estado: 'hecho', ruta: 'estudios/fisica/pizarras/a.json' });
  });
  it('si no se puede marcar como guardada, queda pendiente y recuerda la ruta (no se vuelve a subir como nueva)', async () => {
    const r = await guardarYMarcar(p, null, { subir: async () => 'estudios/fisica/pizarras/a.json', marcar: async () => false });
    expect(r).toEqual({ estado: 'pendiente', ruta: 'estudios/fisica/pizarras/a.json' });
  });
  it('al reintentar con la ruta de antes, actualiza ese mismo archivo', async () => {
    const subir = vi.fn(async (x: typeof p) => x.guardadaEn ?? 'nueva');
    await guardarYMarcar(p, 'estudios/fisica/pizarras/a.json', { subir, marcar: async () => true });
    expect(subir.mock.calls[0][0].guardadaEn).toBe('estudios/fisica/pizarras/a.json');
  });
  it('si falla la subida, queda pendiente', async () => {
    const r = await guardarYMarcar(p, null, { subir: () => Promise.reject(new Error('red')), marcar: async () => true });
    expect(r).toEqual({ estado: 'pendiente', ruta: null });
  });
});
