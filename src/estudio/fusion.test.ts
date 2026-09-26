import { describe, expect, it } from 'vitest';
import { fusionar, fusionarLista } from './fusion.ts';
import { pizarraVacia, validarPizarra, type Pieza, type Pizarra } from './pizarra.ts';

const x = (id: string, v = 0) => ({ id, v });

describe('fusionarLista', () => {
  const base = [x('a'), x('b'), x('c')];
  it('lo nuevo de los dos lados se queda', () => {
    expect(fusionarLista(base, [...base, x('m')], [...base, x('s')]).map((e) => e.id)).toEqual(['a', 'b', 'c', 'm', 's']);
  });
  it('lo que borra un lado sin que el otro lo cambie, se borra', () => {
    expect(fusionarLista(base, [x('a'), x('c')], base).map((e) => e.id)).toEqual(['a', 'c']);
    expect(fusionarLista(base, base, [x('a'), x('c')]).map((e) => e.id)).toEqual(['a', 'c']);
  });
  it('lo que cambia un solo lado gana; si cambian los dos, gana el mío', () => {
    expect(fusionarLista(base, base, [x('a', 1), x('b'), x('c')])[0]).toEqual(x('a', 1));
    expect(fusionarLista(base, [x('a', 2), x('b'), x('c')], [x('a', 1), x('b'), x('c')])[0]).toEqual(x('a', 2));
  });
  it('si yo lo cambié y el otro lo borró, se queda lo mío', () => {
    expect(fusionarLista(base, [x('a', 2), x('b'), x('c')], [x('b'), x('c')]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
  it('sin base, junta los dos sin borrar nada (gana el mío si coinciden)', () => {
    expect(fusionarLista(null, [x('a', 2)], [x('a', 1), x('s')])).toEqual([x('a', 2), x('s')]);
  });
  it('el orden de las claves no cuenta como cambio', () => {
    expect(fusionarLista([{ id: 'a', v: 1, w: 2 }], [{ w: 2, v: 1, id: 'a' }], [{ id: 'a', v: 5, w: 2 }])[0]).toEqual({ id: 'a', v: 5, w: 2 });
  });
});

describe('fusionar', () => {
  const con = (cambios: Partial<Pizarra>): Pizarra => ({ ...pizarraVacia('Física'), ...cambios });
  const trazo = (id: string) =>
    validarPizarra({ version: 2, titulo: 'x', piezas: [], flechas: [], trazos: [{ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 1, 1] }] }).pizarra.trazos[0];
  it('junta los trazos de los dos lados y deja los datos del PC', () => {
    const r = fusionar(con({}), con({ trazos: [trazo('pc')], guardadaEn: 'estudios/f/pizarras/a.json' }), con({ trazos: [trazo('ipad')] }));
    expect(r.trazos.map((t) => t.id)).toEqual(['pc', 'ipad']);
    expect(r.guardadaEn).toBe('estudios/f/pizarras/a.json');
  });
  it('quita las flechas que se quedan sin pieza', () => {
    const t1: Pieza = { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a', capa: 'claude' };
    const t2: Pieza = { ...t1, id: 't2' };
    const base = con({ piezas: [t1, t2], flechas: [{ id: 'a1', de: 't1', a: 't2' }] });
    const r = fusionar(base, base, con({ piezas: [t1], flechas: [{ id: 'a1', de: 't1', a: 't2' }] }));
    expect(r.piezas.map((p) => p.id)).toEqual(['t1']);
    expect(r.flechas).toEqual([]);
  });
});
