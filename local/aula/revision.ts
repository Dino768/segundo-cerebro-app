// Una revisión del aula virtual (spec §3-§9). La llama el programador (una vez al día) o «Revisar ahora».
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseAsignaturas, type Asignatura } from '../../src/datos/asignaturas.ts';
import { parseAulaVirtual, serializarAulaVirtual, type AulaVirtual, type TipoMaterial } from '../../src/datos/aulaVirtual.ts';
import { parseAvisos, serializarAvisos, type Aviso } from '../../src/datos/avisos.ts';
import { escribirGuia } from '../../src/datos/guia.ts';
import { parseAjustesHorario } from '../../src/datos/horario.ts';
import { carpetaMateriales, RUTA_ASIGNATURAS, RUTA_AULA_SINCRONIZACION, RUTA_AVISOS, RUTA_HORARIO_AJUSTES, RUTA_TAREAS, rutaAulaVirtual, rutaGuiaDocente } from '../../src/datos/rutas.ts';
import { parseTareas, serializarTareas } from '../../src/datos/tareas.ts';
import { anadirAvisos, avisoEntrar, avisoPrograma, ID_ENTRAR, limpiarAvisos, quitarAviso } from '../../src/uni/aula/avisos.ts';
import { parseSincronizacionAula, serializarSincronizacionAula, type Pendiente, type ResultadoRevision, type SincronizacionAula } from '../../src/uni/aula/estado.ts';
import { decidir, leerRespuesta, MODELOS, necesitaMas, textoPregunta, type AvisoNuevo, type FuenteTexto, type Modelo, type Pregunta, type RespuestaClaude } from '../../src/uni/aula/fechas.ts';
import { construirLista, esDocumentoDeFechas, LIMITE_BYTES, nombreSeguro, nuevosMateriales, tipoDeArchivo, type Descargado } from '../../src/uni/aula/materiales.ts';
import { cursoDeAsignatura, enlaceGuia, foroDeAvisos, leerCarpeta, leerContenido, leerCursos, leerForo, leerHilo, leerPagina, leerSesskey, leerTextosSeccion, moduloGuia, SesionCaducada, type ContenidoCurso, type ModuloAula, type TextoCurso } from '../../src/uni/aula/paginas.ts';
import { fusionar } from '../../src/uni/fusionar.ts';
import { enMadrid, hoyEnMadrid } from '../../src/uni/hora.ts';
import { ErrorFormato, type Propuesta } from '../../src/uni/tipos.ts';
import { LimiteClaude } from './claude.ts';
import type { Git } from './git.ts';
import { BASE_AULA, type Navegador } from './navegador.ts';

export interface Dependencias {
  carpeta: string;
  ahora: Date;
  navegador(): Promise<Navegador>;
  preguntar(modelo: Modelo, texto: string): Promise<string>;
  textoDe(bytes: Uint8Array, nombre: string): Promise<string | null>;
  git: Git;
}
export interface ResumenRevision { resultado: ResultadoRevision; mensaje: string }

// Lo que se trae de una asignatura antes de escribir nada en los archivos que se suben.
interface Cosecha {
  asignatura: Asignatura;
  lista: AulaVirtual;
  materialesVistos: string[];
  avisos: Aviso[];               // nuevos, ya con `importante` de Claude si lo leyó
  avisosVistos: string[];
  guia?: { huella: string; texto: string; evaluacion?: string };
  textos: Record<string, string>; // huellas de los textos de la página que han ido a Claude (se guardan si contesta)
  respuesta?: RespuestaClaude;
  pregunta?: Pregunta;
  pendiente?: Pendiente;
  sinTexto: number;              // documentos de fechas de los que no se pudo sacar el texto (escaneados)
}
// Lo cosechado y las asignaturas que se saltaron (página que no se entiende): esas no se tocan esta vez.
interface Cosechado { cosechas: Cosecha[]; conProblemas: string[]; primerProblema?: string }

export const CAMBIADO = 'my-context ha cambiado mientras revisaba: lo intento más tarde';
export const SIN_GITIGNORE = 'falta estudios/*/aula-virtual/ en el .gitignore de my-context';

const ruta = (d: Dependencias, r: string) => path.join(d.carpeta, ...r.split('/'));
async function leer(d: Dependencias, r: string): Promise<string | null> {
  try {
    return await readFile(ruta(d, r), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
async function escribir(d: Dependencias, r: string, texto: string): Promise<void> {
  await mkdir(path.dirname(ruta(d, r)), { recursive: true });
  await writeFile(ruta(d, r), texto);
}
const huella = (t: string) => createHash('sha1').update(t).digest('hex');
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export async function revisarAula(d: Dependencias): Promise<ResumenRevision> {
  if (!(await d.git.listoParaRevisar())) return { resultado: 'error', mensaje: 'my-context tiene cambios sin subir: lo intento más tarde' };
  await d.git.traer();
  const hoy = hoyEnMadrid(d.ahora);
  const asignaturas = parseAsignaturas((await leer(d, RUTA_ASIGNATURAS)) ?? '').filter((a) => a.codigo);
  const sinc = parseSincronizacionAula(await leer(d, RUTA_AULA_SINCRONIZACION));

  // Los materiales descargados nunca se suben: si el .gitignore de my-context no los excluye, no se baja nada.
  for (const a of asignaturas) {
    if (!(await d.git.ignorado(`${carpetaMateriales(a.id)}/prueba.pdf`))) {
      const estado = { resultado: 'error' as const, mensaje: SIN_GITIGNORE };
      await aplicarYSubir(d, hoy, sinc, [], estado, false);
      return estado;
    }
  }

  let cosechado: Cosechado | 'necesita-entrar';
  try {
    cosechado = await cosechar(d, asignaturas, sinc, hoy);
  } catch (e) {
    if (e instanceof SesionCaducada) cosechado = 'necesita-entrar';
    else {
      // Nunca se publica el texto de un error ajeno (puede llevar direcciones con la clave de sesión).
      const mensaje = e instanceof ErrorFormato ? e.message : 'error inesperado al revisar el aula virtual';
      console.error('Revisión del aula virtual: fallo', e instanceof Error ? e.name : typeof e);
      // Si my-context cambió entretanto no se escribe nada; el resultado lo guarda en memoria el programador.
      await aplicarYSubir(d, hoy, sinc, [], { resultado: 'error', mensaje }, false);
      return { resultado: 'error', mensaje };
    }
  }
  if (cosechado === 'necesita-entrar') {
    const mensaje = 'La URJC ha cerrado la sesión: vuelve a entrar al aula virtual';
    await aplicarYSubir(d, hoy, sinc, [], { resultado: 'necesita-entrar', mensaje }, false);
    return { resultado: 'necesita-entrar', mensaje };
  }
  const { cosechas, conProblemas, primerProblema } = cosechado;
  // Si no se ha podido leer ninguna asignatura, la revisión ha fallado (no se marca como hecha).
  if (conProblemas.length && !cosechas.length) {
    const mensaje = `${primerProblema} (${conProblemas.join(', ')})`;
    await aplicarYSubir(d, hoy, sinc, [], { resultado: 'error', mensaje }, false);
    return { resultado: 'error', mensaje };
  }
  const mensaje = textoResumen(cosechas, conProblemas);
  if ((await aplicarYSubir(d, hoy, sinc, cosechas, { resultado: 'ok', mensaje }, true)) === 'cambiado') return { resultado: 'error', mensaje: CAMBIADO };
  return { resultado: 'ok', mensaje };
}

function textoResumen(cs: Cosecha[], conProblemas: string[]): string {
  const avisos = cs.reduce((n, c) => n + c.avisos.length, 0);
  const materiales = cs.reduce((n, c) => n + c.materialesVistos.length, 0);
  const fechas = cs.reduce((n, c) => n + (c.respuesta && c.pregunta ? decidir(c.respuesta, c.pregunta).propuestas.length : 0), 0);
  const pendientes = cs.filter((c) => c.pendiente).length;
  const sinTexto = cs.reduce((n, c) => n + c.sinTexto, 0);
  return [
    plural(avisos, 'aviso nuevo', 'avisos nuevos'), plural(materiales, 'material', 'materiales'), plural(fechas, 'fecha', 'fechas'),
    ...(pendientes ? [plural(pendientes, 'pendiente', 'pendientes')] : []),
    ...(sinTexto ? [plural(sinTexto, 'documento sin texto', 'documentos sin texto')] : []),
    ...(conProblemas.length ? [`${plural(conProblemas.length, 'asignatura con problemas', 'asignaturas con problemas')} (${conProblemas.join(', ')})`] : []),
  ].join(', ');
}

async function cosechar(d: Dependencias, asignaturas: Asignatura[], sinc: SincronizacionAula, hoy: string): Promise<Cosechado> {
  const nav = await d.navegador();
  try {
    if (!(await nav.sesionValida())) throw new SesionCaducada();
    const sesskey = leerSesskey(await nav.pedirTexto(`${BASE_AULA}/my/`));
    const cursos = leerCursos(await nav.ajax(sesskey, 'core_course_get_enrolled_courses_by_timeline_classification', { offset: 0, limit: 0, classification: 'all', sort: 'fullname' }));
    const textos = await leerTareasConocidas(d);
    const grupo = await leerGrupo(d);
    const r: Cosecha[] = [];
    const conProblemas: string[] = [];
    let primerProblema: string | undefined;
    let sinClaude = false;
    for (const a of asignaturas) {
      const curso = cursoDeAsignatura(cursos, a.codigo!);
      if (!curso) continue;
      let c: Cosecha;
      try {
        const contenido = leerContenido(await nav.ajax(sesskey, 'core_courseformat_get_state', { courseid: curso.id }));
        c = await cosecharAsignatura(d, nav, a, curso.id, contenido, sinc, hoy, textos, grupo);
      } catch (e) {
        // Una asignatura cuya página no se entiende se salta entera: no se borra ni se marca nada suyo.
        if (!(e instanceof ErrorFormato)) throw e;
        conProblemas.push(a.id);
        primerProblema ??= e.message;
        continue;
      }
      if (c.pregunta && c.pregunta.fuentes.length) {
        if (sinClaude) c.pendiente = pendienteDe(c);
        else {
          try {
            c.respuesta = await preguntarConEscalado(d, c.pregunta);
            if (!c.respuesta) c.pendiente = pendienteDe(c);
          } catch (e) {
            if (e instanceof LimiteClaude) sinClaude = true;
            // Un fallo suelto de Claude (se colgó, no arrancó) se trata como una lectura fallida: a pendientes y seguimos.
            c.pendiente = pendienteDe(c);
          }
        }
      }
      if (c.respuesta) {
        const imp = new Map(c.respuesta.avisos.map((x) => [x.id, x.importante]));
        c.avisos = c.avisos.map((av) => ({ ...av, importante: imp.get(av.id) ?? false }));
        if (c.guia && c.pregunta?.conGuia) c.guia.evaluacion = c.respuesta.evaluacion ?? 'No he encontrado en la guía cómo se evalúa la asignatura.';
      }
      r.push(c);
    }
    return { cosechas: r, conProblemas, primerProblema };
  } finally {
    await nav.cerrar();
  }
}

async function leerTareasConocidas(d: Dependencias) {
  return parseTareas((await leer(d, RUTA_TAREAS)) ?? '[]\n');
}

// El desdoble de Diego (G2…), para que Claude elija su horario cuando el profe da uno por grupo.
async function leerGrupo(d: Dependencias): Promise<string | undefined> {
  try {
    return parseAjustesHorario(await leer(d, RUTA_HORARIO_AJUSTES)).desdoble;
  } catch {
    return undefined; // un horario-ajustes.yaml roto no para la revisión
  }
}

// Haiku → Sonnet → Opus mientras haya dudas o la respuesta no se entienda. undefined: ninguno contestó bien.
async function preguntarConEscalado(d: Dependencias, p: Pregunta): Promise<RespuestaClaude | undefined> {
  const texto = textoPregunta(p);
  let ultima: RespuestaClaude | undefined;
  for (const m of MODELOS) {
    let r: RespuestaClaude;
    try {
      r = leerRespuesta(await d.preguntar(m, texto));
    } catch (e) {
      if (e instanceof LimiteClaude || !(e instanceof ErrorFormato)) throw e;
      continue;
    }
    ultima = r;
    if (!necesitaMas(r, p)) return r;
  }
  return ultima;
}

function pendienteDe(c: Cosecha): Pendiente {
  const fuentes = c.pregunta?.fuentes ?? [];
  return {
    asignatura: c.asignatura.id,
    avisos: fuentes.filter((f) => f.tipo === 'aviso').map((f) => f.id),
    documentos: fuentes.filter((f) => f.tipo === 'documento').map((f) => f.id),
    guia: fuentes.some((f) => f.tipo === 'guia'),
  };
}

async function cosecharAsignatura(
  d: Dependencias, nav: Navegador, a: Asignatura, idCurso: number, contenido: ContenidoCurso, sinc: SincronizacionAula, hoy: string,
  tareas: Awaited<ReturnType<typeof leerTareasConocidas>>, grupo?: string,
): Promise<Cosecha> {
  const base = carpetaMateriales(a.id);
  const fuentes: FuenteTexto[] = [];
  const descargados = new Map<string, Descargado>();
  const materialesVistos: string[] = [];
  const guiaModulo = moduloGuia(contenido);

  let sinTexto = 0;
  for (const m of nuevosMateriales(contenido, new Set(sinc.vistos.materiales))) {
    if (m.id === guiaModulo?.id) {
      materialesVistos.push(m.id);
      continue; // la guía va aparte
    }
    const dir = nombreSeguro(m.seccion || 'General');
    try {
      if (m.tipo === 'resource') {
        const desc = await bajar(d, nav, `${BASE_AULA}/mod/resource/view.php?id=${m.id}&redirect=1`, `${base}/${dir}`);
        if (desc.bytes) descargados.set(m.id, { archivo: `${dir}/${desc.nombre}`, tipo: tipoDeArchivo(desc.nombre) });
        if (desc.bytes && (esDocumentoDeFechas(m.nombre) || esDocumentoDeFechas(desc.nombre))) {
          const texto = await d.textoDe(desc.bytes, desc.nombre);
          if (texto) fuentes.push({ id: `${dir}/${desc.nombre}`, tipo: 'documento', titulo: m.nombre, enlace: m.url, texto });
          else sinTexto++; // PDF escaneado: se apunta en el resumen
        }
      } else if (m.tipo === 'folder' && m.url) {
        const sub = `${dir}/${nombreSeguro(m.nombre)}`;
        for (const f of leerCarpeta(await nav.pedirTexto(m.url))) await bajar(d, nav, f.url, `${base}/${sub}`, f.nombre);
        descargados.set(m.id, { archivo: sub, tipo: 'carpeta' });
      }
    } catch (e) {
      if (e instanceof SesionCaducada) throw e;
      // Descarga o escritura fallida: queda en la lista solo con su enlace y se reintenta en la siguiente revisión.
      descargados.delete(m.id);
      console.error('Aula virtual: no he podido guardar un material', e instanceof ErrorFormato ? e.message : e instanceof Error ? e.name : typeof e);
      continue;
    }
    materialesVistos.push(m.id);
  }

  // Avisos: hilos nuevos del foro de avisos.
  const avisos: Aviso[] = [];
  const avisosVistos: string[] = [];
  const foro = foroDeAvisos(contenido);
  if (foro?.url) {
    const vistos = new Set(sinc.vistos.avisos);
    for (const h of leerForo(await nav.pedirTexto(foro.url))) {
      const id = `moodle-hilo-${h.id}`;
      if (vistos.has(id)) continue;
      const enlace = `${BASE_AULA}/mod/forum/discuss.php?d=${h.id}`;
      let msj: ReturnType<typeof leerHilo>;
      try {
        msj = leerHilo(await nav.pedirTexto(enlace), h);
      } catch (e) {
        if (!(e instanceof ErrorFormato)) throw e;
        continue; // hilo que no se entiende: no se marca como visto y se vuelve a intentar otro día
      }
      avisosVistos.push(id);
      avisos.push({ id, asignatura: a.id, fecha: msj.fecha, titulo: msj.titulo, texto: msj.texto, importante: false, leido: false, enlace });
      fuentes.push({ id, tipo: 'aviso', titulo: msj.titulo, fecha: msj.fecha, enlace, texto: msj.texto });
    }
  }

  // Lo que el profe escribe en la propia página de la asignatura (etiquetas y páginas): ahí suelen estar
  // las fechas de exámenes y tests. Se lee cada vez y solo va a Claude lo nuevo o lo que ha cambiado.
  const textos: Record<string, string> = {};
  for (const t of await textosDelCurso(nav, contenido)) {
    const h = huella(t.texto);
    if (sinc.vistos.textos[t.id] === h) continue;
    textos[t.id] = h;
    fuentes.push({ id: t.id, tipo: 'curso', titulo: t.titulo, enlace: t.enlace, texto: t.texto });
  }

  // Guía docente: se descarga cada vez (una por asignatura) y solo se manda a Claude si su texto cambió.
  let guia: Cosecha['guia'];
  if (guiaModulo) {
    // En la URJC la guía es una etiqueta con el PDF enlazado en la página del curso (Task 1, NOTAS.md).
    const url = guiaModulo.tipo === 'resource'
      ? `${BASE_AULA}/mod/resource/view.php?id=${guiaModulo.id}&redirect=1`
      : guiaModulo.tipo === 'label'
        ? enlaceGuia(await nav.pedirTexto(`${BASE_AULA}/course/view.php?id=${idCurso}`), guiaModulo.id)
        : guiaModulo.url;
    const desc = url
      ? await bajar(d, nav, url, base, undefined, 'guia-docente').catch((e) => {
        if (e instanceof SesionCaducada) throw e;
        return null; // si la guía no baja hoy, se intenta en la siguiente revisión
      })
      : null;
    const texto = desc?.bytes ? await d.textoDe(desc.bytes, desc.nombre) : null;
    if (texto && huella(texto) !== sinc.vistos.guias[a.id]) {
      guia = { huella: huella(texto), texto };
      fuentes.push({ id: 'guia-docente', tipo: 'guia', titulo: 'Guía docente', enlace: guiaModulo.url, texto });
    }
  }

  // Lo que quedó pendiente de otra vez (sin volver a descargar).
  for (const p of sinc.pendientes.filter((x) => x.asignatura === a.id)) {
    const todos = parseAvisos(await leer(d, RUTA_AVISOS));
    for (const id of p.avisos) {
      const av = todos.find((x) => x.id === id);
      if (av && !fuentes.some((f) => f.id === id)) fuentes.push({ id, tipo: 'aviso', titulo: av.titulo, fecha: av.fecha, enlace: av.enlace, texto: av.texto });
    }
    for (const doc of p.documentos) {
      if (fuentes.some((f) => f.id === doc)) continue;
      const bytes = await readFile(path.join(d.carpeta, ...base.split('/'), ...doc.split('/'))).catch(() => null);
      const texto = bytes ? await d.textoDe(new Uint8Array(bytes), doc) : null;
      if (texto) fuentes.push({ id: doc, tipo: 'documento', titulo: path.basename(doc), texto });
    }
    if (p.guia && !guia) {
      const md = await leer(d, rutaGuiaDocente(a.id));
      const texto = md?.split('## Guía completa')[1]?.trim();
      if (texto) {
        guia = { huella: huella(texto), texto };
        fuentes.push({ id: 'guia-docente', tipo: 'guia', titulo: 'Guía docente', texto });
      }
    }
  }

  const anterior = parseAulaVirtual(await leer(d, rutaAulaVirtual(a.id)), rutaAulaVirtual(a.id));
  const lista = construirLista(contenido, anterior, descargados, hoy);
  const conocidas = tareas
    .filter((t) => t.area === a.id && t.fecha && t.origen && t.fecha >= hoy)
    .map((t) => ({ origen: t.origen!, titulo: t.titulo, tipo: t.tipo, fecha: t.fecha!, ...(t.hora ? { hora: t.hora } : {}) }));
  const pregunta: Pregunta = { asignatura: a, hoy, conocidas, fuentes, conGuia: fuentes.some((f) => f.tipo === 'guia'), ...(grupo ? { grupo } : {}) };
  return { asignatura: a, lista, materialesVistos, avisos, avisosVistos, guia, textos, pregunta, sinTexto };
}

// Cada sección se pide aparte (en la URJC la página del curso solo trae la primera pestaña) y cada página (mod/page) también.
// Una sección o página que no se puede leer hoy se salta: se vuelve a intentar en la siguiente revisión.
async function textosDelCurso(nav: Navegador, contenido: ContenidoCurso): Promise<(TextoCurso & { enlace: string })[]> {
  const r: (TextoCurso & { enlace: string })[] = [];
  const saltar = (e: unknown) => {
    if (!(e instanceof ErrorFormato)) throw e;
  };
  for (const s of contenido.secciones) {
    const enlace = `${BASE_AULA}/course/section.php?id=${s.id}`;
    try {
      r.push(...leerTextosSeccion(await nav.pedirTexto(enlace), s).map((t) => ({ ...t, enlace })));
    } catch (e) {
      saltar(e);
    }
    for (const m of s.modulos.filter((x) => x.tipo === 'page' && x.url)) {
      try {
        const texto = leerPagina(await nav.pedirTexto(m.url!));
        if (texto) r.push({ id: `pagina-${m.id}`, titulo: m.nombre, texto, enlace: m.url! });
      } catch (e) {
        saltar(e);
      }
    }
  }
  return r;
}

// Descarga a `estudios/<id>/aula-virtual/...`. Los vídeos y lo de más de 50 MB no se bajan (quedan en la lista con su enlace).
async function bajar(d: Dependencias, nav: Navegador, url: string, carpeta: string, nombre?: string, renombrar?: string) {
  const r = await nav.descargar(url, LIMITE_BYTES);
  if ('demasiadoGrande' in r) return { nombre: nombreSeguro(r.nombre), bytes: null };
  const original = nombreSeguro(nombre ?? r.nombre);
  if (tipoDeArchivo(original) === 'video') return { nombre: original, bytes: null };
  const ext = path.extname(original);
  const final = renombrar ? `${renombrar}${ext}` : original;
  const destino = path.join(d.carpeta, ...carpeta.split('/'), final);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, r.bytes);
  return { nombre: final, bytes: r.bytes };
}

async function aplicarYSubir(
  d: Dependencias, hoy: string, sincInicial: SincronizacionAula, cosechas: Cosecha[],
  estado: { resultado: ResultadoRevision; mensaje: string }, completa: boolean,
): Promise<'ok' | 'cambiado'> {
  const { fecha, hora } = enMadrid(d.ahora);
  for (let intento = 0; intento < 3; intento++) {
    // Diego puede haber tocado my-context durante la cosecha (minutos): nunca se escribe ni se hace commit encima.
    if (!(await d.git.limpio())) return 'cambiado';
    const sinc = intento === 0 ? sincInicial : parseSincronizacionAula(await leer(d, RUTA_AULA_SINCRONIZACION));
    let avisos = parseAvisos(await leer(d, RUTA_AVISOS));
    let tareas = parseTareas((await leer(d, RUTA_TAREAS)) ?? '[]\n');
    const archivos = [RUTA_AULA_SINCRONIZACION, RUTA_AVISOS];
    const propuestas: Propuesta[] = [];
    const delPrograma: { asignatura?: string; aviso: AvisoNuevo }[] = [];
    const pendientes = sinc.pendientes.filter((p) => !cosechas.some((c) => c.asignatura.id === p.asignatura));

    for (const c of cosechas) {
      avisos = anadirAvisos(avisos, c.avisos);
      sinc.vistos.materiales = [...new Set([...sinc.vistos.materiales, ...c.materialesVistos])];
      sinc.vistos.avisos = [...new Set([...sinc.vistos.avisos, ...c.avisosVistos])];
      await escribir(d, rutaAulaVirtual(c.asignatura.id), serializarAulaVirtual(c.lista));
      archivos.push(rutaAulaVirtual(c.asignatura.id));
      if (c.pendiente) pendientes.push(c.pendiente);
      if (c.respuesta && c.pregunta) {
        const dec = decidir(c.respuesta, c.pregunta);
        sinc.vistos.textos = { ...sinc.vistos.textos, ...c.textos };
        propuestas.push(...dec.propuestas);
        delPrograma.push(...dec.avisos.map((aviso) => ({ asignatura: c.asignatura.id, aviso })));
        if (c.guia?.evaluacion) {
          await escribir(d, rutaGuiaDocente(c.asignatura.id), escribirGuia(c.asignatura.nombre, c.guia.evaluacion, c.guia.texto));
          archivos.push(rutaGuiaDocente(c.asignatura.id));
          sinc.vistos.guias[c.asignatura.id] = c.guia.huella;
        }
      }
    }

    if (propuestas.length) {
      const r = fusionar(tareas, sinc.vistos.fechas, propuestas, hoy);
      tareas = r.tareas;
      sinc.vistos.fechas = r.vistos;
      for (const x of r.adelantadas)
        delPrograma.push({ aviso: { titulo: `${x.titulo} se adelanta`, texto: `Pasa del ${x.antes} al ${x.ahora}. Míralo en la agenda.` } });
      await escribir(d, RUTA_TAREAS, serializarTareas(tareas));
      archivos.push(RUTA_TAREAS);
    }
    // La importancia que Claude da a avisos ya guardados (los que estaban pendientes); no se toca `leido`.
    const importantes = new Map(cosechas.flatMap((c) => c.respuesta?.avisos ?? []).map((x) => [x.id, x.importante]));
    avisos = avisos.map((a) => (importantes.has(a.id) ? { ...a, importante: importantes.get(a.id)! } : a));
    for (const p of delPrograma) avisos = [avisoPrograma(avisos, hoy, p.aviso.titulo, p.aviso.texto, p.asignatura), ...avisos];

    if (estado.resultado === 'necesita-entrar') avisos = anadirAvisos(avisos, [avisoEntrar(hoy)]);
    else if (estado.resultado === 'ok') avisos = quitarAviso(avisos, ID_ENTRAR);
    avisos = limpiarAvisos(avisos, hoy);

    sinc.pendientes = pendientes;
    sinc.estado = { ...sinc.estado, resultado: estado.resultado, mensaje: estado.mensaje, ...(completa ? { ultimaRevision: `${fecha}T${hora}` } : {}) };
    await escribir(d, RUTA_AVISOS, serializarAvisos(avisos));
    await escribir(d, RUTA_AULA_SINCRONIZACION, serializarSincronizacionAula(sinc));

    const res = await d.git.subir([...new Set(archivos)], `Aula virtual: ${estado.mensaje}`);
    if (res === 'ok') return 'ok';
    await d.git.volverAlRemoto();
  }
  throw new Error('no he podido subir los cambios del aula virtual después de 3 intentos');
}
