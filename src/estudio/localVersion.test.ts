import { afterEach, describe, expect, it, vi } from 'vitest';
import { comprobarProgramaLocal, leerPizarras, operarPizarra } from './local';
import { VERSION_PROGRAMA } from './tipos';

const responder = (cuerpo: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: 200 })));
afterEach(() => vi.unstubAllGlobals());

// Pizarra tal y como la manda un programa local de antes de la v1.4 (sin capas ni trazos).
const antigua = { version: 1, titulo: 'Newton', piezas: [{ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 240, contenido: 'Hola' }], flechas: [], guardarComo: null, guardadaEn: null };

describe('programa local de otra versión', () => {
  it('distingue el programa al día, uno antiguo (hay que reiniciarlo) y ninguno', async () => {
    responder({ ok: true, version: VERSION_PROGRAMA });
    expect(await comprobarProgramaLocal()).toBe('si');
    responder({ ok: true });
    expect(await comprobarProgramaLocal()).toBe('antiguo');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('sin red'); }));
    expect(await comprobarProgramaLocal()).toBe('no');
  });
  it('las pizarras que manda se revisan: una del formato antiguo llega con sus capas', async () => {
    responder([{ n: 1, pizarra: antigua, error: null, avisos: [] }]);
    const [e] = await leerPizarras('general', 'c');
    expect(e.pizarra?.capas.map((c) => c.id)).toEqual(['claude', 'capa-1']);
    expect(e.base).toBeNull();
    responder(antigua);
    expect((await operarPizarra('general', 'c', 1, { tipo: 'borrar', id: 'x' })).trazos).toEqual([]);
  });
});
