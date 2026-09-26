import { readFileSync } from 'node:fs';
import path from 'node:path';

// El commit en el que está el código (leyendo .git a mano, sin lanzar git). null si no se puede saber.
export function leerCommit(gitDir: string): string | null {
  try {
    const head = readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head || null;
    const ref = head.slice('ref: '.length);
    try {
      return readFileSync(path.join(gitDir, ref), 'utf8').trim() || null;
    } catch {
      const linea = readFileSync(path.join(gitDir, 'packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(` ${ref}`));
      return linea ? linea.split(' ')[0] : null;
    }
  } catch {
    return null;
  }
}

// Reiniciar (para usar el código nuevo) solo si ha cambiado y Claude no está contestando.
export const debeReiniciar = (inicial: string | null, actual: string | null, ocupado: boolean) =>
  actual !== null && actual !== inicial && !ocupado;

// Código de salida con el que el programa pide que lo vuelvan a arrancar (lo entiende scripts/zona-de-estudio.bat).
export const SALIDA_REINICIAR = 75;
