import { Fragment, useState } from 'react';
import { ordenarProyectos } from '../agenda/proyectos';
import { contarPendientes } from '../agenda/tareas';
import { useDatos } from '../estado/datos';
import { colorDeArea } from '../agenda/areas';
import { Icono } from './Icono';
import { SECCIONES, URL_USO_CLAUDE, type Destino, type Pantalla, type Pestana } from './navegacion';

interface Props {
  actual: Pantalla;
  pestana: Pestana | null;
  ir(d: Destino): void;
  bloqueado: boolean;
  proyectoAbierto: string | null;
}

const CLAVE_DESPLEGADO = 'sc-lateral-proyectos';

function leerDesplegado(): boolean {
  try {
    return localStorage.getItem(CLAVE_DESPLEGADO) !== 'no';
  } catch {
    return true;
  }
}

export function Lateral({ actual, pestana, ir, bloqueado, proyectoAbierto }: Props) {
  const { datos } = useDatos();
  const activos = ordenarProyectos(datos.proyectos).filter((p) => p.estado === 'activo');
  const numeros: Partial<Record<Pantalla, number>> = {
    tareas: contarPendientes(datos.tareas),
  };
  const [desplegado, setDesplegado] = useState(leerDesplegado);
  const alternar = () => {
    setDesplegado((d) => {
      try {
        localStorage.setItem(CLAVE_DESPLEGADO, d ? 'no' : 'si');
      } catch {
        /* sin almacenamiento */
      }
      return !d;
    });
  };

  const item = (s: (typeof SECCIONES)[number]) => (
    <button
      key={s.id}
      className={`item-lateral${actual === s.id && !(s.id === 'proyectos' && pestana === 'ideas') ? ' activo' : ''}`}
      disabled={bloqueado && s.id !== 'ajustes'}
      onClick={() => ir({ pantalla: s.id })}
    >
      <span className="icono">{s.icono}</span>
      {s.nombre}
      {numeros[s.id] ? <span className="numero-lateral">{numeros[s.id]}</span> : null}
    </button>
  );

  return (
    <nav className="lateral" aria-label="Secciones">
      <div className="marca">
        <span className="logo">✦</span>Segundo cerebro
      </div>
      {SECCIONES.filter((s) => s.id !== 'ajustes').map((s) => (
        <Fragment key={s.id}>
          {s.id === 'proyectos' ? (
            <div className="fila-lateral">
              {item(s)}
              <button
                className="flecha-lateral"
                aria-expanded={desplegado}
                aria-label={desplegado ? 'Plegar proyectos' : 'Desplegar proyectos'}
                onClick={alternar}
              >
                {desplegado ? '▾' : '▸'}
              </button>
            </div>
          ) : (
            item(s)
          )}
          {s.id === 'proyectos' && desplegado && (
            <>
              <button
                className={`item-lateral sub${actual === 'proyectos' && pestana === 'ideas' ? ' activo' : ''}`}
                disabled={bloqueado}
                onClick={() => ir({ pantalla: 'proyectos', pestana: 'ideas' })}
              >
                <span className="icono">💡</span>Ideas
                {datos.ideas.length ? <span className="numero-lateral">{datos.ideas.length}</span> : null}
              </button>
              {activos.map((p) => (
                <button
                  key={p.id}
                  className={`item-lateral sub${proyectoAbierto === p.id ? ' activo' : ''}`}
                  disabled={bloqueado}
                  onClick={() => ir({ pantalla: 'proyectos', proyecto: p.id })}
                >
                  <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
                  <Icono nombre={p.icono} />
                  {p.titulo}
                </button>
              ))}
            </>
          )}
        </Fragment>
      ))}
      <div className="hueco" />
      <a className="item-lateral" href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">
        <span className="icono">📊</span>Uso de Claude
      </a>
      {item(SECCIONES.find((s) => s.id === 'ajustes')!)}
    </nav>
  );
}
