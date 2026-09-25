import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FilaTarea } from './FilaTarea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: { areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#f97316"\n'), tareas: [], proyectos: [], ideas: [] },
    cambiarTareasAlInstante: vi.fn(), soloLectura: false, tareasBloqueadas: false,
  }),
}));

describe('FilaTarea', () => {
  it('enseña el icono delante del título y el color y nombre de la subárea', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Modelar nave', area: 'b', icono: 'cube' }} dia="2026-09-25" alEditar={() => undefined} />);
    expect(html).toMatch(/<svg[^>]*icono-tabler[\s\S]*Modelar nave/);
    expect(html).toContain('background:#f97316');
    expect(html).toContain('title="Blender"');
  });
  it('sin icono, como siempre', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'X', area: 'v' }} dia="2026-09-25" alEditar={() => undefined} />);
    expect(html).not.toContain('<svg');
  });
});
