import type { Estado, Proyecto } from '../datos/proyectos';
import { compararPrioridad } from './tareas';

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
