import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import {
  aplicarEdicion, atrasadas, borrarDeLista, fijarEnLista, fijarHecha, hechaEl, nuevoIdTarea,
  ocurreEl, proximas, repetidas, sinFecha, tareasDelDia, topSinFecha,
} from './tareas';

const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'uni', ...x });
const ids = (ts: Tarea[]) => ts.map((x) => x.id);

// 2026-09-21 es lunes; 2026-09-23 es miércoles.
describe('ocurreEl', () => {
  it('una tarea con fecha ocurre solo ese día', () => {
    expect(ocurreEl(t({ id: 'a', fecha: '2026-09-23' }), '2026-09-23')).toBe(true);
    expect(ocurreEl(t({ id: 'a', fecha: '2026-09-23' }), '2026-09-24')).toBe(false);
  });
  it('una tarea repetida ocurre los días indicados', () => {
    const r = t({ id: 'r', repetir: ['lun', 'mie'] });
    expect(ocurreEl(r, '2026-09-21')).toBe(true);
    expect(ocurreEl(r, '2026-09-22')).toBe(false);
  });
  it('una repetida con fecha empieza ese día', () => {
    const r = t({ id: 'r', repetir: ['lun'], fecha: '2026-09-23' });
    expect(ocurreEl(r, '2026-09-21')).toBe(false);
    expect(ocurreEl(r, '2026-09-28')).toBe(true);
  });
  it('una tarea sin fecha ni repetición no aparece en ningún día', () => {
    expect(ocurreEl(t({ id: 's' }), '2026-09-23')).toBe(false);
  });
});

describe('tareasDelDia', () => {
  it('primero las que tienen hora (por hora) y luego el resto por prioridad', () => {
    const dia = '2026-09-23';
    const ts = [
      t({ id: 'tarde', fecha: dia, hora: '18:00', prioridad: 'baja' }),
      t({ id: 'sinHoraBaja', fecha: dia, prioridad: 'baja' }),
      t({ id: 'manana', fecha: dia, hora: '09:00' }),
      t({ id: 'sinHoraAlta', fecha: dia, prioridad: 'alta' }),
      t({ id: 'otroDia', fecha: '2026-09-24' }),
    ];
    expect(ids(tareasDelDia(ts, dia))).toEqual(['manana', 'tarde', 'sinHoraAlta', 'sinHoraBaja']);
  });
});

describe('hechaEl y fijarHecha', () => {
  it('tarea normal', () => {
    const a = t({ id: 'a', fecha: '2026-09-23' });
    expect(hechaEl(a, '2026-09-23')).toBe(false);
    expect(hechaEl(fijarHecha(a, '2026-09-23', true), '2026-09-23')).toBe(true);
    expect(hechaEl(fijarHecha(a, '2026-09-23', false), '2026-09-23')).toBe(false);
  });
  it('fijar dos veces a hecha no la desmarca', () => {
    const a = t({ id: 'a' });
    expect(fijarHecha(fijarHecha(a, '2026-09-23', true), '2026-09-23', true).hecha).toBe(true);
    const r = t({ id: 'r', repetir: ['lun'] });
    expect(fijarHecha(fijarHecha(r, '2026-09-21', true), '2026-09-21', true).hechas).toEqual(['2026-09-21']);
  });
  it('tarea repetida: se marca por día', () => {
    const r = t({ id: 'r', repetir: ['lun'] });
    const marcada = fijarHecha(r, '2026-09-21', true);
    expect(marcada.hechas).toEqual(['2026-09-21']);
    expect(hechaEl(marcada, '2026-09-28')).toBe(false);
    expect(fijarHecha(marcada, '2026-09-21', false).hechas).toBeUndefined();
  });
});

describe('listas', () => {
  const hoy = '2026-09-23';
  const ts = [
    t({ id: 'vieja', fecha: '2026-09-01' }),
    t({ id: 'viejaHecha', fecha: '2026-09-01', hecha: true }),
    t({ id: 'ayer', fecha: '2026-09-22', prioridad: 'alta' }),
    t({ id: 'rep', repetir: ['lun'] }),
    t({ id: 'futura', fecha: '2026-10-05' }),
    t({ id: 'hoy', fecha: hoy }),
    t({ id: 'sfBaja', prioridad: 'baja' }),
    t({ id: 'sfMedia' }),
    t({ id: 'sfAlta', prioridad: 'alta' }),
    t({ id: 'sfAlta2', prioridad: 'alta' }),
    t({ id: 'sfHecha', prioridad: 'alta', hecha: true }),
  ];

  it('atrasadas: con fecha pasada y sin hacer, nunca repetidas', () => {
    expect(ids(atrasadas(ts, hoy))).toEqual(['vieja', 'ayer']);
  });
  it('proximas: de hoy en adelante y sin hacer', () => {
    expect(ids(proximas(ts, hoy))).toEqual(['hoy', 'futura']);
  });
  it('repetidas', () => {
    expect(ids(repetidas(ts))).toEqual(['rep']);
  });
  it('sinFecha: por prioridad y con las hechas al final', () => {
    expect(ids(sinFecha(ts))).toEqual(['sfAlta', 'sfAlta2', 'sfMedia', 'sfBaja', 'sfHecha']);
  });
  it('topSinFecha: las 3 más prioritarias sin hacer', () => {
    expect(ids(topSinFecha(ts))).toEqual(['sfAlta', 'sfAlta2', 'sfMedia']);
  });
});

describe('nuevoIdTarea', () => {
  const ahora = new Date(2026, 8, 23, 12);
  it('usa el siguiente número libre del día', () => {
    expect(nuevoIdTarea(ahora, [t({ id: 't-20260923-1' }), t({ id: 't-20260923-4' }), t({ id: 't-20260922-9' })])).toBe('t-20260923-5');
  });
  it('empieza en 1', () => {
    expect(nuevoIdTarea(ahora, [])).toBe('t-20260923-1');
  });
});

describe('cambios sobre la lista', () => {
  const ahora = new Date(2026, 8, 23, 12);
  const ts = [t({ id: 'a' }), t({ id: 'b' })];

  it('aplicarEdicion añade una tarea nueva con id', () => {
    const r = aplicarEdicion(ts, null, { titulo: 'Nueva', area: 'uni' }, ahora);
    expect(r).toHaveLength(3);
    expect(r[2]).toEqual({ id: 't-20260923-1', titulo: 'Nueva', area: 'uni' });
  });
  it('aplicarEdicion cambia solo los campos editados y respeta los cambios remotos', () => {
    const original = t({ id: 'a', titulo: 'Viejo', notas: 'n' });
    const remota = [t({ id: 'a', titulo: 'Viejo', notas: 'n', hecha: true, prioridad: 'alta' }), t({ id: 'b' })];
    const r = aplicarEdicion(remota, original, { ...original, titulo: 'Nuevo', notas: undefined }, ahora);
    expect(r[0]).toEqual({ id: 'a', titulo: 'Nuevo', area: 'uni', hecha: true, prioridad: 'alta' });
    expect(r[1]).toBe(remota[1]);
  });
  it('aplicarEdicion compara las listas por contenido', () => {
    const original = t({ id: 'r', repetir: ['lun'], hechas: ['2026-09-21'] });
    const remota = [t({ id: 'r', repetir: ['lun', 'mie'], hechas: ['2026-09-21', '2026-09-23'] })];
    const r = aplicarEdicion(remota, original, { ...original, repetir: ['lun'], titulo: 'X' }, ahora);
    expect(r[0].repetir).toEqual(['lun', 'mie']);
    expect(r[0].hechas).toEqual(['2026-09-21', '2026-09-23']);
    expect(r[0].titulo).toBe('X');
  });
  it('aplicarEdicion vuelve a añadir una tarea que se borró mientras se editaba', () => {
    const original = t({ id: 'a' });
    const r = aplicarEdicion([t({ id: 'b' })], original, { ...original, titulo: 'Editada' }, ahora);
    expect(ids(r)).toEqual(['b', 'a']);
    expect(r[1].titulo).toBe('Editada');
  });
  it('borrarDeLista', () => {
    expect(ids(borrarDeLista(ts, 'a'))).toEqual(['b']);
  });
  it('fijarEnLista cambia solo esa tarea', () => {
    const r = fijarEnLista(ts, 'b', '2026-09-23', true);
    expect(r[0].hecha).toBeUndefined();
    expect(r[1].hecha).toBe(true);
    expect(fijarEnLista(r, 'b', '2026-09-23', true)[1].hecha).toBe(true);
  });
});
