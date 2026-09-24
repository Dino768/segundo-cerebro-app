import { stringify } from 'yaml';
import { CARPETA_PROYECTOS } from './rutas';
import { PRIORIDADES, type Prioridad } from './tareas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export const ESTADOS = ['activo', 'parado', 'idea', 'terminado'] as const;
export type Estado = (typeof ESTADOS)[number];

export interface Proyecto {
  id: string;
  estado: Estado;
  area?: string;
  prioridad?: Prioridad;
  titulo: string;
  cuerpo: string;
  meta: Record<string, unknown>;
}

export function tituloDesdeCuerpo(cuerpo: string, id: string): string {
  return /^# (.+)$/m.exec(cuerpo)?.[1].trim() || id;
}

export function parseProyecto(id: string, texto: string): Proyecto {
  const archivo = `${CARPETA_PROYECTOS}/${id}.md`;
  const normal = texto.replace(/\r\n/g, '\n');
  let meta: Record<string, unknown> = {};
  let cuerpo = normal;

  if (normal.startsWith('---\n')) {
    let fin = normal.indexOf('\n---\n', 3);
    if (fin === -1 && normal.endsWith('\n---')) fin = normal.length - 4;
    if (fin !== -1) {
      const datos = leerYaml(normal.slice(4, fin + 1), archivo);
      if (datos !== null && datos !== undefined && (typeof datos !== 'object' || Array.isArray(datos)))
        throw new ErrorDatos(archivo, 'el encabezado debe tener campos como "estado: activo"');
      meta = quitarNulos((datos ?? {}) as Record<string, unknown>);
      cuerpo = normal.slice(fin + 5);
    }
  }

  const estado = meta.estado ?? 'idea';
  if (!(ESTADOS as readonly unknown[]).includes(estado))
    throw new ErrorDatos(archivo, 'estado debe ser activo, parado, idea o terminado');
  if (meta.area !== undefined && typeof meta.area !== 'string') throw new ErrorDatos(archivo, 'area debe ser texto');
  if (meta.prioridad !== undefined && !PRIORIDADES.includes(meta.prioridad as Prioridad))
    throw new ErrorDatos(archivo, 'prioridad debe ser alta, media o baja');

  return {
    id,
    estado: estado as Estado,
    area: meta.area as string | undefined,
    prioridad: meta.prioridad as Prioridad | undefined,
    titulo: tituloDesdeCuerpo(cuerpo, id),
    cuerpo,
    meta,
  };
}

export function serializarProyecto(p: Proyecto): string {
  const encabezado = { ...p.meta, estado: p.estado, area: p.area, prioridad: p.prioridad };
  return `---\n${stringify(encabezado, { lineWidth: 0 })}---\n${p.cuerpo}`;
}

export function idProyectoDesdeTitulo(titulo: string, existentes: string[]): string {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'proyecto';
  let id = base;
  for (let n = 2; existentes.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function dondeLoDejamos(cuerpo: string): string | undefined {
  const lineas = cuerpo.replace(/\r\n/g, '\n').split('\n');
  const inicio = lineas.findIndex((l) => /^##\s+d[oó]nde lo dejamos\s*$/i.test(l.trim()));
  if (inicio === -1) return undefined;
  let ultima: string | undefined;
  for (const l of lineas.slice(inicio + 1)) {
    if (/^#{1,2}\s/.test(l)) break;
    const limpia = l.trim().replace(/^[-*]\s+/, '');
    if (limpia) ultima = limpia;
  }
  return ultima;
}
