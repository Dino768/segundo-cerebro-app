import { useState } from 'react';
import { ordenarProyectos, progresoProyecto } from '../agenda/proyectos';
import { prioridadDe } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import { BarraProgreso } from '../componentes/BarraProgreso';
import type { Edicion } from '../componentes/FormTarea';
import type { Destino } from '../componentes/navegacion';
import { ESTADOS, idProyectoDesdeTitulo, serializarProyecto, type Estado, type Proyecto } from '../datos/proyectos';
import { useDatos } from '../estado/datos';
import { PaginaProyecto } from './PaginaProyecto';

export function Proyectos({ editar, ir, abiertoInicial }: { editar(e: Edicion): void; ir(d: Destino): void; abiertoInicial?: string }) {
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
        ir={ir}
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
          <button key={f} className={`pastilla${filtro === f ? ' encendida' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
        ))}
      </div>
      {lista.length > 0 && (
        <ul className="lista tarjeta">
          {lista.map((p) => (
            <li key={p.id} className="fila-proyecto">
              <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
              <button className="titulo-tarea" onClick={() => setAbierto(p.id)}>{p.titulo}</button>
              <span className="fila-progreso"><BarraProgreso {...progresoProyecto(datos.tareas, p.id)} /></span>
              <span className={`estado ${p.estado}`}>{p.estado}</span>
              {prioridadDe(p) !== 'media' && <span className={`prioridad ${prioridadDe(p)}`}>{prioridadDe(p)}</span>}
            </li>
          ))}
        </ul>
      )}
      {lista.length === 0 && <p className="vacio">No hay proyectos aquí.</p>}
    </section>
  );
}
