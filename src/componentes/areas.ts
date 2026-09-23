import type { Area } from '../datos/areas';

export function colorDeArea(areas: Area[], id: string | undefined): string {
  return areas.find((a) => a.id === id)?.color ?? '#9ca3af';
}
