// guia-docente.md: primero el resumen de la evaluación (lo escribe Claude) y después la guía entera.
export function escribirGuia(nombreAsignatura: string, evaluacion: string, texto: string): string {
  return `# Guía docente: ${nombreAsignatura}\n\n## Evaluación\n\n${evaluacion.trim()}\n\n## Guía completa\n\n${texto.trim()}\n`;
}

export function seccionEvaluacion(md: string | null): string | null {
  if (!md) return null;
  const m = /^## Evaluación\n([\s\S]*?)(?=^## Guía completa$|(?![\s\S]))/m.exec(md);
  const r = m?.[1].trim();
  return r ? r : null;
}
