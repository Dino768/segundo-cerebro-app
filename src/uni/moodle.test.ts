import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import type { EventoIcs } from './ics.ts';
import { propuestasDeMoodle, textoPlano } from './moodle.ts';

const ASIG = new Map<string, Asignatura>([
  ['2327004', { id: 'fundamentos-programacion', nombre: 'Fundamentos de la Programación', color: '#2f9e6e', codigo: '2327004' }],
]);

const ev = (x: Partial<EventoIcs>): EventoIcs => ({
  uid: '1@aula', titulo: 'Práctica 1 se cierra', descripcion: '', inicio: new Date('2026-10-05T22:00:00Z'),
  soloDia: false, categorias: ['2026-27_2327004_159508_186565'], ...x,
});

const HOY = '2026-09-30';

describe('propuestasDeMoodle', () => {
  it('una entrega que vence a las 00:00 pasa al día anterior a las 23:59', () => {
    expect(propuestasDeMoodle([ev({})], ASIG, HOY)).toEqual([{
      origen: 'moodle:1@aula',
      titulo: 'Entrega: Práctica 1',
      area: 'fundamentos-programacion',
      prioridad: 'media',
      icono: 'file-upload',
      fecha: '2026-10-05',
      hora: '23:59',
      notasDeLaFuente: false,
    }]);
  });
  it('«vence» también es una entrega; «se abre» no se importa', () => {
    const r = propuestasDeMoodle([
      ev({ uid: 'a', titulo: 'Tarea 2 vence' }),
      ev({ uid: 'b', titulo: 'Test Tema 1 se abre' }),
    ], ASIG, HOY);
    expect(r.map((p) => p.titulo)).toEqual(['Entrega: Tarea 2']);
  });
  it('un evento del profesor va con su título, sin icono', () => {
    const [p] = propuestasDeMoodle([ev({ titulo: 'Parcial tema 1-3', inicio: new Date('2026-11-12T09:00:00Z') })], ASIG, HOY);
    expect(p).toMatchObject({ titulo: 'Parcial tema 1-3', fecha: '2026-11-12', hora: '10:00' });
    expect(p.icono).toBeUndefined();
  });
  it('un evento de todo el día va sin hora', () => {
    const [p] = propuestasDeMoodle([ev({ titulo: 'Día sin clase', soloDia: true, inicio: new Date('2026-11-12T12:00:00Z') })], ASIG, HOY);
    expect(p.fecha).toBe('2026-11-12');
    expect(p.hora).toBeUndefined();
  });
  it('se salta lo de cursos que no son asignaturas con codigo, lo pasado y lo que no tiene título', () => {
    const r = propuestasDeMoodle([
      ev({ uid: 'a', categorias: ['RAC_EMP_FUENLABRADA'] }),
      ev({ uid: 'b', categorias: ['2026-27_2327099_1_2'] }),
      ev({ uid: 'c', categorias: [] }),
      ev({ uid: 'd', inicio: new Date('2026-09-29T10:00:00Z') }),
      ev({ uid: 'e', titulo: '' }),
      ev({ uid: 'f', inicio: new Date('2026-09-30T21:59:00Z') }),
    ], ASIG, HOY);
    expect(r.map((p) => p.origen)).toEqual(['moodle:f']);
  });
  it('la descripción va a las notas como texto plano, y el título sin entidades', () => {
    const [p] = propuestasDeMoodle([ev({
      titulo: 'Memoria &amp; código se cierra',
      descripcion: '<p>Instrucciones:&nbsp;</p>\n\n\n\t\tGrupo 5\n\t\t14/12/2026<br>Fin',
    })], ASIG, HOY);
    expect(p.titulo).toBe('Entrega: Memoria & código');
    expect(p.notas).toBe('Instrucciones:\n\nGrupo 5\n14/12/2026\nFin');
  });
});

describe('textoPlano', () => {
  it('quita etiquetas, entidades y espacios de sobra', () => {
    expect(textoPlano('  <b>Hola</b>&nbsp;&lt;3  \n\n\n\n  adiós ')).toBe('Hola <3\n\nadiós');
    expect(textoPlano('   ')).toBe('');
  });
});
