import { stringify } from 'yaml';
import { isISODate, type ISODate } from '../fechas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

export const TIPOS_MATERIAL = ['pdf', 'presentacion', 'documento', 'carpeta', 'enlace', 'video', 'otro'] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];
export interface Material { id: string; nombre: string; tipo: TipoMaterial; enlace: string; archivo?: string; retirado?: boolean }
export interface SeccionMateriales { nombre: string; materiales: Material[] }
export interface AulaVirtual { actualizado: ISODate; secciones: SeccionMateriales[] }

export function parseAulaVirtual(texto: string | null, ruta: string): AulaVirtual | null {
  if (texto === null) return null;
  const d = leerYaml(texto, ruta) as { actualizado?: unknown; secciones?: unknown } | null;
  if (!d) return null;
  if (!isISODate(d.actualizado)) throw new ErrorDatos(ruta, 'actualizado debe tener el formato AAAA-MM-DD');
  if (!Array.isArray(d.secciones)) throw new ErrorDatos(ruta, 'secciones debe ser una lista');
  return {
    actualizado: d.actualizado,
    secciones: d.secciones.map((s: { nombre?: unknown; materiales?: unknown }, i: number) => {
      if (typeof s?.nombre !== 'string' || !Array.isArray(s.materiales)) throw new ErrorDatos(ruta, `sección ${i + 1}: necesita nombre y materiales`);
      return {
        nombre: s.nombre,
        materiales: s.materiales.map((m: Record<string, unknown>, j: number) => {
          const donde = `sección ${i + 1}, material ${j + 1}`;
          if (typeof m?.id !== 'string' || typeof m.nombre !== 'string' || typeof m.enlace !== 'string')
            throw new ErrorDatos(ruta, `${donde}: necesita id, nombre y enlace`);
          if (!(TIPOS_MATERIAL as readonly unknown[]).includes(m.tipo)) throw new ErrorDatos(ruta, `${donde}: tipo no válido`);
          return {
            id: m.id, nombre: m.nombre, tipo: m.tipo as TipoMaterial, enlace: m.enlace,
            ...(typeof m.archivo === 'string' ? { archivo: m.archivo } : {}),
            ...(m.retirado === true ? { retirado: true } : {}),
          };
        }),
      };
    }),
  };
}

export function serializarAulaVirtual(a: AulaVirtual): string {
  return stringify(a, { lineWidth: 0 });
}
