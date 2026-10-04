import type { AulaVirtual, Material, SeccionMateriales, TipoMaterial } from '../../datos/aulaVirtual.ts';
import type { ISODate } from '../../fechas.ts';
import type { ContenidoCurso, ModuloAula } from './paginas.ts';

export const LIMITE_BYTES = 50 * 1024 * 1024;
export const TIPOS_DE_MATERIAL = ['resource', 'folder', 'url', 'page'];
export const SECCION_RETIRADOS = 'Ya no está en el aula virtual';

export const esMaterial = (m: ModuloAula) => TIPOS_DE_MATERIAL.includes(m.tipo);

const EXTENSIONES: [RegExp, TipoMaterial][] = [
  [/\.pdf$/i, 'pdf'],
  [/\.(pptx?|odp|key)$/i, 'presentacion'],
  [/\.(docx?|odt|txt|md|rtf|xlsx?|ods|csv)$/i, 'documento'],
  [/\.(mp4|mov|avi|mkv|webm|m4v)$/i, 'video'],
];
export function tipoDeArchivo(nombre: string): TipoMaterial {
  return EXTENSIONES.find(([re]) => re.test(nombre))?.[1] ?? 'otro';
}

export function tipoDeModulo(m: ModuloAula): TipoMaterial {
  if (m.tipo === 'folder') return 'carpeta';
  if (m.tipo === 'url') return 'enlace';
  if (m.tipo === 'page') return 'documento';
  return tipoDeArchivo(m.nombre);
}

export function nombreSeguro(nombre: string): string {
  const limpio = nombre.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').trim();
  return (limpio || 'sin nombre').slice(0, 100);
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FECHAS = /calendario|planificacion|cronograma|evaluacion|parcial|examen|practica|entrega|fechas/;
export const esDocumentoDeFechas = (nombre: string) => FECHAS.test(sinTildes(nombre));

export function nuevosMateriales(c: ContenidoCurso, vistos: Set<string>): ModuloAula[] {
  return c.secciones.flatMap((s) => s.modulos).filter((m) => esMaterial(m) && !vistos.has(m.id));
}

export interface Descargado { archivo?: string; tipo?: TipoMaterial }

export function construirLista(c: ContenidoCurso, anterior: AulaVirtual | null, descargados: Map<string, Descargado>, hoy: ISODate): AulaVirtual {
  const previos = new Map<string, Material>();
  for (const s of anterior?.secciones ?? []) for (const m of s.materiales) previos.set(m.id, m);
  const presentes = new Set<string>();
  const secciones: SeccionMateriales[] = [];
  for (const s of c.secciones) {
    const materiales = s.modulos.filter(esMaterial).map((m): Material => {
      presentes.add(m.id);
      const d = descargados.get(m.id);
      const antes = previos.get(m.id);
      const archivo = d?.archivo ?? antes?.archivo;
      return {
        id: m.id, nombre: m.nombre, tipo: d?.tipo ?? antes?.tipo ?? tipoDeModulo(m), enlace: m.url ?? antes?.enlace ?? '',
        ...(archivo ? { archivo } : {}),
      };
    });
    if (materiales.length) secciones.push({ nombre: s.nombre, materiales });
  }
  const retirados = [...previos.values()].filter((m) => !presentes.has(m.id)).map((m) => ({ ...m, retirado: true }));
  if (retirados.length) secciones.push({ nombre: SECCION_RETIRADOS, materiales: retirados });
  return { actualizado: hoy, secciones };
}
