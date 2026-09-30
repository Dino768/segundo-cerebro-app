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

vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));

describe('FormTarea', () => {
  it('arriba, los cinco tipos; por defecto Tarea', () => {
    const html = renderToString(<FormTarea edicion={{ nueva: {} }} cerrar={() => undefined} />);
    for (const n of ['Tarea', 'Entrega', 'Examen', 'Recado', 'Evento']) expect(html).toContain(n);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Tarea/);
  });
  it('un examen: prioridad «Automática» y sin repetición', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Cálculo', area: 'fisica', tipo: 'examen', fecha: '2027-01-21' } }} cerrar={() => undefined} />);
    expect(html).toContain('Automática');
    expect(html).not.toContain('Se repite');
  });
  it('un recado: sin prioridad, hora, proyecto ni notas', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Huevos', area: 'fisica', tipo: 'recado' } }} cerrar={() => undefined} />);
    for (const n of ['Prioridad', 'Hora', 'Proyecto', 'Notas', 'Se repite']) expect(html).not.toContain(n);
  });
  it('un evento que se repite hasta una fecha', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Boxeo', area: 'fisica', tipo: 'evento', fecha: '2026-10-01', repetir: ['lun'], hasta: '2026-10-31' } }} cerrar={() => undefined} />);
    expect(html).toContain('Se repite');
    expect(html).toContain('value="2026-10-31"');
    expect(html).not.toContain('Prioridad');
  });
  it('una tarea nueva con título ya trae su icono sugerido', () => {
    const html = renderToString(<FormTarea edicion={{ nueva: { titulo: 'Examen de física' } }} cerrar={() => undefined} />);
    expect(html).toContain('class="selector-icono"');
    expect(html).toContain('title="file-pencil"');
  });
  it('al editar se conserva el icono guardado', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Examen', area: 'fisica', icono: 'cube' } }} cerrar={() => undefined} />);
    expect(html).toContain('title="cube"');
    expect(html).toContain('Uni › Física');
  });
});
