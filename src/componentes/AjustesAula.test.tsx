import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TextoEstadoAula } from './AjustesAula';

describe('estado del aula virtual en Ajustes', () => {
  it('última revisión con su resumen', () => {
    const html = renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: { ultimaRevision: '2026-10-04T09:12', resultado: 'ok', mensaje: '3 avisos nuevos, 2 materiales, 1 fecha' } }} />);
    expect(html).toContain('Última revisión: ');
    expect(html).toContain('4 oct');
    expect(html).toContain('09:12');
    expect(html).toContain('3 avisos nuevos, 2 materiales, 1 fecha');
  });
  it('revisando, sin revisión y necesita entrar', () => {
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: true, estado: {} }} />)).toContain('Revisando el aula virtual…');
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: {} }} />)).toContain('Todavía no ha revisado');
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: { resultado: 'necesita-entrar', mensaje: 'x' } }} />)).toContain('Vuelve a entrar');
  });
});
