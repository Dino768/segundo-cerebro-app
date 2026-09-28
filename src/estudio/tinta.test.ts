import { describe, expect, it } from 'vitest';
import { cajaDeTrazo, cortarConGoma, dentroDePoligono, ErrorTrazo, letrasDe, moverTrazo, nuevoId, paraGuardar, polilineas, puntosQueQuedan, terminarTrazo, tocaTrazo, trazoEnLazo, validarTrazo } from './tinta.ts';

const lapiz = { id: 'd-1', herramienta: 'lapiz', color: '#B8603D', grosor: 4, puntos: [0, 0, 10.26, 0, 20, 0], presion: [0.5, 0.555, 0.6] };

describe('validarTrazo', () => {
  it('acepta un trazo y lo redondea', () => {
    expect(validarTrazo(lapiz, 't')).toEqual({ id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 10.3, 0, 20, 0], presion: [0.5, 0.56, 0.6] });
  });
  it('las formas llevan dos puntos y la presión solo se guarda en el lápiz', () => {
    expect(validarTrazo({ id: 'c1', herramienta: 'flecha', color: '#3b82f6', grosor: 4, puntos: [0, 0, 10, 10], autor: 'claude' }, 't')).toMatchObject({ herramienta: 'flecha', autor: 'claude' });
    expect(validarTrazo({ ...lapiz, herramienta: 'subrayador' }, 't').presion).toBeUndefined();
  });
  it('rechaza lo que está mal', () => {
    const malos: [Record<string, unknown>, RegExp][] = [
      [{ ...lapiz, id: '' }, /id/],
      [{ ...lapiz, herramienta: 'spray' }, /herramienta/],
      [{ ...lapiz, color: 'rojo' }, /color/],
      [{ ...lapiz, grosor: 0 }, /grosor/],
      [{ ...lapiz, puntos: [0, 0, 1], presion: undefined }, /pares/],
      [{ ...lapiz, puntos: [0, 'x'] }, /números/],
      [{ ...lapiz, herramienta: 'linea', presion: undefined }, /dos puntos/],
      [{ ...lapiz, presion: [0.5] }, /presion/],
      [{ ...lapiz, autor: 'diego' }, /autor/],
      [{ ...lapiz, puntos: new Array(10002).fill(1), presion: undefined }, /5000/],
    ];
    for (const [malo, patron] of malos) expect(() => validarTrazo(malo, 't')).toThrow(patron);
    expect(() => validarTrazo('x', 't')).toThrow(ErrorTrazo);
  });
});

describe('simplificar', () => {
  it('quita los puntos casi alineados y deja siempre el primero y el último', () => {
    const ps = [{ x: 0, y: 0 }, { x: 5, y: 0.2 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(puntosQueQuedan(ps, 0.5)).toEqual([0, 2, 3]);
  });
  it('terminarTrazo simplifica y redondea el subrayador', () => {
    const t = terminarTrazo({
      id: 'd-1', herramienta: 'subrayador', color: '#000000', grosor: 2, capa: 'capa-1',
      puntos: [{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10.04, y: 0 }],
    });
    expect(t).toEqual({ id: 'd-1', herramienta: 'subrayador', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [0, 0, 10, 0] });
  });
  it('el lápiz guarda todos sus puntos y su presión (al simplificarlo cambiaba de forma al soltar)', () => {
    const t = terminarTrazo({
      id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1',
      puntos: [{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10.04, y: 0 }], presion: [0.1, 0.5, 0.9],
    });
    expect(t).toEqual({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [0, 0, 5, 0.1, 10, 0], presion: [0.1, 0.5, 0.9] });
  });
  it('con tolerancia 0 no simplifica (para enseñar el trazo mientras se dibuja)', () => {
    const t = terminarTrazo({ id: 'd', herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }] }, 0);
    expect(t.puntos).toEqual([0, 0, 5, 0, 10, 0]);
  });
  it('una forma se queda con el primer y el último punto', () => {
    const t = terminarTrazo({ id: 'd-2', herramienta: 'rectangulo', color: '#000000', grosor: 2, capa: 'capa-1', puntos: [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 8, y: 5 }] });
    expect(t.puntos).toEqual([0, 0, 8, 5]);
  });
});

describe('formas', () => {
  const forma = (herramienta: string) => validarTrazo({ id: 'f', herramienta, color: '#000000', grosor: 2, puntos: [0, 0, 20, 10] }, 't');
  it('cada forma se dibuja con sus líneas', () => {
    expect(polilineas(forma('linea'))).toEqual([[{ x: 0, y: 0 }, { x: 20, y: 10 }]]);
    expect(polilineas(forma('flecha'))).toHaveLength(2);
    expect(polilineas(forma('rectangulo'))[0]).toEqual([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }]);
    expect(polilineas(forma('elipse'))[0]).toHaveLength(49);
  });
  it('caja de un trazo, con su grosor', () => {
    expect(cajaDeTrazo(forma('linea'))).toEqual({ x: -1, y: -1, w: 22, h: 12 });
  });
});

describe('nuevoId', () => {
  it('no repite ninguno usado', () => {
    const azar = [0, 0, 0.5].values();
    const id = nuevoId('d', new Set(['d-000000']), () => azar.next().value!);
    expect(id).not.toBe('d-000000');
    expect(id).toMatch(/^d-[0-9a-z]{6}$/);
  });
});

describe('goma y lazo', () => {
  const linea = (extra: Record<string, unknown> = {}) =>
    validarTrazo({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 100, 0], capa: 'capa-1', ...extra }, 't');
  let n = 0;
  const crearId = () => `d-n${++n}`;

  it('tocaTrazo mira la distancia a la línea (más medio grosor)', () => {
    expect(tocaTrazo(linea(), { x: 50, y: 8 }, 8)).toBe(true);
    expect(tocaTrazo(linea(), { x: 50, y: 12 }, 8)).toBe(false);
  });
  it('la goma en el centro parte la línea en dos trozos, con el mismo color, capa y autor', () => {
    const r = cortarConGoma(linea({ autor: 'claude' }), [{ x: 50, y: -20 }, { x: 50, y: 20 }], 5, crearId)!;
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ herramienta: 'lapiz', color: '#000000', grosor: 2, capa: 'capa-1', autor: 'claude' });
    expect(r[0].puntos[0]).toBe(0);
    expect(r[0].puntos.at(-2)).toBeLessThan(50);
    expect(r[1].puntos[0]).toBeGreaterThan(50);
    expect(r[1].puntos.at(-2)).toBe(100);
    expect(new Set(r.map((t) => t.id)).size).toBe(2);
  });
  it('si no toca, null; si lo cubre entero, lista vacía', () => {
    expect(cortarConGoma(linea(), [{ x: 50, y: 40 }], 5, crearId)).toBeNull();
    expect(cortarConGoma(linea(), [{ x: -10, y: 0 }, { x: 110, y: 0 }], 5, crearId)).toEqual([]);
  });
  it('un tramo rápido que cruza la línea también la corta', () => {
    expect(cortarConGoma(linea(), [{ x: 50, y: -300 }, { x: 50, y: 300 }], 5, crearId)).toHaveLength(2);
  });
  it('la presión sigue alineada con los puntos en los trozos', () => {
    const conPresion = validarTrazo({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 50, 30, 100, 0], presion: [0.2, 0.6, 1] }, 't');
    for (const t of cortarConGoma(conPresion, [{ x: 50, y: 30 }], 5, crearId)!) expect(t.presion).toHaveLength(t.puntos.length / 2);
  });
  it('en el lápiz, la goma no cambia la forma de lo que queda (solo quita los puntos que añadió para cortar)', () => {
    const t = validarTrazo({ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 50, 0.3, 100, 0] }, 't');
    const [trozo] = cortarConGoma(t, [{ x: 95, y: -20 }, { x: 95, y: 20 }], 2, crearId)!;
    expect(trozo.puntos.slice(0, 4)).toEqual([0, 0, 50, 0.3]);
    expect(trozo.puntos).toHaveLength(6);
  });
  it('una forma tocada por la goma pasa a trazo libre', () => {
    const rect = validarTrazo({ id: 'r', herramienta: 'rectangulo', color: '#000000', grosor: 2, puntos: [0, 0, 100, 100] }, 't');
    const r = cortarConGoma(rect, [{ x: 50, y: 0 }], 5, crearId)!;
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.herramienta === 'lapiz')).toBe(true);
  });
  it('lazo: trazos con más de la mitad de sus puntos dentro', () => {
    const cuadro = [{ x: -10, y: -10 }, { x: 60, y: -10 }, { x: 60, y: 10 }, { x: -10, y: 10 }];
    expect(dentroDePoligono({ x: 0, y: 0 }, cuadro)).toBe(true);
    expect(dentroDePoligono({ x: 100, y: 0 }, cuadro)).toBe(false);
    const tres = validarTrazo({ id: 'd', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 50, 0, 100, 0] }, 't');
    expect(trazoEnLazo(tres, cuadro)).toBe(true);
    expect(trazoEnLazo(linea(), cuadro)).toBe(false);
  });
  it('mover un trazo', () => {
    expect(moverTrazo(linea(), 5, -2.26).puntos).toEqual([5, -2.3, 105, -2.3]);
  });
});

describe('letra a mano (herramienta letra)', () => {
  const bruta = { id: 'c7', herramienta: 'letra', texto: 'dy/dx = 2x', x: 300, y: 180, tamano: 28, color: '#B8603D', autor: 'claude' };
  const letra = validarTrazo(bruta, 't');
  it('se valida sin puntos y con grosor 3 si no lo trae', () => {
    expect(letra).toEqual({ id: 'c7', herramienta: 'letra', color: '#b8603d', grosor: 3, puntos: [], texto: 'dy/dx = 2x', x: 300, y: 180, tamano: 28, autor: 'claude' });
    expect(validarTrazo({ ...bruta, grosor: 5, puntos: [1, 2] }, 't')).toMatchObject({ grosor: 5, puntos: [] });
  });
  it('rechaza las letras mal hechas', () => {
    const malas: [Record<string, unknown>, RegExp][] = [
      [{ ...bruta, texto: '' }, /texto/],
      [{ ...bruta, texto: '   ' }, /texto/],
      [{ ...bruta, texto: 'dos\nlíneas' }, /texto/],
      [{ ...bruta, texto: 'x'.repeat(201) }, /200/],
      [{ ...bruta, texto: 7 }, /texto/],
      [{ ...bruta, tamano: undefined }, /tamano/],
      [{ ...bruta, tamano: 4 }, /tamano/],
      [{ ...bruta, x: 'a' }, /\.x/],
      [{ ...bruta, y: Infinity }, /\.y/],
    ];
    for (const [mala, patron] of malas) expect(() => validarTrazo(mala, 't')).toThrow(patron);
  });
  it('sus líneas salen del texto: caja, tocar y lazo funcionan como en las formas', () => {
    expect(letrasDe(letra)).toHaveLength(8); // «dy/dx=2x» sin los espacios
    expect(polilineas(letra)).toEqual(letrasDe(letra).flat());
    const caja = cajaDeTrazo(letra);
    expect(caja.x).toBeGreaterThan(290);
    expect(caja.y + caja.h).toBeLessThan(180 + 28 * 0.5);
    expect(caja.y).toBeGreaterThan(180 - 28 * 1.5);
    const primerPunto = polilineas(letra)[0][0];
    expect(tocaTrazo(letra, primerPunto, 1)).toBe(true);
    const rodea = [{ x: caja.x - 5, y: caja.y - 5 }, { x: caja.x + caja.w + 5, y: caja.y - 5 }, { x: caja.x + caja.w + 5, y: caja.y + caja.h + 5 }, { x: caja.x - 5, y: caja.y + caja.h + 5 }];
    expect(trazoEnLazo(letra, rodea)).toBe(true);
  });
  it('moverla cambia x e y (y sus letras se mueven igual)', () => {
    const movida = moverTrazo(letra, 10, -5);
    expect(movida).toMatchObject({ x: 310, y: 175, puntos: [] });
    expect(polilineas(movida)[0][0].x).toBeCloseTo(polilineas(letra)[0][0].x + 10, 0);
  });
  it('la goma la convierte en trazos de lápiz normales (de Claude y de su capa) y los corta', () => {
    const conCapa = { ...letra, capa: 'claude' };
    const caja = cajaDeTrazo(conCapa);
    const medio = { x: caja.x + caja.w / 2, y: caja.y + caja.h / 2 };
    let n = 0;
    const trozos = cortarConGoma(conCapa, [{ x: medio.x, y: caja.y - 10 }, { x: medio.x, y: caja.y + caja.h + 10 }], 6, () => `g${n++}`)!;
    expect(trozos.length).toBeGreaterThan(3);
    expect(trozos.every((t) => t.herramienta === 'lapiz' && t.autor === 'claude' && t.capa === 'claude' && t.texto === undefined)).toBe(true);
    expect(cortarConGoma(conCapa, [{ x: -500, y: -500 }], 6, () => 'z')).toBeNull();
  });
  it('en el archivo no lleva puntos', () => {
    expect(paraGuardar(letra)).not.toHaveProperty('puntos');
    expect(paraGuardar(validarTrazo(lapiz, 't'))).toHaveProperty('puntos');
  });
});
