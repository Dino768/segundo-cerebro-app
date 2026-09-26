import { mkdirSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { conContexto } from '../src/estudio/contexto.ts';
import { ErrorPizarra, validarOperacion, type Operacion } from '../src/estudio/pizarra.ts';
import { VERSION_PROGRAMA, type EventoChat, type EventoPizarra } from '../src/estudio/tipos.ts';
import { lanzarClaude, type Comando, type Proceso } from './claude.ts';
import { avisoCarpetaConversaciones, carpetaConversaciones, leerConversacionDe, listarConversaciones } from './conversaciones.ts';
import { borrarPizarra, crearPizarra, listarPizarras, operarPizarra, pizarrasNoValidas, vigilarPizarras } from './pizarras.ts';
import { esIdAsignatura, esIdConversacion, esNombreImagen, hostPermitido, origenPermitido, rutaDentro } from './seguridad.ts';

export interface OpcionesServidor {
  puerto: number;
  estudios: string; // my-context/estudios
  dist: string; // la app compilada
  home: string;
  comando: Comando;
  instrucciones: string;
}

export const PREFIJO = '/segundo-cerebro-app/';
const API = `${PREFIJO}api/local/`;
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
const EXTENSION_IMAGEN: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export class ErrorPeticion extends Error {
  readonly estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

export function enviarJson(res: ServerResponse, estado: number, cuerpo: unknown): void {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpo(req: IncomingMessage, limite: number): Promise<Buffer> {
  const trozos: Buffer[] = [];
  let total = 0;
  for await (const t of req) {
    total += (t as Buffer).length;
    if (total > limite) throw new ErrorPeticion(413, 'Demasiado grande');
    trozos.push(t as Buffer);
  }
  return Buffer.concat(trozos);
}

export async function leerJson(req: IncomingMessage, limite = 1_000_000): Promise<Record<string, unknown>> {
  const cuerpo = await leerCuerpo(req, limite);
  try {
    const j = JSON.parse(cuerpo.toString('utf8'));
    if (typeof j === 'object' && j !== null && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch {
    // se trata abajo
  }
  throw new ErrorPeticion(400, 'Petición mal formada');
}

export function asignaturaDe(v: unknown): string {
  if (typeof v !== 'string' || !esIdAsignatura(v)) throw new ErrorPeticion(400, 'Asignatura no válida');
  return v;
}

export function conversacionDe(v: unknown): string {
  if (typeof v !== 'string' || !esIdConversacion(v)) throw new ErrorPeticion(400, 'Conversación no válida');
  return v;
}

function numeroPizarra(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new ErrorPeticion(400, 'Número de pizarra no válido');
  return v;
}

async function esArchivo(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

async function enviarArchivo(res: ServerResponse, ruta: string): Promise<void> {
  let datos: Buffer;
  try {
    datos = await readFile(ruta);
  } catch {
    throw new ErrorPeticion(404, 'No existe');
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(datos);
}

export type Manejador = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;

export function crearServidor(o: OpcionesServidor) {
  mkdirSync(o.estudios, { recursive: true });
  const activos = new Map<string, Proceso>();
  const oyentes = new Set<ServerResponse>();
  const cwdDe = (asig: string) => path.join(o.estudios, asig);
  const carpetaDe = (asig: string, id: string) => path.join(o.estudios, asig, '.en-curso', id);

  function emitirATodos(e: EventoPizarra): void {
    for (const res of oyentes) res.write(`data: ${JSON.stringify(e)}\n\n`);
  }

  // Lanza Claude y va mandando sus eventos. Devuelve true si terminó bien.
  async function conversar(asig: string, id: string, nueva: boolean, mensaje: string, emitir: (e: EventoChat) => void, res: ServerResponse): Promise<boolean> {
    let ok = false;
    const proceso = lanzarClaude(o.comando, { mensaje, id, nueva, cwd: cwdDe(asig), instrucciones: o.instrucciones }, (e) => {
      if (e.tipo === 'fin' && !e.parado) ok = true;
      emitir(e);
    });
    activos.set(id, proceso);
    // Si Diego cierra la pestaña a mitad de respuesta, se para Claude.
    const alCerrar = () => {
      if (!res.writableEnded) proceso.parar();
    };
    res.on('close', alCerrar);
    await proceso.terminado;
    res.off('close', alCerrar);
    activos.delete(id);
    return ok;
  }

  const rutas: Record<string, Manejador> = {
    'GET estado': async (_req, res) => enviarJson(res, 200, { ok: true, version: VERSION_PROGRAMA }),

    'GET conversaciones': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      enviarJson(res, 200, await listarConversaciones(carpetaConversaciones(cwdDe(asig), o.home)));
    },

    'GET conversacion': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      enviarJson(res, 200, await leerConversacionDe(carpetaConversaciones(cwdDe(asig), o.home), id));
    },

    'POST mensaje': async (req, res) => {
      const b = await leerJson(req);
      const asig = asignaturaDe(b.asignatura);
      const id = conversacionDe(b.id);
      const texto = typeof b.texto === 'string' ? b.texto.trim() : '';
      const imagenes = Array.isArray(b.imagenes) ? b.imagenes.filter((n): n is string => typeof n === 'string' && esNombreImagen(n)) : [];
      const abierta = typeof b.pizarraAbierta === 'number' && Number.isInteger(b.pizarraAbierta) ? b.pizarraAbierta : null;
      if (!texto && !imagenes.length) throw new ErrorPeticion(400, 'Mensaje vacío');
      if (activos.has(id)) throw new ErrorPeticion(409, 'Ya estoy contestando en esta conversación');
      const carpeta = carpetaDe(asig, id);
      await mkdir(carpeta, { recursive: true });
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
      const emitir = (e: EventoChat) => {
        if (!res.writableEnded) res.write(JSON.stringify(e) + '\n');
      };
      const conCabecera = (t: string) =>
        conContexto({ asignatura: asig, carpeta, pizarraAbierta: abierta, imagenes: imagenes.map((n) => path.join(carpeta, 'imagenes', n)) }, t);
      const inicio = Date.now() - 50;
      const ok = await conversar(asig, id, b.nueva === true, conCabecera(texto || 'Mira la captura.'), emitir, res);
      if (ok) {
        const aviso = avisoCarpetaConversaciones(cwdDe(asig), o.home);
        if (aviso) console.warn(aviso);
      }
      // Si Claude ha dejado alguna pizarra mal escrita, se le pide una sola vez que la arregle.
      if (ok && !res.destroyed) {
        const malas = await pizarrasNoValidas(carpeta, inicio);
        if (malas.length) {
          emitir({ tipo: 'herramienta', texto: `⚠️ La pizarra ${malas.map((m) => m.n).join(', ')} no era válida: la estoy arreglando` });
          const aviso = malas.map((m) => `La pizarra ${m.n} no es válida: ${m.error}. Arréglala.`).join('\n');
          await conversar(asig, id, false, conCabecera(aviso), emitir, res);
        }
      }
      res.end();
    },

    'POST parar': async (req, res) => {
      const b = await leerJson(req);
      activos.get(conversacionDe(b.id))?.parar();
      enviarJson(res, 200, { ok: true });
    },

    'POST imagen': async (req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      const ext = EXTENSION_IMAGEN[String(req.headers['content-type'] ?? '').split(';')[0].trim()];
      if (!ext) throw new ErrorPeticion(415, 'Solo se admiten imágenes PNG, JPG, WEBP o GIF');
      const datos = await leerCuerpo(req, 10_000_000);
      const carpeta = path.join(carpetaDe(asig, id), 'imagenes');
      await mkdir(carpeta, { recursive: true });
      const nombre = `captura-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
      await writeFile(path.join(carpeta, nombre), datos);
      enviarJson(res, 200, { nombre });
    },

    'GET archivo': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      const ruta = rutaDentro(carpetaDe(asig, id), url.searchParams.get('ruta') ?? '');
      if (!ruta) throw new ErrorPeticion(400, 'Ruta no válida');
      await enviarArchivo(res, ruta);
    },

    'GET pizarras': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      enviarJson(res, 200, await listarPizarras(carpetaDe(asig, id)));
    },

    'POST pizarra/nueva': async (req, res) => {
      const b = await leerJson(req);
      enviarJson(res, 200, { n: await crearPizarra(carpetaDe(asignaturaDe(b.asignatura), conversacionDe(b.id))) });
    },

    'POST pizarra/borrar': async (req, res) => {
      const b = await leerJson(req);
      const id = conversacionDe(b.id);
      const n = numeroPizarra(b.n);
      // Mientras Claude contesta podría estar escribiendo esa pizarra.
      if (activos.has(id)) throw new ErrorPeticion(409, 'Espera a que Claude termine de contestar');
      await borrarPizarra(carpetaDe(asignaturaDe(b.asignatura), id), n);
      enviarJson(res, 200, { ok: true });
    },

    'POST pizarra/operacion': async (req, res) => {
      // Una fusión lleva dos pizarras enteras: se deja más sitio que en el resto de peticiones.
      const b = await leerJson(req, 8_000_000);
      const carpeta = carpetaDe(asignaturaDe(b.asignatura), conversacionDe(b.id));
      const n = numeroPizarra(b.n);
      let op: Operacion;
      try {
        op = validarOperacion(b.op);
      } catch (e) {
        throw new ErrorPeticion(400, e instanceof Error ? e.message : String(e));
      }
      try {
        enviarJson(res, 200, await operarPizarra(carpeta, n, op));
      } catch (e) {
        if (e instanceof ErrorPizarra) throw new ErrorPeticion(409, e.message);
        throw e;
      }
    },

    'GET eventos': async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': conectado\n\n');
      oyentes.add(res);
      const latido = setInterval(() => res.write(': latido\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(latido);
        oyentes.delete(res);
      });
    },
  };

  async function estatico(ruta: string, res: ServerResponse): Promise<void> {
    if (!ruta.startsWith(PREFIJO)) {
      res.writeHead(302, { Location: PREFIJO });
      res.end();
      return;
    }
    let rel: string;
    try {
      rel = decodeURIComponent(ruta.slice(PREFIJO.length)) || 'index.html';
    } catch {
      throw new ErrorPeticion(400, 'Ruta no válida');
    }
    const archivo = rutaDentro(o.dist, rel);
    if (archivo && (await esArchivo(archivo))) return enviarArchivo(res, archivo);
    // Las pantallas de la app no tienen extensión: se sirve la app.
    if (path.extname(rel) === '') return enviarArchivo(res, path.join(o.dist, 'index.html'));
    throw new ErrorPeticion(404, 'No existe');
  }

  async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!hostPermitido(req.headers.host, o.puerto) || !origenPermitido(req.headers.origin, o.puerto))
        throw new ErrorPeticion(403, 'No permitido');
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      if (url.pathname.startsWith(API)) {
        const manejador = rutas[`${req.method} ${url.pathname.slice(API.length)}`];
        if (!manejador) throw new ErrorPeticion(404, 'No existe');
        await manejador(req, res, url);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErrorPeticion(405, 'No permitido');
      await estatico(url.pathname, res);
    } catch (e) {
      const estado = e instanceof ErrorPeticion ? e.estado : 500;
      if (!res.headersSent) enviarJson(res, estado, { error: e instanceof Error ? e.message : String(e) });
      else res.end();
    }
  }

  const servidor = http.createServer((req, res) => void manejar(req, res));
  const pararVigia = vigilarPizarras(o.estudios, emitirATodos);
  servidor.on('close', pararVigia);
  // Si Claude está contestando en alguna conversación (entonces el programa no se reinicia para actualizarse).
  const ocupado = () => activos.size > 0;
  return { servidor, emitirATodos, rutas, carpetaDe, conversar, ocupado };
}
