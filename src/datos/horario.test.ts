import { describe, expect, it } from 'vitest';
import { AJUSTES_VACIOS, parseAjustesHorario, parseHorario, serializarAjustesHorario, serializarHorario, type AjustesHorario, type Clase } from './horario.ts';

const c1: Clase = { fecha: '2026-09-16', inicio: '09:00', fin: '11:00', asignatura: 'algebra', aula: 'Aula 3S2 · Aulario III', profesor: 'David Gonzalez de la Aleja Gallego' };
const c2: Clase = { fecha: '2026-09-23', inicio: '11:00', fin: '13:00', asignatura: 'algebra', desdoble: 'G2' };

describe('horario.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseHorario(serializarHorario([c1, c2]))).toEqual([c1, c2]);
    expect(parseHorario(null)).toEqual([]);
    expect(parseHorario('')).toEqual([]);
  });
  it('acepta horas sin comillas', () => {
    expect(parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: 09:00\n    fin: 11:00\n    asignatura: algebra\n')[0].inicio).toBe('09:00');
  });
  it('errores claros', () => {
    expect(() => parseHorario('clases: 3')).toThrow(/lista/);
    expect(() => parseHorario('clases:\n  - fecha: ayer\n    inicio: "09:00"\n    fin: "11:00"\n    asignatura: a\n')).toThrow(/clase 1.*fecha/);
    expect(() => parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: "9h"\n    fin: "11:00"\n    asignatura: a\n')).toThrow(/clase 1.*inicio/);
    expect(() => parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: "09:00"\n    fin: "11:00"\n')).toThrow(/clase 1.*asignatura/);
  });
});

describe('horario-ajustes.yaml', () => {
  const a: AjustesHorario = {
    grupo: 'G_ROBOT_1A(F)', curso: 1, desdoble: 'G2',
    quitadas: [{ fecha: '2026-09-24', inicio: '09:00', asignatura: 'electronica-digital' }],
    sueltas: [{ fecha: '2026-10-15', inicio: '11:00', fin: '13:00', asignatura: 'electronica-digital', aula: 'Aula 3S2', nota: 'Recuperación' }],
  };
  it('ida y vuelta', () => {
    expect(parseAjustesHorario(serializarAjustesHorario(a))).toEqual(a);
    expect(parseAjustesHorario(null)).toEqual(AJUSTES_VACIOS);
    expect(parseAjustesHorario('grupo: "X"\n')).toEqual({ grupo: 'X', quitadas: [], sueltas: [] });
  });
  it('errores claros', () => {
    expect(() => parseAjustesHorario('desdoble: grupo2\n')).toThrow(/desdoble/);
    expect(() => parseAjustesHorario('curso: primero\n')).toThrow(/curso/);
    expect(() => parseAjustesHorario('quitadas:\n  - fecha: 2026-09-24\n    asignatura: x\n')).toThrow(/quitada 1.*inicio/);
    expect(() => parseAjustesHorario('sueltas:\n  - fecha: 2026-09-24\n    inicio: "11:00"\n    asignatura: x\n')).toThrow(/suelta 1.*fin/);
  });
});
