import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { crearAula, tocaRevisar } from './programador.ts';

describe('cuándo revisar', () => {
  it('sin revisión o con más de 20 horas', () => {
    const ahora = new Date('2026-10-04T08:00:00Z'); // 10:00 en Madrid
    expect(tocaRevisar(undefined, ahora)).toBe(true);
    expect(tocaRevisar('2026-10-03T13:00', ahora)).toBe(true);   // 21 h
    expect(tocaRevisar('2026-10-03T15:00', ahora)).toBe(false);  // 19 h
  });
});

describe('interruptor y revisión', () => {
  it('apagado por defecto; encendido revisa cuando toca y no dos a la vez', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let revisiones = 0;
    let soltar: () => void = () => undefined;
    const aula = crearAula({
      config, ahora: () => new Date('2026-10-04T08:00:00Z'), leerEstado: async () => ({}), entrar: async () => true,
      revisar: () => new Promise<void>((r) => { revisiones++; soltar = r; }),
    });
    await aula.comprobar();
    expect(revisiones).toBe(0);
    await aula.activar(true);
    expect(JSON.parse(await readFile(config, 'utf8'))).toEqual({ activo: true });
    await aula.comprobar();
    await aula.comprobar();
    expect(revisiones).toBe(1);
    expect(aula.ocupado()).toBe(true);
    expect((await aula.estado()).revisando).toBe(true);
    soltar();
    await new Promise((r) => setTimeout(r, 0));
    expect(aula.ocupado()).toBe(false);
  });
  it('«Revisar ahora» revisa aunque no toque', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let revisiones = 0;
    const aula = crearAula({ config, ahora: () => new Date(), leerEstado: async () => ({ ultimaRevision: '2099-01-01T00:00' }), entrar: async () => true, revisar: async () => void revisiones++ });
    await aula.activar(true);
    await aula.comprobar();
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(revisiones).toBe(1);
  });
});

describe('errores de la revisión', () => {
  const nueva = async (revisar: () => Promise<void>) => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    const aula = crearAula({ config, ahora: () => new Date(), leerEstado: async () => ({}), entrar: async () => true, revisar });
    await aula.activar(true);
    return aula;
  };
  it('un fallo libera el programador y no escribe datos privados', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aula = await nueva(async () => { throw new Error('https://x?sesskey=SECRETO'); });
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(aula.ocupado()).toBe(false);
    expect(espia).toHaveBeenCalled();
    expect(espia.mock.calls.flat().join(' ')).not.toContain('SECRETO');
    espia.mockRestore();
  });
  it('un fallo síncrono también libera el programador', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aula = await nueva(() => { throw new Error('sesskey=SECRETO'); });
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(aula.ocupado()).toBe(false);
    expect(espia.mock.calls.flat().join(' ')).not.toContain('SECRETO');
    espia.mockRestore();
  });
});

describe('último resultado en memoria', () => {
  const crear = async (x: { revisar: () => Promise<{ resultado: 'ok' | 'error' | 'necesita-entrar'; mensaje: string } | void>; ultimaRevision?: string }) => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    const aula = crearAula({
      config, ahora: () => new Date('2026-10-04T08:00:00Z'), entrar: async () => true,
      leerEstado: async () => ({ ultimaRevision: x.ultimaRevision ?? '2026-10-03T10:00', resultado: 'ok', mensaje: '1 aviso nuevo' }),
      revisar: x.revisar,
    });
    await aula.activar(true);
    return aula;
  };
  const esperar = () => new Promise((r) => setTimeout(r, 0));
  it('una revisión que no pudo escribir su estado se ve igual en Ajustes', async () => {
    const aula = await crear({ revisar: async () => ({ resultado: 'error', mensaje: 'my-context ha cambiado mientras revisaba: lo intento más tarde' }) });
    expect((await aula.estado()).ultimoResultado).toBeUndefined();
    await aula.revisarAhora();
    await esperar();
    expect((await aula.estado()).ultimoResultado).toEqual({ resultado: 'error', mensaje: 'my-context ha cambiado mientras revisaba: lo intento más tarde', cuando: '2026-10-04T10:00' });
  });
  it('si el archivo es más nuevo, manda el archivo', async () => {
    const aula = await crear({ ultimaRevision: '2026-10-04T11:00', revisar: async () => ({ resultado: 'necesita-entrar', mensaje: 'x' }) });
    await aula.revisarAhora();
    await esperar();
    expect((await aula.estado()).ultimoResultado).toBeUndefined();
  });
  it('un fallo inesperado queda como error sin datos privados', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aula = await crear({ revisar: async () => { throw new Error('https://x?sesskey=SECRETO'); } });
    await aula.revisarAhora();
    await esperar();
    const u = (await aula.estado()).ultimoResultado;
    expect(u?.resultado).toBe('error');
    expect(u?.mensaje).not.toContain('SECRETO');
    espia.mockRestore();
  });
});

describe('tras un fallo espera 4 horas', () => {
  it('comprobar() no repite hasta 4 horas después; «Revisar ahora» sí', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let ahora = new Date('2026-10-04T08:00:00Z').getTime();
    const hora = 60 * 60_000;
    let revisiones = 0;
    let resultado: 'ok' | 'error' | 'necesita-entrar' = 'error';
    const aula = crearAula({ config, ahora: () => new Date(ahora), leerEstado: async () => ({}), entrar: async () => true, revisar: async () => (revisiones++, { resultado, mensaje: 'x' }) });
    await aula.activar(true);
    const esperar = () => new Promise((r) => setTimeout(r, 0));
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(1);
    ahora += hora;
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(1);
    await aula.revisarAhora(); await esperar();
    expect(revisiones).toBe(2);
    ahora += 3 * hora; // 4 h desde la primera, 3 h desde «Revisar ahora»
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(2);
    ahora += hora;
    resultado = 'necesita-entrar';
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(3);
    ahora += hora;
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(3);
    ahora += 3 * hora;
    resultado = 'ok';
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(4);
    await aula.comprobar(); await esperar();
    expect(revisiones).toBe(5); // con «ok» no hay espera (aquí leerEstado no guarda la hora)
  });
  it('un fallo lanzado también espera', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let revisiones = 0;
    const aula = crearAula({ config, ahora: () => new Date('2026-10-04T08:00:00Z'), leerEstado: async () => ({}), entrar: async () => true, revisar: async () => { revisiones++; throw new Error('x'); } });
    await aula.activar(true);
    await aula.comprobar(); await new Promise((r) => setTimeout(r, 0));
    await aula.comprobar(); await new Promise((r) => setTimeout(r, 0));
    expect(revisiones).toBe(1);
    espia.mockRestore();
  });
});

describe('entrar y revisar no van a la vez (mismo perfil de Chrome)', () => {
  it('mientras revisa, entrar() devuelve false sin abrir la ventana', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let soltar: () => void = () => undefined;
    let ventanas = 0;
    const aula = crearAula({ config, ahora: () => new Date(), leerEstado: async () => ({}), entrar: async () => (ventanas++, true), revisar: () => new Promise<void>((r) => { soltar = r; }) });
    await aula.activar(true);
    await aula.revisarAhora();
    expect(await aula.entrar()).toBe(false);
    expect(ventanas).toBe(0);
    soltar();
  });
  it('mientras entra, no empieza ninguna revisión', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let soltar: (x: boolean) => void = () => undefined;
    let revisiones = 0;
    const aula = crearAula({ config, ahora: () => new Date(), leerEstado: async () => ({}), entrar: () => new Promise<boolean>((r) => { soltar = r; }), revisar: async () => void revisiones++ });
    await aula.activar(true);
    const entrando = aula.entrar();
    expect((await aula.estado()).entrando).toBe(true);
    await aula.comprobar();
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(revisiones).toBe(0);
    expect(aula.ocupado()).toBe(true);
    soltar(true);
    expect(await entrando).toBe(true);
    expect((await aula.estado()).entrando).toBe(false);
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(revisiones).toBe(1);
  });
});
