// Horario de clases de la web pública de la URJC (servicios.urjc.es/horarios/calendario-grado).
// La página trae el horario dentro de un <script>: `const infoHorario = {...};`. Sin red: recibe el HTML.
import type { Asignatura } from '../datos/asignaturas.ts';
import type { Clase } from '../datos/horario.ts';
import { ErrorFormato } from './tipos.ts';

export interface GrupoUrjc {
  ASIGNATURA_CODIGO: string;
  GRUPO: string;
  PROFESORADO?: { NOMBRE?: string; APELLIDO1?: string | null; APELLIDO2?: string | null }[];
  CLASES: { TIMESTAMP_INICIO: string; TIMESTAMP_FIN: string; AULAS?: { AULA?: string; EDIFICIO?: string }[] }[];
}

const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const RARO = 'la web de horarios de la URJC ha devuelto un horario con un formato desconocido';

function esGrupo(g: unknown): g is GrupoUrjc {
  if (typeof g !== 'object' || g === null) return false;
  const o = g as Record<string, unknown>;
  return typeof o.ASIGNATURA_CODIGO === 'string' && typeof o.GRUPO === 'string' && Array.isArray(o.CLASES)
    && o.CLASES.every((c) => typeof c === 'object' && c !== null
      && FECHA_HORA.test(String((c as Record<string, unknown>).TIMESTAMP_INICIO))
      && FECHA_HORA.test(String((c as Record<string, unknown>).TIMESTAMP_FIN)));
}

export function leerPaginaHorario(html: string): GrupoUrjc[] {
  const m = html.match(/const infoHorario = (\{.*\});/);
  if (!m) throw new ErrorFormato('la web de horarios de la URJC no ha devuelto el horario (¿está en mantenimiento?)');
  let datos: unknown;
  try {
    datos = JSON.parse(m[1]);
  } catch {
    throw new ErrorFormato(RARO);
  }
  const grupos = (datos as { GRUPOS?: unknown }).GRUPOS;
  // Sin clases, PHP manda una lista vacía en vez de un objeto.
  if (Array.isArray(grupos) && grupos.length === 0) return [];
  if (typeof grupos !== 'object' || grupos === null || Array.isArray(grupos)) throw new ErrorFormato(RARO);
  const lista = Object.values(grupos);
  if (!lista.every(esGrupo)) throw new ErrorFormato(RARO);
  return lista;
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

// «GONZALEZ DE LA ALEJA» → «Gonzalez de la Aleja».
export function nombrePropio(s: string): string {
  return s.toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

export function clasesDeUrjc(grupos: GrupoUrjc[], asignaturas: Map<string, Asignatura>, desdoble?: string): Clase[] {
  const vistas = new Set<string>();
  const clases: Clase[] = [];
  for (const g of grupos) {
    const asignatura = asignaturas.get(g.ASIGNATURA_CODIGO);
    if (!asignatura) continue;
    const suyo = g.GRUPO.match(/\bG(\d+)\b/);
    const grupoDesdoble = suyo ? `G${suyo[1]}` : undefined;
    if (desdoble && grupoDesdoble && grupoDesdoble !== desdoble) continue;
    const profesor = (g.PROFESORADO ?? [])
      .map((p) => nombrePropio([p.NOMBRE, p.APELLIDO1, p.APELLIDO2].filter(Boolean).join(' ')))
      .filter(Boolean)
      .join(', ');
    for (const c of g.CLASES) {
      const fecha = c.TIMESTAMP_INICIO.slice(0, 10);
      const inicio = c.TIMESTAMP_INICIO.slice(11, 16);
      const clave = `${fecha} ${inicio} ${asignatura.id}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      const aula = (c.AULAS ?? []).map((a) => [a.AULA, a.EDIFICIO].filter(Boolean).join(' · ')).filter(Boolean).join(' + ');
      clases.push({
        fecha, inicio, fin: c.TIMESTAMP_FIN.slice(11, 16), asignatura: asignatura.id,
        ...(aula ? { aula } : {}),
        ...(profesor ? { profesor } : {}),
        ...(grupoDesdoble ? { desdoble: grupoDesdoble } : {}),
      });
    }
  }
  return clases.sort((a, b) => (a.fecha + a.inicio + a.asignatura).localeCompare(b.fecha + b.inicio + b.asignatura));
}
