import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
export interface Git {
  limpio(): Promise<boolean>;
  traer(): Promise<void>;
  subir(archivos: string[], mensaje: string): Promise<'ok' | 'rechazado'>;
  volverAlRemoto(): Promise<void>;
}

export function crearGit(carpeta: string): Git {
  const git = (...args: string[]) => ejecutar('git', args, { cwd: carpeta, windowsHide: true });
  const arbolLimpio = async () => (await git('status', '--porcelain', '--untracked-files=no')).stdout.trim() === '';
  // Limpio = sin cambios y sin commits propios sin subir (el programa nunca trabaja encima de lo de Diego).
  const limpio = async () => {
    if (!(await arbolLimpio())) return false;
    try {
      return Number((await git('rev-list', '--count', '@{u}..HEAD')).stdout.trim()) === 0;
    } catch {
      return false; // sin rama remota: mejor no tocar nada
    }
  };
  return {
    limpio,
    traer: async () => void (await git('pull', '--rebase', '--quiet')),
    async subir(archivos, mensaje) {
      await git('add', '--', ...archivos);
      try {
        await git('diff', '--cached', '--quiet');
        return 'ok'; // nada que subir
      } catch {
        // hay cambios preparados
      }
      await git('commit', '--quiet', '-m', mensaje);
      try {
        await git('push', '--quiet');
        return 'ok';
      } catch {
        return 'rechazado';
      }
    },
    // Solo deshace el commit del propio programa (asunto «Aula virtual: ...»); si HEAD es de otra persona, no toca nada.
    async volverAlRemoto() {
      const cambiado = 'my-context ha cambiado mientras revisaba: lo intento más tarde';
      if (!(await arbolLimpio())) throw new Error(cambiado);
      const asunto = (await git('log', '-1', '--format=%s')).stdout.trim();
      if (!asunto.startsWith('Aula virtual:')) throw new Error(cambiado);
      await git('reset', '--hard', '--quiet', 'HEAD~1');
      await git('pull', '--rebase', '--quiet');
    },
  };
}
