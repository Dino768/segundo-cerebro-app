import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { ListaIdeas } from './ListaIdeas';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n'),
      proyectos: [], tareas: [],
      ideas: [
        { id: 'i-1', fecha: '2026-09-22', texto: 'Suelta, primera línea\nsegunda' },
        { id: 'i-2', fecha: '2026-09-25', titulo: 'Gravedad', texto: 'X', area: 'v', icono: 'piano' },
      ],
    },
    cambiarIdeas: vi.fn(), soloLectura: false, tareasBloqueadas: false, ideasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-09-25' }));

describe('ListaIdeas', () => {
  it('agrupa por área, enseña icono y título en negrita, y «Sin área» al final', () => {
    const html = renderToString(<ListaIdeas editar={() => undefined} ir={() => undefined} />);
    expect(html.indexOf('Videojuegos')).toBeLessThan(html.indexOf('Sin área'));
    expect(html).toMatch(/<svg[\s\S]*<strong>Gravedad<\/strong>/);
    expect(html).toContain('Suelta, primera línea');
    expect(html).not.toContain('segunda');
    expect(html).toContain('>+ Idea</button>');
  });
});
