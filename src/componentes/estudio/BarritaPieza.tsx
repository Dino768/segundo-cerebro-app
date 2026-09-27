import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { FONDOS, pasoLetra, type AspectoNota, type CambioEstilo } from '../../estudio/estiloNota';
import { COLORES } from '../../estudio/herramientas';
import { SIN_FONDO } from '../../estudio/pizarra';

interface Props {
  x: number; // caja de la pieza en píxeles del lienzo (ya con el zoom)
  y: number;
  ancho: number;
  alto: number;
  idPieza: string;
  nota: AspectoNota | null; // null: pieza de Claude, solo se puede borrar
  alBorrar(): void;
  alEstilo(c: CambioEstilo): void;
}

const HUECO_ARRIBA = 56; // si no cabe encima, sale debajo

// Los botones de la barrita no deben robarle el foco al lienzo al pulsarlos con el ratón: si no,
// Ctrl+Z y Supr dejan de funcionar hasta volver a tocar el lienzo. Los marca `data-sin-foco` y el
// contenedor evita el foco por defecto solo en ellos (nunca en el selector de color, que sí debe abrirse).
const sinFoco = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('[data-sin-foco]')) e.preventDefault();
};

// Un <input type="color"> nativo dispara "input" (lo que React llama onChange) en cada tirón dentro
// del selector: aplicarlo en cada uno deshace y guarda de más, y si algo cierra el menú a mitad
// (como hacía `elegir`), el selector se desconecta con el color a medias. Por eso solo se aplica en
// el "change" nativo (cuando Diego confirma el color), escuchado a mano porque React solo ofrece
// onChange, que aquí equivale al evento "input".
function ColorPropio({ etiqueta, alElegir }: { etiqueta: string; alElegir(color: string): void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const elegirRef = useRef(alElegir);
  elegirRef.current = alElegir;
  useEffect(() => {
    const el = entrada.current;
    if (!el) return;
    const alCambiar = () => elegirRef.current(el.value);
    el.addEventListener('change', alCambiar);
    return () => el.removeEventListener('change', alCambiar);
  }, []);
  return (
    <label className="color color-propio" title="Otro color">
      +
      <input ref={entrada} type="color" aria-label={etiqueta} />
    </label>
  );
}

// Barrita que sale sobre la pieza seleccionada: borrar y, en las notas, fondo, color y tamaño de letra. Y el tirador de la esquina.
export function BarritaPieza({ x, y, ancho, alto, idPieza, nota, alBorrar, alEstilo }: Props) {
  const [menu, setMenu] = useState<'fondo' | 'letra' | null>(null);
  const abajo = y < HUECO_ARRIBA;
  const elegir = (c: CambioEstilo) => {
    setMenu(null);
    alEstilo(c);
  };
  return (
    <>
      <div
        className={`barrita-pieza${abajo ? ' abajo' : ''}`}
        style={{ left: x, top: abajo ? y + alto : y }}
        data-fuera-de-foto
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={sinFoco}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button data-sin-foco className="peligro" aria-label="Borrar" title="Borrar" onClick={alBorrar}>🗑</button>
        {nota && (
          <>
            <span className="con-menu">
              <button data-sin-foco className={menu === 'fondo' ? 'encendida' : ''} aria-expanded={menu === 'fondo'} onClick={() => setMenu(menu === 'fondo' ? null : 'fondo')}>Fondo ▾</button>
              {menu === 'fondo' && (
                <div className="menu-colores" role="menu">
                  <button data-sin-foco className={`sin-color${nota.fondo === SIN_FONDO ? ' encendida' : ''}`} onClick={() => elegir({ fondo: SIN_FONDO })}>Sin fondo</button>
                  {FONDOS.map((c) => (
                    <button data-sin-foco key={c} className={`color${nota.fondo === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Fondo ${c}`} onClick={() => elegir({ fondo: c })} />
                  ))}
                  <ColorPropio etiqueta="Elegir otro fondo" alElegir={(color) => elegir({ fondo: color })} />
                </div>
              )}
            </span>
            <span className="con-menu">
              <button data-sin-foco className={menu === 'letra' ? 'encendida' : ''} aria-expanded={menu === 'letra'} onClick={() => setMenu(menu === 'letra' ? null : 'letra')}>
                Letra <span className="muestra-color" style={{ background: nota.colorTexto ?? 'var(--texto)' }} /> ▾
              </button>
              {menu === 'letra' && (
                <div className="menu-colores" role="menu">
                  <button data-sin-foco className={`sin-color${!nota.colorTexto ? ' encendida' : ''}`} onClick={() => elegir({ colorTexto: null })}>Normal</button>
                  {COLORES.map((c) => (
                    <button data-sin-foco key={c} className={`color${nota.colorTexto === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Letra ${c}`} onClick={() => elegir({ colorTexto: c })} />
                  ))}
                  <ColorPropio etiqueta="Elegir otro color de letra" alElegir={(color) => elegir({ colorTexto: color })} />
                </div>
              )}
            </span>
            <button data-sin-foco aria-label="Letra más pequeña" title="Letra más pequeña" disabled={nota.tamanoLetra === 'pequena'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, -1) })}>A−</button>
            <button data-sin-foco aria-label="Letra más grande" title="Letra más grande" disabled={nota.tamanoLetra === 'enorme'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, 1) })}>A+</button>
          </>
        )}
      </div>
      {nota && <div className="tirador" data-tirador={idPieza} data-fuera-de-foto title="Cambiar el tamaño (Mayús: solo el ancho)" style={{ left: x + ancho, top: y + alto }} />}
    </>
  );
}
