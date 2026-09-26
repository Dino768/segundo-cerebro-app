import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { aplicarEvento } from '../../estudio/chat';
import { useDatos } from '../../estado/datos';
import { confirmar, pedirTexto } from '../../estado/dialogos';
import { useHoy } from '../../estado/hoy';
import { guardarYMarcar } from '../../estudio/guardado';
import type { EntradaHistorial } from '../../estudio/historial';
import { subirAlHistorial } from '../../estudio/historialRemoto';
import {
  borrarPizarra, enviarMensaje, leerArchivoBase64, leerConversacion, leerPizarras, listarConversaciones, nuevaPizarra, operarPizarra, pararRespuesta,
  urlArchivo,
} from '../../estudio/local';
import type { Operacion } from '../../estudio/pizarra';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';
import type { EstadoPizarra, Mensaje } from '../../estudio/tipos';
import type { useLocal } from '../../estudio/useLocal';
import { Chat, type ErrorChat } from './Chat';
import { VisorHistorial } from './Historial';
import { ListaConversaciones } from './ListaConversaciones';
import { Pizarra } from './Pizarra';

interface Props {
  asignatura: Asignatura;
  local: ReturnType<typeof useLocal>;
}

interface Conversacion {
  id: string;
  nueva: boolean;
}

const claveUltima = (asig: string) => `sc-estudio-conversacion-${asig}`;
const CLAVE_ANCHO = 'sc-estudio-ancho-chat';

export function EstudioLocal({ asignatura, local }: Props) {
  const [vista, setVista] = useState<'chat' | 'lista'>('chat');
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorChat | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<{ texto: string; imagenes: string[] } | null>(null);
  const [pizarras, setPizarras] = useState<EstadoPizarra[]>([]);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [avisoPizarra, setAvisoPizarra] = useState<string | null>(null);
  const [anchoChat, setAnchoChat] = useState(() => Number(leerPreferencia(CLAVE_ANCHO)) || 36);
  const contenedor = useRef<HTMLDivElement>(null);
  const cuantas = useRef(0);
  const { config } = useDatos();
  const hoy = useHoy();
  const [historialAbierto, setHistorialAbierto] = useState<EntradaHistorial | null>(null);
  const [guardado, setGuardado] = useState<Record<number, 'subiendo' | 'pendiente' | 'hecho'>>({});
  const subiendo = useRef(new Set<number>());
  const pendientes = useRef(new Map<number, string>());
  // Ruta del historial de cada pizarra ya subida, para que un reintento actualice el mismo archivo.
  const rutasSubidas = useRef(new Map<number, string>());

  const recargarPizarras = useCallback(async (id: string) => {
    const lista = await leerPizarras(asignatura.id, id).catch(() => null);
    if (!lista) return;
    setPizarras(lista);
    // Si Claude crea una pizarra nueva, se abre sola.
    if (lista.length > cuantas.current) setAbierta(lista.at(-1)!.n);
    cuantas.current = lista.length;
  }, [asignatura.id]);

  const abrir = useCallback(
    async (id: string) => {
      setVista('chat');
      setError(null);
      const ms = await leerConversacion(asignatura.id, id).catch(() => [] as Mensaje[]);
      setConv({ id, nueva: ms.length === 0 });
      setMensajes(ms);
      cuantas.current = 0;
      setPizarras([]);
      setAbierta(null);
      guardarPreferencia(claveUltima(asignatura.id), id);
      await recargarPizarras(id);
    },
    [asignatura.id, recargarPizarras],
  );

  const nueva = useCallback(() => {
    setVista('chat');
    setError(null);
    setMensajes([]);
    setPizarras([]);
    setAbierta(null);
    cuantas.current = 0;
    setConv({ id: crypto.randomUUID(), nueva: true });
  }, []);

  useEffect(() => {
    const ultima = leerPreferencia(claveUltima(asignatura.id));
    listarConversaciones(asignatura.id)
      .then((lista) => (ultima && lista.some((c) => c.id === ultima) ? abrir(ultima) : nueva()))
      .catch(nueva);
  }, [asignatura.id, abrir, nueva]);

  // Avisos del programa local: una pizarra de esta conversación ha cambiado.
  const { suscribir } = local;
  const idConv = conv?.id;
  useEffect(() => {
    if (!idConv) return;
    return suscribir((e) => {
      if (e.asignatura === asignatura.id && e.conversacion === idConv) void recargarPizarras(idConv);
    });
  }, [suscribir, idConv, asignatura.id, recargarPizarras]);

  async function enviar(texto: string, imagenes: string[]) {
    if (!conv || enviando) return;
    setUltimoEnvio({ texto, imagenes });
    setError(null);
    setEnviando(true);
    setMensajes((ms) => [...ms, imagenes.length ? { rol: 'diego', texto, imagenes } : { rol: 'diego', texto }]);
    await enviarMensaje(
      { asignatura: asignatura.id, id: conv.id, nueva: conv.nueva, texto, imagenes, pizarraAbierta: abierta },
      (e) => {
        if (e.tipo === 'error') setError({ mensaje: e.mensaje, uso: e.uso });
        else setMensajes((ms) => aplicarEvento(ms, e));
      },
    );
    setEnviando(false);
    const guardados = await leerConversacion(asignatura.id, conv.id).catch(() => [] as Mensaje[]);
    if (guardados.length) {
      setMensajes(guardados);
      setConv({ id: conv.id, nueva: false });
      guardarPreferencia(claveUltima(asignatura.id), conv.id);
    }
    await recargarPizarras(conv.id);
  }

  // Devuelve si se pudo aplicar (para que el guardado sepa si quedó marcado).
  async function operar(n: number, op: Operacion): Promise<boolean> {
    if (!conv) return false;
    try {
      const p = await operarPizarra(asignatura.id, conv.id, n, op);
      setPizarras((ps) => ps.map((e) => (e.n === n ? { ...e, pizarra: p, error: null } : e)));
      return true;
    } catch (e) {
      setAvisoPizarra(e instanceof Error ? e.message : String(e));
      await recargarPizarras(conv.id);
      return false;
    }
  }

  async function crearPizarra() {
    if (!conv) return;
    const n = await nuevaPizarra(asignatura.id, conv.id).catch(() => null);
    if (n !== null) {
      await recargarPizarras(conv.id);
      setAbierta(n);
    }
  }

  // La línea entre el chat y la pizarra se puede arrastrar.
  function arrastrarSeparador(e: PointerEvent<HTMLDivElement>) {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const mover = (ev: globalThis.PointerEvent) => {
      const pct = Math.min(70, Math.max(20, ((ev.clientX - caja.left) / caja.width) * 100));
      setAnchoChat(pct);
    };
    const soltar = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      guardarPreferencia(CLAVE_ANCHO, String(Math.round(Math.min(70, Math.max(20, ((ev.clientX - caja.left) / caja.width) * 100)))));
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  async function guardarEnHistorial(n: number, titulo: string) {
    const estado = pizarras.find((e) => e.n === n);
    if (!config || !conv || !estado?.pizarra || subiendo.current.has(n)) return;
    subiendo.current.add(n);
    setGuardado((g) => ({ ...g, [n]: 'subiendo' }));
    const r = await guardarYMarcar(estado.pizarra, rutasSubidas.current.get(n) ?? null, {
      subir: (p) => subirAlHistorial(config, asignatura.id, p, titulo, hoy, (ruta) => leerArchivoBase64(asignatura.id, conv.id, ruta)),
      marcar: (ruta) => operar(n, { tipo: 'guardada', ruta }),
    });
    if (r.ruta) rutasSubidas.current.set(n, r.ruta);
    if (r.estado === 'hecho') pendientes.current.delete(n);
    else pendientes.current.set(n, titulo);
    setGuardado((g) => ({ ...g, [n]: r.estado }));
    subiendo.current.delete(n);
  }

  async function pedirTitulo(n: number) {
    const p = pizarras.find((e) => e.n === n)?.pizarra;
    const titulo = await pedirTexto('Título de la pizarra', { inicial: p?.titulo ?? '' });
    if (titulo) void guardarEnHistorial(n, titulo);
  }

  // Borra la pizarra de esta conversación; la copia del historial, si la hay, se queda.
  async function quitarPizarra(n: number) {
    if (!conv || enviando) return;
    const guardada = pizarras.find((e) => e.n === n)?.pizarra?.guardadaEn;
    const aviso = guardada ? ' La copia guardada en el historial se queda.' : '';
    if (!(await confirmar(`¿Borrar la pizarra ${n}?${aviso}`, { aceptar: 'Borrar', peligro: true }))) return;
    try {
      await borrarPizarra(asignatura.id, conv.id, n);
    } catch (e) {
      setAvisoPizarra(e instanceof Error ? e.message : String(e));
      return;
    }
    // Una pizarra nueva podría volver a usar este número: que no herede su estado de guardado.
    rutasSubidas.current.delete(n);
    pendientes.current.delete(n);
    setGuardado(({ [n]: _, ...resto }) => resto);
    if (abierta === n) setAbierta(null);
    await recargarPizarras(conv.id);
  }

  // Si Claude ha pedido guardar una pizarra (guardarComo), se sube sola.
  useEffect(() => {
    for (const e of pizarras)
      if (e.pizarra?.guardarComo && !subiendo.current.has(e.n) && guardado[e.n] !== 'pendiente') void guardarEnHistorial(e.n, e.pizarra.guardarComo);
  });

  // Cuando vuelve internet, se reintenta lo pendiente.
  useEffect(() => {
    const reintentar = () => pendientes.current.forEach((titulo, n) => void guardarEnHistorial(n, titulo));
    window.addEventListener('online', reintentar);
    return () => window.removeEventListener('online', reintentar);
  });

  const textoGuardar = (n: number, guardadaEn: string | null) =>
    guardado[n] === 'subiendo' ? 'Guardando…'
      : guardado[n] === 'pendiente' ? 'Pendiente de subir (reintentar)'
        : guardadaEn ? 'Guardada ✓ (actualizar)'
          : 'Guardar en el historial ⤓';

  if (!conv) return <p className="cargando">Cargando…</p>;

  if (historialAbierto)
    return (
      <div className="estudio-local sin-pizarra">
        <VisorHistorial asignatura={asignatura} entrada={historialAbierto} alVolver={() => setHistorialAbierto(null)} />
      </div>
    );

  const actual = pizarras.find((e) => e.n === abierta) ?? pizarras.at(-1) ?? null;
  const conPizarra = pizarras.length > 0;
  const imagen = (ruta: string) => Promise.resolve(urlArchivo(asignatura.id, conv.id, ruta));

  return (
    <div
      ref={contenedor}
      className={`estudio-local ${conPizarra ? 'con-pizarra' : 'sin-pizarra'}`}
      style={conPizarra ? { gridTemplateColumns: `${anchoChat}% 6px minmax(0, 1fr)` } : undefined}
    >
      {vista === 'lista' ? (
        <ListaConversaciones
          asignatura={asignatura}
          alAbrir={(id) => void abrir(id)}
          alNueva={nueva}
          alVolver={() => setVista('chat')}
          alAbrirHistorial={setHistorialAbierto}
        />
      ) : (
        <Chat
          asignatura={asignatura.id}
          conversacion={conv.id}
          titulo={mensajes.find((m) => m.rol === 'diego')?.texto.slice(0, 60) ?? ''}
          mensajes={mensajes}
          enviando={enviando}
          error={error}
          alEnviar={(t, i) => void enviar(t, i)}
          alParar={() => void pararRespuesta(asignatura.id, conv.id).catch(() => undefined)}
          alReintentar={() => ultimoEnvio && void enviar(ultimoEnvio.texto, ultimoEnvio.imagenes)}
          alVerLista={() => setVista('lista')}
          alNueva={nueva}
        />
      )}
      {conPizarra && (
        <>
          <div className="separador" onPointerDown={arrastrarSeparador} role="separator" aria-label="Cambiar el ancho del chat" />
          <div className="zona-pizarra">
            <div className="pestanas-pizarra">
              {pizarras.map((e) => (
                <span key={e.n} className={`pestana-pizarra${e.n === actual?.n ? ' encendida' : ''}`}>
                  <button onClick={() => setAbierta(e.n)}>
                    {e.pizarra?.titulo && e.pizarra.titulo !== `Pizarra ${e.n}` ? `${e.n}. ${e.pizarra.titulo}` : `Pizarra ${e.n}`}
                  </button>
                  <button
                    className="cerrar-pizarra"
                    disabled={enviando}
                    title={enviando ? 'Espera a que Claude termine de contestar' : `Borrar la pizarra ${e.n}`}
                    aria-label={`Borrar la pizarra ${e.n}`}
                    onClick={() => void quitarPizarra(e.n)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button onClick={() => void crearPizarra()}>+ nueva</button>
            </div>
            {actual?.error && (
              <div className="banner aviso aviso-pizarra">
                ⚠️ Esta pizarra tiene un error ({actual.error}). {actual.pizarra ? 'Ves la última versión buena.' : ''}
              </div>
            )}
            {avisoPizarra && (
              <div className="banner error aviso-pizarra">{avisoPizarra} <button onClick={() => setAvisoPizarra(null)}>Cerrar</button></div>
            )}
            {actual?.pizarra ? (
              <Pizarra
                key={`${conv.id}-${actual.n}`}
                pizarra={actual.pizarra}
                imagen={imagen}
                alOperar={(op) => operar(actual.n, op)}
                clave={`local-${asignatura.id}-${conv.id}-${actual.n}`}
                origen={`local:${asignatura.id}:${conv.id}`}
              >
                <button
                  className={actual.pizarra.guardadaEn && guardado[actual.n] !== 'pendiente' ? '' : 'principal'}
                  disabled={!config || guardado[actual.n] === 'subiendo'}
                  onClick={() => void pedirTitulo(actual.n)}
                >
                  {textoGuardar(actual.n, actual.pizarra.guardadaEn)}
                </button>
              </Pizarra>
            ) : (
              <p className="cargando">Esperando a que la pizarra esté lista…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
