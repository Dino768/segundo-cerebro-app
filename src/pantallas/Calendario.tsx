import { Fragment, useState } from 'react';
import { anadirSuelta, borrarSuelta, clasesActivas, clasesDelDia, quitarClase, volverAPoner, type ClaseDelDia } from '../agenda/horario';
import { alternarArea, encendidasEfectivas, filtrarPorAreas, hayOtrasAreas, OTRAS, tareasDelDia } from '../agenda/tareas';
import { EtiquetaTarea } from '../componentes/EtiquetaTarea';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { CuadriculaHorario } from '../componentes/horario/CuadriculaHorario';
import { FilaClase } from '../componentes/horario/FilaClase';
import { FormClaseSuelta } from '../componentes/horario/FormClaseSuelta';
import { VentanaClase } from '../componentes/horario/VentanaClase';
import type { Destino } from '../componentes/navegacion';
import { VentanaArea } from '../componentes/VentanaArea';
import { guardarClasesVisibles, leerClasesVisibles } from '../estado/clasesVisibles';
import { useDatos } from '../estado/datos';
import { useHorario } from '../estado/horario';
import { useHoy } from '../estado/hoy';
import {
  addDays, cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoCorto, formatoLargo, fromISO, nombreMes,
  sumarMeses, type ISODate,
} from '../fechas';

type Vista = 'mes' | 'semana' | 'horario';

// El filtro de áreas se recuerda en cada dispositivo. Si el navegador no deja guardarlo, se empieza con todas.
// `conocidas` guarda qué áreas había cuando se tocó el filtro por última vez, para que una nueva (de aquí o de
// otra pantalla) salga visible aunque haya un filtro activo (spec §3.8).
const CLAVE_AREAS = 'sc-calendario-areas';

interface FiltroAreas {
  encendidas: string[];
  conocidas: string[];
}

function esListaDeTextos(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

function leerFiltro(): FiltroAreas {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLAVE_AREAS) ?? 'null');
    // Formato antiguo: solo la lista de encendidas. Sin «conocidas» guardadas, cualquier área ya existente
    // se trata como nueva (sale visible) hasta que se vuelva a tocar el filtro; no rompe nada, solo se ve de más.
    if (esListaDeTextos(v)) return { encendidas: v, conocidas: [] };
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (esListaDeTextos(o.encendidas)) return { encendidas: o.encendidas, conocidas: esListaDeTextos(o.conocidas) ? o.conocidas : [] };
    }
  } catch {
    // sin almacenamiento o roto: se empieza con todas
  }
  return { encendidas: [], conocidas: [] };
}

function guardarFiltro(f: FiltroAreas): void {
  try {
    localStorage.setItem(CLAVE_AREAS, JSON.stringify(f));
  } catch {
    // sin almacenamiento: no se recuerda el filtro
  }
}

export function Calendario({ editar, ir, diaInicial, vistaInicial }: { editar(e: Edicion): void; ir(d: Destino): void; diaInicial?: ISODate; vistaInicial?: 'horario' }) {
  const { datos, soloLectura, tareasBloqueadas, areasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [vista, setVista] = useState<Vista>(vistaInicial ?? 'mes');
  const { horario, cambiarAjustes } = useHorario();
  const [conClases, setConClases] = useState(leerClasesVisibles);
  const [claseAbierta, setClaseAbierta] = useState<ClaseDelDia | null>(null);
  const [nuevaSuelta, setNuevaSuelta] = useState(false);
  const alternarClases = () => {
    guardarClasesVisibles(!conClases);
    setConClases(!conClases);
  };
  const clasesDe = (dia: ISODate) => (conClases ? clasesActivas(horario.clases, horario.ajustes, dia) : []);
  const cambiarClase = async (cambio: Parameters<typeof cambiarAjustes>[0], mensaje: string) => {
    if (await cambiarAjustes(cambio, mensaje)) setClaseAbierta(null);
  };
  const [seleccionado, setSeleccionado] = useState<ISODate>(diaInicial ?? hoy);
  const [filtro, setFiltro] = useState<FiltroAreas>(leerFiltro);
  const [editandoArea, setEditandoArea] = useState<{ id?: string } | null>(null);

  const botones = [
    ...datos.areas.map((a) => ({ id: a.id, nombre: a.nombre, color: a.color })),
    ...(hayOtrasAreas(datos.tareas, datos.areas) ? [{ id: OTRAS, nombre: 'Otras', color: '#9ca3af' }] : []),
  ];
  const todas = botones.map((b) => b.id);
  const efectivas = encendidasEfectivas(filtro.encendidas, filtro.conocidas, todas);
  const estaEncendida = (id: string) => efectivas.length === 0 || efectivas.includes(id);
  const tareas = filtrarPorAreas(datos.tareas, efectivas, datos.areas);
  const cambiarAreas = (nuevas: string[]) => {
    const f = { encendidas: nuevas, conocidas: todas };
    setFiltro(f);
    guardarFiltro(f);
  };

  const fecha = fromISO(seleccionado);
  const semanas = vista === 'mes' ? cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1) : [diasSemana(seleccionado)];
  const titulo = vista === 'mes' ? nombreMes(fecha.getFullYear(), fecha.getMonth() + 1) : `Semana del ${formatoCorto(semanas[0][0])}`;
  const maximo = vista === 'mes' ? 3 : 8;
  const mover = (n: number) => setSeleccionado((s) => (vista === 'mes' ? sumarMeses(s, n) : addDays(s, 7 * n)));

  return (
    <section>
      <div className="barra">
        <button onClick={() => mover(-1)} aria-label="Anterior">‹</button>
        <h2>{titulo}</h2>
        <button onClick={() => mover(1)} aria-label="Siguiente">›</button>
        <button onClick={() => setSeleccionado(hoy)}>Hoy</button>
        <div className="pestanas" role="tablist">
          {(['mes', 'semana', 'horario'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : '🎓 Horario'}
            </button>
          ))}
        </div>
      </div>
      <div className="filtros-areas" aria-label="Calendarios">
        <button className={`pastilla${efectivas.length === 0 ? ' encendida' : ''}`} onClick={() => cambiarAreas([])}>
          Todo
        </button>
        <button className={`pastilla${conClases ? ' encendida' : ''}`} aria-pressed={conClases} onClick={alternarClases}>
          🎓 Clases
        </button>
        {botones.map((b) => (
          <Fragment key={b.id}>
            <button
              className={`pastilla${estaEncendida(b.id) ? ' encendida' : ''}`}
              aria-pressed={estaEncendida(b.id)}
              onClick={() => cambiarAreas(alternarArea(efectivas, b.id, todas))}
            >
              <span className="punto" style={{ background: b.color }} />
              {b.nombre}
            </button>
            {b.id !== OTRAS && (
              <button className="lapiz" aria-label={`Editar ${b.nombre}`} onClick={() => setEditandoArea({ id: b.id })} disabled={soloLectura || areasBloqueadas}>
                ✏️
              </button>
            )}
          </Fragment>
        ))}
        <button className="pastilla" onClick={() => setEditandoArea({})} disabled={soloLectura || areasBloqueadas}>+ Nueva área</button>
      </div>
      {editandoArea && <VentanaArea id={editandoArea.id} cerrar={() => setEditandoArea(null)} />}
      {claseAbierta && (
        <VentanaClase
          clase={claseAbierta}
          asignaturas={datos.asignaturas}
          bloqueado={soloLectura}
          cerrar={() => setClaseAbierta(null)}
          alAbrir={() => ir({ pantalla: 'estudio', asignatura: claseAbierta.asignatura })}
          alQuitar={() => void cambiarClase((a) => quitarClase(a, claseAbierta), 'Quitar una clase del horario')}
          alPoner={() => void cambiarClase((a) => volverAPoner(a, claseAbierta), 'Volver a poner una clase del horario')}
          alBorrar={() => void cambiarClase((a) => borrarSuelta(a, claseAbierta), 'Borrar una clase suelta')}
        />
      )}
      {nuevaSuelta && (
        <FormClaseSuelta
          asignaturas={datos.asignaturas}
          dia={seleccionado}
          cerrar={() => setNuevaSuelta(false)}
          guardar={(s) => {
            setNuevaSuelta(false);
            void cambiarAjustes((a) => anadirSuelta(a, s), 'Añadir una clase suelta');
          }}
        />
      )}
      {vista === 'horario' ? (
        <>
          <CuadriculaHorario
            dias={semanas[0].slice(0, 5)}
            clases={semanas[0].slice(0, 5).map((d) => clasesDelDia(horario.clases, horario.ajustes, d))}
            asignaturas={datos.asignaturas}
            hoy={hoy}
            alElegir={setClaseAbierta}
          />
          {horario.clases.length === 0 && <p className="vacio">Todavía no hay horario: aparece después de la próxima sincronización de la uni.</p>}
          <button disabled={soloLectura} onClick={() => setNuevaSuelta(true)}>+ Clase suelta</button>
        </>
      ) : (
        <>
          <div className={`cal-cabecera ${vista}`}>
            {DIAS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0]} className={`cal-semana ${vista}`}>
              {semana.map((dia) => {
                const ts = tareasDelDia(tareas, dia);
                const fuera = vista === 'mes' && fromISO(dia).getMonth() !== fecha.getMonth();
                const clases = ['cal-dia', dia === hoy && 'hoy', dia === seleccionado && 'seleccionado', fuera && 'fuera']
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button key={dia} className={clases} onClick={() => setSeleccionado(dia)}>
                    <span className="numero">
                      {vista === 'semana' ? `${diaDeSemana(dia)} ${fromISO(dia).getDate()}` : fromISO(dia).getDate()}
                    </span>
                    {clasesDe(dia).length > 0 && (
                      <span className="etiqueta-tarea" style={{ borderLeftColor: 'var(--suave)' }}>
                        {`🎓 ${vista === 'mes' ? clasesDe(dia).length : clasesDe(dia).map((c) => c.inicio.replace(/^0/, '')).join(' · ')}`}
                      </span>
                    )}
                    {ts.slice(0, maximo).map((t) => (
                      <EtiquetaTarea key={t.id} tarea={t} dia={dia} />
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
            {clasesDe(seleccionado).map((c) => (
              <FilaClase key={`${c.inicio}-${c.asignatura}`} clase={c} asignaturas={datos.asignaturas} alElegir={setClaseAbierta} />
            ))}
            {tareasDelDia(tareas, seleccionado).map((t) => (
              <FilaTarea key={t.id} tarea={t} dia={seleccionado} alEditar={(x) => editar({ tarea: x })} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
