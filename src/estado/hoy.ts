import { useEffect, useState } from 'react';
import { msHastaMedianoche, toISO, type ISODate } from '../fechas';

// La fecha de hoy, que se actualiza sola a medianoche y al volver a la app
// (el móvil puede dejar la app dormida de un día para otro).
export function useHoy(): ISODate {
  const [hoy, setHoy] = useState(() => toISO(new Date()));

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const actualizar = () => {
      setHoy(toISO(new Date()));
      clearTimeout(temporizador);
      temporizador = setTimeout(actualizar, msHastaMedianoche(new Date()) + 1000);
    };
    const alVolver = () => {
      if (document.visibilityState === 'visible') actualizar();
    };
    actualizar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  return hoy;
}

// La hora actual, que avanza sola cada minuto (justo al cambiar de minuto).
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      setAhora(new Date());
      temporizador = setTimeout(siguiente, 60_000 - (Date.now() % 60_000) + 50);
    };
    temporizador = setTimeout(siguiente, 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(temporizador);
  }, []);
  return ahora;
}
