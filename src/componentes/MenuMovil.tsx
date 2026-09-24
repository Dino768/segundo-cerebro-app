import { SECCIONES, type Destino, type Pantalla } from './navegacion';

interface Props {
  actual: Pantalla;
  ir(d: Destino): void;
  bloqueado: boolean;
}

export function MenuMovil({ actual, ir, bloqueado }: Props) {
  return (
    <nav className="navegacion" aria-label="Secciones">
      {SECCIONES.map((s) => (
        <button
          key={s.id}
          className={actual === s.id ? 'activa' : ''}
          disabled={bloqueado && s.id !== 'ajustes'}
          onClick={() => ir({ pantalla: s.id })}
        >
          <span className="icono">{s.icono}</span>
          {s.nombre}
        </button>
      ))}
    </nav>
  );
}
