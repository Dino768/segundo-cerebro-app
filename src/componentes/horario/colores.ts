import type { Asignatura } from '../../datos/asignaturas';

// Una clase puede traer una asignatura que ya no está en asignaturas.yaml: se enseña con su id y en gris.
export function datosAsignatura(asignaturas: Asignatura[], id: string): { nombre: string; color: string } {
  const a = asignaturas.find((x) => x.id === id);
  return a ? { nombre: a.nombre, color: a.color } : { nombre: id, color: '#9ca3af' };
}

export const fondoSuave = (color: string) => `color-mix(in srgb, ${color} 25%, var(--superficie))`;
