import type { Asignatura } from '../datos/asignaturas.ts';
import type { TipoTarea } from '../datos/tareas.ts';
import type { ISODate } from '../fechas.ts';

// Lo que una fuente (exámenes de la URJC o aula virtual) propone meter en tareas.yaml.
export interface Propuesta {
  origen: string;
  titulo: string;
  tipo: TipoTarea;
  area: string;
  fecha: ISODate;
  hora?: string;
  notas?: string;
  // true: las notas vienen de la fuente (aulas de un examen) y se actualizan si la fuente las cambia.
  notasDeLaFuente: boolean;
  // true: el título viene de la fuente (aula virtual: marca ⚠) y se actualiza si la fuente lo cambia.
  tituloDeLaFuente?: boolean;
}

// Una fuente ha devuelto algo que no tiene el formato esperado: no se escribe nada.
export class ErrorFormato extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFormato';
  }
}

// Asignaturas por su código de la URJC. Las que no tienen código no se sincronizan.
export function porCodigo(asignaturas: Asignatura[]): Map<string, Asignatura> {
  return new Map(asignaturas.filter((a) => a.codigo).map((a) => [a.codigo as string, a]));
}
