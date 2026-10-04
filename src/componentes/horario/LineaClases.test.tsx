import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LineaClases } from './LineaClases';

const asignaturas = [
  { id: 'calculo', nombre: 'Cálculo', color: '#36ace7' },
  { id: 'algebra', nombre: 'Álgebra', color: '#db5629' },
];
const horario = {
  clases: [
    { fecha: '2026-10-07', inicio: '09:00', fin: '11:00', asignatura: 'calculo', aula: 'Aula 3S2 · Aulario III' },
    { fecha: '2026-10-07', inicio: '11:00', fin: '13:00', asignatura: 'algebra', aula: 'Aula 3S4 · Aulario III' },
    { fecha: '2026-10-08', inicio: '09:00', fin: '11:00', asignatura: 'algebra' },
  ],
  ajustes: { quitadas: [], sueltas: [] },
};
const linea = (cuando: string) => renderToString(<LineaClases horario={horario} asignaturas={asignaturas} ahora={new Date(cuando)} ir={() => undefined} />);

describe('línea de clases del Inicio', () => {
  it('en clase: ahora y siguiente', () => {
    const html = linea('2026-10-07T10:00:00');
    expect(html).toContain('Ahora: Cálculo · Aula 3S2 · hasta las 11:00');
    expect(html).toContain('Siguiente: Álgebra · 11:00');
  });
  it('antes de empezar: solo la siguiente, con su aula', () => {
    expect(linea('2026-10-07T08:00:00')).toContain('Siguiente: Cálculo · 9:00 · Aula 3S2');
  });
  it('después de la última: la primera de mañana', () => {
    expect(linea('2026-10-07T14:00:00')).toContain('Mañana: Álgebra · 9:00');
  });
  it('sin clases hoy ni mañana: nada', () => {
    expect(linea('2026-10-10T10:00:00')).toBe('');
  });
});
