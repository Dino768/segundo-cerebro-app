import { useEffect, useRef, useState } from 'react';
import { buscarArea } from '../agenda/areas';
import type { Area } from '../datos/areas';

interface Props {
  areas: Area[];
  valor: string;
  cambiar(id: string): void;
  ninguna?: string; // texto de la opción vacía; sin él, no hay opción vacía
  disabled?: boolean;
  etiqueta?: string;
  abiertoInicial?: boolean; // solo para las pruebas
}

export type FilaMenu =
  | { tipo: 'area'; id: string; nombre: string; color: string; subareas: number; desplegada: boolean }
  | { tipo: 'entera'; id: string; nombre: string; color: string }
  | { tipo: 'sub'; id: string; nombre: string; color: string };

// Solo se ven las áreas; las subáreas salen debajo de la que esté desplegada.
export function filasDelMenu(areas: Area[], desplegada: string | null): FilaMenu[] {
  return areas.flatMap((a): FilaMenu[] => {
    const abierta = desplegada === a.id && a.subareas.length > 0;
    const fila: FilaMenu = { tipo: 'area', id: a.id, nombre: a.nombre, color: a.color, subareas: a.subareas.length, desplegada: abierta };
    if (!abierta) return [fila];
    return [
      fila,
      { tipo: 'entera', id: a.id, nombre: a.nombre, color: a.color },
      ...a.subareas.map((s): FilaMenu => ({ tipo: 'sub', id: s.id, nombre: s.nombre, color: s.color })),
    ];
  });
}

export function SelectorArea({ areas, valor, cambiar, ninguna, disabled, etiqueta = 'Área', abiertoInicial = false }: Props) {
  const encontrada = buscarArea(areas, valor);
  const madreElegida = encontrada?.madre.id ?? null;
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [desplegada, setDesplegada] = useState<string | null>(madreElegida);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAbierto(false);
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla, true);
    };
  }, [abierto]);

  function abrir() {
    setDesplegada(madreElegida);
    setAbierto((a) => !a);
  }

  function elegir(id: string) {
    cambiar(id);
    setAbierto(false);
  }

  const texto = !valor
    ? (ninguna ?? 'Elige un área')
    : !encontrada
      ? `${valor} (desconocida)`
      : encontrada.madre.id === valor
        ? encontrada.madre.nombre
        : `${encontrada.madre.nombre} › ${encontrada.area.nombre}`;

  return (
    <div className="selector-area" ref={caja}>
      <button
        type="button"
        className="boton-selector"
        aria-label={etiqueta}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={disabled}
        onClick={abrir}
      >
        {encontrada && <span className="punto" style={{ background: encontrada.area.color }} />}
        <span className="texto-selector">{texto}</span>
        <span className="flecha" aria-hidden>▾</span>
      </button>
      {abierto && (
        <div className="menu-areas" role="listbox" aria-label={etiqueta}>
          {ninguna !== undefined && (
            <button type="button" role="option" aria-selected={!valor} className="opcion-area" onClick={() => elegir('')}>
              {ninguna}
            </button>
          )}
          {filasDelMenu(areas, desplegada).map((f) =>
            f.tipo === 'area' ? (
              <button
                key={`a-${f.id}`}
                type="button"
                role="option"
                aria-selected={valor === f.id}
                aria-expanded={f.subareas > 0 ? f.desplegada : undefined}
                className={`opcion-area${madreElegida === f.id ? ' elegida' : ''}`}
                onClick={() => (f.subareas > 0 ? setDesplegada(f.desplegada ? null : f.id) : elegir(f.id))}
              >
                <span className="punto" style={{ background: f.color }} />
                <span className="texto-selector">{f.nombre}</span>
                {f.subareas > 0 && <span className="flecha" aria-hidden>{f.desplegada ? '▾' : '▸'}</span>}
              </button>
            ) : (
              <button
                key={`${f.tipo}-${f.id}`}
                type="button"
                role="option"
                aria-selected={valor === f.id}
                className={`opcion-area subopcion${valor === f.id ? ' elegida' : ''}`}
                onClick={() => elegir(f.id)}
              >
                {f.tipo === 'entera' ? <em>Toda el área «{f.nombre}»</em> : f.nombre}
              </button>
            ),
          )}
          {valor && !encontrada && (
            <button type="button" role="option" aria-selected className="opcion-area elegida" onClick={() => elegir(valor)}>
              {`${valor} (desconocida)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
