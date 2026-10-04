import { describe, expect, it } from 'vitest';
import { ErrorFormato } from '../../src/uni/tipos.ts';
import { BASE_AULA, enMoodle, nombreDeDescarga, validarSesion } from './navegador.ts';

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

describe('validarSesion', () => {
  const MY = `${BASE_AULA}/my/`;
  const ENTRADA = 'https://www.aulavirtual.urjc.es/moodle/login/index.php';
  it('sin conexión o con el aula en mantenimiento (5xx) no parece una sesión caducada', async () => {
    const reentrar = async () => undefined;
    await expect(validarSesion(async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED'); }, reentrar)).rejects.toThrow(ErrorFormato);
    await expect(validarSesion(async () => ({ status: 503, url: MY }), reentrar)).rejects.toThrow(/no responde/);
  });
  it('llevado a la entrada: intenta volver a entrar solo; si no puede, false', async () => {
    let reentradas = 0;
    expect(await validarSesion(async () => ({ status: 200, url: ENTRADA }), async () => void reentradas++)).toBe(false);
    expect(reentradas).toBe(1);
    const respuestas = [{ status: 200, url: ENTRADA }, { status: 200, url: MY }];
    expect(await validarSesion(async () => respuestas.shift()!, async () => undefined)).toBe(true);
    expect(await validarSesion(async () => ({ status: 200, url: MY }), async () => { throw new Error('no'); })).toBe(true);
  });
  it('si falla el intento de volver a entrar, decide la última comprobación', async () => {
    const respuestas = [{ status: 200, url: ENTRADA }, { status: 200, url: ENTRADA }];
    expect(await validarSesion(async () => respuestas.shift()!, async () => { throw new Error('ventana cerrada'); })).toBe(false);
  });
});
