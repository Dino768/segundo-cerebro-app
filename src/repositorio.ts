import { idsDeArea, moverDeArea, quitarArea, ErrorArea } from './agenda/areas';
import { parseAreas, serializarAreas, type Area } from './datos/areas';
import { parseAsignaturas, serializarAsignaturas, type Asignatura } from './datos/asignaturas';
import { parseProyecto, serializarProyecto, type Proyecto } from './datos/proyectos';
import { parseBandeja } from './datos/bandeja';
import { fusionarBandeja, parseIdeas, serializarIdeas, type Idea } from './datos/ideas';
import { CARPETA_PROYECTOS, RUTA_AREAS, RUTA_ASIGNATURAS, RUTA_BANDEJA, RUTA_IDEAS, RUTA_TAREAS } from './datos/rutas';
import { parseTareas, serializarTareas, type Tarea } from './datos/tareas';
import { ErrorDatos } from './datos/yaml';
import { actualizarArchivo, borrarArchivo, ErrorGitHub, leerArchivo, listarCarpeta, type Config } from './github/cliente';

export interface Datos {
  tareas: Tarea[];
  areas: Area[];
  proyectos: Proyecto[];
  ideas: Idea[];
  asignaturas: Asignatura[];
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

export type Agenda = Omit<Datos, 'proyectos'> & { bandejaPendiente: boolean };

export async function cargarAgenda(cfg: Config): Promise<Agenda> {
  const errores: ErrorDatos[] = [];
  const [textoTareas, textoAreas, textoIdeas, textoBandeja, textoAsignaturas] = await Promise.all([
    leerOpcional(cfg, RUTA_TAREAS),
    leerOpcional(cfg, RUTA_AREAS),
    leerOpcional(cfg, RUTA_IDEAS),
    leerOpcional(cfg, RUTA_BANDEJA),
    leerOpcional(cfg, RUTA_ASIGNATURAS),
  ]);
  const tareas = intentar(errores, () => (textoTareas === null ? [] : parseTareas(textoTareas)), []);
  const areas = intentar(errores, () => (textoAreas === null ? [] : parseAreas(textoAreas)), []);
  // null = ideas.yaml está roto: se aparta con su error y no se intenta el paso de la bandeja.
  const guardadas = intentar<Idea[] | null>(errores, () => (textoIdeas === null ? [] : parseIdeas(textoIdeas)), null);
  // Mientras la bandeja antigua exista, sus ideas se enseñan junto a las de ideas.yaml (el paso se hace después).
  const ideas = textoBandeja === null ? (guardadas ?? []) : fusionarBandeja(guardadas ?? [], parseBandeja(textoBandeja));
  const asignaturas = intentar(errores, () => (textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas)), []);
  return { tareas, areas, ideas, asignaturas, errores, bandejaPendiente: textoBandeja !== null && guardadas !== null };
}

export async function cargarTodo(cfg: Config): Promise<Datos & { bandejaPendiente: boolean }> {
  const [{ tareas, areas, ideas, asignaturas, errores, bandejaPendiente }, nombres] = await Promise.all([
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
  return {
    tareas, areas, ideas, asignaturas, proyectos: leidos.filter((p): p is Proyecto => p !== null), errores, bandejaPendiente,
  };
}

export async function modificarIdeas(cfg: Config, cambio: (is: Idea[]) => Idea[], mensaje: string): Promise<Idea[]> {
  let resultado: Idea[] = [];
  await actualizarArchivo(cfg, RUTA_IDEAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseIdeas(texto));
    return serializarIdeas(resultado);
  }, mensaje);
  return resultado;
}

// Paso de la bandeja antigua: primero se escriben todas sus ideas en ideas.yaml y después se borra bandeja.md.
// Si el borrado falla (p. ej. Claude acaba de escribir en la bandeja), la próxima carga vuelve a fusionar sin duplicar.
export async function migrarBandeja(cfg: Config): Promise<Idea[] | null> {
  let bandeja;
  try {
    bandeja = await leerArchivo(cfg, RUTA_BANDEJA);
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return null;
    throw e;
  }
  const lineas = parseBandeja(bandeja.texto);
  const ideas = await modificarIdeas(cfg, (is) => fusionarBandeja(is, lineas), 'Pasar las ideas de bandeja.md a ideas.yaml');
  await borrarArchivo(cfg, RUTA_BANDEJA, bandeja.sha, 'Borrar bandeja.md (las ideas ya están en ideas.yaml)');
  return ideas;
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

export async function modificarAsignaturas(
  cfg: Config, cambio: (l: Asignatura[]) => Asignatura[], mensaje: string,
): Promise<Asignatura[]> {
  let resultado: Asignatura[] = [];
  await actualizarArchivo(cfg, RUTA_ASIGNATURAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseAsignaturas(texto));
    return serializarAsignaturas(resultado);
  }, mensaje);
  return resultado;
}

export async function modificarAreas(cfg: Config, cambio: (as: Area[]) => Area[], mensaje: string): Promise<Area[]> {
  let resultado: Area[] = [];
  await actualizarArchivo(cfg, RUTA_AREAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseAreas(texto));
    return serializarAreas(resultado);
  }, mensaje);
  return resultado;
}

export async function cambiarAreaDeProyecto(cfg: Config, id: string, ids: string[], destino: string): Promise<Proyecto | null> {
  let resultado: Proyecto | null = null;
  await actualizarArchivo(cfg, `${CARPETA_PROYECTOS}/${id}.md`, (texto) => {
    if (texto === null) throw new ErrorGitHub('no-existe', `No existe el proyecto ${id}`);
    const p = parseProyecto(id, texto);
    resultado = p.area && ids.includes(p.area) ? { ...p, area: destino } : p;
    return serializarProyecto(resultado);
  }, `Mover proyecto ${id} al área ${destino}`);
  return resultado;
}

// Borrar un área: primero todo lo de dentro va al destino y al final se quita de areas.yaml.
// Si algo falla a mitad, el área sigue existiendo y se puede volver a intentar.
export async function moverYBorrarArea(
  cfg: Config, id: string, destino: string, proyectos: string[],
): Promise<{ areas: Area[]; tareas: Tarea[]; ideas: Idea[]; proyectos: Proyecto[] }> {
  const actuales = parseAreas((await leerOpcional(cfg, RUTA_AREAS)) ?? '');
  const ids = idsDeArea(actuales, id);
  if (ids.length === 0) throw new ErrorArea('Esta área ya no existe (quizá la borró Claude u otro dispositivo).');
  if (ids.includes(destino) || !idsDeArea(actuales, destino).length)
    throw new ErrorArea('El destino no es válido: elige otra área que no sea la que se borra ni una de sus subáreas.');
  const tareas = await modificarTareas(cfg, (ts) => moverDeArea(ts, ids, destino), `Mover tareas al área ${destino}`);
  const ideas = await modificarIdeas(cfg, (is) => moverDeArea(is, ids, destino), `Mover ideas al área ${destino}`);
  const movidos: Proyecto[] = [];
  for (const p of proyectos) {
    const r = await cambiarAreaDeProyecto(cfg, p, ids, destino);
    if (r) movidos.push(r);
  }
  const areas = await modificarAreas(cfg, (as) => quitarArea(as, id), `Borrar área ${id}`);
  return { areas, tareas, ideas, proyectos: movidos };
}

export async function listarIdsProyectos(cfg: Config): Promise<string[]> {
  return (await listarCarpeta(cfg, CARPETA_PROYECTOS)).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
}
