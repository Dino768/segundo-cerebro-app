import { useEffect, useMemo, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { guardarHistorialCache, guardarPizarraCache, leerHistorialCache, leerPizarraCache } from '../../estado/cacheEstudio';
import { useDatos } from '../../estado/datos';
import { formatoCorto } from '../../fechas';
import type { EntradaHistorial } from '../../estudio/historial';
import { imagenDeHistorial, leerDeHistorial, listarHistorial } from '../../estudio/historialRemoto';
import type { Pizarra as TipoPizarra } from '../../estudio/pizarra';
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

export function VisorHistorial({ asignatura, entrada, alVolver }: { asignatura: Asignatura; entrada: EntradaHistorial; alVolver(): void }) {
  const { config } = useDatos();
  const [pizarra, setPizarra] = useState<TipoPizarra | null>(() => leerPizarraCache(asignatura.id, entrada.archivo));
  const [error, setError] = useState<string | null>(null);
  const imagen = useMemo(
    () => (config ? imagenDeHistorial(config, asignatura.id) : () => Promise.reject(new Error('Sin conexión'))),
    [config, asignatura.id],
  );

  useEffect(() => {
    if (!config) return;
    leerDeHistorial(config, asignatura.id, entrada.archivo).then(
      (p) => {
        setPizarra(p);
        guardarPizarraCache(asignatura.id, entrada.archivo, p);
      },
      (e: Error) => setError(e.message),
    );
  }, [config, asignatura.id, entrada.archivo]);

  return (
    <div className="visor-historial">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">{pizarra?.titulo ?? entrada.titulo}{entrada.fecha ? ` · ${formatoCorto(entrada.fecha)}` : ''}</span>
      </div>
      {error && !pizarra && <p className="banner error">No se ha podido abrir: {error}</p>}
      {pizarra ? <Pizarra pizarra={pizarra} imagen={imagen} clave={`historial-${asignatura.id}-${entrada.archivo}`} origen={`historial:${asignatura.id}`} /> : !error && <p className="cargando">Cargando…</p>}
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
