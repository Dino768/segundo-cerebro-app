import { validarPizarra, type Operacion, type Pizarra } from './pizarra';
import { VERSION_PROGRAMA, type EstadoPizarra, type EventoChat, type Mensaje, type ResumenConversacion } from './tipos';

// Habla con el programa local (npm run local). En la web publicada no existe y todo falla en silencio.
const BASE = `${import.meta.env.BASE_URL}api/local`;

export class ErrorLocal extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorLocal';
  }
}

const consulta = (o: Record<string, string>) => new URLSearchParams(o).toString();

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/${ruta}`, { cache: 'no-store', ...init });
  } catch {
    throw new ErrorLocal('El programa local no responde.');
  }
  const j: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new ErrorLocal((j as { error?: string } | null)?.error ?? `Error del programa local (${r.status})`);
  return j as T;
}

const enviarJson = (cuerpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

// 'antiguo': el programa local sigue abierto desde antes de una actualización y hay que cerrarlo y volver a abrirlo.
export async function comprobarProgramaLocal(): Promise<'si' | 'antiguo' | 'no'> {
  try {
    const r = await fetch(`${BASE}/estado`, { cache: 'no-store' });
    if (!r.ok) return 'no';
    const j = (await r.json()) as { ok?: boolean; version?: number };
    if (j.ok !== true) return 'no';
    return j.version === VERSION_PROGRAMA ? 'si' : 'antiguo';
  } catch {
    return 'no';
  }
}

// Lo que manda el programa local se revisa igual que lo que llega de GitHub (así siempre trae capas y trazos).
function revisada(p: unknown): Pizarra | null {
  if (!p) return null;
  try {
    return validarPizarra(p).pizarra;
  } catch {
    return null;
  }
}

export const listarConversaciones = (asignatura: string) =>
  pedir<ResumenConversacion[]>(`conversaciones?${consulta({ asignatura })}`);

export const leerConversacion = (asignatura: string, id: string) =>
  pedir<Mensaje[]>(`conversacion?${consulta({ asignatura, id })}`);

export interface Envio {
  asignatura: string;
  id: string;
  nueva: boolean;
  texto: string;
  imagenes: string[];
  pizarraAbierta: number | null;
}

export function crearLectorLineas(alLinea: (l: string) => void): ((trozo: string) => void) & { fin(): void } {
  let resto = '';
  const leer = ((trozo: string) => {
    resto += trozo;
    const partes = resto.split('\n');
    resto = partes.pop() ?? '';
    for (const p of partes) if (p.trim()) alLinea(p);
  }) as ((trozo: string) => void) & { fin(): void };
  leer.fin = () => {
    if (resto.trim()) alLinea(resto);
    resto = '';
  };
  return leer;
}

// Manda el mensaje y va entregando los eventos según llegan. Termina cuando el programa cierra la respuesta.
export async function enviarMensaje(envio: Envio, alEvento: (e: EventoChat) => void): Promise<void> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/mensaje`, enviarJson(envio));
  } catch {
    alEvento({ tipo: 'error', mensaje: 'El programa local no responde.' });
    return;
  }
  if (!r.ok || !r.body) {
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    alEvento({ tipo: 'error', mensaje: j?.error ?? `Error del programa local (${r.status})` });
    return;
  }
  const leer = crearLectorLineas((l) => {
    try {
      alEvento(JSON.parse(l) as EventoChat);
    } catch {
      // línea rota: se ignora
    }
  });
  const lector = r.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      leer(value);
    }
    leer.fin();
  } catch {
    alEvento({ tipo: 'error', mensaje: 'Se ha perdido la conexión con el programa local.' });
  }
}

export const pararRespuesta = (asignatura: string, id: string) => pedir<{ ok: boolean }>('parar', enviarJson({ asignatura, id }));

export async function subirImagen(asignatura: string, id: string, archivo: Blob): Promise<string> {
  const j = await pedir<{ nombre: string }>(`imagen?${consulta({ asignatura, id })}`, {
    method: 'POST',
    headers: { 'Content-Type': archivo.type },
    body: archivo,
  });
  return j.nombre;
}

export const urlArchivo = (asignatura: string, id: string, ruta: string) => `${BASE}/archivo?${consulta({ asignatura, id, ruta })}`;
export const urlEventos = () => `${BASE}/eventos`;

// Para subir las imágenes al historial (la API de GitHub pide base64).
export async function leerArchivoBase64(asignatura: string, id: string, ruta: string): Promise<string> {
  const r = await fetch(urlArchivo(asignatura, id, ruta), { cache: 'no-store' });
  if (!r.ok) throw new ErrorLocal(`No encuentro ${ruta}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

export const leerPizarras = async (asignatura: string, id: string): Promise<EstadoPizarra[]> =>
  (await pedir<EstadoPizarra[]>(`pizarras?${consulta({ asignatura, id })}`)).map((e) => ({ ...e, pizarra: revisada(e.pizarra), base: revisada(e.base ?? null) }));

export async function nuevaPizarra(asignatura: string, id: string): Promise<number> {
  return (await pedir<{ n: number }>('pizarra/nueva', enviarJson({ asignatura, id }))).n;
}

export async function borrarPizarra(asignatura: string, id: string, n: number): Promise<void> {
  await pedir<{ ok: true }>('pizarra/borrar', enviarJson({ asignatura, id, n }));
}

export async function operarPizarra(asignatura: string, id: string, n: number, op: Operacion): Promise<Pizarra> {
  const p = await pedir<Pizarra>('pizarra/operacion', enviarJson({ asignatura, id, n, op }));
  return revisada(p) ?? p;
}
