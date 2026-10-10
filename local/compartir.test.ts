import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rename } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { copiarChat, esRutaPaquete, instalarPaquete, leerCompartidos, marcarPendiente, ponerCompartido, prepararPaquete, tamanoPaquete, type LugarChat } from './compartir.ts';
import { leerNombres, ponerNombre } from './conversaciones.ts';

const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const NUEVO = '11111111-2222-4333-8444-555555555555';
const b64 = (s: string) => Buffer.from(s).toString('base64');
const texto = (b: string) => Buffer.from(b, 'base64').toString('utf8');

function ordenador(nombre: string): LugarChat {
  const base = mkdtempSync(path.join(os.tmpdir(), `compartir-${nombre}-`));
  const raiz = path.join(base, 'my-context');
  const cwd = path.join(raiz, 'estudios', 'calculo');
  const carpetaClaude = path.join(base, 'casa', '.claude', 'projects', 'x');
  mkdirSync(cwd, { recursive: true });
  mkdirSync(carpetaClaude, { recursive: true });
  return { carpetaClaude, cwd, raiz, id: ID };
}
const info = { compartidoEl: '2026-10-10', actualizado: '2026-10-10T10:00:00.000Z', dispositivo: 'PC' };

function conChat(l: LugarChat) {
  writeFileSync(path.join(l.carpetaClaude, `${ID}.jsonl`), JSON.stringify({ sessionId: ID, cwd: l.cwd }) + '\n');
  mkdirSync(path.join(l.carpetaClaude, ID, 'subagents'), { recursive: true });
  writeFileSync(path.join(l.carpetaClaude, ID, 'subagents', 'a.jsonl'), JSON.stringify({ cwd: l.cwd }) + '\n');
  mkdirSync(path.join(l.cwd, '.en-curso', ID, 'imagenes'), { recursive: true });
  writeFileSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-1.json'), '{"version":1}');
  writeFileSync(path.join(l.cwd, '.en-curso', ID, 'imagenes', 'captura-1.png'), Buffer.from([1, 2, 3]));
}

describe('prepararPaquete', () => {
  it('junta conversación, sesión, pizarras, imágenes y chat.json, con rutas portables', async () => {
    const pc = ordenador('pc');
    conChat(pc);
    await ponerNombre(pc.cwd, ID, 'Derivadas');
    const p = await prepararPaquete(pc, info);
    expect(p.map((a) => a.ruta).sort()).toEqual(['chat.json', 'conversacion.jsonl', 'imagenes/captura-1.png', 'pizarra-1.json', 'sesion/subagents/a.jsonl']);
    const conv = texto(p.find((a) => a.ruta === 'conversacion.jsonl')!.base64);
    expect(conv).toContain('{{MY_CONTEXT}}');
    expect(conv).not.toContain(JSON.stringify(pc.raiz).slice(1, -1));
    expect(JSON.parse(texto(p.find((a) => a.ruta === 'chat.json')!.base64))).toEqual({ ...info, nombre: 'Derivadas' });
    expect(tamanoPaquete(p)).toBeGreaterThan(3);
  });
  it('sin conversación falla con un mensaje claro', async () => {
    await expect(prepararPaquete(ordenador('vacio'), info)).rejects.toThrow('Este chat aún no tiene mensajes');
  });
});

describe('instalarPaquete', () => {
  it('en otro ordenador queda con sus rutas, su nombre y sus pizarras', async () => {
    const pc = ordenador('pc2');
    conChat(pc);
    await ponerNombre(pc.cwd, ID, 'Derivadas');
    const paquete = await prepararPaquete(pc, info);
    const portatil = ordenador('portatil');
    expect(await instalarPaquete(portatil, paquete)).toMatchObject({ nombre: 'Derivadas', dispositivo: 'PC' });
    const conv = JSON.parse(readFileSync(path.join(portatil.carpetaClaude, `${ID}.jsonl`), 'utf8'));
    expect(conv.cwd).toBe(portatil.cwd);
    expect(existsSync(path.join(portatil.carpetaClaude, ID, 'subagents', 'a.jsonl'))).toBe(true);
    expect(readFileSync(path.join(portatil.cwd, '.en-curso', ID, 'imagenes', 'captura-1.png'))).toEqual(Buffer.from([1, 2, 3]));
    expect((await leerNombres(portatil.cwd))[ID]).toBe('Derivadas');
  });
  it('reemplaza lo que había (una pizarra borrada en el otro lado desaparece)', async () => {
    const l = ordenador('reemplazo');
    conChat(l);
    writeFileSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-2.json'), '{}');
    await instalarPaquete(l, [{ ruta: 'conversacion.jsonl', base64: b64('{}\n') }]);
    expect(existsSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-2.json'))).toBe(false);
  });
  it('un paquete con rutas peligrosas o sin conversación no toca nada', async () => {
    const l = ordenador('malo');
    conChat(l);
    await expect(instalarPaquete(l, [{ ruta: 'conversacion.jsonl', base64: b64('{}') }, { ruta: '../fuera.txt', base64: '' }])).rejects.toThrow();
    await expect(instalarPaquete(l, [{ ruta: 'pizarra-1.json', base64: b64('{}') }])).rejects.toThrow();
    expect(existsSync(path.join(l.carpetaClaude, `${ID}.jsonl`))).toBe(true);
    expect(existsSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-1.json'))).toBe(true);
  });
  it('si falla al cambiar las carpetas (Windows con un archivo bloqueado), lo de antes se queda como estaba', async () => {
    const l = ordenador('fallo');
    conChat(l);
    let veces = 0;
    const renombrar = async (a: string, b: string) => {
      if (++veces === 5) throw new Error('EPERM');
      await rename(a, b);
    };
    const paquete = [{ ruta: 'conversacion.jsonl', base64: b64('{"nuevo":1}\n') }, { ruta: 'pizarra-1.json', base64: b64('{"nueva":1}') }];
    await expect(instalarPaquete(l, paquete, renombrar)).rejects.toThrow('EPERM');
    expect(readFileSync(path.join(l.carpetaClaude, `${ID}.jsonl`), 'utf8')).toContain(ID);
    expect(existsSync(path.join(l.carpetaClaude, ID, 'subagents', 'a.jsonl'))).toBe(true);
    expect(readFileSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-1.json'), 'utf8')).toBe('{"version":1}');
  });
  it('esRutaPaquete', () => {
    expect(esRutaPaquete('imagenes/captura-1.png')).toBe(true);
    for (const mala of ['../x', '/x', 'a//b', '.git/x', 'a\\b', '']) expect(esRutaPaquete(mala)).toBe(false);
  });
});

describe('copiarChat', () => {
  it('hace un chat nuevo con el id cambiado dentro y su nombre', async () => {
    const l = ordenador('copia');
    conChat(l);
    await copiarChat(l, NUEVO, 'Derivadas (copia de PC)');
    expect(readFileSync(path.join(l.carpetaClaude, `${NUEVO}.jsonl`), 'utf8')).toContain(NUEVO);
    expect(readFileSync(path.join(l.carpetaClaude, `${NUEVO}.jsonl`), 'utf8')).not.toContain(ID);
    expect(existsSync(path.join(l.cwd, '.en-curso', NUEVO, 'pizarra-1.json'))).toBe(true);
    expect((await leerNombres(l.cwd))[NUEVO]).toBe('Derivadas (copia de PC)');
  });
});

describe('compartidos.json', () => {
  it('guarda y quita entradas', async () => {
    const l = ordenador('lista');
    expect(await leerCompartidos(l.cwd)).toEqual({});
    await ponerCompartido(l.cwd, ID, { version: 'v1', pendiente: false, compartidoEl: '2026-10-10' });
    expect((await leerCompartidos(l.cwd))[ID].version).toBe('v1');
    await ponerCompartido(l.cwd, ID, null);
    expect(await leerCompartidos(l.cwd)).toEqual({});
  });
  it('cambios a la vez no se pisan', async () => {
    const l = ordenador('vez');
    const ids = Array.from({ length: 8 }, (_, i) => `${i}1111111-2222-4333-8444-555555555555`);
    await Promise.all(ids.map((id) => ponerCompartido(l.cwd, id, { version: 'v', pendiente: false, compartidoEl: '2026-10-10' })));
    expect(Object.keys(await leerCompartidos(l.cwd)).sort()).toEqual([...ids].sort());
  });
  it('marcarPendiente: solo cambia los chats compartidos', async () => {
    const l = ordenador('marca');
    await ponerCompartido(l.cwd, ID, { version: 'v1', pendiente: false, compartidoEl: '2026-10-10' });
    await marcarPendiente(l.cwd, ID);
    await marcarPendiente(l.cwd, NUEVO);
    expect(await leerCompartidos(l.cwd)).toEqual({ [ID]: { version: 'v1', pendiente: true, compartidoEl: '2026-10-10' } });
  });
  it('un archivo roto se lee como vacío', async () => {
    const l = ordenador('roto');
    mkdirSync(path.join(l.cwd, '.en-curso'), { recursive: true });
    writeFileSync(path.join(l.cwd, '.en-curso', 'compartidos.json'), '{roto');
    expect(await leerCompartidos(l.cwd)).toEqual({});
  });
});
