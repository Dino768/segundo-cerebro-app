// Lectura de los .jsonl de Claude Code. Sin Node: la usan el programa local y la app (chats compartidos en el móvil).
import { sinContexto } from './contexto.ts';
import type { Mensaje } from './tipos.ts';

export function describirHerramienta(nombre: string, entrada: unknown): string {
  const e = (typeof entrada === 'object' && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const archivo = typeof e.file_path === 'string' ? (e.file_path.split(/[\\/]/).pop() ?? '') : '';
  const pizarra = /^pizarra-(\d+)\.json$/.exec(archivo);
  if ((nombre === 'Write' || nombre === 'Edit') && pizarra) return `✏️ Ha dibujado en la pizarra ${pizarra[1]}`;
  if (nombre === 'Write' || nombre === 'Edit') return `✏️ Ha escrito ${archivo}`;
  if (nombre === 'Read' && pizarra) return `👀 Ha mirado la pizarra ${pizarra[1]}`;
  if (nombre === 'Read' && /\.(png|jpe?g|webp|gif)$/i.test(archivo)) return `👀 Ha mirado ${archivo}`;
  if (nombre === 'Read') return `📖 Ha leído ${archivo}`;
  if (nombre === 'Glob' || nombre === 'Grep') return '🔎 Ha buscado en tus apuntes';
  return `🔧 ${nombre}`;
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
