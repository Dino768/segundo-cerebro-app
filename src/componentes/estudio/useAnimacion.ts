import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { encolar, pendientes, progreso, recibir, type Tramo } from '../../estudio/animacion';
import type { Trazo } from '../../estudio/tinta';

const reducirMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Anima los trazos de Claude que llegan con la pizarra abierta. Devuelve por dónde va cada uno (0 = aún no se ve);
// los que no están se dibujan enteros. useLayoutEffect: lo nuevo se esconde antes de pintarse entero en pantalla.
export function useAnimacion(externos: Trazo[], propios: Trazo[], animarPrimera: boolean): ReadonlyMap<string, number> {
  const vistos = useRef<Set<string> | null>(null);
  const [cola, setCola] = useState<Tramo[]>([]);
  const [ahora, setAhora] = useState(0);

  useLayoutEffect(() => {
    const r = recibir(vistos.current, externos, propios, animarPrimera);
    vistos.current = r.vistos;
    if (!r.nuevos.length || reducirMovimiento()) return;
    const t0 = performance.now();
    setAhora(t0);
    setCola((c) => encolar(pendientes(c, t0), r.nuevos, t0));
  }, [externos, propios, animarPrimera]);

  // Un fotograma cada vez, mientras quede algo por dibujar.
  useEffect(() => {
    if (!cola.length) return;
    const id = requestAnimationFrame((t) => {
      setAhora(t);
      setCola((c) => {
        const quedan = pendientes(c, t);
        return quedan.length === c.length ? c : quedan;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [cola, ahora]);

  return useMemo(() => new Map(cola.map((x) => [x.id, progreso(x, ahora)])), [cola, ahora]);
}
