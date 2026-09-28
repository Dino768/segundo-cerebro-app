import { describe, expect, it } from 'vitest';
import { buscarChats } from './buscarChats';

const lista = [
  { id: '1', titulo: 'Física: leyes de Newton', fecha: '2026-09-28T10:00:00Z' },
  { id: '2', titulo: 'Derivadas', fecha: '2026-09-27T10:00:00Z' },
  { id: '3', titulo: 'Límites y DERIVADAS laterales', fecha: '2026-09-26T10:00:00Z' },
];

describe('buscarChats', () => {
  it('sin texto, todos en el mismo orden', () => {
    expect(buscarChats(lista, '   ')).toEqual(lista);
  });
  it('sin distinguir mayúsculas ni tildes', () => {
    expect(buscarChats(lista, 'derivadas').map((c) => c.id)).toEqual(['2', '3']);
    expect(buscarChats(lista, 'fisica').map((c) => c.id)).toEqual(['1']);
    expect(buscarChats(lista, 'LÍMITES').map((c) => c.id)).toEqual(['3']);
  });
  it('varias palabras: tienen que estar todas, en cualquier orden', () => {
    expect(buscarChats(lista, 'newton leyes').map((c) => c.id)).toEqual(['1']);
    expect(buscarChats(lista, 'newton derivadas')).toEqual([]);
  });
});
