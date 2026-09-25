import { Fragment, useState } from 'react';
import { alternarArea, encendidasEfectivas, filtrarPorAreas, hayOtrasAreas, OTRAS, tareasDelDia } from '../agenda/tareas';
import { EtiquetaTarea } from '../componentes/EtiquetaTarea';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { VentanaArea } from '../componentes/VentanaArea';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import {
  addDays, cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoCorto, formatoLargo, fromISO, nombreMes,
  sumarMeses, type ISODate,
} from '../fechas';

type Vista = 'mes' | 'semana';

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

export function Calendario({ editar, diaInicial }: { editar(e: Edicion): void; diaInicial?: ISODate }) {
  const { datos, soloLectura, tareasBloqueadas, areasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [vista, setVista] = useState<Vista>('mes');
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
      <div className="filtros-areas" aria-label="Calendarios">
        <button className={`pastilla${efectivas.length === 0 ? ' encendida' : ''}`} onClick={() => cambiarAreas([])}>
          Todo
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
        {tareasDelDia(tareas, seleccionado).map((t) => (
          <FilaTarea key={t.id} tarea={t} dia={seleccionado} alEditar={(x) => editar({ tarea: x })} />
        ))}
      </ul>
    </section>
  );
}
