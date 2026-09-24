import { describe, expect, it } from 'vitest';
import { crearGuardian } from './guardian';

describe('crearGuardian (cambios sin guardar)', () => {
  it('sin cambios deja salir sin preguntar', async () => {
    const g = crearGuardian();
    let preguntas = 0;
    expect(await g.puedeSalir(async () => (preguntas++, false))).toBe(true);
    expect(preguntas).toBe(0);
  });
  it('con cambios pregunta y respeta la respuesta', async () => {
    const g = crearGuardian();
    g.marcar(true);
    expect(g.hayCambios()).toBe(true);
    expect(await g.puedeSalir(async () => false)).toBe(false);
    expect(await g.puedeSalir(async () => true)).toBe(true);
  });
  it('al confirmar la salida o marcar sin cambios, deja de preguntar', async () => {
    const g = crearGuardian();
    g.marcar(true);
    await g.puedeSalir(async () => true);
    expect(g.hayCambios()).toBe(false);
    g.marcar(true);
    g.marcar(false);
    expect(await g.puedeSalir(async () => false)).toBe(true);
  });
});
