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

async function peticion(cfg: Config, ruta: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`;
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
