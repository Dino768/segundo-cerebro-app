import { Fragment, useState } from 'react';
import { agruparPorArea } from '../agenda/agrupar';
import { colorDeArea, nombreDeArea } from '../agenda/areas';
import { quitarIdea, tareaDesdeIdea, tituloDeIdea } from '../agenda/ideas';
import { ordenarIdeas, type Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { formatoCorto } from '../fechas';
import type { Edicion } from './FormTarea';
import { FormIdea } from './FormIdea';
import { FormProyectoDesdeIdea } from './FormProyectoDesdeIdea';
import { Icono } from './Icono';
import type { Destino } from './navegacion';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function ListaIdeas({ editar, ir }: Props) {
  const { datos, cambiarIdeas, soloLectura, tareasBloqueadas, ideasBloqueadas } = useDatos();
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState<Idea | null>(null);
  const [convirtiendo, setConvirtiendo] = useState<Idea | null>(null);
  // Ideas que se están guardando: su fila se bloquea hasta que termine.
  const [ocupadas, setOcupadas] = useState<string[]>([]);
  const grupos = agruparPorArea(ordenarIdeas(datos.ideas), datos.areas);
  const ocupada = (idea: Idea) => ocupadas.includes(idea.id);

  async function conCandado(idea: Idea, accion: () => Promise<unknown>) {
    if (ocupada(idea)) return;
    setOcupadas((os) => [...os, idea.id]);
    try {
      await accion();
    } finally {
      setOcupadas((os) => os.filter((x) => x !== idea.id));
    }
  }

  const aTarea = (idea: Idea) =>
    editar({
      nueva: tareaDesdeIdea(idea),
      nota: 'Al guardar la tarea, la idea sale de tus ideas.',
      alGuardar: () => conCandado(idea, () => cambiarIdeas((is) => quitarIdea(is, idea.id), `Idea pasada a tarea: ${tituloDeIdea(idea)}`)),
    });

  const fila = (idea: Idea) => (
    <li key={idea.id} className={`fila-idea${ocupada(idea) ? ' guardando' : ''}`}>
      <button className="titulo-idea" onClick={() => setEditando(idea)} disabled={soloLectura || ideasBloqueadas}>
        <Icono nombre={idea.icono} />
        {idea.titulo ? <strong>{idea.titulo}</strong> : <span>{tituloDeIdea(idea)}</span>}
      </button>
      {idea.area && (
        <span className="detalle etiqueta-area">
          <span className="punto" style={{ background: colorDeArea(datos.areas, idea.area) }} />
          {nombreDeArea(datos.areas, idea.area)}
        </span>
      )}
      {idea.proyecto && <span className="detalle">📁 {datos.proyectos.find((p) => p.id === idea.proyecto)?.titulo ?? idea.proyecto}</span>}
      <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
      <button disabled={soloLectura || tareasBloqueadas || ideasBloqueadas || ocupada(idea)} onClick={() => aTarea(idea)}>→ Tarea</button>
      <button disabled={soloLectura || ideasBloqueadas || ocupada(idea)} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
    </li>
  );

  return (
    <>
      <div className="barra barra-ideas">
        <button className="principal" disabled={soloLectura || ideasBloqueadas} onClick={() => setAgregando(true)}>+ Idea</button>
      </div>
      {grupos.length === 0 ? (
        <p className="vacio">No tienes ideas apuntadas. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.</p>
      ) : (
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
        ))
      )}
      {agregando && <FormIdea cerrar={() => setAgregando(false)} />}
      {editando && <FormIdea idea={editando} cerrar={() => setEditando(null)} />}
      {convirtiendo && (
        <FormProyectoDesdeIdea
          idea={convirtiendo}
          cerrar={() => setConvirtiendo(null)}
          alCrear={(id) => {
            setConvirtiendo(null);
            ir({ pantalla: 'proyectos', proyecto: id });
          }}
        />
      )}
    </>
  );
}
