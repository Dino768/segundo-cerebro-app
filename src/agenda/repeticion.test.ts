import { describe, expect, it } from 'vitest';
import { hastaDurante } from './repeticion';

describe('hastaDurante', () => {
  it('el día antes de cumplirse', () => {
    expect(hastaDurante('2026-10-01', 1, 'meses')).toBe('2026-10-31');
    expect(hastaDurante('2026-10-01', 1, 'semanas')).toBe('2026-10-07');
    expect(hastaDurante('2026-10-01', 3, 'semanas')).toBe('2026-10-21');
    expect(hastaDurante('2026-10-01', 1, 'años')).toBe('2027-09-30');
    expect(hastaDurante('2026-10-15', 2, 'meses')).toBe('2026-12-14');
  });
  it('un día que no existe en el mes de destino usa el último', () => {
    expect(hastaDurante('2027-01-31', 1, 'meses')).toBe('2027-02-27');
  });
  it('un número raro cuenta como 1', () => {
    expect(hastaDurante('2026-10-01', 0, 'meses')).toBe('2026-10-31');
    expect(hastaDurante('2026-10-01', Number.NaN, 'semanas')).toBe('2026-10-07');
  });
});
