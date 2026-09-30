import { Fragment, type ReactNode } from 'react';
import { arbolPorAreas, gruposAhora, type RamaTipo } from '../agenda/grupos';
import { ICONO_TIPO, PLURAL_TIPO } from '../agenda/tipos';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Icono } from '../componentes/Icono';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useDesplegables } from '../estado/desplegables';
import { useHoy } from '../estado/hoy';

export function Tareas({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [abiertos, fijar] = useDesplegables('tareas-por-areas');
  const grupos = gruposAhora(datos.tareas, hoy);
  const arbol = arbolPorAreas(datos.tareas, datos.areas, hoy);

  const lista = (ts: Tarea[], mostrarFecha: boolean) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  const desplegable = (id: string, titulo: ReactNode, total: number, hijos: ReactNode) => (
    <details key={id} className="desplegable" open={abiertos.has(id)} onToggle={(e) => fijar(id, e.currentTarget.open)}>
      <summary>
        {titulo}
        <span className="total">{total}</span>
      </summary>
      {hijos}
    </details>
  );

  const ramas = (dueno: string, tipos: RamaTipo[]) =>
    tipos.map((r) =>
      desplegable(
        `${dueno}:${r.tipo}`,
        <>
          <Icono nombre={ICONO_TIPO[r.tipo]} tamano={16} />
          {PLURAL_TIPO[r.tipo]}
        </>,
        r.tareas.length,
        lista(r.tareas, true),
      ),
    );

  return (
    <section>
      <div className="barra">
        <h2>Tareas</h2>
        <button className="principal" disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: {} })}>
          + Nueva tarea
        </button>
      </div>
      <div className="rejilla-tareas">
        <section className="tarjeta">
          <h2 className="titulo-seccion">Ahora</h2>
          {grupos.length === 0 && <p className="vacio">Nada pendiente por ahora.</p>}
          {grupos.map((g) =>
            g.plegado ? (
              <details key={g.clave} className="grupo-plegable">
                <summary className="grupo">{g.titulo} ({g.tareas.length})</summary>
                {lista(g.tareas, g.mostrarFecha)}
              </details>
            ) : (
              <Fragment key={g.clave}>
                <h3 className={`grupo${g.clave === 'atrasadas' ? ' atrasadas' : ''}`}>{g.titulo}</h3>
                {lista(g.tareas, g.mostrarFecha)}
              </Fragment>
            ),
          )}
        </section>
        <section className="tarjeta">
          <h2 className="titulo-seccion">Por áreas</h2>
          {arbol.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
          {arbol.map((a) =>
            desplegable(
              `area:${a.id}`,
              <>
                <span className="punto" style={{ background: a.color }} />
                {a.nombre}
              </>,
              a.total,
              <>
                {ramas(`area:${a.id}`, a.tipos)}
                {a.subareas.map((s) =>
                  desplegable(
                    `sub:${s.id}`,
                    <>
                      <span className="punto" style={{ background: s.color }} />
                      {s.nombre}
                    </>,
                    s.total,
                    ramas(`sub:${s.id}`, s.tipos),
                  ),
                )}
              </>,
            ),
          )}
        </section>
      </div>
    </section>
  );
}
