import { describe, expect, it } from 'vitest';
import {
  addDays, cuadriculaMes, diaDeSemana, diasSemana, fromISO, isHora, isISODate, msHastaMedianoche, saludo, sumarMeses, toISO,
} from './fechas';

describe('fechas', () => {
  it('toISO usa la fecha local, no la UTC', () => {
    expect(toISO(new Date(2026, 8, 23, 23, 59))).toBe('2026-09-23');
    expect(toISO(new Date(2026, 8, 23, 0, 1))).toBe('2026-09-23');
  });

  it('fromISO y toISO son inversos', () => {
    expect(toISO(fromISO('2026-02-28'))).toBe('2026-02-28');
  });

  it('addDays cruza meses, años y cambios de hora', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('sumarMeses devuelve el día 1 del mes resultante', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarMeses('2026-01-15', -1)).toBe('2025-12-01');
  });

  it('diaDeSemana', () => {
    expect(diaDeSemana('2026-09-21')).toBe('lun');
    expect(diaDeSemana('2026-09-23')).toBe('mie');
    expect(diaDeSemana('2026-09-27')).toBe('dom');
  });

  it('isISODate solo acepta fechas reales AAAA-MM-DD', () => {
    expect(isISODate('2026-09-01')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-9-1')).toBe(false);
    expect(isISODate(20260901)).toBe(false);
  });

  it('isHora solo acepta HH:MM', () => {
    expect(isHora('18:00')).toBe(true);
    expect(isHora('24:00')).toBe(false);
    expect(isHora('7:00')).toBe(false);
  });

  it('diasSemana va de lunes a domingo', () => {
    expect(diasSemana('2026-09-23')).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
  });

  it('cuadriculaMes da semanas completas de lunes a domingo', () => {
    const sep = cuadriculaMes(2026, 9);
    expect(sep).toHaveLength(5);
    expect(sep[0][0]).toBe('2026-08-31');
    expect(sep[4][6]).toBe('2026-10-04');
    const dic = cuadriculaMes(2026, 12);
    expect(dic[0][0]).toBe('2026-11-30');
    expect(dic[dic.length - 1][6]).toBe('2027-01-03');
  });
});

describe('msHastaMedianoche', () => {
  it('cuenta lo que falta hasta las 00:00 locales del día siguiente', () => {
    expect(msHastaMedianoche(new Date(2026, 8, 23, 23, 59, 30))).toBe(30_000);
    expect(msHastaMedianoche(new Date(2026, 8, 23, 0, 0, 0))).toBe(24 * 3600_000);
    expect(msHastaMedianoche(new Date(2026, 11, 31, 23, 0, 0))).toBe(3600_000);
  });
});

describe('saludo', () => {
  it('depende de la hora', () => {
    expect(saludo(6)).toBe('Buenos días');
    expect(saludo(13)).toBe('Buenos días');
    expect(saludo(14)).toBe('Buenas tardes');
    expect(saludo(20)).toBe('Buenas tardes');
    expect(saludo(21)).toBe('Buenas noches');
    expect(saludo(0)).toBe('Buenas noches');
    expect(saludo(5)).toBe('Buenas noches');
  });
});
