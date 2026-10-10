import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { leerConversacion, tituloConversacion } from '../src/estudio/conversacion.ts';
import type { Mensaje, ResumenConversacion } from '../src/estudio/tipos.ts';
import { escribirAtomico } from './pizarras.ts';

// Claude Code guarda las conversaciones de cada carpeta en ~/.claude/projects/<ruta con guiones>/.
export function carpetaConversaciones(cwd: string, home = os.homedir()): string {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
}

export { leerConversacion, tituloConversacion };

// Si Claude Code guarda conversaciones pero no donde esperamos (quizá cambió su regla de nombres),
// se avisa en la consola del programa en vez de enseñar la lista vacía sin más.
export function avisoCarpetaConversaciones(cwd: string, home = os.homedir()): string | null {
  const carpeta = carpetaConversaciones(cwd, home);
  if (existsSync(carpeta) || !existsSync(path.join(home, '.claude', 'projects'))) return null;
  return `No encuentro las conversaciones de ${cwd} en ${carpeta}. Puede que Claude Code haya cambiado dónde las guarda.`;
}

// `nombres`: los que Diego ha puesto a sus chats (si no, el título es su primera pregunta).
export async function listarConversaciones(carpeta: string, nombres: Record<string, string> = {}): Promise<ResumenConversacion[]> {
  let archivos: string[];
  try {
    archivos = await readdir(carpeta);
  } catch {
    return [];
  }
  const lista = await Promise.all(
    archivos
      .filter((n) => n.endsWith('.jsonl'))
      .map(async (n): Promise<ResumenConversacion | null> => {
        const ruta = path.join(carpeta, n);
        const [texto, info] = await Promise.all([readFile(ruta, 'utf8'), stat(ruta)]);
        const titulo = tituloConversacion(leerConversacion(texto));
        const id = n.slice(0, -'.jsonl'.length);
        return titulo ? { id, titulo: nombres[id] ?? titulo, fecha: info.mtime.toISOString() } : null;
      }),
  );
  return lista.filter((c): c is ResumenConversacion => c !== null).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function leerConversacionDe(carpeta: string, id: string): Promise<Mensaje[]> {
  try {
    return leerConversacion(await readFile(path.join(carpeta, `${id}.jsonl`), 'utf8'));
  } catch {
    return [];
  }
}

// Los nombres que Diego pone a sus chats: solo en este PC (como los chats), en .en-curso/nombres.json de la asignatura.
const archivoNombres = (cwd: string) => path.join(cwd, '.en-curso', 'nombres.json');

export async function leerNombres(cwd: string): Promise<Record<string, string>> {
  try {
    const j: unknown = JSON.parse(await readFile(archivoNombres(cwd), 'utf8'));
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return {};
    return Object.fromEntries(Object.entries(j).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
}

// Un nombre vacío lo quita (el chat vuelve a llamarse como su primera pregunta).
export async function ponerNombre(cwd: string, id: string, nombre: string): Promise<void> {
  const nombres = await leerNombres(cwd);
  if (nombre) nombres[id] = nombre;
  else delete nombres[id];
  await mkdir(path.dirname(archivoNombres(cwd)), { recursive: true });
  await escribirAtomico(archivoNombres(cwd), JSON.stringify(nombres, null, 2) + '\n');
}

// Borra un chat: su archivo y su carpeta de Claude Code, sus pizarras a medias (.en-curso/<id>) y su nombre.
// Las pizarras guardadas en el historial (pizarras/) no se tocan. `id` ya viene validado (sin rutas).
export async function borrarConversacion(carpeta: string, cwd: string, id: string): Promise<void> {
  await rm(path.join(carpeta, `${id}.jsonl`), { force: true });
  await rm(path.join(carpeta, id), { recursive: true, force: true });
  await rm(path.join(cwd, '.en-curso', id), { recursive: true, force: true });
  if ((await leerNombres(cwd))[id] !== undefined) await ponerNombre(cwd, id, '');
}
