import { describe, expect, it } from 'vitest';
import { parseAulaVirtual, serializarAulaVirtual, type AulaVirtual } from './aulaVirtual.ts';

const RUTA = 'estudios/calculo/aula-virtual.yaml';
const lista: AulaVirtual = { actualizado: '2026-10-04', secciones: [
  { nombre: 'Tema 1. Límites', materiales: [
    { id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1. Limites/Apuntes tema 1.pdf' },
    { id: '104', nombre: 'Vídeo', tipo: 'video', enlace: 'https://x/104', retirado: true },
  ] },
] };

describe('aula-virtual.yaml', () => {
  it('ida y vuelta; sin archivo, null', () => {
    expect(parseAulaVirtual(serializarAulaVirtual(lista), RUTA)).toEqual(lista);
    expect(parseAulaVirtual(null, RUTA)).toBeNull();
  });
  it('tipo desconocido es un error', () => {
    expect(() => parseAulaVirtual('actualizado: 2026-10-04\nsecciones:\n  - nombre: T\n    materiales:\n      - id: "1"\n        nombre: x\n        tipo: raro\n        enlace: e\n', RUTA)).toThrow(/tipo/);
  });
});
