import { describe, expect, it } from 'vitest';
import { ErrorDatos } from '../datos/yaml';
import { ErrorGitHub } from '../github/cliente';
import type { Horario } from '../repositorio';
import { guardarCambio, mensajeError } from './horario';

const previo: Horario = { clases: [], ajustes: { grupo: 'G', quitadas: [], sueltas: [] } };
const quitar = (a: Horario['ajustes']) => ({ ...a, quitadas: [{ fecha: '2026-09-24', inicio: '09:00', asignatura: 'e' }] });

describe('guardar un cambio del horario', () => {
  it('si se guarda, queda lo que dice GitHub', async () => {
    const r = await guardarCambio(previo, quitar, async (c) => c({ ...previo.ajustes, desdoble: 'G2' }));
    expect(r.error).toBeNull();
    expect(r.horario.ajustes.quitadas).toHaveLength(1);
    expect(r.horario.ajustes.desdoble).toBe('G2');
  });
  it('si falla, se deshace y se explica por qué', async () => {
    const r = await guardarCambio(previo, quitar, async () => { throw new ErrorGitHub('red', 'sin red'); });
    expect(r.horario).toBe(previo);
    expect(r.error).toBe('Sin conexión: el cambio del horario no se ha guardado.');
  });
  it('con horario-ajustes.yaml mal escrito, se deshace y se dice qué está mal', async () => {
    const r = await guardarCambio(previo, quitar, async () => { throw new ErrorDatos('estudios/horario-ajustes.yaml', 'desdoble debe ser como "G2"'); });
    expect(r.horario).toBe(previo);
    expect(r.error).toContain('estudios/horario-ajustes.yaml');
    expect(r.error).toContain('desdoble debe ser como "G2"');
  });
});

describe('mensajes de error del horario', () => {
  it('un archivo mal escrito siempre se explica; sin conexión, solo al guardar', () => {
    const roto = new ErrorDatos('estudios/horario-ajustes.yaml', 'quitada 1: inicio debe ser una hora HH:MM, como "09:00"');
    expect(mensajeError(roto, false)).toBe('Error en estudios/horario-ajustes.yaml: quitada 1: inicio debe ser una hora HH:MM, como "09:00". No se puede cambiar el horario hasta que se arregle (pídeselo a Claude).');
    expect(mensajeError(roto, true)).toContain('Error en estudios/horario-ajustes.yaml');
    expect(mensajeError(new ErrorGitHub('red', 'x'), false)).toBeNull();
    expect(mensajeError(new ErrorGitHub('red', 'x'), true)).toBe('Sin conexión: el cambio del horario no se ha guardado.');
  });
});
