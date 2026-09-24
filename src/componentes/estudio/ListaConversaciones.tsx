import { useEffect, useState } from 'react';
import { listarConversaciones } from '../../estudio/local';
import type { ResumenConversacion } from '../../estudio/tipos';

interface Props {
  asignatura: string;
  alAbrir(id: string): void;
  alNueva(): void;
  alVolver(): void;
}

export function ListaConversaciones({ asignatura, alAbrir, alNueva, alVolver }: Props) {
  const [lista, setLista] = useState<ResumenConversacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarConversaciones(asignatura).then(setLista, (e: Error) => setError(e.message));
  }, [asignatura]);

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
      <ul className="lista">
        {lista?.map((c) => (
          <li key={c.id} className="fila-proyecto">
            <button className="titulo-tarea" onClick={() => alAbrir(c.id)}>{c.titulo}</button>
            <span className="detalle">{new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
