import { stringify } from 'yaml';
import { DIAS, isHora, isISODate, type Dia, type ISODate } from '../fechas';
import { RUTA_TAREAS } from './rutas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export type Prioridad = 'alta' | 'media' | 'baja';
export const PRIORIDADES: Prioridad[] = ['alta', 'media', 'baja'];

export interface Tarea {
  id: string;
  titulo: string;
  area: string;
  prioridad?: Prioridad;
  fecha?: ISODate;
  hora?: string;
  repetir?: Dia[];
  proyecto?: string;
  notas?: string;
  hecha?: boolean;
  hechas?: ISODate[];
}

function textoNoVacio(x: unknown): boolean {
  return typeof x === 'string' && x.trim() !== '';
}

function problema(t: Record<string, unknown>): string | null {
  if (!textoNoVacio(t.id)) return 'el campo id es obligatorio y debe ser texto';
  if (!textoNoVacio(t.titulo)) return 'el campo titulo es obligatorio';
  if (!textoNoVacio(t.area)) return 'el campo area es obligatorio';
  if (t.prioridad !== undefined && !PRIORIDADES.includes(t.prioridad as Prioridad))
    return 'prioridad debe ser alta, media o baja';
  if (t.fecha !== undefined && !isISODate(t.fecha)) return 'fecha debe tener el formato AAAA-MM-DD';
  if (t.hora !== undefined && !isHora(t.hora)) return 'hora debe tener el formato "HH:MM"';
  if (t.repetir !== undefined && (!Array.isArray(t.repetir) || !t.repetir.every((d) => (DIAS as readonly unknown[]).includes(d))))
    return 'repetir debe ser una lista de días (lun, mar, mie, jue, vie, sab, dom)';
  if (t.hechas !== undefined && (!Array.isArray(t.hechas) || !t.hechas.every(isISODate)))
    return 'hechas debe ser una lista de fechas AAAA-MM-DD';
  if (t.hecha !== undefined && typeof t.hecha !== 'boolean') return 'hecha debe ser true o false';
  if (t.proyecto !== undefined && typeof t.proyecto !== 'string') return 'proyecto debe ser texto';
  if (t.notas !== undefined && typeof t.notas !== 'string') return 'notas debe ser texto';
  return null;
}

export function parseTareas(texto: string): Tarea[] {
  const datos = leerYaml(texto, RUTA_TAREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_TAREAS, 'tareas.yaml debe ser una lista de tareas');
  const ids = new Set<string>();
  return datos.map((bruto, i) => {
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto))
      throw new ErrorDatos(RUTA_TAREAS, `tarea ${i + 1}: no es una tarea válida`);
    const t = quitarNulos(bruto as Record<string, unknown>);
    const etiqueta = `tarea ${i + 1}${typeof t.id === 'string' ? ` (${t.id})` : ''}`;
    const p = problema(t);
    if (p) throw new ErrorDatos(RUTA_TAREAS, `${etiqueta}: ${p}`);
    if (ids.has(t.id as string)) throw new ErrorDatos(RUTA_TAREAS, `${etiqueta}: id repetido`);
    ids.add(t.id as string);
    return t as unknown as Tarea;
  });
}

export function serializarTareas(ts: Tarea[]): string {
  return stringify(ts, { lineWidth: 0 });
}
