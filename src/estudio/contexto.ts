// Cada mensaje que la app manda a Claude lleva delante una cabecera con la asignatura,
// dónde están las pizarras y las capturas. Al enseñar la conversación, la cabecera se quita.
import type { Zona } from './foto.ts';

const INICIO = '<contexto-estudio>';
const FIN = '</contexto-estudio>';

export interface Contexto {
  asignatura: string;
  carpeta: string;
  pizarraAbierta: number | null;
  imagenes: string[]; // rutas absolutas
  foto?: { ruta: string; zona: Zona } | null;
}

export function conContexto(c: Contexto, texto: string): string {
  const lineas = [
    `Asignatura: ${c.asignatura}`,
    `Pizarras de esta conversación: ${c.carpeta}`,
    `Pizarra abierta: ${c.pizarraAbierta === null ? 'ninguna' : `pizarra-${c.pizarraAbierta}.json`}`,
  ];
  if (c.imagenes.length) lineas.push(`Capturas adjuntas: ${c.imagenes.join(', ')}`);
  if (c.foto) {
    const z = c.foto.zona;
    lineas.push(`Foto de la pizarra: ${c.foto.ruta}`, `Zona de la foto: x ${z.x1}–${z.x2}, y ${z.y1}–${z.y2} (coordenadas de la pizarra)`);
  }
  return `${INICIO}\n${lineas.join('\n')}\n${FIN}\n\n${texto}`;
}

export function sinContexto(texto: string): { texto: string; imagenes: string[] } {
  if (!texto.startsWith(INICIO)) return { texto, imagenes: [] };
  const fin = texto.indexOf(FIN);
  if (fin === -1) return { texto, imagenes: [] };
  const cabecera = texto.slice(INICIO.length, fin);
  const nombre = (r: string) => r.split(/[\\/]/).pop() ?? r;
  const m = /^Capturas adjuntas: (.+)$/m.exec(cabecera);
  const foto = /^Foto de la pizarra: (.+)$/m.exec(cabecera);
  const imagenes = [...(m ? m[1].split(', ').map(nombre) : []), ...(foto ? [nombre(foto[1])] : [])];
  return { texto: texto.slice(fin + FIN.length).replace(/^\n+/, ''), imagenes };
}
