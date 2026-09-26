import type { Estado, Proyecto } from '../datos/proyectos';
import type { Tarea } from '../datos/tareas';
import { compararPrioridad, esRepetida } from './tareas';

export const LIMITE_ACTIVOS = 2;

export function necesitaAvisoActivos(ps: Proyecto[], id: string, nuevoEstado: Estado): boolean {
  if (nuevoEstado !== 'activo') return false;
  if (ps.find((p) => p.id === id)?.estado === 'activo') return false;
  return ps.filter((p) => p.estado === 'activo' && p.id !== id).length >= LIMITE_ACTIVOS;
}

const ORDEN_ESTADO: Record<Estado, number> = { activo: 0, parado: 1, idea: 2, terminado: 3 };

export function ordenarProyectos(ps: Proyecto[]): Proyecto[] {
  return [...ps].sort(
    (a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
      compararPrioridad(a, b) ||
      a.titulo.localeCompare(b.titulo, 'es'),
  );
}

// Progreso = tareas normales del proyecto hechas / total. Las que se repiten cada semana no cuentan.
export function progresoProyecto(ts: Tarea[], id: string): { hechas: number; total: number } {
  const delProyecto = ts.filter((t) => t.proyecto === id && !esRepetida(t));
  return { hechas: delProyecto.filter((t) => t.hecha).length, total: delProyecto.length };
}

// Al borrar un proyecto, sus tareas e ideas se quedan, pero ya sin proyecto.
export function soltarProyecto<T extends { proyecto?: string }>(xs: T[], id: string): T[] {
  return xs.map((x) => {
    if (x.proyecto !== id) return x;
    const { proyecto: _, ...resto } = x;
    return resto as T;
  });
}
