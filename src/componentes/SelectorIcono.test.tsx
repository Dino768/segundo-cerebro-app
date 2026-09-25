import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { alTecleoBuscador, SelectorIcono, VentanaIconos } from './SelectorIcono';

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

describe('alTecleoBuscador', () => {
  it('Enter no debe enviar el formulario que envuelve a la ventana', () => {
    const prevenir = vi.fn();
    alTecleoBuscador({ key: 'Enter', preventDefault: prevenir });
    expect(prevenir).toHaveBeenCalled();
  });
  it('otras teclas no se tocan', () => {
    const prevenir = vi.fn();
    alTecleoBuscador({ key: 'a', preventDefault: prevenir });
    expect(prevenir).not.toHaveBeenCalled();
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
