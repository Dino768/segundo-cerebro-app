import { useState } from 'react';
import { LIMITE_ACTIVOS, necesitaAvisoActivos } from '../agenda/proyectos';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Markdown } from '../componentes/Markdown';
import { ESTADOS, tituloDesdeCuerpo, type Estado, type Proyecto } from '../datos/proyectos';
import { PRIORIDADES, type Prioridad } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

interface Props {
  proyecto: Proyecto;
  volver(): void;
  editar(e: Edicion): void;
}

export function PaginaProyecto({ proyecto, volver, editar }: Props) {
  const { datos, soloLectura, tareasBloqueadas, guardarProyecto, recargar } = useDatos();
  const [estado, setEstado] = useState<Estado>(proyecto.estado);
  const [area, setArea] = useState(proyecto.area ?? '');
  const [prioridad, setPrioridad] = useState<Prioridad>(proyecto.prioridad ?? 'media');
  const [cuerpo, setCuerpo] = useState(proyecto.cuerpo);
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [guardando, setGuardando] = useState(false);
  const hoy = useHoy();

  const cambiado =
    estado !== proyecto.estado ||
    area !== (proyecto.area ?? '') ||
    prioridad !== (proyecto.prioridad ?? 'media') ||
    cuerpo !== proyecto.cuerpo;

  function cambiarEstado(nuevo: Estado) {
    if (
      necesitaAvisoActivos(datos.proyectos, proyecto.id, nuevo) &&
      !confirm(`Ya tienes ${LIMITE_ACTIVOS} proyectos activos. ¿Seguro que quieres activar otro? Terminar uno antes te ayudará a acabar las cosas.`)
    )
      return;
    setEstado(nuevo);
  }

  async function guardar() {
    const nuevo: Proyecto = {
      ...proyecto,
      estado,
      area: area || undefined,
      prioridad: prioridad === 'media' ? undefined : prioridad,
      cuerpo,
      titulo: tituloDesdeCuerpo(cuerpo, proyecto.id),
    };
    setGuardando(true);
    await guardarProyecto(nuevo, proyecto);
    setGuardando(false);
  }

  function salir() {
    if (!cambiado || confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) volver();
  }

  return (
    <section>
      <div className="barra">
        <button onClick={salir}>‹ Proyectos</button>
        <h2>{proyecto.titulo}</h2>
      </div>
      <div className="fila-campos">
        <label>
          Estado
          <select value={estado} onChange={(e) => cambiarEstado(e.target.value as Estado)} disabled={soloLectura}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Área
          <select value={area} onChange={(e) => setArea(e.target.value)} disabled={soloLectura}>
            <option value="">(ninguna)</option>
            {datos.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)} disabled={soloLectura}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="pestanas-mini">
        <button className={modo === 'ver' ? 'activa' : ''} onClick={() => setModo('ver')}>Ver</button>
        <button className={modo === 'editar' ? 'activa' : ''} onClick={() => setModo('editar')} disabled={soloLectura}>
          Editar
        </button>
      </div>
      {modo === 'editar' ? (
        <textarea className="editor" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
      ) : (
        <Markdown texto={cuerpo} />
      )}
      <div className="botones">
        <button className="activa" onClick={() => void guardar()} disabled={soloLectura || guardando || !cambiado}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={() => void recargar()}>Recargar</button>
      </div>
      <div className="barra">
        <h3>Tareas del proyecto</h3>
        <button
          disabled={soloLectura || tareasBloqueadas}
          onClick={() => editar({ nueva: { proyecto: proyecto.id } })}
        >
          + Nueva tarea
        </button>
      </div>
      <ul className="lista">
        {datos.tareas
          .filter((t) => t.proyecto === proyecto.id)
          .map((t) => (
            <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha alEditar={(x) => editar({ tarea: x })} />
          ))}
      </ul>
    </section>
  );
}
