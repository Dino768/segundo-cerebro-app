import { Fragment, useEffect, useState } from 'react';
import { agruparPorArea } from '../agenda/agrupar';
import { LIMITE_ACTIVOS, ordenarProyectos, progresoProyecto } from '../agenda/proyectos';
import { prioridadDe } from '../agenda/tareas';
import { colorDeArea } from '../agenda/areas';
import { BarraProgreso } from '../componentes/BarraProgreso';
import type { Edicion } from '../componentes/FormTarea';
import { Icono } from '../componentes/Icono';
import { ListaIdeas } from '../componentes/ListaIdeas';
import type { Destino, Pestana } from '../componentes/navegacion';
import { ESTADOS, idProyectoDesdeTitulo, serializarProyecto, type Estado, type Proyecto } from '../datos/proyectos';
import { useDatos } from '../estado/datos';
import { pedirTexto } from '../estado/dialogos';
import type { Guardian } from '../estado/guardian';
import { iconoPara } from '../iconos/diccionario';
import { PaginaProyecto } from './PaginaProyecto';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
  guardian: Guardian;
  abiertoInicial?: string;
  alCambiarAbierto?(id: string | null): void;
  pestanaInicial?: Pestana;
  alCambiarPestana?(p: Pestana): void;
}

export function Proyectos({ editar, ir, guardian, abiertoInicial, alCambiarAbierto, pestanaInicial, alCambiarPestana }: Props) {
  const { datos, soloLectura, guardarProyecto } = useDatos();
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [abierto, setAbierto] = useState<string | null>(abiertoInicial ?? null);
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial ?? 'proyectos');
  // La barra lateral resalta el proyecto abierto.
  useEffect(() => alCambiarAbierto?.(abierto), [abierto, alCambiarAbierto]);
  useEffect(() => alCambiarPestana?.(pestana), [pestana, alCambiarPestana]);

  const proyectoAbierto = datos.proyectos.find((p) => p.id === abierto);
  if (proyectoAbierto)
    return (
      <PaginaProyecto
        key={serializarProyecto(proyectoAbierto)}
        proyecto={proyectoAbierto}
        volver={() => setAbierto(null)}
        editar={editar}
        ir={ir}
        guardian={guardian}
      />
    );

  async function crear() {
    const titulo = await pedirTexto('Nombre del proyecto', { aceptar: 'Crear' });
    if (!titulo) return;
    const id = idProyectoDesdeTitulo(titulo, datos.proyectos.map((p) => p.id));
    const nuevo: Proyecto = { id, estado: 'idea', titulo, icono: iconoPara(titulo), cuerpo: `# ${titulo}\n\n`, meta: {} };
    if (await guardarProyecto(nuevo, null)) setAbierto(id);
  }

  const lista = ordenarProyectos(datos.proyectos).filter((p) => filtro === 'todos' || p.estado === filtro);
  const grupos = agruparPorArea(lista, datos.areas);
  const activos = datos.proyectos.filter((p) => p.estado === 'activo').length;

  const fila = (p: Proyecto) => (
    <li key={p.id} className="fila-proyecto">
      <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
      <button className="titulo-tarea" onClick={() => setAbierto(p.id)}>
        <Icono nombre={p.icono} />
        {p.titulo}
      </button>
      <span className="fila-progreso"><BarraProgreso {...progresoProyecto(datos.tareas, p.id)} /></span>
      <span className={`estado ${p.estado}`}>{p.estado}</span>
      {prioridadDe(p) !== 'media' && <span className={`prioridad ${prioridadDe(p)}`}>{prioridadDe(p)}</span>}
    </li>
  );

  return (
    <section>
      <div className="barra">
        <h2>Proyectos</h2>
        {pestana === 'proyectos' && <button disabled={soloLectura} onClick={() => void crear()}>+ Nuevo proyecto</button>}
      </div>
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'proyectos'} className={pestana === 'proyectos' ? 'activa' : ''} onClick={() => setPestana('proyectos')}>📁 Proyectos</button>
        <button role="tab" aria-selected={pestana === 'ideas'} className={pestana === 'ideas' ? 'activa' : ''} onClick={() => setPestana('ideas')}>💡 Ideas ({datos.ideas.length})</button>
      </div>
      {pestana === 'ideas' && <ListaIdeas editar={editar} ir={ir} />}
      {pestana === 'proyectos' && (
        <>
          <div className="filtros">
            {(['todos', ...ESTADOS] as const).map((f) => (
              <button key={f} className={`pastilla${filtro === f ? ' encendida' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
            ))}
          </div>
          {grupos.length > 0 &&
            grupos.map((g) => (
              <Fragment key={g.area?.id ?? 'sin-area'}>
                <h3 className="grupo grupo-area">
                  {g.area && <span className="punto" style={{ background: g.area.color }} />}
                  {g.area?.nombre ?? 'Sin área'}
                </h3>
                {g.items.length > 0 && <ul className="lista tarjeta">{g.items.map(fila)}</ul>}
                {g.subgrupos.map((s) => (
                  <Fragment key={s.subarea.id}>
                    <h4 className="subgrupo">{s.subarea.nombre}</h4>
                    <ul className="lista tarjeta">{s.items.map(fila)}</ul>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          {grupos.length === 0 && <p className="vacio">No hay proyectos aquí.</p>}
          {activos > 0 && (
            <p className={`aviso-activos${activos > LIMITE_ACTIVOS ? ' demasiados' : ''}`}>
              {activos} de {LIMITE_ACTIVOS} proyectos activos{activos > LIMITE_ACTIVOS ? '. Son muchos a la vez: terminar uno te ayudará a acabar las cosas.' : '.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
