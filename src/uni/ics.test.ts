import { describe, expect, it } from 'vitest';
import { leerIcs } from './ics.ts';

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:111@aula.ejemplo/moodle',
  'SUMMARY:Práctica 1 se cierra',
  'DESCRIPTION:Sube el código\\, y la memoria.\\nFecha: 3/12\\; aula 2',
  'DTSTART:20261005T220000Z',
  'CATEGORIES:2026-27_2327004_1_2',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:222@aula.ejemplo/moodle',
  'SUMMARY:Un título muy largo que Moodle',
  '  parte en dos líneas',
  'DESCRIPTION:',
  'DTSTART;VALUE=DATE:20261112',
  'CATEGORIES:A\\,B,OTRO',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('leerIcs', () => {
  it('lee los eventos, quita escapes y junta líneas partidas', () => {
    const { eventos, saltados } = leerIcs(ICS);
    expect(saltados).toBe(0);
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toEqual({
      uid: '111@aula.ejemplo/moodle',
      titulo: 'Práctica 1 se cierra',
      descripcion: 'Sube el código, y la memoria.\nFecha: 3/12; aula 2',
      inicio: new Date('2026-10-05T22:00:00Z'),
      soloDia: false,
      categorias: ['2026-27_2327004_1_2'],
    });
    expect(eventos[1].titulo).toBe('Un título muy largo que Moodle parte en dos líneas');
    expect(eventos[1].soloDia).toBe(true);
    expect(eventos[1].inicio.toISOString().slice(0, 10)).toBe('2026-11-12');
    expect(eventos[1].categorias).toEqual(['A,B', 'OTRO']);
  });
  it('funciona con saltos de línea \\n y con BOM', () => {
    expect(leerIcs('﻿' + ICS.replace(/\r\n/g, '\n')).eventos).toHaveLength(2);
  });
  it('salta los eventos sin UID o sin fecha legible y los cuenta', () => {
    const raro = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Sin uid\nDTSTART:20261005T220000Z\nEND:VEVENT\n'
      + 'BEGIN:VEVENT\nUID:3\nSUMMARY:Hora local\nDTSTART;TZID=Europe/Madrid:20261005T100000\nEND:VEVENT\nEND:VCALENDAR';
    expect(leerIcs(raro)).toEqual({ eventos: [], saltados: 2 });
  });
  it('un calendario vacío no es un error', () => {
    expect(leerIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')).toEqual({ eventos: [], saltados: 0 });
  });
  it('una página HTML (enlace caducado) es un error de formato', () => {
    expect(() => leerIcs('<!DOCTYPE html><html><body>Acceder</body></html>')).toThrow(/caducado/);
  });
});
