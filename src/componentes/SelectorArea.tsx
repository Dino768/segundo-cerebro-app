import { buscarArea, opcionesDeArea } from '../agenda/areas';
import type { Area } from '../datos/areas';

interface Props {
  areas: Area[];
  valor: string;
  cambiar(id: string): void;
  ninguna?: string; // texto de la opción vacía; sin él, no hay opción vacía
  disabled?: boolean;
  etiqueta?: string;
}

export function SelectorArea({ areas, valor, cambiar, ninguna, disabled, etiqueta = 'Área' }: Props) {
  return (
    <select value={valor} onChange={(e) => cambiar(e.target.value)} disabled={disabled} aria-label={etiqueta}>
      {ninguna !== undefined && <option value="">{ninguna}</option>}
      {opcionesDeArea(areas).map((o) => {
        // Espacios normales al principio de un <option> se colapsan en el navegador: hacen falta NBSP para sangrar.
        const espacios = o.sub ? '    ' : '';
        return (
          <option key={o.id} value={o.id}>
            {`${espacios}${o.nombre}`}
          </option>
        );
      })}
      {valor && !buscarArea(areas, valor) && <option value={valor}>{`${valor} (desconocida)`}</option>}
    </select>
  );
}
