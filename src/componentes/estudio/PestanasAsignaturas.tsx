import type { Asignatura } from '../../datos/asignaturas';
import { GENERAL } from '../../datos/asignaturas';

interface Props {
  asignaturas: Asignatura[];
  actual: string;
  bloqueado: boolean;
  alElegir(id: string): void;
  alNueva(): void;
  alEditar(a: Asignatura): void;
}

export function PestanasAsignaturas({ asignaturas, actual, bloqueado, alElegir, alNueva, alEditar }: Props) {
  return (
    <div className="pestanas-asignaturas">
      {asignaturas.map((a) => (
        <button key={a.id} className={`pastilla${a.id === actual ? ' encendida' : ''}`} onClick={() => alElegir(a.id)}>
          <span className="punto" style={{ background: a.color }} />
          {a.nombre}
          {a.id === actual && a.id !== GENERAL.id && !bloqueado && (
            <span
              className="editar-asignatura"
              role="button"
              aria-label={`Editar ${a.nombre}`}
              onClick={(e) => {
                e.stopPropagation();
                alEditar(a);
              }}
            >
              ✎
            </span>
          )}
        </button>
      ))}
      <button className="pastilla" disabled={bloqueado} onClick={alNueva}>+ asignatura</button>
    </div>
  );
}
