import { describe, expect, it } from 'vitest';
import type { AjustesHorario, Clase } from '../datos/horario';
import {
  ahoraYSiguiente, anadirSuelta, borrarSuelta, clasesActivas, clasesDelDia, horaBonita, horasCuadricula, quitarClase, volverAPoner,
} from './horario';

const cl = (fecha: string, inicio: string, fin: string, asignatura: string): Clase => ({ fecha, inicio, fin, asignatura });
// Lunes 5 y martes 6 de octubre de 2026; viernes 9.
const clases = [
  cl('2026-10-05', '09:00', '11:00', 'algebra'),
  cl('2026-10-05', '11:00', '13:00', 'emprendimiento'),
  cl('2026-10-06', '09:00', '11:00', 'electronica-digital'),
  cl('2026-10-09', '11:00', '13:00', 'fundamentos-programacion'),
];
const sin: AjustesHorario = { quitadas: [], sueltas: [] };
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00`);

describe('clases del día', () => {
  it('ordenadas, con las sueltas y las quitadas marcadas', () => {
    const ajustes: AjustesHorario = {
      quitadas: [{ fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' }],
      sueltas: [{ fecha: '2026-10-05', inicio: '15:00', fin: '16:00', asignatura: 'calculo', nota: 'Recuperación' }],
    };
    const r = clasesDelDia(clases, ajustes, '2026-10-05');
    expect(r.map((c) => [c.inicio, c.asignatura, c.quitada ?? false, c.suelta ?? false])).toEqual([
      ['09:00', 'algebra', true, false], ['11:00', 'emprendimiento', false, false], ['15:00', 'calculo', false, true],
    ]);
    expect(r[2].nota).toBe('Recuperación');
    expect(clasesActivas(clases, ajustes, '2026-10-05').map((c) => c.asignatura)).toEqual(['emprendimiento', 'calculo']);
  });
});

describe('ahora y siguiente', () => {
  it('antes de la primera clase', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '08:30'))).toMatchObject({ enCurso: null, siguiente: { asignatura: 'algebra' }, esManana: false });
  });
  it('en clase, con la siguiente', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '10:15'))).toMatchObject({ enCurso: { asignatura: 'algebra' }, siguiente: { asignatura: 'emprendimiento' } });
  });
  it('justo cuando acaba una clase y empieza otra, manda la que empieza', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '11:00'))).toMatchObject({ enCurso: { asignatura: 'emprendimiento' }, siguiente: null, esManana: false });
  });
  it('después de la última: la primera de mañana', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '13:00'))).toMatchObject({ enCurso: null, siguiente: { asignatura: 'electronica-digital' }, esManana: true });
  });
  it('viernes por la tarde (mañana no hay clase): nada', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-09', '14:00'))).toEqual({ enCurso: null, siguiente: null, esManana: false });
  });
  it('una clase quitada no cuenta', () => {
    const ajustes = quitarClase(sin, { fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' });
    expect(ahoraYSiguiente(clases, ajustes, a('2026-10-05', '08:30'))).toMatchObject({ siguiente: { asignatura: 'emprendimiento' } });
  });
});

describe('cambios a mano', () => {
  const q = { fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' };
  it('quitar no duplica y volver a poner la quita de la lista', () => {
    const quitada = quitarClase(quitarClase(sin, q), q);
    expect(quitada.quitadas).toEqual([q]);
    expect(volverAPoner(quitada, q).quitadas).toEqual([]);
  });
  it('añadir y borrar una suelta sin tocar lo demás', () => {
    const base: AjustesHorario = { grupo: 'G', desdoble: 'G2', quitadas: [q], sueltas: [] };
    const s = { fecha: '2026-10-15', inicio: '11:00', fin: '13:00', asignatura: 'electronica-digital' };
    const con = anadirSuelta(base, s);
    expect(con).toEqual({ ...base, sueltas: [s] });
    expect(borrarSuelta(con, { fecha: s.fecha, inicio: s.inicio, asignatura: s.asignatura })).toEqual(base);
  });
});

describe('cuadrícula', () => {
  it('como mínimo de 9 a 15, y se estira si hace falta', () => {
    expect(horasCuadricula([])).toEqual({ desde: 9, hasta: 15 });
    expect(horasCuadricula([{ ...cl('2026-10-05', '08:30', '10:00', 'a') }, { ...cl('2026-10-05', '16:00', '17:30', 'b') }])).toEqual({ desde: 8, hasta: 18 });
  });
  it('horas bonitas', () => {
    expect(horaBonita('09:00')).toBe('9:00');
    expect(horaBonita('11:30')).toBe('11:30');
  });
});
