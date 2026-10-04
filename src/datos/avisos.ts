import { stringify } from 'yaml';
import { addDays, isISODate, type ISODate } from '../fechas.ts';
import { RUTA_AVISOS } from './rutas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

// Avisos de los profes (del foro de avisos del aula virtual) y del programa local (spec §4).
export interface Aviso {
  id: string;
  asignatura?: string;
  fecha: ISODate;
  titulo: string;
  texto: string;
  importante: boolean;
  leido: boolean;
  leidoEl?: ISODate; // el día en que se marcó como leído (caduca a los DIAS_LEIDOS)
  enlace?: string;
}

export function parseAvisos(texto: string | null): Aviso[] {
  if (texto === null) return [];
  const datos = leerYaml(texto, RUTA_AVISOS);
  if (datos === null || datos === undefined) return [];
  const lista = (datos as { avisos?: unknown }).avisos;
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErrorDatos(RUTA_AVISOS, 'avisos debe ser una lista');
  return lista.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    const donde = `aviso ${i + 1}`;
    if (typeof a.id !== 'string' || typeof a.titulo !== 'string' || typeof a.texto !== 'string')
      throw new ErrorDatos(RUTA_AVISOS, `${donde}: necesita id, titulo y texto`);
    if (!isISODate(a.fecha)) throw new ErrorDatos(RUTA_AVISOS, `${donde}: fecha debe tener el formato AAAA-MM-DD`);
    if (a.asignatura !== undefined && typeof a.asignatura !== 'string') throw new ErrorDatos(RUTA_AVISOS, `${donde}: asignatura debe ser texto`);
    if (a.leidoEl !== undefined && !isISODate(a.leidoEl)) throw new ErrorDatos(RUTA_AVISOS, `${donde}: leidoEl debe tener el formato AAAA-MM-DD`);
    if (a.enlace !== undefined && typeof a.enlace !== 'string') throw new ErrorDatos(RUTA_AVISOS, `${donde}: enlace debe ser texto`);
    return {
      id: a.id,
      ...(a.asignatura ? { asignatura: a.asignatura as string } : {}),
      fecha: a.fecha,
      titulo: a.titulo,
      texto: a.texto,
      importante: a.importante === true,
      leido: a.leido === true,
      ...(a.leidoEl ? { leidoEl: a.leidoEl as string } : {}),
      ...(a.enlace ? { enlace: a.enlace as string } : {}),
    };
  });
}

export function serializarAvisos(avisos: Aviso[]): string {
  return stringify({ avisos }, { lineWidth: 0 });
}

// Un aviso leído se ve DIAS_LEIDOS días desde que se leyó; después la app lo oculta y el programa del PC lo borra.
export const DIAS_LEIDOS = 30;

export function marcarLeidos(avisos: Aviso[], ids: string[], hoy: ISODate): Aviso[] {
  const set = new Set(ids);
  return avisos.map((a) => (set.has(a.id) && !a.leido ? { ...a, leido: true, leidoEl: hoy } : a));
}

export function marcarNoLeido(avisos: Aviso[], id: string): Aviso[] {
  return avisos.map((a) => {
    if (a.id !== id) return a;
    const { leidoEl: _, ...resto } = a;
    return { ...resto, leido: false };
  });
}

export function caducado(a: Aviso, hoy: ISODate): boolean {
  return a.leido && a.leidoEl !== undefined && a.leidoEl < addDays(hoy, -DIAS_LEIDOS);
}

export function avisosVisibles(avisos: Aviso[], hoy: ISODate): Aviso[] {
  return avisos.filter((a) => !caducado(a, hoy));
}

export function importantesSinLeer(avisos: Aviso[]): Aviso[] {
  return avisos.filter((a) => a.importante && !a.leido);
}
