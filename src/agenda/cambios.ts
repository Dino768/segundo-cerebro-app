// Aplica sobre la versión remota solo los campos que el usuario cambió respecto a `antes`,
// para no pisar lo que otro (Claude, otro dispositivo) haya cambiado mientras tanto.
export function mezclarCambios<T extends object>(remota: T, antes: T, despues: Omit<T, 'id'> | T): T {
  const resultado: Record<string, unknown> = { ...remota } as Record<string, unknown>;
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
    if (k === 'id' || JSON.stringify(a[k]) === JSON.stringify(d[k])) continue;
    if (d[k] === undefined) delete resultado[k];
    else resultado[k] = d[k];
  }
  return resultado as T;
}
