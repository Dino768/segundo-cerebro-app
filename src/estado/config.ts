import type { Config } from '../github/cliente';

const CLAVE = 'sc-config';

export function leerConfig(): Config | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Config | null;
    return c && c.owner && c.repo && c.token ? c : null;
  } catch {
    return null;
  }
}

export function guardarConfig(c: Config): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    // navegador sin almacenamiento: la llave solo dura esta sesión
  }
}

export function borrarConfig(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
