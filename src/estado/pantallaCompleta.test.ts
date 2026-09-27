import { describe, expect, it } from 'vitest';
import { escSale } from './pantallaCompleta';

describe('escSale', () => {
  it('Esc sale de la pantalla completa', () => {
    expect(escSale('Escape', 'DIV')).toBe(true);
    expect(escSale('Escape')).toBe(true);
  });
  it('pero no mientras se escribe (ahí Esc cancela lo escrito)', () => {
    expect(escSale('Escape', 'TEXTAREA')).toBe(false);
    expect(escSale('Escape', 'INPUT')).toBe(false);
  });
  it('otras teclas no', () => {
    expect(escSale('Enter', 'DIV')).toBe(false);
  });
});
