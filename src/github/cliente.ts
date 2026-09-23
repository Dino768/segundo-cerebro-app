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

function textoABase64(texto: string): string {
  let binario = '';
  for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte);
  return btoa(binario);
}

async function peticion(cfg: Config, ruta: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
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

export async function escribirArchivo(
  cfg: Config, ruta: string, texto: string, sha: string | null, mensaje: string,
): Promise<string> {
  const res = await peticion(cfg, ruta, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: textoABase64(texto), ...(sha ? { sha } : {}) }),
  });
  return (await res.json()).content.sha;
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
