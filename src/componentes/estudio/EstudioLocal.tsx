import { useCallback, useEffect, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { aplicarEvento } from '../../estudio/chat';
import { enviarMensaje, leerConversacion, listarConversaciones, pararRespuesta } from '../../estudio/local';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';
import type { Mensaje } from '../../estudio/tipos';
import type { useLocal } from '../../estudio/useLocal';
import { Chat, type ErrorChat } from './Chat';
import { ListaConversaciones } from './ListaConversaciones';

interface Props {
  asignatura: Asignatura;
  local: ReturnType<typeof useLocal>;
}

interface Conversacion {
  id: string;
  nueva: boolean;
}

const claveUltima = (asig: string) => `sc-estudio-conversacion-${asig}`;

export function EstudioLocal({ asignatura }: Props) {
  const [vista, setVista] = useState<'chat' | 'lista'>('chat');
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorChat | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<{ texto: string; imagenes: string[] } | null>(null);

  const abrir = useCallback(
    async (id: string) => {
      setVista('chat');
      setError(null);
      const ms = await leerConversacion(asignatura.id, id).catch(() => [] as Mensaje[]);
      setConv({ id, nueva: ms.length === 0 });
      setMensajes(ms);
      guardarPreferencia(claveUltima(asignatura.id), id);
    },
    [asignatura.id],
  );

  const nueva = useCallback(() => {
    setVista('chat');
    setError(null);
    setMensajes([]);
    setConv({ id: crypto.randomUUID(), nueva: true });
  }, []);

  // Al entrar, se abre la última conversación de esta asignatura (si sigue existiendo).
  useEffect(() => {
    const ultima = leerPreferencia(claveUltima(asignatura.id));
    listarConversaciones(asignatura.id)
      .then((lista) => (ultima && lista.some((c) => c.id === ultima) ? abrir(ultima) : nueva()))
      .catch(nueva);
  }, [asignatura.id, abrir, nueva]);

  async function enviar(texto: string, imagenes: string[]) {
    if (!conv || enviando) return;
    setUltimoEnvio({ texto, imagenes });
    setError(null);
    setEnviando(true);
    setMensajes((ms) => [...ms, imagenes.length ? { rol: 'diego', texto, imagenes } : { rol: 'diego', texto }]);
    await enviarMensaje(
      { asignatura: asignatura.id, id: conv.id, nueva: conv.nueva, texto, imagenes, pizarraAbierta: null },
      (e) => {
        if (e.tipo === 'error') setError({ mensaje: e.mensaje, uso: e.uso });
        else setMensajes((ms) => aplicarEvento(ms, e));
      },
    );
    setEnviando(false);
    // Se relee lo que guardó Claude Code: así la conversación queda igual que en la terminal.
    const guardados = await leerConversacion(asignatura.id, conv.id).catch(() => [] as Mensaje[]);
    if (guardados.length) {
      setMensajes(guardados);
      setConv({ id: conv.id, nueva: false });
      guardarPreferencia(claveUltima(asignatura.id), conv.id);
    }
  }

  if (!conv) return <p className="cargando">Cargando…</p>;

  return (
    <div className="estudio-local sin-pizarra">
      {vista === 'lista' ? (
        <ListaConversaciones asignatura={asignatura.id} alAbrir={(id) => void abrir(id)} alNueva={nueva} alVolver={() => setVista('chat')} />
      ) : (
        <Chat
          asignatura={asignatura.id}
          conversacion={conv.id}
          titulo={mensajes.find((m) => m.rol === 'diego')?.texto.slice(0, 60) ?? ''}
          mensajes={mensajes}
          enviando={enviando}
          error={error}
          alEnviar={(t, i) => void enviar(t, i)}
          alParar={() => void pararRespuesta(asignatura.id, conv.id).catch(() => undefined)}
          alReintentar={() => ultimoEnvio && void enviar(ultimoEnvio.texto, ultimoEnvio.imagenes)}
          alVerLista={() => setVista('lista')}
          alNueva={nueva}
        />
      )}
    </div>
  );
}
