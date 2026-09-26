import { describe, expect, it } from 'vitest';
import { contraria, deshacer, pilaVacia, registrar, rehacer } from './deshacer';
import { aplicarOperacion, validarPizarra, type Operacion, type Pizarra } from './pizarra';
import { validarTrazo } from './tinta';

const base = validarPizarra({
  version: 1, titulo: 'x',
  piezas: [{ id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' }, { id: 'n1', tipo: 'nota', x: 5, y: 5, ancho: 240, contenido: 'Hola' }],
  flechas: [{ id: 'a1', de: 't1', a: 'n1' }],
}).pizarra;
const trazo = (id: string) => validarTrazo({ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5], capa: 'capa-1' }, 't');
const conTrazo = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] });

// El orden dentro de las listas puede cambiar al deshacer (lo restaurado va encima): se compara sin orden.
const porId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
const sinOrden = (p: Pizarra) => ({ ...p, piezas: [...p.piezas].sort(porId), trazos: [...p.trazos].sort(porId), flechas: [...p.flechas].sort(porId) });

describe('contraria: hacer y deshacer deja la pizarra como estaba', () => {
  const casos: [string, Pizarra, Operacion][] = [
    ['mover', base, { tipo: 'mover', id: 't1', x: 50, y: 60 }],
    ['borrar una pieza con su flecha', base, { tipo: 'borrar', id: 't1' }],
    ['nota nueva', base, { tipo: 'nota', id: null, nuevoId: 'd-n', x: 1, y: 2, contenido: 'Otra', capa: 'capa-1' }],
    ['editar una nota', base, { tipo: 'nota', id: 'n1', x: 5, y: 5, contenido: 'Cambiada' }],
    ['poner trazos', base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }],
    ['goma (quitar y poner trozos)', conTrazo, { tipo: 'trazos', quitar: ['d-1'], poner: [trazo('d-2'), trazo('d-3')] }],
    ['quitar piezas', base, { tipo: 'piezas', quitar: ['n1'], poner: [] }],
    ['crear capa', base, { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 2 }],
    ['renombrar capa', base, { tipo: 'capa', accion: 'renombrar', id: 'capa-1', nombre: 'Mía' }],
    ['ordenar capa', base, { tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 1 }],
    ['borrar la última capa de Diego con lo que tiene', conTrazo, { tipo: 'capa', accion: 'borrar', id: 'capa-1' }],
    ['lote', base, { tipo: 'lote', ops: [{ tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }, { tipo: 'mover', id: 't1', x: 9, y: 9 }] }],
  ];
  for (const [nombre, p, op] of casos)
    it(nombre, () => {
      const c = contraria(p, op);
      expect(c).not.toBeNull();
      expect(sinOrden(aplicarOperacion(aplicarOperacion(p, op), c!))).toEqual(sinOrden(p));
    });
  it('guardada y fusionar no se deshacen', () => {
    expect(contraria(base, { tipo: 'guardada', ruta: 'estudios/f/pizarras/a.json' })).toBeNull();
    expect(contraria(base, { tipo: 'fusionar', base: null, suya: base })).toBeNull();
  });
});

describe('pila de deshacer', () => {
  const op: Operacion = { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] };
  it('deshacer y rehacer', () => {
    let pila = registrar(pilaVacia(), base, op);
    let p = aplicarOperacion(base, op);
    const d = deshacer(pila)!;
    p = aplicarOperacion(p, d.op);
    pila = d.pila;
    expect(p.trazos).toEqual([]);
    const r = rehacer(pila, p)!;
    p = aplicarOperacion(p, r.op);
    pila = r.pila;
    expect(p.trazos.map((t) => t.id)).toEqual(['d-1']);
    expect(deshacer(pila)).not.toBeNull();
    expect(rehacer(pila, p)).toBeNull();
  });
  it('hacer algo nuevo borra lo que se podía rehacer', () => {
    const d = deshacer(registrar(pilaVacia(), base, op))!;
    expect(registrar(d.pila, base, op).deshechas).toEqual([]);
  });
  it('si Claude ya borró lo que se deshace, no pasa nada', () => {
    const d = deshacer(registrar(pilaVacia(), base, op))!;
    expect(aplicarOperacion(base, d.op)).toEqual(base);
  });
  it('guarda como mucho 100 pasos', () => {
    let pila = pilaVacia();
    for (let i = 0; i < 120; i++) pila = registrar(pila, base, { tipo: 'mover', id: 't1', x: i, y: 0 });
    expect(pila.hechas).toHaveLength(100);
  });
});
