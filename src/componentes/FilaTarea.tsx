import { useState } from 'react';
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
  const { datos, cambiarTareas, soloLectura, tareasBloqueadas } = useDatos();
  // Mientras se guarda, se muestra ya el valor nuevo (null = no hay nada guardándose).
  const [guardando, setGuardando] = useState<boolean | null>(null);
  const hecha = guardando ?? hechaEl(tarea, dia);
  const bloqueado = soloLectura || tareasBloqueadas;

  async function marcar() {
    const valor = !hecha;
    setGuardando(valor);
    await cambiarTareas((ts) => fijarEnLista(ts, tarea.id, dia, valor), `${valor ? 'Completar' : 'Desmarcar'}: ${tarea.titulo}`);
    setGuardando(null);
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
        disabled={bloqueado || guardando !== null}
        aria-label={`Marcar «${tarea.titulo}»`}
        onChange={() => void marcar()}
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
