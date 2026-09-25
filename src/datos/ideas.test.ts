import { describe, expect, it } from 'vitest';
import { parseBandeja } from './bandeja';
import { fusionarBandeja, nuevoIdIdea, ordenarIdeas, parseIdeas, serializarIdeas, type Idea } from './ideas';
import { ErrorDatos } from './yaml';

const EJEMPLO = `- id: i-20260925-1
  fecha: 2026-09-25
  titulo: Juego de gravedad
  icono: planet
  area: unreal
  proyecto: juego-gravedad
  texto: |-
    Cambias la gravedad para resolver puzles.
    - Mecánica: girar el mundo 90º
- id: i-20260922-1
  fecha: 2026-09-22
  texto: App propia con IA y MCP.
`;

describe('parseIdeas', () => {
  it('lee el ejemplo del diseño', () => {
    const is = parseIdeas(EJEMPLO);
    expect(is[0]).toEqual({
      id: 'i-20260925-1', fecha: '2026-09-25', titulo: 'Juego de gravedad', icono: 'planet', area: 'unreal',
      proyecto: 'juego-gravedad', texto: 'Cambias la gravedad para resolver puzles.\n- Mecánica: girar el mundo 90º',
    });
    expect(is[1]).toEqual({ id: 'i-20260922-1', fecha: '2026-09-22', texto: 'App propia con IA y MCP.' });
  });
  it('vacío → lista vacía', () => {
    expect(parseIdeas('')).toEqual([]);
  });
  it('rechaza ideas sin id, sin texto o con fecha mal escrita, diciendo cuál', () => {
    expect(() => parseIdeas('- fecha: 2026-09-25\n  texto: X\n')).toThrow(ErrorDatos);
    expect(() => parseIdeas('- id: i-1\n  fecha: 2026-09-25\n  texto: "  "\n')).toThrow(/texto/);
    expect(() => parseIdeas('- id: i-1\n  fecha: 25/09/2026\n  texto: X\n')).toThrow(/fecha/);
    expect(() => parseIdeas('- id: i-1\n  fecha: 2026-09-25\n  texto: X\n  icono: 3\n')).toThrow(/i-1.*icono/);
    expect(() => parseIdeas('texto: suelto\n')).toThrow(/lista/);
  });
  it('rechaza ids repetidos', () => {
    expect(() => parseIdeas('- id: a\n  fecha: 2026-09-25\n  texto: X\n- id: a\n  fecha: 2026-09-25\n  texto: Y\n')).toThrow(/repetido/);
  });
});

describe('serializarIdeas', () => {
  it('leer y escribir conserva todo', () => {
    expect(parseIdeas(serializarIdeas(parseIdeas(EJEMPLO)))).toEqual(parseIdeas(EJEMPLO));
  });
  it('texto con caracteres especiales de YAML y varias líneas se conserva exacto', () => {
    const raro = 'Jefe: "el final" # no es comentario\n- lista\n\n  sangría: sí\n[corchetes] {llaves} & * ! |';
    const idea: Idea = { id: 'i-20260925-1', fecha: '2026-09-25', texto: raro, titulo: '#1: ¿qué?' };
    expect(parseIdeas(serializarIdeas([idea]))).toEqual([idea]);
  });
  it('lista vacía → archivo vacío', () => {
    expect(serializarIdeas([])).toBe('');
  });
});

describe('nuevoIdIdea', () => {
  it('usa la fecha de la idea y el siguiente número libre', () => {
    const is = parseIdeas(EJEMPLO);
    expect(nuevoIdIdea('2026-09-25', is)).toBe('i-20260925-2');
    expect(nuevoIdIdea('2026-10-01', is)).toBe('i-20261001-1');
  });
});

describe('ordenarIdeas', () => {
  it('la más nueva primero; a igual fecha, la última del archivo primero', () => {
    const is: Idea[] = [
      { id: 'a', fecha: '2026-09-22', texto: 'A' },
      { id: 'b', fecha: '2026-09-25', texto: 'B' },
      { id: 'c', fecha: '2026-09-22', texto: 'C' },
    ];
    expect(ordenarIdeas(is).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('fusionarBandeja', () => {
  const BANDEJA = parseBandeja('# Bandeja de ideas\n\nTexto de cabecera.\n\n- 2026-09-22 [segundo-cerebro]: App propia\r\n- 2026-09-24: Juego: jefe [final]\n');
  it('pasa cada idea con su fecha, proyecto y texto, y descarta la cabecera', () => {
    expect(fusionarBandeja([], BANDEJA)).toEqual([
      { id: 'i-20260922-1', fecha: '2026-09-22', proyecto: 'segundo-cerebro', texto: 'App propia' },
      { id: 'i-20260924-1', fecha: '2026-09-24', texto: 'Juego: jefe [final]' },
    ]);
  });
  it('no duplica las que ya están y repetirlo no cambia nada', () => {
    const una = fusionarBandeja([], BANDEJA);
    expect(fusionarBandeja(una, BANDEJA)).toEqual(una);
  });
  it('si existen los dos archivos, añade solo las nuevas al final, con ids libres', () => {
    const ya: Idea[] = [{ id: 'i-20260922-1', fecha: '2026-09-22', proyecto: 'segundo-cerebro', texto: 'App propia' }];
    expect(fusionarBandeja(ya, BANDEJA).map((i) => i.id)).toEqual(['i-20260922-1', 'i-20260924-1']);
  });
});
