import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { areasDestino, contarDentro, VentanaArea } from './VentanaArea';

const AREAS = parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#f97316"\n');
const DATOS = {
  areas: AREAS,
  tareas: [{ id: 't', titulo: 'T', area: 'b' }, { id: 'u', titulo: 'U', area: 'uni' }],
  ideas: [{ id: 'i', fecha: '2026-09-25', texto: 'X', area: 'v' }],
  proyectos: [{ id: 'p', titulo: 'P', estado: 'activo' as const, area: 'b', cuerpo: '', meta: {} }],
};
vi.mock('../estado/datos', () => ({
  useDatos: () => ({ datos: DATOS, cambiarAreas: vi.fn(), borrarArea: vi.fn(), soloLectura: false, areasBloqueadas: false }),
}));

describe('contarDentro', () => {
  it('cuenta tareas, ideas y proyectos del área y de sus subáreas', () => {
    expect(contarDentro(DATOS, 'v')).toBe(3);
    expect(contarDentro(DATOS, 'b')).toBe(2);
    expect(contarDentro(DATOS, 'uni')).toBe(1);
  });
});

describe('areasDestino', () => {
  it('al borrar una subárea, ni ella ni el resto de subáreas fuera de destino aparecen (pero su área madre sí)', () => {
    const r = areasDestino(AREAS, 'b');
    expect(r.map((a) => a.id)).toEqual(['uni', 'v']);
    expect(r.find((a) => a.id === 'v')?.subareas).toEqual([]);
  });
  it('al borrar un área grande, ni ella ni sus subáreas aparecen como destino', () => {
    const r = areasDestino(AREAS, 'v');
    expect(r.map((a) => a.id)).toEqual(['uni']);
  });
});

describe('VentanaArea', () => {
  it('editar un área grande: nombre, color, sus subáreas y borrar', () => {
    const html = renderToString(<VentanaArea id="v" cerrar={() => undefined} />);
    expect(html).toContain('<h2>Editar área</h2>');
    expect(html).toContain('value="Videojuegos"');
    expect(html).toContain('type="color"');
    expect(html).toContain('Blender');
    expect(html).toContain('>+ Subárea</button>');
    expect(html).toContain('>Borrar</button>');
  });
  it('una subárea nueva parte del color de su área y no tiene lista de subáreas', () => {
    const html = renderToString(<VentanaArea madre="v" cerrar={() => undefined} />);
    expect(html).toContain('<h2>Nueva subárea de Videojuegos</h2>');
    expect(html).toContain('value="#a855f7"');
    expect(html).not.toContain('+ Subárea');
    expect(html).not.toContain('>Borrar</button>');
  });
});
