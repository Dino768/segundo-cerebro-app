import type { Operacion, Pizarra } from './pizarra.ts';
import { nuevoId } from './tinta.ts';

// Capas de la pizarra, como en Procreate: la de Claude (id «claude», con todo lo suyo) y las de Diego.
export interface Capa {
  id: string;
  nombre: string;
}

export const CAPA_CLAUDE = 'claude';
export const CAPA_DE_CLAUDE: Capa = { id: CAPA_CLAUDE, nombre: 'Claude' };
export const CAPAS_INICIALES: Capa[] = [CAPA_DE_CLAUDE, { id: 'capa-1', nombre: 'Capa 1' }];

interface ConCapa {
  capa?: string;
}

export function idCapaLibre(capas: Capa[]): string {
  const usados = new Set(capas.map((c) => c.id));
  for (let n = 1; ; n++) if (!usados.has(`capa-${n}`)) return `capa-${n}`;
}

// Siempre está la de Claude (si falta, abajo del todo) y al menos una de Diego (si falta, «Capa N» encima).
export function completarCapas(capas: Capa[]): Capa[] {
  let r = capas.map((c) => (c.id === CAPA_CLAUDE ? CAPA_DE_CLAUDE : c));
  if (!r.some((c) => c.id === CAPA_CLAUDE)) r = [CAPA_DE_CLAUDE, ...r];
  if (!r.some((c) => c.id !== CAPA_CLAUDE)) {
    const id = idCapaLibre(r);
    r = [...r, { id, nombre: `Capa ${id.slice('capa-'.length)}` }];
  }
  return r;
}

export const capaDeDiego = (capas: Capa[]) => capas.find((c) => c.id !== CAPA_CLAUDE)?.id ?? 'capa-1';
export const capaPorDefecto = (capas: Capa[], deClaude: boolean) => (deClaude ? CAPA_CLAUDE : capaDeDiego(capas));
// Sin capa escrita, las notas son de Diego y el resto de piezas, de Claude.
export const esDeClaudePieza = (x: { tipo: string }) => x.tipo !== 'nota';
export const esDeClaudeTrazo = (t: { autor?: string }) => t.autor === 'claude';

function conCapa<T extends ConCapa>(x: T, capas: Capa[], deClaude: boolean): T {
  return x.capa && capas.some((c) => c.id === x.capa) ? x : { ...x, capa: capaPorDefecto(capas, deClaude) };
}

// Capas completas y cada pieza y trazo en una capa que existe.
export function normalizarCapas<P extends { capas: Capa[]; piezas: (ConCapa & { tipo: string })[]; trazos: (ConCapa & { autor?: string })[] }>(p: P): P {
  const capas = completarCapas(p.capas);
  return {
    ...p,
    capas,
    piezas: p.piezas.map((x) => conCapa(x, capas, esDeClaudePieza(x))),
    trazos: p.trazos.map((t) => conCapa(t, capas, esDeClaudeTrazo(t))),
  };
}

export const esCapaInicial = (capas: Capa[]) =>
  capas.length === 2 && capas[0].id === CAPA_CLAUDE && capas[1].id === 'capa-1' && capas[1].nombre === 'Capa 1';

// Lo que hay en cada capa visible, de abajo arriba. Dentro de una capa: piezas, subrayador y, encima, lo demás.
export function porCapas<Pz extends ConCapa, T extends ConCapa & { herramienta: string }>(
  capas: Capa[], piezas: Pz[], trazos: T[], ocultas: ReadonlySet<string>,
): { capa: Capa; piezas: Pz[]; subrayados: T[]; trazos: T[] }[] {
  return capas
    .filter((c) => !ocultas.has(c.id))
    .map((capa) => ({
      capa,
      piezas: piezas.filter((x) => x.capa === capa.id),
      subrayados: trazos.filter((t) => t.capa === capa.id && t.herramienta === 'subrayador'),
      trazos: trazos.filter((t) => t.capa === capa.id && t.herramienta !== 'subrayador'),
    }));
}

// Como en Procreate, al empezar está activa la capa de Diego de más arriba.
export const activaInicial = (capas: Capa[]) => [...capas].reverse().find((c) => c.id !== CAPA_CLAUDE)?.id ?? CAPA_CLAUDE;

// La capa activa tiene que verse: si está oculta, pasa a la de debajo que se vea (o a la de encima). null si no se ve ninguna.
export function activaVisible(capas: Capa[], ocultas: ReadonlySet<string>, activa: string): string | null {
  const i = capas.findIndex((c) => c.id === activa);
  if (i < 0) {
    const d = [...capas].reverse().find((c) => c.id !== CAPA_CLAUDE && !ocultas.has(c.id));
    return d?.id ?? (ocultas.has(CAPA_CLAUDE) ? null : CAPA_CLAUDE);
  }
  if (!ocultas.has(activa)) return activa;
  for (let k = i - 1; k >= 0; k--) if (!ocultas.has(capas[k].id)) return capas[k].id;
  for (let k = i + 1; k < capas.length; k++) if (!ocultas.has(capas[k].id)) return capas[k].id;
  return null;
}

// Una capa nueva de Diego, justo encima de la activa.
export function opCrearCapa(p: Pizarra, activa: string): { op: Operacion; id: string } {
  const id = idCapaLibre(p.capas);
  const posicion = p.capas.findIndex((c) => c.id === activa) + 1 || p.capas.length;
  return { id, op: { tipo: 'capa', accion: 'crear', id, nombre: `Capa ${id.slice('capa-'.length)}`, posicion } };
}

// Copia de una capa justo encima, con ids nuevos. La copia de la de Claude es de Diego (sin autor).
export function opDuplicarCapa(p: Pizarra, id: string, azar: () => number = Math.random): { op: Operacion; id: string } | null {
  const capa = p.capas.find((c) => c.id === id);
  if (!capa) return null;
  const nueva = idCapaLibre(p.capas);
  const usados = new Set([...p.piezas.map((x) => x.id), ...p.trazos.map((t) => t.id), ...p.flechas.map((f) => f.id)]);
  const otroId = () => {
    const n = nuevoId('d', usados, azar);
    usados.add(n);
    return n;
  };
  const mapa = new Map<string, string>();
  const piezas = p.piezas.filter((x) => x.capa === id).map((x) => {
    const n = otroId();
    mapa.set(x.id, n);
    return { ...x, id: n, capa: nueva };
  });
  const trazos = p.trazos.filter((t) => t.capa === id).map(({ autor: _autor, ...t }) => ({ ...t, id: otroId(), capa: nueva }));
  const flechas = p.flechas
    .filter((f) => mapa.has(f.de) && mapa.has(f.a))
    .map((f) => ({ ...f, id: otroId(), de: mapa.get(f.de)!, a: mapa.get(f.a)! }));
  return {
    id: nueva,
    op: {
      tipo: 'lote',
      ops: [
        { tipo: 'capa', accion: 'crear', id: nueva, nombre: `${capa.nombre} (copia)`.slice(0, 40), posicion: p.capas.findIndex((c) => c.id === id) + 1 },
        { tipo: 'piezas', quitar: [], poner: piezas, flechas },
        { tipo: 'trazos', quitar: [], poner: trazos },
      ],
    },
  };
}

// delta 1 = subir (hacia encima), -1 = bajar. null si ya está en el borde.
export function opMoverCapa(p: Pizarra, id: string, delta: 1 | -1): Operacion | null {
  const i = p.capas.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.capas.length) return null;
  return { tipo: 'capa', accion: 'ordenar', id, posicion: j };
}
