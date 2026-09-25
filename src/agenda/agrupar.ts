import type { Area, Subarea } from '../datos/areas';
import { buscarArea } from './areas';

export interface Grupo<T> {
  area: Area | null; // null = «Sin área» (sin área o con un área que no existe)
  items: T[];
  subgrupos: { subarea: Subarea; items: T[] }[];
}

// Agrupa en el orden de areas.yaml; dentro de cada grupo se respeta el orden que traen los elementos.
// Los grupos y subgrupos vacíos no salen.
export function agruparPorArea<T extends { area?: string }>(items: T[], areas: Area[]): Grupo<T>[] {
  const grupos: Grupo<T>[] = areas.map((a) => ({ area: a, items: [], subgrupos: a.subareas.map((s) => ({ subarea: s, items: [] })) }));
  const sinArea: Grupo<T> = { area: null, items: [], subgrupos: [] };
  for (const x of items) {
    const b = buscarArea(areas, x.area);
    if (!b) {
      sinArea.items.push(x);
      continue;
    }
    const g = grupos[areas.indexOf(b.madre)];
    if (b.area === b.madre) g.items.push(x);
    else g.subgrupos.find((s) => s.subarea === b.area)!.items.push(x);
  }
  return [...grupos, sinArea]
    .map((g) => ({ ...g, subgrupos: g.subgrupos.filter((s) => s.items.length) }))
    .filter((g) => g.items.length || g.subgrupos.length);
}
