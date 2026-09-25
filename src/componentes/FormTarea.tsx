import { useState, type FormEvent } from 'react';
import { aplicarEdicion, borrarDeLista, type TareaSinId } from '../agenda/tareas';
import { PRIORIDADES, type Prioridad, type Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { DIAS, type Dia, type ISODate } from '../fechas';
import { iconoAlEscribir, iconoPara } from '../iconos/diccionario';
import { SelectorArea } from './SelectorArea';
import { SelectorIcono } from './SelectorIcono';

export type Edicion = ({ tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string } }) & {
  // Aviso que se muestra en el formulario y acción extra tras guardar bien (p. ej. quitar la idea de ideas.yaml).
  nota?: string;
  alGuardar?(): Promise<unknown>;
};

interface Props {
  edicion: Edicion;
  cerrar(): void;
}

export function FormTarea({ edicion, cerrar }: Props) {
  const { datos, cambiarTareas } = useDatos();
  const original = 'tarea' in edicion ? edicion.tarea : null;
  const nueva = 'nueva' in edicion ? edicion.nueva : {};
  const [titulo, setTitulo] = useState(original?.titulo ?? nueva.titulo ?? '');
  const [area, setArea] = useState(original?.area ?? nueva.area ?? datos.areas[0]?.id ?? 'personal');
  const [prioridad, setPrioridad] = useState<Prioridad>(original?.prioridad ?? 'media');
  const [fecha, setFecha] = useState(original?.fecha ?? nueva.fecha ?? '');
  const [hora, setHora] = useState(original?.hora ?? '');
  const [repetir, setRepetir] = useState<Dia[]>(original?.repetir ?? []);
  // Una idea vinculada a un proyecto que ya no existe no debe guardar ese id viejo en la tarea.
  const proyectoNuevo = nueva.proyecto && datos.proyectos.some((p) => p.id === nueva.proyecto) ? nueva.proyecto : '';
  const [proyecto, setProyecto] = useState(original?.proyecto ?? proyectoNuevo);
  const [notas, setNotas] = useState(original?.notas ?? nueva.notas ?? '');
  const [icono, setIcono] = useState(original?.icono ?? nueva.icono ?? iconoPara(original?.titulo ?? nueva.titulo ?? ''));
  // Solo el icono guardado cuenta como fijado: una tarea sin icono todavía sigue la sugerencia del título.
  const [fijado, setFijado] = useState(Boolean(original?.icono ?? nueva.icono));
  const [guardando, setGuardando] = useState(false);

  function cambiarTitulo(v: string) {
    setTitulo(v);
    setIcono((i) => iconoAlEscribir(v, i, fijado));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const tarea: TareaSinId = {
      ...original,
      titulo: titulo.trim(),
      area,
      icono,
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
    if (ok) await edicion.alGuardar?.();
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!original || !(await confirmar(`¿Borrar «${original.titulo}»?`, { aceptar: 'Borrar', peligro: true }))) return;
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
        {edicion.nota && <p className="nota-form">{edicion.nota}</p>}
        <div className="campo-titulo">
          <SelectorIcono icono={icono} elegir={(i) => { setIcono(i); setFijado(true); }} />
          <label>
            Título
            <input value={titulo} onChange={(e) => cambiarTitulo(e.target.value)} required autoFocus />
          </label>
        </div>
        <div className="fila-campos">
          <SelectorArea areas={datos.areas} valor={area} cambiar={setArea} />
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
          <select
            value={proyecto}
            onChange={(e) => {
              const v = e.target.value;
              setProyecto(v);
              const a = datos.proyectos.find((p) => p.id === v)?.area;
              if (a) setArea(a);
            }}
          >
            <option value="">(ninguno)</option>
            {datos.proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
            {proyecto && !datos.proyectos.some((p) => p.id === proyecto) && <option value={proyecto}>{proyecto}</option>}
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
