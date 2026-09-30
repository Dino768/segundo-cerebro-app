import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import { estadoInicial, tareaDelFormulario, type EstadoForm } from './formTarea';

const HOY = '2026-10-01';
const base = (x: Partial<EstadoForm> = {}): EstadoForm => ({ ...estadoInicial(null, {}, 'personal', undefined), titulo: 'Boxeo', ...x });
const tarea = (r: ReturnType<typeof tareaDelFormulario>) => {
  if ('error' in r) throw new Error(r.error);
  return r.tarea;
};

describe('estadoInicial', () => {
  it('lee una tarea existente con repetición y final', () => {
    const t: Tarea = { id: 'a', titulo: 'Boxeo', area: 'salud', tipo: 'evento', fecha: '2026-10-01', hora: '19:00', repetir: ['lun', 'vie'], hasta: '2026-10-31' };
    expect(estadoInicial(t, {}, 'personal', undefined)).toMatchObject({
      tipo: 'evento', area: 'salud', modoRepetir: 'semana', dias: ['lun', 'vie'], modoFin: 'fecha', hastaFecha: '2026-10-31', prioridad: '',
    });
    expect(estadoInicial({ ...t, repetir: 'mes', hasta: undefined }, {}, 'x', undefined)).toMatchObject({ modoRepetir: 'mes', modoFin: 'sin' });
  });
  it('una nueva es una tarea sin repetir', () => {
    expect(estadoInicial(null, { fecha: HOY }, 'uni', 'books')).toMatchObject({ tipo: 'tarea', area: 'uni', icono: 'books', fecha: HOY, modoRepetir: 'no' });
  });
});

describe('tareaDelFormulario', () => {
  it('evento semanal «durante 1 mes» → hasta calculado y sin prioridad ni proyecto', () => {
    const t = tarea(tareaDelFormulario(base({
      tipo: 'evento', fecha: HOY, hora: '19:00', modoRepetir: 'semana', dias: ['vie', 'lun'], modoFin: 'durante', durante: 1, unidad: 'meses',
      prioridad: 'alta', proyecto: 'x', notas: 'n',
    }), null, HOY));
    expect(t).toMatchObject({ tipo: 'evento', fecha: HOY, hora: '19:00', repetir: ['lun', 'vie'], hasta: '2026-10-31' });
    expect(t.prioridad).toBeUndefined();
    expect(t.proyecto).toBeUndefined();
    expect(t.notas).toBeUndefined();
  });
  it('cada mes sin fecha empieza hoy', () => {
    expect(tarea(tareaDelFormulario(base({ modoRepetir: 'mes' }), null, HOY))).toMatchObject({ repetir: 'mes', fecha: HOY });
  });
  it('«hasta» anterior al inicio no se guarda', () => {
    const r = tareaDelFormulario(base({ fecha: '2026-10-10', modoRepetir: 'semana', dias: ['lun'], modoFin: 'fecha', hastaFecha: '2026-10-01' }), null, HOY);
    expect(r).toEqual({ error: 'El último día no puede ser anterior a la fecha de inicio.' });
  });
  it('días de la semana sin ningún día marcado → no se repite', () => {
    const t = tarea(tareaDelFormulario(base({ modoRepetir: 'semana', dias: [], modoFin: 'durante' }), null, HOY));
    expect(t.repetir).toBeUndefined();
    expect(t.hasta).toBeUndefined();
  });
  it('prioridad: en una tarea «media» no se escribe; en un examen vacío = automática', () => {
    expect(tarea(tareaDelFormulario(base({ prioridad: 'media' }), null, HOY)).prioridad).toBeUndefined();
    expect(tarea(tareaDelFormulario(base({ tipo: 'examen', prioridad: '' }), null, HOY)).prioridad).toBeUndefined();
    expect(tarea(tareaDelFormulario(base({ tipo: 'examen', prioridad: 'media' }), null, HOY)).prioridad).toBe('media');
  });
  it('un recado solo guarda título, área y fecha; el tipo tarea no se escribe', () => {
    const r = tarea(tareaDelFormulario(base({ tipo: 'recado', hora: '10:00', notas: 'x', modoRepetir: 'semana', dias: ['lun'] }), null, HOY));
    expect(r).toMatchObject({ tipo: 'recado', titulo: 'Boxeo', area: 'personal' });
    expect([r.hora, r.notas, r.repetir]).toEqual([undefined, undefined, undefined]);
    expect(tarea(tareaDelFormulario(base(), null, HOY)).tipo).toBeUndefined();
  });
  it('al editar conserva lo que el formulario no enseña (origen, hechas…)', () => {
    const original: Tarea = { id: 'a', titulo: 'Práctica 1', area: 'calculo', tipo: 'entrega', fecha: '2026-10-05', origen: 'moodle:1@aula', hecha: false };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), titulo: 'Práctica 1 (grupo)' }, original, HOY));
    expect(t).toMatchObject({ id: 'a', origen: 'moodle:1@aula', tipo: 'entrega', titulo: 'Práctica 1 (grupo)' });
  });
  it('pasar de tarea a evento quita prioridad y proyecto', () => {
    const original: Tarea = { id: 'a', titulo: 'Boxeo', area: 'salud', prioridad: 'alta', proyecto: 'p', repetir: ['lun'] };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), tipo: 'evento' }, original, HOY));
    expect(t).toMatchObject({ tipo: 'evento', repetir: ['lun'] });
    expect([t.prioridad, t.proyecto]).toEqual([undefined, undefined]);
  });
  it('editar un evento sin cambiar el tipo no borra lo que el formulario no enseña (notas, proyecto)', () => {
    const original: Tarea = { id: 'a', titulo: 'Cumpleaños de mamá', area: 'personal', tipo: 'evento', fecha: '2027-03-14', notas: 'regalo: libro', proyecto: 'p' };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), hora: '18:00' }, original, HOY));
    expect(t).toMatchObject({ notas: 'regalo: libro', proyecto: 'p', hora: '18:00' });
  });
  it('editar un recado sin cambiar el tipo conserva su hora y sus notas', () => {
    const original: Tarea = { id: 'a', titulo: 'Huevos', area: 'personal', tipo: 'recado', hora: '10:00', notas: 'una docena' };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), titulo: 'Huevos y leche' }, original, HOY));
    expect(t).toMatchObject({ hora: '10:00', notas: 'una docena' });
  });
  it('al cambiar de tipo las notas no se pierden', () => {
    const original: Tarea = { id: 'a', titulo: 'Boxeo', area: 'salud', notas: 'gimnasio nuevo', repetir: ['lun'] };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), tipo: 'evento' }, original, HOY));
    expect(t.notas).toBe('gimnasio nuevo');
  });
  it('sin título, error', () => {
    expect(tareaDelFormulario(base({ titulo: '  ' }), null, HOY)).toEqual({ error: 'Escribe un título.' });
  });
});
