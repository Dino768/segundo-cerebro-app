import { describe, expect, it } from 'vitest';
import type { Aviso } from '../../datos/avisos.ts';
import { anadirAvisos, avisoEntrar, avisoPrograma, ID_ENTRAR, limpiarAvisos, quitarAviso } from './avisos.ts';

const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, fecha: '2026-10-01', titulo: id, texto: 't', importante: false, leido: false, ...x });

describe('avisos del programa', () => {
  it('añade los nuevos arriba sin duplicar y sin tocar si Diego ya lo leyó', () => {
    const r = anadirAvisos([av('a', { leido: true })], [av('a', { titulo: 'otro' }), av('b')]);
    expect(r.map((x) => x.id)).toEqual(['b', 'a']);
    expect(r[1]).toEqual(av('a', { leido: true }));
  });
  it('borra los leídos hace más de 30 días, pone fecha a los leídos sin ella y nunca toca los no leídos', () => {
    const r = limpiarAvisos([
      av('viejo', { leido: true, leidoEl: '2026-09-08' }),
      av('justo', { leido: true, leidoEl: '2026-09-09' }),
      av('sin-fecha', { fecha: '2026-01-01', leido: true }),
      av('sin-leer', { fecha: '2026-01-01', leidoEl: '2026-01-01' }),
    ], '2026-10-09');
    expect(r.map((x) => [x.id, x.leidoEl])).toEqual([['justo', '2026-09-09'], ['sin-fecha', '2026-10-09'], ['sin-leer', '2026-01-01']]);
  });
  it('avisos propios: importantes, sin leer, con id del día sin repetir', () => {
    const uno = avisoPrograma([], '2026-10-04', 'Fecha por confirmar', 'Texto', 'calculo');
    expect(uno).toEqual({ id: 'programa-2026-10-04-1', asignatura: 'calculo', fecha: '2026-10-04', titulo: 'Fecha por confirmar', texto: 'Texto', importante: true, leido: false });
    expect(avisoPrograma([uno], '2026-10-04', 'X', 'Y').id).toBe('programa-2026-10-04-2');
  });
  it('el de volver a entrar tiene id fijo y se puede quitar', () => {
    expect(avisoEntrar('2026-10-04').id).toBe(ID_ENTRAR);
    expect(quitarAviso([avisoEntrar('2026-10-04'), av('b')], ID_ENTRAR).map((x) => x.id)).toEqual(['b']);
  });
});
