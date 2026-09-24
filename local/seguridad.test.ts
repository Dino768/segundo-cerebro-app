import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { esIdAsignatura, esIdConversacion, esNombreImagen, hostPermitido, origenPermitido, rutaDentro } from './seguridad.ts';

describe('hostPermitido', () => {
  it('acepta 127.0.0.1 y localhost en su puerto', () => {
    expect(hostPermitido('127.0.0.1:5174', 5174)).toBe(true);
    expect(hostPermitido('localhost:5174', 5174)).toBe(true);
  });
  it('rechaza otros nombres (otra web que apunta a tu PC) y otros puertos', () => {
    expect(hostPermitido('malvado.com:5174', 5174)).toBe(false);
    expect(hostPermitido('127.0.0.1:80', 5174)).toBe(false);
    expect(hostPermitido(undefined, 5174)).toBe(false);
  });
});

describe('origenPermitido', () => {
  it('sin Origin (peticiones GET de la propia app) sí', () => {
    expect(origenPermitido(undefined, 5174)).toBe(true);
  });
  it('su propio origen sí', () => {
    expect(origenPermitido('http://127.0.0.1:5174', 5174)).toBe(true);
    expect(origenPermitido('http://localhost:5174', 5174)).toBe(true);
  });
  it('otra web no, ni siquiera la app publicada', () => {
    expect(origenPermitido('https://dino768.github.io', 5174)).toBe(false);
    expect(origenPermitido('null', 5174)).toBe(false);
  });
});

describe('rutaDentro', () => {
  const base = path.resolve('/tmp/estudios');
  it('una ruta de dentro devuelve la ruta absoluta', () => {
    expect(rutaDentro(base, 'fisica/a.json')).toBe(path.join(base, 'fisica', 'a.json'));
  });
  it('no deja salir con ..', () => {
    expect(rutaDentro(base, '../secreto.txt')).toBeNull();
    expect(rutaDentro(base, 'fisica/../../secreto.txt')).toBeNull();
  });
  it('no acepta rutas absolutas de fuera', () => {
    expect(rutaDentro(base, path.resolve('/otra/cosa'))).toBeNull();
  });
  it('la propia carpeta no es un archivo', () => {
    expect(rutaDentro(base, '.')).toBeNull();
    expect(rutaDentro(base, '')).toBeNull();
  });
});

describe('ids', () => {
  it('asignaturas: minúsculas, números y guiones (general también vale como carpeta)', () => {
    expect(esIdAsignatura('fisica')).toBe(true);
    expect(esIdAsignatura('calculo-2')).toBe(true);
    expect(esIdAsignatura('general')).toBe(true);
    expect(esIdAsignatura('Física')).toBe(false);
    expect(esIdAsignatura('../x')).toBe(false);
    expect(esIdAsignatura('')).toBe(false);
  });
  it('conversaciones: un uuid', () => {
    expect(esIdConversacion('be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3')).toBe(true);
    expect(esIdConversacion('abc')).toBe(false);
    expect(esIdConversacion('../be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3')).toBe(false);
  });
  it('imágenes: nombre simple con extensión de imagen', () => {
    expect(esNombreImagen('captura-1727180000000-12.png')).toBe(true);
    expect(esNombreImagen('foto.JPG')).toBe(true);
    expect(esNombreImagen('../a.png')).toBe(false);
    expect(esNombreImagen('a.exe')).toBe(false);
  });
});
