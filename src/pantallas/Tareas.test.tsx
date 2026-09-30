import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import type { Tarea } from '../datos/tareas';
import { Tareas } from './Tareas';

const TAREAS: Tarea[] = [
  { id: 'hoy', titulo: 'Ejercicios tema 2', area: 'calculo', fecha: '2026-10-01' },
  { id: 'cerca', titulo: 'Práctica 1', area: 'calculo', tipo: 'entrega', fecha: '2026-10-05' },
  { id: 'junio', titulo: 'Cálculo (junio)', area: 'calculo', tipo: 'examen', fecha: '2027-06-09' },
];

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#a855f7"\n  subareas:\n    - id: calculo\n      nombre: Cálculo\n      color: "#36ace7"\n'),
      tareas: TAREAS, proyectos: [], ideas: [],
    },
    cambiarTareasAlInstante: vi.fn(), soloLectura: false, tareasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));

describe('pantalla Tareas', () => {
  const html = renderToString(<Tareas editar={() => undefined} />);
  it('dos tarjetas: Ahora y Por áreas', () => {
    expect(html).toContain('Ahora');
    expect(html).toContain('Por áreas');
  });
  it('en Ahora solo los grupos con algo', () => {
    expect(html).toContain('>Hoy<');
    expect(html).toContain('Se acerca');
    expect(html).not.toContain('Recados');
    expect(html).not.toContain('Atrasadas');
  });
  it('el examen de junio no está en Ahora pero sí en Por áreas (Uni › Cálculo › Exámenes)', () => {
    const [ahora, porAreas] = html.split('Por áreas');
    expect(ahora).not.toContain('Cálculo (junio)');
    expect(porAreas).toContain('Uni');
    expect(porAreas).toContain('Cálculo');
    expect(porAreas).toContain('Exámenes');
    expect(porAreas).toContain('Cálculo (junio)');
  });
});
