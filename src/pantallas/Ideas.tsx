import { useState } from 'react';
import { anadirIdea, mismaIdea, quitarIdea, vincularIdea } from '../agenda/ideas';
import type { Edicion } from '../componentes/FormTarea';
import { FormProyectoDesdeIdea } from '../componentes/FormProyectoDesdeIdea';
import type { Destino } from '../componentes/navegacion';
import { ideasDe, type Idea } from '../datos/bandeja';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
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
  const [apuntando, setApuntando] = useState(false);
  // Ideas que se están guardando: su fila se bloquea hasta que termine.
  const [ocupadas, setOcupadas] = useState<Idea[]>([]);
  const ideas = ideasDe(datos.ideas);
  const ocupada = (idea: Idea) => ocupadas.some((x) => mismaIdea(x, idea));

  async function conCandado(idea: Idea, accion: () => Promise<unknown>) {
    if (ocupada(idea)) return;
    setOcupadas((os) => [...os, idea]);
    try {
      await accion();
    } finally {
      setOcupadas((os) => os.filter((x) => !mismaIdea(x, idea)));
    }
  }

  async function apuntar(e: { preventDefault(): void }) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || apuntando) return;
    setApuntando(true);
    const ok = await cambiarIdeas((ls) => anadirIdea(ls, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`);
    setApuntando(false);
    if (ok) setTexto('');
  }

  const vincular = (idea: Idea, proyecto: string) =>
    void conCandado(idea, () =>
      cambiarIdeas((ls) => vincularIdea(ls, idea, proyecto || undefined), proyecto ? `Vincular idea a ${proyecto}` : 'Desvincular idea'),
    );

  const aTarea = (idea: Idea) =>
    editar({
      nueva: { titulo: idea.texto, proyecto: idea.proyecto },
      nota: 'Al guardar la tarea, la idea sale de la bandeja.',
      alGuardar: () => conCandado(idea, () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Idea pasada a tarea: ${idea.texto}`)),
    });

  const borrar = async (idea: Idea) => {
    if (await confirmar(`¿Borrar la idea «${idea.texto}»?`, { aceptar: 'Borrar', peligro: true }))
      void conCandado(idea, () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Borrar idea: ${idea.texto}`));
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
        <button type="submit" className="principal" disabled={!texto.trim() || soloLectura || apuntando}>
          Apuntar idea
        </button>
      </form>
      {ideas.length === 0 ? (
        <p className="vacio">La bandeja está vacía. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.</p>
      ) : (
        <ul className="lista tarjeta">
          {ideas.map((idea, i) => (
            <li key={`${i}-${idea.fecha}-${idea.texto}`} className={`fila-idea${ocupada(idea) ? ' guardando' : ''}`}>
              <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
              <span className="texto-idea">{idea.texto}</span>
              <select
                aria-label="Proyecto de la idea"
                value={idea.proyecto ?? ''}
                disabled={soloLectura || ocupada(idea)}
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
              <button disabled={soloLectura || tareasBloqueadas || ocupada(idea)} onClick={() => aTarea(idea)}>→ Tarea</button>
              <button disabled={soloLectura || ocupada(idea)} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
              <button className="peligro" disabled={soloLectura || ocupada(idea)} onClick={() => void borrar(idea)}>Borrar</button>
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
