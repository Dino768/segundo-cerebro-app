import { hechaEl } from '../agenda/tareas';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import type { ISODate } from '../fechas';
import { colorDeArea } from '../agenda/areas';
import { Icono } from './Icono';

// Etiqueta de una tarea en la semana y en el mes: fondo suave del color de su área y texto oscuro.
export function EtiquetaTarea({ tarea, dia }: { tarea: Tarea; dia: ISODate }) {
  const { datos } = useDatos();
  const color = colorDeArea(datos.areas, tarea.area);
  return (
    <span
      className={`etiqueta-tarea${hechaEl(tarea, dia) ? ' hecha' : ''}`}
      style={{ background: `color-mix(in srgb, ${color} 25%, var(--superficie))`, borderLeftColor: color }}
      title={tarea.titulo}
    >
      <Icono nombre={tarea.icono} tamano={13} />
      {tarea.hora ? `${tarea.hora} ` : ''}
      {tarea.titulo}
    </span>
  );
}
