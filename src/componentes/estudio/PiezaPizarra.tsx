import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Pieza } from '../../estudio/pizarra';
import { limpiarSvg } from '../../estudio/svg';
import { Markdown } from '../Markdown';
import { Formula } from './Formula';
import { Grafica } from './Grafica';

interface Props {
  pieza: Pieza;
  x: number;
  y: number;
  seleccionada: boolean;
  imagen(ruta: string): Promise<string>;
  alMedir(id: string, w: number, h: number): void;
}

export const PiezaPizarra = memo(function PiezaPizarra({ pieza, x, y, seleccionada, imagen, alMedir }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => alMedir(pieza.id, el.offsetWidth, el.offsetHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [pieza.id, alMedir]);

  return (
    <div
      ref={ref}
      data-pieza={pieza.id}
      className={`pieza pieza-${pieza.tipo}${seleccionada ? ' seleccionada' : ''}`}
      style={{ left: x, top: y, width: pieza.ancho, ...(pieza.color ? { borderColor: pieza.color } : {}) }}
    >
      <Contenido pieza={pieza} imagen={imagen} />
    </div>
  );
});

function Contenido({ pieza, imagen }: { pieza: Pieza; imagen(ruta: string): Promise<string> }) {
  switch (pieza.tipo) {
    case 'texto':
      return <Markdown texto={pieza.contenido} formulas className="markdown-pieza" />;
    case 'nota':
      return <p className="texto-nota">{pieza.contenido}</p>;
    case 'formula':
      return <Formula tex={pieza.contenido} bloque />;
    case 'grafica':
      return <Grafica contenido={pieza.contenido} ancho={pieza.ancho} />;
    case 'dibujo':
      return <div className="dibujo" dangerouslySetInnerHTML={{ __html: limpiarSvg(pieza.contenido) }} />;
    case 'imagen':
      return <ImagenPieza ruta={pieza.contenido} imagen={imagen} />;
  }
}

function ImagenPieza({ ruta, imagen }: { ruta: string; imagen(ruta: string): Promise<string> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true;
    imagen(ruta).then(
      (u) => vivo && setUrl(u),
      () => vivo && setFallo(true),
    );
    return () => {
      vivo = false;
    };
  }, [ruta, imagen]);
  if (fallo) return <p className="detalle">No se ha podido cargar la imagen.</p>;
  return url ? <img src={url} alt="" draggable={false} /> : <p className="detalle">Cargando imagen…</p>;
}
