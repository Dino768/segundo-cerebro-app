import { useState } from 'react';
import { anadirIdea } from '../agenda/ideas';
import { aplicarEdicion } from '../agenda/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

// Captura rápida: una tarea sin fecha (Enter o «+ Tarea») o una idea para la bandeja.
export function Captura() {
  const { datos, cambiarTareas, cambiarIdeas, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const limpio = texto.trim();

  async function crear(tipo: 'tarea' | 'idea') {
    if (!limpio || guardando) return;
    setGuardando(true);
    const ok =
      tipo === 'tarea'
        ? await cambiarTareas(
            (ts) => aplicarEdicion(ts, null, { titulo: limpio, area: datos.areas[0]?.id ?? 'personal' }, new Date()),
            `Crear tarea: ${limpio}`,
          )
        : await cambiarIdeas((is) => anadirIdea(is, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`);
    setGuardando(false);
    if (ok) setTexto('');
  }

  return (
    <form
      className="captura"
      onSubmit={(e) => {
        e.preventDefault();
        void crear('tarea');
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Apunta algo rápido… (una tarea o una idea)"
        aria-label="Captura rápida"
        disabled={soloLectura}
      />
      <button type="submit" className="principal" disabled={!limpio || guardando || soloLectura || tareasBloqueadas}>
        + Tarea
      </button>
      <button type="button" disabled={!limpio || guardando || soloLectura} onClick={() => void crear('idea')}>
        💡 Idea
      </button>
    </form>
  );
}
