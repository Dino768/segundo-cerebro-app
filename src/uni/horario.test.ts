import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import { clasesDeUrjc, leerPaginaHorario, nombrePropio } from './horario.ts';

const PAGINA = readFileSync(path.join(import.meta.dirname, 'pruebas/horario-urjc.html'), 'utf8');
const asignaturas = new Map<string, Asignatura>([
  ['2327002', { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' }],
  ['2327008', { id: 'electronica-digital', nombre: 'Electrónica Digital', color: '#d9782b', codigo: '2327008' }],
]);

describe('horario de la URJC', () => {
  it('lee la página real y se queda con el desdoble G2', () => {
    const clases = clasesDeUrjc(leerPaginaHorario(PAGINA), asignaturas, 'G2');
    expect(clases.map((c) => [c.fecha, c.inicio, c.fin, c.asignatura, c.desdoble])).toEqual([
      ['2026-09-16', '09:00', '11:00', 'algebra', undefined],
      ['2026-09-21', '09:00', '11:00', 'algebra', undefined],
      ['2026-09-23', '11:00', '13:00', 'algebra', 'G2'],
      ['2026-12-03', '10:00', '11:00', 'electronica-digital', undefined],
    ]);
    expect(clases[2].aula).toBe('Aula 3S4 · Aulario III');
    expect(clases[0].profesor).toBe('David Gonzalez de la Aleja Gallego');
    expect(clases[3].profesor).toBe('Antonio Rosario Consoli Barone, Angel Luis Alvarez Castillo, Maria Vila Santos, Javier Bartolome Vilchez');
  });
  it('sin desdoble elegido se queda con todos', () => {
    expect(clasesDeUrjc(leerPaginaHorario(PAGINA), asignaturas)).toHaveLength(5);
  });
  it('varias aulas se juntan y sin aulas no hay campo', () => {
    const [c] = clasesDeUrjc([{ ASIGNATURA_CODIGO: '2327002', GRUPO: 'MAÑANA A', CLASES: [
      { TIMESTAMP_INICIO: '2026-10-21T09:00:00', TIMESTAMP_FIN: '2026-10-21T11:00:00', AULAS: [{ AULA: 'Aula Informática L2104', EDIFICIO: 'Laboratorio II' }, { AULA: 'Aula 3S2', EDIFICIO: 'Aulario III' }] },
    ] }], asignaturas);
    expect(c.aula).toBe('Aula Informática L2104 · Laboratorio II + Aula 3S2 · Aulario III');
    const [d] = clasesDeUrjc([{ ASIGNATURA_CODIGO: '2327002', GRUPO: 'MAÑANA A', CLASES: [{ TIMESTAMP_INICIO: '2026-10-21T09:00:00', TIMESTAMP_FIN: '2026-10-21T11:00:00', AULAS: [] }] }], asignaturas);
    expect(d).not.toHaveProperty('aula');
    expect(d).not.toHaveProperty('profesor');
  });
  it('la misma clase en dos grupos sale una vez', () => {
    const clase = { TIMESTAMP_INICIO: '2026-12-03T09:00:00', TIMESTAMP_FIN: '2026-12-03T10:00:00' };
    expect(clasesDeUrjc([
      { ASIGNATURA_CODIGO: '2327008', GRUPO: 'MAÑANA A G UNICO P2', CLASES: [clase] },
      { ASIGNATURA_CODIGO: '2327008', GRUPO: 'MAÑANA A G UNICO P4', CLASES: [clase] },
    ], asignaturas)).toHaveLength(1);
  });
  it('horario vacío es una lista vacía', () => {
    expect(leerPaginaHorario('<script>const infoHorario = {"GRUPOS":[],"FESTIVOS":[]};</script>')).toEqual([]);
  });
  it('página sin horario o con formato raro → error de formato', () => {
    expect(() => leerPaginaHorario('<html>mantenimiento</html>')).toThrow(/no ha devuelto el horario/);
    expect(() => leerPaginaHorario('<script>const infoHorario = {"GRUPOS":{"1":{"GRUPO":"X"}}};</script>')).toThrow(/formato/);
    expect(() => leerPaginaHorario('<script>const infoHorario = {roto};</script>')).toThrow(/formato/);
  });
  it('nombres propios', () => {
    expect(nombrePropio('DE LA FUENTE  GARCIA')).toBe('De la Fuente Garcia');
    expect(nombrePropio('MARÍA DEL MAR')).toBe('María del Mar');
  });
});
