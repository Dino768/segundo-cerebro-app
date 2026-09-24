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
