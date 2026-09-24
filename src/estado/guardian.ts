// Recuerda si hay cambios sin guardar (p. ej. en la página de un proyecto)
// para preguntar antes de salir de la pantalla.
export function crearGuardian() {
  let cambios = false;
  return {
    marcar(hay: boolean) {
      cambios = hay;
    },
    hayCambios: () => cambios,
    puedeSalir(preguntar: () => boolean): boolean {
      if (!cambios) return true;
      if (!preguntar()) return false;
      cambios = false;
      return true;
    },
  };
}

export type Guardian = ReturnType<typeof crearGuardian>;
