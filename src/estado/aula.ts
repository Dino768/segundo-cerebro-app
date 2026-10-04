import { useCallback, useEffect, useState } from 'react';
import type { Aviso } from '../datos/avisos';
import { cargarAvisos, leerAvisos } from '../repositorio';
import { useDatos } from './datos';

// Avisos de la uni: se leen al abrir la pantalla y al volver a la app. Si fallan, no molestan (la línea no sale).
export function useAvisos(): { avisos: Aviso[]; cargando: boolean; marcarLeidos(ids: string[]): Promise<void> } {
  const { config, estado } = useDatos();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState(true);

  const traer = useCallback(async () => {
    if (!config || estado !== 'listo') return;
    try {
      setAvisos(await cargarAvisos(config));
    } catch {
      // sin conexión o archivo roto: se queda lo que había
    } finally {
      setCargando(false);
    }
  }, [config, estado]);

  useEffect(() => {
    void traer();
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [traer]);

  const marcarLeidos = useCallback(async (ids: string[]) => {
    if (!config || !ids.length) return;
    setAvisos((as) => as.map((a) => (ids.includes(a.id) ? { ...a, leido: true } : a)));
    try {
      setAvisos(await leerAvisos(config, ids));
    } catch {
      await traer();
    }
  }, [config, traer]);

  return { avisos, cargando, marcarLeidos };
}
