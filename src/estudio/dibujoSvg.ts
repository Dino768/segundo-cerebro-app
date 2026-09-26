import { getStroke } from 'perfect-freehand';
import type { Punto } from './geometria';
import { pares, polilineas, type Trazo } from './tinta';

const r = (v: number) => Math.round(v * 10) / 10;
const camino = (linea: Punto[]) => linea.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ');

// Cómo se dibuja un trazo en SVG: el lápiz es un contorno relleno (su grosor cambia con la presión); lo demás, líneas.
export function figuraDe(t: Trazo): { d: string; relleno: boolean } {
  if (t.herramienta !== 'lapiz') return { d: polilineas(t).map(camino).join(' '), relleno: false };
  const puntos = pares(t.puntos).map((p, i) => [p.x, p.y, t.presion?.[i] ?? 0.5]);
  const borde = getStroke(puntos, { size: t.grosor, thinning: t.presion ? 0.6 : 0, smoothing: 0.5, streamline: 0.4, simulatePressure: false, last: true });
  if (!borde.length) return { d: '', relleno: true };
  return { d: `M${borde.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L')} Z`, relleno: true };
}
