import { stringify } from 'yaml';
import { RUTA_AREAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Subarea {
  id: string;
  nombre: string;
  color: string;
}

export interface Area extends Subarea {
  subareas: Subarea[];
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

function leerUna(bruto: unknown, donde: string): Subarea & { subareas?: unknown } {
  const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
  if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
    throw new ErrorDatos(RUTA_AREAS, `${donde}: necesita id y nombre`);
  if (typeof a.color !== 'string' || !COLOR.test(a.color))
    throw new ErrorDatos(RUTA_AREAS, `${donde} (${a.id}): color debe escribirse entre comillas, como "#3b82f6"`);
  return { id: a.id, nombre: a.nombre, color: a.color, subareas: a.subareas };
}

export function parseAreas(texto: string): Area[] {
  const datos = leerYaml(texto, RUTA_AREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_AREAS, 'areas.yaml debe ser una lista de áreas');
  const vistos = new Set<string>();
  const anotar = (id: string) => {
    if (vistos.has(id)) throw new ErrorDatos(RUTA_AREAS, `el id "${id}" está repetido: cada área y subárea necesita uno distinto`);
    vistos.add(id);
  };
  return datos.map((bruto, i) => {
    const { subareas, ...area } = leerUna(bruto, `área ${i + 1}`);
    anotar(area.id);
    if (subareas !== undefined && subareas !== null && !Array.isArray(subareas))
      throw new ErrorDatos(RUTA_AREAS, `área ${area.id}: subareas debe ser una lista`);
    const subs = ((subareas ?? []) as unknown[]).map((b, j) => {
      const { subareas: nietas, ...sub } = leerUna(b, `subárea ${j + 1} de ${area.id}`);
      if (nietas !== undefined) throw new ErrorDatos(RUTA_AREAS, `subárea ${sub.id}: las subáreas tienen un solo nivel (no pueden tener subareas)`);
      anotar(sub.id);
      return sub;
    });
    return { ...area, subareas: subs };
  });
}

// El color va entre comillas: sin ellas, YAML toma "#..." como un comentario.
export function serializarAreas(areas: Area[]): string {
  if (areas.length === 0) return '';
  const limpio = areas.map(({ subareas, ...a }) => (subareas.length ? { ...a, subareas } : a));
  return stringify(limpio, { lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN' }).replace(
    /^(\s*)color: (#[0-9a-fA-F]{6})$/gm,
    '$1color: "$2"',
  );
}
