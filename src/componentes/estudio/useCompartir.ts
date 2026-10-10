// El botón ☁ de un chat de la zona de estudio: compartirlo, subirlo solo y traer lo del otro ordenador (spec chats compartidos §5).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { confirmar } from '../../estado/dialogos';
import { useDatos } from '../../estado/datos';
import { toISO } from '../../fechas';
import type { Config } from '../../github/cliente';
import { bajarPaquete, listarRemotos, quitarRemoto, subirPaquete } from '../../estudio/chatsCompartidos';
import {
  borrarConversacion, copiarChatLocal, instalarPaqueteLocal, leerCompartidosLocal, ponerCompartidoLocal, prepararPaqueteLocal,
} from '../../estudio/local';
import { crearSincronizador, type ResultadoSubida } from '../../estudio/sincronizador';
import { crearSubidaDiferida } from '../../estudio/subidaDiferida';

export type EstadoCompartir = 'no' | 'subiendo' | 'pendiente' | 'hecho' | 'sin-token';

export function sincronizadorDe(cfg: Config) {
  return crearSincronizador({
    local: {
      preparar: prepararPaqueteLocal,
      instalar: instalarPaqueteLocal,
      copiar: copiarChatLocal,
      leerCompartidos: leerCompartidosLocal,
      poner: ponerCompartidoLocal,
      borrar: async (a, id) => void (await borrarConversacion(a, id)),
    },
    remoto: {
      listar: (a) => listarRemotos(cfg, a),
      subir: (a, id, archivos, titulo, esperada) => subirPaquete(cfg, a, id, archivos, titulo, esperada),
      bajar: (a, id) => bajarPaquete(cfg, a, id),
      quitar: (a, id, titulo) => quitarRemoto(cfg, a, id, titulo),
    },
    hoy: () => toISO(new Date()),
    avisar: async (m) => void (await confirmar(m, { aceptar: 'Entendido' })),
  });
}

const DE_RESULTADO: Record<ResultadoSubida, EstadoCompartir> = {
  hecho: 'hecho', pendiente: 'pendiente', conflicto: 'hecho', olvidado: 'no', 'no-compartido': 'no',
};

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

// `alCambiar(id)`: lo que se ve de ese chat ha cambiado por debajo (se ha traído lo del otro ordenador): hay que volver a leerlo.
export function useCompartir(asig: string, id: string | null, titulo: string, alCambiar?: (id: string) => void) {
  const { config } = useDatos();
  const sinc = useMemo(() => (config ? sincronizadorDe(config) : null), [config]);
  const [estado, setEstado] = useState<EstadoCompartir>('no');
  const [error, setError] = useState<string | null>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const tituloRef = useRef(titulo);
  tituloRef.current = titulo || 'Chat';
  const alCambiarRef = useRef(alCambiar);
  alCambiarRef.current = alCambiar;

  // Al abrir un chat: ¿está compartido? ¿quedó algo sin subir? Si está compartido, se trae lo del otro ordenador.
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    setEstado(config ? 'no' : 'sin-token');
    void (async () => {
      const c = await leerCompartidosLocal(asig).catch(() => null);
      if (!vivo || !config || !c) return;
      setEstado(!c[id] ? 'no' : c[id].pendiente ? 'pendiente' : 'hecho');
      if (!c[id] || !sinc) return;
      const r = await sinc.antesDeEnviar(asig, id, tituloRef.current).catch(() => 'igual' as const);
      if (r !== 'igual' && vivo) alCambiarRef.current?.(id);
    })();
    return () => {
      vivo = false;
    };
  }, [asig, id, config, sinc]);

  const subirAhora = useCallback(async () => {
    if (!sinc || !id) return;
    setEstado('subiendo');
    try {
      const r = await sinc.subir(asig, id, tituloRef.current);
      setEstado(DE_RESULTADO[r]);
      if (r === 'conflicto') alCambiarRef.current?.(id);
    } catch (e) {
      setError(mensajeDe(e));
      setEstado('pendiente');
    }
  }, [sinc, asig, id]);

  const diferida = useMemo(() => crearSubidaDiferida(subirAhora), [subirAhora]);
  useEffect(() => () => diferida.parar(), [diferida]);
  // Cuando vuelve internet, se sube lo que quedó pendiente.
  useEffect(() => {
    const alVolver = () => {
      if (estadoRef.current === 'pendiente') void diferida.ya();
    };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [diferida]);

  return {
    estado,
    error,
    quitarError: () => setError(null),
    async compartir() {
      if (!sinc || !id) return;
      setEstado('subiendo');
      try {
        setEstado(DE_RESULTADO[await sinc.compartir(asig, id, tituloRef.current)]);
      } catch (e) {
        // Por ejemplo, más de 50 MB: el chat no se comparte.
        setError(mensajeDe(e));
        await ponerCompartidoLocal(asig, id, null).catch(() => undefined);
        setEstado('no');
      }
    },
    async dejar() {
      if (!sinc || !id) return;
      const ok = await confirmar('¿Dejar de compartir este chat? Desaparece de tus otros dispositivos y se queda solo en este ordenador.', {
        aceptar: 'Dejar de compartir',
      });
      if (!ok) return;
      try {
        await sinc.dejarDeCompartir(asig, id, tituloRef.current);
        setEstado('no');
      } catch (e) {
        setError(`No se ha podido dejar de compartir: ${mensajeDe(e)}`);
      }
    },
    async antesDeEnviar(): Promise<'igual' | 'bajado' | 'conflicto'> {
      if (!sinc || !id || estadoRef.current === 'no' || estadoRef.current === 'sin-token') return 'igual';
      return sinc.antesDeEnviar(asig, id, tituloRef.current);
    },
    // Tras una respuesta de Claude (inmediato) o un cambio en la pizarra (se espera 5 s).
    tras(inmediato: boolean) {
      if (estadoRef.current === 'no' || estadoRef.current === 'sin-token') return;
      if (inmediato) void diferida.ya();
      else diferida.avisar();
    },
  };
}
