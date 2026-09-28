import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { validarTrazo } from '../../estudio/tinta';
import { CapaTinta } from './CapaTinta';

const lapiz = validarTrazo({ id: 'l', herramienta: 'lapiz', color: '#b8603d', grosor: 4, puntos: [0, 0, 30, 30] }, 't');
const sub = validarTrazo({ id: 's', herramienta: 'subrayador', color: '#e0b53a', grosor: 12, puntos: [0, 10, 60, 10] }, 't');

describe('CapaTinta', () => {
  it('dibuja primero el subrayador (semitransparente) y luego el lápiz', () => {
    const html = renderToString(<CapaTinta subrayados={[sub]} trazos={[lapiz]} />);
    expect(html).toContain('class="tinta"');
    expect(html.indexOf('stroke-opacity="0.35"')).toBeGreaterThan(-1);
    expect(html.indexOf('stroke-opacity="0.35"')).toBeLessThan(html.indexOf('fill="#b8603d"'));
  });
  it('una capa sin trazos no dibuja nada', () => {
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[]} />)).toBe('');
  });
  it('la letra a mano se dibuja con líneas (una por trazo de cada letra)', () => {
    const letra = validarTrazo({ id: 'c7', herramienta: 'letra', texto: 'Hi', x: 0, y: 40, tamano: 30, color: '#3b82f6', autor: 'claude' }, 't');
    const html = renderToString(<CapaTinta subrayados={[]} trazos={[letra]} />);
    expect(html).toContain('stroke="#3b82f6"');
    expect(html).toContain('fill="none"');
    expect((html.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('un trazo que aún espera su turno no se ve; a medias, se ve un trozo', () => {
    const linea = validarTrazo({ id: 'a', herramienta: 'linea', color: '#3b82f6', grosor: 4, puntos: [0, 0, 100, 0] }, 't');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map([['a', 0]])} />)).not.toContain('<path');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map([['a', 0.5]])} />)).toContain('d="M0 0 L50 0"');
    expect(renderToString(<CapaTinta subrayados={[]} trazos={[linea]} progreso={new Map()} />)).toContain('d="M0 0 L100 0"');
  });
});
