import type { Area } from '../datos/areas';
import { TIPOS, type Tarea, type TipoTarea } from '../datos/tareas';
import type { ISODate } from '../fechas';
import { agruparPorArea } from './agrupar';
import { enPlazo, prioridadEfectiva } from './plazos';
import { atrasadas, esRepetida, repetidas, sinFecha, tareasDelDia } from './tareas';
import { tipoDe } from './tipos';

export type ClaveGrupo = 'atrasadas' | 'hoy' | 'seAcerca' | 'proximas' | 'recados' | 'repiten' | 'sinFecha';

export interface GrupoAhora {
  clave: ClaveGrupo;
  titulo: string;
  tareas: Tarea[];
  plegado: boolean;
  mostrarFecha: boolean;
}

const RANGO = { alta: 0, media: 1, baja: 2 } as const;
const pendiente = (t: Tarea) => !esRepetida(t) && !t.hecha;
const despuesDeHoy = (t: Tarea, hoy: ISODate) => !!t.fecha && t.fecha > hoy;

// Por fecha (sin fecha al final), hora y luego prioridad efectiva.
function ordenar(hoy: ISODate) {
  return (a: Tarea, b: Tarea) =>
    (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999') ||
    (a.hora ?? '99').localeCompare(b.hora ?? '99') ||
    RANGO[prioridadEfectiva(a, hoy)] - RANGO[prioridadEfectiva(b, hoy)];
}

// Tarjeta «Ahora» de la pantalla Tareas (spec §4). Solo los grupos con algo.
export function gruposAhora(ts: Tarea[], hoy: ISODate): GrupoAhora[] {
  const orden = ordenar(hoy);
  const grupos: GrupoAhora[] = [
    { clave: 'atrasadas', titulo: 'Atrasadas', tareas: atrasadas(ts, hoy), plegado: false, mostrarFecha: true },
    { clave: 'hoy', titulo: 'Hoy', tareas: tareasDelDia(ts, hoy), plegado: false, mostrarFecha: false },
    {
      clave: 'seAcerca', titulo: 'Se acerca', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && despuesDeHoy(t, hoy) && enPlazo(t, hoy)).sort(orden),
    },
    {
      clave: 'proximas', titulo: 'Próximas', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && tipoDe(t) === 'tarea' && despuesDeHoy(t, hoy)).sort(orden),
    },
    {
      clave: 'recados', titulo: 'Recados', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && tipoDe(t) === 'recado' && (!t.fecha || t.fecha > hoy)).sort(orden),
    },
    { clave: 'repiten', titulo: 'Se repiten', tareas: repetidas(ts, hoy), plegado: true, mostrarFecha: false },
    { clave: 'sinFecha', titulo: 'Sin fecha', tareas: sinFecha(ts), plegado: true, mostrarFecha: false },
  ];
  return grupos.filter((g) => g.tareas.length > 0);
}

export interface RamaTipo {
  tipo: TipoTarea;
  tareas: Tarea[];
}

export interface NodoSubarea {
  id: string;
  nombre: string;
  color: string;
  total: number;
  tipos: RamaTipo[];
}

export interface NodoArea extends NodoSubarea {
  subareas: NodoSubarea[];
}

// Lo pendiente: sin hacer; los eventos y exámenes, mientras no hayan pasado; lo que se repite, mientras no haya terminado.
function pendienteEnArbol(t: Tarea, hoy: ISODate): boolean {
  if (esRepetida(t)) return !(t.hasta && t.hasta < hoy);
  if (tipoDe(t) === 'evento') return !t.fecha || t.fecha >= hoy;
  if (tipoDe(t) === 'examen') return !t.hecha && (!t.fecha || t.fecha >= hoy);
  return !t.hecha;
}

function porTipo(ts: Tarea[], hoy: ISODate): RamaTipo[] {
  const orden = ordenar(hoy);
  return TIPOS.map((tipo) => ({ tipo, tareas: ts.filter((t) => tipoDe(t) === tipo).sort(orden) })).filter((r) => r.tareas.length > 0);
}

// Tarjeta «Por áreas»: área → subárea → tipo (spec §4).
export function arbolPorAreas(ts: Tarea[], areas: Area[], hoy: ISODate): NodoArea[] {
  const pendientes = ts.filter((t) => pendienteEnArbol(t, hoy));
  return agruparPorArea(pendientes, areas).map((g) => {
    const subareas = g.subgrupos.map((s) => ({
      id: s.subarea.id, nombre: s.subarea.nombre, color: s.subarea.color, total: s.items.length, tipos: porTipo(s.items, hoy),
    }));
    return {
      id: g.area?.id ?? 'sin-area',
      nombre: g.area?.nombre ?? 'Sin área',
      color: g.area?.color ?? '#8b7b6a',
      total: g.items.length + subareas.reduce((n, s) => n + s.total, 0),
      tipos: porTipo(g.items, hoy),
      subareas,
    };
  });
}

export function proximosExamenes(ts: Tarea[], hoy: ISODate, n = 3): Tarea[] {
  return ts
    .filter((t) => tipoDe(t) === 'examen' && pendiente(t) && !!t.fecha && t.fecha >= hoy)
    .sort(ordenar(hoy))
    .slice(0, n);
}

// Para la tarjeta Hoy del Inicio: exámenes y entregas de los próximos días en prioridad alta.
export function urgentes(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => (tipoDe(t) === 'examen' || tipoDe(t) === 'entrega') && pendiente(t) && despuesDeHoy(t, hoy) && prioridadEfectiva(t, hoy) === 'alta')
    .sort(ordenar(hoy));
}
