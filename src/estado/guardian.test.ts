import { describe, expect, it } from 'vitest';
import { crearGuardian } from './guardian';

describe('crearGuardian (cambios sin guardar)', () => {
  it('sin cambios deja salir sin preguntar', () => {
    const g = crearGuardian();
    let preguntas = 0;
    expect(g.puedeSalir(() => (preguntas++, false))).toBe(true);
    expect(preguntas).toBe(0);
  });
  it('con cambios pregunta y respeta la respuesta', () => {
    const g = crearGuardian();
    g.marcar(true);
    expect(g.hayCambios()).toBe(true);
    expect(g.puedeSalir(() => false)).toBe(false);
    expect(g.puedeSalir(() => true)).toBe(true);
  });
  it('al confirmar la salida o marcar sin cambios, deja de preguntar', () => {
    const g = crearGuardian();
    g.marcar(true);
    g.puedeSalir(() => true);
    expect(g.hayCambios()).toBe(false);
    g.marcar(true);
    g.marcar(false);
    expect(g.puedeSalir(() => false)).toBe(true);
  });
});
