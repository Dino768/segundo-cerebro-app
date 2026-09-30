import { useState } from 'react';

// Qué desplegables dejó abiertos Diego en este dispositivo (spec §4, «Por áreas»).
export function useDesplegables(clave: string): [Set<string>, (id: string, abierto: boolean) => void] {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave) ?? '[]') as unknown;
      return new Set(Array.isArray(guardado) ? guardado.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  });
  const fijar = (id: string, abierto: boolean) =>
    setAbiertos((prev) => {
      if (prev.has(id) === abierto) return prev;
      const nuevo = new Set(prev);
      if (abierto) nuevo.add(id);
      else nuevo.delete(id);
      try {
        localStorage.setItem(clave, JSON.stringify([...nuevo]));
      } catch {
        /* sin almacenamiento */
      }
      return nuevo;
    });
  return [abiertos, fijar];
}
