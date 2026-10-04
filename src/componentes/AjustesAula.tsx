import { useCallback, useEffect, useState } from 'react';
import { activarAula, entrarAula, estadoAula, revisarAula, type EstadoAulaLocal } from '../estudio/local';
import { useLocal } from '../estudio/useLocal';
import { formatoCorto } from '../fechas';

export function TextoEstadoAula({ e }: { e: EstadoAulaLocal }) {
  if (e.revisando) return <p>Revisando el aula virtual…</p>;
  const s = e.estado;
  return (
    <>
      {s.resultado === 'necesita-entrar' && <p className="banner aviso">Vuelve a entrar en el aula virtual: la URJC ha cerrado la sesión.</p>}
      {s.resultado === 'error' && s.mensaje && <p className="banner error">La última revisión falló: {s.mensaje}</p>}
      <p>
        {s.ultimaRevision
          ? <>Última revisión: {formatoCorto(s.ultimaRevision.slice(0, 10))} · {s.ultimaRevision.slice(11, 16)}{s.resultado === 'ok' && s.mensaje ? ` · ${s.mensaje}` : ''}</>
          : 'Todavía no ha revisado el aula virtual.'}
      </p>
    </>
  );
}

// Solo en la zona de estudio del PC (con el programa local abierto).
export function AjustesAula() {
  const local = useLocal();
  const [e, setE] = useState<EstadoAulaLocal | null>(null);
  const [entrando, setEntrando] = useState(false);
  const refrescar = useCallback(() => estadoAula().then(setE).catch(() => setE(null)), []);

  useEffect(() => {
    if (local.estado !== 'si') return;
    void refrescar();
    const t = setInterval(() => void refrescar(), 5000);
    return () => clearInterval(t);
  }, [local.estado, refrescar]);

  if (local.estado !== 'si' || !e) return null;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Aula virtual</h2>
      <label className="casilla">
        <input type="checkbox" checked={e.activo} onChange={(x) => void activarAula(x.target.checked).then(refrescar)} />
        Este ordenador revisa el aula virtual (una vez al día)
      </label>
      <TextoEstadoAula e={e} />
      <div className="botones">
        <button disabled={e.revisando || !e.activo} onClick={() => void revisarAula().then(refrescar)}>Revisar ahora</button>
        <button disabled={entrando} onClick={() => { setEntrando(true); void entrarAula().finally(() => { setEntrando(false); void refrescar(); }); }}>
          {entrando ? 'Esperando a que entres en la ventana…' : 'Entrar al aula virtual'}
        </button>
      </div>
      <p className="detalle">Se abre una ventana de Chrome aparte: entra como siempre y marca «No solicitar de nuevo el doble factor en este dispositivo». Tu contraseña no se guarda.</p>
    </section>
  );
}
