import { stringify } from 'yaml';
import { RUTA_UNI_SINCRONIZACION } from '../datos/rutas.ts';
import { ErrorDatos, leerYaml } from '../datos/yaml.ts';
import { isHora, isISODate, type ISODate } from '../fechas.ts';

// Lo último que dijo la fuente de cada cosa importada (por su `origen`).
export interface Visto {
  fecha: ISODate;
  hora?: string;
  notas?: string;
}

export type Vistos = Record<string, Visto>;

export function parseVistos(texto: string | null): Vistos {
  if (texto === null) return {};
  const datos = leerYaml(texto, RUTA_UNI_SINCRONIZACION);
  if (datos === null || datos === undefined) return {};
  if (typeof datos !== 'object' || Array.isArray(datos))
    throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, 'el archivo debe empezar por «vistos:»');
  const mapa = (datos as { vistos?: unknown }).vistos;
  if (mapa === undefined || mapa === null) return {};
  if (typeof mapa !== 'object' || Array.isArray(mapa))
    throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, 'vistos debe ser una lista de origen: { fecha, hora, notas }');
  const r: Vistos = {};
  for (const [origen, bruto] of Object.entries(mapa as Record<string, unknown>)) {
    const v = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (!isISODate(v.fecha)) throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: fecha debe tener el formato AAAA-MM-DD`);
    if (v.hora !== undefined && !isHora(v.hora)) throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: hora debe tener el formato "HH:MM"`);
    if (v.notas !== undefined && typeof v.notas !== 'string') throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: notas debe ser texto`);
    r[origen] = {
      fecha: v.fecha,
      ...(v.hora !== undefined ? { hora: v.hora as string } : {}),
      ...(v.notas !== undefined ? { notas: v.notas as string } : {}),
    };
  }
  return r;
}

export function serializarVistos(v: Vistos): string {
  return stringify({ vistos: v }, { lineWidth: 0 });
}
