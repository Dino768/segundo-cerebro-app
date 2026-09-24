import { describe, expect, it, vi } from 'vitest';
import { crearOptimista } from './optimista';

function montar(inicial: number[]) {
  let estado = inicial;
  const o = crearOptimista<number[]>((f) => (estado = f(estado)));
  return { o, ver: () => estado };
}

const promesa = <T,>() => {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const p = new Promise<T>((res, rej) => ((resolver = res), (rechazar = rej)));
  return { p, resolver, rechazar };
};

describe('crearOptimista', () => {
  it('cambia al instante y, al guardar, se queda con lo que diga GitHub', async () => {
    const { o, ver } = montar([1]);
    const g = promesa<number[]>();
    const hecho = o.cambiar((x) => [...x, 2], (x) => x.filter((n) => n !== 2), () => g.p, vi.fn());
    expect(ver()).toEqual([1, 2]);
    g.resolver([1, 2, 99]);
    expect(await hecho).toBe(true);
    expect(ver()).toEqual([1, 2, 99]);
  });
  it('con dos cambios seguidos no se pisa el segundo mientras se guarda', async () => {
    const { o, ver } = montar([]);
    const a = promesa<number[]>();
    const b = promesa<number[]>();
    const pa = o.cambiar((x) => [...x, 1], (x) => x, () => a.p, vi.fn());
    const pb = o.cambiar((x) => [...x, 2], (x) => x, () => b.p, vi.fn());
    a.resolver([1]);
    await pa;
    expect(ver()).toEqual([1, 2]);
    b.resolver([1, 2]);
    await pb;
    expect(ver()).toEqual([1, 2]);
  });
  it('si falla, se deshace y se avisa', async () => {
    const { o, ver } = montar([1]);
    const alFallar = vi.fn();
    const r = await o.cambiar((x) => [...x, 2], (x) => x.filter((n) => n !== 2), () => Promise.reject(new Error('red')), alFallar);
    expect(r).toBe(false);
    expect(ver()).toEqual([1]);
    expect(alFallar).toHaveBeenCalledWith(expect.objectContaining({ message: 'red' }));
  });
});
