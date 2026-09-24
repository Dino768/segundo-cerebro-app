export interface Punto { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
// Cómo se ve el lienzo: en pantalla = mundo × escala + (x, y).
export interface Vista { x: number; y: number; escala: number }

export const centro = (r: Rect): Punto => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// Punto del borde de `r` en la línea que va de su centro hacia `hacia`.
export function puntoEnBorde(r: Rect, hacia: Punto): Punto {
  const c = centro(r);
  const dx = hacia.x - c.x;
  const dy = hacia.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const t = Math.min(dx !== 0 ? r.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? r.h / 2 / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export function encuadrar(rects: Rect[], ancho: number, alto: number, margen = 40): Vista {
  if (!rects.length) return { x: margen, y: margen, escala: 1 };
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  const escala = Math.min(1.5, Math.max(0.1, Math.min((ancho - 2 * margen) / (x1 - x0 || 1), (alto - 2 * margen) / (y1 - y0 || 1))));
  return { x: (ancho - (x1 - x0) * escala) / 2 - x0 * escala, y: (alto - (y1 - y0) * escala) / 2 - y0 * escala, escala };
}

export function zoomEn(v: Vista, factor: number, p: Punto): Vista {
  const escala = Math.min(4, Math.max(0.1, v.escala * factor));
  const f = escala / v.escala;
  return { escala, x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f };
}

export const aMundo = (v: Vista, p: Punto): Punto => ({ x: (p.x - v.x) / v.escala, y: (p.y - v.y) / v.escala });
