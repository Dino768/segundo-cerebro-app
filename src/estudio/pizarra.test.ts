import { describe, expect, it } from 'vitest';
import { aplicarOperacion, ErrorPizarra, pizarraVacia, serializarPizarra, validarOperacion, validarPizarra, type Pizarra } from './pizarra.ts';

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
