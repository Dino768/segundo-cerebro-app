import { useState, type FormEvent } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import type { Suelta } from '../../datos/horario';
import type { ISODate } from '../../fechas';

interface Props {
  asignaturas: Asignatura[];
  dia: ISODate;
  error?: string | null; // el último intento no se ha guardado: el formulario sigue abierto con lo escrito
  guardar(s: Suelta): void;
  cerrar(): void;
}

// Una clase que no está en el horario de la URJC (p. ej. una recuperación que avisa el profe).
export function FormClaseSuelta({ asignaturas, dia, error, guardar, cerrar }: Props) {
  const [asignatura, setAsignatura] = useState(asignaturas[0]?.id ?? '');
  const [fecha, setFecha] = useState(dia);
  const [inicio, setInicio] = useState('09:00');
  const [fin, setFin] = useState('11:00');
  const [aula, setAula] = useState('');
  const [nota, setNota] = useState('');
  const valido = Boolean(asignatura && fecha && inicio && fin && inicio < fin);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    guardar({ fecha, inicio, fin, asignatura, ...(aula.trim() ? { aula: aula.trim() } : {}), ...(nota.trim() ? { nota: nota.trim() } : {}) });
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={enviar}>
        <h2>Clase suelta</h2>
        <label>
          Asignatura
          <select value={asignatura} onChange={(e) => setAsignatura(e.target.value)} required>
            {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label>Día <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></label>
        <label>Empieza <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label>
        <label>Acaba <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} required /></label>
        <label>Aula (opcional) <input value={aula} onChange={(e) => setAula(e.target.value)} maxLength={80} /></label>
        <label>Nota (opcional) <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Recuperación" /></label>
        {error && <div className="banner error">{error}</div>}
        <div className="botones">
          <button type="submit" className="activa" disabled={!valido}>Guardar</button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
