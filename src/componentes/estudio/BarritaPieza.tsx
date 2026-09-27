import { useState } from 'react';
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
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button className="peligro" aria-label="Borrar" title="Borrar" onClick={alBorrar}>🗑</button>
        {nota && (
          <>
            <span className="con-menu">
              <button className={menu === 'fondo' ? 'encendida' : ''} aria-expanded={menu === 'fondo'} onClick={() => setMenu(menu === 'fondo' ? null : 'fondo')}>Fondo ▾</button>
              {menu === 'fondo' && (
                <div className="menu-colores" role="menu">
                  <button className={`sin-color${nota.fondo === SIN_FONDO ? ' encendida' : ''}`} onClick={() => elegir({ fondo: SIN_FONDO })}>Sin fondo</button>
                  {FONDOS.map((c) => (
                    <button key={c} className={`color${nota.fondo === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Fondo ${c}`} onClick={() => elegir({ fondo: c })} />
                  ))}
                  <label className="color color-propio" title="Otro color">
                    +
                    <input type="color" aria-label="Elegir otro fondo" onChange={(e) => elegir({ fondo: e.target.value })} />
                  </label>
                </div>
              )}
            </span>
            <span className="con-menu">
              <button className={menu === 'letra' ? 'encendida' : ''} aria-expanded={menu === 'letra'} onClick={() => setMenu(menu === 'letra' ? null : 'letra')}>
                Letra <span className="muestra-color" style={{ background: nota.colorTexto ?? 'var(--texto)' }} /> ▾
              </button>
              {menu === 'letra' && (
                <div className="menu-colores" role="menu">
                  <button className={`sin-color${!nota.colorTexto ? ' encendida' : ''}`} onClick={() => elegir({ colorTexto: null })}>Normal</button>
                  {COLORES.map((c) => (
                    <button key={c} className={`color${nota.colorTexto === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Letra ${c}`} onClick={() => elegir({ colorTexto: c })} />
                  ))}
                  <label className="color color-propio" title="Otro color">
                    +
                    <input type="color" aria-label="Elegir otro color de letra" onChange={(e) => elegir({ colorTexto: e.target.value })} />
                  </label>
                </div>
              )}
            </span>
            <button aria-label="Letra más pequeña" title="Letra más pequeña" disabled={nota.tamanoLetra === 'pequena'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, -1) })}>A−</button>
            <button aria-label="Letra más grande" title="Letra más grande" disabled={nota.tamanoLetra === 'enorme'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, 1) })}>A+</button>
          </>
        )}
      </div>
      {nota && <div className="tirador" data-tirador={idPieza} data-fuera-de-foto title="Cambiar el tamaño (Mayús: solo el ancho)" style={{ left: x + ancho, top: y + alto }} />}
    </>
  );
}
