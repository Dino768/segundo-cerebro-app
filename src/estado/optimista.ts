// Guardado optimista: el cambio se ve al momento y se guarda por detrás.
// Si falla, se deshace. Mientras quedan guardados pendientes, no se pisa la lista local
// con la de GitHub (le faltarían los cambios que aún no han llegado).
export interface Optimista<T> {
  cambiar(cambio: (x: T) => T, deshacer: (x: T) => T, guardar: () => Promise<T>, alFallar: (e: unknown) => void): Promise<boolean>;
}

export function crearOptimista<T>(fijar: (f: (x: T) => T) => void): Optimista<T> {
  let pendientes = 0;
  return {
    async cambiar(cambio, deshacer, guardar, alFallar) {
      fijar(cambio);
      pendientes++;
      try {
        const remoto = await guardar();
        pendientes--;
        if (pendientes === 0) fijar(() => remoto);
        return true;
      } catch (e) {
        pendientes--;
        fijar(deshacer);
        alFallar(e);
        return false;
      }
    },
  };
}
