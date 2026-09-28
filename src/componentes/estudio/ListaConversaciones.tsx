import { useEffect, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { confirmar, pedirTexto } from '../../estado/dialogos';
import { buscarChats } from '../../estudio/buscarChats';
import type { EntradaHistorial } from '../../estudio/historial';
import { borrarConversacion, listarConversaciones, renombrarConversacion } from '../../estudio/local';
import type { ResumenConversacion } from '../../estudio/tipos';
import { ListaHistorial } from './Historial';

interface Props {
  asignatura: Asignatura;
  alAbrir(id: string, titulo: string): void;
  alNueva(): void;
  alVolver(): void;
  alAbrirHistorial(e: EntradaHistorial): void;
  alRenombrada(id: string, titulo: string): void; // para cambiar el título del chat abierto
  alBorrada(id: string): void; // si era el chat abierto, se empieza uno nuevo
}

interface PropsFilas {
  lista: ResumenConversacion[];
  busqueda: string;
  alBuscar(texto: string): void;
  alAbrir(c: ResumenConversacion): void;
  alRenombrar(c: ResumenConversacion): void;
  alBorrar(c: ResumenConversacion): void;
}

// La casilla de buscar y los chats que encajan, cada uno con ✏️ (cambiar el nombre) y 🗑 (borrar).
export function FilasChats({ lista, busqueda, alBuscar, alAbrir, alRenombrar, alBorrar }: PropsFilas) {
  const vistos = buscarChats(lista, busqueda);
  return (
    <>
      <input className="buscar-chats" type="search" placeholder="🔎 Buscar chat…" aria-label="Buscar chat" value={busqueda} onChange={(e) => alBuscar(e.target.value)} />
      {vistos.length === 0 && <p className="vacio">Ningún chat se llama así.</p>}
      <ul className="lista">
        {vistos.map((c) => (
          <li key={c.id} className="fila-proyecto">
            <button className="titulo-tarea" onClick={() => alAbrir(c)}>{c.titulo}</button>
            <span className="detalle">{new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            <button className="enlace" aria-label="Cambiar el nombre" title="Cambiar el nombre" onClick={() => alRenombrar(c)}>✏️</button>
            <button className="enlace peligro" aria-label="Borrar el chat" title="Borrar el chat" onClick={() => alBorrar(c)}>🗑</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ListaConversaciones({ asignatura, alAbrir, alNueva, alVolver, alAbrirHistorial, alRenombrada, alBorrada }: Props) {
  const [lista, setLista] = useState<ResumenConversacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listarConversaciones(asignatura.id).then(setLista, (e: Error) => setError(e.message));
  }, [asignatura.id]);

  const renombrar = async (c: ResumenConversacion) => {
    const nombre = await pedirTexto('Nombre del chat (vacío: el de su primera pregunta)', { inicial: c.titulo, permitirVacio: true });
    if (nombre === null || nombre === c.titulo) return;
    try {
      await renombrarConversacion(asignatura.id, c.id, nombre);
      setError(null);
      const nueva = await listarConversaciones(asignatura.id);
      setLista(nueva);
      alRenombrada(c.id, nueva.find((x) => x.id === c.id)?.titulo ?? nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const borrar = async (c: ResumenConversacion) => {
    const ok = await confirmar(
      `¿Borrar el chat «${c.titulo}»? Se borra la conversación y sus pizarras a medias. Las pizarras que guardaste en el historial se quedan. No se puede deshacer.`,
      { aceptar: 'Borrar', peligro: true },
    );
    if (!ok) return;
    try {
      await borrarConversacion(asignatura.id, c.id);
      setError(null);
      setLista((l) => l?.filter((x) => x.id !== c.id) ?? l);
      alBorrada(c.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="lista-conversaciones">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>▸ Volver al chat</button>
        <span className="titulo-chat" />
        <button onClick={alNueva}>+ Nueva</button>
      </div>
      <h3>Conversaciones</h3>
      {error && <p className="banner error">{error}</p>}
      {!lista && !error && <p className="cargando">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Aún no hay conversaciones.</p>}
      {lista && lista.length > 0 && (
        <FilasChats
          lista={lista}
          busqueda={busqueda}
          alBuscar={setBusqueda}
          alAbrir={(c) => alAbrir(c.id, c.titulo)}
          alRenombrar={(c) => void renombrar(c)}
          alBorrar={(c) => void borrar(c)}
        />
      )}
      <h3>Historial</h3>
      <ListaHistorial asignatura={asignatura} alAbrir={alAbrirHistorial} />
    </div>
  );
}
