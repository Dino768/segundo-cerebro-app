import { describe, expect, it } from 'vitest';
import {
  AMARILLO, ESTILO_INICIAL, FONDOS, estiloDeNota, esSinFondo, leerEstiloNota, mezclar, opEstiloNueva, pasoLetra, recordarEstilo, redimensionar,
} from './estiloNota';
import { COLORES } from './herramientas';

describe('estilo de una nota', () => {
  it('sin campos: amarilla como siempre, con la letra de siempre', () => {
    expect(estiloDeNota({})).toEqual({ background: AMARILLO.fondo, borderColor: AMARILLO.borde });
  });
  it('sin fondo: transparente', () => {
    expect(estiloDeNota({ fondo: 'ninguno' })).toEqual({ background: 'transparent', borderColor: 'transparent' });
    expect(esSinFondo({ fondo: 'ninguno' })).toBe(true);
    expect(esSinFondo({})).toBe(false);
  });
  it('con fondo, color, tamaño y alto', () => {
    expect(estiloDeNota({ fondo: '#ffffff', colorTexto: '#3b82f6', tamanoLetra: 'grande', alto: 120 })).toEqual({
      background: '#ffffff', borderColor: mezclar('#ffffff', '#000000', 0.12), color: '#3b82f6', fontSize: 22, minHeight: 120,
    });
  });
  it('mezclar colores', () => {
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mezclar('#b8603d', '#b8603d', 0.3)).toBe('#b8603d');
  });
  it('los fondos son los colores de la paleta, suaves', () => {
    expect(FONDOS).toHaveLength(COLORES.length);
    expect(FONDOS[1]).toBe(mezclar(COLORES[1], '#fdfbf6', 0.8));
  });
  it('A− y A+ van de uno en uno y se paran en los extremos', () => {
    expect(pasoLetra(undefined, 1)).toBe('grande');
    expect(pasoLetra('normal', -1)).toBe('pequena');
    expect(pasoLetra('pequena', -1)).toBe('pequena');
    expect(pasoLetra('enorme', 1)).toBe('enorme');
  });
});

describe('último estilo elegido', () => {
  it('lo que no vale vuelve a lo de por defecto', () => {
    expect(leerEstiloNota(null)).toEqual(ESTILO_INICIAL);
    expect(leerEstiloNota('no es json')).toEqual(ESTILO_INICIAL);
    expect(leerEstiloNota('{"fondo":"rojo","colorTexto":"#B3412E","tamanoLetra":"grande"}')).toEqual({ fondo: 'ninguno', colorTexto: '#b3412e', tamanoLetra: 'grande' });
  });
  it('recuerda lo que se cambia en la barrita', () => {
    const u = recordarEstilo(ESTILO_INICIAL, { fondo: '#f7e3d9' });
    expect(u).toEqual({ ...ESTILO_INICIAL, fondo: '#f7e3d9' });
    expect(recordarEstilo({ ...u, colorTexto: '#3b82f6' }, { colorTexto: null }).colorTexto).toBeNull();
  });
  it('una nota nueva lleva el último estilo', () => {
    expect(opEstiloNueva('d-1', { fondo: 'ninguno', colorTexto: null, tamanoLetra: 'normal' })).toEqual({
      tipo: 'estilo', id: 'd-1', fondo: 'ninguno', colorTexto: null, tamanoLetra: 'normal',
    });
  });
});

describe('tirador', () => {
  it('suma lo arrastrado', () => {
    expect(redimensionar(240, 80, 60.4, 20.6, false)).toEqual({ ancho: 300, alto: 101 });
  });
  it('con Mayús solo cambia el ancho', () => {
    expect(redimensionar(240, 80, 60, 20, true)).toEqual({ ancho: 300 });
  });
  it('no baja de 40 × 30 ni pasa de 2000 × 4000', () => {
    expect(redimensionar(240, 80, -900, -900, false)).toEqual({ ancho: 40, alto: 30 });
    expect(redimensionar(240, 80, 9000, 9000, false)).toEqual({ ancho: 2000, alto: 4000 });
  });
});
