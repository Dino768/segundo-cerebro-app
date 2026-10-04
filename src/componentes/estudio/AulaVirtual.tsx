import { useEffect, useState } from 'react';
import { GENERAL, type Asignatura } from '../../datos/asignaturas';
import type { AulaVirtual as Lista } from '../../datos/aulaVirtual';
import type { Aviso } from '../../datos/avisos';
import { useAvisos } from '../../estado/aula';
import { useDatos } from '../../estado/datos';
import { urlMaterial } from '../../estudio/local';
import { formatoCorto } from '../../fechas';
import { cargarAulaAsignatura } from '../../repositorio';
import { Markdown } from '../Markdown';

type Pestana = 'avisos' | 'materiales' | 'evaluacion';
const ICONO: Record<string, string> = { pdf: '📄', presentacion: '📊', documento: '📝', carpeta: '📁', enlace: '🔗', video: '🎬', otro: '📎' };

export function ListaAvisos({ avisos, asignaturas, marcar }: { avisos: Aviso[]; asignaturas: Asignatura[]; marcar(ids: string[]): void }) {
  if (avisos.length === 0) return <p className="vacio">No hay avisos.</p>;
  const ordenados = [...avisos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const sinLeer = ordenados.filter((a) => !a.leido).map((a) => a.id);
  return (
    <>
      {sinLeer.length > 0 && <button className="enlace" onClick={() => marcar(sinLeer)}>Marcar todos como leídos</button>}
      <ul className="lista avisos">
        {ordenados.map((a) => {
          const asig = asignaturas.find((x) => x.id === a.asignatura);
          return (
            <li key={a.id} className={['aviso-uni', a.importante && 'importante', a.leido && 'leido'].filter(Boolean).join(' ')}>
              <div className="aviso-cabecera">
                {a.importante && <span className="etiqueta" aria-label="aviso importante">❗ aviso importante</span>}
                <strong>{a.titulo}</strong>
                <span className="detalle">{formatoCorto(a.fecha)}{asig ? ` · ${asig.nombre}` : ''}</span>
              </div>
              <p className="aviso-texto">{a.texto}</p>
              <div className="aviso-acciones">
                {a.enlace && <a href={a.enlace} target="_blank" rel="noreferrer">Abrir en el aula virtual</a>}
                {!a.leido && <button className="enlace" onClick={() => marcar([a.id])}>Marcar como leído</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ListaMateriales({ aula, asignatura, enPc }: { aula: Lista | null; asignatura: string; enPc: boolean }) {
  if (!aula || aula.secciones.length === 0) return <p className="vacio">Todavía no hay materiales: aparecen después de la primera revisión del aula virtual en el PC.</p>;
  return (
    <>
      {aula.secciones.map((s) => (
        <section key={s.nombre}>
          <h3 className="grupo">{s.nombre}</h3>
          <ul className="lista materiales">
            {s.materiales.map((m) => {
              const href = enPc && m.archivo && m.tipo !== 'carpeta' ? urlMaterial(asignatura, m.archivo) : m.enlace;
              const nombre = m.retirado ? <s>{m.nombre}</s> : m.nombre;
              return (
                <li key={m.id}>
                  <a href={href} target="_blank" rel="noreferrer">{ICONO[m.tipo] ?? '📎'} {nombre}</a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="detalle">Actualizado el {formatoCorto(aula.actualizado)}.</p>
    </>
  );
}

// Sección «Aula virtual» de Estudio. En «General» se ven los avisos de todas las asignaturas.
export function AulaVirtual({ asignatura, enPc }: { asignatura: Asignatura; enPc: boolean }) {
  const { config, datos } = useDatos();
  const { avisos, marcarLeidos } = useAvisos();
  const [pestana, setPestana] = useState<Pestana>('avisos');
  const [datosAula, setDatosAula] = useState<{ aula: Lista | null; evaluacion: string | null } | null>(null);
  const todas = asignatura.id === GENERAL.id;

  useEffect(() => {
    if (todas || !config) return;
    let vivo = true;
    cargarAulaAsignatura(config, asignatura.id).then((d) => vivo && setDatosAula(d)).catch(() => vivo && setDatosAula({ aula: null, evaluacion: null }));
    return () => {
      vivo = false;
    };
  }, [config, asignatura.id, todas]);

  const deEsta = todas ? avisos : avisos.filter((a) => a.asignatura === asignatura.id || !a.asignatura);
  return (
    <div className="aula-virtual">
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'avisos'} className={pestana === 'avisos' ? 'activa' : ''} onClick={() => setPestana('avisos')}>📣 Avisos</button>
        {!todas && <button role="tab" aria-selected={pestana === 'materiales'} className={pestana === 'materiales' ? 'activa' : ''} onClick={() => setPestana('materiales')}>📚 Materiales</button>}
        {!todas && <button role="tab" aria-selected={pestana === 'evaluacion'} className={pestana === 'evaluacion' ? 'activa' : ''} onClick={() => setPestana('evaluacion')}>🎯 Evaluación</button>}
      </div>
      {pestana === 'avisos' && <ListaAvisos avisos={deEsta} asignaturas={datos.asignaturas} marcar={(ids) => void marcarLeidos(ids)} />}
      {pestana === 'materiales' && !todas && (datosAula ? <ListaMateriales aula={datosAula.aula} asignatura={asignatura.id} enPc={enPc} /> : <p className="cargando">Cargando…</p>)}
      {pestana === 'evaluacion' && !todas && (datosAula?.evaluacion ? <Markdown texto={datosAula.evaluacion} /> : <p className="vacio">Todavía no hay resumen de la guía docente.</p>)}
    </div>
  );
}
