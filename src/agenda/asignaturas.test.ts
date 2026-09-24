import { describe, expect, it } from 'vitest';
import { anadirAsignatura, editarAsignatura, idAsignaturaDesdeNombre, quitarAsignatura } from './asignaturas';

describe('asignaturas', () => {
  it('id desde el nombre, sin repetir y sin usar «general»', () => {
    expect(idAsignaturaDesdeNombre('Física', [])).toBe('fisica');
    expect(idAsignaturaDesdeNombre('Física', ['fisica'])).toBe('fisica-2');
    expect(idAsignaturaDesdeNombre('General', [])).toBe('general-2');
    expect(idAsignaturaDesdeNombre('¿?', [])).toBe('asignatura');
  });
  it('añadir, editar y quitar', () => {
    const a = anadirAsignatura([], '  Cálculo  ');
    expect(a).toEqual([{ id: 'calculo', nombre: 'Cálculo', color: '#3d7bb8' }]);
    const b = anadirAsignatura(a, 'Física', '#123456');
    expect(b[1]).toEqual({ id: 'fisica', nombre: 'Física', color: '#123456' });
    expect(editarAsignatura(b, 'fisica', { nombre: 'Física I' })[1]).toEqual({ id: 'fisica', nombre: 'Física I', color: '#123456' });
    expect(quitarAsignatura(b, 'calculo').map((x) => x.id)).toEqual(['fisica']);
    expect(anadirAsignatura(b, '   ')).toBe(b);
  });
});
