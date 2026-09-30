import { colorDeArea, nombreDeArea } from '../agenda/areas';
import { faltan, prioridadEfectiva, textoFaltan } from '../agenda/plazos';
import { describirRepeticion, fijarEnLista, hechaEl } from '../agenda/tareas';
import { ICONO_TIPO, NOMBRE_TIPO, tipoDe } from '../agenda/tipos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import type { ISODate } from '../fechas';
import { Icono } from './Icono';

interface Props {
  tarea: Tarea;
  dia: ISODate;
  mostrarFecha?: boolean;
  alEditar(t: Tarea): void;
}

export function FilaTarea({ tarea, dia, mostrarFecha = false, alEditar }: Props) {
  const { datos, cambiarTareasAlInstante, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const tipo = tipoDe(tarea);
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
  const prioridad = prioridadEfectiva(tarea, hoy);
  const cuentaAtras = (tipo === 'examen' || tipo === 'entrega') && tarea.fecha && tarea.fecha >= hoy && !hecha
    ? textoFaltan(faltan(tarea.fecha, hoy))
    : undefined;
  const detalle = [mostrarFecha ? tarea.fecha : undefined, tarea.hora, describirRepeticion(tarea), cuentaAtras]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`fila-tarea${hecha ? ' hecha' : ''}`}>
      {tipo === 'evento' ? (
        <span className="sin-casilla" aria-hidden="true" />
      ) : (
        <input type="checkbox" checked={hecha} disabled={bloqueado} aria-label={`Marcar «${tarea.titulo}»`} onChange={marcar} />
      )}
      <span className="punto" style={{ background: colorDeArea(datos.areas, tarea.area) }} title={nombreDeArea(datos.areas, tarea.area) ?? 'Área desconocida'} />
      <button className="titulo-tarea" onClick={() => alEditar(tarea)} disabled={bloqueado}>
        {tipo !== 'tarea' && (
          <span className="icono-tipo" title={NOMBRE_TIPO[tipo]}>
            <Icono nombre={ICONO_TIPO[tipo]} tamano={16} />
          </span>
        )}
        <Icono nombre={tarea.icono} />
        {tarea.titulo}
      </button>
      {detalle && <span className="detalle">{detalle}</span>}
      {prioridad !== 'media' && <span className={`prioridad ${prioridad}`}>{prioridad}</span>}
    </li>
  );
}
