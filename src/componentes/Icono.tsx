import { createElement, useEffect, useState } from 'react';
import { cargarColeccion, nodosDe } from '../iconos/coleccion';

interface Props {
  nombre?: string;
  tamano?: number;
  className?: string;
}

// Un icono de Tabler por su nombre, del color del texto. Si no existe (o no hay conexión para la colección), no dibuja nada.
export function Icono({ nombre, tamano = 18, className }: Props) {
  const [, setCargada] = useState(0);
  const nodos = nombre ? nodosDe(nombre) : undefined;
  useEffect(() => {
    if (!nombre || nodos) return;
    let vivo = true;
    cargarColeccion().then(() => vivo && setCargada((n) => n + 1)).catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [nombre, nodos]);
  if (!nodos) return null;
  return (
    <svg
      className={`icono-tabler${className ? ` ${className}` : ''}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {nodos.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
