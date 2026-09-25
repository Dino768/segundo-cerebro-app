import { BASICOS } from './basicos';
import { DICCIONARIO, normalizar, type Nodo } from './diccionario';

export interface Coleccion {
  nodos: Record<string, Nodo[]>;
  etiquetas: Record<string, string[]>;
}

let cargada: Coleccion | null = null;
let pendiente: Promise<Coleccion> | null = null;

export function coleccionCargada(): Coleccion | null {
  return cargada;
}

// La colección completa (unos 5.000 iconos) se descarga solo cuando hace falta, y una sola vez.
export function cargarColeccion(): Promise<Coleccion> {
  pendiente ??= fetch(`${import.meta.env.BASE_URL}iconos/tabler.json`)
    .then((r) => {
      if (!r.ok) throw new Error('No se pudo descargar la colección de iconos');
      return r.json() as Promise<Record<string, { n: Nodo[]; t: string[] }>>;
    })
    .then((j) => {
      cargada = {
        nodos: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.n])),
        etiquetas: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.t])),
      };
      return cargada;
    })
    .catch((e) => {
      pendiente = null; // se podrá reintentar con conexión
      throw e;
    });
  return pendiente;
}

export function nodosDe(nombre: string): Nodo[] | undefined {
  return BASICOS[nombre] ?? cargada?.nodos[nombre];
}

// Primero los del diccionario (español), luego nombres en inglés que empiezan por la búsqueda,
// luego nombres que la contienen y al final los que la tienen en sus etiquetas.
export function buscarIconos(consulta: string, coleccion: Coleccion | null, limite = 120): string[] {
  const q = normalizar(consulta.trim());
  const resultado: string[] = [];
  const meter = (n: string) => {
    if (!resultado.includes(n)) resultado.push(n);
  };
  for (const e of DICCIONARIO)
    if (!q || e.icono.includes(q) || e.palabras.some((p) => normalizar(p).startsWith(q))) meter(e.icono);
  if (coleccion && q) {
    const nombres = Object.keys(coleccion.nodos);
    nombres.filter((n) => n.startsWith(q)).forEach(meter);
    nombres.filter((n) => n.includes(q)).forEach(meter);
    nombres.filter((n) => coleccion.etiquetas[n]?.some((t) => normalizar(t).startsWith(q))).forEach(meter);
  }
  return resultado.slice(0, limite);
}
