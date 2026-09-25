import { describe, expect, it } from 'vitest';
import { SECCIONES } from './navegacion';

describe('SECCIONES', () => {
  it('ya no tiene Ideas (vive dentro de Proyectos) y conserva los emojis', () => {
    expect(SECCIONES.map((s) => s.id)).toEqual(['inicio', 'calendario', 'tareas', 'proyectos', 'estudio', 'ajustes']);
    expect(SECCIONES.find((s) => s.id === 'proyectos')?.icono).toBe('📁');
  });
});
