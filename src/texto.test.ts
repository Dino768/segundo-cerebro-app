import { describe, expect, it } from 'vitest';
import { aSlug } from './texto';

describe('aSlug', () => {
  it('minúsculas, sin tildes y con guiones', () => {
    expect(aSlug('Física II: Ondas', 60)).toBe('fisica-ii-ondas');
    expect(aSlug('  Leyes de Newton!! ', 60)).toBe('leyes-de-newton');
  });
  it('recorta sin dejar un guion al final', () => {
    expect(aSlug('abc def ghi', 5)).toBe('abc-d');
    expect(aSlug('abcd efgh', 5)).toBe('abcd');
  });
  it('nada aprovechable → vacío', () => {
    expect(aSlug('¿¿!!', 60)).toBe('');
  });
});
