import { useCallback, useEffect, useRef, useState } from 'react';
import type { AjustesHorario } from '../datos/horario';
import { ErrorDatos } from '../datos/yaml';
import { ErrorGitHub } from '../github/cliente';
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

type Cambio = (a: AjustesHorario) => AjustesHorario;

// Qué decirle a Diego si algo del horario falla. Un archivo mal escrito siempre se explica (si no, los cambios
// fallarían sin decir nada); al cargar, sin conexión no se dice nada (se ve el último horario guardado).
export function mensajeError(e: unknown, alGuardar: boolean): string | null {
  if (e instanceof ErrorDatos)
    return `Error en ${e.archivo}: ${e.message}. No se puede cambiar el horario hasta que se arregle (pídeselo a Claude).`;
  if (!alGuardar) return null;
  if (e instanceof ErrorGitHub && e.tipo === 'red') return 'Sin conexión: el cambio del horario no se ha guardado.';
  return e instanceof Error ? `No se ha podido guardar el cambio del horario: ${e.message}` : 'No se ha podido guardar el cambio del horario.';
}

// Guarda un cambio: si sale bien, queda lo que hay en GitHub; si falla, se vuelve a lo de antes y se explica.
export async function guardarCambio(
  previo: Horario, cambio: Cambio, guardar: (c: Cambio) => Promise<AjustesHorario>,
): Promise<{ horario: Horario; error: string | null }> {
  try {
    return { horario: { ...previo, ajustes: await guardar(cambio) }, error: null };
  } catch (e) {
    return { horario: previo, error: mensajeError(e, true) };
  }
}

// Horario de clases: se lee al abrir la pantalla y al volver a la app. Si falla, se queda el último que se vio.
export function useHorario(): {
  horario: Horario;
  error: string | null;
  cerrarError(): void;
  cambiarAjustes(cambio: Cambio, mensaje: string): Promise<boolean>;
} {
  const { config, estado } = useDatos();
  const [horario, setHorario] = useState<Horario>(leerCache);
  const [error, setError] = useState<string | null>(null);
  const actual = useRef(horario);
  actual.current = horario;

  const traer = useCallback(async () => {
    if (!config || estado !== 'listo') return;
    try {
      const h = await cargarHorario(config);
      setHorario(h);
      guardarCache(h);
      setError(null);
    } catch (e) {
      // sin conexión: se queda lo que había, sin molestar; archivo roto: se explica
      const m = mensajeError(e, false);
      if (m) setError(m);
    }
  }, [config, estado]);

  useEffect(() => {
    void traer();
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [traer]);

  const cambiarAjustes = useCallback(async (cambio: Cambio, mensaje: string) => {
    if (!config) return false;
    const previo = actual.current;
    setHorario({ ...previo, ajustes: cambio(previo.ajustes) });
    const r = await guardarCambio(previo, cambio, (c) => modificarAjustesHorario(config, c, mensaje));
    setHorario(r.horario);
    setError(r.error);
    if (!r.error) guardarCache(r.horario);
    return r.error === null;
  }, [config]);

  return { horario, error, cerrarError: () => setError(null), cambiarAjustes };
}
