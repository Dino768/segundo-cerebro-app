import type { Prioridad, Tarea } from '../datos/tareas';
import { fromISO, type ISODate } from '../fechas';
import { tipoDe } from './tipos';

// Días antes de la fecha en que un examen o una entrega llega a las listas principales (prioridad media)
// y en que pasa a prioridad alta (spec §3).
const PLAZOS = {
  examen: { aparece: 21, alta: 7 },
  entrega: { aparece: 14, alta: 3 },
} as const;

// Días naturales de `hoy` a `fecha` (redondeado: los días con cambio de hora duran 23 o 25 horas).
export function faltan(fecha: ISODate, hoy: ISODate): number {
  return Math.round((fromISO(fecha).getTime() - fromISO(hoy).getTime()) / 86_400_000);
}

function plazoDe(t: Tarea) {
  const tipo = tipoDe(t);
  return (tipo === 'examen' || tipo === 'entrega') && t.fecha ? PLAZOS[tipo] : undefined;
}

export function enPlazo(t: Tarea, hoy: ISODate): boolean {
  const p = plazoDe(t);
  if (!p) return false;
  const f = faltan(t.fecha!, hoy);
  return f >= 0 && f <= p.aparece;
}

// La prioridad escrita manda; si no hay, exámenes y entregas la calculan según lo cerca que estén.
export function prioridadEfectiva(t: Tarea, hoy: ISODate): Prioridad {
  if (t.prioridad) return t.prioridad;
  const p = plazoDe(t);
  if (!p) return 'media';
  const f = faltan(t.fecha!, hoy);
  if (f < 0 && tipoDe(t) === 'examen') return 'baja'; // un examen pasado ya no se puede hacer
  if (f <= p.alta) return 'alta';
  return f <= p.aparece ? 'media' : 'baja';
}

export function textoFaltan(n: number): string {
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `faltan ${n} días`;
}
