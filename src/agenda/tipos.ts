import type { TipoTarea } from '../datos/tareas.ts';

export const ICONO_TIPO: Record<TipoTarea, string> = {
  tarea: 'checkbox', entrega: 'file-upload', examen: 'school', recado: 'shopping-cart', evento: 'calendar-event',
};
export const NOMBRE_TIPO: Record<TipoTarea, string> = {
  tarea: 'Tarea', entrega: 'Entrega', examen: 'Examen', recado: 'Recado', evento: 'Evento',
};
export const PLURAL_TIPO: Record<TipoTarea, string> = {
  tarea: 'Tareas', entrega: 'Entregas', examen: 'Exámenes', recado: 'Recados', evento: 'Eventos',
};

// Qué campos del formulario tiene cada tipo (spec §4).
export const CAMPOS_TIPO: Record<TipoTarea, { prioridad: boolean; hora: boolean; repetir: boolean; proyecto: boolean; notas: boolean }> = {
  tarea: { prioridad: true, hora: true, repetir: true, proyecto: true, notas: true },
  entrega: { prioridad: true, hora: true, repetir: false, proyecto: true, notas: true },
  examen: { prioridad: true, hora: true, repetir: false, proyecto: true, notas: true },
  recado: { prioridad: false, hora: false, repetir: false, proyecto: false, notas: false },
  evento: { prioridad: false, hora: true, repetir: true, proyecto: false, notas: false },
};

export function tipoDe(t: { tipo?: TipoTarea }): TipoTarea {
  return t.tipo ?? 'tarea';
}
