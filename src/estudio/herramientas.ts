// Herramienta, color y grosor elegidos (se recuerdan en cada dispositivo).
export type NombreHerramienta = 'mover' | 'lapiz' | 'subrayador' | 'forma' | 'lazo' | 'borrador' | 'texto';
export type Forma = 'linea' | 'flecha' | 'rectangulo' | 'elipse';
export type Grosor = 'fino' | 'medio' | 'grueso';

export interface EstadoHerramientas {
  herramienta: NombreHerramienta;
  forma: Forma;
  borrador: 'trazos' | 'goma';
  color: string;
  propio: string | null; // el color elegido a mano (el noveno hueco)
  grosor: Grosor;
}

// Combinan con el tema «papel cálido».
export const COLORES = ['#3b3027', '#b8603d', '#b3412e', '#e0b53a', '#4d8b4a', '#3b82f6', '#7c5cc4', '#8b7b6a'] as const;
export const GROSORES: Record<Grosor, number> = { fino: 2, medio: 4, grueso: 8 };
export const INICIALES: EstadoHerramientas = { herramienta: 'mover', forma: 'flecha', borrador: 'trazos', color: COLORES[0], propio: null, grosor: 'medio' };

const NOMBRES: readonly NombreHerramienta[] = ['mover', 'lapiz', 'subrayador', 'forma', 'lazo', 'borrador', 'texto'];
const FORMAS: readonly Forma[] = ['linea', 'flecha', 'rectangulo', 'elipse'];
const TAMANOS: readonly Grosor[] = ['fino', 'medio', 'grueso'];
const esColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export const CLAVE_HERRAMIENTAS = 'sc-pizarra-herramientas';
export const claveOcultas = (clave: string) => `sc-capas-ocultas-${clave}`;

export function leerHerramientas(texto: string | null): EstadoHerramientas {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(texto ?? '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    // se queda con lo de por defecto
  }
  return {
    herramienta: NOMBRES.includes(o.herramienta as NombreHerramienta) ? (o.herramienta as NombreHerramienta) : INICIALES.herramienta,
    forma: FORMAS.includes(o.forma as Forma) ? (o.forma as Forma) : INICIALES.forma,
    borrador: o.borrador === 'goma' ? 'goma' : 'trazos',
    color: esColor(o.color) ? o.color.toLowerCase() : INICIALES.color,
    propio: esColor(o.propio) ? o.propio.toLowerCase() : null,
    grosor: TAMANOS.includes(o.grosor as Grosor) ? (o.grosor as Grosor) : INICIALES.grosor,
  };
}

export function leerOcultas(texto: string | null): string[] {
  try {
    const v: unknown = JSON.parse(texto ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  } catch {
    return [];
  }
}

// Las herramientas que escriben en la capa activa (no valen en la de Claude).
export const dibuja = (h: NombreHerramienta) => h === 'lapiz' || h === 'subrayador' || h === 'forma' || h === 'texto';
