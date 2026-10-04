import { describe, expect, it } from 'vitest';
import { cursoAcademico, decidir, leerRespuesta, necesitaMas, problemas, textoPregunta, type FechaClaude, type Pregunta } from './fechas.ts';

const calculo = { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' };
const p: Pregunta = {
  asignatura: calculo, hoy: '2026-10-04', conGuia: false,
  conocidas: [{ origen: 'urjc-examen:2026-27:2327007:E:AM', titulo: 'Examen: Cálculo (enero)', tipo: 'examen', fecha: '2027-01-21', hora: '09:00' }],
  fuentes: [{ id: 'moodle-hilo-555', tipo: 'aviso', titulo: 'Primer parcial', fecha: '2026-10-03', enlace: 'https://x/555', texto: 'El primer parcial será el jueves 12 de noviembre a las 10:00 en el aula 204.' }],
};
const f = (x: Partial<FechaClaude> = {}): FechaClaude => ({
  clave: 'primer-parcial', que: 'Primer parcial', tipo: 'examen', fecha: '2026-11-12', hora: '10:00', exacta: true,
  cita: 'el primer parcial será el jueves 12 de noviembre a las 10:00', fuente: 'moodle-hilo-555', duda: null, ...x,
});

describe('curso académico', () => {
  it('de septiembre a julio', () => {
    expect(cursoAcademico('2026-10-04')).toEqual({ inicio: '2026-09-01', fin: '2027-07-31' });
    expect(cursoAcademico('2027-03-01')).toEqual({ inicio: '2026-09-01', fin: '2027-07-31' });
    expect(cursoAcademico('2027-08-15')).toEqual({ inicio: '2027-09-01', fin: '2028-07-31' });
  });
});

describe('pregunta', () => {
  it('lleva hoy, el curso, las fechas conocidas y los textos con su id', () => {
    const t = textoPregunta(p);
    expect(t).toContain('Asignatura: Cálculo');
    expect(t).toContain('Hoy: 2026-10-04 (domingo)');
    expect(t).toContain('Curso: 2026-09-01 a 2027-07-31');
    expect(t).toContain('2027-01-21 09:00 · examen · Examen: Cálculo (enero) [urjc-examen:2026-27:2327007:E:AM]');
    expect(t).toContain('### moodle-hilo-555 (aviso, publicado el 2026-10-03): Primer parcial');
    expect(t).toContain('El primer parcial será el jueves 12');
    expect(t).not.toContain('"evaluacion"'); // sin guía no se pide resumen
  });
});

describe('respuesta', () => {
  const buena = { fechas: [f()], avisos: [{ id: 'moodle-hilo-555', importante: true }], evaluacion: null };
  it('lee el JSON aunque venga con texto o con ```json alrededor', () => {
    expect(leerRespuesta(JSON.stringify(buena))).toEqual(buena);
    expect(leerRespuesta('Aquí tienes:\n```json\n' + JSON.stringify(buena) + '\n```\nListo.')).toEqual(buena);
  });
  it('JSON roto o incompleto: ErrorFormato', () => {
    expect(() => leerRespuesta('no sé')).toThrow();
    expect(() => leerRespuesta('{"fechas": [{"clave": 1}]}')).toThrow(/fecha 1/);
    expect(() => leerRespuesta('{"fechas": [], "avisos": "x"}')).toThrow(/avisos/);
  });
});

describe('comprobaciones', () => {
  it('una fecha correcta no tiene problemas', () => {
    expect(problemas(f(), p)).toEqual([]);
  });
  it('la cita tiene que estar de verdad en el texto (sin mayúsculas, tildes ni espacios de sobra)', () => {
    expect(problemas(f({ cita: 'EL  PRIMER parcial sera el jueves 12 de noviembre a las 10:00' }), p)).toEqual([]);
    expect(problemas(f({ cita: 'el parcial es el 20' }), p)).toEqual(['la cita no está en el texto']);
    expect(problemas(f({ fuente: 'otra' }), p)).toEqual(['la cita no está en el texto']);
  });
  it('el día de la semana tiene que cuadrar', () => {
    expect(problemas(f({ fecha: '2026-11-13' }), p)).toContain('el 2026-11-13 no es jueves');
  });
  it('dentro del curso y no en el pasado; hora válida', () => {
    expect(problemas(f({ fecha: '2026-10-01', cita: 'el primer parcial' }), p)).toContain('la fecha ya ha pasado');
    expect(problemas(f({ fecha: '2027-09-10', cita: 'el primer parcial' }), p)).toContain('la fecha está fuera del curso');
    expect(problemas(f({ hora: '25:00' }), p)).toContain('la hora no es válida');
  });
  it('sin fecha exacta no se comprueba nada (no va a la agenda)', () => {
    expect(problemas(f({ exacta: false, fecha: null, cita: 'a mediados de noviembre' }), p)).toEqual([]);
  });
  it('hace falta más inteligencia si hay dudas o problemas', () => {
    expect(necesitaMas({ fechas: [f()], avisos: [], evaluacion: null }, p)).toBe(false);
    expect(necesitaMas({ fechas: [f({ duda: 'el profe dice 12 y luego 19' })], avisos: [], evaluacion: null }, p)).toBe(true);
    expect(necesitaMas({ fechas: [f({ fecha: '2026-11-13' })], avisos: [], evaluacion: null }, p)).toBe(true);
    const dos: Pregunta = { ...p, fuentes: [{ ...p.fuentes[0], texto: p.fuentes[0].texto + ' O el jueves 19 de noviembre a las 10:00.' }] };
    expect(necesitaMas({ fechas: [f(), f({ fecha: '2026-11-19', cita: 'o el jueves 19 de noviembre a las 10:00' })], avisos: [], evaluacion: null }, dos)).toBe(true); // misma clave, dos fechas
  });
});

describe('la hora no cuenta como día', () => {
  const con = (texto: string): Pregunta => ({ ...p, fuentes: [{ ...p.fuentes[0], texto }] });
  const prob = (texto: string, x: Partial<FechaClaude>) => problemas(f({ cita: texto, hora: null, ...x }), con(texto));
  it('horas, rangos y aulas no valen como día', () => {
    expect(prob('el 1 de noviembre a las 10:00', { fecha: '2026-11-10', hora: '10:00' })).toContain('la fecha no está en la cita');
    expect(prob('el 1 de noviembre a las 10:00', { fecha: '2026-11-01', hora: '10:00' })).toEqual([]);
    expect(prob('hasta el 5/11/2026 a las 23.59', { fecha: '2026-11-05', hora: '23:59' })).toEqual([]);
    expect(prob('el 12 de noviembre de 10-12h', { fecha: '2026-11-12' })).toEqual([]);
    expect(prob('el examen es el 2026-11-12', { fecha: '2026-11-12' })).toEqual([]);
    expect(prob('aula 12, el 3 de noviembre', { fecha: '2026-11-12' })).toContain('la fecha no está en la cita');
  });
});

describe('comprobaciones estrictas', () => {
  const con = (texto: string): Pregunta => ({ ...p, fuentes: [{ ...p.fuentes[0], texto }] });
  const prob = (texto: string, x: Partial<FechaClaude>, pp: Pregunta = con(texto)) => problemas(f({ cita: texto, hora: null, ...x }), pp);
  it('el día y el mes tienen que estar en la cita', () => {
    expect(problemas(f({ cita: 'el primer parcial', fecha: '2026-12-03', hora: null }), p)).toContain('la fecha no está en la cita');
    expect(problemas(f({ cita: 'el primer parcial será el jueves 12 de noviembre', fecha: '2026-11-19', hora: null }), p)).toContain('la fecha no está en la cita');
    expect(prob('el 12 de diciembre', { fecha: '2026-11-12' })).toContain('la fecha no está en la cita');
    expect(prob('12/11', { fecha: '2026-11-12' })).toEqual([]);
  });
  it('el día de la semana con coma y en rangos', () => {
    expect(prob('el jueves, 12 de noviembre', { fecha: '2026-11-12' })).toEqual([]);
    expect(prob('el jueves, 13 de noviembre', { fecha: '2026-11-13' })).toContain('el 2026-11-13 no es jueves');
    expect(prob('del lunes 9 al viernes 13 de noviembre', { fecha: '2026-11-13' })).toEqual([]);
    expect(prob('del lunes 9 al jueves 13 de noviembre', { fecha: '2026-11-13' })).toContain('el 2026-11-13 no es jueves');
  });
  it('la hora tiene que estar en la cita', () => {
    expect(problemas(f({ hora: '16:00' }), p)).toContain('la hora no está en la cita');
    expect(prob('el parcial es el jueves 12 de noviembre a las 10', { fecha: '2026-11-12', hora: '10:00' })).toEqual([]);
  });
  it('en agosto el curso empieza en septiembre', () => {
    const pp = { ...con('el 20 de agosto'), hoy: '2027-08-01' };
    expect(prob('el 20 de agosto', { fecha: '2027-08-20' }, pp)).toContain('la fecha está fuera del curso');
  });
  it('una respuesta sin «fechas» es un error', () => {
    expect(() => leerRespuesta('{"resultado": []}')).toThrow(/fechas/);
  });
  it('necesitaMas: misma clave con otra hora, o cambio sobre una fecha ya conocida', () => {
    const texto = 'el parcial es el jueves 12 de noviembre a las 10:00 o a las 12:00';
    const pp = con(texto);
    const a = f({ cita: texto, hora: '10:00' });
    const b = f({ cita: texto, hora: '12:00' });
    expect(necesitaMas({ fechas: [a, b], avisos: [], evaluacion: null }, pp)).toBe(true);
    const conocida = (fecha: string) => ({ ...p, conocidas: [{ origen: 'aula:calculo:primer-parcial', titulo: 'Primer parcial: Cálculo', tipo: 'examen' as const, fecha }] });
    expect(necesitaMas({ fechas: [f()], avisos: [], evaluacion: null }, conocida('2026-11-19'))).toBe(true);
    expect(necesitaMas({ fechas: [f()], avisos: [], evaluacion: null }, conocida('2026-11-12'))).toBe(false);
  });
});

describe('decisión final', () => {
  const r = (fechas: FechaClaude[]) => ({ fechas, avisos: [], evaluacion: null });
  it('una fecha clara va a la agenda con la cita y el enlace en las notas', () => {
    expect(decidir(r([f()]), p)).toEqual({
      propuestas: [{
        origen: 'aula:calculo:primer-parcial', titulo: 'Primer parcial: Cálculo', tipo: 'examen', area: 'calculo',
        fecha: '2026-11-12', hora: '10:00',
        notas: '«el primer parcial será el jueves 12 de noviembre a las 10:00» (Primer parcial, https://x/555)',
        notasDeLaFuente: true, tituloDeLaFuente: true,
      }],
      avisos: [],
    });
  });
  it('sin día exacto no va a la agenda', () => {
    expect(decidir(r([f({ exacta: false, fecha: null, cita: 'a mediados de noviembre' })]), p).propuestas).toEqual([]);
  });
  it('ante la duda, la más temprana con ⚠ y un aviso importante', () => {
    const d = decidir(r([
      f({ fecha: '2026-11-19', cita: 'el primer parcial', duda: 'el aviso dice 12 y la guía 19' }),
      f({ fecha: '2026-11-12' }),
    ]), p);
    expect(d.propuestas).toHaveLength(1);
    expect(d.propuestas[0].fecha).toBe('2026-11-12');
    expect(d.propuestas[0].titulo).toBe('⚠ Primer parcial: Cálculo (por confirmar)');
    expect(d.propuestas[0].notas).toContain('«el primer parcial» (no comprobada)');
    expect(d.avisos).toEqual([{ titulo: 'Fecha por confirmar: Primer parcial de Cálculo', texto: expect.stringContaining('2026-11-12') }]);
  });
  it('una fecha que no pasa las comprobaciones no cuenta como candidata; si no queda ninguna, solo aviso', () => {
    const d = decidir(r([f({ cita: 'inventada' })]), p);
    expect(d.propuestas).toEqual([]);
    expect(d.avisos[0].titulo).toBe('Fecha sin confirmar: Primer parcial de Cálculo');
  });
  it('no repite un examen oficial que ya está el mismo día', () => {
    const conOficial = { ...p, fuentes: [{ ...p.fuentes[0], texto: 'El examen final será el jueves 21 de enero.' }] };
    const d = decidir(r([f({ clave: 'final', que: 'Examen final', fecha: '2027-01-21', hora: null, cita: 'el examen final será el jueves 21 de enero' })]), conOficial);
    expect(d.propuestas).toEqual([]);
  });
});

describe('la cita no deja que un rango o «N horas» valga como día', () => {
  const con = (cita: string, fecha: string) => {
    const pp = { ...p, fuentes: [{ ...p.fuentes[0], texto: cita }] };
    return problemas(f({ cita, fecha, hora: null }), pp);
  };
  it('«de 10 a 12» no es el día 10', () => {
    expect(con('el 1 de noviembre de 10 a 12', '2026-11-10')).toContain('la fecha no está en la cita');
  });
  it('«10 horas» no es el día 10', () => {
    expect(con('el 1 de noviembre, 10 horas', '2026-11-10')).toContain('la fecha no está en la cita');
  });
  it('el día 1 sí está', () => {
    expect(con('el 1 de noviembre de 10 a 12', '2026-11-01')).toEqual([]);
  });
});

describe('correcciones de la revisión', () => {
  const con = (texto: string, x: Partial<FechaClaude>) => ({ pp: { ...p, fuentes: [{ ...p.fuentes[0], texto }] }, ff: f(x) });
  it('rangos de días no se quitan como si fueran horas', () => {
    const { pp, ff } = con('la entrega es de 3 a 7 de noviembre', { cita: 'la entrega es de 3 a 7 de noviembre', fecha: '2026-11-07', hora: null });
    expect(problemas(ff, pp)).toEqual([]);
  });
  it('dos horas distintas el mismo día: la más temprana, con ⚠ y aviso', () => {
    const texto = 'el parcial será el jueves 12 de noviembre a las 10:00 o a las 12:00';
    const pp = { ...p, fuentes: [{ ...p.fuentes[0], texto }] };
    const d = decidir({ fechas: [
      f({ hora: '12:00', cita: 'el jueves 12 de noviembre a las 12:00' }),
      f({ hora: '10:00', cita: 'el jueves 12 de noviembre a las 10:00' }),
    ].map((x) => x), avisos: [], evaluacion: null }, { ...pp, fuentes: [{ ...p.fuentes[0], texto: 'el parcial será el jueves 12 de noviembre a las 10:00 o el jueves 12 de noviembre a las 12:00' }] });
    expect(d.propuestas).toHaveLength(1);
    expect(d.propuestas[0].hora).toBe('10:00');
    expect(d.propuestas[0].titulo).toBe('⚠ Primer parcial: Cálculo (por confirmar)');
    expect(d.avisos).toHaveLength(1);
  });
});
