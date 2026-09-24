import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseProyecto, serializarProyecto, type Proyecto } from '../datos/proyectos';
import { RUTA_AREAS, RUTA_TAREAS } from '../datos/rutas';
import type { Tarea } from '../datos/tareas';
import { ErrorDatos } from '../datos/yaml';
import { ErrorGitHub, type Config } from '../github/cliente';
import { cargarAgenda, cargarTodo, guardarProyecto as guardarProyectoRemoto, modificarTareas, type Datos } from '../repositorio';
import { borrarCache, guardarCache, leerCache } from './cache';
import { crearCola } from './cola';
import { borrarConfig, guardarConfig, leerConfig } from './config';

export type EstadoConexion = 'sin-config' | 'cargando' | 'listo' | 'sin-conexion' | 'error-token';

export interface ValorDatos {
  estado: EstadoConexion;
  datos: Datos;
  config: Config | null;
  aviso: string | null;
  soloLectura: boolean;
  tareasBloqueadas: boolean;
  cerrarAviso(): void;
  recargar(): Promise<void>;
  conectar(c: Config): void;
  desconectar(): void;
  cambiarTareas(cambio: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>;
  guardarProyecto(p: Proyecto, original: Proyecto | null): Promise<boolean>;
}

const VACIO: Datos = { tareas: [], areas: [], proyectos: [], ideas: [], errores: [] };
const Contexto = createContext<ValorDatos | null>(null);

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(() => leerConfig());
  const [estado, setEstado] = useState<EstadoConexion>(() => (leerConfig() ? 'cargando' : 'sin-config'));
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [aviso, setAviso] = useState<string | null>(null);
  // Los cambios de tareas y los refrescos van de uno en uno, para que no se pisen entre ellos.
  const [encolar] = useState(crearCola);
  const estadoActual = useRef(estado);
  estadoActual.current = estado;

  const alFallar = useCallback((e: unknown, alCargar: boolean) => {
    if (e instanceof ErrorGitHub && e.tipo === 'red') {
      if (alCargar) {
        const c = leerCache();
        if (c) setDatos({ ...c, errores: [] });
      } else {
        setAviso('Sin conexión: el cambio no se ha guardado.');
      }
      setEstado('sin-conexion');
      return;
    }
    if (e instanceof ErrorGitHub && e.tipo === 'token') {
      setEstado('error-token');
      return;
    }
    if (e instanceof ErrorDatos)
      setDatos((d) => ({ ...d, errores: [...d.errores.filter((x) => x.archivo !== e.archivo), e] }));
    setAviso(e instanceof Error ? e.message : String(e));
    if (alCargar) setEstado('listo');
  }, []);

  const recargar = useCallback(async () => {
    if (!config) {
      setEstado('sin-config');
      return;
    }
    setEstado('cargando');
    try {
      setDatos(await cargarTodo(config));
      setEstado('listo');
    } catch (e) {
      alFallar(e, true);
    }
  }, [config, alFallar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (estado === 'listo') guardarCache(datos);
  }, [datos, estado]);

  // Al volver a la app (cambiar de pestaña, desbloquear el móvil) trae lo que haya cambiado Claude
  // u otro dispositivo. Solo tareas y áreas: refrescar proyectos borraría el texto de una página abierta.
  useEffect(() => {
    if (!config) return;
    const alVolver = () => {
      if (document.visibilityState !== 'visible' || estadoActual.current !== 'listo') return;
      void encolar(async () => {
        try {
          const agenda = await cargarAgenda(config);
          setDatos((d) => ({
            ...d,
            tareas: agenda.tareas,
            areas: agenda.areas,
            errores: [...d.errores.filter((x) => x.archivo !== RUTA_TAREAS && x.archivo !== RUTA_AREAS), ...agenda.errores],
          }));
        } catch (e) {
          // Sin conexión u otro fallo pasajero: se sigue con lo que hay, sin molestar.
          if (e instanceof ErrorGitHub && e.tipo === 'token') setEstado('error-token');
        }
      });
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [config, encolar]);

  const cambiarTareas = useCallback(
    (cambio: (ts: Tarea[]) => Tarea[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const tareas = await modificarTareas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, tareas, errores: d.errores.filter((x) => x.archivo !== RUTA_TAREAS) }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          return false;
        }
      }),
    [config, alFallar, encolar],
  );

  const guardarProyecto = useCallback(
    async (p: Proyecto, original: Proyecto | null) => {
      if (!config) return false;
      try {
        await guardarProyectoRemoto(config, p, original);
        const guardado = parseProyecto(p.id, serializarProyecto(p));
        setDatos((d) => ({ ...d, proyectos: [...d.proyectos.filter((x) => x.id !== p.id), guardado] }));
        return true;
      } catch (e) {
        alFallar(e, false);
        return false;
      }
    },
    [config, alFallar],
  );

  const conectar = useCallback((c: Config) => {
    guardarConfig(c);
    setConfig(c);
  }, []);

  const desconectar = useCallback(() => {
    borrarConfig();
    borrarCache();
    setConfig(null);
    setDatos(VACIO);
  }, []);

  const valor = useMemo<ValorDatos>(
    () => ({
      estado,
      datos,
      config,
      aviso,
      soloLectura: estado !== 'listo',
      tareasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_TAREAS),
      cerrarAviso: () => setAviso(null),
      recargar,
      conectar,
      desconectar,
      cambiarTareas,
      guardarProyecto,
    }),
    [estado, datos, config, aviso, recargar, conectar, desconectar, cambiarTareas, guardarProyecto],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos(): ValorDatos {
  const v = useContext(Contexto);
  if (!v) throw new Error('useDatos se usó fuera de ProveedorDatos');
  return v;
}
