import { describe, expect, it } from 'vitest';
import { ponerFormulas, separarFormulas } from './formulas';

describe('separarFormulas', () => {
  it('fórmulas dentro de la frase y en bloque', () => {
    const s = separarFormulas('La ley es $F = m a$.\n\n$$\\int x\\,dx$$');
    expect(s.formulas).toEqual([{ tex: '\\int x\\,dx', bloque: true }, { tex: 'F = m a', bloque: false }]);
    expect(s.texto).toBe('La ley es @@F1@@.\n\n@@F0@@');
  });
  it('no toca precios ni código', () => {
    expect(separarFormulas('Cuesta 5$ y 6$ más').formulas).toEqual([]);
    expect(separarFormulas('Usa `$x$` en el código').formulas).toEqual([]);
    expect(separarFormulas('```\n$a$\n```').formulas).toEqual([]);
  });
  it('ponerFormulas cambia las marcas por el dibujo', () => {
    const s = separarFormulas('a $x$ b');
    expect(ponerFormulas(`<p>${s.texto}</p>`, s.formulas, (f) => `[${f.tex}]`)).toBe('<p>a [x] b</p>');
  });
});
