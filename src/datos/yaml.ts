import { parse, YAMLParseError } from 'yaml';

export class ErrorDatos extends Error {
  readonly archivo: string;
  readonly linea?: number;

  constructor(archivo: string, mensaje: string, linea?: number) {
    super(mensaje);
    this.name = 'ErrorDatos';
    this.archivo = archivo;
    this.linea = linea;
  }
}

export function leerYaml(texto: string, archivo: string): unknown {
  try {
    return parse(texto);
  } catch (e) {
    if (e instanceof YAMLParseError) {
      const linea = e.linePos?.[0]?.line;
      throw new ErrorDatos(archivo, `YAML mal escrito${linea ? ` en la línea ${linea}` : ''}: ${e.message}`, linea);
    }
    throw e;
  }
}

export function quitarNulos(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));
}
