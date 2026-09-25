import { describe, expect, it } from 'vitest';
import { mezclarCambios } from './cambios';

describe('mezclarCambios', () => {
  it('aplica solo lo que cambió y respeta lo que otro cambió en lo demás', () => {
    const antes = { id: 'a', titulo: 'A', notas: 'n' } as { id: string; titulo: string; notas?: string; icono?: string };
    const remota = { ...antes, notas: 'cambiada por Claude' };
    const despues = { titulo: 'A', notas: 'n', icono: 'cube' };
    expect(mezclarCambios(remota, antes, despues)).toEqual({ id: 'a', titulo: 'A', notas: 'cambiada por Claude', icono: 'cube' });
  });
  it('un campo que pasa a undefined se borra', () => {
    const antes = { id: 'a', titulo: 'A', icono: 'cube' } as { id: string; titulo: string; icono?: string };
    expect(mezclarCambios(antes, antes, { titulo: 'A', icono: undefined })).toEqual({ id: 'a', titulo: 'A' });
  });
});
