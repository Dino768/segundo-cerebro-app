import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { subirImagen, urlArchivo } from '../../estudio/local';
import type { Mensaje } from '../../estudio/tipos';
import { Markdown } from '../Markdown';
import { URL_USO_CLAUDE } from '../navegacion';

export interface ErrorChat {
  mensaje: string;
  uso?: boolean;
}

interface Props {
  asignatura: string;
  conversacion: string;
  titulo: string;
  mensajes: Mensaje[];
  enviando: boolean;
  error: ErrorChat | null;
  alEnviar(texto: string, imagenes: string[]): void;
  alParar(): void;
  alReintentar(): void;
  alVerLista(): void;
  alNueva(): void;
}

export function Chat(p: Props) {
  const [texto, setTexto] = useState('');
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [p.mensajes, p.enviando]);

  async function adjuntar(archivos: File[]) {
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'));
    if (!imagenes.length) return;
    setSubiendo((n) => n + imagenes.length);
    for (const img of imagenes) {
      try {
        const nombre = await subirImagen(p.asignatura, p.conversacion, img);
        setAdjuntos((a) => [...a, nombre]);
      } catch (e) {
        setAviso(e instanceof Error ? e.message : String(e));
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  function enviar() {
    const limpio = texto.trim();
    if ((!limpio && !adjuntos.length) || p.enviando || subiendo) return;
    p.alEnviar(limpio, adjuntos);
    setTexto('');
    setAdjuntos([]);
    setAviso(null);
  }

  const alTecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };
  const alPegar = (e: ClipboardEvent) => {
    const archivos = [...e.clipboardData.files];
    if (archivos.some((a) => a.type.startsWith('image/'))) {
      e.preventDefault();
      void adjuntar(archivos);
    }
  };
  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    void adjuntar([...e.dataTransfer.files]);
  };
  const esperando = p.enviando && p.mensajes.at(-1)?.rol !== 'claude';

  return (
    <div className="chat">
      <div className="chat-cabecera">
        <button className="enlace" onClick={p.alVerLista}>◂ Conversaciones</button>
        <span className="titulo-chat">{p.titulo || 'Conversación nueva'}</span>
        <button onClick={p.alNueva} disabled={p.enviando} aria-label="Conversación nueva">+</button>
      </div>
      <div className="chat-mensajes" ref={lista}>
        {p.mensajes.length === 0 && (
          <p className="vacio">Pregúntame lo que quieras de esta asignatura: ejercicios, cómo se hace algo, resúmenes… También puedes pegar una captura.</p>
        )}
        {p.mensajes.map((m, i) =>
          m.rol === 'diego' ? (
            <div key={i} className="burbuja-diego">
              {m.texto}
              {m.imagenes?.length ? (
                <div className="miniaturas">
                  {m.imagenes.map((n) => <img key={n} src={urlArchivo(p.asignatura, p.conversacion, `imagenes/${n}`)} alt="Captura" />)}
                </div>
              ) : null}
            </div>
          ) : m.rol === 'claude' ? (
            <Markdown key={i} texto={m.texto} formulas className="markdown burbuja-claude" />
          ) : (
            <p key={i} className="linea-herramienta">{m.texto}</p>
          ),
        )}
        {esperando && <p className="linea-herramienta">Claude está pensando…</p>}
      </div>
      {p.error && (
        <div className="banner error chat-aviso">
          {p.error.mensaje}
          {p.error.uso && <a href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">Uso de Claude</a>}
          <button onClick={p.alReintentar}>Reintentar</button>
        </div>
      )}
      {aviso && <div className="banner aviso chat-aviso">{aviso} <button onClick={() => setAviso(null)}>Cerrar</button></div>}
      {(adjuntos.length > 0 || subiendo > 0) && (
        <div className="miniaturas chat-adjuntos">
          {adjuntos.map((n) => (
            <button key={n} className="miniatura-adjunta" title="Quitar" onClick={() => setAdjuntos((a) => a.filter((x) => x !== n))}>
              <img src={urlArchivo(p.asignatura, p.conversacion, `imagenes/${n}`)} alt="Captura adjunta" />
            </button>
          ))}
          {subiendo > 0 && <span className="detalle">Subiendo…</span>}
        </div>
      )}
      <div
        className={`chat-escribir${arrastrando ? ' arrastrando' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
      >
        <label className="boton-adjuntar" title="Adjuntar captura">
          📎
          <input type="file" accept="image/*" multiple hidden onChange={(e) => void adjuntar([...(e.target.files ?? [])])} />
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTecla}
          onPaste={alPegar}
          placeholder="Escribe… (Enter envía, Mayús+Enter salta de línea)"
          aria-label="Mensaje para Claude"
          rows={2}
        />
        {p.enviando ? (
          <button onClick={p.alParar}>Parar</button>
        ) : (
          <button className="principal" onClick={enviar} disabled={(!texto.trim() && !adjuntos.length) || subiendo > 0}>➤</button>
        )}
      </div>
    </div>
  );
}
