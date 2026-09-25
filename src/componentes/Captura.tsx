import { useState } from 'react';
import { aplicarEdicion } from '../agenda/tareas';
import { useDatos } from '../estado/datos';
import { iconoPara } from '../iconos/diccionario';
import { FormIdea } from './FormIdea';

// Captura rápida: una tarea sin fecha (Enter o «+ Tarea») o una idea (💡 Idea) que se apunta en ideas.
export function Captura() {
  const { datos, cambiarTareas, soloLectura, tareasBloqueadas, ideasBloqueadas } = useDatos();
  const [texto, setTexto] = useState('');
  const [idea, setIdea] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const limpio = texto.trim();

  async function crear() {
    if (!limpio || guardando) return;
    setGuardando(true);
    const icono = iconoPara(limpio);
    const ok = await cambiarTareas(
      (ts) =>
        aplicarEdicion(
          ts,
          null,
          { titulo: limpio, area: datos.areas[0]?.id ?? 'personal', ...(icono ? { icono } : {}) },
          new Date(),
        ),
      `Crear tarea: ${limpio}`,
    );
    setGuardando(false);
    if (ok) setTexto('');
  }

  return (
    <>
      <form
        className="captura"
        onSubmit={(e) => {
          e.preventDefault();
          void crear();
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
        <button type="button" disabled={!limpio || guardando || soloLectura || ideasBloqueadas} onClick={() => setIdea(limpio)}>
          💡 Idea
        </button>
      </form>
      {idea !== null && (
        // Cancelar no debe borrar lo escrito: solo se vacía si la idea se llegó a guardar.
        <FormIdea inicial={{ texto: idea }} cerrar={() => setIdea(null)} alGuardar={() => setTexto('')} />
      )}
    </>
  );
}
