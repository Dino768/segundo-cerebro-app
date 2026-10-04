import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EstadoAula } from '../../src/uni/aula/estado.ts';
import { enMadrid } from '../../src/uni/hora.ts';
import { ErrorFormato } from '../../src/uni/tipos.ts';

export const HORAS_ENTRE_REVISIONES = 20;

// Las horas van en hora de Madrid como texto «AAAA-MM-DDTHH:MM»: se comparan como si fueran UTC (la diferencia sale igual).
const minutos = (t: string) => Date.parse(`${t}:00Z`) / 60_000;
export function tocaRevisar(ultima: string | undefined, ahora: Date): boolean {
  if (!ultima || Number.isNaN(minutos(ultima))) return true;
  const { fecha, hora } = enMadrid(ahora);
  return minutos(`${fecha}T${hora}`) - minutos(ultima) >= HORAS_ENTRE_REVISIONES * 60;
}

export interface Aula {
  estado(): Promise<{ activo: boolean; revisando: boolean; estado: EstadoAula }>;
  activar(activo: boolean): Promise<void>;
  revisarAhora(): Promise<void>; // no espera a que acabe
  entrar(): Promise<boolean>;
  comprobar(): Promise<void>; // la llama el temporizador cada hora
  ocupado(): boolean;
}

export function crearAula(o: { config: string; leerEstado(): Promise<EstadoAula>; revisar(): Promise<unknown>; entrar(): Promise<boolean>; ahora(): Date }): Aula {
  let revisando = false;
  const leerActivo = async () => {
    try {
      return JSON.parse(await readFile(o.config, 'utf8')).activo === true;
    } catch {
      return false;
    }
  };
  const lanzar = () => {
    if (revisando) return;
    revisando = true;
    // Los errores del navegador pueden llevar URLs con la sesión: solo se escribe su nombre (o el mensaje si es de formato).
    void Promise.resolve()
      .then(() => o.revisar())
      .catch((e) => console.error(`Aula virtual: ${e instanceof ErrorFormato ? e.message : e instanceof Error ? e.name : 'Error'}`))
      .finally(() => (revisando = false));
  };
  return {
    estado: async () => ({ activo: await leerActivo(), revisando, estado: await o.leerEstado().catch(() => ({})) }),
    async activar(activo) {
      await mkdir(path.dirname(o.config), { recursive: true });
      await writeFile(o.config, JSON.stringify({ activo }));
    },
    async revisarAhora() {
      lanzar();
    },
    entrar: () => o.entrar(),
    async comprobar() {
      if (revisando || !(await leerActivo())) return;
      if (tocaRevisar((await o.leerEstado().catch(() => ({}) as EstadoAula)).ultimaRevision, o.ahora())) lanzar();
    },
    ocupado: () => revisando,
  };
}
