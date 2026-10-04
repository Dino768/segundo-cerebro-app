import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarClasesVisibles, leerClasesVisibles } from './clasesVisibles';

afterEach(() => vi.unstubAllGlobals());

describe('pastilla de clases del calendario', () => {
  it('empieza apagada (sin nada guardado o sin almacenamiento)', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    expect(leerClasesVisibles()).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } });
    expect(leerClasesVisibles()).toBe(false);
    expect(() => guardarClasesVisibles(true)).not.toThrow();
  });
  it('se recuerda en el dispositivo', () => {
    const guardado = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => guardado.get(k) ?? null, setItem: (k: string, v: string) => guardado.set(k, v) });
    guardarClasesVisibles(true);
    expect(leerClasesVisibles()).toBe(true);
    guardarClasesVisibles(false);
    expect(leerClasesVisibles()).toBe(false);
  });
});
