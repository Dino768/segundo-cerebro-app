import { describe, expect, it } from 'vitest';
import { escalaFoto, esOperacionDeDiego, esZona, etiquetasFoto, zonaVisible } from './foto.ts';

describe('foto de la pizarra', () => {
  it('la zona que se ve, en coordenadas de la pizarra', () => {
    expect(zonaVisible({ x: 40, y: 20, escala: 2 }, 800, 600)).toEqual({ x1: -20, y1: -10, x2: 380, y2: 290 });
  });
  it('como mucho 1280 px de ancho', () => {
    expect(escalaFoto(640)).toBe(1);
    expect(escalaFoto(2560)).toBe(0.5);
    expect(escalaFoto(0)).toBe(1);
  });
  it('una etiqueta por pieza que se ve, arriba a la izquierda, dentro de la foto', () => {
    const piezas = [
      { id: 'f1', rect: { x: 100, y: 50, w: 200, h: 80 } },
      { id: 'fuera', rect: { x: 5000, y: 50, w: 200, h: 80 } },
      { id: 'medio-fuera', rect: { x: -100, y: -40, w: 200, h: 80 } },
    ];
    expect(etiquetasFoto(piezas, { x: 0, y: 0, escala: 1 }, 800, 600, 0.5)).toEqual([
      { texto: 'f1', x: 50, y: 25 },
      { texto: 'medio-fuera', x: 0, y: 0 },
    ]);
  });
  it('esZona', () => {
    expect(esZona({ x1: 0, y1: 0, x2: 10, y2: 10 })).toBe(true);
    expect(esZona({ x1: 0, y1: 0, x2: 0, y2: 10 })).toBe(false);
    expect(esZona({ x1: 'a', y1: 0, x2: 10, y2: 10 })).toBe(false);
    expect(esZona(null)).toBe(false);
  });
  it('guardar y juntar no cuentan como cambios de Diego', () => {
    expect(esOperacionDeDiego({ tipo: 'borrar', id: 'x' })).toBe(true);
    expect(esOperacionDeDiego({ tipo: 'estilo', id: 'x', fondo: 'ninguno' })).toBe(true);
    expect(esOperacionDeDiego({ tipo: 'guardada', ruta: 'estudios/a/pizarras/b.json' })).toBe(false);
  });
});
