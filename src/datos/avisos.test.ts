import { describe, expect, it } from 'vitest';
import { importantesSinLeer, marcarLeidos, parseAvisos, serializarAvisos, type Aviso } from './avisos.ts';

const a: Aviso = { id: 'moodle-hilo-555', asignatura: 'calculo', fecha: '2026-10-03', titulo: 'Cambio de aula', texto: 'Aula 204.\nUn saludo.', importante: true, leido: false, enlace: 'https://x/d=555' };
const b: Aviso = { id: 'programa-entrar', fecha: '2026-10-04', titulo: 'Vuelve a entrar en el aula virtual', texto: 'La URJC ha cerrado la sesión.', importante: true, leido: false };

describe('avisos.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseAvisos(serializarAvisos([a, b]))).toEqual([a, b]);
    expect(parseAvisos(null)).toEqual([]);
    expect(parseAvisos('')).toEqual([]);
  });
  it('errores claros', () => {
    expect(() => parseAvisos('avisos:\n  - id: x\n')).toThrow(/aviso 1/);
    expect(() => parseAvisos('avisos:\n  - id: x\n    fecha: hoy\n    titulo: t\n    texto: t\n')).toThrow(/fecha/);
  });
  it('marcar leídos y contar importantes sin leer', () => {
    expect(importantesSinLeer([a, b, { ...a, id: 'z', importante: false }])).toHaveLength(2);
    const r = marcarLeidos([a, b], ['programa-entrar', 'no-existe']);
    expect(r.map((x) => x.leido)).toEqual([false, true]);
  });
});
