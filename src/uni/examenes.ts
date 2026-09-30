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

interface Fila {
  origen: string;
  titulo: string;
  area: string;
  fecha: ISODate;
  franja: string;
  aulas: string[];
}

export function propuestasDeExamenes(examenes: ExamenUrjc[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[] {
  // Filas con el mismo origen: se juntan en una propuesta por fecha y franja (sumando las aulas).
  const grupos = new Map<string, Fila[]>();
  for (const e of examenes) {
    const codigo = texto(e.COD_ASIGNATURA);
    const asignatura = asignaturas.get(codigo);
    const fecha = fechaUrjc(texto(e.FECHA));
    if (!asignatura || !fecha || fecha < hoy) continue;
    const convocatoria = texto(e.CONVOCATORIA);
    const fila: Fila = {
      origen: `urjc-examen:${texto(e.CURSO_ACADEMICO)}:${codigo}:${convocatoria}:${texto(e.GRUPO)}`,
      titulo: `${asignatura.nombre} (${CONVOCATORIAS[convocatoria] ?? `convocatoria ${convocatoria}`})`,
      area: asignatura.id,
      fecha,
      franja: texto(e.HORA).replace(/\s+/g, ' '),
      aulas: texto(e.AULAS).split(/<br\s*\/?>/i).map((a) => decodificarEntidades(a).trim()).filter(Boolean),
    };
    const grupo = grupos.get(fila.origen) ?? [];
    const igual = grupo.find((f) => f.fecha === fila.fecha && f.franja === fila.franja);
    if (igual) igual.aulas.push(...fila.aulas.filter((a) => !igual.aulas.includes(a)));
    else grupo.push({ ...fila, aulas: [...new Set(fila.aulas)] });
    grupos.set(fila.origen, grupo);
  }
  const r: Propuesta[] = [];
  for (const grupo of grupos.values()) {
    // Si el mismo examen sale en varias fechas, la primera conserva el origen y las demás lo llevan con su fecha.
    grupo.sort((a, b) => (a.fecha + a.franja).localeCompare(b.fecha + b.franja));
    const usados = new Set<string>();
    for (const [i, f] of grupo.entries()) {
      let origen = i === 0 ? f.origen : `${f.origen}:${f.fecha}`;
      if (usados.has(origen)) origen = `${origen}:${f.franja}`;
      usados.add(origen);
      r.push(propuesta(f, origen));
    }
  }
  return r;
}

function propuesta(f: Fila, origen: string): Propuesta {
  const inicio = /^\d{2}:\d{2}/.exec(f.franja)?.[0];
  const notas = [f.franja, ...f.aulas].filter(Boolean).join(' · ');
  return {
    origen,
    titulo: f.titulo,
    area: f.area,
    tipo: 'examen',
    fecha: f.fecha,
    ...(inicio && isHora(inicio) ? { hora: inicio } : {}),
    ...(notas ? { notas } : {}),
    notasDeLaFuente: true,
  };
}

export function decodificarEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (e, n: string) => caracter(Number(n), e))
    .replace(/&#x([0-9a-f]+);/gi, (e, n: string) => caracter(parseInt(n, 16), e))
    .replace(/&amp;/g, '&');
}

// Un número de carácter imposible se deja tal cual en vez de tumbar la sincronización.
function caracter(n: number, original: string): string {
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : original;
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
