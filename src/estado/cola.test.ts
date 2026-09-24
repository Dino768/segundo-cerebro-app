import { describe, expect, it } from 'vitest';
import { crearCola } from './cola';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('crearCola', () => {
  it('ejecuta las tareas de una en una, en orden', async () => {
    const encolar = crearCola();
    const registro: string[] = [];
    const tarea = (n: string, ms: number) => async () => {
      registro.push(`empieza ${n}`);
      await esperar(ms);
      registro.push(`acaba ${n}`);
      return n;
    };
    const r = await Promise.all([encolar(tarea('a', 20)), encolar(tarea('b', 1))]);
    expect(r).toEqual(['a', 'b']);
    expect(registro).toEqual(['empieza a', 'acaba a', 'empieza b', 'acaba b']);
  });
  it('sigue con la siguiente aunque una falle', async () => {
    const encolar = crearCola();
    const fallo = encolar(async () => {
      throw new Error('x');
    });
    const bien = encolar(async () => 'ok');
    await expect(fallo).rejects.toThrow('x');
    await expect(bien).resolves.toBe('ok');
  });
});
