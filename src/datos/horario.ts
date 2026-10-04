import { stringify } from 'yaml';
import { isHora, isISODate, type ISODate } from '../fechas.ts';
import { RUTA_HORARIO, RUTA_HORARIO_AJUSTES } from './rutas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

// Una clase del horario de la URJC (estudios/horario.yaml, lo escribe solo el workflow de la uni).
export interface Clase {
  fecha: ISODate;
  inicio: string; // HH:MM
  fin: string;
  asignatura: string; // id de estudios/asignaturas.yaml
  aula?: string;
  profesor?: string;
  desdoble?: string; // G1, G2… (las clases de un desdoble)
}

// Cambios a mano (estudios/horario-ajustes.yaml): una clase que no hay y clases añadidas.
export interface Quitada {
  fecha: ISODate;
  inicio: string;
  asignatura: string;
}

export interface Suelta {
  fecha: ISODate;
  inicio: string;
  fin: string;
  asignatura: string;
  aula?: string;
  nota?: string;
}

export interface AjustesHorario {
  grupo?: string; // agrupación de la URJC, p. ej. G_ROBOT_1A(F)
  curso?: number;
  desdoble?: string; // de los grupos G1/G2… solo se queda este
  quitadas: Quitada[];
  sueltas: Suelta[];
}

export const AJUSTES_VACIOS: AjustesHorario = { quitadas: [], sueltas: [] };

type Objeto = Record<string, unknown>;

function raiz(texto: string | null, ruta: string): Objeto {
  if (texto === null) return {};
  const datos = leerYaml(texto, ruta);
  if (datos === null || datos === undefined) return {};
  if (typeof datos !== 'object' || Array.isArray(datos)) throw new ErrorDatos(ruta, 'el archivo tiene un formato desconocido');
  return datos as Objeto;
}

function lista(datos: Objeto, clave: string, ruta: string): Objeto[] {
  const l = datos[clave];
  if (l === undefined || l === null) return [];
  if (!Array.isArray(l)) throw new ErrorDatos(ruta, `${clave} debe ser una lista`);
  return l.map((x) => (typeof x === 'object' && x !== null ? x : {}) as Objeto);
}

function texto(o: Objeto, campo: string, ruta: string, donde: string): string | undefined {
  const v = o[campo];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ErrorDatos(ruta, `${donde}: ${campo} debe ser texto`);
  return v;
}

function comun(o: Objeto, ruta: string, donde: string, conFin: boolean): { fecha: ISODate; inicio: string; fin: string; asignatura: string } {
  if (!isISODate(o.fecha)) throw new ErrorDatos(ruta, `${donde}: fecha debe tener el formato AAAA-MM-DD`);
  if (!isHora(o.inicio)) throw new ErrorDatos(ruta, `${donde}: inicio debe ser una hora HH:MM, como "09:00"`);
  if (conFin && !isHora(o.fin)) throw new ErrorDatos(ruta, `${donde}: fin debe ser una hora HH:MM, como "11:00"`);
  if (typeof o.asignatura !== 'string' || !o.asignatura) throw new ErrorDatos(ruta, `${donde}: falta asignatura`);
  return { fecha: o.fecha, inicio: o.inicio, fin: conFin ? (o.fin as string) : '', asignatura: o.asignatura };
}

const opcional = <T>(clave: string, v: T | undefined) => (v === undefined ? {} : { [clave]: v });

export function parseHorario(t: string | null): Clase[] {
  return lista(raiz(t, RUTA_HORARIO), 'clases', RUTA_HORARIO).map((o, i) => {
    const donde = `clase ${i + 1}`;
    return {
      ...comun(o, RUTA_HORARIO, donde, true),
      ...opcional('aula', texto(o, 'aula', RUTA_HORARIO, donde)),
      ...opcional('profesor', texto(o, 'profesor', RUTA_HORARIO, donde)),
      ...opcional('desdoble', texto(o, 'desdoble', RUTA_HORARIO, donde)),
    };
  });
}

export function serializarHorario(clases: Clase[]): string {
  return stringify({ clases }, { lineWidth: 0 });
}

export function parseAjustesHorario(t: string | null): AjustesHorario {
  const r = RUTA_HORARIO_AJUSTES;
  const datos = raiz(t, r);
  const grupo = texto(datos, 'grupo', r, 'ajustes');
  const desdoble = texto(datos, 'desdoble', r, 'ajustes');
  if (desdoble !== undefined && !/^G\d+$/.test(desdoble)) throw new ErrorDatos(r, 'desdoble debe ser como "G2"');
  const curso = datos.curso;
  if (curso !== undefined && curso !== null && (typeof curso !== 'number' || !Number.isInteger(curso) || curso < 1))
    throw new ErrorDatos(r, 'curso debe ser un número, como 1');
  const quitadas = lista(datos, 'quitadas', r).map((o, i) => {
    const { fecha, inicio, asignatura } = comun(o, r, `quitada ${i + 1}`, false);
    return { fecha, inicio, asignatura };
  });
  const sueltas = lista(datos, 'sueltas', r).map((o, i) => {
    const donde = `suelta ${i + 1}`;
    return { ...comun(o, r, donde, true), ...opcional('aula', texto(o, 'aula', r, donde)), ...opcional('nota', texto(o, 'nota', r, donde)) };
  });
  return {
    ...opcional('grupo', grupo),
    ...(typeof curso === 'number' ? { curso } : {}),
    ...opcional('desdoble', desdoble),
    quitadas,
    sueltas,
  };
}

export function serializarAjustesHorario(a: AjustesHorario): string {
  return stringify({
    ...opcional('grupo', a.grupo),
    ...opcional('curso', a.curso),
    ...opcional('desdoble', a.desdoble),
    ...(a.quitadas.length ? { quitadas: a.quitadas } : {}),
    ...(a.sueltas.length ? { sueltas: a.sueltas } : {}),
  }, { lineWidth: 0 });
}
