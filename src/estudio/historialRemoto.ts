import type { ISODate } from '../fechas';
import { actualizarArchivo, ErrorGitHub, escribirBase64, leerArchivo, leerBinario, listarCarpeta, type Config } from '../github/cliente';
import {
  carpetaHistorial, entradaDeArchivo, imagenesDe, nombreHistorial, ordenarHistorial, paraHistorial, type EntradaHistorial,
} from './historial';
import { serializarPizarra, validarPizarra, type Pizarra } from './pizarra';

export async function listarHistorial(cfg: Config, asignatura: string): Promise<EntradaHistorial[]> {
  const nombres = await listarCarpeta(cfg, carpetaHistorial(asignatura));
  return ordenarHistorial(nombres.map(entradaDeArchivo).filter((e): e is EntradaHistorial => e !== null));
}

export async function leerDeHistorial(cfg: Config, asignatura: string, archivo: string): Promise<Pizarra> {
  const { texto } = await leerArchivo(cfg, `${carpetaHistorial(asignatura)}/${archivo}`);
  return validarPizarra(JSON.parse(texto)).pizarra;
}

// Devuelve una función que da la URL de una imagen del historial (se descarga una vez).
export function imagenDeHistorial(cfg: Config, asignatura: string): (ruta: string) => Promise<string> {
  const urls = new Map<string, Promise<string>>();
  return (ruta) => {
    if (!urls.has(ruta)) urls.set(ruta, leerBinario(cfg, `${carpetaHistorial(asignatura)}/${ruta}`).then((b) => URL.createObjectURL(b)));
    return urls.get(ruta)!;
  };
}

// Sube la pizarra (y sus imágenes) al historial. Si ya se guardó antes, actualiza el mismo archivo.
export async function subirAlHistorial(
  cfg: Config, asignatura: string, p: Pizarra, titulo: string, hoy: ISODate, leerImagen: (ruta: string) => Promise<string>,
): Promise<string> {
  const carpeta = carpetaHistorial(asignatura);
  const archivo = p.guardadaEn?.startsWith(`${carpeta}/`)
    ? p.guardadaEn.slice(carpeta.length + 1)
    : nombreHistorial(hoy, titulo, await listarCarpeta(cfg, carpeta));
  for (const ruta of imagenesDe(p)) {
    try {
      await escribirBase64(cfg, `${carpeta}/${ruta}`, await leerImagen(ruta), null, `Imagen del historial: ${ruta}`);
    } catch (e) {
      // Ya estaba subida (GitHub no deja crear dos veces el mismo archivo sin su sha).
      if (!(e instanceof ErrorGitHub && e.tipo === 'conflicto')) throw e;
    }
  }
  const destino = `${carpeta}/${archivo}`;
  await actualizarArchivo(cfg, destino, () => serializarPizarra(paraHistorial(p, titulo)), `Pizarra al historial: ${titulo}`);
  return destino;
}
