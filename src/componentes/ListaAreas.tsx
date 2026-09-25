import { useState } from 'react';
import { useDatos } from '../estado/datos';
import { VentanaArea } from './VentanaArea';

// Árbol de áreas y subáreas con su lápiz (Ajustes).
export function ListaAreas() {
  const { datos, soloLectura, areasBloqueadas } = useDatos();
  const [abierta, setAbierta] = useState<{ id?: string; madre?: string } | null>(null);
  const bloqueado = soloLectura || areasBloqueadas;
  return (
    <div className="tarjeta lista-areas">
      <h3>Áreas</h3>
      <ul>
        {datos.areas.map((a) => (
          <li key={a.id}>
            <button className="fila-subarea" disabled={bloqueado} onClick={() => setAbierta({ id: a.id })}>
              <span className="punto" style={{ background: a.color }} />
              {a.nombre} <span className="detalle">✏️</span>
            </button>
            {a.subareas.length > 0 && (
              <ul>
                {a.subareas.map((s) => (
                  <li key={s.id}>
                    <button className="fila-subarea" disabled={bloqueado} onClick={() => setAbierta({ id: s.id })}>
                      <span className="punto" style={{ background: s.color }} />
                      {s.nombre} <span className="detalle">✏️</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <button disabled={bloqueado} onClick={() => setAbierta({})}>+ Nueva área</button>
      {abierta && <VentanaArea id={abierta.id} madre={abierta.madre} cerrar={() => setAbierta(null)} />}
    </div>
  );
}
