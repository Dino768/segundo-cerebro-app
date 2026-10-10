// Para el móvil y la web: leer los chats que Diego ha compartido desde el PC o el portátil (spec chats compartidos §5.6).
import { useEffect, useMemo, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { useDatos } from '../../estado/datos';
import { imagenDeChat, leerInfoRemota, leerMensajesRemotos, listarRemotos } from '../../estudio/chatsCompartidos';
import { tituloConversacion } from '../../estudio/conversacion';
import type { Mensaje } from '../../estudio/tipos';
import { MensajesChat } from './MensajesChat';

interface Fila {
  id: string;
  titulo: string;
  actualizado: string;
}

export function ListaChatsCompartidos({ chats, alAbrir }: { chats: Fila[]; alAbrir(id: string): void }) {
  if (!chats.length)
    return <p className="vacio">Aún no has compartido ningún chat de esta asignatura. Se comparten desde el PC o el portátil con «☁ Compartir».</p>;
  return (
    <ul className="lista">
      {chats.map((c) => (
        <li key={c.id} className="fila-proyecto">
          <button className="titulo-tarea" onClick={() => alAbrir(c.id)}>☁ {c.titulo}</button>
          <span className="detalle">{new Date(c.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
        </li>
      ))}
    </ul>
  );
}

function LectorChat({ asignatura, fila, alVolver }: { asignatura: Asignatura; fila: Fila; alVolver(): void }) {
  const { config } = useDatos();
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagen = useMemo(
    () => (config ? imagenDeChat(config, asignatura.id, fila.id) : () => Promise.reject(new Error('Sin llave de GitHub'))),
    [config, asignatura.id, fila.id],
  );
  useEffect(() => {
    if (!config) return;
    leerMensajesRemotos(config, asignatura.id, fila.id).then(setMensajes, (e: Error) => setError(e.message));
  }, [config, asignatura.id, fila.id]);
  return (
    <section className="tarjeta chat-compartido">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">☁ {fila.titulo}</span>
      </div>
      <p className="detalle">Solo lectura: para seguir este chat, ábrelo en el PC o el portátil.</p>
      {error && <p className="banner error">No se ha podido abrir: {error}</p>}
      {!mensajes && !error && <p className="cargando">Cargando…</p>}
      {mensajes && (
        <div className="chat-mensajes">
          <MensajesChat mensajes={mensajes} imagen={imagen} />
        </div>
      )}
    </section>
  );
}

export function ChatsCompartidos({ asignatura }: { asignatura: Asignatura }) {
  const { config } = useDatos();
  const [chats, setChats] = useState<Fila[] | null>(null);
  const [abierto, setAbierto] = useState<Fila | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    let vivo = true;
    void (async () => {
      try {
        const remotos = await listarRemotos(config, asignatura.id);
        const filas = await Promise.all(
          remotos.map(async (r) => {
            const info = await leerInfoRemota(config, asignatura.id, r.id).catch(() => null);
            // Sin nombre puesto por Diego, el título es su primera pregunta (como en el PC).
            const titulo = info?.nombre ?? (tituloConversacion(await leerMensajesRemotos(config, asignatura.id, r.id).catch(() => [])) || 'Chat');
            return { id: r.id, titulo, actualizado: info?.actualizado ?? new Date(0).toISOString() };
          }),
        );
        if (vivo) setChats(filas.sort((a, b) => b.actualizado.localeCompare(a.actualizado)));
      } catch {
        if (vivo) setAviso('Sin conexión: no se pueden ver los chats compartidos.');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [config, asignatura.id]);

  if (!config) return null;
  if (abierto) return <LectorChat asignatura={asignatura} fila={abierto} alVolver={() => setAbierto(null)} />;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Chats compartidos</h2>
      {aviso && <p className="detalle">{aviso}</p>}
      {!chats && !aviso && <p className="cargando">Cargando…</p>}
      {chats && <ListaChatsCompartidos chats={chats} alAbrir={(id) => setAbierto(chats.find((c) => c.id === id) ?? null)} />}
    </section>
  );
}
