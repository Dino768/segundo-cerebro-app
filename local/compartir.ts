// Paquete de un chat compartido (spec chats compartidos §3-§4). Solo archivos de este ordenador: GitHub lo hace la app.
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArchivoPaquete, Compartidos, EntradaCompartido, InfoChat } from '../src/estudio/tipos.ts';
import { leerNombres, ponerNombre } from './conversaciones.ts';
import { escribirAtomico } from './pizarras.ts';
import { aPortable, cambiarId, dePortable, esTextoPortable } from './portable.ts';

export interface LugarChat {
  carpetaClaude: string; // ~/.claude/projects/<cwd con guiones>
  cwd: string; // my-context/estudios/<asignatura>
  raiz: string; // my-context
  id: string;
}

const CONVERSACION = 'conversacion.jsonl';
const INFO = 'chat.json';
const SESION = 'sesion';

// Rutas relativas con / y sin trozos vacíos, «..» ni nombres que empiecen por punto.
export const esRutaPaquete = (r: string) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/.test(r);
export const tamanoPaquete = (a: ArchivoPaquete[]) => a.reduce((t, x) => t + Buffer.byteLength(x.base64, 'base64'), 0);

// Rutas relativas (con /) de todos los archivos de una carpeta; [] si no existe.
async function archivosDe(carpeta: string, prefijo = ''): Promise<string[]> {
  let entradas;
  try {
    entradas = await readdir(carpeta, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entradas) {
    const rel = prefijo ? `${prefijo}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await archivosDe(path.join(carpeta, e.name), rel)));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

async function empaquetar(archivo: string, ruta: string, raiz: string): Promise<ArchivoPaquete> {
  const datos = await readFile(archivo);
  const contenido = esTextoPortable(ruta) ? Buffer.from(aPortable(datos.toString('utf8'), raiz), 'utf8') : datos;
  return { ruta, base64: contenido.toString('base64') };
}

export async function prepararPaquete(l: LugarChat, info: InfoChat): Promise<ArchivoPaquete[]> {
  const jsonl = path.join(l.carpetaClaude, `${l.id}.jsonl`);
  if (!existsSync(jsonl)) throw new Error('Este chat aún no tiene mensajes');
  const sesion = path.join(l.carpetaClaude, l.id);
  const curso = path.join(l.cwd, '.en-curso', l.id);
  const nombre = (await leerNombres(l.cwd))[l.id];
  const paquete: ArchivoPaquete[] = [await empaquetar(jsonl, CONVERSACION, l.raiz)];
  for (const r of await archivosDe(sesion)) paquete.push(await empaquetar(path.join(sesion, ...r.split('/')), `${SESION}/${r}`, l.raiz));
  for (const r of await archivosDe(curso)) paquete.push(await empaquetar(path.join(curso, ...r.split('/')), r, l.raiz));
  const completa: InfoChat = nombre ? { ...info, nombre } : info;
  paquete.push({ ruta: INFO, base64: Buffer.from(JSON.stringify(completa, null, 2) + '\n').toString('base64') });
  return paquete;
}

function leerInfo(base64: string | undefined): InfoChat | null {
  if (!base64) return null;
  try {
    const j = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return typeof j?.compartidoEl === 'string' && typeof j?.dispositivo === 'string' ? (j as InfoChat) : null;
  } catch {
    return null;
  }
}

// Se escribe todo en carpetas temporales y solo al final se cambia por lo que había. Lo de antes se aparta (.viejo)
// y, si algo falla a mitad (en Windows, un archivo bloqueado), se vuelve a poner: el chat de aquí no se pierde.
// `renombrar` solo se cambia en las pruebas.
export async function instalarPaquete(l: LugarChat, archivos: ArchivoPaquete[], renombrar: (de: string, a: string) => Promise<void> = rename,
): Promise<InfoChat | null> {
  if (!archivos.some((a) => a.ruta === CONVERSACION)) throw new Error('El chat compartido no tiene conversación');
  for (const a of archivos) if (!esRutaPaquete(a.ruta)) throw new Error(`Ruta no válida en el chat compartido: ${a.ruta}`);
  const tmpClaude = path.join(l.carpetaClaude, `${l.id}.instalando`);
  const tmpCurso = path.join(l.cwd, '.en-curso', `${l.id}.instalando`);
  await rm(tmpClaude, { recursive: true, force: true });
  await rm(tmpCurso, { recursive: true, force: true });
  try {
    for (const a of archivos) {
      if (a.ruta === INFO) continue;
      const enClaude = a.ruta === CONVERSACION || a.ruta.startsWith(`${SESION}/`);
      const destino = path.join(enClaude ? tmpClaude : tmpCurso, ...a.ruta.split('/'));
      await mkdir(path.dirname(destino), { recursive: true });
      const datos = Buffer.from(a.base64, 'base64');
      await writeFile(destino, esTextoPortable(a.ruta) ? dePortable(datos.toString('utf8'), l.raiz) : datos);
    }
    await mkdir(tmpCurso, { recursive: true });
    // [lo que hay ahora, lo nuevo]
    const cambios: [string, string][] = [
      [path.join(l.carpetaClaude, `${l.id}.jsonl`), path.join(tmpClaude, CONVERSACION)],
      [path.join(l.carpetaClaude, l.id), path.join(tmpClaude, SESION)],
      [path.join(l.cwd, '.en-curso', l.id), tmpCurso],
    ];
    for (const [actual] of cambios) await rm(`${actual}.viejo`, { recursive: true, force: true });
    const apartados: string[] = [];
    const puestos: string[] = [];
    try {
      for (const [actual] of cambios)
        if (existsSync(actual)) {
          await renombrar(actual, `${actual}.viejo`);
          apartados.push(actual);
        }
      for (const [actual, nuevo] of cambios)
        if (existsSync(nuevo)) {
          await renombrar(nuevo, actual);
          puestos.push(actual);
        }
    } catch (e) {
      for (const p of puestos) await rm(p, { recursive: true, force: true });
      for (const a of apartados) await rename(`${a}.viejo`, a);
      throw e;
    }
    for (const a of apartados) await rm(`${a}.viejo`, { recursive: true, force: true });
  } finally {
    await rm(tmpClaude, { recursive: true, force: true });
    await rm(tmpCurso, { recursive: true, force: true });
  }
  const info = leerInfo(archivos.find((a) => a.ruta === INFO)?.base64);
  const antes = (await leerNombres(l.cwd))[l.id];
  if (info?.nombre) await ponerNombre(l.cwd, l.id, info.nombre);
  else if (antes !== undefined) await ponerNombre(l.cwd, l.id, '');
  return info;
}

async function copiarConId(origen: string, destino: string, viejo: string, nuevo: string): Promise<void> {
  await mkdir(path.dirname(destino), { recursive: true });
  if (esTextoPortable(origen)) await writeFile(destino, cambiarId(await readFile(origen, 'utf8'), viejo, nuevo));
  else await cp(origen, destino);
}

// Un chat nuevo igual que este (para no perder lo de aquí si se usó a la vez en otro dispositivo).
export async function copiarChat(l: LugarChat, nuevoId: string, nombre: string): Promise<void> {
  const jsonl = path.join(l.carpetaClaude, `${l.id}.jsonl`);
  if (existsSync(jsonl)) await copiarConId(jsonl, path.join(l.carpetaClaude, `${nuevoId}.jsonl`), l.id, nuevoId);
  for (const r of await archivosDe(path.join(l.carpetaClaude, l.id)))
    await copiarConId(path.join(l.carpetaClaude, l.id, ...r.split('/')), path.join(l.carpetaClaude, nuevoId, ...r.split('/')), l.id, nuevoId);
  const curso = path.join(l.cwd, '.en-curso', l.id);
  if (existsSync(curso)) await cp(curso, path.join(l.cwd, '.en-curso', nuevoId), { recursive: true });
  await ponerNombre(l.cwd, nuevoId, nombre);
}

const archivoCompartidos = (cwd: string) => path.join(cwd, '.en-curso', 'compartidos.json');

// Los cambios de compartidos.json van de uno en uno (si no, dos a la vez leen lo mismo y uno pisa al otro).
const colas = new Map<string, Promise<unknown>>();
function enCola<T>(cwd: string, hacer: () => Promise<T>): Promise<T> {
  const antes = colas.get(cwd) ?? Promise.resolve();
  const ahora = antes.catch(() => undefined).then(hacer);
  colas.set(cwd, ahora);
  return ahora;
}

async function cambiarCompartidos(cwd: string, cambiar: (c: Compartidos) => boolean): Promise<void> {
  const c = await leerCompartidos(cwd);
  if (!cambiar(c)) return;
  await mkdir(path.dirname(archivoCompartidos(cwd)), { recursive: true });
  await escribirAtomico(archivoCompartidos(cwd), JSON.stringify(c, null, 2) + '\n');
}

export async function leerCompartidos(cwd: string): Promise<Compartidos> {
  try {
    const j: unknown = JSON.parse(await readFile(archivoCompartidos(cwd), 'utf8'));
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return {};
    const out: Compartidos = {};
    for (const [id, e] of Object.entries(j as Record<string, Partial<EntradaCompartido>>))
      if (typeof e?.version === 'string' && typeof e.pendiente === 'boolean' && typeof e.compartidoEl === 'string')
        out[id] = { version: e.version, pendiente: e.pendiente, compartidoEl: e.compartidoEl };
    return out;
  } catch {
    return {};
  }
}

export function ponerCompartido(cwd: string, id: string, e: EntradaCompartido | null): Promise<void> {
  return enCola(cwd, () =>
    cambiarCompartidos(cwd, (c) => {
      if (e) c[id] = e;
      else delete c[id];
      return true;
    }),
  );
}

// Algo ha cambiado en este chat (una respuesta de Claude, la pizarra, el nombre): queda por subir aunque se cierre la app.
export function marcarPendiente(cwd: string, id: string): Promise<void> {
  return enCola(cwd, () =>
    cambiarCompartidos(cwd, (c) => {
      if (!c[id] || c[id].pendiente) return false;
      c[id] = { ...c[id], pendiente: true };
      return true;
    }),
  );
}
