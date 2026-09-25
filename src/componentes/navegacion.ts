import type { ISODate } from '../fechas';

export type Pantalla = 'inicio' | 'calendario' | 'tareas' | 'proyectos' | 'ideas' | 'estudio' | 'ajustes';

export type Pestana = 'proyectos' | 'ideas';

// A dónde ir: una pantalla y, si hace falta, el día del calendario o el proyecto que abrir.
export interface Destino {
  pantalla: Pantalla;
  dia?: ISODate;
  proyecto?: string;
}

export const SECCIONES: { id: Pantalla; nombre: string; icono: string }[] = [
  { id: 'inicio', nombre: 'Inicio', icono: '🏠' },
  { id: 'calendario', nombre: 'Calendario', icono: '📅' },
  { id: 'tareas', nombre: 'Tareas', icono: '✅' },
  { id: 'proyectos', nombre: 'Proyectos', icono: '📁' },
  { id: 'ideas', nombre: 'Ideas', icono: '💡' },
  { id: 'estudio', nombre: 'Estudio', icono: '📚' },
  { id: 'ajustes', nombre: 'Ajustes', icono: '⚙️' },
];

export const URL_USO_CLAUDE = 'https://claude.ai/settings/usage';
