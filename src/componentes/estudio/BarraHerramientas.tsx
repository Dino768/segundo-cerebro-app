import { COLORES, dibuja, type EstadoHerramientas, type Forma, type Grosor, type NombreHerramienta } from '../../estudio/herramientas';

interface Props {
  estado: EstadoHerramientas;
  cambiar(e: EstadoHerramientas): void;
  enClaude: boolean; // la capa activa es la de Claude: no se puede dibujar ni escribir
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  deshacer(): void;
  rehacer(): void;
  haySeleccion: boolean;
  hayRecorte: boolean;
  copiar(): void;
  cortar(): void;
  pegar(): void;
  capasAbiertas: boolean;
  alternarCapas(): void;
}

const HERRAMIENTAS: { id: NombreHerramienta; icono: string; nombre: string }[] = [
  { id: 'mover', icono: '✋', nombre: 'Mover' },
  { id: 'lapiz', icono: '✏️', nombre: 'Lápiz' },
  { id: 'subrayador', icono: '🖍', nombre: 'Subrayador' },
  { id: 'forma', icono: '⬜', nombre: 'Formas' },
  { id: 'lazo', icono: '➰', nombre: 'Lazo' },
  { id: 'borrador', icono: '🧽', nombre: 'Borrador' },
  { id: 'texto', icono: 'T', nombre: 'Texto' },
];
const FORMAS: { id: Forma; nombre: string }[] = [
  { id: 'linea', nombre: '╱ Línea' },
  { id: 'flecha', nombre: '→ Flecha' },
  { id: 'rectangulo', nombre: '▭ Rectángulo' },
  { id: 'elipse', nombre: '◯ Elipse' },
];
const GROSORES: { id: Grosor; nombre: string }[] = [
  { id: 'fino', nombre: 'Fino' },
  { id: 'medio', nombre: 'Medio' },
  { id: 'grueso', nombre: 'Grueso' },
];

export function BarraHerramientas(p: Props) {
  const { estado: e, cambiar } = p;
  const pinta = e.herramienta === 'lapiz' || e.herramienta === 'subrayador' || e.herramienta === 'forma';
  const colores = [...COLORES, ...(e.propio && !(COLORES as readonly string[]).includes(e.propio) ? [e.propio] : [])];
  const pastilla = (activa: boolean) => `pastilla${activa ? ' encendida' : ''}`;
  return (
    <div className="barra-herramientas" role="toolbar" aria-label="Herramientas de la pizarra">
      <div className="grupo-herramientas">
        {HERRAMIENTAS.map((h) => (
          <button
            key={h.id}
            className={`herramienta${e.herramienta === h.id ? ' encendida' : ''}`}
            aria-pressed={e.herramienta === h.id}
            title={h.nombre}
            aria-label={h.nombre}
            disabled={p.enClaude && dibuja(h.id)}
            onClick={() => cambiar({ ...e, herramienta: h.id })}
          >
            {h.icono}
          </button>
        ))}
        <span className="hueco-barra" />
        <button onClick={p.deshacer} disabled={!p.puedeDeshacer} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶</button>
        <button onClick={p.rehacer} disabled={!p.puedeRehacer} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">↷</button>
        <button className={p.capasAbiertas ? 'encendida' : ''} aria-pressed={p.capasAbiertas} onClick={p.alternarCapas}>📚 Capas</button>
      </div>
      <div className="opciones-herramienta">
        {e.herramienta === 'forma' &&
          FORMAS.map((f) => (
            <button key={f.id} className={pastilla(e.forma === f.id)} aria-pressed={e.forma === f.id} onClick={() => cambiar({ ...e, forma: f.id })}>
              {f.nombre}
            </button>
          ))}
        {e.herramienta === 'borrador' && (
          <>
            <button className={pastilla(e.borrador === 'trazos')} aria-pressed={e.borrador === 'trazos'} onClick={() => cambiar({ ...e, borrador: 'trazos' })}>
              Borra trazos enteros
            </button>
            <button className={pastilla(e.borrador === 'goma')} aria-pressed={e.borrador === 'goma'} onClick={() => cambiar({ ...e, borrador: 'goma' })}>
              Goma
            </button>
          </>
        )}
        {pinta && (
          <>
            {colores.map((c) => (
              <button
                key={c}
                className={`color${e.color === c ? ' encendida' : ''}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
                aria-pressed={e.color === c}
                onClick={() => cambiar({ ...e, color: c })}
              />
            ))}
            <label className="color color-propio" title="Otro color">
              +
              <input type="color" value={e.propio ?? e.color} aria-label="Elegir otro color" onChange={(ev) => cambiar({ ...e, color: ev.target.value, propio: ev.target.value })} />
            </label>
            {GROSORES.map((g) => (
              <button key={g.id} className={pastilla(e.grosor === g.id)} aria-pressed={e.grosor === g.id} onClick={() => cambiar({ ...e, grosor: g.id })}>
                {g.nombre}
              </button>
            ))}
          </>
        )}
        {(e.herramienta === 'lazo' || e.herramienta === 'mover') && (
          <>
            <button disabled={!p.haySeleccion} onClick={p.copiar}>Copiar</button>
            <button disabled={!p.haySeleccion} onClick={p.cortar}>Cortar</button>
            <button disabled={!p.hayRecorte} onClick={p.pegar}>Pegar</button>
          </>
        )}
        {p.enClaude && <span className="detalle">La capa de Claude es suya: elige una tuya en 📚 Capas para dibujar.</span>}
      </div>
    </div>
  );
}
