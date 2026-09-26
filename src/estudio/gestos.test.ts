import { describe, expect, it } from 'vitest';
import {
  ajustarForma, borrarSeleccion, cajaDeSeleccion, grosorDe, limpiarSeleccion, moverSeleccion, pasarGoma, resultadoGoma, seleccionarConLazo,
  toqueMultiple, trazoDeGesto, trazosTocados,
} from './gestos';
import { INICIALES } from './herramientas';
import { aplicarOperacion, validarPizarra } from './pizarra';

const lapiz = { ...INICIALES, herramienta: 'lapiz' as const };

describe('el trazo de un gesto', () => {
  it('lápiz: grosor, color, capa y presión', () => {
    const t = trazoDeGesto(lapiz, 'd-1', 'capa-1', [{ x: 0, y: 0 }, { x: 10, y: 0 }], [0.3, 0.7], false)!;
    expect(t).toMatchObject({ id: 'd-1', herramienta: 'lapiz', color: INICIALES.color, grosor: 4, capa: 'capa-1', puntos: [0, 0, 10, 0], presion: [0.3, 0.7] });
  });
  it('un toque suelto deja un punto', () => {
    expect(trazoDeGesto(lapiz, 'd-1', 'capa-1', [{ x: 5, y: 5 }], null, false)!.puntos).toEqual([5, 5, 5.1, 5]);
  });
  it('subrayador: el triple de grosor y sin presión', () => {
    const t = trazoDeGesto({ ...INICIALES, herramienta: 'subrayador' }, 'd-1', 'capa-1', [{ x: 0, y: 0 }, { x: 9, y: 0 }], [0.5, 0.5], false)!;
    expect(t.grosor).toBe(12);
    expect(t.presion).toBeUndefined();
    expect(grosorDe({ ...INICIALES, herramienta: 'subrayador', grosor: 'grueso' })).toBe(24);
  });
  it('formas: dos puntos, con Mayús rectas a 45° y cuadrados; sin tamaño no hay forma', () => {
    const forma = { ...INICIALES, herramienta: 'forma' as const, forma: 'rectangulo' as const };
    expect(trazoDeGesto(forma, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: 10, y: 4 }], null, true)!.puntos).toEqual([0, 0, 10, 10]);
    expect(trazoDeGesto(forma, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 1, y: 0 }], null, false)).toBeNull();
    const b = ajustarForma('linea', { x: 0, y: 0 }, { x: 10, y: 1 }, true);
    expect(b.y).toBeCloseTo(0);
    expect(b.x).toBeCloseTo(Math.hypot(10, 1));
  });
  it('mover, lazo, borrador y texto no dibujan', () => {
    expect(trazoDeGesto(INICIALES, 'd', 'capa-1', [{ x: 0, y: 0 }, { x: 9, y: 9 }], null, false)).toBeNull();
  });
});

describe('borradores, lazo y selección', () => {
  const p = validarPizarra({
    version: 2, titulo: 'x',
    piezas: [{ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 40, contenido: 'a' }],
    flechas: [],
    trazos: [
      { id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 100, 100, 100] },
      { id: 'c1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 100, 100, 100], autor: 'claude' },
    ],
  }).pizarra;
  const rect = () => ({ x: 0, y: 0, w: 40, h: 60 });
  it('los borradores solo tocan la capa activa', () => {
    expect(trazosTocados(p.trazos, 'capa-1', { x: 50, y: 100 }, 5)).toEqual(['d-1']);
    let n = 0;
    const r = pasarGoma(p.trazos, 'claude', [{ x: 50, y: 90 }, { x: 50, y: 110 }], 5, () => `d-g${++n}`);
    expect(r.quitar).toEqual(['c1']);
    expect(r.poner).toHaveLength(2);
    expect(resultadoGoma(p.trazos, [p.trazos[0], ...r.poner])).toEqual({ quitar: ['c1'], poner: r.poner });
  });
  it('lazo, caja, mover y borrar lo seleccionado', () => {
    const sel = seleccionarConLazo(p, 'capa-1', [{ x: -10, y: -10 }, { x: 200, y: -10 }, { x: 200, y: 200 }, { x: -10, y: 200 }], rect);
    expect(sel).toEqual({ trazos: ['d-1'], piezas: ['n1'] });
    expect(cajaDeSeleccion(p, sel, rect)).toEqual({ x: -1, y: 0, w: 102, h: 101 });
    const movida = aplicarOperacion(p, moverSeleccion(p, sel, 10, 5));
    expect(movida.trazos[0].puntos).toEqual([10, 105, 110, 105]);
    expect(movida.piezas[0]).toMatchObject({ x: 10, y: 5 });
    const borrada = aplicarOperacion(p, borrarSeleccion(sel));
    expect(borrada.trazos.map((t) => t.id)).toEqual(['c1']);
    expect(borrada.piezas).toEqual([]);
    expect(limpiarSeleccion(borrada, sel)).toEqual({ trazos: [], piezas: [] });
    expect(limpiarSeleccion(p, sel)).toBe(sel);
  });
  it('toque con dos dedos = deshacer, con tres = rehacer (si es rápido y sin moverse)', () => {
    expect(toqueMultiple(2, 150, 3)).toBe('deshacer');
    expect(toqueMultiple(3, 150, 3)).toBe('rehacer');
    expect(toqueMultiple(2, 500, 3)).toBeNull();
    expect(toqueMultiple(2, 150, 40)).toBeNull();
    expect(toqueMultiple(1, 100, 0)).toBeNull();
  });
});
