import { useCallback, useEffect, useState } from 'react';
import type { AjustesHorario } from '../datos/horario';
import { cargarHorario, HORARIO_VACIO, modificarAjustesHorario, type Horario } from '../repositorio';
import { useDatos } from './datos';

// El horario se guarda también en este dispositivo para verlo sin internet (por los pasillos de la uni).
const CLAVE = 'sc-horario';

function leerCache(): Horario {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Horario | null;
    if (v && Array.isArray(v.clases) && v.ajustes && Array.isArray(v.ajustes.quitadas) && Array.isArray(v.ajustes.sueltas)) return v;
  } catch {
    // sin almacenamiento o roto
  }
  return HORARIO_VACIO;
}

function guardarCache(h: Horario): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(h));
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

// Horario de clases: se lee al abrir la pantalla y al volver a la app. Si falla, se queda el último que se vio.
export function useHorario(): {
  horario: Horario;
  cambiarAjustes(cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string): Promise<boolean>;
} {
  const { config, estado } = useDatos();
  const [horario, setHorario] = useState<Horario>(leerCache);

  const traer = useCallback(async () => {
    if (!config || estado !== 'listo') return;
    try {
      const h = await cargarHorario(config);
      setHorario(h);
      guardarCache(h);
    } catch {
      // sin conexión o archivo roto: se queda lo que había
    }
  }, [config, estado]);

  useEffect(() => {
    void traer();
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [traer]);

  const cambiarAjustes = useCallback(async (cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string) => {
    if (!config) return false;
    setHorario((h) => ({ ...h, ajustes: cambio(h.ajustes) }));
    try {
      const ajustes = await modificarAjustesHorario(config, cambio, mensaje);
      setHorario((h) => {
        const nuevo = { ...h, ajustes };
        guardarCache(nuevo);
        return nuevo;
      });
      return true;
    } catch {
      await traer();
      return false;
    }
  }, [config, traer]);

  return { horario, cambiarAjustes };
}
