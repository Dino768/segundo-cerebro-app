import { describe, expect, it } from 'vitest';
import { activaInicial, activaVisible, CAPAS_INICIALES, completarCapas, idCapaLibre, normalizarCapas, opCrearCapa, opDuplicarCapa, opMoverCapa, porCapas } from './capas.ts';
import { aplicarOperacion, validarPizarra } from './pizarra.ts';

describe('capas', () => {
  it('siempre están la de Claude (abajo si falta) y una de Diego', () => {
    expect(completarCapas([])).toEqual(CAPAS_INICIALES);
    expect(completarCapas([{ id: 'capa-2', nombre: 'Ejercicio' }])).toEqual([{ id: 'claude', nombre: 'Claude' }, { id: 'capa-2', nombre: 'Ejercicio' }]);
    expect(completarCapas([{ id: 'capa-2', nombre: 'A' }, { id: 'claude', nombre: 'Otra' }])).toEqual([{ id: 'capa-2', nombre: 'A' }, { id: 'claude', nombre: 'Claude' }]);
    expect(completarCapas([{ id: 'claude', nombre: 'Claude' }])).toEqual(CAPAS_INICIALES);
  });
  it('lo que no tiene capa (o tiene una que no existe) va a la de Claude o a la primera de Diego', () => {
    const p = normalizarCapas({
      capas: [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-2', nombre: 'Mía' }, { id: 'capa-3', nombre: 'Otra' }],
      piezas: [{ id: 't1', tipo: 'texto' }, { id: 'n1', tipo: 'nota' }, { id: 'n2', tipo: 'nota', capa: 'capa-3' }, { id: 'n3', tipo: 'nota', capa: 'no-existe' }] as { id: string; tipo: string; capa?: string }[],
      trazos: [{ id: 'a', autor: 'claude' }, { id: 'b' }] as { id: string; autor?: string; capa?: string }[],
    });
    expect(p.piezas.map((x) => x.capa)).toEqual(['claude', 'capa-2', 'capa-3', 'capa-2']);
    expect(p.trazos.map((x) => x.capa)).toEqual(['claude', 'capa-2']);
  });
  it('ids libres, capa activa al empezar y al ocultar', () => {
    const capas = [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'A' }, { id: 'capa-2', nombre: 'B' }];
    expect(idCapaLibre(capas)).toBe('capa-3');
    expect(activaInicial(capas)).toBe('capa-2');
    expect(activaVisible(capas, new Set(['capa-2']), 'capa-2')).toBe('capa-1');
    expect(activaVisible(capas, new Set(['capa-1', 'capa-2']), 'capa-2')).toBe('claude');
    expect(activaVisible(capas, new Set(['claude', 'capa-1', 'capa-2']), 'capa-2')).toBeNull();
    expect(activaVisible(capas, new Set(), 'borrada')).toBe('capa-2');
  });
  it('porCapas reparte por capa, con el subrayador aparte, y se salta las ocultas', () => {
    const r = porCapas(
      CAPAS_INICIALES,
      [{ id: 't1', capa: 'claude' }],
      [{ id: 'a', capa: 'capa-1', herramienta: 'subrayador' }, { id: 'b', capa: 'capa-1', herramienta: 'lapiz' }],
      new Set(['claude']),
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ capa: { id: 'capa-1' }, piezas: [], subrayados: [{ id: 'a' }], trazos: [{ id: 'b' }] });
  });
});

describe('operaciones de capas', () => {
  const p = validarPizarra({
    version: 2, titulo: 'x',
    piezas: [{ id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'a' }, { id: 't2', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'b' }],
    flechas: [{ id: 'a1', de: 't1', a: 't2' }],
    trazos: [{ id: 'c1', herramienta: 'flecha', color: '#000000', grosor: 2, puntos: [0, 0, 9, 9], autor: 'claude' }],
  }).pizarra;
  it('crear pone la capa encima de la activa', () => {
    expect(opCrearCapa(p, 'claude')).toEqual({ id: 'capa-2', op: { tipo: 'capa', accion: 'crear', id: 'capa-2', nombre: 'Capa 2', posicion: 1 } });
  });
  it('duplicar la de Claude da una capa de Diego con copias (flechas incluidas) y sin autor', () => {
    const r = opDuplicarCapa(p, 'claude')!;
    const q = aplicarOperacion(p, r.op);
    expect(q.capas.map((c) => c.nombre)).toEqual(['Claude', 'Claude (copia)', 'Capa 1']);
    expect(q.piezas.filter((x) => x.capa === r.id)).toHaveLength(2);
    expect(q.flechas).toHaveLength(2);
    expect(q.trazos.find((t) => t.capa === r.id)?.autor).toBeUndefined();
  });
  it('subir y bajar una capa', () => {
    expect(opMoverCapa(p, 'claude', 1)).toEqual({ tipo: 'capa', accion: 'ordenar', id: 'claude', posicion: 1 });
    expect(opMoverCapa(p, 'claude', -1)).toBeNull();
  });
});
