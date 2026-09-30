import { describe, expect, it } from 'vitest';
import { enMadrid, hoyEnMadrid, plazoEnMadrid } from './hora.ts';
import { porCodigo } from './tipos.ts';

describe('hora de Madrid', () => {
  it('verano (UTC+2)', () => {
    expect(enMadrid(new Date('2026-09-30T21:59:00Z'))).toEqual({ fecha: '2026-09-30', hora: '23:59' });
    expect(enMadrid(new Date('2026-10-05T22:00:00Z'))).toEqual({ fecha: '2026-10-06', hora: '00:00' });
  });
  it('invierno (UTC+1)', () => {
    expect(enMadrid(new Date('2027-01-21T08:00:00Z'))).toEqual({ fecha: '2027-01-21', hora: '09:00' });
  });
  it('hoy es la fecha de Madrid, no la del servidor', () => {
    expect(hoyEnMadrid(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01');
  });
});

describe('plazoEnMadrid', () => {
  it('las 00:00 pasan al día anterior a las 23:59', () => {
    expect(plazoEnMadrid(new Date('2026-10-05T22:00:00Z'))).toEqual({ fecha: '2026-10-05', hora: '23:59' });
  });
  it('en invierno y cruzando de año también', () => {
    expect(plazoEnMadrid(new Date('2026-12-31T23:00:00Z'))).toEqual({ fecha: '2026-12-31', hora: '23:59' });
    expect(plazoEnMadrid(new Date('2027-03-01T23:00:00Z'))).toEqual({ fecha: '2027-03-01', hora: '23:59' });
  });
  it('cualquier otra hora se queda igual', () => {
    expect(plazoEnMadrid(new Date('2026-09-30T21:59:00Z'))).toEqual({ fecha: '2026-09-30', hora: '23:59' });
    expect(plazoEnMadrid(new Date('2026-10-06T08:30:00Z'))).toEqual({ fecha: '2026-10-06', hora: '10:30' });
  });
});

describe('porCodigo', () => {
  it('solo las asignaturas con codigo', () => {
    const m = porCodigo([
      { id: 'calculo', nombre: 'Cálculo', color: '#000000', codigo: '2327007' },
      { id: 'fisica', nombre: 'Física', color: '#000000' },
    ]);
    expect([...m.keys()]).toEqual(['2327007']);
    expect(m.get('2327007')?.id).toBe('calculo');
  });
});
