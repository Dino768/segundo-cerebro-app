import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSubidaDiferida } from './subidaDiferida';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('crearSubidaDiferida', () => {
  it('varios cambios seguidos → una sola subida, 5 s después del último', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    await vi.advanceTimersByTimeAsync(3000);
    s.avisar();
    await vi.advanceTimersByTimeAsync(4999);
    expect(subir).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(subir).toHaveBeenCalledTimes(1);
  });
  it('ya() sube enseguida y cancela la espera', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    await s.ya();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(subir).toHaveBeenCalledTimes(1);
  });
  it('si llega un cambio mientras sube, vuelve a subir al terminar', async () => {
    let soltar!: () => void;
    const subir = vi.fn(() => new Promise<void>((r) => (soltar = r)));
    const s = crearSubidaDiferida(subir, 10);
    s.avisar();
    await vi.advanceTimersByTimeAsync(10);
    s.avisar();
    soltar();
    await vi.advanceTimersByTimeAsync(10);
    expect(subir).toHaveBeenCalledTimes(2);
  });
  it('parar() cancela lo que estaba esperando', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    s.parar();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(subir).not.toHaveBeenCalled();
  });
});
