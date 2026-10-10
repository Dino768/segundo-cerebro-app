// Qué hacer con cada chat compartido al comparar este ordenador con GitHub (spec chats compartidos §5.3).
import type { ChatRemoto } from './chatsCompartidos';
import type { Compartidos } from './tipos';

export interface Accion {
  tipo: 'bajar' | 'subir' | 'conflicto' | 'borrar-local' | 'olvidar';
  id: string;
  version?: string; // la de GitHub, en bajar y conflicto
}

// Primero los chats que ya conoce este ordenador y luego los nuevos. `ocupado`: chats en los que Claude está contestando.
export function decidir(compartidos: Compartidos, remotos: ChatRemoto[], ocupado: (id: string) => boolean = () => false): Accion[] {
  const acciones: Accion[] = [];
  const enGitHub = new Map(remotos.map((r) => [r.id, r.version]));
  for (const [id, e] of Object.entries(compartidos)) {
    if (ocupado(id)) continue;
    const remota = enGitHub.get(id);
    if (e.version === '') acciones.push({ tipo: 'subir', id });
    else if (remota === undefined) acciones.push({ tipo: e.pendiente ? 'olvidar' : 'borrar-local', id });
    else if (remota === e.version) {
      if (e.pendiente) acciones.push({ tipo: 'subir', id });
    } else acciones.push({ tipo: e.pendiente ? 'conflicto' : 'bajar', id, version: remota });
  }
  for (const r of remotos) if (!compartidos[r.id] && !ocupado(r.id)) acciones.push({ tipo: 'bajar', id: r.id, version: r.version });
  return acciones;
}
