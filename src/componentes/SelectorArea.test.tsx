import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import { SelectorArea } from './SelectorArea';

const AREAS = parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#a855f7"\n');

describe('SelectorArea', () => {
  it('las subáreas salen sangradas bajo su área (con espacios que el navegador no colapse)', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="b" cambiar={() => undefined} />);
    expect(html).toMatch(/<option value="v">Videojuegos<\/option><option value="b" selected="">    Blender<\/option>/);
  });
  it('puede ofrecer «ninguna» y conserva un área desconocida', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="borrada" ninguna="(ninguna)" cambiar={() => undefined} />);
    expect(html).toContain('<option value="">(ninguna)</option>');
    expect(html).toContain('<option value="borrada" selected="">borrada (desconocida)</option>');
  });
});
