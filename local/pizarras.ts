import { watch, type FSWatcher } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { aplicarOperacion, ErrorPizarra, pizarraVacia, serializarPizarra, validarPizarra, type Operacion, type Pizarra } from '../src/estudio/pizarra.ts';
import type { EstadoPizarra, EventoPizarra } from '../src/estudio/tipos.ts';

const PATRON = /^pizarra-(\d+)\.json$/;
// Última versión buena de cada pizarra, para enseñarla si Claude deja el archivo a medio escribir.
const ultimasBuenas = new Map<string, Pizarra>();
// Las operaciones de Diego sobre una misma pizarra van de una en una.
const colas = new Map<string, Promise<unknown>>();

export const rutaPizarra = (carpeta: string, n: number) => path.join(carpeta, `pizarra-${n}.json`);
export const rutaBase = (carpeta: string, n: number) => path.join(carpeta, `pizarra-${n}.subida.json`);

async function leerBase(carpeta: string, n: number): Promise<Pizarra | null> {
  try {
    return validarPizarra(JSON.parse(await readFile(rutaBase(carpeta, n), 'utf8'))).pizarra;
  } catch {
    return null;
  }
}

async function numeros(carpeta: string): Promise<number[]> {
  try {
    return (await readdir(carpeta))
      .map((nombre) => PATRON.exec(nombre))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function leerPizarra(carpeta: string, n: number): Promise<EstadoPizarra> {
  const ruta = rutaPizarra(carpeta, n);
  try {
    const { pizarra, avisos } = validarPizarra(JSON.parse(await readFile(ruta, 'utf8')));
    ultimasBuenas.set(ruta, pizarra);
    return { n, pizarra, error: null, avisos, base: await leerBase(carpeta, n) };
  } catch (e) {
    const error = e instanceof SyntaxError ? `JSON mal escrito: ${e.message}` : e instanceof Error ? e.message : String(e);
    return { n, pizarra: ultimasBuenas.get(ruta) ?? null, error, avisos: [], base: await leerBase(carpeta, n) };
  }
}

export async function listarPizarras(carpeta: string): Promise<EstadoPizarra[]> {
  return Promise.all((await numeros(carpeta)).map((n) => leerPizarra(carpeta, n)));
}

// Se escribe en un archivo aparte y luego se renombra: así nadie lee nunca media pizarra escrita por la app.
export async function escribirAtomico(ruta: string, texto: string): Promise<void> {
  const temporal = `${ruta}.${process.pid}.tmp`;
  await writeFile(temporal, texto, 'utf8');
  await rename(temporal, ruta);
}

export async function crearPizarra(carpeta: string): Promise<number> {
  await mkdir(carpeta, { recursive: true });
  const n = ((await numeros(carpeta)).at(-1) ?? 0) + 1;
  await escribirAtomico(rutaPizarra(carpeta, n), serializarPizarra(pizarraVacia(`Pizarra ${n}`)));
  return n;
}

export function operarPizarra(carpeta: string, n: number, op: Operacion): Promise<Pizarra> {
  const ruta = rutaPizarra(carpeta, n);
  const siguiente = (colas.get(ruta) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const estado = await leerPizarra(carpeta, n);
      // Si la pizarra está rota (Claude la está escribiendo), no se sobrescribe su trabajo.
      if (estado.error || !estado.pizarra) throw new ErrorPizarra(estado.error ?? 'La pizarra no existe');
      const nueva = aplicarOperacion(estado.pizarra, op);
      await escribirAtomico(ruta, serializarPizarra(nueva));
      ultimasBuenas.set(ruta, nueva);
      // La copia base es lo que hay ahora en el historial: lo que se acaba de subir, o lo que se acaba de juntar.
      if (op.tipo === 'guardada' && op.subida) await escribirAtomico(rutaBase(carpeta, n), serializarPizarra(op.subida));
      if (op.tipo === 'fusionar') await escribirAtomico(rutaBase(carpeta, n), serializarPizarra(op.suya));
      return nueva;
    });
  colas.set(ruta, siguiente);
  return siguiente;
}

// Borra la pizarra de la conversación (la copia del historial, si la hay, se queda). Las demás no cambian de número.
export function borrarPizarra(carpeta: string, n: number): Promise<void> {
  const ruta = rutaPizarra(carpeta, n);
  const siguiente = (colas.get(ruta) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      await rm(ruta, { force: true });
      await rm(rutaBase(carpeta, n), { force: true });
      ultimasBuenas.delete(ruta);
    });
  colas.set(ruta, siguiente);
  return siguiente;
}

export async function pizarrasNoValidas(carpeta: string, desde: number): Promise<{ n: number; error: string }[]> {
  const malas: { n: number; error: string }[] = [];
  for (const n of await numeros(carpeta)) {
    try {
      if ((await stat(rutaPizarra(carpeta, n))).mtimeMs < desde) continue;
    } catch {
      continue;
    }
    const e = await leerPizarra(carpeta, n);
    if (e.error) malas.push({ n, error: e.error });
  }
  return malas;
}

const PATRON_CAMBIO = /^([a-z0-9][a-z0-9-]*)[\\/]\.en-curso[\\/]([0-9a-f-]{36})[\\/]pizarra-(\d+)\.json$/;

export function interpretarCambio(nombre: string): EventoPizarra | null {
  const m = PATRON_CAMBIO.exec(nombre);
  return m ? { tipo: 'pizarra', asignatura: m[1], conversacion: m[2], n: Number(m[3]) } : null;
}

export function vigilarPizarras(estudios: string, alCambiar: (e: EventoPizarra) => void): () => void {
  let vigia: FSWatcher | null = null;
  const pendientes = new Map<string, ReturnType<typeof setTimeout>>();
  try {
    vigia = watch(estudios, { recursive: true }, (_tipo, nombre) => {
      const evento = nombre ? interpretarCambio(String(nombre)) : null;
      if (!evento) return;
      // Un guardado genera varios avisos seguidos: se espera un momento y se manda uno.
      const clave = String(nombre);
      clearTimeout(pendientes.get(clave));
      pendientes.set(clave, setTimeout(() => {
        pendientes.delete(clave);
        alCambiar(evento);
      }, 120));
    });
    vigia.on('error', () => undefined);
  } catch (e) {
    console.warn(`No puedo vigilar ${estudios}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return () => {
    vigia?.close();
    pendientes.forEach(clearTimeout);
  };
}
