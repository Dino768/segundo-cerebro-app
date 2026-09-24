import { useCallback, useEffect, useState } from 'react';
import { hayProgramaLocal, urlEventos } from './local';
import type { EventoPizarra } from './tipos';

export type EstadoLocal = 'comprobando' | 'si' | 'no' | 'cerrado';

// ¿Está el programa local? Si se cierra, se vuelve a buscar cada 5 segundos.
export function useLocal(): { estado: EstadoLocal; suscribir(f: (e: EventoPizarra) => void): () => void } {
  const [estado, setEstado] = useState<EstadoLocal>('comprobando');
  const [oyentes] = useState(() => new Set<(e: EventoPizarra) => void>());

  useEffect(() => {
    let cerrado = false;
    let fuente: EventSource | null = null;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    const conectar = async (yaEstaba: boolean) => {
      const hay = await hayProgramaLocal();
      if (cerrado) return;
      if (!hay) {
        setEstado(yaEstaba ? 'cerrado' : 'no');
        if (yaEstaba) reintento = setTimeout(() => void conectar(true), 5000);
        return;
      }
      setEstado('si');
      fuente = new EventSource(urlEventos());
      fuente.onmessage = (m) => {
        try {
          const e = JSON.parse(m.data) as EventoPizarra;
          oyentes.forEach((f) => f(e));
        } catch {
          // aviso roto: se ignora
        }
      };
      fuente.onerror = () => {
        fuente?.close();
        fuente = null;
        if (!cerrado) void conectar(true);
      };
    };
    void conectar(false);
    return () => {
      cerrado = true;
      clearTimeout(reintento);
      fuente?.close();
    };
  }, [oyentes]);

  const suscribir = useCallback(
    (f: (e: EventoPizarra) => void) => {
      oyentes.add(f);
      return () => {
        oyentes.delete(f);
      };
    },
    [oyentes],
  );

  return { estado, suscribir };
}
