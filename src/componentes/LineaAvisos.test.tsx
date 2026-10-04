import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Aviso } from '../datos/avisos';
import { LineaAvisos } from './LineaAvisos';

const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, fecha: '2026-10-03', titulo: id, texto: 't', importante: true, leido: false, ...x });

describe('línea de avisos del Inicio', () => {
  it('solo cuenta los importantes sin leer', () => {
    const html = renderToString(<LineaAvisos avisos={[av('a'), av('b'), av('c', { leido: true }), av('d', { importante: false })]} ir={() => undefined} />);
    expect(html).toContain('2 avisos importantes de la uni');
  });
  it('singular', () => {
    expect(renderToString(<LineaAvisos avisos={[av('a')]} ir={() => undefined} />)).toContain('1 aviso importante de la uni');
  });
  it('sin importantes sin leer, nada', () => {
    expect(renderToString(<LineaAvisos avisos={[av('a', { leido: true })]} ir={() => undefined} />)).toBe('');
  });
});
