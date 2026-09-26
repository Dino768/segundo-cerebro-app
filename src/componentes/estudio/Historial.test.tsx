import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pizarraVacia } from '../../estudio/pizarra';
import { VisorHistorial } from './Historial';

vi.mock('../../estado/datos', () => ({ useDatos: () => ({ config: { owner: 'd', repo: 'r', token: 'x' } }) }));
vi.mock('../../estado/dialogos', () => ({ confirmar: vi.fn(), pedirTexto: vi.fn() }));

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: () => undefined });
});

describe('VisorHistorial', () => {
  it('con token se puede editar: enseña lo pendiente de subir, las herramientas y el estado del guardado', () => {
    localStorage.setItem('sc-historial-fisica-a.json', JSON.stringify(pizarraVacia('Newton')));
    localStorage.setItem('sc-pendientes-fisica-a.json', JSON.stringify([{ tipo: 'nota', id: null, nuevoId: 'd-1', x: 0, y: 0, contenido: 'Sin subir' }]));
    const html = renderToString(<VisorHistorial asignatura={{ id: 'fisica', nombre: 'Física' } as never} entrada={{ archivo: 'a.json', fecha: null, titulo: 'Newton' }} alVolver={() => undefined} />);
    expect(html).toContain('Sin subir');
    expect(html).toContain('Herramientas de la pizarra');
    expect(html).toContain('estado-cola');
  });
});
