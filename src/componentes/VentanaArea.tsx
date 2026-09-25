import { useState, type FormEvent } from 'react';
import { buscarArea, crearArea, destinosPosibles, editarArea, idsDeArea, nombreDeArea, PALETA } from '../agenda/areas';
import type { Datos } from '../repositorio';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { SelectorArea } from './SelectorArea';

export function contarDentro(d: Pick<Datos, 'tareas' | 'ideas' | 'proyectos' | 'areas'>, id: string): number {
  const ids = idsDeArea(d.areas, id);
  const dentro = (x: { area?: string }) => x.area !== undefined && ids.includes(x.area);
  return d.tareas.filter(dentro).length + d.ideas.filter(dentro).length + d.proyectos.filter(dentro).length;
}

interface Props {
  id?: string;
  madre?: string;
  cerrar(): void;
}

export function VentanaArea({ id, madre, cerrar }: Props) {
  const { datos, cambiarAreas, borrarArea, soloLectura, areasBloqueadas } = useDatos();
  const actual = buscarArea(datos.areas, id);
  const grande = actual && actual.area === actual.madre ? actual.madre : null;
  const colorMadre = datos.areas.find((a) => a.id === madre)?.color;
  const [nombre, setNombre] = useState(actual?.area.nombre ?? '');
  const [color, setColor] = useState(actual?.area.color ?? colorMadre ?? PALETA[datos.areas.length % PALETA.length]);
  const [borrando, setBorrando] = useState(false);
  const [destino, setDestino] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sub, setSub] = useState<{ id?: string; madre?: string } | null>(null);
  const bloqueado = soloLectura || areasBloqueadas || guardando;

  const titulo = id ? (grande ? 'Editar área' : 'Editar subárea') : madre ? `Nueva subárea de ${nombreDeArea(datos.areas, madre)}` : 'Nueva área';

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const ok = await cambiarAreas(
      (as) => (id ? editarArea(as, id, { nombre, color }) : crearArea(as, { nombre, color }, madre)),
      `${id ? 'Editar' : 'Crear'} área: ${nombre.trim()}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  const dentro = id ? contarDentro(datos, id) : 0;
  const destinos = id ? destinosPosibles(datos.areas, id) : [];

  async function confirmarBorrado() {
    if (!id) return;
    const aviso = grande && grande.subareas.length ? ` También se borran sus subáreas (${grande.subareas.map((s) => s.nombre).join(', ')}).` : '';
    const destinoNombre = nombreDeArea(datos.areas, destino);
    const texto = dentro
      ? `¿Borrar «${nombre}»? Sus ${dentro} cosas pasan a «${destinoNombre}».${aviso}`
      : `¿Borrar «${nombre}»?${aviso}`;
    if (!(await confirmar(texto, { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await borrarArea(id, dentro ? destino : null);
    setGuardando(false);
    if (ok) cerrar();
  }

  function empezarBorrado() {
    // Si se borra una subárea, lo normal es mandar lo de dentro a su área.
    setDestino(actual && actual.area !== actual.madre ? actual.madre.id : (destinos[0] ?? ''));
    setBorrando(true);
  }

  if (sub) return <VentanaArea id={sub.id} madre={sub.madre} cerrar={() => setSub(null)} />;

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{titulo}</h2>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={40} />
        </label>
        <fieldset className="paleta">
          <legend>Color</legend>
          {PALETA.map((c) => (
            <button key={c} type="button" className={`muestra${c === color ? ' elegida' : ''}`} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Otro color" />
        </fieldset>
        {grande && (
          <div className="subareas">
            <h3>Subáreas</h3>
            {grande.subareas.length === 0 && <p className="vacio">Aún no tiene subáreas.</p>}
            {grande.subareas.map((s) => (
              <button key={s.id} type="button" className="fila-subarea" onClick={() => setSub({ id: s.id })} disabled={bloqueado}>
                <span className="punto" style={{ background: s.color }} />
                {s.nombre} <span className="detalle">✏️</span>
              </button>
            ))}
            <button type="button" onClick={() => setSub({ madre: grande.id })} disabled={bloqueado}>+ Subárea</button>
          </div>
        )}
        {borrando && id && (
          <div className="banner aviso">
            {destinos.length === 0 ? (
              <p>No se puede borrar: es la única área, y las tareas siempre necesitan una. Crea otra antes.</p>
            ) : dentro > 0 ? (
              <label>
                Tiene {dentro} cosas dentro (tareas, ideas y proyectos). ¿A dónde las paso?
                <SelectorArea areas={datos.areas.filter((a) => destinos.includes(a.id) || a.subareas.some((s) => destinos.includes(s.id)))} valor={destino} cambiar={setDestino} etiqueta="Destino" />
              </label>
            ) : (
              <p>Está vacía: se puede borrar sin mover nada.</p>
            )}
            {destinos.length > 0 && (
              <button type="button" className="peligro" disabled={bloqueado || (dentro > 0 && !destinos.includes(destino))} onClick={() => void confirmarBorrado()}>
                Borrar definitivamente
              </button>
            )}
          </div>
        )}
        <div className="botones">
          <button type="submit" className="activa" disabled={bloqueado}>Guardar</button>
          {id && !borrando && <button type="button" className="peligro" disabled={bloqueado} onClick={empezarBorrado}>Borrar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
