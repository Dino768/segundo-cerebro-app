// Sincronización de la uni: exámenes oficiales de la URJC y calendario del aula virtual → agenda/tareas.yaml.
// La ejecuta cada 3 horas el workflow de my-context (.github/workflows/uni.yml). Node sin compilar: imports con .ts.
// La URL del calendario es una llave: nunca se escribe en la consola ni en los errores.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseAsignaturas } from '../src/datos/asignaturas.ts';
import { RUTA_ASIGNATURAS, RUTA_TAREAS, RUTA_UNI_SINCRONIZACION } from '../src/datos/rutas.ts';
import { parseTareas, serializarTareas } from '../src/datos/tareas.ts';
import { leerExamenes, propuestasDeExamenes, type ExamenUrjc } from '../src/uni/examenes.ts';
import { fusionar } from '../src/uni/fusionar.ts';
import { hoyEnMadrid } from '../src/uni/hora.ts';
import { leerIcs, type ResultadoIcs } from '../src/uni/ics.ts';
import { propuestasDeMoodle } from '../src/uni/moodle.ts';
import { ErrorFormato, porCodigo } from '../src/uni/tipos.ts';
import { parseVistos, serializarVistos } from '../src/uni/vistos.ts';

const URL_EXAMENES = 'https://servicios.urjc.es/examenes/informacion';
const TITULACION = '2327'; // Grado en Ingeniería de Robótica Software (Fuenlabrada)
const ESPERA_MAXIMA = 30_000;

export interface Opciones {
  carpeta: string; // la carpeta de my-context
  urlCalendario: string;
  ahora: Date;
  prueba: boolean; // true: calcula y resume, pero no guarda
  descargar: typeof fetch;
}

export interface Resumen {
  creadas: number;
  actualizadas: number;
  saltados: number;
  escrito: boolean;
}

export async function sincronizarUni(o: Opciones): Promise<Resumen> {
  const [textoTareas, textoAsignaturas, textoVistos] = await Promise.all(
    [RUTA_TAREAS, RUTA_ASIGNATURAS, RUTA_UNI_SINCRONIZACION].map((ruta) => leerSiExiste(path.join(o.carpeta, ruta))),
  );
  const tareas = textoTareas === null ? [] : parseTareas(textoTareas);
  const asignaturas = porCodigo(textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas));
  if (asignaturas.size === 0) throw new Error(`ninguna asignatura de ${RUTA_ASIGNATURAS} tiene codigo: no hay nada que sincronizar`);
  const vistos = parseVistos(textoVistos);

  const [calendario, examenes] = await Promise.all([descargarCalendario(o), descargarExamenes(o)]);
  const hoy = hoyEnMadrid(o.ahora);
  const propuestas = [
    ...propuestasDeExamenes(examenes, asignaturas, hoy),
    ...propuestasDeMoodle(calendario.eventos, asignaturas, hoy),
  ];
  const r = fusionar(tareas, vistos, propuestas, hoy);

  const tareasNuevas = serializarTareas(r.tareas);
  const vistosNuevos = serializarVistos(r.vistos);
  const cambianTareas = tareasNuevas !== serializarTareas(tareas);
  const cambianVistos = vistosNuevos !== serializarVistos(vistos);
  if (!o.prueba) {
    if (cambianTareas) await writeFile(path.join(o.carpeta, RUTA_TAREAS), tareasNuevas);
    if (cambianVistos) await writeFile(path.join(o.carpeta, RUTA_UNI_SINCRONIZACION), vistosNuevos);
  }
  return {
    creadas: r.creadas,
    actualizadas: r.actualizadas,
    saltados: calendario.saltados,
    escrito: !o.prueba && (cambianTareas || cambianVistos),
  };
}

export function textoResumen(r: Resumen): string {
  return `Uni: ${r.creadas} nuevas, ${r.actualizadas} actualizadas`;
}

async function leerSiExiste(ruta: string): Promise<string | null> {
  try {
    return await readFile(ruta, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

// Los errores de red de fetch pueden llevar la URL dentro: se sustituyen por un mensaje sin ella.
async function pedir(o: Opciones, que: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await o.descargar(url, { ...init, signal: AbortSignal.timeout(ESPERA_MAXIMA) });
  } catch {
    throw new Error(`no se ha podido conectar con ${que} (sin internet, web caída o tarda demasiado)`);
  }
}

async function descargarCalendario(o: Opciones): Promise<ResultadoIcs> {
  const res = await pedir(o, 'el aula virtual', o.urlCalendario);
  if (!res.ok) throw new Error(`el aula virtual contestó ${res.status} al pedir el calendario (¿ha caducado el enlace?)`);
  return leerIcs(await res.text());
}

async function descargarExamenes(o: Opciones): Promise<ExamenUrjc[]> {
  const res = await pedir(o, 'la web de exámenes de la URJC', URL_EXAMENES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: `titulacion=${TITULACION}&convocatoria=T`,
  });
  if (!res.ok) throw new Error(`la web de exámenes de la URJC contestó ${res.status}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ErrorFormato('la web de exámenes de la URJC no ha devuelto datos (¿está en mantenimiento?)');
  }
  return leerExamenes(json);
}

async function principal(): Promise<void> {
  const args = process.argv.slice(2);
  const carpeta = args.find((a) => !a.startsWith('--'));
  const urlCalendario = process.env.URJC_CALENDARIO?.trim();
  if (!carpeta || !urlCalendario) {
    console.error('Uso: URJC_CALENDARIO=<enlace del calendario> node sincronizar/uni.ts <carpeta de my-context> [--prueba]');
    process.exit(2);
  }
  try {
    const prueba = args.includes('--prueba');
    const r = await sincronizarUni({ carpeta, urlCalendario, ahora: new Date(), prueba, descargar: fetch });
    if (r.saltados) console.error(`Aviso: se han saltado ${r.saltados} eventos del calendario sin UID o sin fecha.`);
    if (prueba) console.error('Modo prueba: no se ha guardado nada.');
    console.log(textoResumen(r));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) await principal();
