import { parseAreas, type Area } from './datos/areas';
import { parseProyecto, serializarProyecto, type Proyecto } from './datos/proyectos';
import { CARPETA_PROYECTOS, RUTA_AREAS, RUTA_TAREAS } from './datos/rutas';
import { parseTareas, serializarTareas, type Tarea } from './datos/tareas';
import { ErrorDatos } from './datos/yaml';
import { actualizarArchivo, ErrorGitHub, leerArchivo, listarCarpeta, type Config } from './github/cliente';

export interface Datos {
  tareas: Tarea[];
  areas: Area[];
  proyectos: Proyecto[];
  errores: ErrorDatos[];
}

async function leerOpcional(cfg: Config, ruta: string): Promise<string | null> {
  try {
    return (await leerArchivo(cfg, ruta)).texto;
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return null;
    throw e;
  }
}

function intentar<T>(errores: ErrorDatos[], leer: () => T, porDefecto: T): T {
  try {
    return leer();
  } catch (e) {
    if (e instanceof ErrorDatos) {
      errores.push(e);
      return porDefecto;
    }
    throw e;
  }
}

export type Agenda = Omit<Datos, 'proyectos'>;

export async function cargarAgenda(cfg: Config): Promise<Agenda> {
  const errores: ErrorDatos[] = [];
  const [textoTareas, textoAreas] = await Promise.all([leerOpcional(cfg, RUTA_TAREAS), leerOpcional(cfg, RUTA_AREAS)]);
  const tareas = intentar(errores, () => (textoTareas === null ? [] : parseTareas(textoTareas)), []);
  const areas = intentar(errores, () => (textoAreas === null ? [] : parseAreas(textoAreas)), []);
  return { tareas, areas, errores };
}

export async function cargarTodo(cfg: Config): Promise<Datos> {
  const [{ tareas, areas, errores }, nombres] = await Promise.all([
    cargarAgenda(cfg),
    listarCarpeta(cfg, CARPETA_PROYECTOS),
  ]);
  const leidos = await Promise.all(
    nombres
      .filter((n) => n.endsWith('.md'))
      .map(async (n) => {
        const id = n.slice(0, -3);
        const { texto } = await leerArchivo(cfg, `${CARPETA_PROYECTOS}/${n}`);
        return intentar<Proyecto | null>(errores, () => parseProyecto(id, texto), null);
      }),
  );
  return { tareas, areas, proyectos: leidos.filter((p): p is Proyecto => p !== null), errores };
}

export async function modificarTareas(
  cfg: Config, cambio: (ts: Tarea[]) => Tarea[], mensaje: string,
): Promise<Tarea[]> {
  let resultado: Tarea[] = [];
  await actualizarArchivo(cfg, RUTA_TAREAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseTareas(texto));
    return serializarTareas(resultado);
  }, mensaje);
  return resultado;
}

export async function guardarProyecto(cfg: Config, p: Proyecto, original: Proyecto | null): Promise<void> {
  await actualizarArchivo(cfg, `${CARPETA_PROYECTOS}/${p.id}.md`, (remoto) => {
    if (remoto !== null && !original)
      throw new ErrorGitHub('conflicto', `Ya existe un proyecto con el id "${p.id}"`);
    if (remoto !== null && original && serializarProyecto(parseProyecto(p.id, remoto)) !== serializarProyecto(original))
      throw new ErrorGitHub(
        'conflicto',
        'Este proyecto ha cambiado desde que lo abriste (quizá lo editó Claude). Copia tu texto, pulsa Recargar y vuelve a pegarlo.',
      );
    return serializarProyecto(p);
  }, `${original ? 'Editar' : 'Crear'} proyecto: ${p.titulo}`);
}
