import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { ProximosExamenes } from './ProximosExamenes';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({ datos: { areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#a855f7"\n'), tareas: [], proyectos: [], ideas: [] } }),
}));

describe('ProximosExamenes', () => {
  it('los 3 más cercanos con cuánto falta', () => {
    const tareas = [
      { id: 'a', titulo: 'Cálculo (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-21' },
      { id: 'b', titulo: 'Álgebra (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-18' },
      { id: 'c', titulo: 'FP (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-08' },
      { id: 'd', titulo: 'Arquitectura (mayo)', area: 'uni', tipo: 'examen' as const, fecha: '2027-05-12' },
    ];
    const html = renderToString(<ProximosExamenes tareas={tareas} hoy="2026-10-01" ir={() => undefined} />);
    expect(html).toContain('Próximos exámenes');
    expect(html.indexOf('FP (enero)')).toBeLessThan(html.indexOf('Álgebra (enero)'));
    expect(html).toContain('faltan 99 días');
    expect(html).not.toContain('Arquitectura');
  });
  it('sin exámenes no pinta nada', () => {
    expect(renderToString(<ProximosExamenes tareas={[]} hoy="2026-10-01" ir={() => undefined} />)).toBe('');
  });
});
