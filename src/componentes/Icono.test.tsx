import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icono } from './Icono';

describe('Icono', () => {
  it('dibuja un icono básico como SVG del color del texto', () => {
    const html = renderToString(<Icono nombre="piano" />);
    expect(html).toMatch(/^<svg[^>]*class="icono-tabler"/);
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('<path');
  });
  it('sin nombre, o con un nombre que no existe, no dibuja nada', () => {
    expect(renderToString(<Icono />)).toBe('');
    expect(renderToString(<Icono nombre="no-existe-de-verdad" />)).toBe('');
  });
});
