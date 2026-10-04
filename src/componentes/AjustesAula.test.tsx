import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { botonesAula, TextoEstadoAula } from './AjustesAula';

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
  it('el último resultado en memoria (no guardado en my-context) manda', () => {
    const base = { activo: true, revisando: false, estado: { ultimaRevision: '2026-10-03T09:12', resultado: 'ok' as const, mensaje: '1 aviso nuevo' } };
    const error = renderToString(<TextoEstadoAula e={{ ...base, ultimoResultado: { resultado: 'error', mensaje: 'my-context ha cambiado mientras revisaba: lo intento más tarde', cuando: '2026-10-04T10:00' } }} />);
    expect(error).toContain('La última revisión falló');
    expect(error).toContain('my-context ha cambiado mientras revisaba');
    expect(error).not.toContain('1 aviso nuevo');
    expect(error).toContain('3 oct'); // la última revisión completa sigue a la vista
    const entrar = renderToString(<TextoEstadoAula e={{ ...base, ultimoResultado: { resultado: 'necesita-entrar', mensaje: 'x', cuando: '2026-10-04T10:00' } }} />);
    expect(entrar).toContain('Vuelve a entrar');
  });
  it('entrando: lo dice y desactiva los dos botones; revisando: tampoco se puede entrar', () => {
    const e = { activo: true, revisando: false, estado: {} };
    expect(renderToString(<TextoEstadoAula e={{ ...e, entrando: true }} />)).toContain('Esperando a que entres');
    expect(botonesAula(e, false)).toEqual({ revisar: true, entrar: true });
    expect(botonesAula({ ...e, entrando: true }, false)).toEqual({ revisar: false, entrar: false });
    expect(botonesAula(e, true)).toEqual({ revisar: false, entrar: false });
    expect(botonesAula({ ...e, revisando: true }, false)).toEqual({ revisar: false, entrar: false });
    expect(botonesAula({ ...e, activo: false }, false)).toEqual({ revisar: false, entrar: true });
  });
});
