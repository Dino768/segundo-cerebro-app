import { useState } from 'react';
import { ordenarProyectos } from '../agenda/proyectos';
import { prioridadDe } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import type { Edicion } from '../componentes/FormTarea';
import { ESTADOS, idProyectoDesdeTitulo, serializarProyecto, type Estado, type Proyecto } from '../datos/proyectos';
import { useDatos } from '../estado/datos';
import { PaginaProyecto } from './PaginaProyecto';

export function Proyectos({ editar, abiertoInicial }: { editar(e: Edicion): void; abiertoInicial?: string }) {
  const { datos, soloLectura, guardarProyecto } = useDatos();
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [abierto, setAbierto] = useState<string | null>(abiertoInicial ?? null);

  const proyectoAbierto = datos.proyectos.find((p) => p.id === abierto);
  if (proyectoAbierto)
    return (
      <PaginaProyecto
        key={serializarProyecto(proyectoAbierto)}
        proyecto={proyectoAbierto}
        volver={() => setAbierto(null)}
        editar={editar}
      />
    );

  async function crear() {
    const titulo = prompt('Nombre del proyecto')?.trim();
    if (!titulo) return;
    const id = idProyectoDesdeTitulo(titulo, datos.proyectos.map((p) => p.id));
    const nuevo: Proyecto = { id, estado: 'idea', titulo, cuerpo: `# ${titulo}\n\n`, meta: {} };
    if (await guardarProyecto(nuevo, null)) setAbierto(id);
  }

  const lista = ordenarProyectos(datos.proyectos).filter((p) => filtro === 'todos' || p.estado === filtro);

  return (
    <section>
      <div className="barra">
        <h2>Proyectos</h2>
        <button disabled={soloLectura} onClick={() => void crear()}>+ Nuevo proyecto</button>
      </div>
      <div className="filtros">
        {(['todos', ...ESTADOS] as const).map((f) => (
          <button key={f} className={filtro === f ? 'activa' : ''} onClick={() => setFiltro(f)}>{f}</button>
        ))}
      </div>
      <ul className="lista">
        {lista.map((p) => (
          <li key={p.id} className="fila-proyecto">
            <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
            <button className="titulo-tarea" onClick={() => setAbierto(p.id)}>{p.titulo}</button>
            <span className={`estado ${p.estado}`}>{p.estado}</span>
            {prioridadDe(p) !== 'media' && <span className={`prioridad ${prioridadDe(p)}`}>{prioridadDe(p)}</span>}
          </li>
        ))}
      </ul>
      {lista.length === 0 && <p className="vacio">No hay proyectos aquí.</p>}
    </section>
  );
}
