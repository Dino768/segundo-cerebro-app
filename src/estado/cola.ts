// Ejecuta las operaciones de una en una, en el orden en que llegan.
// Si una falla, la siguiente se ejecuta igualmente.
export function crearCola() {
  let ultima: Promise<unknown> = Promise.resolve();
  return function encolar<T>(operacion: () => Promise<T>): Promise<T> {
    const resultado = ultima.then(operacion, operacion);
    ultima = resultado.catch(() => undefined);
    return resultado;
  };
}
