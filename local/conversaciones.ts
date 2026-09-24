import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sinContexto } from '../src/estudio/contexto.ts';
import type { Mensaje, ResumenConversacion } from '../src/estudio/tipos.ts';
import { describirHerramienta } from './claude.ts';

// Claude Code guarda las conversaciones de cada carpeta en ~/.claude/projects/<ruta con guiones>/.
export function carpetaConversaciones(cwd: string, home = os.homedir()): string {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
}

function textoDeDiego(contenido: unknown): { texto: string; imagenes: string[] } | null {
  let texto: string;
  if (typeof contenido === 'string') texto = contenido;
  else if (Array.isArray(contenido)) {
    const textos = contenido
      .filter((c): c is { type: 'text'; text: string } => c?.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text);
    if (!textos.length) return null; // solo resultados de herramientas
    texto = textos.join('\n');
  } else return null;
  const limpio = sinContexto(texto);
  // Órdenes internas de Claude Code (/comandos, avisos): empiezan por una etiqueta.
  if (!limpio.texto.trim() || limpio.texto.trimStart().startsWith('<')) return null;
  return limpio;
}

export function leerConversacion(texto: string): Mensaje[] {
  const mensajes: Mensaje[] = [];
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let j: any;
    try {
      j = JSON.parse(linea);
    } catch {
      continue;
    }
    if (j.isMeta || j.isSidechain) continue;
    if (j.type === 'user') {
      const d = textoDeDiego(j.message?.content);
      if (d) mensajes.push(d.imagenes.length ? { rol: 'diego', texto: d.texto, imagenes: d.imagenes } : { rol: 'diego', texto: d.texto });
    } else if (j.type === 'assistant' && Array.isArray(j.message?.content)) {
      for (const c of j.message.content) {
        if (c?.type === 'text' && typeof c.text === 'string' && c.text.trim()) {
          const ultimo = mensajes.at(-1);
          if (ultimo?.rol === 'claude') ultimo.texto += `\n\n${c.text}`;
          else mensajes.push({ rol: 'claude', texto: c.text });
        } else if (c?.type === 'tool_use') {
          mensajes.push({ rol: 'herramienta', texto: describirHerramienta(String(c.name), c.input) });
        }
      }
    }
  }
  return mensajes;
}

export function tituloConversacion(mensajes: Mensaje[]): string {
  const primera = mensajes.find((m) => m.rol === 'diego')?.texto.replace(/\s+/g, ' ').trim() ?? '';
  return primera.length > 60 ? `${primera.slice(0, 59)}…` : primera;
}

export async function listarConversaciones(carpeta: string): Promise<ResumenConversacion[]> {
  let nombres: string[];
  try {
    nombres = await readdir(carpeta);
  } catch {
    return [];
  }
  const lista = await Promise.all(
    nombres
      .filter((n) => n.endsWith('.jsonl'))
      .map(async (n): Promise<ResumenConversacion | null> => {
        const ruta = path.join(carpeta, n);
        const [texto, info] = await Promise.all([readFile(ruta, 'utf8'), stat(ruta)]);
        const titulo = tituloConversacion(leerConversacion(texto));
        return titulo ? { id: n.slice(0, -'.jsonl'.length), titulo, fecha: info.mtime.toISOString() } : null;
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
