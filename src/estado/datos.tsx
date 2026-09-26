import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { idsDeArea, quitarArea, ErrorArea } from '../agenda/areas';
import { ErrorIdeaCambiada } from '../agenda/ideas';
import type { Area } from '../datos/areas';
import type { Asignatura } from '../datos/asignaturas';
import type { Idea } from '../datos/ideas';
import { parseProyecto, serializarProyecto, type Proyecto } from '../datos/proyectos';
import { RUTA_AREAS, RUTA_ASIGNATURAS, RUTA_IDEAS, RUTA_TAREAS } from '../datos/rutas';
import type { Tarea } from '../datos/tareas';
import { ErrorDatos } from '../datos/yaml';
import { ErrorGitHub, type Config } from '../github/cliente';
import {
  borrarProyecto as borrarProyectoRemoto, cargarAgenda, cargarTodo, guardarProyecto as guardarProyectoRemoto, listarIdsProyectos, migrarBandeja, modificarAreas, modificarAsignaturas, modificarIdeas, modificarTareas, moverYBorrarArea, type Datos,
} from '../repositorio';
import { borrarCache, guardarCache, leerCache } from './cache';
import { crearCola } from './cola';
import { crearOptimista } from './optimista';
import { borrarConfig, guardarConfig, leerConfig } from './config';

export type EstadoConexion = 'sin-config' | 'cargando' | 'listo' | 'sin-conexion' | 'error-token';

export interface ValorDatos {
  estado: EstadoConexion;
  datos: Datos;
  config: Config | null;
  aviso: string | null;
  soloLectura: boolean;
  tareasBloqueadas: boolean;
  ideasBloqueadas: boolean;
  areasBloqueadas: boolean;
  cerrarAviso(): void;
  recargar(): Promise<void>;
  conectar(c: Config): void;
  desconectar(): void;
  cambiarTareas(cambio: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>;
  cambiarTareasAlInstante(cambio: (ts: Tarea[]) => Tarea[], deshacer: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>;
  cambiarIdeas(cambio: (is: Idea[]) => Idea[], mensaje: string): Promise<boolean>;
  guardarProyecto(p: Proyecto, original: Proyecto | null): Promise<boolean>;
  borrarProyecto(p: Proyecto): Promise<boolean>;
  idsProyectos(): Promise<string[]>;
  cambiarAsignaturas(cambio: (l: Asignatura[]) => Asignatura[], mensaje: string): Promise<boolean>;
  cambiarAreas(cambio: (as: Area[]) => Area[], mensaje: string): Promise<boolean>;
  borrarArea(id: string, destino: string | null): Promise<boolean>;
}

const VACIO: Datos = { tareas: [], areas: [], proyectos: [], ideas: [], asignaturas: [], errores: [] };
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

  // Aplica al estado una agenda recién leída (tareas, áreas, ideas y asignaturas), sin tocar los proyectos.
  const aplicarAgenda = useCallback((agenda: { tareas: Tarea[]; areas: Area[]; ideas: Idea[]; asignaturas: Asignatura[]; errores: ErrorDatos[] }) => {
    setDatos((d) => ({
      ...d,
      tareas: agenda.tareas,
      areas: agenda.areas,
      ideas: agenda.ideas,
      asignaturas: agenda.asignaturas,
      errores: [
        ...d.errores.filter((x) => x.archivo !== RUTA_TAREAS && x.archivo !== RUTA_AREAS && x.archivo !== RUTA_ASIGNATURAS && x.archivo !== RUTA_IDEAS),
        ...agenda.errores,
      ],
    }));
  }, []);

  // Si aún existe la bandeja antigua, se pasa a ideas.yaml por detrás. Si falla, se reintenta en la próxima carga.
  const pasarBandeja = useCallback(
    (cfg: Config) =>
      encolar(async () => {
        try {
          const ideas = await migrarBandeja(cfg);
          if (!ideas) return;
          // Se recarga la agenda para que los ids mostrados coincidan con los que quedaron en el archivo
          // (evita una rara carrera de ids si algo más escribió ideas.yaml justo mientras se pasaba la bandeja).
          const { bandejaPendiente: _bp, ...agenda } = await cargarAgenda(cfg);
          aplicarAgenda(agenda);
        } catch {
          // sin conexión, conflicto o archivo roto: se deja para la próxima vez, sin molestar
        }
      }),
    [encolar, aplicarAgenda],
  );

  const recargar = useCallback(async () => {
    if (!config) {
      setEstado('sin-config');
      return;
    }
    setEstado('cargando');
    try {
      const { bandejaPendiente, ...d } = await cargarTodo(config);
      setDatos(d);
      setEstado('listo');
      if (bandejaPendiente) void pasarBandeja(config);
    } catch (e) {
      alFallar(e, true);
    }
  }, [config, alFallar, pasarBandeja]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (estado === 'listo') guardarCache(datos);
  }, [datos, estado]);

  // Trae tareas, áreas e ideas (no proyectos: refrescarlos borraría el texto de una página abierta).
  const traerAgenda = useCallback(async (cfg: Config) => {
    const { bandejaPendiente, ...agenda } = await cargarAgenda(cfg);
    aplicarAgenda(agenda);
    if (bandejaPendiente) void pasarBandeja(cfg);
  }, [aplicarAgenda, pasarBandeja]);

  // Al volver a la app (cambiar de pestaña, desbloquear el móvil) trae lo que haya cambiado Claude u otro dispositivo.
  useEffect(() => {
    if (!config) return;
    const alVolver = () => {
      if (document.visibilityState !== 'visible' || estadoActual.current !== 'listo') return;
      void encolar(async () => {
        try {
          await traerAgenda(config);
        } catch (e) {
          // Sin conexión u otro fallo pasajero: se sigue con lo que hay, sin molestar.
          if (e instanceof ErrorGitHub && e.tipo === 'token') setEstado('error-token');
        }
      });
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [config, encolar, traerAgenda]);

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

  const [optimista] = useState(() => crearOptimista<Tarea[]>((f) => setDatos((d) => ({ ...d, tareas: f(d.tareas) }))));
  const cambiarTareasAlInstante = useCallback(
    (cambio: (ts: Tarea[]) => Tarea[], deshacer: (ts: Tarea[]) => Tarea[], mensaje: string) => {
      if (!config) return Promise.resolve(false);
      return optimista.cambiar(
        cambio,
        deshacer,
        () => encolar(() => modificarTareas(config, cambio, mensaje)),
        (e) => {
          alFallar(e, false);
          setAviso((a) => `${a ?? 'No se ha podido guardar.'} Se ha deshecho «${mensaje}».`);
        },
      );
    },
    [config, alFallar, encolar, optimista],
  );

  const cambiarIdeas = useCallback(
    (cambio: (is: Idea[]) => Idea[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const ideas = await modificarIdeas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, ideas, errores: d.errores.filter((x) => x.archivo !== RUTA_IDEAS) }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          // La idea cambió (quizá la movió Claude): se recargan las ideas para ver cómo están ahora.
          if (e instanceof ErrorIdeaCambiada) await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda],
  );

  const cambiarAsignaturas = useCallback(
    (cambio: (l: Asignatura[]) => Asignatura[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const asignaturas = await modificarAsignaturas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, asignaturas, errores: d.errores.filter((x) => x.archivo !== RUTA_ASIGNATURAS) }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          return false;
        }
      }),
    [config, alFallar, encolar],
  );

  const cambiarAreas = useCallback(
    (cambio: (as: Area[]) => Area[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const areas = await modificarAreas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, areas, errores: d.errores.filter((x) => x.archivo !== RUTA_AREAS) }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          if (e instanceof ErrorArea) await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda],
  );

  const borrarArea = useCallback(
    (id: string, destino: string | null) =>
      encolar(async () => {
        if (!config) return false;
        try {
          if (destino === null) {
            const areas = await modificarAreas(config, (as) => quitarArea(as, id), `Borrar área ${id}`);
            setDatos((d) => ({ ...d, areas }));
            setEstado('listo');
            return true;
          }
          const ids = idsDeArea(datos.areas, id);
          const afectados = datos.proyectos.filter((p) => p.area && ids.includes(p.area)).map((p) => p.id);
          const r = await moverYBorrarArea(config, id, destino, afectados);
          setDatos((d) => ({
            ...d,
            areas: r.areas,
            tareas: r.tareas,
            ideas: r.ideas,
            proyectos: d.proyectos.map((p) => r.proyectos.find((x) => x.id === p.id) ?? p),
          }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda, datos.areas, datos.proyectos],
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

  // En la cola, para no pisarse con un cambio de tareas o ideas que esté a medias.
  const borrarProyecto = useCallback(
    (p: Proyecto) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const r = await borrarProyectoRemoto(config, p);
          setDatos((d) => ({ ...d, tareas: r.tareas, ideas: r.ideas, proyectos: d.proyectos.filter((x) => x.id !== p.id) }));
          return true;
        } catch (e) {
          alFallar(e, false);
          return false;
        }
      }),
    [config, alFallar, encolar],
  );

  // Ids de proyectos que hay en GitHub ahora mismo (puede haber alguno nuevo de Claude sin refrescar).
  const idsProyectos = useCallback(async () => {
    const locales = datos.proyectos.map((p) => p.id);
    if (!config) return locales;
    const remotos = await listarIdsProyectos(config).catch(() => [] as string[]);
    return [...new Set([...locales, ...remotos])];
  }, [config, datos.proyectos]);

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
      ideasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_IDEAS),
      areasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_AREAS),
      cerrarAviso: () => setAviso(null),
      recargar,
      conectar,
      desconectar,
      cambiarTareas,
      cambiarTareasAlInstante,
      cambiarIdeas,
      guardarProyecto,
      borrarProyecto,
      idsProyectos,
      cambiarAsignaturas,
      cambiarAreas,
      borrarArea,
    }),
    [estado, datos, config, aviso, recargar, conectar, desconectar, cambiarTareas, cambiarTareasAlInstante, cambiarIdeas, guardarProyecto, borrarProyecto, idsProyectos, cambiarAsignaturas, cambiarAreas, borrarArea],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos(): ValorDatos {
  const v = useContext(Contexto);
  if (!v) throw new Error('useDatos se usó fuera de ProveedorDatos');
  return v;
}
