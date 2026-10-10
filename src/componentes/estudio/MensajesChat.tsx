// Las burbujas de una conversación: las usan el chat del PC y la lectura de chats compartidos en el móvil.
import { useEffect, useState } from 'react';
import type { Mensaje } from '../../estudio/tipos';
import { Markdown } from '../Markdown';

// `fuente`: la URL de la imagen, o una promesa (en el móvil se descarga de GitHub).
function Miniatura({ fuente }: { fuente: string | Promise<string> }) {
  const [src, setSrc] = useState(typeof fuente === 'string' ? fuente : '');
  useEffect(() => {
    if (typeof fuente === 'string') setSrc(fuente);
    else void fuente.then(setSrc, () => undefined);
  }, [fuente]);
  return src ? <img src={src} alt="Captura" /> : <span className="detalle">🖼</span>;
}

export function MensajesChat({ mensajes, imagen }: { mensajes: Mensaje[]; imagen(nombre: string): string | Promise<string> }) {
  return (
    <>
      {mensajes.map((m, i) =>
        m.rol === 'diego' ? (
          <div key={i} className="burbuja-diego">
            {m.texto}
            {m.imagenes?.length ? <div className="miniaturas">{m.imagenes.map((n) => <Miniatura key={n} fuente={imagen(n)} />)}</div> : null}
          </div>
        ) : m.rol === 'claude' ? (
          <Markdown key={i} texto={m.texto} formulas className="markdown burbuja-claude" />
        ) : (
          <p key={i} className="linea-herramienta">{m.texto}</p>
        ),
      )}
    </>
  );
}
