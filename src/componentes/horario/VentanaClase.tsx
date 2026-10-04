import { horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { formatoLargo } from '../../fechas';
import { datosAsignatura } from './colores';

interface Props {
  clase: ClaseDelDia;
  asignaturas: Asignatura[];
  bloqueado: boolean; // sin conexión o sin token: no se puede cambiar nada
  alAbrir(): void;
  alQuitar(): void;
  alPoner(): void;
  alBorrar(): void;
  cerrar(): void;
}

export function VentanaClase({ clase, asignaturas, bloqueado, alAbrir, alQuitar, alPoner, alBorrar, cerrar }: Props) {
  const { nombre, color } = datosAsignatura(asignaturas, clase.asignatura);
  return (
    <div className="fondo-modal" onClick={cerrar}>
      <div className="modal" role="dialog" aria-label={nombre} onClick={(e) => e.stopPropagation()}>
        <h2><span className="punto" style={{ background: color }} /> {nombre}</h2>
        <p>
          {`${formatoLargo(clase.fecha)} · ${horaBonita(clase.inicio)} – ${horaBonita(clase.fin)}`}
          {clase.quitada && <strong> · No hay clase</strong>}
        </p>
        {clase.aula && <p>📍 {clase.aula}</p>}
        {clase.profesor && <p>👤 {clase.profesor}</p>}
        {clase.desdoble && <p>{`Desdoble ${clase.desdoble}`}</p>}
        {clase.nota && <p>📝 {clase.nota}</p>}
        <div className="botones">
          <button className="activa" onClick={alAbrir}>Abrir asignatura</button>
          {clase.suelta ? (
            <button className="peligro" disabled={bloqueado} onClick={alBorrar}>Borrar clase suelta</button>
          ) : clase.quitada ? (
            <button disabled={bloqueado} onClick={alPoner}>Sí hay clase</button>
          ) : (
            <button disabled={bloqueado} onClick={alQuitar}>No hay clase este día</button>
          )}
          <button onClick={cerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
