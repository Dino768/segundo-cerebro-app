import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { aMundo, centro, encuadrar, puntoEnBorde, zoomEn, type Punto, type Rect, type Vista } from '../../estudio/geometria';
import type { Operacion, Pieza, Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { PiezaPizarra } from './PiezaPizarra';

interface Props {
  pizarra: TipoPizarra;
  imagen(ruta: string): Promise<string>;
  alOperar?(op: Operacion): void; // sin esto, la pizarra es de solo lectura
  children?: ReactNode; // botones extra en la barra de abajo
}

type Arrastre =
  | { tipo: 'fondo'; desde: Punto; vista: Vista }
  | { tipo: 'pieza'; id: string; desde: Punto; origen: Punto; movido: boolean };

interface Edicion { id: string | null; x: number; y: number; texto: string }

export function Pizarra({ pizarra, imagen, alOperar, children }: Props) {
  const editable = !!alOperar;
  const marco = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>({ x: 40, y: 40, escala: 1 });
  const [tamanos, setTamanos] = useState<Record<string, { w: number; h: number }>>({});
  const [posiciones, setPosiciones] = useState<Record<string, Punto>>({});
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const punteros = useRef(new Map<number, Punto>());
  const pinza = useRef<number | null>(null);
  const encuadrada = useRef(false);

  // Cuando llega una versión nueva de la pizarra, las posiciones provisionales ya no hacen falta.
  useEffect(() => setPosiciones({}), [pizarra]);

  const medir = useCallback((id: string, w: number, h: number) => {
    setTamanos((t) => (t[id]?.w === w && t[id]?.h === h ? t : { ...t, [id]: { w, h } }));
  }, []);

  const rectDe = (p: Pieza): Rect => {
    const pos = posiciones[p.id] ?? p;
    const t = tamanos[p.id] ?? { w: p.ancho, h: 60 };
    return { x: pos.x, y: pos.y, w: t.w, h: t.h };
  };

  const verTodo = () => {
    const m = marco.current;
    if (m) setVista(encuadrar(pizarra.piezas.map(rectDe), m.clientWidth, m.clientHeight));
  };

  // La primera vez, se encuadra cuando ya se han medido todas las piezas.
  useEffect(() => {
    if (!encuadrada.current && pizarra.piezas.length && pizarra.piezas.every((p) => tamanos[p.id])) {
      encuadrada.current = true;
      verTodo();
    }
  });

  useEffect(() => {
    const m = marco.current;
    if (!m) return;
    const alRueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = m.getBoundingClientRect();
      setVista((v) => zoomEn(v, Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top }));
    };
    m.addEventListener('wheel', alRueda, { passive: false });
    return () => m.removeEventListener('wheel', alRueda);
  }, []);

  const local = (e: { clientX: number; clientY: number }): Punto => {
    const r = marco.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoomCentro = (factor: number) => {
    const m = marco.current;
    if (m) setVista((v) => zoomEn(v, factor, { x: m.clientWidth / 2, y: m.clientHeight / 2 }));
  };

  function alPulsar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('textarea, a')) return;
    marco.current?.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, local(e));
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      pinza.current = Math.hypot(a.x - b.x, a.y - b.y);
      arrastre.current = null;
      return;
    }
    const idPieza = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]')?.dataset.pieza;
    const pieza = idPieza ? pizarra.piezas.find((x) => x.id === idPieza) : undefined;
    if (pieza && editable) {
      setSeleccion(pieza.id);
      arrastre.current = { tipo: 'pieza', id: pieza.id, desde: local(e), origen: { x: pieza.x, y: pieza.y }, movido: false };
    } else {
      if (!pieza) setSeleccion(null);
      arrastre.current = { tipo: 'fondo', desde: local(e), vista };
    }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, local(e));
    if (pinza.current !== null && punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = d / pinza.current;
      pinza.current = d;
      setVista((v) => zoomEn(v, factor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
      return;
    }
    const a = arrastre.current;
    if (!a) return;
    const p = local(e);
    const dx = p.x - a.desde.x;
    const dy = p.y - a.desde.y;
    if (a.tipo === 'fondo') setVista({ ...a.vista, x: a.vista.x + dx, y: a.vista.y + dy });
    else {
      if (Math.abs(dx) + Math.abs(dy) > 3) a.movido = true;
      if (a.movido) setPosiciones((ps) => ({ ...ps, [a.id]: { x: a.origen.x + dx / vista.escala, y: a.origen.y + dy / vista.escala } }));
    }
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    const a = arrastre.current;
    arrastre.current = null;
    if (a?.tipo === 'pieza' && a.movido) {
      const pos = posiciones[a.id];
      if (pos) alOperar?.({ tipo: 'mover', id: a.id, x: pos.x, y: pos.y });
    }
  }

  function alDobleClic(e: MouseEvent<HTMLDivElement>) {
    if (!editable) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    if (el) {
      const p = pizarra.piezas.find((x) => x.id === el.dataset.pieza);
      if (p?.tipo === 'nota') setEditando({ id: p.id, x: p.x, y: p.y, texto: p.contenido });
      return;
    }
    const m = aMundo(vista, local(e));
    setEditando({ id: null, x: m.x, y: m.y, texto: '' });
  }

  function terminarNota() {
    const ed = editando;
    setEditando(null);
    if (!ed) return;
    const texto = ed.texto.trim();
    if (!texto) {
      if (ed.id) alOperar?.({ tipo: 'borrar', id: ed.id });
      return;
    }
    alOperar?.({ tipo: 'nota', id: ed.id, x: ed.x, y: ed.y, contenido: texto });
  }

  const borrar = (id: string) => {
    setSeleccion(null);
    alOperar?.({ tipo: 'borrar', id });
  };

  function alTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (editando || !seleccion || !editable) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      borrar(seleccion);
    }
  }

  const porId = new Map(pizarra.piezas.map((p) => [p.id, p]));

  return (
    <div className="pizarra">
      <div
        ref={marco}
        className="lienzo"
        tabIndex={0}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onDoubleClick={alDobleClic}
        onKeyDown={alTecla}
      >
        <div className="mundo" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}>
          <svg className="flechas" width="1" height="1" overflow="visible">
            <defs>
              <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#8b7b6a" />
              </marker>
            </defs>
            {pizarra.flechas.map((f) => {
              const de = porId.get(f.de);
              const a = porId.get(f.a);
              if (!de || !a) return null;
              const rde = rectDe(de);
              const ra = rectDe(a);
              const p1 = puntoEnBorde(rde, centro(ra));
              const p2 = puntoEnBorde(ra, centro(rde));
              return (
                <g key={f.id}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8b7b6a" strokeWidth={2} markerEnd="url(#punta-flecha)" />
                  {f.etiqueta && <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" className="etiqueta-flecha">{f.etiqueta}</text>}
                </g>
              );
            })}
          </svg>
          {pizarra.piezas
            .filter((p) => p.id !== editando?.id)
            .map((p) => {
              const pos = posiciones[p.id] ?? p;
              return <PiezaPizarra key={p.id} pieza={p} x={pos.x} y={pos.y} seleccionada={seleccion === p.id} imagen={imagen} alMedir={medir} />;
            })}
          {editando && (
            <textarea
              className="editor-nota"
              autoFocus
              style={{ left: editando.x, top: editando.y }}
              value={editando.texto}
              placeholder="Escribe tu nota… (Ctrl+Enter para terminar)"
              onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
              onBlur={terminarNota}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditando(null);
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) terminarNota();
              }}
            />
          )}
        </div>
        {pizarra.piezas.length === 0 && !editando && (
          <p className="pizarra-vacia">
            {editable ? 'Pizarra en blanco. Pídele a Claude que te lo explique aquí, o haz doble clic para escribir una nota.' : 'Esta pizarra está vacía.'}
          </p>
        )}
      </div>
      <div className="controles-pizarra">
        <button onClick={verTodo}>Ver todo</button>
        <button onClick={() => zoomCentro(1 / 1.2)} aria-label="Alejar">−</button>
        <button onClick={() => zoomCentro(1.2)} aria-label="Acercar">+</button>
        {editable && seleccion && <button className="peligro" onClick={() => borrar(seleccion)}>🗑 Borrar</button>}
        <span className="hueco" />
        {children}
      </div>
    </div>
  );
}
