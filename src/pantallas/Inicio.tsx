import { LIMITE_ACTIVOS, ordenarProyectos, progresoProyecto } from '../agenda/proyectos';
import { atrasadas, tareasDelDia, topSinFecha } from '../agenda/tareas';
import { colorDeArea } from '../agenda/areas';
import { BarraProgreso } from '../componentes/BarraProgreso';
import { Captura } from '../componentes/Captura';
import { EtiquetaTarea } from '../componentes/EtiquetaTarea';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Icono } from '../componentes/Icono';
import type { Destino } from '../componentes/navegacion';
import { dondeLoDejamos } from '../datos/proyectos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useAhora, useHoy } from '../estado/hoy';
import {
  cuadriculaMes, DIAS, horaCorta, diaDeSemana, diasSemana, formatoLargo, fromISO, nombreMes, saludo, type ISODate,
} from '../fechas';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function Inicio({ editar, ir }: Props) {
  const { datos } = useDatos();
  const hoy = useHoy();
  const ahora = useAhora();
  const retrasadas = atrasadas(datos.tareas, hoy);
  const deHoy = tareasDelDia(datos.tareas, hoy);
  const top = topSinFecha(datos.tareas);
  const activos = ordenarProyectos(datos.proyectos).filter((p) => p.estado === 'activo');
  const fecha = fromISO(hoy);
  const mes = cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1);

  const lista = (ts: Tarea[], mostrarFecha = false) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  const dia = (d: ISODate, etiqueta: string, maximo: number, fuera = false) => {
    const ts = tareasDelDia(datos.tareas, d);
    const clases = ['sem-dia', d === hoy && 'hoy', fuera && 'fuera'].filter(Boolean).join(' ');
    return (
      <button key={d} className={clases} onClick={() => ir({ pantalla: 'calendario', dia: d })}>
        <span className="sem-numero">{etiqueta}</span>
        {ts.slice(0, maximo).map((t) => (
          <EtiquetaTarea key={t.id} tarea={t} dia={d} />
        ))}
        {ts.length > maximo && <span className="mas">+{ts.length - maximo} más</span>}
      </button>
    );
  };

  return (
    <section className="inicio">
      <header className="saludo">
        <h1>{saludo(new Date().getHours())}, Diego</h1>
        <p>{formatoLargo(hoy)} · {horaCorta(ahora)}</p>
      </header>
      <Captura />
      <div className="rejilla-inicio">
        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Hoy <button className="enlace" onClick={() => ir({ pantalla: 'tareas' })}>Ver todas las tareas →</button>
          </h2>
          {retrasadas.length > 0 && (
            <>
              <h3 className="grupo atrasadas">Atrasadas</h3>
              {lista(retrasadas, true)}
            </>
          )}
          <h3 className="grupo">Para hoy</h3>
          {deHoy.length ? lista(deHoy) : <p className="vacio">Nada para hoy.</p>}
          <h3 className="grupo">Sin fecha: lo más importante</h3>
          {top.length ? lista(top) : <p className="vacio">No hay tareas sin fecha pendientes.</p>}
        </section>

        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Proyectos activos <button className="enlace" onClick={() => ir({ pantalla: 'proyectos' })}>Todos →</button>
          </h2>
          {activos.length === 0 && <p className="vacio">No tienes proyectos activos.</p>}
          {activos.map((p) => {
            const dejamos = dondeLoDejamos(p.cuerpo);
            return (
              <button key={p.id} className="tarjeta-proyecto" onClick={() => ir({ pantalla: 'proyectos', proyecto: p.id })}>
                <span className="tarjeta-proyecto-titulo">
                  <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
                  <Icono nombre={p.icono} />
                  {p.titulo}
                </span>
                {dejamos && <span className="detalle">Dónde lo dejamos: {dejamos}</span>}
                <BarraProgreso {...progresoProyecto(datos.tareas, p.id)} />
              </button>
            );
          })}
          {activos.length > 0 && (
            <p className={`aviso-activos${activos.length > LIMITE_ACTIVOS ? ' demasiados' : ''}`}>
              {activos.length} de {LIMITE_ACTIVOS} proyectos activos
              {activos.length > LIMITE_ACTIVOS ? '. Son muchos a la vez: terminar uno te ayudará a acabar las cosas.' : '.'}
            </p>
          )}
        </section>

        <section className="tarjeta ancha">
          <h2 className="titulo-seccion">
            Esta semana{' '}
            <button className="enlace" onClick={() => ir({ pantalla: 'calendario', dia: hoy })}>Abrir calendario →</button>
          </h2>
          <div className="sem-rejilla">
            {diasSemana(hoy).map((d) =>
              dia(d, `${diaDeSemana(d)} ${fromISO(d).getDate()}${d === hoy ? ' · hoy' : ''}`, 5),
            )}
          </div>
        </section>

        <section className="tarjeta ancha">
          <h2 className="titulo-seccion">{nombreMes(fecha.getFullYear(), fecha.getMonth() + 1)}</h2>
          <div className="sem-rejilla cabecera">
            {DIAS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {mes.map((semana) => (
            <div key={semana[0]} className="sem-rejilla mes">
              {semana.map((d) => dia(d, String(fromISO(d).getDate()), 3, fromISO(d).getMonth() !== fecha.getMonth()))}
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
