import type { Pizarra } from './pizarra';

export interface PasosGuardado {
  subir(p: Pizarra): Promise<string>; // devuelve la ruta en el historial
  marcar(ruta: string): Promise<boolean>; // apunta en la pizarra en curso que ya está guardada
}

// Sube la pizarra al historial y la marca como guardada.
// Si la subida fue bien pero no se pudo marcar, queda pendiente y se devuelve la ruta:
// el reintento actualiza ese mismo archivo en vez de crear copias -2, -3…
export async function guardarYMarcar(
  p: Pizarra, rutaPrevia: string | null, pasos: PasosGuardado,
): Promise<{ estado: 'hecho' | 'pendiente'; ruta: string | null }> {
  let ruta = rutaPrevia;
  try {
    ruta = await pasos.subir(ruta ? { ...p, guardadaEn: ruta } : p);
  } catch {
    return { estado: 'pendiente', ruta };
  }
  return (await pasos.marcar(ruta)) ? { estado: 'hecho', ruta } : { estado: 'pendiente', ruta };
}
