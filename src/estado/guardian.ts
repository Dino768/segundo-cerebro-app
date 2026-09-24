// Recuerda si hay cambios sin guardar (p. ej. en la página de un proyecto)
// para preguntar antes de salir de la pantalla.
export function crearGuardian() {
  let cambios = false;
  return {
    marcar(hay: boolean) {
      cambios = hay;
    },
    hayCambios: () => cambios,
    async puedeSalir(preguntar: () => Promise<boolean>): Promise<boolean> {
      if (!cambios) return true;
      if (!(await preguntar())) return false;
      cambios = false;
      return true;
    },
  };
}

export type Guardian = ReturnType<typeof crearGuardian>;
