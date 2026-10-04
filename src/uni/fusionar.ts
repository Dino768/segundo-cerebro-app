import { siguienteIdTarea, type Tarea } from '../datos/tareas.ts';
import type { ISODate } from '../fechas.ts';
import type { Propuesta } from './tipos.ts';
import type { Visto, Vistos } from './vistos.ts';

export interface Adelanto { origen: string; titulo: string; antes: ISODate; ahora: ISODate }

export interface ResultadoFusion {
  tareas: Tarea[];
  vistos: Vistos;
  creadas: number;
  actualizadas: number;
  adelantadas: Adelanto[];
}

const CAMPOS_DE_LA_FUENTE = ['fecha', 'hora', 'notas', 'titulo'] as const;

// Junta lo que proponen las fuentes con las tareas, sin pisar nada de Diego (spec, sección 3):
// solo crea lo que nunca se ha visto, solo cambia un campo si cambió en la fuente y nunca borra.
export function fusionar(tareas: Tarea[], vistos: Vistos, propuestas: Propuesta[], hoy: ISODate): ResultadoFusion {
  const resultado = [...tareas];
  const nuevosVistos: Vistos = { ...vistos };
  let creadas = 0;
  let actualizadas = 0;
  const adelantadas: Adelanto[] = [];
  for (const p of propuestas) {
    const antes = nuevosVistos[p.origen];
    const ahora = vistoDe(p);
    nuevosVistos[p.origen] = ahora;
    const i = resultado.findIndex((t) => t.origen === p.origen);
    if (!antes) {
      // Si ya está en tareas (se perdió la lista de vistos), se deja como está.
      if (i < 0) {
        resultado.push(crear(p, siguienteIdTarea(hoy, resultado)));
        creadas++;
      }
      continue;
    }
    if (i < 0) continue; // Diego la borró: no vuelve.
    const cambiada = aplicarCambiosDeLaFuente(resultado[i], antes, ahora);
    if (ahora.fecha < antes.fecha && resultado[i].fecha === antes.fecha)
      adelantadas.push({ origen: p.origen, titulo: resultado[i].titulo, antes: antes.fecha, ahora: ahora.fecha });
    if (cambiada !== resultado[i]) {
      resultado[i] = cambiada;
      actualizadas++;
    }
  }
  for (const [origen, v] of Object.entries(nuevosVistos)) if (v.fecha < hoy) delete nuevosVistos[origen];
  return { tareas: resultado, vistos: nuevosVistos, creadas, actualizadas, adelantadas };
}

function vistoDe(p: Propuesta): Visto {
  return {
    fecha: p.fecha,
    ...(p.hora ? { hora: p.hora } : {}),
    ...(p.notasDeLaFuente && p.notas ? { notas: p.notas } : {}),
    ...(p.tituloDeLaFuente ? { titulo: p.titulo } : {}),
  };
}

function aplicarCambiosDeLaFuente(t: Tarea, antes: Visto, ahora: Visto): Tarea {
  let r: Tarea = t;
  for (const k of CAMPOS_DE_LA_FUENTE) {
    if (antes[k] === ahora[k]) continue;
    if (k === 'titulo' && ahora.titulo === undefined) continue;
    const copia = { ...r } as Record<string, unknown>;
    if (ahora[k] === undefined) delete copia[k];
    else copia[k] = ahora[k];
    r = copia as unknown as Tarea;
  }
  return r;
}

function crear(p: Propuesta, id: string): Tarea {
  return {
    id,
    titulo: p.titulo,
    ...(p.tipo !== 'tarea' ? { tipo: p.tipo } : {}),
    area: p.area,
    fecha: p.fecha,
    ...(p.hora ? { hora: p.hora } : {}),
    ...(p.notas ? { notas: p.notas } : {}),
    origen: p.origen,
  };
}
