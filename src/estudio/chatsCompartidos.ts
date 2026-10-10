// Los chats compartidos en GitHub: estudios/<asignatura>/chats/<id>/ (spec chats compartidos §3.1).
import { ErrorGitHub, leerArchivo, leerBinario, leerBlob, listarArchivosDe, listarEntradas, subirCambios, type Config } from '../github/cliente';
import { leerConversacion } from './conversacion';
import type { ArchivoPaquete, InfoChat, Mensaje } from './tipos';

export const carpetaChats = (asig: string) => `estudios/${asig}/chats`;
const carpetaChat = (asig: string, id: string) => `${carpetaChats(asig)}/${id}`;
const ES_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ChatRemoto {
  id: string;
  version: string; // sha de su carpeta: cambia con cualquier archivo de dentro
}

export async function listarRemotos(cfg: Config, asig: string): Promise<ChatRemoto[]> {
  return (await listarEntradas(cfg, carpetaChats(asig)))
    .filter((e) => e.tipo === 'dir' && ES_ID.test(e.nombre))
    .map((e) => ({ id: e.nombre, version: e.sha }));
}

// Sube el chat en un solo commit; lo que había en GitHub y ya no está en el paquete se borra. Devuelve la versión nueva.
export async function subirPaquete(cfg: Config, asig: string, id: string, archivos: ArchivoPaquete[], titulo: string): Promise<string> {
  const carpeta = carpetaChat(asig, id);
  const nuevos = new Set(archivos.map((a) => a.ruta));
  const viejos = (await listarArchivosDe(cfg, carpeta)).filter((a) => !nuevos.has(a.ruta));
  await subirCambios(cfg, [
    ...archivos.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: a.base64 })),
    ...viejos.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: null })),
  ], `Chat compartido: ${asig} · ${titulo}`);
  const version = (await listarRemotos(cfg, asig)).find((c) => c.id === id)?.version;
  if (!version) throw new ErrorGitHub('otro', 'El chat no aparece en GitHub después de subirlo');
  return version;
}

export async function bajarPaquete(cfg: Config, asig: string, id: string): Promise<ArchivoPaquete[]> {
  const lista = await listarArchivosDe(cfg, carpetaChat(asig, id));
  return Promise.all(lista.map(async (a) => ({ ruta: a.ruta, base64: await leerBlob(cfg, a.sha) })));
}

export async function quitarRemoto(cfg: Config, asig: string, id: string, titulo: string): Promise<void> {
  const carpeta = carpetaChat(asig, id);
  const lista = await listarArchivosDe(cfg, carpeta);
  if (!lista.length) return;
  await subirCambios(cfg, lista.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: null })), `Chat ya no compartido: ${asig} · ${titulo}`);
}

export async function leerInfoRemota(cfg: Config, asig: string, id: string): Promise<InfoChat | null> {
  try {
    const j = JSON.parse((await leerArchivo(cfg, `${carpetaChat(asig, id)}/chat.json`)).texto);
    return typeof j?.compartidoEl === 'string' && typeof j?.actualizado === 'string' ? (j as InfoChat) : null;
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo !== 'no-existe') throw e;
    return null;
  }
}

export async function leerMensajesRemotos(cfg: Config, asig: string, id: string): Promise<Mensaje[]> {
  return leerConversacion((await leerArchivo(cfg, `${carpetaChat(asig, id)}/conversacion.jsonl`)).texto);
}

// URL de una captura del chat (se descarga una vez).
export function imagenDeChat(cfg: Config, asig: string, id: string): (nombre: string) => Promise<string> {
  const urls = new Map<string, Promise<string>>();
  return (nombre) => {
    if (!urls.has(nombre)) urls.set(nombre, leerBinario(cfg, `${carpetaChat(asig, id)}/imagenes/${nombre}`).then((b) => URL.createObjectURL(b)));
    return urls.get(nombre)!;
  };
}
