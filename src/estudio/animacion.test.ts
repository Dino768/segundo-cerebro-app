import { describe, expect, it } from 'vitest';
import {
  cortarPorLargo, DURACION_FORMA, duracion, encolar, lapizParcial, lineasParciales, pendientes, progreso, recibir, TOPE_LAPIZ, TOPE_LOTE, type Tramo,
} from './animacion';
import { letrasDe, validarTrazo, type Trazo } from './tinta';

const forma = (id: string, autor = true): Trazo => validarTrazo({ id, herramienta: 'linea', color: '#b8603d', grosor: 4, puntos: [0, 0, 100, 0], ...(autor ? { autor: 'claude' } : {}) }, 't');
const lapiz = (id: string, largo: number): Trazo =>
  validarTrazo({ id, herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, largo / 2, 0, largo, 0], presion: [0.2, 0.5, 0.8], autor: 'claude' }, 't');
const letra = (id: string, texto: string): Trazo => validarTrazo({ id, herramienta: 'letra', texto, x: 0, y: 40, tamano: 30, color: '#b8603d', autor: 'claude' }, 't');

describe('duración de cada trazo', () => {
  it('formas 0,4 s; lápiz a su ritmo, 0,6 s como mucho; letra a 12 letras por segundo', () => {
    expect(duracion(forma('a'))).toBe(DURACION_FORMA);
    expect(duracion(lapiz('l', 5000))).toBe(TOPE_LAPIZ);
    expect(duracion(lapiz('l', 30))).toBeGreaterThan(0);
    expect(duracion(lapiz('l', 30))).toBeLessThan(duracion(lapiz('m', 300)));
    expect(duracion(letra('t', 'Hola'))).toBeCloseTo(4000 / 12, 5);
    expect(duracion(letra('t', 'a b'))).toBeCloseTo(2000 / 12, 5); // los espacios no cuentan
  });
});

describe('cola de la animación', () => {
  it('lo que llega junto va uno detrás de otro, en el orden del archivo', () => {
    expect(encolar([], [forma('a'), forma('b')], 1000)).toEqual([
      { id: 'a', inicio: 1000, fin: 1400 },
      { id: 'b', inicio: 1400, fin: 1800 },
    ]);
  });
  it('lo nuevo espera a que acabe lo que se está animando', () => {
    const cola: Tramo[] = [{ id: 'a', inicio: 1000, fin: 5000 }];
    expect(encolar(cola, [forma('b')], 2000)).toEqual([...cola, { id: 'b', inicio: 5000, fin: 5400 }]);
  });
  it('40 trazos de golpe caben en 8 s y no se pierde ninguno', () => {
    const cola = encolar([], Array.from({ length: 40 }, (_, i) => forma(`f${i}`)), 0);
    expect(cola).toHaveLength(40);
    expect(cola.at(-1)!.fin).toBeCloseTo(TOPE_LOTE, 5);
    expect(cola.every((t, i) => i === 0 || t.inicio === cola[i - 1].fin)).toBe(true);
  });
  it('progreso de 0 a 1 y los que han acabado salen de la cola', () => {
    const t: Tramo = { id: 'a', inicio: 1000, fin: 1400 };
    expect(progreso(t, 500)).toBe(0);
    expect(progreso(t, 1200)).toBeCloseTo(0.5);
    expect(progreso(t, 2000)).toBe(1);
    expect(pendientes([t, { id: 'b', inicio: 1400, fin: 1800 }], 1500).map((x) => x.id)).toEqual(['b']);
  });
});

describe('qué es nuevo', () => {
  it('al abrir la pizarra no se anima nada (salvo si Claude la acaba de crear)', () => {
    expect(recibir(null, [forma('a')], [forma('a')], false).nuevos).toEqual([]);
    expect(recibir(null, [forma('a')], [forma('a')], true).nuevos.map((t) => t.id)).toEqual(['a']);
  });
  it('lo de Claude que llega después se anima; lo de Diego, no', () => {
    const { vistos } = recibir(null, [forma('a')], [forma('a')], false);
    const r = recibir(vistos, [forma('a'), forma('b'), forma('d', false)], [forma('a'), forma('b'), forma('d', false)], false);
    expect(r.nuevos.map((t) => t.id)).toEqual(['b']);
    expect(recibir(r.vistos, [forma('a'), forma('b')], [forma('a'), forma('b')], false).nuevos).toEqual([]);
  });
  it('lo que aparece primero en lo que ve Diego (pegar, duplicar una capa) no se anima al volver del programa local', () => {
    const { vistos } = recibir(null, [], [], false);
    const antes = recibir(vistos, [], [forma('copia')], false);
    expect(antes.nuevos).toEqual([]);
    expect(recibir(antes.vistos, [forma('copia')], [forma('copia')], false).nuevos).toEqual([]);
  });
});

describe('dibujar a medias', () => {
  it('cortarPorLargo sigue las líneas en orden hasta la fracción pedida', () => {
    const lineas = [[{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 10 }, { x: 100, y: 10 }]];
    expect(cortarPorLargo(lineas, 0)).toEqual([]);
    expect(cortarPorLargo(lineas, 0.75)).toEqual([lineas[0], [{ x: 0, y: 10 }, { x: 50, y: 10 }]]);
    expect(cortarPorLargo(lineas, 1)).toEqual(lineas);
  });
  it('la letra se escribe letra a letra', () => {
    const t = letra('t', 'ab');
    expect(lineasParciales(t, 0.5)).toEqual(letrasDe(t)[0]);
    expect(lineasParciales(t, 1)).toEqual(letrasDe(t).flat());
  });
  it('el lápiz a medias conserva sus primeros puntos y su presión', () => {
    const t = lapiz('l', 100);
    expect(lapizParcial(t, 0.5)).toMatchObject({ puntos: [0, 0, 50, 0], presion: [0.2, 0.5] });
    expect(lapizParcial(t, 1)).toBe(t);
  });
});
