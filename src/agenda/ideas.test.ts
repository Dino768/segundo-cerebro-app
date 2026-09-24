import { describe, expect, it } from 'vitest';
import { CABECERA_BANDEJA, ideasDe, parseBandeja, serializarBandeja } from '../datos/ideas';
import { anadirIdea, ErrorIdeaCambiada, quitarIdea, vincularIdea } from './ideas';

const base = parseBandeja('# Bandeja\n\n- 2026-09-22: Vieja\n');
const vieja = { fecha: '2026-09-22', texto: 'Vieja' };

describe('anadirIdea', () => {
  it('añade la idea al final', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', texto: 'Nueva' });
    expect(serializarBandeja(r)).toBe('# Bandeja\n\n- 2026-09-22: Vieja\n- 2026-09-24: Nueva\n');
  });
  it('en una bandeja vacía pone antes la cabecera', () => {
    const r = anadirIdea([], { fecha: '2026-09-24', texto: 'Primera' });
    expect(serializarBandeja(r)).toBe(`${CABECERA_BANDEJA}- 2026-09-24: Primera\n`);
  });
  it('junta en una línea un texto pegado con saltos de línea', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', texto: '  Nivel de hielo\ncon  jefe\r\nfinal ' });
    expect(ideasDe(r)[0].texto).toBe('Nivel de hielo con jefe final');
  });
  it('un texto vacío no añade nada', () => {
    expect(anadirIdea(base, { fecha: '2026-09-24', texto: '  \n ' })).toBe(base);
  });
  it('guarda el proyecto si lo tiene', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', proyecto: 'juego', texto: 'X' });
    expect(serializarBandeja(r)).toContain('- 2026-09-24 [juego]: X\n');
  });
});

describe('vincularIdea', () => {
  it('pone y quita el proyecto sin mover la idea', () => {
    const vinculada = vincularIdea(base, vieja, 'juego-nave');
    expect(serializarBandeja(vinculada)).toBe('# Bandeja\n\n- 2026-09-22 [juego-nave]: Vieja\n');
    const suelta = vincularIdea(vinculada, { ...vieja, proyecto: 'juego-nave' }, undefined);
    expect(serializarBandeja(suelta)).toBe('# Bandeja\n\n- 2026-09-22: Vieja\n');
  });
  it('si la idea ya no está, lanza ErrorIdeaCambiada', () => {
    expect(() => vincularIdea(base, { fecha: '2026-09-22', texto: 'Otra' }, 'x')).toThrow(ErrorIdeaCambiada);
  });
});

describe('quitarIdea', () => {
  it('quita la idea y deja el resto', () => {
    expect(serializarBandeja(quitarIdea(base, vieja))).toBe('# Bandeja\n\n');
  });
  it('con dos ideas idénticas quita solo una', () => {
    const doble = parseBandeja('- 2026-09-22: Vieja\n- 2026-09-22: Vieja\n');
    expect(ideasDe(quitarIdea(doble, vieja))).toHaveLength(1);
  });
  it('distingue una idea vinculada de la misma sin vincular', () => {
    const ls = parseBandeja('- 2026-09-22 [juego]: Vieja\n');
    expect(() => quitarIdea(ls, vieja)).toThrow(ErrorIdeaCambiada);
  });
});
