import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cursoDeAsignatura, enlaceGuia, esPaginaDeEntrada, foroDeAvisos, leerCarpeta, leerContenido, leerCursos, leerForo, leerHilo, leerSesskey, moduloGuia } from './paginas.ts';

describe('entrada', () => {
  it('reconoce la página de entrada de la URJC y la de Moodle', () => {
    expect(esPaginaDeEntrada('https://identifica.urjc.es/CAS/login?service=x')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/login/index.php')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/my/')).toBe(false);
  });
  it('saca la sesskey de una página', () => {
    expect(leerSesskey('<script>M.cfg = {"wwwroot":"x","sesskey":"Ab12Cd34Ef","sessiontimeout":"7200"};</script>')).toBe('Ab12Cd34Ef');
    expect(() => leerSesskey('<html></html>')).toThrow(/sesskey/);
  });
});

const cursos = { courses: [
  { id: 159508, shortname: '2026-27_2327004_159508_186565', fullname: 'Fundamentos de la Programación' },
  { id: 1, shortname: 'RAC_EMP_FUENLABRADA', fullname: 'RAC' },
], nextoffset: 2 };

const estado = JSON.stringify({
  section: [
    { id: '10', number: 0, title: 'General', cmlist: ['100', '101', '102'] },
    { id: '11', number: 1, title: 'Tema 1. Límites', cmlist: ['103', '104'] },
  ],
  cm: [
    { id: '100', name: 'Avisos', module: 'forum', sectionid: '10', url: 'https://x/mod/forum/view.php?id=100' },
    { id: '101', name: 'Guía docente', module: 'resource', sectionid: '10', url: 'https://x/mod/resource/view.php?id=101' },
    { id: '102', name: 'Foro de dudas', module: 'forum', sectionid: '10', url: 'https://x/mod/forum/view.php?id=102' },
    { id: '103', name: 'Apuntes tema 1', module: 'resource', sectionid: '11', url: 'https://x/mod/resource/view.php?id=103' },
    { id: '104', name: 'Bienvenida', module: 'label', sectionid: '11' },
  ],
});

describe('cursos', () => {
  it('lee los cursos y encuentra el de una asignatura por su código', () => {
    const l = leerCursos(cursos);
    expect(l[0]).toEqual({ id: 159508, nombreCorto: '2026-27_2327004_159508_186565', nombre: 'Fundamentos de la Programación' });
    expect(cursoDeAsignatura(l, '2327004')?.id).toBe(159508);
    expect(cursoDeAsignatura(l, '2327009')).toBeUndefined();
  });
  it('algo que no es una lista de cursos es un error de formato', () => {
    expect(() => leerCursos({ nada: 1 })).toThrow(/cursos/);
  });
});

describe('contenido del curso', () => {
  it('secciones con sus módulos en orden (vale el JSON como texto o como objeto)', () => {
    const c = leerContenido(estado);
    expect(c.secciones.map((s) => s.nombre)).toEqual(['General', 'Tema 1. Límites']);
    expect(c.secciones[1].modulos[0]).toEqual({ id: '103', nombre: 'Apuntes tema 1', tipo: 'resource', url: 'https://x/mod/resource/view.php?id=103', seccion: 'Tema 1. Límites' });
    expect(leerContenido(JSON.parse(estado)).secciones).toHaveLength(2);
  });
  it('un curso sin secciones es un error de formato (nunca se borra nada por no entender la página)', () => {
    expect(() => leerContenido(JSON.stringify({ section: [], cm: [] }))).toThrow(/secciones/);
    expect(() => leerContenido('no es json')).toThrow();
  });
  it('encuentra el foro de avisos y la guía docente', () => {
    const c = leerContenido(estado);
    expect(foroDeAvisos(c)?.id).toBe('100');
    expect(moduloGuia(c)?.id).toBe('101');
  });
  it('la guía: primero un archivo, luego un enlace y por último una etiqueta (a veces vacía)', () => {
    const curso = (cm: object[]) => leerContenido({ section: [{ id: '10', title: 'General', cmlist: cm.map((x: any) => x.id) }], cm });
    const etiqueta = { id: '1', name: 'Guía docente', module: 'label' };
    const archivo = { id: '2', name: 'Guía docente 2026-27', module: 'resource', url: 'https://x/mod/resource/view.php?id=2' };
    const enlace = { id: '3', name: 'Guía docente', module: 'url', url: 'https://x/mod/url/view.php?id=3' };
    expect(moduloGuia(curso([etiqueta, archivo]))?.id).toBe('2');
    expect(moduloGuia(curso([etiqueta, enlace]))?.id).toBe('3');
    expect(moduloGuia(curso([enlace, archivo]))?.id).toBe('2');
    expect(moduloGuia(curso([etiqueta]))?.id).toBe('1');
  });
  it('sin un foro con nombre de avisos, el primer foro de la primera sección', () => {
    const otro = JSON.parse(estado);
    otro.cm[0].name = 'Foro general';
    expect(foroDeAvisos(leerContenido(otro))?.id).toBe('100');
  });
});

const foro = `<table><tr class="discussion" data-discussionid="555"><th><a href="https://x/mod/forum/discuss.php?d=555" title="Cambio de aula del parcial">Cambio de aula del parcial</a></th></tr>
<tr class="discussion" data-discussionid="556"><th><a href="https://x/mod/forum/discuss.php?d=556">Diapositivas del tema 2</a></th></tr></table>`;
const hilo = `<article id="p9001" data-post-id="9001"><h3 data-region-content="forum-post-core-subject">Cambio de aula del parcial</h3>
<time datetime="2026-10-03T10:12:00+02:00">viernes</time><div class="post-content-container"><p>El parcial del <b>jueves 13</b> será en el aula 204.</p><p>Un saludo.</p></div></article>
<article data-post-id="9002"><div class="post-content-container">Respuesta</div></article>`;
const carpeta = `<div class="foldertree"><a href="https://x/pluginfile.php/1/mod_folder/content/0/Hoja%201.pdf?forcedownload=1"><span class="fp-filename">Hoja 1.pdf</span></a>
<a href="https://x/pluginfile.php/1/mod_folder/content/0/Hoja%202.pdf?forcedownload=1"><span class="fp-filename">Hoja 2.pdf</span></a></div>`;

describe('foro', () => {
  it('lee los hilos sin repetir', () => {
    expect(leerForo(foro)).toEqual([{ id: '555', titulo: 'Cambio de aula del parcial' }, { id: '556', titulo: 'Diapositivas del tema 2' }]);
  });
  it('lee el primer mensaje de un hilo como texto con su fecha de Madrid', () => {
    expect(leerHilo(hilo, { id: '555', titulo: 'X' })).toEqual({
      id: '555', titulo: 'Cambio de aula del parcial', fecha: '2026-10-03',
      texto: 'El parcial del jueves 13 será en el aula 204.\nUn saludo.',
    });
  });
  it('lee los archivos de una carpeta', () => {
    expect(leerCarpeta(carpeta)).toEqual([
      { nombre: 'Hoja 1.pdf', url: 'https://x/pluginfile.php/1/mod_folder/content/0/Hoja%201.pdf?forcedownload=1' },
      { nombre: 'Hoja 2.pdf', url: 'https://x/pluginfile.php/1/mod_folder/content/0/Hoja%202.pdf?forcedownload=1' },
    ]);
  });
});

describe('páginas reales anonimizadas (Tarea 1)', () => {
  const leer = (n: string) => readFileSync(new URL(`./pruebas/${n}`, import.meta.url), 'utf8');
  it('cursos: encuentra Cálculo por su código', () => {
    expect(cursoDeAsignatura(leerCursos(JSON.parse(leer('cursos.json'))), '2327007')?.id).toBe(250589);
  });
  it('el curso real: 16 secciones, foro «Novedades» y guía docente como etiqueta con su PDF', () => {
    const c = leerContenido(leer('estado-curso.json'));
    expect(c.secciones).toHaveLength(16);
    expect(c.secciones[0].nombre).toBe('General');
    expect(foroDeAvisos(c)).toMatchObject({ id: '11070612', nombre: 'Novedades', tipo: 'forum' });
    const guia = moduloGuia(c);
    expect(guia).toMatchObject({ id: '11070615', tipo: 'label' });
    expect(enlaceGuia(leer('curso-guia.html'), guia!.id)).toBe('https://www.aulavirtual.urjc.es/moodle/pluginfile.php/14842895/mod_label/intro/GuiaDocente_EJEMPLO.pdf');
    expect(enlaceGuia(leer('curso-guia.html'), '999')).toBeUndefined();
  });
  it('el foro y el hilo reales se entienden', () => {
    const hilos = leerForo(leer('foro.html'));
    expect(hilos).toEqual([{ id: '956500', titulo: 'Aviso de ejemplo 1' }, { id: '952081', titulo: 'Aviso de ejemplo 2' }]);
    const m = leerHilo(leer('hilo.html'), hilos[0]);
    expect(m.titulo).toBe('Aviso de ejemplo 1');
    expect(m.texto).toBe('Buenos días:\nEl primer parcial será el jueves 12 de noviembre a las 10:00 en el aula 204.\nUn saludo.');
    expect(m.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('la carpeta real: tres archivos', () => {
    expect(leerCarpeta(leer('carpeta.html')).map((f) => f.nombre)).toEqual(['Archivo 1.pdf', 'Archivo 2.pdf', 'Archivo 3.pdf']);
  });
});
