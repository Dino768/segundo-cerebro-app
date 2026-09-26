import { CAPA_CLAUDE, type Capa } from '../../estudio/capas';

interface Props {
  capas: Capa[];
  activa: string | null;
  ocultas: ReadonlySet<string>;
  bloqueado: boolean; // solo lectura: solo mostrar u ocultar
  elegir(id: string): void;
  alternar(id: string): void;
  crear(): void;
  borrar(id: string): void;
  renombrar(id: string): void;
  duplicar(id: string): void;
  mover(id: string, delta: 1 | -1): void;
  cerrar(): void;
}

export function PanelCapas(p: Props) {
  const lista = [...p.capas].reverse(); // como en Procreate: arriba, la que se ve por encima
  return (
    <aside className="panel-capas" aria-label="Capas">
      <div className="cabecera-capas">
        <strong>Capas</strong>
        <button onClick={p.crear} disabled={p.bloqueado}>+ Capa</button>
        <button className="enlace" onClick={p.cerrar} aria-label="Cerrar capas">×</button>
      </div>
      <ul className="lista-capas">
        {lista.map((c, i) => {
          const deClaude = c.id === CAPA_CLAUDE;
          const oculta = p.ocultas.has(c.id);
          return (
            <li key={c.id} className={`capa${p.activa === c.id ? ' activa' : ''}${oculta ? ' oculta' : ''}`}>
              <button className="ojo" onClick={() => p.alternar(c.id)} aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${c.nombre}`}>
                {oculta ? '◌' : '👁'}
              </button>
              <button
                className="nombre-capa"
                disabled={oculta}
                onClick={() => p.elegir(c.id)}
                onDoubleClick={() => !deClaude && !p.bloqueado && p.renombrar(c.id)}
                title={deClaude ? 'Todo lo de Claude' : 'Doble clic para renombrar'}
              >
                {deClaude ? '🤖 ' : ''}
                {c.nombre}
              </button>
              {!p.bloqueado && (
                <span className="acciones-capa">
                  <button onClick={() => p.mover(c.id, 1)} disabled={i === 0} aria-label={`Subir ${c.nombre}`}>↑</button>
                  <button onClick={() => p.mover(c.id, -1)} disabled={i === lista.length - 1} aria-label={`Bajar ${c.nombre}`}>↓</button>
                  <button onClick={() => p.duplicar(c.id)} aria-label={`Duplicar ${c.nombre}`}>⧉</button>
                  {!deClaude && <button onClick={() => p.renombrar(c.id)} aria-label={`Renombrar ${c.nombre}`}>✎</button>}
                  {!deClaude && <button className="peligro" onClick={() => p.borrar(c.id)} aria-label={`Borrar ${c.nombre}`}>🗑</button>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
