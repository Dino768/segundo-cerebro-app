import { describe, expect, it } from 'vitest';
import { parseSincronizacionAula, serializarSincronizacionAula, type SincronizacionAula } from './estado.ts';

const s: SincronizacionAula = {
  estado: { ultimaRevision: '2026-10-04T09:12', resultado: 'ok', mensaje: '3 avisos nuevos' },
  vistos: {
    materiales: ['103', '104'], avisos: ['moodle-hilo-555'], guias: { calculo: 'abc123' }, textos: { 'etiqueta-200': 'def456' },
    fechas: { 'aula:calculo:primer-parcial': { fecha: '2026-11-13', hora: '10:00', titulo: 'Primer parcial: Cálculo' } },
  },
  pendientes: [{ asignatura: 'calculo', avisos: ['moodle-hilo-556'], documentos: [], guia: false }],
};

describe('aula-sincronizacion.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseSincronizacionAula(serializarSincronizacionAula(s))).toEqual(s);
  });
  it('sin archivo: todo vacío', () => {
    expect(parseSincronizacionAula(null)).toEqual({ estado: {}, vistos: { materiales: [], avisos: [], guias: {}, textos: {}, fechas: {} }, pendientes: [] });
  });
  it('fecha mal escrita en vistos: error', () => {
    expect(() => parseSincronizacionAula('vistos:\n  fechas:\n    aula:x:y:\n      fecha: mañana\n')).toThrow(/fecha/);
  });
});
