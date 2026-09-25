import { describe, expect, it } from 'vitest';
import { BASICOS } from './basicos';
import { DICCIONARIO, iconoAlEscribir, iconoPara, normalizar } from './diccionario';

describe('iconoPara', () => {
  it('encuentra el icono por una palabra del título', () => {
    expect(iconoPara('Examen de física')).toBe('file-pencil');
    expect(iconoPara('Modelar la nave en Blender')).toBe('brand-blender');
    expect(iconoPara('Tocar el piano')).toBe('piano');
    expect(iconoPara('Ir al gym')).toBe('barbell');
    expect(iconoPara('Prototipo en Unity')).toBe('brand-unity');
  });
  it('las palabras cortas (3 letras o menos) tienen que ser exactas', () => {
    expect(iconoPara('Tarea de la uni')).toBe('school');
    expect(iconoPara('Unir las piezas')).toBeUndefined(); // «unir» no es «uni»
  });
  it('da igual mayúsculas, tildes y plurales', () => {
    expect(iconoPara('EXÁMENES de FÍSICA')).toBe('file-pencil');
    expect(normalizar('Música ÁRBOL')).toBe('musica arbol');
  });
  it('no confunde palabras que solo contienen otra', () => {
    expect(iconoPara('Sacar al perro')).toBeUndefined(); // «sacar» no es «car»
  });
  it('sin palabras conocidas no pone nada', () => {
    expect(iconoPara('Cosas varias')).toBeUndefined();
    expect(iconoPara('')).toBeUndefined();
  });
  it('todos los iconos del diccionario están en los básicos', () => {
    for (const e of DICCIONARIO) expect(BASICOS[e.icono], e.icono).toBeDefined();
  });
});

describe('iconoAlEscribir', () => {
  it('sigue al título mientras no se haya elegido a mano', () => {
    expect(iconoAlEscribir('Examen', undefined, false)).toBe('file-pencil');
    expect(iconoAlEscribir('Cosas', 'file-pencil', false)).toBeUndefined();
  });
  it('si se eligió (o quitó) a mano, no cambia', () => {
    expect(iconoAlEscribir('Examen', 'cube', true)).toBe('cube');
    expect(iconoAlEscribir('Examen', undefined, true)).toBeUndefined();
  });
});
