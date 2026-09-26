import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelCapas } from './PanelCapas';

const nada = () => undefined;
const props = {
  capas: [{ id: 'claude', nombre: 'Claude' }, { id: 'capa-1', nombre: 'Capa 1' }, { id: 'capa-2', nombre: 'Ejercicio' }],
  activa: 'capa-2', ocultas: new Set(['capa-1']), bloqueado: false,
  elegir: nada, alternar: nada, crear: nada, borrar: nada, renombrar: nada, duplicar: nada, mover: nada, cerrar: nada,
};

describe('PanelCapas', () => {
  it('arriba la que se ve por encima, la activa marcada y la oculta con «Mostrar»', () => {
    const html = renderToString(<PanelCapas {...props} />);
    expect(html.indexOf('Ejercicio')).toBeLessThan(html.indexOf('Capa 1'));
    expect(html.indexOf('Capa 1')).toBeLessThan(html.indexOf('🤖'));
    expect(html).toContain('class="capa activa"');
    expect(html).toContain('aria-label="Mostrar Capa 1"');
  });
  it('la de Claude no se borra ni se renombra, pero se duplica', () => {
    const html = renderToString(<PanelCapas {...props} />);
    expect(html).toContain('aria-label="Borrar Ejercicio"');
    expect(html).not.toContain('aria-label="Borrar Claude"');
    expect(html).not.toContain('aria-label="Renombrar Claude"');
    expect(html).toContain('aria-label="Duplicar Claude"');
  });
  it('bloqueado (solo lectura): solo mostrar u ocultar', () => {
    const html = renderToString(<PanelCapas {...props} bloqueado />);
    expect(html).not.toContain('Duplicar');
    expect(html).toContain('Ocultar Ejercicio');
  });
});
