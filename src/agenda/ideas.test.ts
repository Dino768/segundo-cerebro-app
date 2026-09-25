import { describe, expect, it } from 'vitest';
import { CABECERA_BANDEJA, ideasDe, parseBandeja, serializarBandeja } from '../datos/bandeja';
import { parseProyecto, serializarProyecto } from '../datos/proyectos';
import { anadirIdea, ErrorIdeaCambiada, proyectoDesdeIdea, quitarIdea, vincularIdea } from './ideas';

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

describe('proyectoDesdeIdea', () => {
  const idea = { fecha: '2026-09-20', texto: 'Juego de naves con hielo' };
  it('crea un proyecto en estado idea con la idea dentro', () => {
    const p = proyectoDesdeIdea(idea, 'Juego de naves', 'videojuegos', [], '2026-09-24');
    expect(p.id).toBe('juego-de-naves');
    expect(p.estado).toBe('idea');
    expect(p.area).toBe('videojuegos');
    expect(p.titulo).toBe('Juego de naves');
    expect(p.cuerpo).toBe(
      '# Juego de naves\n\n## Qué es\nJuego de naves con hielo\n\n## Dónde lo dejamos\n2026-09-24: creado desde la bandeja de ideas.\n',
    );
    const vuelta = parseProyecto(p.id, serializarProyecto(p));
    expect(vuelta).toMatchObject({ estado: 'idea', area: 'videojuegos', titulo: 'Juego de naves' });
  });
  it('no repite un id existente y funciona sin área', () => {
    const p = proyectoDesdeIdea(idea, 'Juego de naves', undefined, ['juego-de-naves'], '2026-09-24');
    expect(p.id).toBe('juego-de-naves-2');
    expect(p.area).toBeUndefined();
  });
});
