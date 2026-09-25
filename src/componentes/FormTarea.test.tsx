import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FormTarea } from './FormTarea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: { areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n  subareas:\n    - id: fisica\n      nombre: Física\n      color: "#3b82f6"\n'), tareas: [], proyectos: [], ideas: [] },
    cambiarTareas: vi.fn(),
  }),
}));

describe('FormTarea', () => {
  it('una tarea nueva con título ya trae su icono sugerido', () => {
    const html = renderToString(<FormTarea edicion={{ nueva: { titulo: 'Examen de física' } }} cerrar={() => undefined} />);
    expect(html).toContain('class="selector-icono"');
    expect(html).toContain('title="file-pencil"');
  });
  it('al editar se conserva el icono guardado', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Examen', area: 'fisica', icono: 'cube' } }} cerrar={() => undefined} />);
    expect(html).toContain('title="cube"');
    expect(html).toMatch(/<option value="fisica" selected="">/);
  });
});
