import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas.ts';
import { fusionar } from './fusionar.ts';
import type { Propuesta } from './tipos.ts';

const HOY = '2026-09-30';

const examen = (x: Partial<Propuesta> = {}): Propuesta => ({
  origen: 'urjc-examen:2026-27:2327007:E:AM', titulo: 'Cálculo (enero)', tipo: 'examen', area: 'calculo',
  fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204', notasDeLaFuente: true, ...x,
});
const entrega = (x: Partial<Propuesta> = {}): Propuesta => ({
  origen: 'moodle:1@aula', titulo: 'Práctica 1', tipo: 'entrega', area: 'fundamentos-programacion',
  fecha: '2026-10-05', hora: '23:59', notas: 'Sube el código', notasDeLaFuente: false, ...x,
});
const mia: Tarea = { id: 't-20260930-1', titulo: 'Ir a entrenar', area: 'salud' };

describe('fusionar', () => {
  it('crea lo nuevo con id del día, sin repetir, y lo apunta en vistos', () => {
    const r = fusionar([mia, { ...mia, id: 't-20260930-2' }], {}, [examen(), entrega()], HOY);
    expect(r.creadas).toBe(2);
    expect(r.actualizadas).toBe(0);
    expect(r.tareas.slice(2)).toEqual([
      { id: 't-20260930-3', titulo: 'Cálculo (enero)', tipo: 'examen', area: 'calculo',
        fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204', origen: 'urjc-examen:2026-27:2327007:E:AM' },
      { id: 't-20260930-4', titulo: 'Práctica 1', tipo: 'entrega', area: 'fundamentos-programacion',
        fecha: '2026-10-05', hora: '23:59', notas: 'Sube el código', origen: 'moodle:1@aula' },
    ]);
    expect(r.vistos).toEqual({
      'urjc-examen:2026-27:2327007:E:AM': { fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204' },
      'moodle:1@aula': { fecha: '2026-10-05', hora: '23:59' },
    });
  });
  it('la segunda vez no cambia nada', () => {
    const a = fusionar([mia], {}, [examen(), entrega()], HOY);
    const b = fusionar(a.tareas, a.vistos, [examen(), entrega()], HOY);
    expect(b).toEqual({ ...a, creadas: 0, actualizadas: 0 });
  });
  it('lo que Diego borró no vuelve', () => {
    const a = fusionar([], {}, [entrega()], HOY);
    const b = fusionar([], a.vistos, [entrega()], HOY);
    expect(b.tareas).toEqual([]);
    expect(b.creadas).toBe(0);
  });
  it('si la URJC mueve el examen, cambian fecha, hora y aula; lo de Diego se queda', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const editada = { ...a.tareas[0], titulo: 'EXAMEN CÁLCULO', prioridad: 'baja' as const, hecha: true, proyecto: 'uni' };
    const b = fusionar([editada], a.vistos, [examen({ fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' })], HOY);
    expect(b.actualizadas).toBe(1);
    expect(b.tareas[0]).toEqual({ ...editada, fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' });
    expect(b.vistos['urjc-examen:2026-27:2327007:E:AM']).toEqual({ fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' });
  });
  it('las notas y la hora que escribe Diego se respetan mientras la URJC no las cambie', () => {
    const a = fusionar([], {}, [examen(), entrega()], HOY);
    const tareas = [{ ...a.tareas[0], notas: 'Repasar tema 3' }, { ...a.tareas[1], hora: '20:00', notas: 'Mis notas' }];
    const b = fusionar(tareas, a.vistos, [examen(), entrega({ notas: 'Descripción nueva del profe' })], HOY);
    expect(b.actualizadas).toBe(0);
    expect(b.tareas).toEqual(tareas);
  });
  it('si la fuente quita la hora, se quita el campo', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, a.vistos, [examen({ hora: undefined })], HOY);
    expect('hora' in b.tareas[0]).toBe(false);
  });
  it('lo que desaparece de la fuente no se borra', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, a.vistos, [], HOY);
    expect(b.tareas).toEqual(a.tareas);
  });
  it('la misma cosa dos veces en la fuente → una sola tarea', () => {
    const r = fusionar([], {}, [examen(), examen()], HOY);
    expect(r.tareas).toHaveLength(1);
    expect(r.creadas).toBe(1);
  });
  it('si se perdió la lista de vistos, no duplica lo que ya está en tareas', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, {}, [examen()], HOY);
    expect(b.tareas).toEqual(a.tareas);
    expect(b.creadas).toBe(0);
    expect(b.vistos).toEqual(a.vistos);
  });
  it('quita de vistos lo que ya ha pasado', () => {
    const r = fusionar([], { 'moodle:viejo': { fecha: '2026-09-29' }, 'moodle:hoy': { fecha: HOY } }, [], HOY);
    expect(Object.keys(r.vistos)).toEqual(['moodle:hoy']);
  });
  it('un evento del profesor se crea como tarea (sin campo tipo)', () => {
    const r = fusionar([], {}, [entrega({ origen: 'moodle:9@aula', titulo: 'Parcial', tipo: 'tarea' })], HOY);
    expect('tipo' in r.tareas[0]).toBe(false);
  });
  it('no cambia los arrays ni las tareas que recibe', () => {
    const tareas = [mia];
    const vistos = {};
    fusionar(tareas, vistos, [examen()], HOY);
    expect(tareas).toEqual([mia]);
    expect(vistos).toEqual({});
  });
});
