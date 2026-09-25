import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Lateral } from './Lateral';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: [], tareas: [],
      proyectos: [{ id: 'nave', titulo: 'Nave', estado: 'activo', icono: 'rocket', cuerpo: '', meta: {} }],
      ideas: [{ id: 'i-1', fecha: '2026-09-25', texto: 'X' }, { id: 'i-2', fecha: '2026-09-25', texto: 'Y' }],
    },
  }),
}));

describe('Lateral', () => {
  it('Proyectos se despliega con Ideas (y su número) y los proyectos activos', () => {
    const html = renderToString(<Lateral actual="proyectos" pestana="ideas" ir={() => undefined} bloqueado={false} proyectoAbierto={null} />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toMatch(/item-lateral sub activo[^>]*>[\s\S]*?💡[\s\S]*?Ideas[\s\S]*?>2</);
    expect(html).toContain('Nave');
  });
});
