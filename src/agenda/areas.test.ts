import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import {
  areaMadre, buscarArea, colorDeArea, crearArea, destinosPosibles, editarArea, ErrorArea, idsDeArea, moverDeArea,
  nombreDeArea, nuevoIdArea, opcionesDeArea, quitarArea, todosLosIds,
} from './areas';

const AREAS = parseAreas(`- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#f97316"
    - id: unreal
      nombre: Unreal
      color: "#a855f7"
`);

describe('buscar', () => {
  it('encuentra áreas y subáreas, con su madre', () => {
    expect(buscarArea(AREAS, 'uni')?.madre.id).toBe('uni');
    expect(buscarArea(AREAS, 'blender')?.area.nombre).toBe('Blender');
    expect(buscarArea(AREAS, 'blender')?.madre.id).toBe('videojuegos');
    expect(buscarArea(AREAS, 'nada')).toBeUndefined();
    expect(buscarArea(AREAS, undefined)).toBeUndefined();
  });
  it('areaMadre, ids, color y nombre', () => {
    expect(areaMadre(AREAS, 'unreal')).toBe('videojuegos');
    expect(areaMadre(AREAS, 'nada')).toBeUndefined();
    expect(idsDeArea(AREAS, 'videojuegos')).toEqual(['videojuegos', 'blender', 'unreal']);
    expect(idsDeArea(AREAS, 'blender')).toEqual(['blender']);
    expect(idsDeArea(AREAS, 'nada')).toEqual([]);
    expect(todosLosIds(AREAS)).toEqual(['uni', 'videojuegos', 'blender', 'unreal']);
    expect(colorDeArea(AREAS, 'blender')).toBe('#f97316');
    expect(colorDeArea(AREAS, 'nada')).toBe('#9ca3af');
    expect(nombreDeArea(AREAS, 'blender')).toBe('Blender');
  });
});

describe('crear y editar', () => {
  it('el id sale del nombre, sin tildes y sin repetir entre áreas y subáreas', () => {
    expect(nuevoIdArea('Música y Piano', AREAS)).toBe('musica-y-piano');
    expect(nuevoIdArea('Blender', AREAS)).toBe('blender-2');
    expect(nuevoIdArea('¡¡!!', AREAS)).toBe('area');
  });
  it('un área nueva va al final; una subárea nace con el color de su área', () => {
    const r = crearArea(AREAS, { nombre: 'Salud', color: '#22c55e' });
    expect(r.at(-1)).toEqual({ id: 'salud', nombre: 'Salud', color: '#22c55e', subareas: [] });
    const s = crearArea(AREAS, { nombre: 'Roblox' }, 'videojuegos');
    expect(s[1].subareas.at(-1)).toEqual({ id: 'roblox', nombre: 'Roblox', color: '#a855f7' });
  });
  it('crear dentro de una subárea no se puede', () => {
    expect(() => crearArea(AREAS, { nombre: 'X' }, 'blender')).toThrow(ErrorArea);
  });
  it('editar cambia nombre o color sin tocar el id', () => {
    const r = editarArea(AREAS, 'unreal', { nombre: 'Unreal Engine', color: '#111111' });
    expect(r[1].subareas[1]).toEqual({ id: 'unreal', nombre: 'Unreal Engine', color: '#111111' });
    expect(editarArea(AREAS, 'uni', { color: '#000000' })[0].color).toBe('#000000');
  });
  it('editar un área que ya no existe lanza ErrorArea', () => {
    expect(() => editarArea(AREAS, 'nada', { nombre: 'X' })).toThrow(ErrorArea);
  });
});

describe('borrar', () => {
  it('quitar un área quita también sus subáreas; quitar una subárea deja su área', () => {
    expect(todosLosIds(quitarArea(AREAS, 'videojuegos'))).toEqual(['uni']);
    expect(todosLosIds(quitarArea(AREAS, 'blender'))).toEqual(['uni', 'videojuegos', 'unreal']);
  });
  it('los destinos no incluyen lo que se borra', () => {
    expect(destinosPosibles(AREAS, 'videojuegos')).toEqual(['uni']);
    expect(destinosPosibles(AREAS, 'blender')).toEqual(['uni', 'videojuegos', 'unreal']);
  });
  it('si solo queda un área, no hay destinos', () => {
    expect(destinosPosibles(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n'), 'uni')).toEqual([]);
  });
  it('mover cambia el área solo de lo que estaba dentro', () => {
    const xs = [{ area: 'blender' }, { area: 'uni' }, { area: 'videojuegos' }, {}];
    expect(moverDeArea(xs, ['videojuegos', 'blender', 'unreal'], 'uni')).toEqual([{ area: 'uni' }, { area: 'uni' }, { area: 'uni' }, {}]);
  });
  it('mover a un destino que se va a borrar lanza ErrorArea', () => {
    expect(() => moverDeArea([{ area: 'blender' }], ['videojuegos', 'blender'], 'blender')).toThrow(ErrorArea);
  });
});

describe('opcionesDeArea', () => {
  it('cada área seguida de sus subáreas', () => {
    expect(opcionesDeArea(AREAS)).toEqual([
      { id: 'uni', nombre: 'Uni', sub: false },
      { id: 'videojuegos', nombre: 'Videojuegos', sub: false },
      { id: 'blender', nombre: 'Blender', sub: true },
      { id: 'unreal', nombre: 'Unreal', sub: true },
    ]);
  });
});
