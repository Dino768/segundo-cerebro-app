import { proximas, repetidas, sinFecha } from '../agenda/tareas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

export function Tareas({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();

  const seccion = (titulo: string, ts: Tarea[], vacio: string, mostrarFecha = false) => (
    <>
      <h3>{titulo}</h3>
      {ts.length ? (
        <ul className="lista">
          {ts.map((t) => (
            <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
          ))}
        </ul>
      ) : (
        <p className="vacio">{vacio}</p>
      )}
    </>
  );

  return (
    <section>
      <div className="barra">
        <h2>Tareas</h2>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: {} })}>
          + Nueva tarea
        </button>
      </div>
      {seccion('Próximas', proximas(datos.tareas, hoy), 'No hay tareas con fecha pendientes.', true)}
      {seccion('Se repiten', repetidas(datos.tareas), 'No hay tareas que se repitan.')}
      {seccion('Sin fecha', sinFecha(datos.tareas), 'No hay tareas sin fecha.')}
    </section>
  );
}
