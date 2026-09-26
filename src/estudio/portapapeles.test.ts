import { describe, expect, it } from 'vitest';
import { aplicarOperacion, validarPizarra } from './pizarra';
import { copiar, pegar } from './portapapeles';

const p = validarPizarra({
  version: 2, titulo: 'x',
  piezas: [
    { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' },
    { id: 't2', tipo: 'texto', x: 200, y: 0, ancho: 100, contenido: 'b' },
    { id: 'i1', tipo: 'imagen', x: 0, y: 300, ancho: 100, contenido: 'imagenes/a.png' },
  ],
  flechas: [{ id: 'a1', de: 't1', a: 't2' }],
  trazos: [{ id: 'c1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 10, 10], autor: 'claude' }],
}).pizarra;

describe('copiar y pegar', () => {
  it('copia lo seleccionado, con las flechas entre piezas copiadas', () => {
    expect(copiar(p, { piezas: ['t1', 't2'], trazos: ['c1'] }, 'o', 'c')!.flechas).toHaveLength(1);
    expect(copiar(p, { piezas: ['t1'], trazos: [] }, 'o', 'c')!.flechas).toEqual([]);
    expect(copiar(p, { piezas: [], trazos: [] }, 'o', 'c')).toBeNull();
  });
  it('pega en la capa activa, desplazado, con ids nuevos y sin autor', () => {
    const r = copiar(p, { piezas: ['t1', 't2'], trazos: ['c1'] }, 'o', 'c')!;
    const res = pegar(r, p, 'capa-1', 'o', null);
    if ('error' in res) throw new Error(res.error);
    const q = aplicarOperacion(p, res.op);
    expect(q.piezas.filter((x) => res.seleccion.piezas.includes(x.id)).map((x) => [x.x, x.y, x.capa])).toEqual([[24, 24, 'capa-1'], [224, 24, 'capa-1']]);
    const t = q.trazos.find((x) => res.seleccion.trazos.includes(x.id))!;
    expect(t).toMatchObject({ capa: 'capa-1', puntos: [24, 24, 34, 34] });
    expect(t.autor).toBeUndefined();
    expect(q.flechas).toHaveLength(2);
    expect(new Set([...q.piezas, ...q.trazos].map((x) => x.id)).size).toBe(q.piezas.length + q.trazos.length);
  });
  it('en otra pizarra se pega centrado donde se está mirando', () => {
    const res = pegar(copiar(p, { piezas: ['t1'], trazos: [] }, 'o', 'c')!, p, 'capa-1', 'o', { x: 500, y: 500 });
    if ('error' in res) throw new Error(res.error);
    expect(aplicarOperacion(p, res.op).piezas.at(-1)).toMatchObject({ x: 450, y: 470 });
  });
  it('una imagen solo se pega en el mismo sitio', () => {
    const r = copiar(p, { piezas: ['i1'], trazos: [] }, 'historial:fisica', 'c')!;
    expect(pegar(r, p, 'capa-1', 'local:fisica:conv', null)).toHaveProperty('error');
    expect(pegar(r, p, 'capa-1', 'historial:fisica', null)).toHaveProperty('op');
  });
});
