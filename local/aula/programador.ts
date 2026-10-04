import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EstadoAula, ResultadoRevision } from '../../src/uni/aula/estado.ts';
import { enMadrid } from '../../src/uni/hora.ts';
import { ErrorFormato } from '../../src/uni/tipos.ts';

export const HORAS_ENTRE_REVISIONES = 20;
// Tras una revisión fallida (error o sesión cerrada), el temporizador no vuelve a intentarlo hasta pasadas estas horas.
export const HORAS_TRAS_FALLO = 4;

// Las horas van en hora de Madrid como texto «AAAA-MM-DDTHH:MM»: se comparan como si fueran UTC (la diferencia sale igual).
const minutos = (t: string) => Date.parse(`${t}:00Z`) / 60_000;
export function tocaRevisar(ultima: string | undefined, ahora: Date): boolean {
  if (!ultima || Number.isNaN(minutos(ultima))) return true;
  const { fecha, hora } = enMadrid(ahora);
  return minutos(`${fecha}T${hora}`) - minutos(ultima) >= HORAS_ENTRE_REVISIONES * 60;
}

export interface ResultadoEnMemoria { resultado: ResultadoRevision; mensaje: string; cuando: string }
export interface EstadoProgramador {
  activo: boolean;
  revisando: boolean;
  entrando: boolean;
  estado: EstadoAula;
  // La última revisión de este arranque, si es más nueva que lo guardado en my-context
  // (p. ej. no pudo escribir su estado porque my-context había cambiado).
  ultimoResultado?: ResultadoEnMemoria;
}

export interface Aula {
  estado(): Promise<EstadoProgramador>;
  activar(activo: boolean): Promise<void>;
  revisarAhora(): Promise<void>; // no espera a que acabe
  entrar(): Promise<boolean>; // false si hay una revisión en marcha (usan el mismo perfil de Chrome)
  comprobar(): Promise<void>; // la llama el temporizador cada hora
  ocupado(): boolean;
}

export function crearAula(o: {
  config: string;
  leerEstado(): Promise<EstadoAula>;
  revisar(): Promise<{ resultado: ResultadoRevision; mensaje: string } | void>;
  entrar(): Promise<boolean>;
  ahora(): Date;
}): Aula {
  let revisando = false;
  let entrando = false;
  let ultimo: ResultadoEnMemoria | undefined;
  let esperarHasta = 0; // ms: hasta entonces comprobar() no revisa (tras un fallo)
  const leerActivo = async () => {
    try {
      return JSON.parse(await readFile(o.config, 'utf8')).activo === true;
    } catch {
      return false;
    }
  };
  const lanzar = () => {
    if (revisando || entrando) return;
    revisando = true;
    const inicio = o.ahora();
    const { fecha, hora } = enMadrid(inicio);
    const apuntar = (resultado: ResultadoRevision, mensaje: string) => {
      ultimo = { resultado, mensaje, cuando: `${fecha}T${hora}` };
      esperarHasta = resultado === 'ok' ? 0 : inicio.getTime() + HORAS_TRAS_FALLO * 60 * 60_000;
    };
    // Los errores del navegador pueden llevar URLs con la sesión: solo se escribe su nombre (o el mensaje si es de formato).
    void Promise.resolve()
      .then(() => o.revisar())
      .then((r) => {
        if (r) apuntar(r.resultado, r.mensaje);
      })
      .catch((e) => {
        console.error(`Aula virtual: ${e instanceof ErrorFormato ? e.message : e instanceof Error ? e.name : 'Error'}`);
        apuntar('error', e instanceof ErrorFormato ? e.message : 'error inesperado al revisar el aula virtual');
      })
      .finally(() => (revisando = false));
  };
  return {
    async estado() {
      const estado = await o.leerEstado().catch(() => ({}) as EstadoAula);
      const masNuevo = ultimo && (!estado.ultimaRevision || ultimo.cuando > estado.ultimaRevision);
      return { activo: await leerActivo(), revisando, entrando, estado, ...(masNuevo ? { ultimoResultado: ultimo } : {}) };
    },
    async activar(activo) {
      await mkdir(path.dirname(o.config), { recursive: true });
      await writeFile(o.config, JSON.stringify({ activo }));
    },
    async revisarAhora() {
      lanzar(); // «Revisar ahora» no respeta la espera tras un fallo
    },
    async entrar() {
      if (revisando || entrando) {
        console.log('Aula virtual: espera a que acabe la revisión para entrar');
        return false;
      }
      entrando = true;
      try {
        return await o.entrar();
      } finally {
        entrando = false;
      }
    },
    async comprobar() {
      if (revisando || entrando || o.ahora().getTime() < esperarHasta || !(await leerActivo())) return;
      if (tocaRevisar((await o.leerEstado().catch(() => ({}) as EstadoAula)).ultimaRevision, o.ahora())) lanzar();
    },
    ocupado: () => revisando || entrando,
  };
}
