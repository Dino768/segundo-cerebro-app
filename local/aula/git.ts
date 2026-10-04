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
  const limpio = async () => (await git('status', '--porcelain', '--untracked-files=no')).stdout.trim() === '';
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
    // Solo deshace el commit del programa: antes se comprobó que my-context estaba limpio.
    async volverAlRemoto() {
      if (!(await limpio())) throw new Error('my-context ha cambiado mientras revisaba: lo intento más tarde');
      await git('fetch', '--quiet');
      await git('reset', '--hard', '--quiet', '@{u}');
    },
  };
}
