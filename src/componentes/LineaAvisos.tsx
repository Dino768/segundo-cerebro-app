import { importantesSinLeer, type Aviso } from '../datos/avisos';
import type { Destino } from './navegacion';

// Una sola línea en el Inicio, solo si hay avisos importantes sin leer (spec §8).
export function LineaAvisos({ avisos, ir }: { avisos: Aviso[]; ir(d: Destino): void }) {
  const n = importantesSinLeer(avisos).length;
  if (n === 0) return null;
  return (
    <button className="linea-avisos" onClick={() => ir({ pantalla: 'estudio', aula: true })}>
      📣 {n === 1 ? '1 aviso importante de la uni' : `${n} avisos importantes de la uni`} →
    </button>
  );
}
