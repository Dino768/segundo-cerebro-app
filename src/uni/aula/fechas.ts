// Fechas que Claude encuentra en los avisos, la guía y los documentos (spec §5).
import type { Asignatura } from '../../datos/asignaturas.ts';
import type { TipoTarea } from '../../datos/tareas.ts';
import { diaDeSemana, isHora, isISODate, type ISODate } from '../../fechas.ts';
import { ErrorFormato } from '../tipos.ts';

export type Modelo = 'haiku' | 'sonnet' | 'opus';
export const MODELOS: Modelo[] = ['haiku', 'sonnet', 'opus'];

export interface FuenteTexto { id: string; tipo: 'aviso' | 'guia' | 'documento'; titulo: string; fecha?: ISODate; enlace?: string; texto: string }
export interface FechaConocida { origen: string; titulo: string; tipo?: TipoTarea; fecha: ISODate; hora?: string }
export interface Pregunta { asignatura: Asignatura; hoy: ISODate; conocidas: FechaConocida[]; fuentes: FuenteTexto[]; conGuia: boolean }
export interface FechaClaude {
  clave: string; que: string; tipo: 'examen' | 'entrega' | 'evento'; fecha: ISODate | null; hora: string | null;
  exacta: boolean; cita: string; fuente: string; duda: string | null;
}
export interface RespuestaClaude { fechas: FechaClaude[]; avisos: { id: string; importante: boolean }[]; evaluacion: string | null }

const NOMBRE_DIA: Record<string, string> = { lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado', dom: 'domingo' };

export function cursoAcademico(hoy: ISODate): { inicio: ISODate; fin: ISODate } {
  const [y, m] = hoy.split('-').map(Number);
  const empieza = m >= 8 ? y : y - 1; // en agosto ya se mira el curso que viene
  return { inicio: `${empieza}-09-01`, fin: `${empieza + 1}-07-31` };
}

export function textoPregunta(p: Pregunta): string {
  const curso = cursoAcademico(p.hoy);
  const conocidas = p.conocidas.length
    ? p.conocidas.map((c) => `- ${c.fecha}${c.hora ? ` ${c.hora}` : ''} · ${c.tipo ?? 'tarea'} · ${c.titulo} [${c.origen}]`).join('\n')
    : '- (ninguna)';
  const fuentes = p.fuentes.map((f) => {
    const cabecera = `### ${f.id} (${f.tipo}${f.fecha ? `, publicado el ${f.fecha}` : ''}): ${f.titulo}`;
    return `${cabecera}\n${f.texto}`;
  }).join('\n\n');
  return [
    `Asignatura: ${p.asignatura.nombre}`,
    `Hoy: ${p.hoy} (${NOMBRE_DIA[diaDeSemana(p.hoy)]})`,
    `Curso: ${curso.inicio} a ${curso.fin}`,
    // Sin guía no se pide resumen (y la pregunta no menciona el campo entre comillas).
    p.conGuia ? 'Entre los textos está la guía docente: escribe también "evaluacion".' : 'No hay guía docente nueva: la evaluación va a null.',
    '',
    '## Fechas que Diego ya tiene de esta asignatura',
    conocidas,
    '',
    '## Textos nuevos',
    fuentes,
  ].join('\n');
}

// Claude a veces añade texto o ```json alrededor: se toma desde la primera { hasta la última }.
export function leerRespuesta(texto: string): RespuestaClaude {
  const i = texto.indexOf('{');
  const j = texto.lastIndexOf('}');
  if (i < 0 || j < i) throw new ErrorFormato('Claude no ha devuelto JSON');
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(texto.slice(i, j + 1));
  } catch {
    throw new ErrorFormato('Claude ha devuelto un JSON roto');
  }
  const fechas = d.fechas ?? [];
  const avisos = d.avisos ?? [];
  if (!Array.isArray(fechas)) throw new ErrorFormato('fechas debe ser una lista');
  if (!Array.isArray(avisos)) throw new ErrorFormato('avisos debe ser una lista');
  return {
    fechas: fechas.map((x: Record<string, unknown>, n: number) => {
      const donde = `fecha ${n + 1}`;
      if (typeof x?.clave !== 'string' || !/^[a-z0-9-]{1,60}$/.test(x.clave)) throw new ErrorFormato(`${donde}: clave no válida`);
      if (typeof x.que !== 'string' || !x.que.trim()) throw new ErrorFormato(`${donde}: falta «que»`);
      if (x.tipo !== 'examen' && x.tipo !== 'entrega' && x.tipo !== 'evento') throw new ErrorFormato(`${donde}: tipo no válido`);
      if (typeof x.cita !== 'string' || typeof x.fuente !== 'string') throw new ErrorFormato(`${donde}: faltan cita o fuente`);
      return {
        clave: x.clave, que: x.que.trim(), tipo: x.tipo,
        fecha: typeof x.fecha === 'string' ? x.fecha : null,
        hora: typeof x.hora === 'string' ? x.hora : null,
        exacta: x.exacta === true, cita: x.cita, fuente: x.fuente,
        duda: typeof x.duda === 'string' && x.duda.trim() ? x.duda.trim() : null,
      };
    }),
    avisos: avisos.map((a: Record<string, unknown>) => ({ id: String(a?.id ?? ''), importante: a?.importante === true })),
    evaluacion: typeof d.evaluacion === 'string' && d.evaluacion.trim() ? d.evaluacion.trim() : null,
  };
}

const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const DIAS_TEXTO: [RegExp, string][] = [
  [/\blunes\s+(?:dia\s+)?\d/, 'lun'], [/\bmartes\s+(?:dia\s+)?\d/, 'mar'], [/\bmiercoles\s+(?:dia\s+)?\d/, 'mie'],
  [/\bjueves\s+(?:dia\s+)?\d/, 'jue'], [/\bviernes\s+(?:dia\s+)?\d/, 'vie'], [/\bsabado\s+(?:dia\s+)?\d/, 'sab'], [/\bdomingo\s+(?:dia\s+)?\d/, 'dom'],
];

export function problemas(f: FechaClaude, p: Pregunta): string[] {
  if (!f.exacta) return [];
  const r: string[] = [];
  const fuente = p.fuentes.find((x) => x.id === f.fuente);
  const cita = normal(f.cita);
  if (!fuente || !cita || !normal(fuente.texto).includes(cita)) r.push('la cita no está en el texto');
  if (!isISODate(f.fecha)) {
    r.push('falta la fecha');
    return r;
  }
  const dia = DIAS_TEXTO.find(([re]) => re.test(cita))?.[1];
  if (dia && diaDeSemana(f.fecha) !== dia) r.push(`el ${f.fecha} no es ${NOMBRE_DIA[dia]}`);
  const curso = cursoAcademico(p.hoy);
  if (f.fecha < p.hoy) r.push('la fecha ya ha pasado');
  else if (f.fecha > curso.fin) r.push('la fecha está fuera del curso');
  if (f.hora !== null && !isHora(f.hora)) r.push('la hora no es válida');
  return r;
}

export function necesitaMas(r: RespuestaClaude, p: Pregunta): boolean {
  const porClave = new Map<string, Set<string | null>>();
  for (const f of r.fechas) {
    if (f.duda || problemas(f, p).length) return true;
    if (f.exacta) porClave.set(f.clave, (porClave.get(f.clave) ?? new Set()).add(f.fecha));
  }
  return [...porClave.values()].some((s) => s.size > 1);
}
