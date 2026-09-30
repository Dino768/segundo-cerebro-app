import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import { addDays } from '../fechas';
import { enPlazo, faltan, prioridadEfectiva, textoFaltan } from './plazos';

const HOY = '2026-10-01';
const en = (dias: number, x: Partial<Tarea>): Tarea => ({ id: 'a', titulo: 'A', area: 'uni', fecha: addDays(HOY, dias), ...x });

describe('plazos', () => {
  it('faltan cuenta días naturales, también con cambio de hora', () => {
    expect(faltan('2026-10-01', HOY)).toBe(0);
    expect(faltan('2026-10-26', HOY)).toBe(25); // el 25 de octubre cambia la hora
    expect(faltan('2026-09-30', HOY)).toBe(-1);
  });
  it('exámenes: fuera a 22 días, media de 21 a 8, alta a 7 o menos', () => {
    const ex = (d: number) => en(d, { tipo: 'examen' });
    expect([enPlazo(ex(22), HOY), prioridadEfectiva(ex(22), HOY)]).toEqual([false, 'baja']);
    expect([enPlazo(ex(21), HOY), prioridadEfectiva(ex(21), HOY)]).toEqual([true, 'media']);
    expect(prioridadEfectiva(ex(8), HOY)).toBe('media');
    expect(prioridadEfectiva(ex(7), HOY)).toBe('alta');
    expect([enPlazo(ex(0), HOY), prioridadEfectiva(ex(0), HOY)]).toEqual([true, 'alta']);
  });
  it('entregas: fuera a 15 días, media de 14 a 4, alta a 3 o menos', () => {
    const e = (d: number) => en(d, { tipo: 'entrega' });
    expect([enPlazo(e(15), HOY), prioridadEfectiva(e(15), HOY)]).toEqual([false, 'baja']);
    expect([enPlazo(e(14), HOY), prioridadEfectiva(e(14), HOY)]).toEqual([true, 'media']);
    expect(prioridadEfectiva(e(4), HOY)).toBe('media');
    expect(prioridadEfectiva(e(3), HOY)).toBe('alta');
  });
  it('la prioridad escrita a mano manda', () => {
    expect(prioridadEfectiva(en(100, { tipo: 'examen', prioridad: 'alta' }), HOY)).toBe('alta');
    expect(prioridadEfectiva(en(1, { tipo: 'examen', prioridad: 'baja' }), HOY)).toBe('baja');
  });
  it('las tareas normales, sin fecha o pasadas no están en plazo', () => {
    expect(enPlazo(en(3, {}), HOY)).toBe(false);
    expect(prioridadEfectiva(en(3, {}), HOY)).toBe('media');
    expect(enPlazo({ id: 'a', titulo: 'A', area: 'uni', tipo: 'examen' }, HOY)).toBe(false);
    expect(enPlazo(en(-1, { tipo: 'entrega' }), HOY)).toBe(false);
  });
  it('textoFaltan', () => {
    expect(textoFaltan(0)).toBe('hoy');
    expect(textoFaltan(1)).toBe('mañana');
    expect(textoFaltan(5)).toBe('faltan 5 días');
  });
});
