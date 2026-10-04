import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTareas } from '../src/datos/tareas.ts';
import { sincronizarUni, textoResumen, type Opciones } from './uni.ts';

const URL_SECRETA = 'https://aula.ejemplo/moodle/calendar/export_execute.php?userid=1&authtoken=SECRETO123';

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT', 'UID:1@aula', 'SUMMARY:Práctica 1 se cierra', 'DTSTART:20261005T220000Z', 'CATEGORIES:2026-27_2327004_1_2', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:2@aula', 'SUMMARY:Test se cierra', 'DTSTART:20261001T215900Z', 'CATEGORIES:RAC_EMP_FUENLABRADA', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const EXAMENES = { CONSULTA: [{
  COD_ASIGNATURA: '2327007', FECHA: '21-01-2027', HORA: '09:00 - 12:00', AULAS: 'Aulario II - Aula 204',
  CONVOCATORIA: 'E', CURSO_ACADEMICO: '2026-27', GRUPO: 'AM',
}] };

const ASIGNATURAS = 'asignaturas:\n'
  + '  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n'
  + '  - id: fundamentos-programacion\n    nombre: Fundamentos de la Programación\n    color: "#2f9e6e"\n    codigo: "2327004"\n';

const TAREAS = '- id: t-20260930-1\n  titulo: Ir a entrenar\n  area: salud\n';

function carpeta(archivos: Record<string, string> = {}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'uni-'));
  mkdirSync(path.join(dir, 'agenda'));
  mkdirSync(path.join(dir, 'estudios'));
  const todos = { 'agenda/tareas.yaml': TAREAS, 'estudios/asignaturas.yaml': ASIGNATURAS, ...archivos };
  for (const [ruta, texto] of Object.entries(todos)) writeFileSync(path.join(dir, ruta), texto);
  return dir;
}

function descargarFalso(ics: () => Response, examenes: () => Response): typeof fetch {
  return (async (url: string | URL | Request) => (String(url) === URL_SECRETA ? ics() : examenes())) as typeof fetch;
}

const opciones = (dir: string, x: Partial<Opciones> = {}): Opciones => ({
  carpeta: dir,
  urlCalendario: URL_SECRETA,
  ahora: new Date('2026-09-30T10:00:00Z'),
  prueba: false,
  descargar: descargarFalso(() => new Response(ICS), () => Response.json(EXAMENES)),
  ...x,
});

const leer = (dir: string, ruta: string) => readFileSync(path.join(dir, ruta), 'utf8');

describe('sincronizarUni', () => {
  it('mete las novedades y apunta lo visto', async () => {
    const dir = carpeta();
    const r = await sincronizarUni(opciones(dir));
    expect(r).toEqual({ creadas: 2, actualizadas: 0, saltados: 0, escrito: true });
    expect(textoResumen(r)).toBe('Uni: 2 nuevas, 0 actualizadas');
    const tareas = parseTareas(leer(dir, 'agenda/tareas.yaml'));
    expect(tareas.map((t) => [t.id, t.titulo])).toEqual([
      ['t-20260930-1', 'Ir a entrenar'],
      ['t-20260930-2', 'Cálculo (enero)'],
      ['t-20260930-3', 'Práctica 1'],
    ]);
    expect(tareas.map((t) => t.tipo)).toEqual([undefined, 'examen', 'entrega']);
    expect(leer(dir, 'estudios/uni-sincronizacion.yaml')).toContain('moodle:1@aula');
  });
  it('sin novedades no escribe nada', async () => {
    const dir = carpeta();
    await sincronizarUni(opciones(dir));
    const antes = leer(dir, 'agenda/tareas.yaml');
    const r = await sincronizarUni(opciones(dir));
    expect(r).toEqual({ creadas: 0, actualizadas: 0, saltados: 0, escrito: false });
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(antes);
  });
  it('con --prueba no guarda', async () => {
    const dir = carpeta();
    const r = await sincronizarUni(opciones(dir, { prueba: true }));
    expect(r.creadas).toBe(2);
    expect(r.escrito).toBe(false);
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(TAREAS);
    expect(existsSync(path.join(dir, 'estudios/uni-sincronizacion.yaml'))).toBe(false);
  });
  it('sin tareas.yaml empieza con la lista vacía', async () => {
    const dir = carpeta();
    writeFileSync(path.join(dir, 'agenda/tareas.yaml'), '');
    expect((await sincronizarUni(opciones(dir))).creadas).toBe(2);
  });

  async function fallaSinEscribir(dir: string, o: Opciones, mensaje: RegExp) {
    const antes = leer(dir, 'agenda/tareas.yaml');
    const error = await sincronizarUni(o).then(() => null, (e: Error) => e);
    expect(error?.message).toMatch(mensaje);
    expect(error?.message).not.toContain('SECRETO123');
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(antes);
    expect(existsSync(path.join(dir, 'estudios/uni-sincronizacion.yaml'))).toBe(false);
  }

  it('enlace caducado (403) → error sin la URL y sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response('no', { status: 403 }), () => Response.json(EXAMENES)),
    }), /403/);
  });
  it('enlace caducado que devuelve una página de inicio de sesión → error sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response('<html>Acceder</html>'), () => Response.json(EXAMENES)),
    }), /caducado/);
  });
  it('la web de exámenes devuelve otra cosa → error sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response(ICS), () => new Response('<html>mantenimiento</html>')),
    }), /exámenes/);
  });
  it('sin red → error sin la URL y sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: (async () => { throw new TypeError(`fetch failed ${URL_SECRETA}`); }) as typeof fetch,
    }), /no se ha podido conectar/);
  });
  it('ninguna asignatura con codigo → error', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': 'asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n' });
    await fallaSinEscribir(dir, opciones(dir), /codigo/);
  });
  it('tareas.yaml mal escrito → error sin escribir', async () => {
    const dir = carpeta({ 'agenda/tareas.yaml': '- id: t-1\n  titulo: X\n' });
    await fallaSinEscribir(dir, opciones(dir), /area/);
  });
});

describe('sincronizarUni: horario', () => {
  const PAGINA = readFileSync(path.join(import.meta.dirname, '../src/uni/pruebas/horario-urjc.html'), 'utf8');
  const AJUSTES = 'grupo: "G_ROBOT_1A(F)"\ncurso: 1\ndesdoble: G2\n';
  const ASIG = ASIGNATURAS + '  - id: algebra\n    nombre: Álgebra\n    color: "#db5629"\n    codigo: "2327002"\n';
  const pedidas: { url: string; cuerpo: string }[] = [];
  const conHorario = (horario: () => Response): typeof fetch => (async (url: string | URL | Request, init?: RequestInit) => {
    pedidas.push({ url: String(url), cuerpo: String(init?.body ?? '') });
    if (String(url) === URL_SECRETA) return new Response(ICS);
    if (String(url).includes('/horarios/')) return horario();
    return Response.json(EXAMENES);
  }) as typeof fetch;

  it('descarga el horario de su grupo y lo guarda', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES });
    pedidas.length = 0;
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.clases).toBe(3);
    expect(r.errorHorario).toBeUndefined();
    expect(textoResumen(r)).toBe('Uni: 2 nuevas, 0 actualizadas · horario: 3 clases');
    const pedida = pedidas.find((p) => p.url.includes('/horarios/'))!;
    expect(pedida.url).toBe('https://servicios.urjc.es/horarios/calendario-grado');
    expect(new URLSearchParams(pedida.cuerpo).get('grupo')).toBe('G_ROBOT_1A(F)');
    expect(new URLSearchParams(pedida.cuerpo).get('semestre')).toBe('*');
    expect(leer(dir, 'estudios/horario.yaml')).toContain('desdoble: G2');
  });
  it('sin cambios no reescribe el horario', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES });
    const o = opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) });
    await sincronizarUni(o);
    const r = await sincronizarUni(o);
    expect(r.escrito).toBe(false);
  });
  it('sin ajustes no pide el horario', async () => {
    const dir = carpeta();
    pedidas.length = 0;
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.clases).toBeUndefined();
    expect(pedidas.some((p) => p.url.includes('/horarios/'))).toBe(false);
    expect(existsSync(path.join(dir, 'estudios/horario.yaml'))).toBe(false);
  });
  it('si falla el horario, guarda lo demás y deja el horario que había', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES, 'estudios/horario.yaml': 'clases: []\n' });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response('<html>mantenimiento</html>')) }));
    expect(r.errorHorario).toMatch(/horario/);
    expect(r.creadas).toBe(2);
    expect(r.escrito).toBe(true);
    expect(leer(dir, 'estudios/horario.yaml')).toBe('clases: []\n');
  });
  it('un horario vacío no borra el que había', async () => {
    const antes = 'clases:\n  - fecha: 2026-09-16\n    inicio: "09:00"\n    fin: "11:00"\n    asignatura: algebra\n';
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES, 'estudios/horario.yaml': antes });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response('<script>const infoHorario = {"GRUPOS":[]};</script>')) }));
    expect(r.errorHorario).toMatch(/ninguna clase/);
    expect(leer(dir, 'estudios/horario.yaml')).toBe(antes);
  });
  it('ajustes mal escritos: error del horario, lo demás se guarda', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': 'desdoble: dos\n' });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.errorHorario).toMatch(/desdoble/);
    expect(r.creadas).toBe(2);
  });
});
