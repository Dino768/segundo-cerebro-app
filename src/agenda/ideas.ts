import { nuevoIdIdea, type Idea, type IdeaSinId } from '../datos/ideas';
import { idProyectoDesdeTitulo, type Proyecto } from '../datos/proyectos';
import type { ISODate } from '../fechas';
import { mezclarCambios } from './cambios';

export class ErrorIdeaCambiada extends Error {
  constructor() {
    super('Esta idea ha cambiado mientras tanto (quizá la movió Claude). Se han recargado las ideas.');
    this.name = 'ErrorIdeaCambiada';
  }
}

function limpiar(i: IdeaSinId): IdeaSinId {
  const texto = i.texto.replace(/\r\n/g, '\n').trim();
  const titulo = i.titulo?.trim() || undefined;
  const r: Record<string, unknown> = { ...i, texto, titulo };
  for (const k of Object.keys(r)) if (r[k] === undefined || r[k] === '') delete r[k];
  return r as unknown as IdeaSinId;
}

export function anadirIdea(ideas: Idea[], nueva: IdeaSinId): Idea[] {
  const limpia = limpiar(nueva);
  if (!limpia.texto) return ideas;
  return [...ideas, { id: nuevoIdIdea(limpia.fecha, ideas), ...limpia }];
}

export function editarIdea(ideas: Idea[], original: Idea, editada: IdeaSinId): Idea[] {
  const remota = ideas.find((i) => i.id === original.id);
  if (!remota) throw new ErrorIdeaCambiada();
  const limpia = limpiar(editada);
  if (!limpia.texto) return ideas;
  const despues = { titulo: undefined, icono: undefined, area: undefined, proyecto: undefined, ...limpia };
  return ideas.map((i) => (i === remota ? mezclarCambios(remota, original, despues) : i));
}

export function quitarIdea(ideas: Idea[], id: string): Idea[] {
  return ideas.filter((i) => i.id !== id);
}

export function tituloDeIdea(idea: Idea): string {
  return idea.titulo ?? idea.texto.split('\n')[0];
}

export function tareaDesdeIdea(idea: Idea): { titulo: string; notas?: string; proyecto?: string; area?: string; icono?: string } {
  const titulo = tituloDeIdea(idea).slice(0, 120);
  const r: Record<string, string | undefined> = {
    titulo,
    notas: idea.texto !== titulo ? idea.texto : undefined,
    proyecto: idea.proyecto,
    area: idea.area,
    icono: idea.icono,
  };
  for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
  return r as { titulo: string };
}

export function proyectoDesdeIdea(
  idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate,
): Proyecto {
  const titulo = nombre.trim();
  return {
    id: idProyectoDesdeTitulo(titulo, existentes),
    estado: 'idea',
    area,
    icono: idea.icono,
    titulo,
    cuerpo: `# ${titulo}\n\n## Qué es\n${idea.texto}\n\n## Dónde lo dejamos\n${hoy}: creado desde las ideas.\n`,
    meta: {},
  };
}
