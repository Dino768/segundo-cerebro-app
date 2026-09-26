import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import { filasDelMenu, SelectorArea } from './SelectorArea';

const AREAS = parseAreas(
  '- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#a855f7"\n- id: u\n  nombre: Uni\n  color: "#3b82f6"\n',
);

describe('filasDelMenu', () => {
  it('sin desplegar, solo salen las áreas (las subáreas se esconden)', () => {
    expect(filasDelMenu(AREAS, null)).toEqual([
      { tipo: 'area', id: 'v', nombre: 'Videojuegos', color: '#a855f7', subareas: 1, desplegada: false },
      { tipo: 'area', id: 'u', nombre: 'Uni', color: '#3b82f6', subareas: 0, desplegada: false },
    ]);
  });
  it('al desplegar un área salen el área entera y sus subáreas debajo', () => {
    const filas = filasDelMenu(AREAS, 'v');
    expect(filas.map((f) => `${f.tipo}:${f.id}`)).toEqual(['area:v', 'entera:v', 'sub:b', 'area:u']);
    expect(filas[0]).toMatchObject({ desplegada: true });
  });
});

describe('SelectorArea', () => {
  it('el botón enseña el área elegida (con su área madre si es una subárea)', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="b" cambiar={() => undefined} />);
    expect(html).toContain('aria-label="Área"');
    expect(html).toContain('Videojuegos › Blender');
    expect(html).not.toContain('role="listbox"');
  });
  it('abierto sobre una subárea, su área sale ya desplegada', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="b" cambiar={() => undefined} abiertoInicial />);
    expect(html).toContain('role="listbox"');
    expect(html).toContain('Blender');
    expect(html).toContain('Toda el área');
  });
  it('abierto sin elegir, las subáreas no salen', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="u" cambiar={() => undefined} abiertoInicial />);
    expect(html).toContain('Videojuegos');
    expect(html).not.toContain('Blender');
  });
  it('puede ofrecer «ninguna» y conserva un área desconocida', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="borrada" ninguna="(ninguna)" cambiar={() => undefined} abiertoInicial />);
    expect(html).toContain('(ninguna)');
    expect(html).toContain('borrada (desconocida)');
  });
});
