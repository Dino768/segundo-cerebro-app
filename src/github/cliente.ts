export interface Config {
  owner: string;
  repo: string;
  token: string;
}

export type TipoErrorGitHub = 'token' | 'conflicto' | 'no-existe' | 'red' | 'otro';

export class ErrorGitHub extends Error {
  readonly tipo: TipoErrorGitHub;
  readonly estado?: number;

  constructor(tipo: TipoErrorGitHub, mensaje: string, estado?: number) {
    super(mensaje);
    this.name = 'ErrorGitHub';
    this.tipo = tipo;
    this.estado = estado;
  }
}

export interface Archivo {
  texto: string;
  sha: string;
}

function base64ATexto(b64: string): string {
  const binario = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

function bytesABase64(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function textoABase64(texto: string): string {
  return bytesABase64(new TextEncoder().encode(texto));
}

const API_REPO = (cfg: Config) => `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;

// `ref`: leerlo tal como estaba en ese commit (si no, en la rama principal).
async function peticion(cfg: Config, ruta: string, init: RequestInit = {}, ref?: string): Promise<Response> {
  const url = `${API_REPO(cfg)}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  return pedirUrl(cfg, ref ? `${url}?ref=${encodeURIComponent(ref)}` : url, ruta, init);
}

// Peticiones a la API de Git del repositorio (git/blobs, git/trees…). `ruta` vacía = el propio repositorio.
const peticionRepo = (cfg: Config, ruta: string, init: RequestInit = {}) =>
  pedirUrl(cfg, ruta ? `${API_REPO(cfg)}/${ruta}` : API_REPO(cfg), ruta || 'el repositorio', init);

// `ruta`: lo que se nombra en los mensajes de error.
async function pedirUrl(cfg: Config, url: string, ruta: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${cfg.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ErrorGitHub('red', 'Sin conexión con GitHub');
  }
  if (res.ok) return res;
  if (res.status === 401 || res.status === 403)
    throw new ErrorGitHub('token', 'La llave de GitHub no es válida o ha caducado', res.status);
  if (res.status === 404) throw new ErrorGitHub('no-existe', `No existe ${ruta}`, res.status);
  if (res.status === 409 || res.status === 422)
    throw new ErrorGitHub('conflicto', `${ruta} ha cambiado en GitHub mientras tanto`, res.status);
  const cuerpo = (await res.json().catch(() => null)) as { message?: string } | null;
  throw new ErrorGitHub('otro', `Error de GitHub (${res.status}): ${cuerpo?.message ?? res.statusText}`, res.status);
}

export async function leerArchivo(cfg: Config, ruta: string): Promise<Archivo> {
  const j = await (await peticion(cfg, ruta)).json();
  if (Array.isArray(j) || j.type !== 'file') throw new ErrorGitHub('otro', `${ruta} no es un archivo`);
  // De más de 1 MB, GitHub no manda el contenido: se pide en crudo (el sha es el de arriba; si cambió entre medias, escribir dará conflicto y se reintenta).
  if (j.encoding === 'none' || (!j.content && j.size > 0)) {
    const crudo = await peticion(cfg, ruta, { headers: { Accept: 'application/vnd.github.raw+json' } });
    return { texto: await crudo.text(), sha: j.sha };
  }
  return { texto: base64ATexto(j.content), sha: j.sha };
}

export async function listarCarpeta(cfg: Config, ruta: string): Promise<string[]> {
  try {
    const j = (await (await peticion(cfg, ruta)).json()) as { name: string; type: string }[];
    return j.filter((e) => e.type === 'file').map((e) => e.name);
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return [];
    throw e;
  }
}

// Falla si esta llave no puede ver el repositorio (en uno privado GitHub da 404, igual que una carpeta que no existe).
export async function comprobarAcceso(cfg: Config): Promise<void> {
  await peticionRepo(cfg, '');
}

// El sha que Git da a un archivo: si coincide con el de GitHub, no hace falta volver a subirlo.
export async function shaDeBlob(base64: string): Promise<string> {
  const binario = atob(base64);
  const cabecera = new TextEncoder().encode(`blob ${binario.length}\0`);
  const datos = new Uint8Array(cabecera.length + binario.length);
  datos.set(cabecera);
  for (let i = 0; i < binario.length; i++) datos[cabecera.length + i] = binario.charCodeAt(i);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', datos));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EntradaCarpeta {
  nombre: string;
  tipo: 'file' | 'dir';
  sha: string;
}

// Archivos y carpetas de una carpeta, con su sha (el de una carpeta cambia con cualquier archivo de dentro). [] si no existe.
export async function listarEntradas(cfg: Config, ruta: string, ref?: string): Promise<EntradaCarpeta[]> {
  try {
    const j = (await (await peticion(cfg, ruta, {}, ref)).json()) as { name: string; type: string; sha: string }[];
    if (!Array.isArray(j)) return [];
    return j.filter((e) => e.type === 'file' || e.type === 'dir').map((e) => ({ nombre: e.name, tipo: e.type as 'file' | 'dir', sha: e.sha }));
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return [];
    throw e;
  }
}

// Todos los archivos de una carpeta y sus subcarpetas (rutas relativas a ella, con /).
export async function listarArchivosDe(cfg: Config, ruta: string, prefijo = ''): Promise<{ ruta: string; sha: string }[]> {
  const out: { ruta: string; sha: string }[] = [];
  for (const e of await listarEntradas(cfg, prefijo ? `${ruta}/${prefijo}` : ruta)) {
    const rel = prefijo ? `${prefijo}/${e.nombre}` : e.nombre;
    if (e.tipo === 'dir') out.push(...(await listarArchivosDe(cfg, ruta, rel)));
    else out.push({ ruta: rel, sha: e.sha });
  }
  return out;
}

// Contenido de un archivo por su sha (hasta 100 MB), en base64.
export async function leerBlob(cfg: Config, sha: string): Promise<string> {
  const j = (await (await peticionRepo(cfg, `git/blobs/${sha}`)).json()) as { content: string };
  return j.content.replace(/\s/g, '');
}

export interface CambioArbol {
  ruta: string;
  base64: string | null; // null = borrar
}

// Todos los cambios en un solo commit (API de árboles). Si la rama avanzó mientras tanto, se rehace encima (hasta 3 veces).
// `comprobar` mira la rama antes de cada intento (recibe el commit de encima) y lanza un error si ya no se debe subir.
// Devuelve el commit nuevo.
export async function subirCambios(
  cfg: Config, cambios: CambioArbol[], mensaje: string, comprobar?: (padre: string) => Promise<void>,
): Promise<string> {
  const post = async (ruta: string, cuerpo: unknown) => (await peticionRepo(cfg, ruta, { method: 'POST', body: JSON.stringify(cuerpo) })).json();
  const rama = ((await (await peticionRepo(cfg, '')).json()) as { default_branch: string }).default_branch;
  const shas = new Map<string, string>();
  for (const c of cambios) if (c.base64 !== null) shas.set(c.ruta, ((await post('git/blobs', { content: c.base64, encoding: 'base64' })) as { sha: string }).sha);
  const arbol = cambios.map((c) => ({ path: c.ruta, mode: '100644', type: 'blob', sha: c.base64 === null ? null : shas.get(c.ruta)! }));
  for (let intento = 0; ; intento++) {
    const padre = ((await (await peticionRepo(cfg, `git/ref/heads/${rama}`)).json()) as { object: { sha: string } }).object.sha;
    await comprobar?.(padre);
    const base = ((await (await peticionRepo(cfg, `git/commits/${padre}`)).json()) as { tree: { sha: string } }).tree.sha;
    const nuevoArbol = ((await post('git/trees', { base_tree: base, tree: arbol })) as { sha: string }).sha;
    const commit = ((await post('git/commits', { message: mensaje, tree: nuevoArbol, parents: [padre] })) as { sha: string }).sha;
    try {
      await peticionRepo(cfg, `git/refs/heads/${rama}`, { method: 'PATCH', body: JSON.stringify({ sha: commit, force: false }) });
      return commit;
    } catch (e) {
      if (e instanceof ErrorGitHub && e.tipo === 'conflicto' && intento < 2) continue;
      throw e;
    }
  }
}

export async function escribirBase64(
  cfg: Config, ruta: string, base64: string, sha: string | null, mensaje: string,
): Promise<string> {
  const res = await peticion(cfg, ruta, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: base64, ...(sha ? { sha } : {}) }),
  });
  return (await res.json()).content.sha;
}

export async function escribirArchivo(
  cfg: Config, ruta: string, texto: string, sha: string | null, mensaje: string,
): Promise<string> {
  return escribirBase64(cfg, ruta, textoABase64(texto), sha, mensaje);
}

// Para imágenes: GitHub las da en crudo (así funciona aunque pesen más de 1 MB).
export async function leerBinario(cfg: Config, ruta: string): Promise<Blob> {
  const res = await peticion(cfg, ruta, { headers: { Accept: 'application/vnd.github.raw+json' } });
  return res.blob();
}

export async function borrarArchivo(cfg: Config, ruta: string, sha: string, mensaje: string): Promise<void> {
  await peticion(cfg, ruta, { method: 'DELETE', body: JSON.stringify({ message: mensaje, sha }) });
}

export async function actualizarArchivo(
  cfg: Config, ruta: string, transformar: (texto: string | null) => string, mensaje: string,
): Promise<string> {
  for (let intento = 0; ; intento++) {
    let actual: Archivo | null = null;
    try {
      actual = await leerArchivo(cfg, ruta);
    } catch (e) {
      if (!(e instanceof ErrorGitHub && e.tipo === 'no-existe')) throw e;
    }
    const nuevo = transformar(actual?.texto ?? null);
    try {
      await escribirArchivo(cfg, ruta, nuevo, actual?.sha ?? null, mensaje);
      return nuevo;
    } catch (e) {
      if (e instanceof ErrorGitHub && e.tipo === 'conflicto' && intento === 0) continue;
      throw e;
    }
  }
}
