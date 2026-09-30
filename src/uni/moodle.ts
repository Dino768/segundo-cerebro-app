import type { Asignatura } from '../datos/asignaturas.ts';
import type { ISODate } from '../fechas.ts';
import { decodificarEntidades } from './examenes.ts';
import { enMadrid, plazoEnMadrid } from './hora.ts';
import type { EventoIcs } from './ics.ts';
import type { Propuesta } from './tipos.ts';

export function propuestasDeMoodle(eventos: EventoIcs[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[] {
  const r: Propuesta[] = [];
  for (const e of eventos) {
    const asignatura = asignaturaDelEvento(e.categorias, asignaturas);
    const titulo = textoPlano(e.titulo).replace(/\s+/g, ' ');
    // «X se abre» es cuando empieza un cuestionario: no hay nada que hacer.
    if (!asignatura || !titulo || / se abre$/i.test(titulo)) continue;
    const cuando = e.soloDia ? { fecha: enMadrid(e.inicio).fecha } : plazoEnMadrid(e.inicio);
    if (cuando.fecha < hoy) continue;
    const entrega = /^(.*\S)\s+(se cierra|vence)$/i.exec(titulo);
    const notas = textoPlano(e.descripcion);
    r.push({
      origen: `moodle:${e.uid}`,
      titulo: entrega ? entrega[1] : titulo,
      tipo: entrega ? 'entrega' : 'tarea',
      area: asignatura.id,
      ...cuando,
      ...(notas ? { notas } : {}),
      notasDeLaFuente: false,
    });
  }
  return r;
}

// El curso va en CATEGORIES como «2026-27_2327004_159508_186565»: se busca un trozo que sea el código de una asignatura.
function asignaturaDelEvento(categorias: string[], asignaturas: Map<string, Asignatura>): Asignatura | undefined {
  for (const c of categorias)
    for (const trozo of c.split(/\D+/)) {
      const a = asignaturas.get(trozo);
      if (a) return a;
    }
  return undefined;
}

export function textoPlano(s: string): string {
  return decodificarEntidades(
    s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
