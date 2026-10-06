import { stringify } from 'yaml';
import { RUTA_AULA_SINCRONIZACION } from '../../datos/rutas.ts';
import { ErrorDatos, leerYaml } from '../../datos/yaml.ts';
import { leerVisto, type Vistos } from '../vistos.ts';

export type ResultadoRevision = 'ok' | 'necesita-entrar' | 'error';
export interface EstadoAula { ultimaRevision?: string; resultado?: ResultadoRevision; mensaje?: string }
// Lo que Claude no pudo leer (límite de uso, fallo): se vuelve a mandar en la siguiente revisión.
export interface Pendiente { asignatura: string; avisos: string[]; documentos: string[]; guia: boolean }
export interface SincronizacionAula {
  estado: EstadoAula;
  // textos: huella de cada texto de la página de la asignatura ya leído por Claude (etiqueta-<id>, seccion-<id>, pagina-<id>).
  vistos: { materiales: string[]; avisos: string[]; guias: Record<string, string>; textos: Record<string, string>; fechas: Vistos };
  pendientes: Pendiente[];
}

const R = RUTA_AULA_SINCRONIZACION;
const textos = (x: unknown, que: string): string[] => {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x) || !x.every((y) => typeof y === 'string')) throw new ErrorDatos(R, `${que} debe ser una lista de textos`);
  return x;
};

export function parseSincronizacionAula(texto: string | null): SincronizacionAula {
  const d = (texto === null ? null : leerYaml(texto, R)) as Record<string, unknown> | null;
  const e = (d?.estado ?? {}) as Record<string, unknown>;
  const v = (d?.vistos ?? {}) as Record<string, unknown>;
  const fechas: Vistos = {};
  for (const [origen, bruto] of Object.entries((v.fechas ?? {}) as Record<string, unknown>)) fechas[origen] = leerVisto(origen, bruto, R);
  const guias: Record<string, string> = {};
  for (const [k, h] of Object.entries((v.guias ?? {}) as Record<string, unknown>)) if (typeof h === 'string') guias[k] = h;
  const textosVistos: Record<string, string> = {};
  for (const [k, h] of Object.entries((v.textos ?? {}) as Record<string, unknown>)) if (typeof h === 'string') textosVistos[k] = h;
  const pend = d?.pendientes ?? [];
  if (!Array.isArray(pend)) throw new ErrorDatos(R, 'pendientes debe ser una lista');
  return {
    estado: {
      ...(typeof e.ultimaRevision === 'string' ? { ultimaRevision: e.ultimaRevision } : {}),
      ...(e.resultado === 'ok' || e.resultado === 'necesita-entrar' || e.resultado === 'error' ? { resultado: e.resultado } : {}),
      ...(typeof e.mensaje === 'string' ? { mensaje: e.mensaje } : {}),
    },
    vistos: { materiales: textos(v.materiales, 'vistos.materiales'), avisos: textos(v.avisos, 'vistos.avisos'), guias, textos: textosVistos, fechas },
    pendientes: pend.map((p: Record<string, unknown>) => ({
      asignatura: String(p?.asignatura ?? ''), avisos: textos(p?.avisos, 'pendientes.avisos'),
      documentos: textos(p?.documentos, 'pendientes.documentos'), guia: p?.guia === true,
    })),
  };
}

export function serializarSincronizacionAula(s: SincronizacionAula): string {
  return stringify(s, { lineWidth: 0 });
}
