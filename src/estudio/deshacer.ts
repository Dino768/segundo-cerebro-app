import { CAPA_CLAUDE } from './capas';
import { aplicarOperacion, type Operacion, type Pizarra } from './pizarra';

function devolverPiezas(p: Pizarra, ids: string[]): Operacion | null {
  const fuera = new Set(ids);
  const piezas = p.piezas.filter((x) => fuera.has(x.id));
  if (!piezas.length) return null;
  return { tipo: 'piezas', quitar: [], poner: piezas, flechas: p.flechas.filter((f) => fuera.has(f.de) || fuera.has(f.a)) };
}

// La operación que deshace `op`, calculada sobre la pizarra de antes (`p`). null si no hay nada que deshacer.
export function contraria(p: Pizarra, op: Operacion): Operacion | null {
  switch (op.tipo) {
    case 'mover': {
      const x = p.piezas.find((y) => y.id === op.id);
      return x ? { tipo: 'mover', id: x.id, x: x.x, y: x.y } : null;
    }
    case 'borrar':
      return devolverPiezas(p, [op.id]);
    case 'nota': {
      const objetivo = op.id ?? op.nuevoId;
      const vieja = p.piezas.find((x) => x.id === objetivo && x.tipo === 'nota');
      if (vieja?.tipo === 'nota') return { tipo: 'nota', id: vieja.id, x: vieja.x, y: vieja.y, contenido: vieja.contenido };
      const nueva = aplicarOperacion(p, op).piezas.find((x) => !p.piezas.some((y) => y.id === x.id));
      return nueva ? { tipo: 'borrar', id: nueva.id } : null;
    }
    case 'trazos': {
      const tocados = new Set([...op.quitar, ...op.poner.map((t) => t.id)]);
      return { tipo: 'trazos', quitar: op.poner.map((t) => t.id), poner: p.trazos.filter((t) => tocados.has(t.id)) };
    }
    case 'piezas': {
      const tocadas = new Set([...op.quitar, ...op.poner.map((x) => x.id)]);
      return {
        tipo: 'piezas',
        quitar: op.poner.map((x) => x.id),
        poner: p.piezas.filter((x) => tocadas.has(x.id)),
        flechas: p.flechas.filter((f) => tocadas.has(f.de) || tocadas.has(f.a)),
      };
    }
    case 'capa': {
      const i = p.capas.findIndex((c) => c.id === op.id);
      const capa = p.capas[i];
      switch (op.accion) {
        case 'crear':
          return i >= 0 ? null : { tipo: 'capa', accion: 'borrar', id: op.id };
        case 'renombrar':
          return capa ? { tipo: 'capa', accion: 'renombrar', id: op.id, nombre: capa.nombre } : null;
        case 'ordenar':
          return capa ? { tipo: 'capa', accion: 'ordenar', id: op.id, posicion: i } : null;
        case 'borrar': {
          if (!capa || capa.id === CAPA_CLAUDE) return null;
          const piezas = p.piezas.filter((x) => x.capa === op.id);
          const ids = new Set(piezas.map((x) => x.id));
          return {
            tipo: 'lote',
            ops: [
              { tipo: 'capa', accion: 'crear', id: capa.id, nombre: capa.nombre, posicion: i },
              { tipo: 'piezas', quitar: [], poner: piezas, flechas: p.flechas.filter((f) => ids.has(f.de) || ids.has(f.a)) },
              { tipo: 'trazos', quitar: [], poner: p.trazos.filter((t) => t.capa === op.id) },
            ],
          };
        }
      }
      return null;
    }
    case 'lote': {
      const pasos: Operacion[] = [];
      let actual = p;
      for (const o of op.ops) {
        const c = contraria(actual, o);
        if (c) pasos.unshift(c);
        actual = aplicarOperacion(actual, o);
      }
      return { tipo: 'lote', ops: pasos };
    }
    case 'guardada':
    case 'fusionar':
      return null;
  }
}

const LIMITE = 100;

export interface Pila {
  hechas: { op: Operacion; contraria: Operacion }[];
  deshechas: Operacion[];
}

export const pilaVacia = (): Pila => ({ hechas: [], deshechas: [] });

// Apunta una operación de Diego (antes de aplicarla sobre `p`). Lo que se podía rehacer se pierde.
export function registrar(pila: Pila, p: Pizarra, op: Operacion): Pila {
  const c = contraria(p, op);
  if (!c) return pila;
  return { hechas: [...pila.hechas, { op, contraria: c }].slice(-LIMITE), deshechas: [] };
}

export function deshacer(pila: Pila): { pila: Pila; op: Operacion } | null {
  const ultimo = pila.hechas.at(-1);
  if (!ultimo) return null;
  return { op: ultimo.contraria, pila: { hechas: pila.hechas.slice(0, -1), deshechas: [...pila.deshechas, ultimo.op] } };
}

export function rehacer(pila: Pila, p: Pizarra): { pila: Pila; op: Operacion } | null {
  const op = pila.deshechas.at(-1);
  if (!op) return null;
  const c = contraria(p, op);
  return { op, pila: { hechas: c ? [...pila.hechas, { op, contraria: c }] : pila.hechas, deshechas: pila.deshechas.slice(0, -1) } };
}
