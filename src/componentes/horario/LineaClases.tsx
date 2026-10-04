import { ahoraYSiguiente, horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import type { Horario } from '../../repositorio';
import type { Destino } from '../navegacion';
import { datosAsignatura } from './colores';

const aulaCorta = (c: ClaseDelDia) => (c.aula ? ` · ${c.aula.split(' · ')[0]}` : '');

// Una línea en el Inicio: la clase en curso y la siguiente (o la primera de mañana). Sin clases, no sale.
export function LineaClases({ horario, asignaturas, ahora, ir }: { horario: Horario; asignaturas: Asignatura[]; ahora: Date; ir(d: Destino): void }) {
  const { enCurso, siguiente, esManana } = ahoraYSiguiente(horario.clases, horario.ajustes, ahora);
  if (!enCurso && !siguiente) return null;
  const nombre = (c: ClaseDelDia) => datosAsignatura(asignaturas, c.asignatura).nombre;
  const partes: string[] = [];
  if (enCurso) partes.push(`Ahora: ${nombre(enCurso)}${aulaCorta(enCurso)} · hasta las ${horaBonita(enCurso.fin)}`);
  if (siguiente) {
    const texto = `${esManana ? 'Mañana' : 'Siguiente'}: ${nombre(siguiente)} · ${horaBonita(siguiente.inicio)}`;
    partes.push(enCurso ? texto : `${texto}${aulaCorta(siguiente)}`);
  }
  return (
    <button className="linea-clases" onClick={() => ir({ pantalla: 'calendario', vista: 'horario' })}>
      {`🎓 ${partes.join(' — ')}`}
    </button>
  );
}
