// Ventanas de la app para preguntar algo (en vez de confirm() y prompt() del navegador).
// Cualquier parte del código las pide y espera la respuesta; <Dialogos /> las dibuja de una en una.

export type Dialogo =
  | { tipo: 'confirmar'; mensaje: string; aceptar: string; peligro: boolean }
  | { tipo: 'texto'; mensaje: string; inicial: string; aceptar: string };

type Respuesta = boolean | string | null;

export function crearDialogos() {
  const cola: { dialogo: Dialogo; resolver: (r: Respuesta) => void }[] = [];
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach((o) => o());

  function pedir(dialogo: Dialogo): Promise<Respuesta> {
    return new Promise((resolver) => {
      cola.push({ dialogo, resolver });
      if (cola.length === 1) avisar();
    });
  }

  return {
    actual: (): Dialogo | null => cola[0]?.dialogo ?? null,
    responder(r: Respuesta) {
      const primero = cola.shift();
      if (!primero) return;
      primero.resolver(r);
      avisar();
    },
    suscribir(oyente: () => void) {
      oyentes.add(oyente);
      return () => void oyentes.delete(oyente);
    },
    async confirmar(mensaje: string, o: { aceptar?: string; peligro?: boolean } = {}): Promise<boolean> {
      return (await pedir({ tipo: 'confirmar', mensaje, aceptar: o.aceptar ?? 'Aceptar', peligro: o.peligro ?? false })) === true;
    },
    async pedirTexto(mensaje: string, o: { inicial?: string; aceptar?: string } = {}): Promise<string | null> {
      const r = await pedir({ tipo: 'texto', mensaje, inicial: o.inicial ?? '', aceptar: o.aceptar ?? 'Guardar' });
      return typeof r === 'string' && r.trim() ? r.trim() : null;
    },
  };
}

export type Dialogos = ReturnType<typeof crearDialogos>;

// Las de toda la app.
export const dialogos = crearDialogos();
export const confirmar = dialogos.confirmar;
export const pedirTexto = dialogos.pedirTexto;
