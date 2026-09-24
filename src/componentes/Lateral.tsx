import { Fragment } from 'react';
import { ordenarProyectos } from '../agenda/proyectos';
import { contarPendientes } from '../agenda/tareas';
import { ideasDe } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { colorDeArea } from './areas';
import { SECCIONES, URL_USO_CLAUDE, type Destino, type Pantalla } from './navegacion';

interface Props {
  actual: Pantalla;
  ir(d: Destino): void;
  bloqueado: boolean;
}

export function Lateral({ actual, ir, bloqueado }: Props) {
  const { datos } = useDatos();
  const activos = ordenarProyectos(datos.proyectos).filter((p) => p.estado === 'activo');
  const numeros: Partial<Record<Pantalla, number>> = {
    tareas: contarPendientes(datos.tareas),
    ideas: ideasDe(datos.ideas).length,
  };

  const item = (s: (typeof SECCIONES)[number]) => (
    <button
      key={s.id}
      className={`item-lateral${actual === s.id ? ' activo' : ''}`}
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
          {item(s)}
          {s.id === 'proyectos' &&
            activos.map((p) => (
              <button
                key={p.id}
                className="item-lateral sub"
                disabled={bloqueado}
                onClick={() => ir({ pantalla: 'proyectos', proyecto: p.id })}
              >
                <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
                {p.titulo}
              </button>
            ))}
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
