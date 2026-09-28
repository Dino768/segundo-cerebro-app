import type { Punto } from './geometria';
import { esLibre, letrasDe, polilineas, type Trazo } from './tinta';

// Animación de lo que dibuja Claude: qué es nuevo, en qué orden, cuánto dura y cómo se ve a medias.
// La pantalla (useAnimacion y CapaTinta) solo pregunta aquí. Diseño: 2026-09-27-dibujo-a-mano-parte-2-design.md, sección 5.

export const TOPE_LOTE = 8000; // lo que llega junto no tarda más de 8 s
export const DURACION_FORMA = 400;
export const TOPE_LAPIZ = 600;
export const LETRAS_POR_SEGUNDO = 12;
const VELOCIDAD_LAPIZ = 1.5; // píxeles de la pizarra por milisegundo
const MINIMO_LAPIZ = 120;

export interface Tramo { id: string; inicio: number; fin: number }

const largoDe = (l: Punto[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : 0), 0);

export function duracion(t: Trazo): number {
  if (t.herramienta === 'letra') return (Math.max(1, letrasDe(t).length) * 1000) / LETRAS_POR_SEGUNDO;
  if (esLibre(t.herramienta)) {
    const largo = polilineas(t).reduce((s, l) => s + largoDe(l), 0);
    return Math.min(TOPE_LAPIZ, Math.max(MINIMO_LAPIZ, largo / VELOCIDAD_LAPIZ));
  }
  return DURACION_FORMA;
}

// Los trazos que acaban de llegar juntos, a la cola: uno detrás de otro, en el orden del archivo, cuando acabe lo
// que ya se está animando (o ahora). Si juntos pasan de 8 s, se aceleran para caber en 8.
export function encolar(cola: Tramo[], nuevos: Trazo[], ahora: number): Tramo[] {
  if (!nuevos.length) return cola;
  const ds = nuevos.map(duracion);
  const total = ds.reduce((a, b) => a + b, 0);
  const f = total > TOPE_LOTE ? TOPE_LOTE / total : 1;
  let t = Math.max(ahora, ...cola.map((x) => x.fin));
  return [
    ...cola,
    ...nuevos.map((tr, i) => {
      const inicio = t;
      t += ds[i] * f;
      return { id: tr.id, inicio, fin: t };
    }),
  ];
}

export const progreso = (tramo: Tramo, ahora: number) =>
  ahora <= tramo.inicio ? 0 : ahora >= tramo.fin ? 1 : (ahora - tramo.inicio) / (tramo.fin - tramo.inicio);

export const pendientes = (cola: Tramo[], ahora: number) => cola.filter((x) => x.fin > ahora);

// Llega una versión de la pizarra. `externos`: los trazos tal y como llegan; `propios`: los que ve Diego (con lo suyo aún
// sin guardar). Nuevos son los de Claude que llegan y no se habían visto. Lo que aparece antes en `propios` lo ha hecho
// Diego (pegar, duplicar una capa): se da por visto. La primera vez (vistos = null) no hay nada nuevo, salvo si
// `animarPrimera` (Claude acaba de crear la pizarra).
export function recibir(vistos: ReadonlySet<string> | null, externos: Trazo[], propios: Trazo[], animarPrimera: boolean): { vistos: Set<string>; nuevos: Trazo[] } {
  const nuevos = vistos || animarPrimera ? externos.filter((t) => t.autor === 'claude' && !vistos?.has(t.id)) : [];
  const v = new Set(vistos);
  for (const t of externos) v.add(t.id);
  for (const t of propios) v.add(t.id);
  return { vistos: v, nuevos };
}

// Las líneas recorridas hasta la fracción f de su largo total, en orden, como las dibujaría un lápiz.
export function cortarPorLargo(lineas: Punto[][], f: number): Punto[][] {
  if (f >= 1) return lineas;
  let queda = Math.max(0, f) * lineas.reduce((s, l) => s + largoDe(l), 0);
  const r: Punto[][] = [];
  for (const l of lineas) {
    if (queda <= 0) break;
    const parte: Punto[] = [l[0]];
    for (let i = 1; i < l.length && queda > 0; i++) {
      const a = l[i - 1];
      const b = l[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= queda) {
        parte.push(b);
        queda -= d;
      } else {
        const k = queda / d;
        parte.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        queda = 0;
      }
    }
    if (parte.length > 1) r.push(parte);
  }
  return r;
}

// Un trazo que no es lápiz, dibujado hasta la fracción f. La letra, letra a letra (y cada letra, trazo a trazo).
export function lineasParciales(t: Trazo, f: number): Punto[][] {
  if (t.herramienta !== 'letra') return cortarPorLargo(polilineas(t), f);
  const letras = letrasDe(t);
  if (f >= 1) return letras.flat();
  const k = Math.max(0, f) * letras.length;
  const enteras = Math.floor(k);
  return [...letras.slice(0, enteras).flat(), ...(enteras < letras.length ? cortarPorLargo(letras[enteras], k - enteras) : [])];
}

// El lápiz a medias: sus primeros puntos (con su presión), para que se dibuje igual que entero.
export function lapizParcial(t: Trazo, f: number): Trazo {
  if (f >= 1) return t;
  const n = t.puntos.length / 2;
  const k = Math.max(1, Math.min(n, Math.ceil(Math.max(0, f) * n)));
  return { ...t, puntos: t.puntos.slice(0, k * 2), ...(t.presion ? { presion: t.presion.slice(0, k) } : {}) };
}
