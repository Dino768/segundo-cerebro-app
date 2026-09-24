// Cada mensaje que la app manda a Claude lleva delante una cabecera con la asignatura,
// dónde están las pizarras y las capturas. Al enseñar la conversación, la cabecera se quita.
const INICIO = '<contexto-estudio>';
const FIN = '</contexto-estudio>';

export interface Contexto {
  asignatura: string;
  carpeta: string;
  pizarraAbierta: number | null;
  imagenes: string[]; // rutas absolutas
}

export function conContexto(c: Contexto, texto: string): string {
  const lineas = [
    `Asignatura: ${c.asignatura}`,
    `Pizarras de esta conversación: ${c.carpeta}`,
    `Pizarra abierta: ${c.pizarraAbierta === null ? 'ninguna' : `pizarra-${c.pizarraAbierta}.json`}`,
  ];
  if (c.imagenes.length) lineas.push(`Capturas adjuntas: ${c.imagenes.join(', ')}`);
  return `${INICIO}\n${lineas.join('\n')}\n${FIN}\n\n${texto}`;
}

export function sinContexto(texto: string): { texto: string; imagenes: string[] } {
  if (!texto.startsWith(INICIO)) return { texto, imagenes: [] };
  const fin = texto.indexOf(FIN);
  if (fin === -1) return { texto, imagenes: [] };
  const cabecera = texto.slice(INICIO.length, fin);
  const m = /^Capturas adjuntas: (.+)$/m.exec(cabecera);
  const imagenes = m ? m[1].split(', ').map((r) => r.split(/[\\/]/).pop() ?? r) : [];
  return { texto: texto.slice(fin + FIN.length).replace(/^\n+/, ''), imagenes };
}
