import { stringify } from 'yaml';
import { RUTA_ASIGNATURAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Asignatura {
  id: string;
  nombre: string;
  color: string;
}

// «General» siempre existe y no va en el archivo.
export const GENERAL: Asignatura = { id: 'general', nombre: 'General', color: '#8b7b6a' };
export const PATRON_ID_ASIGNATURA = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function parseAsignaturas(texto: string): Asignatura[] {
  const datos = leerYaml(texto, RUTA_ASIGNATURAS);
  if (datos === null || datos === undefined) return [];
  if (typeof datos !== 'object' || Array.isArray(datos))
    throw new ErrorDatos(RUTA_ASIGNATURAS, 'el archivo debe empezar por «asignaturas:» seguido de la lista');
  const lista = (datos as { asignaturas?: unknown }).asignaturas;
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErrorDatos(RUTA_ASIGNATURAS, 'asignaturas debe ser una lista');
  const vistos = new Set<string>();
  return lista.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: necesita id y nombre`);
    if (a.id === GENERAL.id) throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «general» está reservado`);
    if (!PATRON_ID_ASIGNATURA.test(a.id))
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «${a.id}» solo puede tener minúsculas, números y guiones`);
    if (vistos.has(a.id)) throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «${a.id}» está repetido`);
    vistos.add(a.id);
    if (typeof a.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(a.color))
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1} (${a.id}): color debe escribirse entre comillas, como "#3d7bb8"`);
    return { id: a.id, nombre: a.nombre, color: a.color };
  });
}

export function serializarAsignaturas(lista: Asignatura[]): string {
  return stringify({ asignaturas: lista.map(({ id, nombre, color }) => ({ id, nombre, color })) });
}
