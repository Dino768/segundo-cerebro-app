import { useState, type FormEvent } from 'react';
import { buscarArea } from '../agenda/areas';
import { estadoInicial, tareaDelFormulario, type EstadoForm, type ModoFin, type ModoRepetir } from '../agenda/formTarea';
import { hastaDurante, type Unidad } from '../agenda/repeticion';
import { aplicarEdicion, borrarDeLista } from '../agenda/tareas';
import { CAMPOS_TIPO, ICONO_TIPO, NOMBRE_TIPO } from '../agenda/tipos';
import { PRIORIDADES, TIPOS, type Prioridad, type Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { useHoy } from '../estado/hoy';
import { guardarUltimaArea, leerUltimaArea } from '../estado/ultimaArea';
import { DIAS, formatoCorto, type Dia, type ISODate } from '../fechas';
import { iconoAlEscribir, iconoPara } from '../iconos/diccionario';
import { Icono } from './Icono';
import { SelectorArea } from './SelectorArea';
import { SelectorIcono } from './SelectorIcono';

export type Edicion = ({ tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string } }) & {
  // Aviso que se muestra en el formulario y acción extra tras guardar bien (p. ej. quitar la idea de ideas.yaml).
  nota?: string;
  alGuardar?(): Promise<unknown>;
};

interface Props {
  edicion: Edicion;
  cerrar(): void;
}

export function FormTarea({ edicion, cerrar }: Props) {
  const { datos, cambiarTareas } = useDatos();
  const hoy = useHoy();
  const original = 'tarea' in edicion ? edicion.tarea : null;
  const nueva = 'nueva' in edicion ? edicion.nueva : {};
  const [f, setF] = useState<EstadoForm>(() => {
    // Una idea vinculada a un proyecto que ya no existe no debe guardar ese id viejo en la tarea.
    const proyectoVivo = nueva.proyecto && datos.proyectos.some((p) => p.id === nueva.proyecto) ? nueva.proyecto : undefined;
    const ultima = leerUltimaArea();
    const area = nueva.area ?? (ultima && buscarArea(datos.areas, ultima) ? ultima : datos.areas[0]?.id ?? 'personal');
    const icono = original?.icono ?? nueva.icono ?? iconoPara(original?.titulo ?? nueva.titulo ?? '');
    return estadoInicial(original, { ...nueva, proyecto: proyectoVivo }, area, icono);
  });
  // Solo el icono guardado cuenta como fijado: una tarea sin icono todavía sigue la sugerencia del título.
  const [fijado, setFijado] = useState(Boolean(original?.icono ?? nueva.icono));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiar = (x: Partial<EstadoForm>) => setF((v) => ({ ...v, ...x }));
  const c = CAMPOS_TIPO[f.tipo];
  const automatica = f.tipo === 'examen' || f.tipo === 'entrega';

  function cambiarTitulo(v: string) {
    setF((x) => ({ ...x, titulo: v, icono: iconoAlEscribir(v, x.icono, fijado) }));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = tareaDelFormulario(f, original, hoy);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setError('');
    setGuardando(true);
    const ok = await cambiarTareas(
      (ts) => aplicarEdicion(ts, original, r.tarea, new Date()),
      `${original ? 'Editar' : 'Crear'} tarea: ${r.tarea.titulo}`,
    );
    if (ok && !original) guardarUltimaArea(f.area);
    if (ok) await edicion.alGuardar?.();
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!original || !(await confirmar(`¿Borrar «${original.titulo}»?`, { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await cambiarTareas((ts) => borrarDeLista(ts, original.id), `Borrar tarea: ${original.titulo}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  const alternarDia = (d: Dia) => cambiar({ dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d] });
  const necesitaFecha = c.repetir && (f.modoRepetir === 'mes' || f.modoRepetir === 'año');

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={guardar}>
        <h2>{original ? 'Editar' : 'Nueva'}: {NOMBRE_TIPO[f.tipo].toLowerCase()}</h2>
        {edicion.nota && <p className="nota-form">{edicion.nota}</p>}
        <div className="tipos-tarea" role="group" aria-label="Tipo">
          {TIPOS.map((t) => (
            <button key={t} type="button" className={`pastilla${f.tipo === t ? ' encendida' : ''}`} aria-pressed={f.tipo === t} onClick={() => cambiar({ tipo: t })}>
              <Icono nombre={ICONO_TIPO[t]} tamano={16} />
              {NOMBRE_TIPO[t]}
            </button>
          ))}
        </div>
        <div className="campo-titulo">
          <SelectorIcono icono={f.icono} elegir={(i) => { cambiar({ icono: i }); setFijado(true); }} />
          <label>
            Título
            <input value={f.titulo} onChange={(e) => cambiarTitulo(e.target.value)} required autoFocus />
          </label>
        </div>
        <div className="fila-campos">
          <SelectorArea areas={datos.areas} valor={f.area} cambiar={(a) => cambiar({ area: a })} />
          {c.prioridad && (
            <label>
              Prioridad
              <select value={automatica ? f.prioridad : f.prioridad || 'media'} onChange={(e) => cambiar({ prioridad: e.target.value as Prioridad | '' })}>
                {automatica && <option value="">Automática</option>}
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="fila-campos">
          <label>
            {necesitaFecha ? 'Empieza el' : 'Fecha (opcional)'}
            <input type="date" value={f.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} />
          </label>
          {c.hora && (
            <label>
              Hora (opcional)
              <input type="time" value={f.hora} onChange={(e) => cambiar({ hora: e.target.value })} />
            </label>
          )}
        </div>
        {c.repetir && (
          <fieldset>
            <legend>Se repite</legend>
            <select aria-label="Cómo se repite" value={f.modoRepetir} onChange={(e) => cambiar({ modoRepetir: e.target.value as ModoRepetir })}>
              <option value="no">No se repite</option>
              <option value="semana">Días de la semana</option>
              <option value="mes">Cada mes</option>
              <option value="año">Cada año</option>
            </select>
            {f.modoRepetir === 'semana' && (
              <div>
                {DIAS.map((d) => (
                  <label key={d} className="dia">
                    <input type="checkbox" checked={f.dias.includes(d)} onChange={() => alternarDia(d)} />
                    {d}
                  </label>
                ))}
              </div>
            )}
            {f.modoRepetir !== 'no' && (
              <div className="fila-campos">
                <label>
                  Hasta
                  <select value={f.modoFin} onChange={(e) => cambiar({ modoFin: e.target.value as ModoFin })}>
                    <option value="sin">Sin final</option>
                    <option value="fecha">Una fecha</option>
                    <option value="durante">Durante…</option>
                  </select>
                </label>
                {f.modoFin === 'fecha' && (
                  <label>
                    Último día
                    <input type="date" value={f.hastaFecha} min={f.fecha || undefined} onChange={(e) => cambiar({ hastaFecha: e.target.value })} required />
                  </label>
                )}
                {f.modoFin === 'durante' && (
                  <label>
                    Durante
                    <span className="durante">
                      <input type="number" min={1} max={99} value={f.durante} onChange={(e) => cambiar({ durante: Number(e.target.value) })} />
                      <select value={f.unidad} onChange={(e) => cambiar({ unidad: e.target.value as Unidad })}>
                        <option value="semanas">semanas</option>
                        <option value="meses">meses</option>
                        <option value="años">años</option>
                      </select>
                    </span>
                  </label>
                )}
              </div>
            )}
            {f.modoRepetir !== 'no' && f.modoFin === 'durante' && (
              <p className="detalle">Hasta el {formatoCorto(hastaDurante(f.fecha || hoy, f.durante, f.unidad))}</p>
            )}
          </fieldset>
        )}
        {c.proyecto && (
          <label>
            Proyecto
            <select
              value={f.proyecto}
              onChange={(e) => {
                const v = e.target.value;
                const a = datos.proyectos.find((p) => p.id === v)?.area;
                cambiar(a ? { proyecto: v, area: a } : { proyecto: v });
              }}
            >
              <option value="">(ninguno)</option>
              {datos.proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
              {f.proyecto && !datos.proyectos.some((p) => p.id === f.proyecto) && <option value={f.proyecto}>{f.proyecto}</option>}
            </select>
          </label>
        )}
        {c.notas && (
          <label>
            Notas
            <textarea value={f.notas} onChange={(e) => cambiar({ notas: e.target.value })} rows={3} />
          </label>
        )}
        {error && <p className="error-form">{error}</p>}
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>Guardar</button>
          {original && (
            <button type="button" className="peligro" onClick={() => void borrar()} disabled={guardando}>Borrar</button>
          )}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
