import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectorIcono, VentanaIconos } from './SelectorIcono';

describe('SelectorIcono', () => {
  it('con icono, lo enseña en el botón', () => {
    const html = renderToString(<SelectorIcono icono="piano" elegir={() => undefined} />);
    expect(html).toContain('class="selector-icono"');
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="Cambiar icono"');
  });
  it('sin icono, enseña un hueco con +', () => {
    const html = renderToString(<SelectorIcono elegir={() => undefined} />);
    expect(html).toContain('>+<');
    expect(html).toContain('aria-label="Elegir icono"');
  });
});

describe('VentanaIconos', () => {
  it('tiene buscador, cuadrícula de iconos y «Sin icono»', () => {
    const html = renderToString(<VentanaIconos elegir={() => undefined} cerrar={() => undefined} />);
    expect(html).toContain('placeholder="Busca: música, examen, cube…"');
    expect(html).toContain('class="rejilla-iconos"');
    expect(html).toContain('>Sin icono</button>');
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThan(10);
  });
});
