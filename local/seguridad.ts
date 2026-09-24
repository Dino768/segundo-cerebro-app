import path from 'node:path';

// El programa solo atiende a tu propio ordenador: así otra web no puede usar el chat ni leer tus archivos.
export function hostPermitido(host: string | undefined, puerto: number): boolean {
  return host === `127.0.0.1:${puerto}` || host === `localhost:${puerto}`;
}

// El navegador pone Origin cuando otra web hace una petición. Sin Origin es la propia app.
export function origenPermitido(origin: string | undefined, puerto: number): boolean {
  if (origin === undefined) return true;
  return origin === `http://127.0.0.1:${puerto}` || origin === `http://localhost:${puerto}`;
}

// Devuelve la ruta absoluta si queda dentro de `base`; si intenta salir, null.
export function rutaDentro(base: string, relativa: string): string | null {
  const absoluta = path.resolve(base, relativa);
  const rel = path.relative(base, absoluta);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return absoluta;
}

export const esIdAsignatura = (v: string) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(v);
export const esIdConversacion = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export const esNombreImagen = (v: string) => /^[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(v);
