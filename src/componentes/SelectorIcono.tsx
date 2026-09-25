import { useEffect, useState } from 'react';
import { buscarIconos, cargarColeccion, coleccionCargada, type Coleccion } from '../iconos/coleccion';
import { Icono } from './Icono';

interface Props {
  icono?: string;
  elegir(icono: string | undefined): void;
  disabled?: boolean;
}

export function SelectorIcono({ icono, elegir, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="selector-icono"
        disabled={disabled}
        aria-label={icono ? 'Cambiar icono' : 'Elegir icono'}
        title={icono ?? 'Elegir icono'}
        onClick={() => setAbierto(true)}
      >
        {icono ? <Icono nombre={icono} tamano={20} /> : <span className="hueco-icono">+</span>}
      </button>
      {abierto && (
        <VentanaIconos
          actual={icono}
          elegir={(i) => {
            elegir(i);
            setAbierto(false);
          }}
          cerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

// La ventana se pinta dentro del <form> de tarea/idea: sin esto, Enter en el buscador enviaría ese formulario.
export function alTecleoBuscador(e: { key: string; preventDefault(): void }): void {
  if (e.key === 'Enter') e.preventDefault();
}

export function VentanaIconos({ actual, elegir, cerrar }: { actual?: string; elegir(i: string | undefined): void; cerrar(): void }) {
  const [consulta, setConsulta] = useState('');
  const [coleccion, setColeccion] = useState<Coleccion | null>(coleccionCargada);
  const [sinConexion, setSinConexion] = useState(false);
  useEffect(() => {
    if (coleccion) return;
    let vivo = true;
    cargarColeccion()
      .then((c) => vivo && setColeccion(c))
      .catch(() => vivo && setSinConexion(true));
    return () => {
      vivo = false;
    };
  }, [coleccion]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [cerrar]);
  const iconos = buscarIconos(consulta, coleccion);
  return (
    <div className="fondo-modal dialogo" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="modal ventana-iconos" role="dialog" aria-modal="true" aria-label="Elegir icono">
        <input
          autoFocus
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={alTecleoBuscador}
          placeholder="Busca: música, examen, cube…"
          aria-label="Buscar icono"
        />
        {sinConexion && <p className="nota-form">Conéctate para ver todos los iconos. Mientras, tienes los más usados.</p>}
        <div className="rejilla-iconos">
          {iconos.map((n) => (
            <button key={n} type="button" className={n === actual ? 'activa' : ''} title={n} aria-label={n} onClick={() => elegir(n)}>
              <Icono nombre={n} tamano={22} />
            </button>
          ))}
          {iconos.length === 0 && <p className="vacio">No hay iconos con «{consulta}».</p>}
        </div>
        <div className="botones-dialogo">
          <button type="button" onClick={() => elegir(undefined)}>Sin icono</button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
