import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { VERSION_PROGRAMA } from '../src/estudio/tipos.ts';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { carpetaConversaciones } from './conversaciones.ts';
import { crearServidor } from './servidor.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FALSO = { bin: process.execPath, previos: [path.join(aqui, 'pruebas', 'claude-falso.ts')] };
const PUERTO = 5300 + Math.floor(Math.random() * 600);
const BASE = `http://127.0.0.1:${PUERTO}/segundo-cerebro-app/`;
const API = `${BASE}api/local/`;
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const raiz = mkdtempSync(path.join(os.tmpdir(), 'servidor-'));
const estudios = path.join(raiz, 'my-context', 'estudios');
const dist = path.join(raiz, 'dist');
const home = path.join(raiz, 'casa');
const registro = path.join(raiz, 'registro.jsonl');
let cerrar: () => void;
let ocupado: () => boolean;

const post = (ruta: string, cuerpo: unknown, headers: Record<string, string> = {}) =>
  fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(cuerpo) });
const eventos = async (r: Response) => (await r.text()).trim().split('\n').map((l) => JSON.parse(l));
const registrado = () => readFileSync(registro, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

beforeAll(async () => {
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>app</title>');
  writeFileSync(path.join(dist, 'assets', 'a.js'), 'console.log(1)');
  const convs = carpetaConversaciones(path.join(estudios, 'fisica'), home);
  mkdirSync(convs, { recursive: true });
  writeFileSync(path.join(convs, `${ID}.jsonl`), JSON.stringify({ type: 'user', message: { role: 'user', content: 'Primera pregunta' } }) + '\n');
  process.env.FALSO_REGISTRO = registro;
  const creado = crearServidor({ puerto: PUERTO, estudios, dist, home, comando: FALSO, instrucciones: path.join(raiz, 'i.md') });
  const { servidor } = creado;
  ocupado = creado.ocupado;
  await new Promise<void>((r) => servidor.listen(PUERTO, '127.0.0.1', r));
  cerrar = () => servidor.close();
});
afterAll(() => {
  delete process.env.FALSO_REGISTRO;
  cerrar();
});

describe('seguridad', () => {
  it('rechaza otra web (Origin)', async () => {
    const r = await fetch(`${API}estado`, { headers: { Origin: 'https://malvado.com' } });
    expect(r.status).toBe(403);
  });
  it('rechaza otro nombre de host', async () => {
    const estado = await new Promise<number>((resolver) => {
      http.get({ host: '127.0.0.1', port: PUERTO, path: '/segundo-cerebro-app/api/local/estado', headers: { Host: 'malvado.com' } }, (res) => {
        res.resume();
        resolver(res.statusCode ?? 0);
      });
    });
    expect(estado).toBe(403);
  });
  it('asignatura no válida → 400', async () => {
    expect((await fetch(`${API}conversaciones?asignatura=..%2Fx`)).status).toBe(400);
  });
});

describe('app', () => {
  it('sirve la app, cualquier pantalla sin extensión da index.html, y / redirige', async () => {
    expect(await (await fetch(BASE)).text()).toContain('<title>app</title>');
    expect(await (await fetch(`${BASE}estudio`)).text()).toContain('<title>app</title>');
    expect(await (await fetch(`${BASE}assets/a.js`)).text()).toBe('console.log(1)');
    expect((await fetch(`${BASE}assets/no.js`)).status).toBe(404);
    const r = await fetch(`http://127.0.0.1:${PUERTO}/`, { redirect: 'manual' });
    expect(r.status).toBe(302);
  });
  it('estado', async () => {
    expect(await (await fetch(`${API}estado`)).json()).toEqual({ ok: true, version: VERSION_PROGRAMA });
  });
});

describe('conversaciones', () => {
  it('lista y lee las de la asignatura', async () => {
    const lista = await (await fetch(`${API}conversaciones?asignatura=fisica`)).json();
    expect(lista).toMatchObject([{ id: ID, titulo: 'Primera pregunta' }]);
    const ms = await (await fetch(`${API}conversacion?asignatura=fisica&id=${ID}`)).json();
    expect(ms).toEqual([{ rol: 'diego', texto: 'Primera pregunta' }]);
    expect(await (await fetch(`${API}conversaciones?asignatura=calculo`)).json()).toEqual([]);
  });
});

describe('mensaje', () => {
  it('lanza Claude en la carpeta de la asignatura con la cabecera y devuelve los eventos', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const r = await post('mensaje', { asignatura: 'fisica', id, nueva: true, texto: 'Ñandú 🦕\nlínea 2', imagenes: [], pizarraAbierta: null });
    expect(await eventos(r)).toEqual([{ tipo: 'texto', texto: 'Hola ' }, { tipo: 'texto', texto: 'Diego' }, { tipo: 'fin' }]);
    const ultimo = registrado().at(-1);
    expect(path.resolve(ultimo.cwd)).toBe(path.resolve(estudios, 'fisica'));
    expect(ultimo.args).toContain('--session-id');
    expect(ultimo.entrada).toContain('Asignatura: fisica');
    expect(ultimo.entrada).toContain('Ñandú 🦕\nlínea 2');
  });
  it('mensaje vacío → 400', async () => {
    expect((await post('mensaje', { asignatura: 'fisica', id: ID, nueva: false, texto: '  ', imagenes: [] })).status).toBe(400);
  });
  it('una respuesta a la vez por conversación, y parar', async () => {
    const id = '22222222-2222-4222-8222-222222222222';
    const primera = post('mensaje', { asignatura: 'fisica', id, nueva: true, texto: 'LENTO', imagenes: [] });
    await new Promise((r) => setTimeout(r, 800));
    expect((await post('mensaje', { asignatura: 'fisica', id, nueva: false, texto: 'otra', imagenes: [] })).status).toBe(409);
    expect(ocupado()).toBe(true); // mientras contesta, el programa no se reinicia para actualizarse
    await post('parar', { id });
    expect((await eventos(await primera)).at(-1)).toEqual({ tipo: 'fin', parado: true });
    expect(ocupado()).toBe(false);
  }, 10000);
  it('si Diego cierra la pestaña, Claude se para y la conversación queda libre', async () => {
    const id = '44444444-4444-4444-8444-444444444444';
    const control = new AbortController();
    const cortada = fetch(`${API}mensaje`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: control.signal,
      body: JSON.stringify({ asignatura: 'fisica', id, nueva: true, texto: 'LENTO', imagenes: [] }),
    }).catch(() => undefined);
    await new Promise((res) => setTimeout(res, 800));
    control.abort(); // como cerrar la pestaña
    await cortada;
    await new Promise((res) => setTimeout(res, 800));
    // Sin el arreglo, esto daría 409 durante 10 segundos (Claude seguiría contestando a nadie).
    const otra = await post('mensaje', { asignatura: 'fisica', id, nueva: false, texto: 'hola', imagenes: [] });
    expect(otra.status).toBe(200);
    expect((await eventos(otra)).at(-1)).toEqual({ tipo: 'fin' });
  }, 15000);
});

describe('capturas', () => {
  it('guarda la imagen, la sirve y no deja salir de la carpeta', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const r = await fetch(`${API}imagen?asignatura=fisica&id=${ID}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: bytes });
    const { nombre } = await r.json();
    expect(nombre).toMatch(/^captura-\d+-\d+\.png$/);
    const leida = new Uint8Array(await (await fetch(`${API}archivo?asignatura=fisica&id=${ID}&ruta=imagenes/${nombre}`)).arrayBuffer());
    expect([...leida]).toEqual([...bytes]);
    expect((await fetch(`${API}archivo?asignatura=fisica&id=${ID}&ruta=..%2F..%2F..%2Fi.md`)).status).toBe(400);
    expect((await fetch(`${API}imagen?asignatura=fisica&id=${ID}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })).status).toBe(415);
  });
});

describe('eventos', () => {
  it('abre el canal de avisos', async () => {
    const control = new AbortController();
    const r = await fetch(`${API}eventos`, { signal: control.signal });
    expect(r.headers.get('content-type')).toContain('text/event-stream');
    const lector = r.body!.getReader();
    const { value } = await lector.read();
    expect(new TextDecoder().decode(value)).toContain(': conectado');
    control.abort();
  });
});

describe('pizarras', () => {
  const id = '55555555-5555-4555-8555-555555555555';
  it('nueva, operación y lista', async () => {
    const { n } = await (await post('pizarra/nueva', { asignatura: 'fisica', id })).json();
    expect(n).toBe(1);
    const p = await (await post('pizarra/operacion', { asignatura: 'fisica', id, n: 1, op: { tipo: 'nota', id: null, x: 1, y: 2, contenido: 'Hola' } })).json();
    expect(p.piezas).toHaveLength(1);
    const lista = await (await fetch(`${API}pizarras?asignatura=fisica&id=${id}`)).json();
    expect(lista[0]).toMatchObject({ n: 1, error: null });
    const t = await (await post('pizarra/operacion', {
      asignatura: 'fisica', id, n: 1,
      op: { tipo: 'trazos', quitar: [], poner: [{ id: 'd-1', herramienta: 'lapiz', color: '#000000', grosor: 2, puntos: [0, 0, 5, 5] }] },
    })).json();
    expect(t.trazos).toHaveLength(1);
    expect((await post('pizarra/operacion', { asignatura: 'fisica', id, n: 1, op: { tipo: 'volar' } })).status).toBe(400);
  });
  it('borrar una pizarra', async () => {
    const otra = '77777777-7777-4777-8777-777777777777';
    await post('pizarra/nueva', { asignatura: 'fisica', id: otra });
    await post('pizarra/nueva', { asignatura: 'fisica', id: otra });
    expect((await post('pizarra/borrar', { asignatura: 'fisica', id: otra, n: 1 })).status).toBe(200);
    const lista = await (await fetch(`${API}pizarras?asignatura=fisica&id=${otra}`)).json();
    expect(lista.map((e: { n: number }) => e.n)).toEqual([2]);
    expect((await post('pizarra/borrar', { asignatura: 'fisica', id: otra, n: 'x' })).status).toBe(400);
  });
  it('si Claude deja una pizarra mal escrita, se le pide que la arregle una vez', async () => {
    const otra = '66666666-6666-4666-8666-666666666666';
    const r = await post('mensaje', { asignatura: 'fisica', id: otra, nueva: true, texto: 'PIZARRA-MALA', imagenes: [] });
    const evs = await eventos(r);
    expect(evs.some((e) => e.tipo === 'herramienta' && e.texto.startsWith('⚠️'))).toBe(true);
    const lista = await (await fetch(`${API}pizarras?asignatura=fisica&id=${otra}`)).json();
    expect(lista[0]).toMatchObject({ n: 1, error: null });
    expect(lista[0].pizarra.titulo).toBe('Arreglada');
    const llamadas = registrado().filter((x) => x.entrada.includes(otra) || x.args.includes(otra));
    expect(llamadas).toHaveLength(2);
    expect(llamadas[1].args).toContain('--resume');
    expect(llamadas[1].entrada).toContain('no es válida');
  });
});
