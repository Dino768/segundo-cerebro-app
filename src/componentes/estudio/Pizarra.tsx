import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { confirmar, pedirTexto } from '../../estado/dialogos';
import { CAPA_CLAUDE, opCrearCapa, opDuplicarCapa, opMoverCapa, porCapas } from '../../estudio/capas';
import { aMundo, centro, encuadrar, puntoEnBorde, zoomEn, type Punto, type Rect, type Vista } from '../../estudio/geometria';
import {
  borrarSeleccion, cajaDeSeleccion, empezarGoma, haySeleccion, ignorarPuntero, limpiarSeleccion, moverSeleccion, seguirGoma, seleccionarConLazo, SIN_SELECCION,
  terminarGoma, toqueMultiple, trazoDeGesto, trazosTocados, type Goma, type Seleccion,
} from '../../estudio/gestos';
import { aplicarOperacion, type Operacion, type Pieza, type Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { copiar, guardarRecorte, leerRecorte, pegar } from '../../estudio/portapapeles';
import { cajaDeTrazo, nuevoId } from '../../estudio/tinta';
import { BarraHerramientas } from './BarraHerramientas';
import { CapaTinta } from './CapaTinta';
import { PanelCapas } from './PanelCapas';
import { PiezaPizarra } from './PiezaPizarra';
import { usePizarraEditable } from './usePizarraEditable';

interface Props {
  pizarra: TipoPizarra;
  imagen(ruta: string): Promise<string>;
  alOperar?(op: Operacion): Promise<unknown>; // sin esto, la pizarra es de solo lectura
  clave: string; // esta pizarra en este dispositivo (capas ocultas, de dónde viene lo copiado)
  origen: string; // dónde viven sus imágenes: solo se pegan imágenes copiadas del mismo origen
  children?: ReactNode; // botones extra en la barra de abajo
}

const RADIO_BORRADOR = 10; // en píxeles de pantalla

type Gesto =
  | { tipo: 'fondo'; desde: Punto; vista: Vista }
  | { tipo: 'pieza'; id: string; desde: Punto; origen: Punto; movido: boolean }
  | { tipo: 'trazo'; id: string; puntos: Punto[]; presiones: number[] | null }
  | { tipo: 'borrar-trazos'; ids: Set<string> }
  | { tipo: 'goma'; goma: Goma }
  | { tipo: 'lazo'; poligono: Punto[] }
  | { tipo: 'mover-seleccion'; desde: Punto; dx: number; dy: number };

interface Edicion { id: string | null; nuevoId: string; x: number; y: number; texto: string }

export function Pizarra({ pizarra, imagen, alOperar, clave, origen, children }: Props) {
  const editable = !!alOperar;
  const ed = usePizarraEditable(pizarra, clave, alOperar);
  const { mostrada, herramientas: h, activa } = ed;
  const marco = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>({ x: 40, y: 40, escala: 1 });
  const [tamanos, setTamanos] = useState<Record<string, { w: number; h: number }>>({});
  const [posiciones, setPosiciones] = useState<Record<string, Punto>>({});
  const [seleccion, setSeleccion] = useState<Seleccion>(SIN_SELECCION);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [provisional, setProvisional] = useState<Operacion | null>(null);
  const [lazo, setLazo] = useState<Punto[] | null>(null);
  const [capasAbiertas, setCapasAbiertas] = useState(false);
  const [hayRecorte, setHayRecorte] = useState(() => leerRecorte() !== null);
  const [aviso, setAviso] = useState<string | null>(null);
  const gesto = useRef<Gesto | null>(null);
  const punteros = useRef(new Map<number, Punto>());
  const pinza = useRef<{ d: number; medio: Punto } | null>(null);
  const toque = useRef<{ inicio: number; dedos: number; movido: number; origen: Map<number, Punto> } | null>(null);
  const lapizVisto = useRef(false);
  const lapizAbajo = useRef(false);
  const espacio = useRef(false);
  const encuadrada = useRef(false);

  // Cuando llega una versión nueva de la pizarra, las posiciones provisionales ya no hacen falta.
  useEffect(() => setPosiciones({}), [pizarra]);
  // Lo seleccionado que ya no existe (lo borró Claude, o se deshizo) deja de estar seleccionado.
  useEffect(() => setSeleccion((s) => limpiarSeleccion(mostrada, s)), [mostrada]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Lo que se ve mientras se dibuja, se borra o se mueve algo (aún sin guardar).
  const vistaPizarra = provisional ? aplicarOperacion(mostrada, provisional) : mostrada;
  const puedeDibujar = editable && activa !== null && activa !== CAPA_CLAUDE;

  const medir = useCallback((id: string, w: number, alto: number) => {
    setTamanos((t) => (t[id]?.w === w && t[id]?.h === alto ? t : { ...t, [id]: { w, h: alto } }));
  }, []);

  const rectDe = (p: Pieza): Rect => {
    const pos = posiciones[p.id] ?? p;
    const t = tamanos[p.id] ?? { w: p.ancho, h: 60 };
    return { x: pos.x, y: pos.y, w: t.w, h: t.h };
  };

  const verTodo = () => {
    const m = marco.current;
    if (m) setVista(encuadrar([...vistaPizarra.piezas.map(rectDe), ...vistaPizarra.trazos.map(cajaDeTrazo)], m.clientWidth, m.clientHeight));
  };

  // La primera vez, se encuadra cuando ya se han medido todas las piezas.
  useEffect(() => {
    const { piezas, trazos } = pizarra;
    if (!encuadrada.current && (piezas.length || trazos.length) && piezas.every((p) => tamanos[p.id])) {
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

  const idNuevo = () => nuevoId('d', new Set([...mostrada.piezas.map((x) => x.id), ...mostrada.trazos.map((t) => t.id)]));
  const radio = () => RADIO_BORRADOR / vista.escala;
  const avisarCapa = () =>
    setAviso(activa === CAPA_CLAUDE ? 'La capa de Claude es suya: elige una capa tuya en 📚 Capas para dibujar o escribir.' : 'Todas las capas están ocultas: enseña alguna en 📚 Capas.');

  function actualizarTrazo(mayus: boolean) {
    const g = gesto.current;
    if (g?.tipo !== 'trazo' || !activa) return;
    const t = trazoDeGesto(h, g.id, activa, g.puntos, g.presiones, mayus, 0);
    setProvisional(t ? { tipo: 'trazos', quitar: [], poner: [t] } : null);
  }

  function pasarLaGoma(m: Punto) {
    const g = gesto.current;
    if (g?.tipo !== 'goma' || !activa) return;
    const usados = new Set([...g.goma.trabajo.map((t) => t.id), ...mostrada.trazos.map((t) => t.id)]);
    seguirGoma(g.goma, activa, m, radio(), () => {
      const id = nuevoId('d', usados);
      usados.add(id);
      return id;
    });
    const res = terminarGoma(g.goma);
    setProvisional(res.quitar.length ? { tipo: 'trazos', ...res } : null);
  }

  function alPulsar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('textarea, a') || e.button === 2 || ignorarPuntero(e.pointerType, lapizAbajo.current)) return;
    if (e.pointerType === 'pen') lapizVisto.current = lapizAbajo.current = true;
    marco.current?.focus({ preventScroll: true });
    marco.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    punteros.current.set(e.pointerId, p);
    if (e.pointerType === 'touch') {
      if (punteros.current.size === 1) toque.current = { inicio: e.timeStamp, dedos: 1, movido: 0, origen: new Map() };
      if (toque.current) {
        toque.current.dedos = Math.max(toque.current.dedos, punteros.current.size);
        toque.current.origen.set(e.pointerId, p);
      }
    }
    if (punteros.current.size >= 2) {
      // Dos dedos: zoom y mover. Lo que se estuviera dibujando se descarta.
      const [a, b] = [...punteros.current.values()];
      pinza.current = { d: Math.hypot(a.x - b.x, a.y - b.y), medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      gesto.current = null;
      setProvisional(null);
      setLazo(null);
      return;
    }
    const m = aMundo(vista, p);
    // La rueda del ratón, la barra espaciadora o el dedo cuando hay lápiz: mover la pizarra.
    if (!editable || e.button === 1 || espacio.current || (e.pointerType === 'touch' && lapizVisto.current)) {
      gesto.current = { tipo: 'fondo', desde: p, vista };
      return;
    }
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    switch (h.herramienta) {
      case 'mover': {
        const pieza = el ? vistaPizarra.piezas.find((x) => x.id === el.dataset.pieza) : undefined;
        if (pieza) {
          setSeleccion({ trazos: [], piezas: [pieza.id] });
          gesto.current = { tipo: 'pieza', id: pieza.id, desde: p, origen: { x: pieza.x, y: pieza.y }, movido: false };
        } else {
          setSeleccion(SIN_SELECCION);
          gesto.current = { tipo: 'fondo', desde: p, vista };
        }
        return;
      }
      case 'texto': {
        if (!puedeDibujar) return avisarCapa();
        e.preventDefault();
        const nota = el ? vistaPizarra.piezas.find((x) => x.id === el.dataset.pieza) : undefined;
        if (nota?.tipo === 'nota') setEditando({ id: nota.id, nuevoId: nota.id, x: nota.x, y: nota.y, texto: nota.contenido });
        else setEditando({ id: null, nuevoId: idNuevo(), x: m.x, y: m.y, texto: '' });
        return;
      }
      case 'lazo': {
        if (activa === null) return avisarCapa();
        const caja = cajaDeSeleccion(mostrada, seleccion, rectDe);
        if (caja && m.x >= caja.x && m.x <= caja.x + caja.w && m.y >= caja.y && m.y <= caja.y + caja.h) {
          gesto.current = { tipo: 'mover-seleccion', desde: m, dx: 0, dy: 0 };
          return;
        }
        setSeleccion(SIN_SELECCION);
        gesto.current = { tipo: 'lazo', poligono: [m] };
        setLazo([m]);
        return;
      }
      case 'borrador': {
        if (activa === null) return avisarCapa();
        if (h.borrador === 'trazos') {
          const ids = new Set(trazosTocados(mostrada.trazos, activa, m, radio()));
          gesto.current = { tipo: 'borrar-trazos', ids };
          setProvisional({ tipo: 'trazos', quitar: [...ids], poner: [] });
        } else {
          gesto.current = { tipo: 'goma', goma: empezarGoma(mostrada.trazos, m) };
          pasarLaGoma(m);
        }
        return;
      }
      default: {
        if (!puedeDibujar) return avisarCapa();
        gesto.current = { tipo: 'trazo', id: idNuevo(), puntos: [m], presiones: e.pointerType === 'pen' ? [e.pressure] : null };
        actualizarTrazo(e.shiftKey);
      }
    }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    const p = local(e);
    punteros.current.set(e.pointerId, p);
    const t = toque.current;
    const inicio = t?.origen.get(e.pointerId);
    if (t && inicio) t.movido = Math.max(t.movido, Math.hypot(p.x - inicio.x, p.y - inicio.y));
    if (pinza.current && punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const antes = pinza.current;
      setVista((v) => {
        const z = zoomEn(v, d / antes.d, medio);
        return { ...z, x: z.x + medio.x - antes.medio.x, y: z.y + medio.y - antes.medio.y };
      });
      pinza.current = { d, medio };
      return;
    }
    const g = gesto.current;
    if (!g) return;
    const m = aMundo(vista, p);
    switch (g.tipo) {
      case 'fondo':
        setVista({ ...g.vista, x: g.vista.x + p.x - g.desde.x, y: g.vista.y + p.y - g.desde.y });
        return;
      case 'pieza': {
        const dx = p.x - g.desde.x;
        const dy = p.y - g.desde.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) g.movido = true;
        if (g.movido) setPosiciones((ps) => ({ ...ps, [g.id]: { x: g.origen.x + dx / vista.escala, y: g.origen.y + dy / vista.escala } }));
        return;
      }
      case 'trazo': {
        // Con el lápiz llegan varios puntos por evento: se usan todos para que el trazo salga suave.
        const juntos = e.nativeEvent.getCoalescedEvents?.();
        for (const ev of juntos && juntos.length ? juntos : [e.nativeEvent]) {
          g.puntos.push(aMundo(vista, local(ev)));
          if (g.presiones) g.presiones.push(ev.pressure);
        }
        actualizarTrazo(e.shiftKey);
        return;
      }
      case 'borrar-trazos':
        if (!activa) return;
        for (const id of trazosTocados(mostrada.trazos, activa, m, radio())) g.ids.add(id);
        setProvisional({ tipo: 'trazos', quitar: [...g.ids], poner: [] });
        return;
      case 'goma':
        pasarLaGoma(m);
        return;
      case 'lazo':
        g.poligono.push(m);
        setLazo([...g.poligono]);
        return;
      case 'mover-seleccion':
        g.dx = m.x - g.desde.x;
        g.dy = m.y - g.desde.y;
        setProvisional(moverSeleccion(mostrada, seleccion, g.dx, g.dy));
        return;
    }
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    if (e.pointerType === 'pen') lapizAbajo.current = false;
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    const t = toque.current;
    if (t && punteros.current.size === 0) {
      toque.current = null;
      const accion = toqueMultiple(t.dedos, e.timeStamp - t.inicio, t.movido);
      if (accion) {
        if (accion === 'deshacer') ed.deshacer();
        else ed.rehacer();
        gesto.current = null;
        setProvisional(null);
        return;
      }
    }
    const g = gesto.current;
    if (!g || punteros.current.size > 0) return;
    gesto.current = null;
    switch (g.tipo) {
      case 'pieza':
        if (g.movido) {
          const pos = posiciones[g.id];
          if (pos) ed.hacer({ tipo: 'mover', id: g.id, x: pos.x, y: pos.y });
        }
        return;
      case 'trazo': {
        setProvisional(null);
        const tr = activa ? trazoDeGesto(h, g.id, activa, g.puntos, g.presiones, e.shiftKey) : null;
        if (tr) ed.hacer({ tipo: 'trazos', quitar: [], poner: [tr] });
        return;
      }
      case 'borrar-trazos':
        setProvisional(null);
        if (g.ids.size) ed.hacer({ tipo: 'trazos', quitar: [...g.ids], poner: [] });
        return;
      case 'goma': {
        setProvisional(null);
        const r = terminarGoma(g.goma);
        if (r.quitar.length) ed.hacer({ tipo: 'trazos', ...r });
        return;
      }
      case 'lazo':
        setLazo(null);
        if (activa) setSeleccion(seleccionarConLazo(mostrada, activa, g.poligono, rectDe));
        return;
      case 'mover-seleccion':
        setProvisional(null);
        if (g.dx || g.dy) ed.hacer(moverSeleccion(mostrada, seleccion, g.dx, g.dy));
        return;
      default:
        return;
    }
  }

  function alCancelar(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    if (e.pointerType === 'pen') lapizAbajo.current = false;
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    toque.current = null;
    gesto.current = null;
    setProvisional(null);
    setLazo(null);
  }

  function alDobleClic(e: MouseEvent<HTMLDivElement>) {
    if (!editable || h.herramienta !== 'mover') return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    if (el) {
      const p = mostrada.piezas.find((x) => x.id === el.dataset.pieza);
      if (p?.tipo === 'nota') setEditando({ id: p.id, nuevoId: p.id, x: p.x, y: p.y, texto: p.contenido });
      return;
    }
    if (!puedeDibujar) return avisarCapa();
    const m = aMundo(vista, local(e));
    setEditando({ id: null, nuevoId: idNuevo(), x: m.x, y: m.y, texto: '' });
  }

  function terminarNota() {
    const nota = editando;
    setEditando(null);
    if (!nota) return;
    const texto = nota.texto.trim();
    if (!texto) {
      if (nota.id) ed.hacer({ tipo: 'borrar', id: nota.id });
      return;
    }
    const antes = mostrada.piezas.find((x) => x.id === nota.id);
    if (antes?.tipo === 'nota' && antes.contenido === texto) return;
    ed.hacer({ tipo: 'nota', id: nota.id, nuevoId: nota.nuevoId, x: nota.x, y: nota.y, contenido: texto, capa: puedeDibujar ? activa! : undefined });
  }

  function borrarSel() {
    if (!haySeleccion(seleccion)) return;
    ed.hacer(borrarSeleccion(seleccion));
    setSeleccion(SIN_SELECCION);
  }

  function copiarSel() {
    const r = copiar(mostrada, seleccion, origen, clave);
    if (!r) return;
    guardarRecorte(r);
    setHayRecorte(true);
  }

  function cortarSel() {
    copiarSel();
    borrarSel();
  }

  function pegarAqui() {
    const r = leerRecorte();
    if (!r) return;
    if (!puedeDibujar || !activa) return avisarCapa();
    const m = marco.current;
    // Si viene de otra pizarra, se pega en el centro de lo que se ve.
    const centroVista = m && r.clave !== clave ? aMundo(vista, { x: m.clientWidth / 2, y: m.clientHeight / 2 }) : null;
    const res = pegar(r, mostrada, activa, origen, centroVista);
    if ('error' in res) {
      setAviso(res.error);
      return;
    }
    ed.hacer(res.op);
    setSeleccion(res.seleccion);
  }

  function alTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (editando) return;
    if (e.key === ' ') {
      espacio.current = true;
      e.preventDefault();
      return;
    }
    if (!editable) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const atajos: Record<string, () => void> = {
      z: () => (e.shiftKey ? ed.rehacer() : ed.deshacer()),
      y: ed.rehacer,
      c: copiarSel,
      x: cortarSel,
      v: pegarAqui,
    };
    if (ctrl && atajos[k]) {
      e.preventDefault();
      atajos[k]();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && haySeleccion(seleccion)) {
      e.preventDefault();
      borrarSel();
    }
  }

  const crearCapa = () => {
    const r = opCrearCapa(mostrada, activa ?? CAPA_CLAUDE);
    ed.hacer(r.op);
    ed.elegir(r.id);
  };
  const duplicarCapa = (id: string) => {
    const r = opDuplicarCapa(mostrada, id);
    if (!r) return;
    ed.hacer(r.op);
    ed.elegir(r.id);
  };
  const moverCapa = (id: string, delta: 1 | -1) => {
    const op = opMoverCapa(mostrada, id, delta);
    if (op) ed.hacer(op);
  };
  async function borrarCapa(id: string) {
    const capa = mostrada.capas.find((c) => c.id === id);
    if (!capa || id === CAPA_CLAUDE) return;
    const cuantos = mostrada.piezas.filter((x) => x.capa === id).length + mostrada.trazos.filter((t) => t.capa === id).length;
    if (cuantos && !(await confirmar(`¿Borrar la capa «${capa.nombre}» con todo lo que tiene (${cuantos})? Puedes deshacerlo.`, { aceptar: 'Borrar', peligro: true })))
      return;
    ed.hacer({ tipo: 'capa', accion: 'borrar', id });
  }
  async function renombrarCapa(id: string) {
    const capa = mostrada.capas.find((c) => c.id === id);
    if (!capa || id === CAPA_CLAUDE) return;
    const nombre = await pedirTexto('Nombre de la capa', { inicial: capa.nombre });
    if (nombre && nombre !== capa.nombre) ed.hacer({ tipo: 'capa', accion: 'renombrar', id, nombre });
  }

  const grupos = porCapas(vistaPizarra.capas, vistaPizarra.piezas.filter((p) => p.id !== editando?.id), vistaPizarra.trazos, ed.ocultas);
  const visibles = new Set(grupos.flatMap((g) => g.piezas.map((x) => x.id)));
  const porId = new Map(vistaPizarra.piezas.map((p) => [p.id, p]));
  const cajaSel = h.herramienta === 'lazo' && haySeleccion(seleccion) ? cajaDeSeleccion(vistaPizarra, seleccion, rectDe) : null;
  const vacia = vistaPizarra.piezas.length === 0 && vistaPizarra.trazos.length === 0 && !editando;

  return (
    <div className="pizarra">
      {editable && (
        <BarraHerramientas
          estado={h}
          cambiar={ed.setHerramientas}
          enClaude={activa === CAPA_CLAUDE}
          puedeDeshacer={ed.puedeDeshacer}
          puedeRehacer={ed.puedeRehacer}
          deshacer={ed.deshacer}
          rehacer={ed.rehacer}
          haySeleccion={haySeleccion(seleccion)}
          hayRecorte={hayRecorte}
          copiar={copiarSel}
          cortar={cortarSel}
          pegar={pegarAqui}
          capasAbiertas={capasAbiertas}
          alternarCapas={() => setCapasAbiertas((a) => !a)}
        />
      )}
      <div className="zona-lienzo">
        <div
          ref={marco}
          className={`lienzo${editable && h.herramienta !== 'mover' ? ' dibujando' : ''}`}
          tabIndex={0}
          onPointerDown={alPulsar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          onDoubleClick={alDobleClic}
          onKeyDown={alTecla}
          onKeyUp={(e) => {
            if (e.key === ' ') espacio.current = false;
          }}
        >
          <div className="mundo" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}>
            <svg className="flechas" width="1" height="1" overflow="visible">
              <defs>
                <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#8b7b6a" />
                </marker>
              </defs>
              {vistaPizarra.flechas.map((f) => {
                const de = porId.get(f.de);
                const a = porId.get(f.a);
                if (!de || !a || !visibles.has(f.de) || !visibles.has(f.a)) return null;
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
            {grupos.map((g) => (
              <Fragment key={g.capa.id}>
                {g.piezas.map((p) => {
                  const pos = posiciones[p.id] ?? p;
                  return <PiezaPizarra key={p.id} pieza={p} x={pos.x} y={pos.y} seleccionada={seleccion.piezas.includes(p.id)} imagen={imagen} alMedir={medir} />;
                })}
                <CapaTinta subrayados={g.subrayados} trazos={g.trazos} />
              </Fragment>
            ))}
            {(lazo || cajaSel) && (
              <svg className="tinta guias" width="1" height="1" overflow="visible" aria-hidden>
                {lazo && <polygon className="lazo" points={lazo.map((q) => `${q.x},${q.y}`).join(' ')} vectorEffect="non-scaling-stroke" />}
                {cajaSel && (
                  <rect className="caja-seleccion" x={cajaSel.x - 4} y={cajaSel.y - 4} width={cajaSel.w + 8} height={cajaSel.h + 8} vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            )}
            {editando && (
              <textarea
                className="editor-nota"
                autoFocus
                style={{ left: editando.x, top: editando.y }}
                value={editando.texto}
                placeholder="Escribe… (Ctrl+Enter para terminar)"
                onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                onBlur={terminarNota}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditando(null);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) terminarNota();
                }}
              />
            )}
          </div>
          {aviso && <p className="aviso-herramienta" role="status">{aviso}</p>}
          {vacia && (
            <p className="pizarra-vacia">
              {editable ? 'Pizarra en blanco. Pídele a Claude que te lo explique aquí, dibuja con ✏️ o escribe con T.' : 'Esta pizarra está vacía.'}
            </p>
          )}
        </div>
        {capasAbiertas && (
          <PanelCapas
            capas={mostrada.capas}
            activa={activa}
            ocultas={ed.ocultas}
            bloqueado={!editable}
            elegir={ed.elegir}
            alternar={ed.alternarOculta}
            crear={crearCapa}
            borrar={(id) => void borrarCapa(id)}
            renombrar={(id) => void renombrarCapa(id)}
            duplicar={duplicarCapa}
            mover={moverCapa}
            cerrar={() => setCapasAbiertas(false)}
          />
        )}
      </div>
      <div className="controles-pizarra">
        <button onClick={verTodo}>Ver todo</button>
        <button onClick={() => zoomCentro(1 / 1.2)} aria-label="Alejar">−</button>
        <button onClick={() => zoomCentro(1.2)} aria-label="Acercar">+</button>
        {!editable && <button className={capasAbiertas ? 'encendida' : ''} onClick={() => setCapasAbiertas((a) => !a)}>📚 Capas</button>}
        {editable && haySeleccion(seleccion) && <button className="peligro" onClick={borrarSel}>🗑 Borrar</button>}
        <span className="hueco" />
        {children}
      </div>
    </div>
  );
}
