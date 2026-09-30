import { colorDeArea } from '../agenda/areas';
import { proximosExamenes } from '../agenda/grupos';
import { faltan, textoFaltan } from '../agenda/plazos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { formatoCorto, type ISODate } from '../fechas';
import type { Destino } from './navegacion';

// Tarjetita del Inicio con los exámenes más cercanos (spec §4). Si no hay ninguno, no aparece.
export function ProximosExamenes({ tareas, hoy, ir }: { tareas: Tarea[]; hoy: ISODate; ir(d: Destino): void }) {
  const { datos } = useDatos();
  const examenes = proximosExamenes(tareas, hoy);
  if (examenes.length === 0) return null;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Próximos exámenes</h2>
      <ul className="lista">
        {examenes.map((t) => (
          <li key={t.id}>
            <button className="proximo-examen" onClick={() => ir({ pantalla: 'calendario', dia: t.fecha! })}>
              <span className="proximo-examen-titulo">
                <span className="punto" style={{ background: colorDeArea(datos.areas, t.area) }} />
                {t.titulo}
              </span>
              <span className="detalle">
                {formatoCorto(t.fecha!)} · {textoFaltan(faltan(t.fecha!, hoy))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
