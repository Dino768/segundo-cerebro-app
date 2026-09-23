import { useState } from 'react';
import { hechaEl, tareasDelDia } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { useDatos } from '../estado/datos';
import {
  addDays, cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoCorto, formatoLargo, fromISO, nombreMes,
  sumarMeses, toISO, type ISODate,
} from '../fechas';

type Vista = 'mes' | 'semana';

export function Calendario({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = toISO(new Date());
  const [vista, setVista] = useState<Vista>('mes');
  const [seleccionado, setSeleccionado] = useState<ISODate>(hoy);

  const fecha = fromISO(seleccionado);
  const semanas = vista === 'mes' ? cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1) : [diasSemana(seleccionado)];
  const titulo = vista === 'mes' ? nombreMes(fecha.getFullYear(), fecha.getMonth() + 1) : `Semana del ${formatoCorto(semanas[0][0])}`;
  const maximo = vista === 'mes' ? 3 : 8;
  const mover = (n: number) => setSeleccionado((s) => (vista === 'semana' ? addDays(s, 7 * n) : sumarMeses(s, n)));

  return (
    <section>
      <div className="barra">
        <button onClick={() => mover(-1)} aria-label="Anterior">‹</button>
        <h2>{titulo}</h2>
        <button onClick={() => mover(1)} aria-label="Siguiente">›</button>
        <button onClick={() => setSeleccionado(hoy)}>Hoy</button>
        <button onClick={() => setVista((v) => (v === 'mes' ? 'semana' : 'mes'))}>
          {vista === 'mes' ? 'Ver semana' : 'Ver mes'}
        </button>
      </div>
      <div className={`cal-cabecera ${vista}`}>
        {DIAS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {semanas.map((semana) => (
        <div key={semana[0]} className={`cal-semana ${vista}`}>
          {semana.map((dia) => {
            const ts = tareasDelDia(datos.tareas, dia);
            const fuera = vista === 'mes' && fromISO(dia).getMonth() !== fecha.getMonth();
            const clases = ['cal-dia', dia === hoy && 'hoy', dia === seleccionado && 'seleccionado', fuera && 'fuera']
              .filter(Boolean)
              .join(' ');
            return (
              <button key={dia} className={clases} onClick={() => setSeleccionado(dia)}>
                <span className="numero">
                  {vista === 'semana' ? `${diaDeSemana(dia)} ${fromISO(dia).getDate()}` : fromISO(dia).getDate()}
                </span>
                {ts.slice(0, maximo).map((t) => (
                  <span
                    key={t.id}
                    className={`cal-tarea${hechaEl(t, dia) ? ' hecha' : ''}`}
                    style={{ background: colorDeArea(datos.areas, t.area) }}
                  >
                    {t.hora ? `${t.hora} ` : ''}
                    {t.titulo}
                  </span>
                ))}
                {ts.length > maximo && <span className="mas">+{ts.length - maximo}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="barra">
        <h3>{formatoLargo(seleccionado)}</h3>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: { fecha: seleccionado } })}>
          + Nueva tarea
        </button>
      </div>
      <ul className="lista">
        {tareasDelDia(datos.tareas, seleccionado).map((t) => (
          <FilaTarea key={t.id} tarea={t} dia={seleccionado} alEditar={(x) => editar({ tarea: x })} />
        ))}
      </ul>
    </section>
  );
}
