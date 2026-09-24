import { describe, expect, it } from 'vitest';
import { entradaDeArchivo, imagenesDe, nombreHistorial, ordenarHistorial, paraHistorial } from './historial';
import { pizarraVacia, type Pizarra } from './pizarra';

describe('historial', () => {
  it('nombre del archivo: fecha y título, sin repetir', () => {
    expect(nombreHistorial('2026-09-24', 'Leyes de Newton', [])).toBe('2026-09-24-leyes-de-newton.json');
    expect(nombreHistorial('2026-09-24', 'Leyes de Newton', ['2026-09-24-leyes-de-newton.json'])).toBe('2026-09-24-leyes-de-newton-2.json');
    expect(nombreHistorial('2026-09-24', '¿?', [])).toBe('2026-09-24-pizarra.json');
  });
  it('entrada legible desde el nombre del archivo', () => {
    expect(entradaDeArchivo('2026-09-24-leyes-de-newton.json')).toEqual({ archivo: '2026-09-24-leyes-de-newton.json', fecha: '2026-09-24', titulo: 'Leyes de newton' });
    expect(entradaDeArchivo('notas.md')).toBeNull();
    expect(entradaDeArchivo('suelta.json')).toEqual({ archivo: 'suelta.json', fecha: null, titulo: 'Suelta' });
  });
  it('la más reciente primero', () => {
    const es = ['2026-09-20-a.json', '2026-09-24-b.json'].map((a) => entradaDeArchivo(a)!);
    expect(ordenarHistorial(es).map((e) => e.archivo)).toEqual(['2026-09-24-b.json', '2026-09-20-a.json']);
  });
  it('imágenes que usa una pizarra, y copia limpia para el historial', () => {
    const p: Pizarra = {
      ...pizarraVacia('x'),
      guardarComo: 'Newton',
      guardadaEn: 'estudios/fisica/pizarras/a.json',
      piezas: [
        { id: 'i1', tipo: 'imagen', x: 0, y: 0, ancho: 100, contenido: 'imagenes/a.png' },
        { id: 'i2', tipo: 'imagen', x: 0, y: 0, ancho: 100, contenido: 'imagenes/a.png' },
        { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'hola' },
      ],
    };
    expect(imagenesDe(p)).toEqual(['imagenes/a.png']);
    expect(paraHistorial(p, 'Newton')).toMatchObject({ titulo: 'Newton', guardarComo: null, guardadaEn: null });
  });
});
