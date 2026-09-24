import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { dialogos, type Dialogo } from '../estado/dialogos';

// Un número por ventana: así cada pregunta empieza con su propio texto, aunque la app se vuelva a dibujar.
const numeros = new WeakMap<Dialogo, number>();
let siguiente = 0;
const numeroDe = (d: Dialogo) => numeros.get(d) ?? (numeros.set(d, ++siguiente), siguiente);

// Dibuja la ventana que toque (va una vez, en App).
export function Dialogos() {
  const dialogo = useSyncExternalStore(dialogos.suscribir, dialogos.actual);
  return dialogo ? <VentanaDialogo key={numeroDe(dialogo)} dialogo={dialogo} responder={dialogos.responder} /> : null;
}

interface Props {
  dialogo: Dialogo;
  responder(r: boolean | string | null): void;
}

export function VentanaDialogo({ dialogo, responder }: Props) {
  const [texto, setTexto] = useState(dialogo.tipo === 'texto' ? dialogo.inicial : '');
  const cancelar = () => responder(dialogo.tipo === 'texto' ? null : false);

  // Escape cancela, como en las ventanas del navegador.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  function aceptar(e: FormEvent) {
    e.preventDefault();
    responder(dialogo.tipo === 'texto' ? texto : true);
  }

  const peligro = dialogo.tipo === 'confirmar' && dialogo.peligro;
  return (
    <div className="fondo-modal dialogo" onClick={(e) => e.target === e.currentTarget && cancelar()}>
      <form className="modal" role="dialog" aria-modal="true" onSubmit={aceptar}>
        <p className="mensaje-dialogo">{dialogo.mensaje}</p>
        {dialogo.tipo === 'texto' && (
          <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} onFocus={(e) => e.target.select()} aria-label={dialogo.mensaje} />
        )}
        <div className="botones-dialogo">
          <button type="button" onClick={cancelar}>Cancelar</button>
          <button type="submit" className={peligro ? 'peligro' : 'principal'} autoFocus={dialogo.tipo === 'confirmar'}>
            {dialogo.aceptar}
          </button>
        </div>
      </form>
    </div>
  );
}
