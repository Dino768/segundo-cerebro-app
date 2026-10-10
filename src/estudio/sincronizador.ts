// Compartir, subir y bajar chats entre este ordenador y GitHub (spec chats compartidos §5-§6).
// No sabe de React ni de fetch: recibe el programa local y GitHub como dependencias (así se prueba con falsos).
import { ErrorGitHub } from '../github/cliente';
import type { ChatRemoto } from './chatsCompartidos';
import { decidir } from './sincronizarChats';
import type { ArchivoPaquete, Compartidos, EntradaCompartido, InfoChat } from './tipos';

export interface DependenciasSinc {
  local: {
    preparar(asig: string, id: string, compartidoEl: string): Promise<ArchivoPaquete[]>;
    instalar(asig: string, id: string, archivos: ArchivoPaquete[]): Promise<InfoChat | null>;
    copiar(asig: string, id: string, nombre: string): Promise<string>;
    leerCompartidos(asig: string): Promise<Compartidos>;
    poner(asig: string, id: string, e: EntradaCompartido | null): Promise<void>;
    borrar(asig: string, id: string): Promise<void>;
  };
  remoto: {
    listar(asig: string): Promise<ChatRemoto[]>;
    subir(asig: string, id: string, archivos: ArchivoPaquete[], titulo: string): Promise<string>;
    bajar(asig: string, id: string): Promise<ArchivoPaquete[]>;
    quitar(asig: string, id: string, titulo: string): Promise<void>;
  };
  hoy(): string; // AAAA-MM-DD
  avisar(mensaje: string): Promise<void>;
}

export type ResultadoSubida = 'hecho' | 'pendiente' | 'conflicto' | 'olvidado' | 'no-compartido';

// Sin conexión o GitHub fallando: se deja para luego en vez de romper.
const sinRed = (e: unknown) => e instanceof ErrorGitHub && (e.tipo === 'red' || e.tipo === 'otro');

export function crearSincronizador(d: DependenciasSinc) {
  async function bajarEInstalar(asig: string, id: string, version: string, anterior?: EntradaCompartido) {
    const info = await d.local.instalar(asig, id, await d.remoto.bajar(asig, id));
    await d.local.poner(asig, id, { version, pendiente: false, compartidoEl: info?.compartidoEl ?? anterior?.compartidoEl ?? d.hoy() });
  }

  // Usado a la vez en dos sitios: lo de aquí pasa a un chat nuevo y el compartido se queda con lo de GitHub.
  async function conflicto(asig: string, id: string, version: string, titulo: string, e: EntradaCompartido) {
    await d.local.copiar(asig, id, titulo);
    await bajarEInstalar(asig, id, version, e);
    await d.avisar(
      `«${titulo}» se ha usado a la vez en otro dispositivo. Lo que escribiste aquí está en un chat nuevo, «${titulo} (copia…)», y el chat compartido tiene lo del otro dispositivo.`,
    );
  }

  async function subir(asig: string, id: string, titulo: string): Promise<ResultadoSubida> {
    const e = (await d.local.leerCompartidos(asig))[id];
    if (!e) return 'no-compartido';
    const marcada = { ...e, pendiente: true };
    await d.local.poner(asig, id, marcada);
    let remota: ChatRemoto | undefined;
    try {
      remota = (await d.remoto.listar(asig)).find((r) => r.id === id);
    } catch (err) {
      if (sinRed(err)) return 'pendiente';
      throw err;
    }
    if (e.version !== '' && !remota) {
      await d.local.poner(asig, id, null); // lo quitaron en otro dispositivo: sigue aquí como chat normal
      return 'olvidado';
    }
    if (e.version !== '' && remota && remota.version !== e.version) {
      await conflicto(asig, id, remota.version, titulo, marcada);
      return 'conflicto';
    }
    const archivos = await d.local.preparar(asig, id, e.compartidoEl);
    try {
      const version = await d.remoto.subir(asig, id, archivos, titulo);
      await d.local.poner(asig, id, { version, pendiente: false, compartidoEl: e.compartidoEl });
      return 'hecho';
    } catch (err) {
      if (sinRed(err) || (err instanceof ErrorGitHub && err.tipo === 'conflicto')) return 'pendiente';
      throw err;
    }
  }

  return {
    subir,

    async compartir(asig: string, id: string, titulo: string): Promise<ResultadoSubida> {
      await d.local.poner(asig, id, { version: '', pendiente: true, compartidoEl: d.hoy() });
      return subir(asig, id, titulo);
    },

    // Devuelve true si ha cambiado algo en este ordenador (para volver a leer la lista).
    async sincronizar(asig: string, titulos: Record<string, string>, ocupado?: (id: string) => boolean): Promise<boolean> {
      let compartidos: Compartidos;
      let remotos: ChatRemoto[];
      try {
        [compartidos, remotos] = await Promise.all([d.local.leerCompartidos(asig), d.remoto.listar(asig)]);
      } catch (err) {
        if (sinRed(err)) return false;
        throw err;
      }
      const acciones = decidir(compartidos, remotos, ocupado);
      for (const a of acciones) {
        const titulo = titulos[a.id] ?? 'Chat';
        try {
          if (a.tipo === 'bajar') await bajarEInstalar(asig, a.id, a.version!, compartidos[a.id]);
          else if (a.tipo === 'subir') await subir(asig, a.id, titulo);
          else if (a.tipo === 'conflicto') await conflicto(asig, a.id, a.version!, titulo, compartidos[a.id]);
          else if (a.tipo === 'borrar-local') {
            await d.local.borrar(asig, a.id);
            await d.local.poner(asig, a.id, null);
          } else await d.local.poner(asig, a.id, null);
        } catch (err) {
          if (!sinRed(err)) console.warn('chat compartido', a, err); // un chat que falla no para a los demás
        }
      }
      return acciones.length > 0;
    },

    async antesDeEnviar(asig: string, id: string, titulo: string): Promise<'igual' | 'bajado' | 'conflicto'> {
      const e = (await d.local.leerCompartidos(asig))[id];
      if (!e || e.version === '') return 'igual';
      let remota: ChatRemoto | undefined;
      try {
        remota = (await d.remoto.listar(asig)).find((r) => r.id === id);
      } catch (err) {
        if (sinRed(err)) return 'igual';
        throw err;
      }
      if (!remota) {
        await d.local.poner(asig, id, null); // lo quitaron en otro dispositivo: sigue aquí como chat normal
        return 'igual';
      }
      if (remota.version === e.version) return 'igual';
      if (e.pendiente) {
        await conflicto(asig, id, remota.version, titulo, e);
        return 'conflicto';
      }
      await bajarEInstalar(asig, id, remota.version, e);
      return 'bajado';
    },

    async dejarDeCompartir(asig: string, id: string, titulo: string): Promise<void> {
      await d.remoto.quitar(asig, id, titulo);
      await d.local.poner(asig, id, null);
    },

    // Sin red no se toca nada aquí (el error llega al que llama), así no queda borrado a medias.
    async borrarEnTodos(asig: string, id: string, titulo: string): Promise<void> {
      if ((await d.local.leerCompartidos(asig))[id]) await d.remoto.quitar(asig, id, titulo);
      await d.local.borrar(asig, id);
      await d.local.poner(asig, id, null);
    },
  };
}
