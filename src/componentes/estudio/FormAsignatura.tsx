import { useState, type FormEvent } from 'react';
import { anadirAsignatura, COLORES_ASIGNATURA, editarAsignatura, quitarAsignatura } from '../../agenda/asignaturas';
import type { Asignatura } from '../../datos/asignaturas';
import { useDatos } from '../../estado/datos';

interface Props {
  asignatura: Asignatura | null; // null = nueva
  cerrar(): void;
  alQuitar(): void;
}

export function FormAsignatura({ asignatura, cerrar, alQuitar }: Props) {
  const { datos, cambiarAsignaturas } = useDatos();
  const [nombre, setNombre] = useState(asignatura?.nombre ?? '');
  const [color, setColor] = useState(asignatura?.color ?? COLORES_ASIGNATURA[datos.asignaturas.length % COLORES_ASIGNATURA.length]);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const ok = await cambiarAsignaturas(
      (l) => (asignatura ? editarAsignatura(l, asignatura.id, { nombre, color }) : anadirAsignatura(l, nombre, color)),
      `${asignatura ? 'Editar' : 'Añadir'} asignatura: ${nombre.trim()}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  async function quitar() {
    if (!asignatura || !confirm(`¿Quitar «${asignatura.nombre}» de la lista? Sus pizarras guardadas no se borran.`)) return;
    setGuardando(true);
    const ok = await cambiarAsignaturas((l) => quitarAsignatura(l, asignatura.id), `Quitar asignatura: ${asignatura.nombre}`);
    setGuardando(false);
    if (ok) {
      alQuitar();
      cerrar();
    }
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{asignatura ? 'Editar asignatura' : 'Nueva asignatura'}</h2>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={60} placeholder="Física, Cálculo…" />
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>Guardar</button>
          {asignatura && <button type="button" className="peligro" disabled={guardando} onClick={() => void quitar()}>Quitar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
