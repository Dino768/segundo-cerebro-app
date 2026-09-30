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

vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));

describe('FilaTarea', () => {
  it('un evento no tiene casilla y lleva su icono de tipo', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Boxeo', area: 'v', tipo: 'evento', hora: '19:00', repetir: ['lun'] }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).not.toContain('type="checkbox"');
    expect(html).toContain('title="Evento"');
    expect(html).toContain('cada lun');
  });
  it('un examen cercano: icono, cuánto falta y prioridad alta calculada', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Cálculo (enero)', area: 'v', tipo: 'examen', fecha: '2026-10-05' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('title="Examen"');
    expect(html).toContain('faltan 4 días');
    expect(html).toContain('prioridad alta');
  });
  it('un examen lejano sale en prioridad baja', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Cálculo (junio)', area: 'v', tipo: 'examen', fecha: '2027-06-09' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).toContain('prioridad baja');
  });
  it('una tarea normal no lleva icono de tipo', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'X', area: 'v' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).not.toContain('icono-tipo');
  });
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
