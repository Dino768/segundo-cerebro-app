import { useCallback, useEffect, useState } from 'react';
import { avisosVisibles, marcarNoLeido as quitarLeido, type Aviso } from '../datos/avisos';
import { toISO } from '../fechas';
import { cargarAvisos, desleerAviso, leerAvisos } from '../repositorio';
import { useDatos } from './datos';
import { useHoy } from './hoy';

// Avisos de la uni: se leen al abrir la pantalla y al volver a la app. Si fallan, no molestan (la línea no sale).
// Los leídos hace más de 30 días no se enseñan (spec horario §7).
export function useAvisos(): {
  avisos: Aviso[]; cargando: boolean; marcarLeidos(ids: string[]): Promise<void>; marcarNoLeido(id: string): Promise<void>;
} {
  const { config, estado } = useDatos();
  const hoy = useHoy();
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
    const dia = toISO(new Date());
    setAvisos((as) => as.map((a) => (ids.includes(a.id) && !a.leido ? { ...a, leido: true, leidoEl: dia } : a)));
    try {
      setAvisos(await leerAvisos(config, ids, dia));
    } catch {
      await traer();
    }
  }, [config, traer]);

  const marcarNoLeido = useCallback(async (id: string) => {
    if (!config) return;
    setAvisos((as) => quitarLeido(as, id));
    try {
      setAvisos(await desleerAviso(config, id));
    } catch {
      await traer();
    }
  }, [config, traer]);

  return { avisos: avisosVisibles(avisos, hoy), cargando, marcarLeidos, marcarNoLeido };
}
