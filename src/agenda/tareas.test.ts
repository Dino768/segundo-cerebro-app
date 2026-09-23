import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import {
  alternarEnLista, alternarHecha, atrasadas, borrarDeLista, guardarEnLista, hechaEl, nuevoIdTarea,
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

describe('hechaEl y alternarHecha', () => {
  it('tarea normal', () => {
    const a = t({ id: 'a', fecha: '2026-09-23' });
    expect(hechaEl(a, '2026-09-23')).toBe(false);
    expect(hechaEl(alternarHecha(a, '2026-09-23'), '2026-09-23')).toBe(true);
  });
  it('tarea repetida: se marca por día', () => {
    const r = t({ id: 'r', repetir: ['lun'] });
    const marcada = alternarHecha(r, '2026-09-21');
    expect(marcada.hechas).toEqual(['2026-09-21']);
    expect(hechaEl(marcada, '2026-09-28')).toBe(false);
    expect(alternarHecha(marcada, '2026-09-21').hechas).toBeUndefined();
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

  it('guardarEnLista añade una tarea nueva con id', () => {
    const r = guardarEnLista(ts, { titulo: 'Nueva', area: 'uni' }, ahora);
    expect(r).toHaveLength(3);
    expect(r[2]).toEqual({ id: 't-20260923-1', titulo: 'Nueva', area: 'uni' });
  });
  it('guardarEnLista sustituye una tarea existente en su sitio', () => {
    expect(guardarEnLista(ts, { id: 'a', titulo: 'Cambiada', area: 'uni' }, ahora)[0].titulo).toBe('Cambiada');
  });
  it('guardarEnLista vuelve a añadir una tarea que se borró mientras se editaba', () => {
    const r = guardarEnLista([t({ id: 'b' })], { id: 'a', titulo: 'Editada', area: 'uni' }, ahora);
    expect(ids(r)).toEqual(['b', 'a']);
  });
  it('borrarDeLista', () => {
    expect(ids(borrarDeLista(ts, 'a'))).toEqual(['b']);
  });
  it('alternarEnLista cambia solo esa tarea', () => {
    const r = alternarEnLista(ts, 'b', '2026-09-23');
    expect(r[0].hecha).toBeUndefined();
    expect(r[1].hecha).toBe(true);
  });
});
