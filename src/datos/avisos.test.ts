import { describe, expect, it } from 'vitest';
import { avisosVisibles, importantesSinLeer, marcarLeidos, marcarNoLeido, parseAvisos, serializarAvisos, type Aviso } from './avisos.ts';

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
  it('marcar leídos guarda el día y contar importantes sin leer', () => {
    expect(importantesSinLeer([a, b, { ...a, id: 'z', importante: false }])).toHaveLength(2);
    const r = marcarLeidos([a, { ...b, leido: true, leidoEl: '2026-09-01' }], ['moodle-hilo-555', 'programa-entrar', 'no-existe'], '2026-10-04');
    expect(r.map((x) => [x.leido, x.leidoEl])).toEqual([[true, '2026-10-04'], [true, '2026-09-01']]);
  });
  it('leidoEl: ida y vuelta y error claro', () => {
    const leido = { ...a, leido: true, leidoEl: '2026-10-04' };
    expect(parseAvisos(serializarAvisos([leido]))).toEqual([leido]);
    expect(() => parseAvisos('avisos:\n  - id: x\n    fecha: 2026-10-01\n    titulo: t\n    texto: t\n    leidoEl: ayer\n')).toThrow(/leidoEl/);
  });
  it('desleer quita la fecha de lectura', () => {
    const [x] = marcarNoLeido([{ ...a, leido: true, leidoEl: '2026-10-04' }], a.id);
    expect(x.leido).toBe(false);
    expect(x).not.toHaveProperty('leidoEl');
  });
  it('los leídos se ven 30 días; los no leídos siempre', () => {
    const lista = [
      { ...a, id: 'hace30', leido: true, leidoEl: '2026-09-04' },
      { ...a, id: 'hace31', leido: true, leidoEl: '2026-09-03' },
      { ...a, id: 'sin-fecha', leido: true },
      { ...a, id: 'sin-leer-con-fecha-vieja', leido: false, leidoEl: '2026-01-01' },
    ];
    expect(avisosVisibles(lista, '2026-10-04').map((x) => x.id)).toEqual(['hace30', 'sin-fecha', 'sin-leer-con-fecha-vieja']);
  });
});
