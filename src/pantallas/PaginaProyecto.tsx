import { useEffect, useState } from 'react';
import { LIMITE_ACTIVOS, necesitaAvisoActivos, progresoProyecto } from '../agenda/proyectos';
import { BarraProgreso } from '../componentes/BarraProgreso';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Markdown } from '../componentes/Markdown';
import { SelectorArea } from '../componentes/SelectorArea';
import { SelectorIcono } from '../componentes/SelectorIcono';
import type { Destino } from '../componentes/navegacion';
import { ordenarIdeas } from '../datos/ideas';
import { ESTADOS, tituloDesdeCuerpo, type Estado, type Proyecto } from '../datos/proyectos';
import { tituloDeIdea } from '../agenda/ideas';
import { PRIORIDADES, type Prioridad } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import type { Guardian } from '../estado/guardian';
import { useHoy } from '../estado/hoy';
import { formatoCorto } from '../fechas';

interface Props {
  proyecto: Proyecto;
  volver(): void;
  editar(e: Edicion): void;
  ir(d: Destino): void;
  guardian: Guardian;
}

export function PaginaProyecto({ proyecto, volver, editar, ir, guardian }: Props) {
  const { datos, soloLectura, tareasBloqueadas, guardarProyecto, recargar } = useDatos();
  const [estado, setEstado] = useState<Estado>(proyecto.estado);
  const [area, setArea] = useState(proyecto.area ?? '');
  const [prioridad, setPrioridad] = useState<Prioridad>(proyecto.prioridad ?? 'media');
  const [icono, setIcono] = useState(proyecto.icono);
  const [cuerpo, setCuerpo] = useState(proyecto.cuerpo);
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [guardando, setGuardando] = useState(false);
  const hoy = useHoy();

  const cambiado =
    estado !== proyecto.estado ||
    area !== (proyecto.area ?? '') ||
    prioridad !== (proyecto.prioridad ?? 'media') ||
    icono !== proyecto.icono ||
    cuerpo !== proyecto.cuerpo;

  async function cambiarEstado(nuevo: Estado) {
    if (
      necesitaAvisoActivos(datos.proyectos, proyecto.id, nuevo) &&
      !(await confirmar(
        `Ya tienes ${LIMITE_ACTIVOS} proyectos activos. ¿Seguro que quieres activar otro? Terminar uno antes te ayudará a acabar las cosas.`,
        { aceptar: 'Activar' },
      ))
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
      icono,
      cuerpo,
      titulo: tituloDesdeCuerpo(cuerpo, proyecto.id),
    };
    setGuardando(true);
    await guardarProyecto(nuevo, proyecto);
    setGuardando(false);
  }

  async function salir() {
    if (!cambiado || (await confirmar('Tienes cambios sin guardar. ¿Salir igualmente?', { aceptar: 'Salir' }))) volver();
  }

  // Avisa a la app de que hay cambios sin guardar: así pregunta antes de ir a otra pantalla desde el menú.
  useEffect(() => {
    guardian.marcar(cambiado);
    return () => guardian.marcar(false);
  }, [guardian, cambiado]);

  const ideasProyecto = ordenarIdeas(datos.ideas).filter((i) => i.proyecto === proyecto.id);

  return (
    <section>
      <div className="barra">
        <button onClick={() => void salir()}>‹ Proyectos</button>
        <SelectorIcono icono={icono} elegir={setIcono} disabled={soloLectura} />
        <h2>{proyecto.titulo}</h2>
      </div>
      <div className="progreso-proyecto">
        <BarraProgreso {...progresoProyecto(datos.tareas, proyecto.id)} />
      </div>
      <div className="fila-campos">
        <label>
          Estado
          <select value={estado} onChange={(e) => void cambiarEstado(e.target.value as Estado)} disabled={soloLectura}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <SelectorArea areas={datos.areas} valor={area} cambiar={setArea} ninguna="(ninguna)" disabled={soloLectura} />
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
      <section className="tarjeta seccion-proyecto">
        <h2 className="titulo-seccion">
          Tareas del proyecto
          <button
            className="enlace"
            disabled={soloLectura || tareasBloqueadas}
            onClick={() => editar({ nueva: { proyecto: proyecto.id } })}
          >
            + Nueva tarea
          </button>
        </h2>
        <ul className="lista">
          {datos.tareas
            .filter((t) => t.proyecto === proyecto.id)
            .map((t) => (
              <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha alEditar={(x) => editar({ tarea: x })} />
            ))}
        </ul>
      </section>
      {ideasProyecto.length > 0 && (
        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Ideas de este proyecto
            <button className="enlace" onClick={() => ir({ pantalla: 'ideas' })}>Ver en Ideas →</button>
          </h2>
          <ul className="lista">
            {ideasProyecto.map((i) => (
              <li key={i.id} className="fila-idea">
                <span className="detalle fecha-idea">{formatoCorto(i.fecha)}</span>
                <span className="texto-idea">{tituloDeIdea(i)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
