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
  const nueva = async (revisar: () => Promise<unknown>) => {
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
