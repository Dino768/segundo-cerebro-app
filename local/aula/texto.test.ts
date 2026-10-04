import { describe, expect, it } from 'vitest';
import { textoDe } from './texto.ts';

const enc = (s: string) => new TextEncoder().encode(s);
describe('texto de un archivo', () => {
  it('HTML y texto', async () => {
    expect(await textoDe(enc('<p>Parcial el <b>13</b></p><p>Aula 2</p>'), 'guia.html')).toBe('Parcial el 13\nAula 2');
    expect(await textoDe(enc('hola'), 'a.txt')).toBe('hola');
  });
  it('lo que no sabe leer: null', async () => {
    expect(await textoDe(enc('PK'), 'a.pptx')).toBeNull();
    expect(await textoDe(enc('no es un pdf'), 'roto.pdf')).toBeNull();
  });
});
