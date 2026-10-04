import { horaBonita, horasCuadricula, minutos, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { diaDeSemana, fromISO, type ISODate } from '../../fechas';
import { datosAsignatura, fondoSuave } from './colores';

interface Props {
  dias: ISODate[]; // de lunes a viernes
  clases: ClaseDelDia[][]; // las de cada día, en el mismo orden
  asignaturas: Asignatura[];
  hoy: ISODate;
  alElegir(c: ClaseDelDia): void;
}

// Cuadrícula semanal: las horas a la izquierda y un bloque por clase, colocado según su hora.
export function CuadriculaHorario({ dias, clases, asignaturas, hoy, alElegir }: Props) {
  const { desde, hasta } = horasCuadricula(clases.flat());
  const total = (hasta - desde) * 60;
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
  const pos = (h: string) => `${((minutos(h) - desde * 60) / total) * 100}%`;
  return (
    <div className="horario" style={{ ['--filas' as string]: hasta - desde }}>
      <div className="horario-horas">
        <span className="horario-cabecera" />
        <div className="horario-columna">
          {horas.map((h) => (
            <span key={h} className="horario-hora" style={{ top: `${((h - desde) / (hasta - desde)) * 100}%` }}>{`${h}:00`}</span>
          ))}
        </div>
      </div>
      {dias.map((dia, i) => (
        <div key={dia} className={`horario-dia${dia === hoy ? ' hoy' : ''}`}>
          <span className="horario-cabecera">{`${diaDeSemana(dia)} ${fromISO(dia).getDate()}`}</span>
          <div className="horario-columna">
            {(clases[i] ?? []).map((c) => {
              const { nombre, color } = datosAsignatura(asignaturas, c.asignatura);
              const alto = `calc(${pos(c.fin)} - ${pos(c.inicio)})`;
              return (
                <button
                  key={`${c.inicio}-${c.asignatura}`}
                  className={`clase-bloque${c.quitada ? ' quitada' : ''}${c.suelta ? ' suelta' : ''}`}
                  style={{ top: pos(c.inicio), height: alto, background: fondoSuave(color), borderLeftColor: color }}
                  onClick={() => alElegir(c)}
                  title={`${nombre} · ${horaBonita(c.inicio)}–${horaBonita(c.fin)}${c.aula ? ` · ${c.aula}` : ''}`}
                >
                  <strong>{nombre}</strong>
                  {c.desdoble && <span className="clase-marca">{c.desdoble}</span>}
                  {c.aula && <span className="clase-aula">{c.aula.split(' · ')[0]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
