import { describe, expect, it } from 'vitest';
import { aplicarOperacion, ErrorPizarra, pizarraVacia, serializarPizarra, validarOperacion, validarPizarra, type Operacion, type Pizarra } from './pizarra.ts';
import { validarTrazo } from './tinta.ts';

const ejemplo = {
  version: 1,
  titulo: 'Leyes de Newton',
  piezas: [
    { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 320, contenido: '## Segunda ley\n$F = m·a$' },
    { id: 'f1', tipo: 'formula', x: 400, y: 20, ancho: 300, contenido: '\\vec{F} = m \\cdot \\vec{a}' },
    { id: 'g1', tipo: 'grafica', x: 0, y: 300, ancho: 360, contenido: { x: [-3, 3], y: [-1, 9], curvas: [{ expr: 'x^2', etiqueta: 'y = x²' }], puntos: [{ x: 2, y: 4, etiqueta: '(2, 4)' }] } },
    { id: 'd1', tipo: 'dibujo', x: 420, y: 300, ancho: 300, contenido: '<svg viewBox="0 0 300 200"></svg>' },
    { id: 'i1', tipo: 'imagen', x: 800, y: 0, ancho: 400, contenido: 'imagenes/ejercicio-3.png' },
    { id: 'n1', tipo: 'nota', x: 800, y: 300, ancho: 240, contenido: '¿Y con rozamiento?' },
  ],
  flechas: [{ id: 'a1', de: 't1', a: 'f1', etiqueta: 'en fórmula' }],
  guardarComo: null,
  guardadaEn: null,
};
const con = (cambios: Record<string, unknown>) => ({ ...ejemplo, ...cambios });
const pieza = (i: number, cambios: Record<string, unknown>) => con({ piezas: ejemplo.piezas.map((p, j) => (j === i ? { ...p, ...cambios } : p)) });

describe('validarPizarra', () => {
  it('acepta el ejemplo del diseño', () => {
    const { pizarra, avisos } = validarPizarra(ejemplo);
    expect(avisos).toEqual([]);
    expect(pizarra.piezas).toHaveLength(6);
    expect(pizarra.flechas).toHaveLength(1);
    expect((pizarra.piezas[2].contenido as { puntos: unknown[] }).puntos).toHaveLength(1);
  });
  it('ignora con aviso los tipos de pieza que no conoce', () => {
    const r = validarPizarra(con({ piezas: [...ejemplo.piezas, { id: 'z1', tipo: 'trazo', x: 0, y: 0, ancho: 50, contenido: [] }] }));
    expect(r.pizarra.piezas).toHaveLength(6);
    expect(r.avisos[0]).toMatch(/trazo/);
  });
  it('errores', () => {
    const malas: [unknown, RegExp][] = [
      [con({ version: 3 }), /version/],
      [con({ piezas: 'x' }), /piezas/],
      [pieza(1, { id: 't1' }), /repetido/],
      [pieza(0, { ancho: 10 }), /ancho/],
      [pieza(0, { x: '5' }), /x/],
      [pieza(4, { contenido: '../secreto.png' }), /imagen/],
      [pieza(3, { contenido: '<div>' }), /svg/],
      [pieza(2, { contenido: { x: [-3, 3], y: [-1, 9], curvas: [{ expr: 'x^' }] } }), /curvas\[0\]/],
      [pieza(2, { contenido: { x: [3, -3], y: [-1, 9], curvas: [{ expr: 'x' }] } }), /menor/],
      [con({ flechas: [{ id: 'a1', de: 't1', a: 'no-existe' }] }), /flecha/],
      ['no es un objeto', /objeto/],
    ];
    for (const [mala, patron] of malas) expect(() => validarPizarra(mala)).toThrow(patron);
    expect(() => validarPizarra(con({ version: 3 }))).toThrow(ErrorPizarra);
  });
  it('guardarComo vacío cuenta como null', () => {
    expect(validarPizarra(con({ guardarComo: '  ' })).pizarra.guardarComo).toBeNull();
    expect(validarPizarra(con({ guardarComo: 'Newton' })).pizarra.guardarComo).toBe('Newton');
  });
  it('una pizarra vacía es válida', () => {
    expect(validarPizarra(JSON.parse(JSON.stringify(pizarraVacia('Pizarra 1')))).pizarra.titulo).toBe('Pizarra 1');
  });
});

describe('aplicarOperacion', () => {
  const p: Pizarra = validarPizarra(ejemplo).pizarra;
  it('mover redondea la posición', () => {
    expect(aplicarOperacion(p, { tipo: 'mover', id: 'f1', x: 10.6, y: -3.2 }).piezas[1]).toMatchObject({ x: 11, y: -3 });
  });
  it('borrar quita también sus flechas', () => {
    const r = aplicarOperacion(p, { tipo: 'borrar', id: 't1' });
    expect(r.piezas.map((x) => x.id)).not.toContain('t1');
    expect(r.flechas).toEqual([]);
  });
  it('nota nueva con id libre, y editar una nota', () => {
    const a = aplicarOperacion(pizarraVacia('x'), { tipo: 'nota', id: null, x: 5, y: 6, contenido: 'Hola' });
    const b = aplicarOperacion(a, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'Otra' });
    expect(b.piezas.map((x) => x.id)).toEqual(['nota1', 'nota2']);
    expect(aplicarOperacion(b, { tipo: 'nota', id: 'nota1', x: 0, y: 0, contenido: 'Cambiada' }).piezas[0]).toMatchObject({ contenido: 'Cambiada', x: 5 });
  });
  it('una nota nunca pisa una pieza de Claude con el mismo id', () => {
    const r = aplicarOperacion(p, { tipo: 'nota', id: 't1', x: 0, y: 0, contenido: 'x' });
    expect(r.piezas[0].contenido).toBe('## Segunda ley\n$F = m·a$');
    expect(r.piezas).toHaveLength(7);
  });
  it('guardada', () => {
    const r = aplicarOperacion({ ...p, guardarComo: 'Newton' }, { tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json' });
    expect(r).toMatchObject({ guardarComo: null, guardadaEn: 'estudios/fisica/pizarras/a.json' });
  });
  it('mover una pieza que ya no existe no hace nada', () => {
    expect(aplicarOperacion(p, { tipo: 'mover', id: 'zzz', x: 0, y: 0 }).piezas).toEqual(p.piezas);
  });
});

describe('validarOperacion', () => {
  it('acepta las buenas y rechaza las malas', () => {
    expect(validarOperacion({ tipo: 'borrar', id: 'a' })).toEqual({ tipo: 'borrar', id: 'a' });
    expect(() => validarOperacion({ tipo: 'volar' })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'mover', id: 'a', x: 'x', y: 0 })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'guardada', ruta: '../../fuera.json' })).toThrow(ErrorPizarra);
  });
});

describe('formato de la v1.4', () => {
  const trazo = { id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 10, 10] };
  it('una pizarra antigua se abre con las capas por defecto y se sigue escribiendo como versión 1', () => {
    const { pizarra } = validarPizarra(ejemplo);
    expect(pizarra.version).toBe(1);
    expect(pizarra.capas.map((c) => c.id)).toEqual(['claude', 'capa-1']);
    expect(pizarra.piezas.find((x) => x.id === 'n1')?.capa).toBe('capa-1');
    expect(pizarra.piezas.find((x) => x.id === 't1')?.capa).toBe('claude');
    const json = JSON.parse(serializarPizarra(pizarra));
    expect(json.version).toBe(1);
    expect(json).not.toHaveProperty('capas');
    expect(json).not.toHaveProperty('trazos');
    expect(json.piezas[0]).not.toHaveProperty('capa');
  });
  it('con trazos se escribe como versión 2, y se vuelve a leer igual', () => {
    const { pizarra } = validarPizarra({ ...ejemplo, trazos: [trazo] });
    expect(pizarra.version).toBe(2);
    expect(pizarra.trazos[0].capa).toBe('capa-1');
    const texto = serializarPizarra(pizarra);
    expect(JSON.parse(texto).version).toBe(2);
    expect(validarPizarra(JSON.parse(texto)).pizarra).toEqual(pizarra);
  });
  it('trazos de Claude sin capa, o con una capa que no existe, van a su sitio', () => {
    const { pizarra } = validarPizarra({ ...ejemplo, version: 2, trazos: [{ ...trazo, autor: 'claude' }, { ...trazo, id: 'd-2', capa: 'inventada' }] });
    expect(pizarra.trazos.map((t) => t.capa)).toEqual(['claude', 'capa-1']);
  });
  it('un trazo roto o repetido se ignora con aviso', () => {
    const r = validarPizarra({ ...ejemplo, trazos: [trazo, { ...trazo }, { ...trazo, id: 'd-2', color: 'rojo' }] });
    expect(r.pizarra.trazos).toHaveLength(1);
    expect(r.avisos).toHaveLength(2);
  });
  it('capas, letra a mano y versión', () => {
    const r = validarPizarra({ ...ejemplo, version: 2, flechas: [], capas: [{ id: 'capa-5', nombre: '  Ejercicio  ' }], piezas: [{ ...ejemplo.piezas[0], letra: 'mano' }] });
    expect(r.pizarra.capas).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-5', nombre: 'Ejercicio' }]);
    expect(r.pizarra.piezas[0].letra).toBe('mano');
    expect(() => validarPizarra({ ...ejemplo, version: 3 })).toThrow(/version/);
    expect(() => validarPizarra({ ...ejemplo, capas: [{ id: 'A B', nombre: 'x' }] })).toThrow(/capas/);
    expect(() => validarPizarra({ ...ejemplo, flechas: [], piezas: [{ ...ejemplo.piezas[0], letra: 'gotica' }] })).toThrow(/letra/);
  });
  it('una nota nueva lleva la capa de Diego y la pizarra sigue siendo versión 1', () => {
    const p = aplicarOperacion(pizarraVacia('x'), { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'Hola' });
    expect(p.piezas[0].capa).toBe('capa-1');
    expect(p.version).toBe(1);
  });
});

describe('operaciones de la v1.4', () => {
  const base = validarPizarra(ejemplo).pizarra;
  const trazo = (id: string, extra: Record<string, unknown> = {}) =>
    validarTrazo({ id, herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5], capa: 'capa-1', ...extra }, 't');
  it('trazos: pone, sustituye en su sitio y quita', () => {
    const a = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('d-1'), trazo('d-2')] });
    expect(a.trazos.map((t) => t.id)).toEqual(['d-1', 'd-2']);
    expect(a.version).toBe(2);
    const b = aplicarOperacion(a, { tipo: 'trazos', quitar: ['d-1'], poner: [trazo('d-2', { color: '#ff0000' }), trazo('d-3')] });
    expect(b.trazos.map((t) => [t.id, t.color])).toEqual([['d-2', '#ff0000'], ['d-3', '#000000']]);
  });
  it('aplicar dos veces la misma operación da lo mismo que una', () => {
    const ops: Operacion[] = [
      { tipo: 'trazos', quitar: [], poner: [trazo('d-1')] },
      { tipo: 'nota', id: null, nuevoId: 'd-n', x: 0, y: 0, contenido: 'Hola', capa: 'capa-1' },
      { tipo: 'piezas', quitar: ['t1'], poner: [] },
      { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 2 },
      { tipo: 'lote', ops: [{ tipo: 'mover', id: 'f1', x: 3, y: 3 }, { tipo: 'trazos', quitar: [], poner: [trazo('d-9')] }] },
    ];
    for (const op of ops) {
      const una = aplicarOperacion(base, op);
      expect(aplicarOperacion(una, op)).toEqual(una);
    }
    expect(aplicarOperacion(base, ops[1]).piezas.at(-1)).toMatchObject({ id: 'd-n', capa: 'capa-1' });
  });
  it('piezas: quitar se lleva sus flechas; poner puede traer flechas', () => {
    const t1 = base.piezas[0];
    const sin = aplicarOperacion(base, { tipo: 'piezas', quitar: ['t1'], poner: [] });
    expect(sin.flechas).toEqual([]);
    const otra = aplicarOperacion(sin, { tipo: 'piezas', quitar: [], poner: [t1], flechas: [{ id: 'a1', de: 't1', a: 'f1' }] });
    expect(otra.flechas).toHaveLength(1);
  });
  it('capas: crear, renombrar, ordenar y borrar (con lo que tiene)', () => {
    let p = aplicarOperacion(base, { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'Ejercicio', posicion: 2 });
    p = aplicarOperacion(p, { tipo: 'trazos', quitar: [], poner: [trazo('d-1', { capa: 'capa-2' })] });
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'renombrar', id: 'capa-2', nombre: 'Mío' });
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 2 });
    expect(p.capas.map((c) => `${c.id}:${c.nombre}`)).toEqual(['capa-1:Capa 1', 'capa-2:Mío', 'claude:Claude']);
    p = aplicarOperacion(p, { tipo: 'capa', accion: 'borrar', id: 'capa-2' });
    expect(p.capas.map((c) => c.id)).toEqual(['capa-1', 'claude']);
    expect(p.trazos).toEqual([]);
  });
  it('la capa de Claude no se borra ni se renombra, y borrar la última de Diego crea «Capa 1»', () => {
    expect(aplicarOperacion(base, { tipo: 'capa', accion: 'borrar', id: 'claude' }).capas).toEqual(base.capas);
    expect(aplicarOperacion(base, { tipo: 'capa', accion: 'renombrar', id: 'claude', nombre: 'X' }).capas[0].nombre).toBe('Claude');
    const p = aplicarOperacion(base, { tipo: 'capa', accion: 'borrar', id: 'capa-1' });
    expect(p.capas).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'Capa 1' }]);
    expect(p.piezas.find((x) => x.id === 'n1')).toBeUndefined();
  });
  it('lote aplica todas en orden', () => {
    const p = aplicarOperacion(base, {
      tipo: 'lote',
      ops: [{ tipo: 'trazos', quitar: [], poner: [trazo('d-1')] }, { tipo: 'trazos', quitar: ['d-1'], poner: [] }, { tipo: 'borrar', id: 'f1' }],
    });
    expect(p.trazos).toEqual([]);
    expect(p.piezas.map((x) => x.id)).not.toContain('f1');
  });
  it('fusionar junta con la versión del historial', () => {
    const suya = aplicarOperacion(base, { tipo: 'trazos', quitar: [], poner: [trazo('ipad')] });
    expect(aplicarOperacion(base, { tipo: 'fusionar', base, suya }).trazos.map((t) => t.id)).toEqual(['ipad']);
  });
  it('validarOperacion con las nuevas', () => {
    expect(validarOperacion({ tipo: 'trazos', quitar: ['a'], poner: [{ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0] }] })).toMatchObject({ tipo: 'trazos' });
    expect(() => validarOperacion({ tipo: 'trazos', quitar: [], poner: [{ id: 'd-1' }] })).toThrow(ErrorPizarra);
    expect(validarOperacion({ tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 1 })).toEqual({ tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'A', posicion: 1 });
    expect(() => validarOperacion({ tipo: 'capa', accion: 'volar', id: 'x' })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'lote', ops: [{ tipo: 'guardada', ruta: 'estudios/f/pizarras/a.json' }] })).toThrow(ErrorPizarra);
    expect(validarOperacion({ tipo: 'nota', id: null, x: 0, y: 0, contenido: 'a', nuevoId: 'd-1', capa: 'capa-1' })).toMatchObject({ nuevoId: 'd-1', capa: 'capa-1' });
    expect(validarOperacion({ tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json', subida: pizarraVacia('x') })).toMatchObject({ tipo: 'guardada', subida: { titulo: 'x' } });
    expect(validarOperacion({ tipo: 'fusionar', base: null, suya: pizarraVacia('x') })).toMatchObject({ tipo: 'fusionar', base: null });
    expect(validarOperacion({ tipo: 'piezas', quitar: [], poner: [ejemplo.piezas[5]] })).toMatchObject({ tipo: 'piezas' });
  });
});

describe('tamaño del archivo', () => {
  it('cada trazo va en una sola línea (los puntos no ocupan una línea cada uno) y se vuelve a leer igual', () => {
    const puntos = Array.from({ length: 200 }, (_, i) => i);
    const { pizarra } = validarPizarra({ ...ejemplo, trazos: [{ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos }, { id: 'd-2', herramienta: 'linea', color: '#000000', grosor: 2, puntos: [0, 0, 1, 1] }] });
    const texto = serializarPizarra(pizarra);
    expect(texto.split('\n').filter((l) => l.includes('"herramienta"'))).toHaveLength(2);
    const sinLargo = serializarPizarra({ ...pizarra, trazos: pizarra.trazos.slice(1) }).split('\n').length;
    expect(texto.split('\n').length - sinLargo).toBeLessThan(3);
    expect(validarPizarra(JSON.parse(texto)).pizarra).toEqual(pizarra);
  });
});
