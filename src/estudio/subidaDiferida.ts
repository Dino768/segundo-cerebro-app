// Junta cambios seguidos en una sola subida (Diego dibujando en la pizarra de un chat compartido).
export function crearSubidaDiferida(subir: () => Promise<void>, ms = 5000) {
  let espera: ReturnType<typeof setTimeout> | undefined;
  let subiendo: Promise<void> | null = null;
  let otraVez = false;

  async function lanzar(): Promise<void> {
    clearTimeout(espera);
    espera = undefined;
    if (subiendo) {
      otraVez = true;
      return subiendo;
    }
    subiendo = subir()
      .catch(() => undefined)
      .finally(() => {
        subiendo = null;
        if (otraVez) {
          otraVez = false;
          espera = setTimeout(() => void lanzar(), ms);
        }
      });
    return subiendo;
  }

  return {
    avisar() {
      if (subiendo) {
        otraVez = true;
        return;
      }
      clearTimeout(espera);
      espera = setTimeout(() => void lanzar(), ms);
    },
    ya: lanzar,
    parar() {
      clearTimeout(espera);
      espera = undefined;
      otraVez = false;
    },
  };
}
