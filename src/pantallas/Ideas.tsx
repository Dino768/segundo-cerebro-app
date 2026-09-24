import { useState } from 'react';
import { anadirIdea, quitarIdea, vincularIdea } from '../agenda/ideas';
import type { Edicion } from '../componentes/FormTarea';
import { FormProyectoDesdeIdea } from '../componentes/FormProyectoDesdeIdea';
import type { Destino } from '../componentes/navegacion';
import { ideasDe, type Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import { formatoCorto } from '../fechas';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function Ideas({ editar, ir }: Props) {
  const { datos, cambiarIdeas, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const [convirtiendo, setConvirtiendo] = useState<Idea | null>(null);
  const ideas = ideasDe(datos.ideas);

  async function apuntar(e: { preventDefault(): void }) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    if (await cambiarIdeas((ls) => anadirIdea(ls, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`)) setTexto('');
  }

  const vincular = (idea: Idea, proyecto: string) =>
    void cambiarIdeas(
      (ls) => vincularIdea(ls, idea, proyecto || undefined),
      proyecto ? `Vincular idea a ${proyecto}` : 'Desvincular idea',
    );

  const aTarea = (idea: Idea) =>
    editar({
      nueva: { titulo: idea.texto, proyecto: idea.proyecto },
      nota: 'Al guardar la tarea, la idea sale de la bandeja.',
      alGuardar: () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Idea pasada a tarea: ${idea.texto}`),
    });

  const borrar = (idea: Idea) => {
    if (confirm(`¿Borrar la idea «${idea.texto}»?`))
      void cambiarIdeas((ls) => quitarIdea(ls, idea), `Borrar idea: ${idea.texto}`);
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
          disabled={soloLectura}
        />
        <button type="submit" className="principal" disabled={!texto.trim() || soloLectura}>
          Apuntar idea
        </button>
      </form>
      {ideas.length === 0 ? (
        <p className="vacio">La bandeja está vacía. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.</p>
      ) : (
        <ul className="lista tarjeta">
          {ideas.map((idea, i) => (
            <li key={`${i}-${idea.fecha}-${idea.texto}`} className="fila-idea">
              <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
              <span className="texto-idea">{idea.texto}</span>
              <select
                aria-label="Proyecto de la idea"
                value={idea.proyecto ?? ''}
                disabled={soloLectura}
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
              <button disabled={soloLectura || tareasBloqueadas} onClick={() => aTarea(idea)}>→ Tarea</button>
              <button disabled={soloLectura} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
              <button className="peligro" disabled={soloLectura} onClick={() => borrar(idea)}>Borrar</button>
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
