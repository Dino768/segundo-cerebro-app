import { spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { EventoChat } from '../src/estudio/tipos.ts';

export interface OpcionesClaude {
  mensaje: string;
  id: string;
  nueva: boolean;
  cwd: string;
  instrucciones: string;
}

export interface Comando {
  bin: string;
  previos: string[];
}

export interface Proceso {
  parar(): void;
  terminado: Promise<void>;
}

export const NO_ENCONTRADO =
  'No encuentro Claude Code en este ordenador. Comprueba que el comando «claude» funciona en una terminal.';

// El mensaje va por stdin (así los saltos de línea, tildes y emojis llegan enteros en Windows).
export function argumentosClaude(o: OpcionesClaude): string[] {
  return [
    '-p',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    ...(o.nueva ? ['--session-id', o.id] : ['--resume', o.id]),
    '--append-system-prompt-file', o.instrucciones,
    // Sin comandos y con los archivos limitados a la carpeta de la asignatura.
    '--restricted',
    '--tools', 'Read,Write,Edit,Glob,Grep',
    '--strict-mcp-config',
    '--permission-mode', 'acceptEdits',
  ];
}

export function describirHerramienta(nombre: string, entrada: unknown): string {
  const e = (typeof entrada === 'object' && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const archivo = typeof e.file_path === 'string' ? path.posix.basename(e.file_path.replace(/\\/g, '/')) : '';
  const pizarra = /^pizarra-(\d+)\.json$/.exec(archivo);
  if ((nombre === 'Write' || nombre === 'Edit') && pizarra) return `✏️ Ha dibujado en la pizarra ${pizarra[1]}`;
  if (nombre === 'Write' || nombre === 'Edit') return `✏️ Ha escrito ${archivo}`;
  if (nombre === 'Read' && pizarra) return `👀 Ha mirado la pizarra ${pizarra[1]}`;
  if (nombre === 'Read' && /\.(png|jpe?g|webp|gif)$/i.test(archivo)) return `👀 Ha mirado ${archivo}`;
  if (nombre === 'Read') return `📖 Ha leído ${archivo}`;
  if (nombre === 'Glob' || nombre === 'Grep') return '🔎 Ha buscado en tus apuntes';
  return `🔧 ${nombre}`;
}

export function explicarError(texto: string, estado?: number): { mensaje: string; uso?: boolean } {
  if (estado === 429 || /usage limit|rate limit|limit reached|límite/i.test(texto))
    return {
      mensaje: 'Has llegado al límite de uso de tu suscripción de Claude. Mira cuándo se renueva en «Uso de Claude».',
      uso: true,
    };
  if (estado === 401 || /log ?in|authenticat|oauth|credential/i.test(texto))
    return { mensaje: 'Claude Code necesita que vuelvas a iniciar sesión: abre una terminal, escribe claude y sigue los pasos.' };
  return { mensaje: `Claude Code ha dado un error: ${texto || 'sin detalles'}` };
}

// Traduce cada línea de «stream-json» a los eventos que entiende la app.
export function crearTraductor(): (linea: string) => EventoChat[] {
  let hayTexto = false;
  return (linea) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let j: any;
    try {
      j = JSON.parse(linea);
    } catch {
      return [];
    }
    if (j?.type === 'stream_event') {
      const ev = j.event;
      if (ev?.type === 'content_block_start' && ev.content_block?.type === 'text' && hayTexto)
        return [{ tipo: 'texto', texto: '\n\n' }];
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && typeof ev.delta.text === 'string') {
        hayTexto = true;
        return [{ tipo: 'texto', texto: ev.delta.text }];
      }
      return [];
    }
    if (j?.type === 'assistant' && Array.isArray(j.message?.content))
      return j.message.content
        .filter((c: { type?: string }) => c?.type === 'tool_use')
        .map((c: { name?: unknown; input?: unknown }) => ({ tipo: 'herramienta', texto: describirHerramienta(String(c.name), c.input) }));
    if (j?.type === 'result') {
      if (!j.is_error && j.subtype === 'success') return [{ tipo: 'fin' }];
      return [{ tipo: 'error', ...explicarError(String(j.result ?? j.subtype ?? ''), j.api_error_status ?? undefined) }];
    }
    return [];
  };
}

export function lanzarClaude(cmd: Comando, o: OpcionesClaude, alEvento: (e: EventoChat) => void): Proceso {
  const hijo = spawn(cmd.bin, [...cmd.previos, ...argumentosClaude(o)], { cwd: o.cwd, windowsHide: true });
  const traducir = crearTraductor();
  let avisado = false;
  let parado = false;
  let errores = '';
  // Después de «fin» o «error» no se manda nada más.
  const avisar = (e: EventoChat) => {
    if (avisado) return;
    if (e.tipo === 'fin' || e.tipo === 'error') avisado = true;
    alEvento(e);
  };

  hijo.stdin.on('error', () => undefined); // si el proceso muere antes de leer el mensaje
  hijo.stdin.end(o.mensaje);
  createInterface({ input: hijo.stdout }).on('line', (l) => {
    for (const e of traducir(l)) avisar(e);
  });
  hijo.stderr.on('data', (d) => {
    errores = (errores + String(d)).slice(-2000);
  });

  const terminado = new Promise<void>((resolver) => {
    let hecho = false;
    const acabar = (codigo: number | null, fallo?: NodeJS.ErrnoException) => {
      if (hecho) return;
      hecho = true;
      if (parado) avisar({ tipo: 'fin', parado: true });
      else if (fallo?.code === 'ENOENT') avisar({ tipo: 'error', mensaje: NO_ENCONTRADO });
      else if (fallo) avisar({ tipo: 'error', mensaje: fallo.message });
      else if (errores.trim()) avisar({ tipo: 'error', ...explicarError(errores.trim()) });
      else avisar({ tipo: 'error', mensaje: `La respuesta se ha cortado (código ${codigo ?? '?'}).` });
      resolver();
    };
    hijo.on('error', (e) => acabar(null, e));
    hijo.on('close', (codigo) => acabar(codigo));
  });

  return {
    parar: () => {
      parado = true;
      hijo.kill();
    },
    terminado,
  };
}
