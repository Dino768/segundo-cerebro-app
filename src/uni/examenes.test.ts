import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import { leerExamenes, propuestasDeExamenes } from './examenes.ts';

const ASIG = new Map<string, Asignatura>([
  ['2327007', { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }],
  ['2327002', { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' }],
]);

const examen = (x: Record<string, unknown>) => ({
  COD_ASIGNATURA: '2327007', ASIGNATURA: 'CALCULO', FECHA: '21-01-2027', HORA: '09:00 - 12:00',
  AULAS: 'Aulario II - Aula 204', CONVOCATORIA: 'E', CURSO_ACADEMICO: '2026-27', GRUPO: 'AM', ...x,
});

describe('leerExamenes', () => {
  it('devuelve la lista CONSULTA', () => {
    expect(leerExamenes({ CONSULTA: [examen({})], 0: { AULAS_ENERO: 'off' } })).toHaveLength(1);
  });
  it('sin lista CONSULTA es un error de formato', () => {
    expect(() => leerExamenes({ error: 'x' })).toThrow('CONSULTA');
    expect(() => leerExamenes(null)).toThrow('CONSULTA');
  });
});

describe('propuestasDeExamenes', () => {
  it('convierte un examen con el nombre bonito de la asignatura', () => {
    expect(propuestasDeExamenes([examen({})], ASIG, '2026-09-30')).toEqual([{
      origen: 'urjc-examen:2026-27:2327007:E:AM',
      titulo: 'Examen: Cálculo (enero)',
      area: 'calculo',
      prioridad: 'alta',
      icono: 'school',
      fecha: '2027-01-21',
      hora: '09:00',
      notas: '09:00 - 12:00 · Aulario II - Aula 204',
      notasDeLaFuente: true,
    }]);
  });
  it('varias aulas separadas por <br/> y entidades HTML', () => {
    const [p] = propuestasDeExamenes([examen({ AULAS: 'Aulario I - Aula 003<br/>Aulario I &amp; Lab<br>' })], ASIG, '2026-09-30');
    expect(p.notas).toBe('09:00 - 12:00 · Aulario I - Aula 003 · Aulario I & Lab');
  });
  it('convocatorias', () => {
    const titulos = ['E', 'M', 'J', 'S', 'X'].map((c) => propuestasDeExamenes([examen({ CONVOCATORIA: c })], ASIG, '2026-09-30')[0].titulo);
    expect(titulos).toEqual([
      'Examen: Cálculo (enero)', 'Examen: Cálculo (mayo)', 'Examen: Cálculo (junio)', 'Examen: Cálculo (septiembre)', 'Examen: Cálculo (convocatoria X)',
    ]);
  });
  it('se salta lo pasado, lo de otras asignaturas y las fechas raras; hoy sí entra', () => {
    const r = propuestasDeExamenes([
      examen({ FECHA: '23-09-2026' }),
      examen({ FECHA: '30-09-2026', CONVOCATORIA: 'S' }),
      examen({ COD_ASIGNATURA: '2327099' }),
      examen({ FECHA: '2027-01-21' }),
      examen({ FECHA: '31-02-2027' }),
    ], ASIG, '2026-09-30');
    expect(r.map((p) => p.fecha)).toEqual(['2026-09-30']);
  });
  it('sin hora legible ni aulas: sin hora y sin notas', () => {
    const [p] = propuestasDeExamenes([examen({ HORA: '', AULAS: null })], ASIG, '2026-09-30');
    expect(p.hora).toBeUndefined();
    expect(p.notas).toBeUndefined();
  });
});
