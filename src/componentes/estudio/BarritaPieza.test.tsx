import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarritaPieza } from './BarritaPieza';

const base = { x: 100, y: 200, ancho: 240, alto: 80, idPieza: 'n1', alBorrar: () => undefined, alEstilo: () => undefined };

describe('BarritaPieza', () => {
  it('en una nota: borrar, fondo, letra, A− A+ y el tirador', () => {
    const html = renderToString(<BarritaPieza {...base} nota={{ tamanoLetra: 'normal' }} />);
    for (const t of ['aria-label="Borrar"', '>Fondo', '>Letra', 'aria-label="Letra más pequeña"', 'aria-label="Letra más grande"', 'data-tirador="n1"'])
      expect(html).toContain(t);
    expect(html).toContain('data-fuera-de-foto');
  });
  it('con la letra enorme no se puede agrandar más', () => {
    const html = renderToString(<BarritaPieza {...base} nota={{ tamanoLetra: 'enorme' }} />);
    expect(html).toMatch(/disabled=""[^>]*aria-label="Letra más grande"|aria-label="Letra más grande"[^>]*disabled=""/);
  });
  it('en una pieza de Claude: solo borrar', () => {
    const html = renderToString(<BarritaPieza {...base} nota={null} />);
    expect(html).toContain('aria-label="Borrar"');
    expect(html).not.toContain('>Fondo');
    expect(html).not.toContain('data-tirador');
  });
  it('si la pieza está pegada arriba, la barrita sale debajo', () => {
    expect(renderToString(<BarritaPieza {...base} y={10} nota={null} />)).toContain('barrita-pieza abajo');
  });
  it('todos los botones llevan data-sin-foco, para no robarle el foco al lienzo al pulsarlos', () => {
    const html = renderToString(<BarritaPieza {...base} nota={{ tamanoLetra: 'normal' }} />);
    const botones = html.match(/<button/g) ?? [];
    const marcados = html.match(/data-sin-foco="true"/g) ?? [];
    expect(botones.length).toBeGreaterThan(0);
    expect(marcados.length).toBe(botones.length);
  });
});
