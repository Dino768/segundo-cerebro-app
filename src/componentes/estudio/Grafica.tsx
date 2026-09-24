import { useId, useMemo } from 'react';
import { compilarExpresion } from '../../estudio/expresion';
import { marcas, muestrear } from '../../estudio/grafica';
import type { ContenidoGrafica } from '../../estudio/pizarra';

const COLORES = ['#b8603d', '#3d7bb8', '#5a8f4e', '#8a5bb0', '#c08a2e'];

export function Grafica({ contenido, ancho }: { contenido: ContenidoGrafica; ancho: number }) {
  const idRecorte = useId().replace(/:/g, '');
  const alto = Math.round(ancho * 0.75);
  const m = 28;
  const [x0, x1] = contenido.x;
  const [y0, y1] = contenido.y;
  const px = (x: number) => m + ((x - x0) / (x1 - x0)) * (ancho - 2 * m);
  const py = (y: number) => alto - m - ((y - y0) / (y1 - y0)) * (alto - 2 * m);
  const curvas = useMemo(
    () =>
      contenido.curvas.map((c, i) => {
        try {
          return { c, color: c.color ?? COLORES[i % COLORES.length], tramos: muestrear(compilarExpresion(c.expr), contenido.x, contenido.y), error: null };
        } catch (e) {
          return { c, color: '', tramos: [], error: e instanceof Error ? e.message : String(e) };
        }
      }),
    [contenido],
  );

  return (
    <div className="grafica">
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%">
        <defs>
          <clipPath id={idRecorte}><rect x={m} y={m} width={ancho - 2 * m} height={alto - 2 * m} /></clipPath>
        </defs>
        {marcas(x0, x1).map((v) => (
          <g key={`x${v}`}>
            <line x1={px(v)} x2={px(v)} y1={m} y2={alto - m} className="rejilla" />
            <text x={px(v)} y={alto - m + 14} textAnchor="middle" className="numero-eje">{v}</text>
          </g>
        ))}
        {marcas(y0, y1).map((v) => (
          <g key={`y${v}`}>
            <line x1={m} x2={ancho - m} y1={py(v)} y2={py(v)} className="rejilla" />
            <text x={m - 4} y={py(v) + 4} textAnchor="end" className="numero-eje">{v}</text>
          </g>
        ))}
        {x0 <= 0 && x1 >= 0 && <line x1={px(0)} x2={px(0)} y1={m} y2={alto - m} className="eje" />}
        {y0 <= 0 && y1 >= 0 && <line x1={m} x2={ancho - m} y1={py(0)} y2={py(0)} className="eje" />}
        <g clipPath={`url(#${idRecorte})`}>
          {curvas.map((k, i) =>
            k.tramos.map((t, j) => (
              <polyline key={`${i}-${j}`} points={t.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={k.color} strokeWidth={2} />
            )),
          )}
        </g>
        {contenido.puntos.map((p, i) => (
          <g key={i}>
            <circle cx={px(p.x)} cy={py(p.y)} r={4} fill="#3b3027" />
            {p.etiqueta && <text x={px(p.x) + 6} y={py(p.y) - 6} className="etiqueta-grafica">{p.etiqueta}</text>}
          </g>
        ))}
      </svg>
      <div className="leyenda">
        {curvas.map((k, i) =>
          k.error ? (
            <span key={i} className="error-grafica">«{k.c.expr}»: {k.error}</span>
          ) : (
            <span key={i}><span className="punto" style={{ background: k.color }} /> {k.c.etiqueta ?? `y = ${k.c.expr}`}</span>
          ),
        )}
      </div>
    </div>
  );
}
