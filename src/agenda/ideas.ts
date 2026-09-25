import { CABECERA_BANDEJA, parseBandeja, type Idea, type Linea } from '../datos/bandeja';
import { idProyectoDesdeTitulo, type Proyecto } from '../datos/proyectos';
import type { ISODate } from '../fechas';

export class ErrorIdeaCambiada extends Error {
  constructor() {
    super('Esta idea ha cambiado mientras tanto (quizá la movió Claude). Se han recargado las ideas.');
    this.name = 'ErrorIdeaCambiada';
  }
}

// Las ideas no tienen id: una idea es su fecha, su proyecto y su texto.
export function mismaIdea(a: Idea, b: Idea): boolean {
  return a.fecha === b.fecha && (a.proyecto ?? '') === (b.proyecto ?? '') && a.texto === b.texto;
}

function posicion(lineas: Linea[], idea: Idea): number {
  const i = lineas.findIndex((l) => l.tipo === 'idea' && mismaIdea(l.idea, idea));
  if (i === -1) throw new ErrorIdeaCambiada();
  return i;
}

function crearIdea(fecha: string, texto: string, proyecto: string | undefined): Idea {
  return proyecto ? { fecha, proyecto, texto } : { fecha, texto };
}

export function anadirIdea(lineas: Linea[], idea: Idea): Linea[] {
  // Una idea es una sola línea del archivo: los saltos de línea pegados se vuelven espacios.
  const texto = idea.texto.replace(/\s+/g, ' ').trim();
  if (!texto) return lineas;
  const base = lineas.length ? lineas : parseBandeja(CABECERA_BANDEJA);
  return [...base, { tipo: 'idea', idea: crearIdea(idea.fecha, texto, idea.proyecto) }];
}

export function vincularIdea(lineas: Linea[], idea: Idea, proyecto: string | undefined): Linea[] {
  const i = posicion(lineas, idea);
  return lineas.map((l, j) => (j === i ? { tipo: 'idea', idea: crearIdea(idea.fecha, idea.texto, proyecto) } : l));
}

export function quitarIdea(lineas: Linea[], idea: Idea): Linea[] {
  const i = posicion(lineas, idea);
  return lineas.filter((_, j) => j !== i);
}

export function proyectoDesdeIdea(
  idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate,
): Proyecto {
  const titulo = nombre.trim();
  return {
    id: idProyectoDesdeTitulo(titulo, existentes),
    estado: 'idea',
    area,
    titulo,
    cuerpo: `# ${titulo}\n\n## Qué es\n${idea.texto}\n\n## Dónde lo dejamos\n${hoy}: creado desde la bandeja de ideas.\n`,
    meta: {},
  };
}
