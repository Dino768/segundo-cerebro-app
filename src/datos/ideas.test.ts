import { describe, expect, it } from 'vitest';
import { ideasDe, parseBandeja, serializarBandeja, type Linea } from './ideas';

const REAL =
  '# Bandeja de ideas\n\nAquí van las ideas nuevas. Una línea por idea, con la fecha.\n\n' +
  '- 2026-09-22: App propia con IA y MCP.\n' +
  '- 2026-09-24 [juego-nave]: Personaje: piloto con brazo robótico\n';

describe('parseBandeja', () => {
  it('lee ideas con y sin proyecto y conserva las demás líneas', () => {
    const ls = parseBandeja(REAL);
    expect(ls[0]).toEqual({ tipo: 'otra', texto: '# Bandeja de ideas' });
    expect(ls[1]).toEqual({ tipo: 'otra', texto: '' });
    expect(ls[4]).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'App propia con IA y MCP.' } });
    expect(ls[5]).toEqual({
      tipo: 'idea',
      idea: { fecha: '2026-09-24', proyecto: 'juego-nave', texto: 'Personaje: piloto con brazo robótico' },
    });
  });
  it('leer y volver a escribir deja el archivo idéntico', () => {
    expect(serializarBandeja(parseBandeja(REAL))).toBe(REAL);
  });
  it('entiende los saltos de línea de Windows', () => {
    const ls = parseBandeja('# Bandeja\r\n- 2026-09-24: Idea\r\n');
    expect(ls[1]).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'Idea' } });
    expect(serializarBandeja(ls)).toBe('# Bandeja\n- 2026-09-24: Idea\n');
  });
  it('un texto con dos puntos o corchetes se lee entero y sin proyecto', () => {
    const [l] = parseBandeja('- 2026-09-24: Juego: jefe [final]\n');
    expect(l).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'Juego: jefe [final]' } });
  });
  it('una fecha imposible no es una idea, pero la línea se conserva', () => {
    expect(parseBandeja('- 2026-13-40: rara\n')).toEqual([{ tipo: 'otra', texto: '- 2026-13-40: rara' }]);
  });
  it('un archivo vacío es una bandeja vacía', () => {
    expect(parseBandeja('')).toEqual([]);
    expect(serializarBandeja([])).toBe('');
  });
});

describe('ideasDe', () => {
  it('ordena de la más nueva a la más antigua y, a igual fecha, la última del archivo primero', () => {
    const ls: Linea[] = [
      { tipo: 'otra', texto: '# Bandeja' },
      { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'a' } },
      { tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'b' } },
      { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'c' } },
    ];
    expect(ideasDe(ls).map((i) => i.texto)).toEqual(['b', 'c', 'a']);
  });
});
