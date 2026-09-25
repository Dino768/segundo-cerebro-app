import { stringify } from 'yaml';
import { isISODate, type ISODate } from '../fechas';
import type { Linea } from './bandeja';
import { RUTA_IDEAS } from './rutas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export interface Idea {
  id: string;
  fecha: ISODate;
  titulo?: string;
  icono?: string;
  area?: string;
  proyecto?: string;
  texto: string;
}

export type IdeaSinId = Omit<Idea, 'id'>;

const OPCIONALES = ['titulo', 'icono', 'area', 'proyecto'] as const;

function problema(i: Record<string, unknown>): string | null {
  if (typeof i.id !== 'string' || !i.id.trim()) return 'el campo id es obligatorio y debe ser texto';
  if (!isISODate(i.fecha)) return 'fecha debe tener el formato AAAA-MM-DD';
  if (typeof i.texto !== 'string' || !i.texto.trim()) return 'el campo texto es obligatorio';
  for (const k of OPCIONALES) if (i[k] !== undefined && typeof i[k] !== 'string') return `${k} debe ser texto`;
  return null;
}

export function parseIdeas(texto: string): Idea[] {
  const datos = leerYaml(texto, RUTA_IDEAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_IDEAS, 'ideas.yaml debe ser una lista de ideas');
  const vistos = new Set<string>();
  return datos.map((bruto, n) => {
    const i = quitarNulos((typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>);
    const etiqueta = `idea ${n + 1}${typeof i.id === 'string' ? ` (${i.id})` : ''}`;
    const p = problema(i);
    if (p) throw new ErrorDatos(RUTA_IDEAS, `${etiqueta}: ${p}`);
    if (vistos.has(i.id as string)) throw new ErrorDatos(RUTA_IDEAS, `${etiqueta}: el id está repetido`);
    vistos.add(i.id as string);
    return i as unknown as Idea;
  });
}

// Orden fijo de los campos, para que el archivo se lea igual siempre.
export function serializarIdeas(ideas: Idea[]): string {
  if (ideas.length === 0) return '';
  const ordenadas = ideas.map((i) => ({
    id: i.id, fecha: i.fecha, titulo: i.titulo, icono: i.icono, area: i.area, proyecto: i.proyecto, texto: i.texto,
  }));
  return stringify(ordenadas, { lineWidth: 0 });
}

export function nuevoIdIdea(fecha: ISODate, existentes: Idea[]): string {
  const prefijo = `i-${fecha.replace(/-/g, '')}-`;
  let max = 0;
  for (const i of existentes) {
    if (!i.id.startsWith(prefijo)) continue;
    const n = Number(i.id.slice(prefijo.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefijo}${max + 1}`;
}

export function ordenarIdeas(ideas: Idea[]): Idea[] {
  return ideas
    .map((idea, i) => ({ idea, i }))
    .sort((a, b) => b.idea.fecha.localeCompare(a.idea.fecha) || b.i - a.i)
    .map((x) => x.idea);
}

const clave = (fecha: string, texto: string, proyecto: string | undefined) => `${fecha}|${proyecto ?? ''}|${texto}`;

// Paso de bandeja.md a ideas.yaml: añade al final las ideas de la bandeja que aún no estén (misma fecha, proyecto y texto).
export function fusionarBandeja(ideas: Idea[], bandeja: Linea[]): Idea[] {
  const resultado = [...ideas];
  const vistas = new Set(ideas.map((i) => clave(i.fecha, i.texto, i.proyecto)));
  for (const l of bandeja) {
    if (l.tipo !== 'idea') continue;
    const { fecha, texto, proyecto } = l.idea;
    const k = clave(fecha, texto, proyecto);
    if (vistas.has(k)) continue;
    vistas.add(k);
    resultado.push({ id: nuevoIdIdea(fecha, resultado), fecha, ...(proyecto ? { proyecto } : {}), texto });
  }
  return resultado;
}
