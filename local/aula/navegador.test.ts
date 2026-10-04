import { describe, expect, it } from 'vitest';
import { BASE_AULA, enMoodle, nombreDeDescarga } from './navegador.ts';

describe('nombreDeDescarga', () => {
  it('usa Content-Disposition (también en UTF-8) y si no, el final de la URL', () => {
    expect(nombreDeDescarga('https://x/a.pdf', "attachment; filename*=UTF-8''Tema%201%20l%C3%ADmites.pdf")).toBe('Tema 1 límites.pdf');
    expect(nombreDeDescarga('https://x/a.pdf', 'inline; filename="apuntes.pdf"')).toBe('apuntes.pdf');
    expect(nombreDeDescarga('https://x/pluginfile.php/1/mod_resource/content/2/Tema%202.pdf', undefined)).toBe('Tema 2.pdf');
  });
  it('no lanza con porcentajes mal formados ni con URL inválidas', () => {
    expect(nombreDeDescarga('https://x/a%E0%A4%A.pdf', undefined)).toBe('a%E0%A4%A.pdf');
    expect(nombreDeDescarga('https://x/a.pdf', "attachment; filename*=UTF-8''%E0%A4%A")).toBe('%E0%A4%A');
    expect(nombreDeDescarga('no es una url', undefined)).toBe('no es una url');
    expect(nombreDeDescarga('', undefined)).toBe('archivo');
  });
});

describe('enMoodle', () => {
  it('solo es cierto dentro de Moodle, no en la entrada ni en Microsoft', () => {
    expect(enMoodle(`${BASE_AULA}/my/`)).toBe(true);
    expect(enMoodle(`${BASE_AULA}/login/index.php`)).toBe(false);
    expect(enMoodle('https://identifica.urjc.es/CAS/login')).toBe(false);
    expect(enMoodle('https://login.microsoftonline.com/x')).toBe(false);
  });
});
