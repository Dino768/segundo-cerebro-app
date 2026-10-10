import { useState } from 'react';
import { AulaVirtual } from '../componentes/estudio/AulaVirtual';
import { ChatsCompartidos } from '../componentes/estudio/ChatsCompartidos';
import { EstudioLocal } from '../componentes/estudio/EstudioLocal';
import { FormAsignatura } from '../componentes/estudio/FormAsignatura';
import { Historial } from '../componentes/estudio/Historial';
import { PestanasAsignaturas } from '../componentes/estudio/PestanasAsignaturas';
import { GENERAL, type Asignatura } from '../datos/asignaturas';
import { guardarPreferencia, leerPreferencia } from '../estudio/preferencias';
import { useLocal } from '../estudio/useLocal';
import { useDatos } from '../estado/datos';

const CLAVE = 'sc-estudio-asignatura';

export function Estudio({ aulaInicial = false, asignaturaInicial }: { aulaInicial?: boolean; asignaturaInicial?: string }) {
  const { datos, soloLectura } = useDatos();
  const local = useLocal();
  const asignaturas = [GENERAL, ...datos.asignaturas];
  const [elegida, setElegida] = useState(() => asignaturaInicial ?? (aulaInicial ? GENERAL.id : (leerPreferencia(CLAVE) ?? GENERAL.id)));
  const [vista, setVista] = useState<'chat' | 'aula'>(aulaInicial || asignaturaInicial ? 'aula' : 'chat');
  const [form, setForm] = useState<Asignatura | 'nueva' | null>(null);
  const asignatura = asignaturas.find((a) => a.id === elegida) ?? GENERAL;

  const conAula = Boolean(asignatura.codigo) || asignatura.id === GENERAL.id;
  const verAula = conAula && vista === 'aula';

  const elegir = (id: string) => {
    setElegida(id);
    guardarPreferencia(CLAVE, id);
  };

  return (
    <section className="estudio">
      <div className="barra">
        <h2>Estudio</h2>
      </div>
      <PestanasAsignaturas
        asignaturas={asignaturas}
        actual={asignatura.id}
        bloqueado={soloLectura}
        alElegir={elegir}
        alNueva={() => setForm('nueva')}
        alEditar={(a) => setForm(a)}
      />
      {conAula && (
        <div className="pestanas" role="tablist">
          <button role="tab" aria-selected={vista === 'chat'} className={vista === 'chat' ? 'activa' : ''} onClick={() => setVista('chat')}>💬 Chat y pizarras</button>
          <button role="tab" aria-selected={vista === 'aula'} className={vista === 'aula' ? 'activa' : ''} onClick={() => setVista('aula')}>🎓 Aula virtual</button>
        </div>
      )}
      {verAula && <AulaVirtual key={asignatura.id} asignatura={asignatura} enPc={local.estado === 'si'} />}
      {!verAula && local.estado === 'comprobando' && <p className="cargando">Buscando el programa local…</p>}
      {!verAula && local.estado === 'si' && <EstudioLocal key={asignatura.id} asignatura={asignatura} local={local} />}
      {!verAula && (local.estado === 'no' || local.estado === 'cerrado' || local.estado === 'antiguo') && (
        <>
          <div className="banner aviso">
            {local.estado === 'antiguo'
              ? 'El programa local sigue abierto desde antes de la última actualización. Ciérralo (en su ventana, Ctrl+C) y vuelve a abrirlo con npm run local.'
              : local.estado === 'cerrado'
                ? 'El programa local se ha cerrado. Vuelve a abrirlo (npm run local) para seguir con el chat.'
                : 'El chat solo está disponible en tu PC.'}
          </div>
          <Historial key={asignatura.id} asignatura={asignatura} />
          <ChatsCompartidos key={`chats-${asignatura.id}`} asignatura={asignatura} />
        </>
      )}
      {form && (
        <FormAsignatura asignatura={form === 'nueva' ? null : form} cerrar={() => setForm(null)} alQuitar={() => elegir(GENERAL.id)} />
      )}
    </section>
  );
}
