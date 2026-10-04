import { horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { datosAsignatura } from './colores';

// Una clase en la lista del día del calendario: sin casilla, se toca para ver los detalles.
export function FilaClase({ clase, asignaturas, alElegir }: { clase: ClaseDelDia; asignaturas: Asignatura[]; alElegir(c: ClaseDelDia): void }) {
  const { nombre, color } = datosAsignatura(asignaturas, clase.asignatura);
  return (
    <li className="fila-tarea fila-clase">
      <span className="sin-casilla" aria-hidden="true" />
      <span className="punto" style={{ background: color }} />
      <button className="titulo-tarea" onClick={() => alElegir(clase)}>
        {`🎓 ${horaBonita(clase.inicio)} ${nombre}`}
      </button>
      {clase.aula && <span className="detalle">{clase.aula.split(' · ')[0]}</span>}
    </li>
  );
}
