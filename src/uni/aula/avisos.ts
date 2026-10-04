import type { Aviso } from '../../datos/avisos.ts';
import { addDays, type ISODate } from '../../fechas.ts';

export const ID_ENTRAR = 'programa-entrar';
export const DIAS_LEIDOS = 60;

export function anadirAvisos(actuales: Aviso[], nuevos: Aviso[]): Aviso[] {
  const ids = new Set(actuales.map((a) => a.id));
  const deVerdad = nuevos.filter((n) => !ids.has(n.id) && (ids.add(n.id), true));
  return [...deVerdad, ...actuales];
}

export function limpiarAvisos(avisos: Aviso[], hoy: ISODate): Aviso[] {
  const limite = addDays(hoy, -DIAS_LEIDOS);
  return avisos.filter((a) => !(a.leido && a.fecha < limite));
}

export function quitarAviso(avisos: Aviso[], id: string): Aviso[] {
  return avisos.filter((a) => a.id !== id);
}

export function avisoPrograma(avisos: Aviso[], hoy: ISODate, titulo: string, texto: string, asignatura?: string): Aviso {
  const prefijo = `programa-${hoy}-`;
  const usados = avisos.filter((a) => a.id.startsWith(prefijo)).map((a) => Number(a.id.slice(prefijo.length)) || 0);
  const n = Math.max(0, ...usados) + 1;
  return { id: `${prefijo}${n}`, ...(asignatura ? { asignatura } : {}), fecha: hoy, titulo, texto, importante: true, leido: false };
}

export function avisoEntrar(hoy: ISODate): Aviso {
  return {
    id: ID_ENTRAR, fecha: hoy, titulo: 'Vuelve a entrar en el aula virtual', importante: true, leido: false,
    texto: 'La URJC ha cerrado la sesión del aula virtual. En el PC, ve a Ajustes → Aula virtual → «Entrar al aula virtual».',
  };
}
