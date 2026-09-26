import type { Operacion, Pizarra } from './pizarra';

export type EstadoCola = 'al-dia' | 'guardando' | 'pendiente';

export interface OpcionesCola {
  subir(ops: Operacion[]): Promise<Pizarra>; // las aplica sobre la versión más nueva y devuelve el resultado
  alSubir(p: Pizarra, quedan: Operacion[]): void; // `quedan`: lo que se hizo mientras se subía
  alCambiarEstado(e: EstadoCola): void;
  guardarPendientes(ops: Operacion[]): void; // en el navegador, por si se cierra la app sin conexión
  vigente?(): boolean; // false si ya se abrió otra cola para la misma pizarra: entonces esta no toca lo guardado
  espera?: number; // ms sin tocar nada antes de subir
  reintento?: number; // ms antes de reintentar si falló
}

// Junta las operaciones del historial y las sube de una vez (un solo commit) cuando Diego deja de tocar.
export function crearColaHistorial(o: OpcionesCola, iniciales: Operacion[] = []) {
  const espera = o.espera ?? 3000;
  const reintento = o.reintento ?? 15000;
  let cola = [...iniciales];
  let enVuelo: Operacion[] = [];
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let subiendo: Promise<void> | null = null;
  let parado = false;
  let hechas = 0;

  const guardar = () => {
    if (o.vigente?.() ?? true) o.guardarPendientes([...enVuelo, ...cola]);
  };
  const programar = (ms: number) => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = parado ? null : setTimeout(() => void vaciar(), ms);
  };

  async function vaciar(): Promise<void> {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    if (subiendo) {
      await subiendo;
      return cola.length ? vaciar() : undefined;
    }
    if (!cola.length) return;
    enVuelo = cola;
    cola = [];
    o.alCambiarEstado('guardando');
    subiendo = (async () => {
      try {
        const p = await o.subir(enVuelo);
        enVuelo = [];
        hechas++;
        guardar();
        o.alSubir(p, [...cola]);
        o.alCambiarEstado(cola.length ? 'guardando' : 'al-dia');
        if (cola.length) programar(espera);
      } catch {
        cola = [...enVuelo, ...cola];
        enVuelo = [];
        guardar();
        o.alCambiarEstado('pendiente');
        programar(reintento);
      } finally {
        subiendo = null;
      }
    })();
    await subiendo;
  }

  if (cola.length) programar(0);

  return {
    poner(op: Operacion) {
      cola.push(op);
      guardar();
      o.alCambiarEstado('guardando');
      programar(espera);
    },
    vaciar,
    pendientes: () => [...enVuelo, ...cola],
    subidas: () => hechas,
    parar() {
      parado = true;
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
    },
  };
}
