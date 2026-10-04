// Lee lo que devuelve el aula virtual (Moodle 4.5 de la URJC). Sin red: solo texto → datos.
import { ErrorFormato } from '../tipos.ts';
import { parse, type HTMLElement } from 'node-html-parser';
import type { ISODate } from '../../fechas.ts';
import { enMadrid } from '../hora.ts';

// La URJC ha cerrado la sesión: hay que volver a entrar (con ventana).
export class SesionCaducada extends Error {
  constructor() {
    super('la sesión del aula virtual ha caducado: hay que volver a entrar');
    this.name = 'SesionCaducada';
  }
}

export function esPaginaDeEntrada(url: string): boolean {
  return /^https:\/\/identifica\.urjc\.es\//.test(url) || /\/moodle\/login\/index\.php/.test(url);
}

export function leerSesskey(html: string): string {
  const m = /"sesskey":"([A-Za-z0-9]+)"/.exec(html);
  if (!m) throw new ErrorFormato('no encuentro la sesskey en la página del aula virtual');
  return m[1];
}
export interface CursoAula { id: number; nombreCorto: string; nombre: string }

export function leerCursos(datos: unknown): CursoAula[] {
  const lista = (datos as { courses?: unknown } | null)?.courses;
  if (!Array.isArray(lista)) throw new ErrorFormato('el aula virtual no ha devuelto la lista de cursos');
  return lista.map((c: { id?: unknown; shortname?: unknown; fullname?: unknown }) => ({
    id: Number(c.id), nombreCorto: String(c.shortname ?? ''), nombre: String(c.fullname ?? ''),
  }));
}

// El nombre corto es como «2026-27_2327004_159508_186565»: se busca un trozo que sea el código.
export function cursoDeAsignatura(cursos: CursoAula[], codigo: string): CursoAula | undefined {
  return cursos.find((c) => c.nombreCorto.split(/\D+/).includes(codigo));
}

export interface ModuloAula { id: string; nombre: string; tipo: string; url?: string; seccion: string }
export interface SeccionAula { id: string; nombre: string; modulos: ModuloAula[] }
export interface ContenidoCurso { secciones: SeccionAula[] }

// Respuesta de core_courseformat_get_state: un JSON (a veces como texto) con `section` y `cm`.
export function leerContenido(datos: unknown): ContenidoCurso {
  let j: unknown = datos;
  if (typeof datos === 'string') {
    try {
      j = JSON.parse(datos);
    } catch {
      throw new ErrorFormato('el contenido del curso no es JSON');
    }
  }
  const o = (j ?? {}) as { section?: unknown; cm?: unknown };
  if (!Array.isArray(o.section) || !Array.isArray(o.cm) || o.section.length === 0)
    throw new ErrorFormato('no encuentro las secciones del curso');
  const modulos = new Map<string, { id?: unknown; name?: unknown; module?: unknown; modname?: unknown; url?: unknown }>();
  for (const m of o.cm as { id?: unknown }[]) modulos.set(String(m.id), m as never);
  const secciones = (o.section as { id?: unknown; title?: unknown; name?: unknown; cmlist?: unknown }[]).map((s) => {
    const nombre = String(s.title ?? s.name ?? '').trim();
    const ids = Array.isArray(s.cmlist) ? s.cmlist.map(String) : [];
    return {
      id: String(s.id),
      nombre,
      modulos: ids.flatMap((id) => {
        const m = modulos.get(id);
        if (!m) return [];
        const url = typeof m.url === 'string' && m.url ? m.url : undefined;
        return [{ id, nombre: String(m.name ?? '').trim(), tipo: String(m.module ?? m.modname ?? ''), ...(url ? { url } : {}), seccion: nombre }];
      }),
    };
  });
  return { secciones };
}

const AVISOS = /aviso|novedad|anuncio|tabl[oó]n|news|announcement/i;
export function foroDeAvisos(c: ContenidoCurso): ModuloAula | undefined {
  const foros = c.secciones.flatMap((s) => s.modulos).filter((m) => m.tipo === 'forum');
  return foros.find((m) => AVISOS.test(m.nombre)) ?? c.secciones[0]?.modulos.find((m) => m.tipo === 'forum');
}

const GUIA = /gu[ií]a\s+(docente|de\s+(la\s+)?asignatura|del\s+estudiante)|teaching\s+guide|course\s+guide/i;
export function moduloGuia(c: ContenidoCurso): ModuloAula | undefined {
  // Primero un archivo, luego un enlace y, si no hay más, la etiqueta (que a veces está vacía, sin enlace).
  const posibles = c.secciones.flatMap((s) => s.modulos).filter((m) => GUIA.test(m.nombre));
  return ['resource', 'url', 'label'].map((t) => posibles.find((m) => m.tipo === t)).find(Boolean);
}

// La guía docente suele ser una etiqueta con el PDF enlazado: se busca en la página del curso.
export function enlaceGuia(htmlCurso: string, idModulo: string): string | undefined {
  return parse(htmlCurso).querySelector(`#module-${idModulo}`)?.querySelector('a[href*="pluginfile.php"]')?.getAttribute('href') ?? undefined;
}

export interface HiloForo { id: string; titulo: string }

export function leerForo(html: string): HiloForo[] {
  const vistos = new Map<string, string>();
  for (const a of parse(html).querySelectorAll('a[href*="discuss.php?d="]')) {
    const id = /discuss\.php\?d=(\d+)/.exec(a.getAttribute('href') ?? '')?.[1];
    const titulo = (a.getAttribute('title') ?? a.text).trim();
    if (id && titulo && !vistos.has(id)) vistos.set(id, titulo);
  }
  return [...vistos].map(([id, titulo]) => ({ id, titulo }));
}

export interface MensajeForo { id: string; titulo: string; texto: string; fecha: ISODate }

// Texto plano de un trozo de HTML: un salto de línea por párrafo, sin espacios de sobra.
export function textoDeElemento(e: HTMLElement): string {
  for (const b of e.querySelectorAll('br')) b.replaceWith('\n');
  for (const p of e.querySelectorAll('p, div, li, h1, h2, h3, h4, tr')) p.insertAdjacentHTML('afterend', '\n');
  return e.text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

export function leerHilo(html: string, hilo: HiloForo): MensajeForo {
  const raiz = parse(html);
  const primero = raiz.querySelector('article[data-post-id]') ?? raiz;
  const contenido = primero.querySelector('.post-content-container');
  if (!contenido) throw new ErrorFormato(`no encuentro el texto del aviso ${hilo.id}`);
  const asunto = primero.querySelector('[data-region-content="forum-post-core-subject"]')?.text.trim();
  const cuando = primero.querySelector('time[datetime]')?.getAttribute('datetime');
  const instante = cuando ? new Date(cuando) : null;
  if (!instante || Number.isNaN(instante.getTime())) throw new ErrorFormato(`no encuentro la fecha del aviso ${hilo.id}`);
  return { id: hilo.id, titulo: asunto || hilo.titulo, texto: textoDeElemento(contenido), fecha: enMadrid(instante).fecha };
}

export function leerCarpeta(html: string): { nombre: string; url: string }[] {
  const r = new Map<string, string>();
  for (const a of parse(html).querySelectorAll('a[href*="pluginfile.php"]')) {
    const url = a.getAttribute('href') ?? '';
    const nombre = (a.querySelector('.fp-filename')?.text ?? a.text).trim();
    if (url && nombre && !r.has(url)) r.set(url, nombre);
  }
  return [...r].map(([url, nombre]) => ({ nombre, url }));
}
