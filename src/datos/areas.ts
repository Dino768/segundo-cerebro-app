import { RUTA_AREAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Area {
  id: string;
  nombre: string;
  color: string;
}

export function parseAreas(texto: string): Area[] {
  const datos = leerYaml(texto, RUTA_AREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_AREAS, 'areas.yaml debe ser una lista de áreas');
  return datos.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
      throw new ErrorDatos(RUTA_AREAS, `área ${i + 1}: necesita id y nombre`);
    if (typeof a.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(a.color))
      throw new ErrorDatos(RUTA_AREAS, `área ${i + 1} (${a.id}): color debe escribirse entre comillas, como "#3b82f6"`);
    return { id: a.id, nombre: a.nombre, color: a.color };
  });
}
