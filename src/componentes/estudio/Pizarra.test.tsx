import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { validarPizarra } from '../../estudio/pizarra';
import { Pizarra } from './Pizarra';

vi.mock('../../estado/dialogos', () => ({ confirmar: vi.fn(), pedirTexto: vi.fn() }));

const p = validarPizarra({
  version: 2, titulo: 'x',
  piezas: [{ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 240, contenido: 'Mi nota' }],
  flechas: [],
  trazos: [{ id: 'd-1', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 50, 50] }],
}).pizarra;

describe('Pizarra', () => {
  it('de solo lectura: se ven las piezas y los trazos, sin herramientas pero con capas', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" />);
    expect(html).toContain('Mi nota');
    expect(html).toContain('class="tinta"');
    expect(html).not.toContain('Herramientas de la pizarra');
    expect(html).toContain('📚 Capas');
  });
  it('editable: con la barra de herramientas', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" alOperar={async () => undefined} />);
    expect(html).toContain('Herramientas de la pizarra');
  });
});
