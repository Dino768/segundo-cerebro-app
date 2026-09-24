import { describe, expect, it } from 'vitest';
import { conContexto, sinContexto } from './contexto.ts';

describe('contexto del mensaje', () => {
  const c = { asignatura: 'fisica', carpeta: 'C:\\e\\fisica\\.en-curso\\id', pizarraAbierta: 2, imagenes: ['C:\\e\\fisica\\.en-curso\\id\\imagenes\\captura-1.png'] };
  it('añade la cabecera y la quita al leer', () => {
    const m = conContexto(c, '¿Qué es una fuerza?');
    expect(m).toContain('Asignatura: fisica');
    expect(m).toContain('Pizarras de esta conversación: C:\\e\\fisica\\.en-curso\\id');
    expect(m).toContain('Pizarra abierta: pizarra-2.json');
    expect(sinContexto(m)).toEqual({ texto: '¿Qué es una fuerza?', imagenes: ['captura-1.png'] });
  });
  it('sin pizarra abierta ni imágenes', () => {
    const m = conContexto({ ...c, pizarraAbierta: null, imagenes: [] }, 'Hola');
    expect(m).toContain('Pizarra abierta: ninguna');
    expect(m).not.toContain('Capturas');
    expect(sinContexto(m)).toEqual({ texto: 'Hola', imagenes: [] });
  });
  it('un mensaje escrito en la terminal se queda igual', () => {
    expect(sinContexto('hola')).toEqual({ texto: 'hola', imagenes: [] });
  });
});
