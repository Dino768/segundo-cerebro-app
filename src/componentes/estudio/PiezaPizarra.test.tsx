import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Pieza } from '../../estudio/pizarra';
import { PiezaPizarra } from './PiezaPizarra';

const nota = (extra: Partial<Pieza> = {}) => ({ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 240, contenido: 'Hola', ...extra }) as Pieza;
const pintar = (p: Pieza, seleccionada = false) =>
  renderToString(<PiezaPizarra pieza={p} x={0} y={0} seleccionada={seleccionada} imagen={async () => ''} alMedir={() => undefined} />);

describe('PiezaPizarra: notas', () => {
  it('una nota de antes sigue amarilla', () => {
    expect(pintar(nota())).toContain('background:#fff4c2');
  });
  it('sin fondo: clase sin-fondo y transparente', () => {
    const html = pintar(nota({ fondo: 'ninguno' }));
    expect(html).toContain('sin-fondo');
    expect(html).toContain('background:transparent');
  });
  it('con fondo, color, tamaño y alto', () => {
    const html = pintar(nota({ fondo: '#ffffff', colorTexto: '#3b82f6', tamanoLetra: 'enorme', alto: 120 }));
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('color:#3b82f6');
    expect(html).toContain('font-size:32px');
    expect(html).toContain('min-height:120px');
  });
  it('las demás piezas no cambian', () => {
    // 'formula' y no 'texto': Markdown usa DOMPurify, que sin ventana (entorno 'node' de los tests) no funciona
    // aquí; no es cosa de esta tarea. 'formula' comprueba lo mismo (color y sin fondo) sin tropezar con eso.
    const html = pintar({ id: 't1', tipo: 'formula', x: 0, y: 0, ancho: 200, contenido: 'x', color: '#3b82f6' } as Pieza);
    expect(html).toContain('border-color:#3b82f6');
    expect(html).not.toContain('background:');
  });
});
