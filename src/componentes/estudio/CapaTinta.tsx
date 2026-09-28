import { memo } from 'react';
import { figuraParcial } from '../../estudio/dibujoSvg';
import type { Trazo } from '../../estudio/tinta';

// memo: al dibujar solo cambia el trazo nuevo; los demás no se vuelven a calcular.
// `parte`: por dónde va la animación (0 = aún no se ve, 1 = entero).
const TrazoSvg = memo(function TrazoSvg({ trazo, parte = 1 }: { trazo: Trazo; parte?: number }) {
  if (parte <= 0) return null;
  const f = figuraParcial(trazo, parte);
  if (f.relleno) return <path d={f.d} fill={trazo.color} />;
  return (
    <path
      d={f.d}
      fill="none"
      stroke={trazo.color}
      strokeWidth={trazo.grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={trazo.herramienta === 'subrayador' ? 0.35 : undefined}
    />
  );
});

// Los trazos de una capa: primero el subrayador (queda por debajo) y encima el lápiz y las formas.
export function CapaTinta({ subrayados, trazos, progreso }: { subrayados: Trazo[]; trazos: Trazo[]; progreso?: ReadonlyMap<string, number> }) {
  if (!subrayados.length && !trazos.length) return null;
  return (
    <svg className="tinta" width="1" height="1" overflow="visible" aria-hidden>
      {subrayados.length > 0 && (
        <g className="subrayados">
          {subrayados.map((t) => <TrazoSvg key={t.id} trazo={t} parte={progreso?.get(t.id)} />)}
        </g>
      )}
      {trazos.map((t) => <TrazoSvg key={t.id} trazo={t} parte={progreso?.get(t.id)} />)}
    </svg>
  );
}
