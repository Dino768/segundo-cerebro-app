import { describe, expect, it } from 'vitest';
import type { Idea } from '../datos/ideas';
import { anadirIdea, editarIdea, ErrorIdeaCambiada, proyectoDesdeIdea, quitarIdea, tareaDesdeIdea, tituloDeIdea } from './ideas';

const vieja: Idea = { id: 'i-20260922-1', fecha: '2026-09-22', texto: 'Vieja' };

describe('anadirIdea', () => {
  it('añade al final con id nuevo y conserva las líneas del texto', () => {
    const r = anadirIdea([vieja], { fecha: '2026-09-22', texto: '  Nivel de hielo\r\ncon jefe  ', titulo: '  Hielo ', icono: 'snowflake' });
    expect(r[1]).toEqual({ id: 'i-20260922-2', fecha: '2026-09-22', texto: 'Nivel de hielo\ncon jefe', titulo: 'Hielo', icono: 'snowflake' });
  });
  it('un título vacío no se guarda', () => {
    expect(anadirIdea([], { fecha: '2026-09-25', texto: 'X', titulo: '  ' })[0]).toEqual({ id: 'i-20260925-1', fecha: '2026-09-25', texto: 'X' });
  });
  it('un texto vacío no añade nada', () => {
    const base = [vieja];
    expect(anadirIdea(base, { fecha: '2026-09-25', texto: ' \n ' })).toBe(base);
  });
});

describe('editarIdea', () => {
  it('cambia solo lo que se tocó y respeta lo que cambió otro', () => {
    const remota = { ...vieja, proyecto: 'juego' }; // Claude la vinculó mientras tanto
    const r = editarIdea([remota], vieja, { fecha: vieja.fecha, texto: 'Vieja', titulo: 'Con título' });
    expect(r[0]).toEqual({ ...vieja, proyecto: 'juego', titulo: 'Con título' });
  });
  it('si la idea ya no está, lanza ErrorIdeaCambiada', () => {
    expect(() => editarIdea([], vieja, { fecha: vieja.fecha, texto: 'X' })).toThrow(ErrorIdeaCambiada);
  });
});

describe('quitarIdea', () => {
  it('quita solo la del id, aunque haya otra igual', () => {
    const gemela = { ...vieja, id: 'i-20260922-2' };
    expect(quitarIdea([vieja, gemela], vieja.id)).toEqual([gemela]);
  });
});

describe('título, tarea y proyecto', () => {
  const larga: Idea = { id: 'x', fecha: '2026-09-25', texto: 'Primera línea\nSegunda', proyecto: 'juego', area: 'unreal', icono: 'planet' };
  it('el título visible es el título o la primera línea', () => {
    expect(tituloDeIdea(larga)).toBe('Primera línea');
    expect(tituloDeIdea({ ...larga, titulo: 'Gravedad' })).toBe('Gravedad');
  });
  it('a tarea: título, notas si hay más texto, y proyecto, área e icono', () => {
    expect(tareaDesdeIdea(larga)).toEqual({ titulo: 'Primera línea', notas: 'Primera línea\nSegunda', proyecto: 'juego', area: 'unreal', icono: 'planet' });
    expect(tareaDesdeIdea(vieja)).toEqual({ titulo: 'Vieja' });
  });
  it('a proyecto: el texto va en «Qué es» y lleva el icono', () => {
    const p = proyectoDesdeIdea(larga, 'Juego de gravedad', 'unreal', [], '2026-09-25');
    expect(p).toMatchObject({ id: 'juego-de-gravedad', estado: 'idea', area: 'unreal', icono: 'planet', titulo: 'Juego de gravedad' });
    expect(p.cuerpo).toContain('## Qué es\nPrimera línea\nSegunda\n');
  });
});
