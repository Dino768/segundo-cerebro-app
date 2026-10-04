import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseAvisos } from '../../src/datos/avisos.ts';
import { parseTareas } from '../../src/datos/tareas.ts';
import { SesionCaducada } from '../../src/uni/aula/paginas.ts';
import { parseSincronizacionAula } from '../../src/uni/aula/estado.ts';
import type { Modelo } from '../../src/uni/aula/fechas.ts';
import { LimiteClaude } from './claude.ts';
import type { Git } from './git.ts';
import type { Navegador } from './navegador.ts';
import { revisarAula, type Dependencias } from './revision.ts';

const AHORA = new Date('2026-10-04T08:00:00Z');
let carpeta: string;
const leer = (r: string) => readFile(path.join(carpeta, r), 'utf8').catch(() => null);

const estado = JSON.stringify({
  section: [{ id: '10', title: 'General', cmlist: ['100', '103'] }],
  cm: [
    { id: '100', name: 'Avisos', module: 'forum', url: 'https://aula/mod/forum/view.php?id=100' },
    { id: '103', name: 'Planificación', module: 'resource', url: 'https://aula/mod/resource/view.php?id=103' },
  ],
});
const foro = '<a href="https://aula/mod/forum/discuss.php?d=555">Primer parcial</a>';
const hilo = '<article data-post-id="1"><time datetime="2026-10-03T10:00:00+02:00"></time><div class="post-content-container"><p>El primer parcial será el jueves 12 de noviembre a las 10:00.</p></div></article>';
const respuesta = (x: object = {}) => JSON.stringify({
  fechas: [{ clave: 'primer-parcial', que: 'Primer parcial', tipo: 'examen', fecha: '2026-11-12', hora: '10:00', exacta: true,
    cita: 'el primer parcial será el jueves 12 de noviembre a las 10:00', fuente: 'moodle-hilo-555', duda: null }],
  avisos: [{ id: 'moodle-hilo-555', importante: true }], evaluacion: null, ...x,
});

function navegadorFalso(o: { sesion?: boolean; estado?: string } = {}): Navegador {
  return {
    sesionValida: async () => o.sesion ?? true,
    pedirTexto: async (url) => (url.includes('/my/') ? '"sesskey":"abc"' : url.includes('discuss.php') ? hilo : foro),
    ajax: async (_s, metodo) => metodo.startsWith('core_course_get_enrolled')
      ? { courses: [{ id: 7, shortname: '2026-27_2327007_7_1', fullname: 'Cálculo' }] }
      : (o.estado ?? estado),
    descargar: async () => ({ bytes: new TextEncoder().encode('Sin fechas'), nombre: 'Planificación.pdf' }),
    cerrar: async () => undefined,
  };
}
function gitFalso(x: Partial<Git> = {}): Git & { subidas: string[][]; mensajes: string[] } {
  const subidas: string[][] = [];
  const mensajes: string[] = [];
  return { limpio: async () => true, traer: async () => undefined, subir: async (a, m) => (subidas.push(a), mensajes.push(m), 'ok'), volverAlRemoto: async () => undefined, subidas, mensajes, ...x };
}
const deps = (x: Partial<Dependencias> = {}): Dependencias => ({
  carpeta, ahora: AHORA, navegador: async () => navegadorFalso(),
  preguntar: async () => respuesta(), textoDe: async (b) => new TextDecoder().decode(b), git: gitFalso(), ...x,
});

beforeEach(async () => {
  carpeta = await mkdtemp(path.join(os.tmpdir(), 'aula-'));
  await mkdir(path.join(carpeta, 'estudios'), { recursive: true });
  await mkdir(path.join(carpeta, 'agenda'), { recursive: true });
  await writeFile(path.join(carpeta, 'estudios/asignaturas.yaml'), 'asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n');
  await writeFile(path.join(carpeta, 'agenda/tareas.yaml'), '[]\n');
});

describe('revisión del aula virtual', () => {
  it('trae el aviso, la fecha y el material, y lo sube', async () => {
    const git = gitFalso();
    const r = await revisarAula(deps({ git }));
    expect(r.resultado).toBe('ok');
    const avisos = parseAvisos(await leer('estudios/avisos.yaml'));
    expect(avisos).toEqual([expect.objectContaining({ id: 'moodle-hilo-555', asignatura: 'calculo', importante: true, leido: false })]);
    const tareas = parseTareas((await leer('agenda/tareas.yaml'))!);
    expect(tareas).toEqual([expect.objectContaining({ titulo: 'Primer parcial: Cálculo', fecha: '2026-11-12', origen: 'aula:calculo:primer-parcial' })]);
    expect(await leer('estudios/calculo/aula-virtual/General/Planificación.pdf')).toBe('Sin fechas');
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toContain('archivo: General/Planificación.pdf');
    expect(git.subidas[0]).toEqual(expect.arrayContaining(['estudios/avisos.yaml', 'agenda/tareas.yaml', 'estudios/aula-sincronizacion.yaml', 'estudios/calculo/aula-virtual.yaml']));
    const s = parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml'));
    expect(s.estado).toEqual({ ultimaRevision: '2026-10-04T10:00', resultado: 'ok', mensaje: '1 aviso nuevo, 1 material, 1 fecha' });
  });
  it('la segunda vez no descarga ni pregunta nada', async () => {
    await revisarAula(deps());
    let preguntas = 0;
    await revisarAula(deps({ preguntar: async () => (preguntas++, respuesta()) }));
    expect(preguntas).toBe(0);
  });
  it('con dudas sube de modelo y vuelve a empezar por haiku en la siguiente asignatura', async () => {
    const usados: Modelo[] = [];
    await revisarAula(deps({ preguntar: async (m) => (usados.push(m), m === 'opus' ? respuesta() : respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], duda: 'no lo sé' }] })) }));
    expect(usados).toEqual(['haiku', 'sonnet', 'opus']);
  });
  it('respuesta rota en haiku: pasa a sonnet', async () => {
    const usados: Modelo[] = [];
    await revisarAula(deps({ preguntar: async (m) => (usados.push(m), m === 'haiku' ? 'no sé' : respuesta()) }));
    expect(usados).toEqual(['haiku', 'sonnet']);
    expect(parseTareas((await leer('agenda/tareas.yaml'))!)).toHaveLength(1);
  });
  it('límite de uso: guarda avisos y materiales, y deja lo no leído en pendientes', async () => {
    const r = await revisarAula(deps({ preguntar: async () => { throw new LimiteClaude('límite'); } }));
    expect(r.resultado).toBe('ok');
    expect(parseAvisos(await leer('estudios/avisos.yaml'))[0].importante).toBe(false);
    const s = parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml'));
    expect(r.mensaje).toBe('1 aviso nuevo, 1 material, 0 fechas, 1 pendiente');
    expect(s.pendientes).toEqual([{ asignatura: 'calculo', avisos: ['moodle-hilo-555'], documentos: ['General/Planificación.pdf'], guia: false }]);
    // Al día siguiente se lee lo pendiente sin volver a descargar.
    let descargas = 0;
    const nav = navegadorFalso();
    await revisarAula(deps({ navegador: async () => ({ ...nav, descargar: async (...a) => (descargas++, nav.descargar(...a)) }) }));
    expect(descargas).toBe(0);
    expect(parseTareas((await leer('agenda/tareas.yaml'))!)).toHaveLength(1);
    expect(parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml')).pendientes).toEqual([]);
    expect(parseAvisos(await leer('estudios/avisos.yaml')).find((a) => a.id === 'moodle-hilo-555')).toEqual(expect.objectContaining({ importante: true, leido: false }));
  });
  it('sesión caducada: no toca nada más y deja el aviso de volver a entrar', async () => {
    const r = await revisarAula(deps({ navegador: async () => navegadorFalso({ sesion: false }) }));
    expect(r.resultado).toBe('necesita-entrar');
    expect(parseAvisos(await leer('estudios/avisos.yaml')).map((a) => a.id)).toEqual(['programa-entrar']);
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toBeNull();
    // Al volver a entrar, el aviso se quita solo.
    await revisarAula(deps());
    expect(parseAvisos(await leer('estudios/avisos.yaml')).map((a) => a.id)).toEqual(['moodle-hilo-555']);
  });
  it('sesión que caduca a mitad (SesionCaducada): igual que caducada, sin escribir lo cosechado', async () => {
    const nav = navegadorFalso();
    const r = await revisarAula(deps({ navegador: async () => ({ ...nav, pedirTexto: async () => { throw new SesionCaducada(); } }) }));
    expect(r.resultado).toBe('necesita-entrar');
    expect(await leer('agenda/tareas.yaml')).toBe('[]\n');
  });
  it('página que no entiende: error y no borra ni marca nada', async () => {
    await revisarAula(deps());
    const antes = await leer('estudios/calculo/aula-virtual.yaml');
    const r = await revisarAula(deps({ navegador: async () => navegadorFalso({ estado: '{"section":[],"cm":[]}' }) }));
    expect(r.resultado).toBe('error');
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toBe(antes);
  });
  it('my-context con cambios sin subir: no hace nada', async () => {
    const git = gitFalso({ limpio: async () => false });
    const r = await revisarAula(deps({ git }));
    expect(r).toEqual({ resultado: 'error', mensaje: 'my-context tiene cambios sin subir: lo intento más tarde' });
    expect(git.subidas).toEqual([]);
    expect(await leer('estudios/avisos.yaml')).toBeNull();
  });
  it('push rechazado: vuelve al remoto, aplica otra vez y sube', async () => {
    let intentos = 0;
    let vueltas = 0;
    const git = gitFalso({ subir: async () => (++intentos === 1 ? 'rechazado' : 'ok'), volverAlRemoto: async () => { vueltas++; } });
    const r = await revisarAula(deps({ git }));
    expect(r.resultado).toBe('ok');
    expect([intentos, vueltas]).toEqual([2, 1]);
  });
  it('fecha adelantada: aviso importante del programa', async () => {
    const hilo19 = hilo.replace('jueves 12 de noviembre', 'jueves 19 de noviembre');
    const nav1 = navegadorFalso();
    await revisarAula(deps({
      navegador: async () => ({ ...nav1, pedirTexto: async (u) => (u.includes('discuss.php') ? hilo19 : nav1.pedirTexto(u)) }),
      preguntar: async () => respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], fecha: '2026-11-19', hora: '10:00', cita: 'el primer parcial será el jueves 19 de noviembre a las 10:00' }] }),
    }));
    // nuevo aviso en el foro que lo adelanta
    const nav = navegadorFalso();
    await revisarAula(deps({
      navegador: async () => ({ ...nav, pedirTexto: async (u) => (u.includes('discuss.php?d=556') ? hilo : u.includes('forum/view') ? foro + '<a href="https://aula/mod/forum/discuss.php?d=556">Cambio</a>' : nav.pedirTexto(u)) }),
      preguntar: async () => respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], fuente: 'moodle-hilo-556' }], avisos: [{ id: 'moodle-hilo-556', importante: true }] }),
    }));
    const avisos = parseAvisos(await leer('estudios/avisos.yaml'));
    expect(avisos.some((a) => a.id.startsWith('programa-') && a.titulo.includes('se adelanta'))).toBe(true);
  });
  it('un error normal de Claude en una asignatura: queda pendiente y la revisión sigue', async () => {
    const r = await revisarAula(deps({ preguntar: async () => { throw new Error('Claude ha tardado demasiado en contestar'); } }));
    expect(r.resultado).toBe('ok');
    const s = parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml'));
    expect(s.pendientes).toEqual([expect.objectContaining({ asignatura: 'calculo', avisos: ['moodle-hilo-555'] })]);
    expect(await leer('estudios/calculo/aula-virtual/General/Planificación.pdf')).toBe('Sin fechas');
  });
  it('guía docente como etiqueta: descarga su PDF, Claude la resume y se escribe guia-docente.md (una sola vez)', async () => {
    const conGuia = JSON.stringify({
      section: [{ id: '10', title: 'General', cmlist: ['100', '107'] }],
      cm: [
        { id: '100', name: 'Novedades', module: 'forum', url: 'https://aula/mod/forum/view.php?id=100' },
        { id: '107', name: 'Guía docente', module: 'label' },
      ],
    });
    const nav = navegadorFalso({ estado: conGuia });
    const pedidas: string[] = [];
    const navGuia: Navegador = {
      ...nav,
      pedirTexto: async (u) => (u.includes('/course/view.php') ? '<li id="module-107"><a href="https://aula/pluginfile.php/1/mod_label/intro/Guia.pdf">Guía</a></li>' : nav.pedirTexto(u)),
      descargar: async (u) => (pedidas.push(u), { bytes: new TextEncoder().encode('Examen final 60 %. Parciales 40 %.'), nombre: 'Guia.pdf' }),
    };
    let conGuiaPedida = 0;
    const preguntar = async (_m: Modelo, texto: string) => {
      if (texto.includes('guía docente: escribe también')) conGuiaPedida++;
      return respuesta({ evaluacion: '- Examen final: 60 %\n- Parciales: 40 %' });
    };
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(pedidas).toEqual(['https://aula/pluginfile.php/1/mod_label/intro/Guia.pdf']);
    const md = await leer('estudios/calculo/guia-docente.md');
    expect(md).toContain('## Evaluación\n\n- Examen final: 60 %');
    expect(md).toContain('Examen final 60 %. Parciales 40 %.');
    expect(await leer('estudios/calculo/aula-virtual/guia-docente.pdf')).toBe('Examen final 60 %. Parciales 40 %.');
    // Mismo texto al día siguiente: no se vuelve a mandar a Claude.
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(conGuiaPedida).toBe(1);
  });
  it('un error ajeno no publica su texto (ni en el estado ni en el commit)', async () => {
    const git = gitFalso();
    const nav = navegadorFalso();
    const r = await revisarAula(deps({ git, navegador: async () => ({ ...nav, ajax: async () => { throw new Error('fallo en https://x/service.php?sesskey=SECRETO'); } }) }));
    expect(r.resultado).toBe('error');
    expect(r.mensaje).not.toContain('SECRETO');
    expect(await leer('estudios/aula-sincronizacion.yaml')).not.toContain('SECRETO');
    expect(git.mensajes.join(' ')).not.toContain('SECRETO');
  });
  it('guía sin evaluación: se escribe con la frase de «no encontrado» y no se reenvía', async () => {
    const conGuia = JSON.stringify({
      section: [{ id: '10', title: 'General', cmlist: ['100', '107'] }],
      cm: [{ id: '100', name: 'Novedades', module: 'forum', url: 'https://aula/mod/forum/view.php?id=100' }, { id: '107', name: 'Guía docente', module: 'resource', url: 'https://aula/mod/resource/view.php?id=107' }],
    });
    const nav = navegadorFalso({ estado: conGuia });
    const navGuia: Navegador = { ...nav, descargar: async () => ({ bytes: new TextEncoder().encode('Texto de la guía.'), nombre: 'Guia.pdf' }) };
    let conGuiaPedida = 0;
    const preguntar = async (_m: Modelo, texto: string) => (texto.includes('guía docente: escribe también') && conGuiaPedida++, respuesta({ evaluacion: null }));
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(await leer('estudios/calculo/guia-docente.md')).toContain('No he encontrado en la guía cómo se evalúa la asignatura.');
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(conGuiaPedida).toBe(1);
  });
  it('un archivo que no se guarda (vídeo o demasiado grande) no lleva archivo en la lista', async () => {
    const nav = navegadorFalso();
    await revisarAula(deps({ navegador: async () => ({ ...nav, descargar: async () => ({ demasiadoGrande: true as const, nombre: 'Grabación.mp4' }) }) }));
    const lista = await leer('estudios/calculo/aula-virtual.yaml');
    expect(lista).toContain('Planificación');
    expect(lista).not.toContain('archivo:');
  });
});
