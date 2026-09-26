import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearColaHistorial, type EstadoCola } from './colaHistorial';
import { pizarraVacia, type Operacion, type Pizarra } from './pizarra';

const op = (n: number): Operacion => ({ tipo: 'mover', id: `p${n}`, x: n, y: 0 });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function montar(subir: (ops: Operacion[]) => Promise<Pizarra>, iniciales: Operacion[] = []) {
  const estados: EstadoCola[] = [];
  const guardadas: Operacion[][] = [];
  const subidas: Operacion[][] = [];
  const cola = crearColaHistorial(
    {
      subir: (ops) => {
        subidas.push(ops);
        return subir(ops);
      },
      alSubir: () => undefined,
      alCambiarEstado: (e) => estados.push(e),
      guardarPendientes: (ops) => guardadas.push(ops),
    },
    iniciales,
  );
  return { cola, estados, guardadas, subidas };
}

describe('cola del historial', () => {
  it('junta lo que se hace seguido y lo sube de una vez a los 3 segundos', async () => {
    const m = montar(async () => pizarraVacia('x'));
    m.cola.poner(op(1));
    await vi.advanceTimersByTimeAsync(2000);
    m.cola.poner(op(2));
    await vi.advanceTimersByTimeAsync(2999);
    expect(m.subidas).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(m.subidas).toEqual([[op(1), op(2)]]);
    expect(m.estados.at(-1)).toBe('al-dia');
    expect(m.guardadas.at(-1)).toEqual([]);
  });
  it('sin conexión queda pendiente, se guarda en el navegador y se reintenta', async () => {
    let falla = true;
    const m = montar(async () => {
      if (falla) throw new Error('sin red');
      return pizarraVacia('x');
    });
    m.cola.poner(op(1));
    await vi.advanceTimersByTimeAsync(3000);
    expect(m.estados.at(-1)).toBe('pendiente');
    expect(m.guardadas.at(-1)).toEqual([op(1)]);
    falla = false;
    await vi.advanceTimersByTimeAsync(15000);
    expect(m.subidas.at(-1)).toEqual([op(1)]);
    expect(m.estados.at(-1)).toBe('al-dia');
  });
  it('lo que quedó pendiente de otra vez se sube al empezar', async () => {
    const m = montar(async () => pizarraVacia('x'), [op(7)]);
    await vi.advanceTimersByTimeAsync(0);
    expect(m.subidas).toEqual([[op(7)]]);
  });
  it('vaciar sube ya, y lo que se hace mientras sube va en la siguiente', async () => {
    let soltar!: () => void;
    const m = montar(() => new Promise((r) => { soltar = () => r(pizarraVacia('x')); }));
    m.cola.poner(op(1));
    const v = m.cola.vaciar();
    m.cola.poner(op(2));
    expect(m.cola.pendientes()).toEqual([op(1), op(2)]);
    soltar();
    await v;
    await vi.advanceTimersByTimeAsync(3000);
    expect(m.subidas).toEqual([[op(1)], [op(2)]]);
  });
  it('parar no programa más reintentos', async () => {
    const m = montar(async () => {
      throw new Error('x');
    });
    m.cola.poner(op(1));
    m.cola.parar();
    await m.cola.vaciar();
    await vi.advanceTimersByTimeAsync(60000);
    expect(m.subidas).toHaveLength(1);
  });
});

describe('varias colas de la misma pizarra', () => {
  it('una cola que ya no vale (se abrió otra) no toca lo guardado en el navegador', async () => {
    let vigente = true;
    const guardadas: Operacion[][] = [];
    const cola = crearColaHistorial({
      subir: async () => pizarraVacia('x'), alSubir: () => undefined, alCambiarEstado: () => undefined,
      guardarPendientes: (ops) => guardadas.push(ops), vigente: () => vigente,
    });
    cola.poner(op(1));
    vigente = false;
    const antes = guardadas.length;
    await cola.vaciar();
    expect(guardadas).toHaveLength(antes);
  });
  it('cuenta las subidas hechas (para no pisar la pantalla con una lectura más vieja)', async () => {
    const m = montar(async () => pizarraVacia('x'));
    expect(m.cola.subidas()).toBe(0);
    m.cola.poner(op(1));
    await m.cola.vaciar();
    expect(m.cola.subidas()).toBe(1);
  });
});
