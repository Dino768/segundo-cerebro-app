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
  it('de solo lectura también se puede poner en pantalla completa', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" alMaximizar={() => undefined} />);
    expect(html).toContain('aria-label="Pantalla completa"');
  });
  it('al abrirla, lo de Claude se ve entero (la animación solo empieza después)', () => {
    const conClaude = validarPizarra({
      version: 2, titulo: 'x', piezas: [], flechas: [],
      trazos: [{ id: 'c1', herramienta: 'letra', texto: 'Hola', x: 0, y: 40, tamano: 30, color: '#3b82f6', autor: 'claude' }],
    }).pizarra;
    const html = renderToString(<Pizarra pizarra={conClaude} imagen={async () => ''} clave="k" origen="o" animarAlAbrir />);
    expect(html).toContain('stroke="#3b82f6"');
  });
});
