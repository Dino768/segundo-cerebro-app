import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INICIALES } from '../../estudio/herramientas';
import { BarraHerramientas } from './BarraHerramientas';

const nada = () => undefined;
const base = {
  estado: INICIALES, cambiar: nada, enClaude: false, puedeDeshacer: false, puedeRehacer: true, deshacer: nada, rehacer: nada,
  haySeleccion: false, hayRecorte: false, copiar: nada, cortar: nada, pegar: nada, capasAbiertas: false, alternarCapas: nada,
};

describe('BarraHerramientas', () => {
  it('todas las herramientas, con la elegida encendida', () => {
    const html = renderToString(<BarraHerramientas {...base} />);
    for (const n of ['Mover', 'Lápiz', 'Subrayador', 'Formas', 'Lazo', 'Borrador', 'Texto']) expect(html).toContain(`aria-label="${n}"`);
    expect(html).toContain('aria-pressed="true" title="Mover"');
    expect(html).toMatch(/disabled="" title="Deshacer/);
    expect(html).not.toMatch(/disabled="" title="Rehacer/);
  });
  it('con el lápiz salen colores y grosores; con formas, las formas; con el borrador, sus dos modos', () => {
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'lapiz' }} />)).toContain('Grueso');
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'forma' }} />)).toContain('Elipse');
    expect(renderToString(<BarraHerramientas {...base} estado={{ ...INICIALES, herramienta: 'borrador' }} />)).toContain('Goma');
  });
  it('en la capa de Claude no se puede dibujar ni escribir', () => {
    const html = renderToString(<BarraHerramientas {...base} enClaude />);
    expect(html).toContain('aria-label="Lápiz" disabled=""');
    expect(html).toContain('aria-label="Texto" disabled=""');
    expect(html).not.toContain('aria-label="Lazo" disabled=""');
  });
});
