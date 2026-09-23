import { atrasadas, tareasDelDia, topSinFecha } from '../agenda/tareas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { formatoLargo, toISO, type ISODate } from '../fechas';

export function Hoy({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = toISO(new Date());
  const retrasadas = atrasadas(datos.tareas, hoy);
  const deHoy = tareasDelDia(datos.tareas, hoy);
  const top = topSinFecha(datos.tareas);

  const lista = (ts: Tarea[], dia: ISODate, mostrarFecha = false) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={dia} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  return (
    <section>
      <div className="barra">
        <h2>Hoy, {formatoLargo(hoy)}</h2>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: { fecha: hoy } })}>
          + Nueva tarea
        </button>
      </div>
      {retrasadas.length > 0 && (
        <>
          <h3 className="atrasadas">Atrasadas</h3>
          {lista(retrasadas, hoy, true)}
        </>
      )}
      <h3>Para hoy</h3>
      {deHoy.length ? lista(deHoy, hoy) : <p className="vacio">Nada para hoy.</p>}
      <h3>Sin fecha: lo más importante</h3>
      {top.length ? lista(top, hoy) : <p className="vacio">No hay tareas sin fecha pendientes.</p>}
    </section>
  );
}
