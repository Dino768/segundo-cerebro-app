import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ClaseDelDia } from '../../agenda/horario';
import { datosAsignatura } from './colores';
import { CuadriculaHorario } from './CuadriculaHorario';
import { FilaClase } from './FilaClase';
import { FormClaseSuelta } from './FormClaseSuelta';
import { VentanaClase } from './VentanaClase';

const asignaturas = [
  { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' },
  { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' },
];
const calculo: ClaseDelDia = { fecha: '2026-10-07', inicio: '09:00', fin: '11:00', asignatura: 'calculo', aula: 'Aula 3S2 · Aulario III', profesor: 'Ana Pérez', desdoble: 'G2' };
const nada = () => undefined;
const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];

describe('horario en pantalla', () => {
  it('asignatura desconocida: su id y gris', () => {
    expect(datosAsignatura(asignaturas, 'vieja')).toEqual({ nombre: 'vieja', color: '#9ca3af' });
    expect(datosAsignatura(asignaturas, 'calculo')).toEqual({ nombre: 'Cálculo', color: '#36ace7' });
  });
  it('cuadrícula: días, horas y bloques con nombre, aula y desdoble; las quitadas tachadas', () => {
    const html = renderToString(<CuadriculaHorario dias={semana} clases={[[], [], [calculo, { ...calculo, inicio: '11:00', fin: '13:00', asignatura: 'algebra', quitada: true }], [], []]} asignaturas={asignaturas} hoy="2026-10-07" alElegir={nada} />);
    expect(html).toContain('mie 7');
    expect(html).toContain('9:00');
    expect(html).toContain('Cálculo');
    expect(html).toContain('Aula 3S2');
    expect(html).toContain('G2');
    expect(html).toContain('clase-bloque quitada');
  });
  it('cuadrícula con una asignatura que ya no existe no se rompe', () => {
    const html = renderToString(<CuadriculaHorario dias={semana} clases={[[{ ...calculo, asignatura: 'vieja' }], [], [], [], []]} asignaturas={asignaturas} hoy="2026-10-07" alElegir={nada} />);
    expect(html).toContain('vieja');
  });
  it('ventana de una clase normal', () => {
    const html = renderToString(<VentanaClase clase={calculo} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />);
    expect(html).toContain('Cálculo');
    expect(html).toContain('9:00 – 11:00');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('Desdoble G2');
    expect(html).toContain('Abrir asignatura');
    expect(html).toContain('No hay clase este día');
  });
  it('ventana de una clase quitada y de una suelta', () => {
    expect(renderToString(<VentanaClase clase={{ ...calculo, quitada: true }} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />)).toContain('Sí hay clase');
    const suelta = renderToString(<VentanaClase clase={{ ...calculo, suelta: true, nota: 'Recuperación' }} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />);
    expect(suelta).toContain('Recuperación');
    expect(suelta).toContain('Borrar clase suelta');
  });
  it('formulario de clase suelta con las asignaturas', () => {
    const html = renderToString(<FormClaseSuelta asignaturas={asignaturas} dia="2026-10-15" guardar={nada} cerrar={nada} />);
    expect(html).toContain('Clase suelta');
    expect(html).toContain('value="2026-10-15"');
    expect(html).toContain('Álgebra');
  });
  it('fila de la lista del día', () => {
    const html = renderToString(<ul><FilaClase clase={calculo} asignaturas={asignaturas} alElegir={nada} /></ul>);
    expect(html).toContain('9:00');
    expect(html).toContain('Cálculo');
    expect(html).toContain('Aula 3S2');
  });
});
