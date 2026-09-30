import type { Asignatura } from '../datos/asignaturas.ts';
import { isHora, isISODate, type ISODate } from '../fechas.ts';
import { ErrorFormato, type Propuesta } from './tipos.ts';

export type ExamenUrjc = Record<string, unknown>;

const CONVOCATORIAS: Record<string, string> = { E: 'enero', M: 'mayo', J: 'junio', S: 'septiembre' };

// La web de exámenes contesta {"CONSULTA": [ … ]}.
export function leerExamenes(json: unknown): ExamenUrjc[] {
  const lista = typeof json === 'object' && json !== null ? (json as { CONSULTA?: unknown }).CONSULTA : undefined;
  if (!Array.isArray(lista)) throw new ErrorFormato('la web de exámenes de la URJC no ha devuelto la lista CONSULTA');
  return lista.filter((x): x is ExamenUrjc => typeof x === 'object' && x !== null);
}

export function propuestasDeExamenes(examenes: ExamenUrjc[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[] {
  const r: Propuesta[] = [];
  for (const e of examenes) {
    const codigo = texto(e.COD_ASIGNATURA);
    const asignatura = asignaturas.get(codigo);
    const fecha = fechaUrjc(texto(e.FECHA));
    if (!asignatura || !fecha || fecha < hoy) continue;
    const convocatoria = texto(e.CONVOCATORIA);
    const franja = texto(e.HORA).replace(/\s+/g, ' ');
    const inicio = /^\d{2}:\d{2}/.exec(franja)?.[0];
    const aulas = texto(e.AULAS).split(/<br\s*\/?>/i).map((a) => decodificarEntidades(a).trim()).filter(Boolean);
    const notas = [franja, ...aulas].filter(Boolean).join(' · ');
    r.push({
      origen: `urjc-examen:${texto(e.CURSO_ACADEMICO)}:${codigo}:${convocatoria}:${texto(e.GRUPO)}`,
      titulo: `Examen: ${asignatura.nombre} (${CONVOCATORIAS[convocatoria] ?? `convocatoria ${convocatoria}`})`,
      area: asignatura.id,
      prioridad: 'alta',
      icono: 'school',
      fecha,
      ...(inicio && isHora(inicio) ? { hora: inicio } : {}),
      ...(notas ? { notas } : {}),
      notasDeLaFuente: true,
    });
  }
  return r;
}

export function decodificarEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

function texto(x: unknown): string {
  if (typeof x === 'string') return x.trim();
  if (typeof x === 'number') return String(x);
  return '';
}

// DD-MM-AAAA → AAAA-MM-DD (null si no es una fecha real).
function fechaUrjc(s: string): ISODate | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isISODate(iso) ? iso : null;
}
