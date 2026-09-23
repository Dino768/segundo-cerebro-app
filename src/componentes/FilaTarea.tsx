import { alternarEnLista, esRepetida, hechaEl, prioridadDe } from '../agenda/tareas';
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
  const { datos, cambiarTareas, soloLectura, tareasBloqueadas } = useDatos();
  const hecha = hechaEl(tarea, dia);
  const bloqueado = soloLectura || tareasBloqueadas;
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
        onChange={() =>
          void cambiarTareas((ts) => alternarEnLista(ts, tarea.id, dia), `${hecha ? 'Desmarcar' : 'Completar'}: ${tarea.titulo}`)
        }
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
