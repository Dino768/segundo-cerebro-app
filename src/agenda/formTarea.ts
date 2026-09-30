import type { Prioridad, Tarea, TipoTarea } from '../datos/tareas';
import { DIAS, type Dia, type ISODate } from '../fechas';
import { hastaDurante, type Unidad } from './repeticion';
import type { TareaSinId } from './tareas';
import { CAMPOS_TIPO, tipoDe } from './tipos';

export type ModoRepetir = 'no' | 'semana' | 'mes' | 'año';
export type ModoFin = 'sin' | 'fecha' | 'durante';

export interface EstadoForm {
  tipo: TipoTarea;
  titulo: string;
  area: string;
  icono?: string;
  prioridad: Prioridad | ''; // '' = por defecto (media en tareas; automática en exámenes y entregas)
  fecha: string;
  hora: string;
  modoRepetir: ModoRepetir;
  dias: Dia[];
  modoFin: ModoFin;
  hastaFecha: string;
  durante: number;
  unidad: Unidad;
  proyecto: string;
  notas: string;
}

export function estadoInicial(
  original: Tarea | null,
  nueva: { fecha?: string; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string },
  area: string,
  icono: string | undefined,
): EstadoForm {
  const rep = original?.repetir;
  return {
    tipo: original ? tipoDe(original) : 'tarea',
    titulo: original?.titulo ?? nueva.titulo ?? '',
    area: original?.area ?? area,
    icono,
    prioridad: original?.prioridad ?? '',
    fecha: original?.fecha ?? nueva.fecha ?? '',
    hora: original?.hora ?? '',
    modoRepetir: rep === 'mes' || rep === 'año' ? rep : Array.isArray(rep) && rep.length ? 'semana' : 'no',
    dias: Array.isArray(rep) ? rep : [],
    modoFin: original?.hasta ? 'fecha' : 'sin',
    hastaFecha: original?.hasta ?? '',
    durante: 1,
    unidad: 'meses',
    proyecto: original?.proyecto ?? nueva.proyecto ?? '',
    notas: original?.notas ?? nueva.notas ?? '',
  };
}

// Convierte lo escrito en el formulario en la tarea que se guarda. Los campos que el tipo no tiene se quitan
// (así, pasar de Tarea a Evento borra la prioridad). Lo que el formulario no enseña (origen, hechas…) se conserva.
export function tareaDelFormulario(f: EstadoForm, original: Tarea | null, hoy: ISODate): { tarea: TareaSinId } | { error: string } {
  const titulo = f.titulo.trim();
  if (!titulo) return { error: 'Escribe un título.' };
  const c = CAMPOS_TIPO[f.tipo];
  const repetir = !c.repetir || f.modoRepetir === 'no'
    ? undefined
    : f.modoRepetir === 'semana'
      ? (f.dias.length ? DIAS.filter((d) => f.dias.includes(d)) : undefined)
      : f.modoRepetir;
  // Cada mes / cada año necesitan un día de referencia: si no hay fecha, hoy.
  const fecha = f.fecha || (repetir === 'mes' || repetir === 'año' ? hoy : undefined);
  const hasta = !repetir || f.modoFin === 'sin'
    ? undefined
    : f.modoFin === 'fecha'
      ? f.hastaFecha || undefined
      : hastaDurante(fecha ?? hoy, f.durante, f.unidad);
  if (hasta && fecha && hasta < fecha) return { error: 'El último día no puede ser anterior a la fecha de inicio.' };
  const prioridad = !c.prioridad || !f.prioridad || (f.tipo === 'tarea' && f.prioridad === 'media') ? undefined : f.prioridad;
  return {
    tarea: {
      ...original,
      titulo,
      area: f.area,
      icono: f.icono,
      tipo: f.tipo === 'tarea' ? undefined : f.tipo,
      prioridad,
      fecha,
      hora: c.hora ? f.hora || undefined : undefined,
      repetir,
      hasta,
      proyecto: c.proyecto ? f.proyecto || undefined : undefined,
      notas: c.notas ? f.notas.trim() || undefined : undefined,
    },
  };
}
