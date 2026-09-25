import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FormIdea } from './FormIdea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n'),
      proyectos: [{ id: 'nave', titulo: 'Nave', estado: 'activo', area: 'v', cuerpo: '', meta: {} }],
      tareas: [], ideas: [],
    },
    cambiarIdeas: vi.fn(), soloLectura: false, ideasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-09-25' }));

describe('FormIdea', () => {
  it('nueva desde Inicio: trae el texto, sugiere icono y tiene todos los campos', () => {
    const html = renderToString(<FormIdea inicial={{ texto: 'Un juego de piano' }} cerrar={() => undefined} />);
    expect(html).toContain('<h2>Nueva idea</h2>');
    expect(html).toMatch(/<textarea[^>]*>Un juego de piano<\/textarea>/);
    expect(html).toContain('title="device-gamepad-2"');
    expect(html).toContain('placeholder="(opcional)"');
    expect(html).toContain('aria-label="Área"');
    expect(html).toContain('aria-label="Proyecto"');
    expect(html).not.toContain('>Borrar</button>');
  });
  it('editar: título y proyecto puestos, y se puede borrar', () => {
    const html = renderToString(
      <FormIdea idea={{ id: 'i-1', fecha: '2026-09-22', titulo: 'Gravedad', texto: 'X', proyecto: 'nave', icono: 'planet' }} cerrar={() => undefined} />,
    );
    expect(html).toContain('<h2>Editar idea</h2>');
    expect(html).toContain('value="Gravedad"');
    expect(html).toMatch(/<option value="nave" selected="">/);
    expect(html).toContain('title="planet"');
    expect(html).toContain('>Borrar</button>');
  });
});
