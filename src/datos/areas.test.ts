import { describe, expect, it } from 'vitest';
import { parseAreas, serializarAreas } from './areas';

const CON_SUBAREAS = `- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#a855f7"
    - id: unreal
      nombre: Unreal
      color: "#6b21a8"
`;

describe('parseAreas', () => {
  it('lee las áreas de siempre (sin subáreas)', () => {
    expect(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n')).toEqual([
      { id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] },
    ]);
  });
  it('lee las subáreas', () => {
    const as = parseAreas(CON_SUBAREAS);
    expect(as[1].subareas).toEqual([
      { id: 'blender', nombre: 'Blender', color: '#a855f7' },
      { id: 'unreal', nombre: 'Unreal', color: '#6b21a8' },
    ]);
  });
  it('vacío → lista vacía', () => {
    expect(parseAreas('')).toEqual([]);
  });
  it('un color sin comillas (que YAML toma como comentario) da un error claro', () => {
    expect(() => parseAreas('- id: uni\n  nombre: Uni\n  color: #3b82f6\n')).toThrow(/color/);
  });
  it('un color mal escrito en una subárea da error', () => {
    expect(() => parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: B\n      color: rojo\n')).toThrow(/b.*color/);
  });
  it('un id repetido (aunque sea entre área y subárea) da error', () => {
    expect(() =>
      parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: uni\n      nombre: Otra\n      color: "#a855f7"\n'),
    ).toThrow(/uni.*repetido/);
  });
  it('una subárea con subáreas da error', () => {
    expect(() =>
      parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: B\n      color: "#a855f7"\n      subareas: []\n'),
    ).toThrow(/un solo nivel/);
  });
  it('subareas que no es una lista da error', () => {
    expect(() => parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas: blender\n')).toThrow(/subareas/);
  });
});

describe('serializarAreas', () => {
  it('leer y volver a escribir deja el archivo idéntico', () => {
    expect(serializarAreas(parseAreas(CON_SUBAREAS))).toBe(CON_SUBAREAS);
  });
  it('sin subáreas no escribe la clave subareas', () => {
    expect(serializarAreas([{ id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] }])).toBe(
      '- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n',
    );
  });
  it('lista vacía → archivo vacío', () => {
    expect(serializarAreas([])).toBe('');
  });
});
