import { useState, type FormEvent } from 'react';
import { aplicarEdicion, borrarDeLista, type TareaSinId } from '../agenda/tareas';
import { PRIORIDADES, type Prioridad, type Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { DIAS, type Dia, type ISODate } from '../fechas';

export type Edicion = { tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string } };

interface Props {
  edicion: Edicion;
  cerrar(): void;
}

export function FormTarea({ edicion, cerrar }: Props) {
  const { datos, cambiarTareas } = useDatos();
  const original = 'tarea' in edicion ? edicion.tarea : null;
  const nueva = 'nueva' in edicion ? edicion.nueva : {};
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [area, setArea] = useState(original?.area ?? datos.areas[0]?.id ?? 'personal');
  const [prioridad, setPrioridad] = useState<Prioridad>(original?.prioridad ?? 'media');
  const [fecha, setFecha] = useState(original?.fecha ?? nueva.fecha ?? '');
  const [hora, setHora] = useState(original?.hora ?? '');
  const [repetir, setRepetir] = useState<Dia[]>(original?.repetir ?? []);
  const [proyecto, setProyecto] = useState(original?.proyecto ?? nueva.proyecto ?? '');
  const [notas, setNotas] = useState(original?.notas ?? '');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const tarea: TareaSinId = {
      ...original,
      titulo: titulo.trim(),
      area,
      prioridad: prioridad === 'media' ? undefined : prioridad,
      fecha: fecha || undefined,
      hora: hora || undefined,
      repetir: repetir.length ? DIAS.filter((d) => repetir.includes(d)) : undefined,
      proyecto: proyecto || undefined,
      notas: notas.trim() || undefined,
    };
    setGuardando(true);
    const ok = await cambiarTareas(
      (ts) => aplicarEdicion(ts, original, tarea, new Date()),
      `${original ? 'Editar' : 'Crear'} tarea: ${tarea.titulo}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!original || !confirm(`¿Borrar «${original.titulo}»?`)) return;
    setGuardando(true);
    const ok = await cambiarTareas((ts) => borrarDeLista(ts, original.id), `Borrar tarea: ${original.titulo}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  const alternarDia = (d: Dia) => setRepetir((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d]));

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={guardar}>
        <h2>{original ? 'Editar tarea' : 'Nueva tarea'}</h2>
        <label>
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
        </label>
        <div className="fila-campos">
          <label>
            Área
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {datos.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
              {!datos.areas.some((a) => a.id === area) && <option value={area}>{area}</option>}
            </select>
          </label>
          <label>
            Prioridad
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="fila-campos">
          <label>
            Fecha (opcional)
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label>
            Hora (opcional)
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend>Repetir cada semana</legend>
          {DIAS.map((d) => (
            <label key={d} className="dia">
              <input type="checkbox" checked={repetir.includes(d)} onChange={() => alternarDia(d)} />
              {d}
            </label>
          ))}
        </fieldset>
        <label>
          Proyecto
          <select value={proyecto} onChange={(e) => setProyecto(e.target.value)}>
            <option value="">(ninguno)</option>
            {datos.proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
          </select>
        </label>
        <label>
          Notas
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>Guardar</button>
          {original && (
            <button type="button" className="peligro" onClick={() => void borrar()} disabled={guardando}>Borrar</button>
          )}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
