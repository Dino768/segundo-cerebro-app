import { describe, expect, it } from 'vitest';
import { parseAreas } from './areas';

describe('parseAreas', () => {
  it('lee las áreas', () => {
    expect(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n')).toEqual([
      { id: 'uni', nombre: 'Uni', color: '#3b82f6' },
    ]);
  });
  it('vacío → lista vacía', () => {
    expect(parseAreas('')).toEqual([]);
  });
  it('un color sin comillas (que YAML toma como comentario) da un error claro', () => {
    expect(() => parseAreas('- id: uni\n  nombre: Uni\n  color: #3b82f6\n')).toThrow(/color/);
  });
});
