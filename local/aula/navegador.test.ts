import { describe, expect, it } from 'vitest';
import { nombreDeDescarga } from './navegador.ts';

describe('nombreDeDescarga', () => {
  it('usa Content-Disposition (también en UTF-8) y si no, el final de la URL', () => {
    expect(nombreDeDescarga('https://x/a.pdf', "attachment; filename*=UTF-8''Tema%201%20l%C3%ADmites.pdf")).toBe('Tema 1 límites.pdf');
    expect(nombreDeDescarga('https://x/a.pdf', 'inline; filename="apuntes.pdf"')).toBe('apuntes.pdf');
    expect(nombreDeDescarga('https://x/pluginfile.php/1/mod_resource/content/2/Tema%202.pdf', undefined)).toBe('Tema 2.pdf');
  });
});
