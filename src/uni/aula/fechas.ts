// Fechas que Claude encuentra en los avisos, la guía y los documentos (spec §5).
import type { Asignatura } from '../../datos/asignaturas.ts';
import type { TipoTarea } from '../../datos/tareas.ts';
import { diaDeSemana, isHora, isISODate, type ISODate } from '../../fechas.ts';
import { ErrorFormato, type Propuesta } from '../tipos.ts';

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
  if (!('fechas' in d)) throw new ErrorFormato('falta la lista «fechas»');
  const fechas = d.fechas;
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
const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const DIA_CLAVE: Record<string, string> = { lunes: 'lun', martes: 'mar', miercoles: 'mie', jueves: 'jue', viernes: 'vie', sabado: 'sab', domingo: 'dom' };

// Comprueba que el día y el mes de la fecha están de verdad en la cita (ya normalizada).
// Antes se quitan horas, rangos de horas y aulas, para que «10:00» o «aula 10» no valgan como día.
const MES = '(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)';
const SEMANA = '(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)';

// La cita sin horas, rangos de horas ni aulas, y las fechas numéricas que trae (día, mes).
function limpiarCita(cita: string): { limpia: string; pares: [number, number][] } {
  const pares: [number, number][] = [];
  let limpia = cita.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, _a, mm, dd) => {
    pares.push([Number(dd), Number(mm)]);
    return ' ';
  });
  for (const re of [new RegExp(`de \\d{1,2} a \\d{1,2}(?![0-9])(?!\\s*\\/)(?! de ${MES}\\b)`, 'g'), /\d{1,2} horas?\b/g, /\d{1,2}\s*-\s*\d{1,2}\s*h\b/g, /\d{1,2}[:.]\d{2}/g, /a las \d{1,2}/g, /\d{1,2}\s*h\b/g, /aula \d+/g]) limpia = limpia.replace(re, ' ');
  for (const x of limpia.matchAll(/(\d{1,2})[/-](\d{1,2})/g)) pares.push([Number(x[1]), Number(x[2])]);
  return { limpia, pares };
}

// Fechas distintas (día y mes) que se leen en la cita: «13 de noviembre», «13/11», «2026-11-13».
function fechasDeCita(cita: string): Set<string> {
  const { limpia, pares } = limpiarCita(cita);
  const r = new Set<string>();
  for (const [d, m] of pares) if (d >= 1 && d <= 31 && m >= 1 && m <= 12) r.add(`${d}-${m}`);
  for (const x of limpia.matchAll(new RegExp(`(?<![0-9])(\\d{1,2})\\s+(?:de\\s+)?(${MES})\\b`, 'g'))) r.add(`${Number(x[1])}-${MESES[x[2]]}`);
  return r;
}

// El número del día tiene que ir pegado a una fecha: «13 de noviembre», «13 noviembre», «13/11», «jueves 13».
// Así «dura 13 minutos» o «semana 13» no valen como el día 13.
function diaPegado(limpia: string, d: number): boolean {
  const n = `0?${d}`;
  return new RegExp(`(?:^|[^0-9])${n}(?:\\s*de\\s+${MES}\\b|\\s+${MES}\\b|\\s*[/-]\\s*\\d{1,2}(?![0-9]))`).test(limpia)
    || new RegExp(`\\b${SEMANA}[\\s,]+(?:el\\s+)?(?:dia\\s+)?${n}(?![0-9])`).test(limpia);
}

function fechaEnCita(cita: string, fecha: ISODate): boolean {
  const [, m, d] = fecha.split('-').map(Number);
  const { limpia, pares } = limpiarCita(cita);
  const diaOk = pares.some(([dd, mm]) => dd === d && mm === m) || diaPegado(limpia, d);
  if (!diaOk) return false;
  const meses = [...limpia.matchAll(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g)].map((x) => MESES[x[1]]);
  if (meses.length && !meses.includes(m)) return false;
  if (pares.length && !pares.some(([dd, mm]) => dd === d && mm === m)) return false;
  return true;
}

function horaEnCita(cita: string, hora: string): boolean {
  const [h, mm] = hora.split(':');
  const H = String(Number(h));
  if (new RegExp('(^|[^0-9])0?' + H + '[:.]' + mm + '(?![0-9])').test(cita)) return true;
  if (mm !== '00') return false;
  // Solo cuenta la hora de inicio: «a las 11», «de 11 a 13h», «entre las 11 y las 13».
  return new RegExp('a las 0?' + H + '(?![0-9]|[:.][0-9])').test(cita)
    || new RegExp('(^|[^0-9])de 0?' + H + ' a [0-9]{1,2}(?![0-9]|[:.][0-9])').test(cita)
    || new RegExp('entre las 0?' + H + ' y las [0-9]{1,2}(?![0-9]|[:.][0-9])').test(cita);
}

// Quita del final de «que» el nombre de la asignatura (ya se añade solo): « de X», « del X», «: X» o X a secas.
function sinAsignatura(que: string, nombre: string): string {
  const q = normal(que);
  const n = normal(nombre);
  const resto = [' de ', ' del ', ': ', ''].map((pre) => pre + n).filter((x) => x && q.endsWith(x)).sort((a, b) => b.length - a.length)[0];
  if (!resto) return que;
  const corto = que.slice(0, que.length - resto.length).trim();
  return corto || que;
}

export function problemas(f: FechaClaude, p: Pregunta): string[] {
  if (!f.exacta) return [];
  const fuente = p.fuentes.find((x) => x.id === f.fuente);
  const cita = normal(f.cita);
  if (!fuente || !cita || !normal(fuente.texto).includes(cita)) return ['la cita no está en el texto'];
  if (!isISODate(f.fecha)) return ['falta la fecha'];
  const r: string[] = [];
  if (!fechaEnCita(cita, f.fecha)) r.push('la fecha no está en la cita');
  // «El parcial del 13 de noviembre se cambia al 20»: la cita valdría para las dos fechas.
  if (fechasDeCita(cita).size > 1) r.push('la cita tiene varias fechas');
  const D = Number(f.fecha.slice(8, 10));
  const real = diaDeSemana(f.fecha);
  const pares = [...cita.matchAll(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)[\s,]+(?:el\s+)?(?:dia\s+)?(\d{1,2})\b/g)]
    .map((x) => ({ dia: DIA_CLAVE[x[1]], n: Number(x[2]) }));
  const mismoNumero = pares.filter((x) => x.n === D);
  for (const x of mismoNumero.length ? mismoNumero : pares.slice(0, 1)) {
    if (x.dia !== real) {
      r.push(`el ${f.fecha} no es ${NOMBRE_DIA[x.dia]}`);
      break;
    }
  }
  const curso = cursoAcademico(p.hoy);
  if (f.fecha < p.hoy) r.push('la fecha ya ha pasado');
  else if (f.fecha > curso.fin || f.fecha < curso.inicio) r.push('la fecha está fuera del curso');
  if (f.hora !== null) {
    if (!isHora(f.hora)) r.push('la hora no es válida');
    else if (!horaEnCita(cita, f.hora)) r.push('la hora no está en la cita');
  }
  return r;
}

export function necesitaMas(r: RespuestaClaude, p: Pregunta): boolean {
  const porClave = new Map<string, Set<string>>();
  for (const f of r.fechas) {
    if (f.duda || problemas(f, p).length) return true;
    if (!f.exacta) continue;
    porClave.set(f.clave, (porClave.get(f.clave) ?? new Set()).add(`${f.fecha} ${f.hora ?? ''}`));
    // Cambiar una fecha que ya está en la agenda lo tiene que leer un modelo más fuerte (spec §5).
    const conocida = p.conocidas.find((c) => c.origen === `aula:${p.asignatura.id}:${f.clave}`);
    if (conocida && (conocida.fecha !== f.fecha || (conocida.hora && f.hora && conocida.hora !== f.hora))) return true;
  }
  return [...porClave.values()].some((s) => s.size > 1);
}

export interface AvisoNuevo { titulo: string; texto: string }
export interface Decision { propuestas: Propuesta[]; avisos: AvisoNuevo[] }

function nota(f: FechaClaude, p: Pregunta): string {
  const fuente = p.fuentes.find((x) => x.id === f.fuente);
  const donde = fuente ? ` (${[fuente.titulo, fuente.enlace].filter(Boolean).join(', ')})` : '';
  return `«${f.cita}»${problemas(f, p).length ? " (no comprobada)" : ""}${donde}`;
}

// Decide qué fechas llegan a la agenda. Solo cuentan las que pasan todas las comprobaciones;
// ante la duda se pone la más temprana, con ⚠ y un aviso, para que no pille a Diego por sorpresa.
export function decidir(r: RespuestaClaude, p: Pregunta): Decision {
  const propuestas: Propuesta[] = [];
  const avisos: AvisoNuevo[] = [];
  const grupos = new Map<string, FechaClaude[]>();
  for (const f of r.fechas) if (f.exacta) grupos.set(f.clave, [...(grupos.get(f.clave) ?? []), f]);
  for (const [clave, fs] of grupos) {
    const que = sinAsignatura(fs[0].que, p.asignatura.nombre);
    const validas = fs.filter((f) => problemas(f, p).length === 0 && f.fecha);
    const distintas = new Set(fs.map((f) => `${f.fecha} ${f.hora ?? ""}`));
    const dudosa = fs.some((f) => f.duda || problemas(f, p).length) || distintas.size > 1;
    const notas = [...new Set(fs.map((f) => nota(f, p)))].join('\n');
    if (validas.length === 0) {
      avisos.push({ titulo: `Fecha sin confirmar: ${que} de ${p.asignatura.nombre}`, texto: `No he podido comprobar la fecha. Lo que dice el profe:\n${notas}` });
      continue;
    }
    const elegida = [...validas].sort((a, b) => (a.fecha! !== b.fecha! ? (a.fecha! < b.fecha! ? -1 : 1) : a.hora === b.hora ? 0 : a.hora === null ? 1 : b.hora === null ? -1 : a.hora < b.hora ? -1 : 1))[0];
    // Un examen oficial (parte A) el mismo día ya está en la agenda.
    const oficial = p.conocidas.some((c) => c.origen.startsWith('urjc-examen:') && c.fecha === elegida.fecha && elegida.tipo === 'examen');
    if (oficial) {
      // No se repite, pero si había dudas se avisa igual (el profe puede estar dando otro día).
      if (dudosa)
        avisos.push({
          titulo: `Fecha por confirmar: ${que} de ${p.asignatura.nombre}`,
          texto: `La fecha más temprana (${elegida.fecha}) coincide con el examen oficial, que ya está en tu agenda. Compruébala:\n${notas}`,
        });
      continue;
    }
    const titulo = dudosa ? `⚠ ${que}: ${p.asignatura.nombre} (por confirmar)` : `${que}: ${p.asignatura.nombre}`;
    propuestas.push({
      origen: `aula:${p.asignatura.id}:${clave}`, titulo, tipo: elegida.tipo, area: p.asignatura.id, fecha: elegida.fecha!,
      ...(elegida.hora && isHora(elegida.hora) ? { hora: elegida.hora } : {}),
      notas, notasDeLaFuente: true, tituloDeLaFuente: true,
    });
    if (dudosa)
      avisos.push({
        titulo: `Fecha por confirmar: ${que} de ${p.asignatura.nombre}`,
        texto: `He puesto la fecha más temprana (${elegida.fecha}) para que no te pille por sorpresa. Compruébala:\n${notas}`,
      });
  }
  return { propuestas, avisos };
}
