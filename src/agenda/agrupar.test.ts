import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import { agruparPorArea } from './agrupar';

const AREAS = parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#a855f7"\n    - id: r\n      nombre: Roblox\n      color: "#a855f7"\n');

describe('agruparPorArea', () => {
  it('por área en el orden de areas.yaml, con subgrupos por subárea y «sin área» al final', () => {
    const items = [{ n: 1, area: 'b' }, { n: 2 }, { n: 3, area: 'v' }, { n: 4, area: 'borrada' }, { n: 5, area: 'b' }];
    const g = agruparPorArea(items, AREAS);
    expect(g.map((x) => x.area?.id ?? null)).toEqual(['v', null]); // uni está vacía: no sale
    expect(g[0].items.map((x) => x.n)).toEqual([3]);
    expect(g[0].subgrupos.map((s) => [s.subarea.id, s.items.map((x) => x.n)])).toEqual([['b', [1, 5]]]); // roblox vacía: no sale
    expect(g[1].items.map((x) => x.n)).toEqual([2, 4]);
  });
  it('conserva el orden que traen los elementos', () => {
    const g = agruparPorArea([{ n: 2, area: 'uni' }, { n: 1, area: 'uni' }], AREAS);
    expect(g[0].items.map((x) => x.n)).toEqual([2, 1]);
  });
  it('sin nada → sin grupos', () => {
    expect(agruparPorArea([], AREAS)).toEqual([]);
  });
});
