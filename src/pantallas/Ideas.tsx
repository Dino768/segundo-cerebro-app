import { useState } from 'react';
import { anadirIdea, editarIdea, quitarIdea, tareaDesdeIdea, tituloDeIdea } from '../agenda/ideas';
import type { Edicion } from '../componentes/FormTarea';
import { FormProyectoDesdeIdea } from '../componentes/FormProyectoDesdeIdea';
import type { Destino } from '../componentes/navegacion';
import { ordenarIdeas, type Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { useHoy } from '../estado/hoy';
import { formatoCorto } from '../fechas';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function Ideas({ editar, ir }: Props) {
  const { datos, cambiarIdeas, soloLectura, tareasBloqueadas, ideasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const [convirtiendo, setConvirtiendo] = useState<Idea | null>(null);
  const [apuntando, setApuntando] = useState(false);
  // Ideas que se están guardando: su fila se bloquea hasta que termine.
  const [ocupadas, setOcupadas] = useState<string[]>([]);
  const ideas = ordenarIdeas(datos.ideas);
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

  async function apuntar(e: { preventDefault(): void }) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || apuntando) return;
    setApuntando(true);
    const ok = await cambiarIdeas((is) => anadirIdea(is, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`);
    setApuntando(false);
    if (ok) setTexto('');
  }

  const vincular = (idea: Idea, proyecto: string) => {
    const { id: _id, ...resto } = idea;
    void conCandado(idea, () =>
      cambiarIdeas((is) => editarIdea(is, idea, { ...resto, proyecto: proyecto || undefined }), proyecto ? `Vincular idea a ${proyecto}` : 'Desvincular idea'),
    );
  };

  const aTarea = (idea: Idea) =>
    editar({
      nueva: tareaDesdeIdea(idea),
      nota: 'Al guardar la tarea, la idea sale de tus ideas.',
      alGuardar: () => conCandado(idea, () => cambiarIdeas((is) => quitarIdea(is, idea.id), `Idea pasada a tarea: ${tituloDeIdea(idea)}`)),
    });

  const borrar = async (idea: Idea) => {
    if (await confirmar(`¿Borrar la idea «${tituloDeIdea(idea)}»?`, { aceptar: 'Borrar', peligro: true }))
      void conCandado(idea, () => cambiarIdeas((is) => quitarIdea(is, idea.id), `Borrar idea: ${tituloDeIdea(idea)}`));
  };

  return (
    <section>
      <div className="barra">
        <h2>Ideas</h2>
      </div>
      <form className="captura" onSubmit={(e) => void apuntar(e)}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Apunta una idea para no desviarte de lo que estás haciendo…"
          aria-label="Nueva idea"
          disabled={soloLectura || ideasBloqueadas}
        />
        <button type="submit" className="principal" disabled={!texto.trim() || soloLectura || ideasBloqueadas || apuntando}>
          Apuntar idea
        </button>
      </form>
      {ideas.length === 0 ? (
        <p className="vacio">No tienes ideas apuntadas. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.</p>
      ) : (
        <ul className="lista tarjeta">
          {ideas.map((idea) => (
            <li key={idea.id} className={`fila-idea${ocupada(idea) ? ' guardando' : ''}`}>
              <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
              <span className="texto-idea">{tituloDeIdea(idea)}</span>
              <select
                aria-label="Proyecto de la idea"
                value={idea.proyecto ?? ''}
                disabled={soloLectura || ideasBloqueadas || ocupada(idea)}
                onChange={(e) => vincular(idea, e.target.value)}
              >
                <option value="">(ningún proyecto)</option>
                {datos.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.titulo}</option>
                ))}
                {idea.proyecto && !datos.proyectos.some((p) => p.id === idea.proyecto) && (
                  <option value={idea.proyecto}>{idea.proyecto}</option>
                )}
              </select>
              <button disabled={soloLectura || ideasBloqueadas || tareasBloqueadas || ocupada(idea)} onClick={() => aTarea(idea)}>→ Tarea</button>
              <button disabled={soloLectura || ideasBloqueadas || ocupada(idea)} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
              <button className="peligro" disabled={soloLectura || ideasBloqueadas || ocupada(idea)} onClick={() => void borrar(idea)}>Borrar</button>
            </li>
          ))}
        </ul>
      )}
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
    </section>
  );
}
