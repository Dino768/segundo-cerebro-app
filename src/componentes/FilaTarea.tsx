import { esRepetida, fijarEnLista, hechaEl, prioridadDe } from '../agenda/tareas';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import type { ISODate } from '../fechas';
import { colorDeArea } from './areas';

interface Props {
  tarea: Tarea;
  dia: ISODate;
  mostrarFecha?: boolean;
  alEditar(t: Tarea): void;
}

export function FilaTarea({ tarea, dia, mostrarFecha = false, alEditar }: Props) {
  const { datos, cambiarTareasAlInstante, soloLectura, tareasBloqueadas } = useDatos();
  const hecha = hechaEl(tarea, dia);
  const bloqueado = soloLectura || tareasBloqueadas;

  // Se marca al momento; se guarda por detrás y, si falla, se deshace con un aviso.
  function marcar() {
    const valor = !hecha;
    void cambiarTareasAlInstante(
      (ts) => fijarEnLista(ts, tarea.id, dia, valor),
      (ts) => fijarEnLista(ts, tarea.id, dia, !valor),
      `${valor ? 'Completar' : 'Desmarcar'}: ${tarea.titulo}`,
    );
  }
  const prioridad = prioridadDe(tarea);
  const detalle = [
    mostrarFecha ? tarea.fecha : undefined,
    tarea.hora,
    esRepetida(tarea) ? `cada ${tarea.repetir!.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`fila-tarea${hecha ? ' hecha' : ''}`}>
      <input
        type="checkbox"
        checked={hecha}
        disabled={bloqueado}
        aria-label={`Marcar «${tarea.titulo}»`}
        onChange={marcar}
      />
      <span className="punto" style={{ background: colorDeArea(datos.areas, tarea.area) }} />
      <button className="titulo-tarea" onClick={() => alEditar(tarea)} disabled={bloqueado}>
        {tarea.titulo}
      </button>
      {detalle && <span className="detalle">{detalle}</span>}
      {prioridad !== 'media' && <span className={`prioridad ${prioridad}`}>{prioridad}</span>}
    </li>
  );
}
