import { normalizarCapas, type Capa } from './capas.ts';
import type { Flecha, Pieza, Pizarra } from './pizarra.ts';
import type { Trazo } from './tinta.ts';

// Igual aunque las claves estén en otro orden.
function clave(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(clave).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${clave((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
const igual = (a: unknown, b: unknown) => clave(a) === clave(b);

// Junta dos listas por id respecto a la versión común (`base`). Si los dos cambiaron lo mismo, gana `mia`.
// Sin base, junta las dos sin borrar nada.
export function fusionarLista<T extends { id: string }>(base: T[] | null, mia: T[], suya: T[]): T[] {
  const deBase = new Map((base ?? []).map((x) => [x.id, x]));
  const deSuya = new Map(suya.map((x) => [x.id, x]));
  const deMia = new Set(mia.map((x) => x.id));
  const r: T[] = [];
  for (const x of mia) {
    const s = deSuya.get(x.id);
    const b = deBase.get(x.id);
    if (s) r.push(b && igual(x, b) ? s : x);
    else if (!base || !b || !igual(x, b)) r.push(x); // nuevo mío, sin base, o cambiado por mí (aunque el otro lo borrara)
  }
  for (const s of suya) if (!deMia.has(s.id) && (!base || !deBase.has(s.id))) r.push(s); // nuevo del otro
  return r;
}

// Fusión a tres bandas entre la pizarra del PC (`mia`) y la del historial (`suya`), con la última que subió el PC (`base`).
export function fusionar(base: Pizarra | null, mia: Pizarra, suya: Pizarra): Pizarra {
  const piezas = fusionarLista<Pieza>(base?.piezas ?? null, mia.piezas, suya.piezas);
  const ids = new Set(piezas.map((x) => x.id));
  return normalizarCapas({
    ...mia,
    titulo: base && mia.titulo === base.titulo ? suya.titulo : mia.titulo,
    capas: fusionarLista<Capa>(base?.capas ?? null, mia.capas, suya.capas),
    piezas,
    flechas: fusionarLista<Flecha>(base?.flechas ?? null, mia.flechas, suya.flechas).filter((f) => ids.has(f.de) && ids.has(f.a)),
    trazos: fusionarLista<Trazo>(base?.trazos ?? null, mia.trazos, suya.trazos),
  });
}
