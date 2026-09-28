import { COLORES } from './herramientas';
import { SIN_FONDO, TAMANOS_LETRA, type Operacion, type Pieza, type TamanoLetra } from './pizarra';

// Cómo se ve un cuadro de texto de Diego (nota): fondo, color y tamaño de letra, alto.
export const PX_LETRA: Record<TamanoLetra, number> = { pequena: 13, normal: 15, grande: 22, enorme: 32 };
export const AMARILLO = { fondo: '#fff4c2', borde: '#ecd98a' }; // las notas de antes, sin estilo
const PAPEL = '#fdfbf6';

// Mezcla dos colores #rrggbb: t = 0 da `a`, t = 1 da `b`.
export function mezclar(a: string, b: string, t: number): string {
  const canal = (c: string, i: number) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(canal(a, i) * (1 - t) + canal(b, i) * t).toString(16).padStart(2, '0')).join('')}`;
}

// Los colores de la paleta, mezclados con el papel para que el texto se lea bien encima.
export const FONDOS = COLORES.map((c) => mezclar(c, PAPEL, 0.8));

export function pasoLetra(t: TamanoLetra | undefined, delta: 1 | -1): TamanoLetra {
  const i = TAMANOS_LETRA.indexOf(t ?? 'normal') + delta;
  return TAMANOS_LETRA[Math.max(0, Math.min(TAMANOS_LETRA.length - 1, i))];
}

export type AspectoNota = Pick<Pieza, 'fondo' | 'colorTexto' | 'tamanoLetra' | 'alto'>;
export const esSinFondo = (a: AspectoNota) => a.fondo === SIN_FONDO;

// Estilo en línea (React) del cuadro. Lo que falta se queda como en el CSS.
export function estiloDeNota(a: AspectoNota): { background: string; borderColor: string; color?: string; fontSize?: number; minHeight?: number } {
  const [background, borderColor] =
    a.fondo === undefined ? [AMARILLO.fondo, AMARILLO.borde] : a.fondo === SIN_FONDO ? ['transparent', 'transparent'] : [a.fondo, mezclar(a.fondo, '#000000', 0.12)];
  return {
    background,
    borderColor,
    ...(a.colorTexto ? { color: a.colorTexto } : {}),
    ...(a.tamanoLetra ? { fontSize: PX_LETRA[a.tamanoLetra] } : {}),
    ...(a.alto ? { minHeight: a.alto } : {}),
  };
}

// El último estilo que eligió Diego: lo usan las notas nuevas (se recuerda en cada dispositivo).
export interface UltimoEstilo { fondo: string; colorTexto: string | null; tamanoLetra: TamanoLetra }
export const ESTILO_INICIAL: UltimoEstilo = { fondo: SIN_FONDO, colorTexto: null, tamanoLetra: 'normal' };
export const CLAVE_ESTILO_NOTA = 'sc-pizarra-estilo-nota';
const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function leerEstiloNota(texto: string | null): UltimoEstilo {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(texto ?? '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    // se queda con lo de por defecto
  }
  return {
    fondo: o.fondo === SIN_FONDO || esHex(o.fondo) ? (o.fondo as string).toLowerCase() : ESTILO_INICIAL.fondo,
    colorTexto: esHex(o.colorTexto) ? o.colorTexto.toLowerCase() : null,
    tamanoLetra: TAMANOS_LETRA.includes(o.tamanoLetra as TamanoLetra) ? (o.tamanoLetra as TamanoLetra) : ESTILO_INICIAL.tamanoLetra,
  };
}

export type CambioEstilo = { fondo?: string; colorTexto?: string | null; tamanoLetra?: TamanoLetra };

export const recordarEstilo = (u: UltimoEstilo, c: CambioEstilo): UltimoEstilo => ({
  fondo: c.fondo ?? u.fondo,
  colorTexto: c.colorTexto !== undefined ? c.colorTexto : u.colorTexto,
  tamanoLetra: c.tamanoLetra ?? u.tamanoLetra,
});

export const aspectoDe = (u: UltimoEstilo): AspectoNota => ({ fondo: u.fondo, tamanoLetra: u.tamanoLetra, ...(u.colorTexto ? { colorTexto: u.colorTexto } : {}) });

export const opEstiloNueva = (id: string, u: UltimoEstilo): Operacion => ({
  tipo: 'estilo', id, fondo: u.fondo, colorTexto: u.colorTexto, tamanoLetra: u.tamanoLetra,
});

const entre = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

// Tamaño nuevo al arrastrar el tirador (dx y dy en unidades de la pizarra). Nunca sale de los límites del formato.
export function redimensionar(ancho: number, alto: number, dx: number, dy: number, soloAncho: boolean): { ancho: number; alto?: number } {
  const r = { ancho: entre(ancho + dx, 40, 2000) };
  return soloAncho ? r : { ...r, alto: entre(alto + dy, 30, 4000) };
}

// Alto aproximado de la barrita con botones de dedo: si no cabe encima de la pieza, sale debajo.
export const HUECO_ARRIBA = 64;
// Ancho de la barrita antes de medir la real (peor caso: nota con todos los botones, en móvil).
export const ANCHO_BARRITA_ESTIMADO = 300;

export interface PosicionBarrita { left: number; top: number; abajo: boolean; menuArriba: boolean }

// Dónde poner la barrita para que no se salga del lienzo (que tiene overflow: hidden): ni por la
// derecha (pieza grande o pegada al borde) ni por la izquierda (pieza que asoma con el lienzo movido).
// `anchoBarrita` es el ancho ya medido de la barrita, o la estimación de arriba mientras no se ha medido.
// Sin medidas del lienzo (aún no montado) no se toca nada, para no mover la barrita a 0,0 por error.
export function posicionBarrita(x: number, y: number, alto: number, anchoLienzo: number, altoLienzo: number, anchoBarrita: number): PosicionBarrita {
  const abajo = y < HUECO_ARRIBA;
  const top = abajo ? y + alto : y;
  const left = anchoLienzo > 0 ? Math.min(Math.max(x, 4), Math.max(4, anchoLienzo - anchoBarrita - 4)) : x;
  return { left, top, abajo, menuArriba: altoLienzo > 0 && top > altoLienzo / 2 };
}

// Ancho del menú de colores (.menu-colores en estilos.css).
export const ANCHO_MENU_COLORES = 212;

// Un menú de colores se abre desde su botón hacia la derecha; si así se saldría del lienzo
// (`xBoton` es el borde izquierdo del botón en píxeles del lienzo), se alinea con el borde derecho del botón.
export function menuAlaDerecha(xBoton: number, anchoLienzo: number): boolean {
  return anchoLienzo > 0 && xBoton + ANCHO_MENU_COLORES + 4 > anchoLienzo;
}
