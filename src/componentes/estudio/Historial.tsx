import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { guardarHistorialCache, guardarOpsPendientes, guardarPizarraCache, leerHistorialCache, leerOpsPendientes, leerPizarraCache } from '../../estado/cacheEstudio';
import { useDatos } from '../../estado/datos';
import { formatoCorto } from '../../fechas';
import { crearColaHistorial, type EstadoCola } from '../../estudio/colaHistorial';
import type { EntradaHistorial } from '../../estudio/historial';
import { imagenDeHistorial, leerDeHistorial, listarHistorial, operarEnHistorial } from '../../estudio/historialRemoto';
import { aplicarOperacion, type Operacion, type Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { Pizarra } from './Pizarra';

export function ListaHistorial({ asignatura, alAbrir }: { asignatura: Asignatura; alAbrir(e: EntradaHistorial): void }) {
  const { config } = useDatos();
  const [lista, setLista] = useState<EntradaHistorial[] | null>(() => leerHistorialCache(asignatura.id));
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    listarHistorial(config, asignatura.id).then(
      (es) => {
        setLista(es);
        guardarHistorialCache(asignatura.id, es);
      },
      () => setAviso('Sin conexión: estás viendo la última lista guardada.'),
    );
  }, [config, asignatura.id]);

  return (
    <div className="lista-historial">
      {aviso && <p className="detalle">{aviso}</p>}
      {!lista && !aviso && <p className="cargando">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Aún no hay pizarras guardadas en {asignatura.nombre}.</p>}
      <ul className="lista">
        {lista?.map((e) => (
          <li key={e.archivo} className="fila-proyecto">
            <button className="titulo-tarea" onClick={() => alAbrir(e)}>{e.titulo}</button>
            {e.fecha && <span className="detalle">{formatoCorto(e.fecha)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TEXTO_COLA: Record<EstadoCola, string> = { 'al-dia': 'Guardado ✓', guardando: 'Guardando…', pendiente: 'Pendiente de subir' };

export function VisorHistorial({ asignatura, entrada, alVolver }: { asignatura: Asignatura; entrada: EntradaHistorial; alVolver(): void }) {
  const { config } = useDatos();
  // Lo guardado en el navegador, más lo dibujado aquí que aún no se había subido.
  const [pizarra, setPizarra] = useState<TipoPizarra | null>(() => {
    const c = leerPizarraCache(asignatura.id, entrada.archivo);
    return c ? leerOpsPendientes(asignatura.id, entrada.archivo).reduce(aplicarOperacion, c) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [estadoCola, setEstadoCola] = useState<EstadoCola>('al-dia');
  const cola = useRef<ReturnType<typeof crearColaHistorial> | null>(null);
  const imagen = useMemo(
    () => (config ? imagenDeHistorial(config, asignatura.id) : () => Promise.reject(new Error('Sin conexión'))),
    [config, asignatura.id],
  );

  // Lo que Diego dibuja aquí se junta y se sube de golpe (3 s sin tocar nada, al salir o al pasar a segundo plano).
  useEffect(() => {
    if (!config) return;
    const c = crearColaHistorial(
      {
        subir: (ops) => operarEnHistorial(config, asignatura.id, entrada.archivo, ops, entrada.titulo),
        alSubir: (p, quedan) => {
          guardarPizarraCache(asignatura.id, entrada.archivo, p);
          setPizarra(quedan.reduce(aplicarOperacion, p));
        },
        alCambiarEstado: setEstadoCola,
        guardarPendientes: (ops) => guardarOpsPendientes(asignatura.id, entrada.archivo, ops),
      },
      leerOpsPendientes(asignatura.id, entrada.archivo),
    );
    cola.current = c;
    const alVolverConexion = () => void c.vaciar();
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void c.vaciar();
    };
    window.addEventListener('online', alVolverConexion);
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      window.removeEventListener('online', alVolverConexion);
      document.removeEventListener('visibilitychange', alOcultar);
      void c.vaciar();
      c.parar();
      cola.current = null;
    };
  }, [config, asignatura.id, entrada.archivo, entrada.titulo]);

  useEffect(() => {
    if (!config) return;
    leerDeHistorial(config, asignatura.id, entrada.archivo).then(
      (p) => {
        guardarPizarraCache(asignatura.id, entrada.archivo, p);
        setPizarra((cola.current?.pendientes() ?? []).reduce(aplicarOperacion, p));
      },
      (e: Error) => setError(e.message),
    );
  }, [config, asignatura.id, entrada.archivo]);

  const operar = useCallback(async (op: Operacion) => {
    setPizarra((p) => (p ? aplicarOperacion(p, op) : p));
    cola.current?.poner(op);
  }, []);

  return (
    <div className="visor-historial">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">{pizarra?.titulo ?? entrada.titulo}{entrada.fecha ? ` · ${formatoCorto(entrada.fecha)}` : ''}</span>
      </div>
      {error && !pizarra && <p className="banner error">No se ha podido abrir: {error}</p>}
      {pizarra ? (
        <Pizarra
          pizarra={pizarra}
          imagen={imagen}
          alOperar={config ? operar : undefined}
          clave={`historial-${asignatura.id}-${entrada.archivo}`}
          origen={`historial:${asignatura.id}`}
        >
          {config && <span className={`detalle estado-cola ${estadoCola}`}>{TEXTO_COLA[estadoCola]}</span>}
        </Pizarra>
      ) : (
        !error && <p className="cargando">Cargando…</p>
      )}
    </div>
  );
}

// Para el móvil y la web: el historial de la asignatura, a pantalla completa.
export function Historial({ asignatura }: { asignatura: Asignatura }) {
  const [abierta, setAbierta] = useState<EntradaHistorial | null>(null);
  return abierta ? (
    <VisorHistorial asignatura={asignatura} entrada={abierta} alVolver={() => setAbierta(null)} />
  ) : (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Pizarras guardadas</h2>
      <ListaHistorial asignatura={asignatura} alAbrir={setAbierta} />
    </section>
  );
}
