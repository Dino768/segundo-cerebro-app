import { useState } from 'react';
import { proyectoDesdeIdea, quitarIdea, tituloDeIdea } from '../agenda/ideas';
import type { Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

interface Props {
  idea: Idea;
  cerrar(): void;
  alCrear(id: string): void;
}

export function FormProyectoDesdeIdea({ idea, cerrar, alCrear }: Props) {
  const { datos, guardarProyecto, cambiarIdeas, idsProyectos } = useDatos();
  const hoy = useHoy();
  const [nombre, setNombre] = useState(tituloDeIdea(idea).slice(0, 60).trim());
  const [area, setArea] = useState(idea.area ?? datos.proyectos.find((p) => p.id === idea.proyecto)?.area ?? '');
  const [guardando, setGuardando] = useState(false);

  async function crear(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const p = proyectoDesdeIdea(idea, nombre, area || undefined, await idsProyectos(), hoy);
    // Primero se crea el proyecto y después se quita la idea: si algo falla, la idea no se pierde.
    const ok = await guardarProyecto(p, null);
    if (ok) await cambiarIdeas((is) => quitarIdea(is, idea.id), `Idea convertida en proyecto: ${p.titulo}`);
    setGuardando(false);
    if (ok) alCrear(p.id);
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void crear(e)}>
        <h2>Convertir en proyecto</h2>
        <p className="nota-form">«{tituloDeIdea(idea)}»</p>
        <label>
          Nombre del proyecto
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={80} />
        </label>
        <label>
          Área
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">(ninguna)</option>
            {datos.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear proyecto'}
          </button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
