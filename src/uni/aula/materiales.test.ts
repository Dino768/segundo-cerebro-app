import { describe, expect, it } from 'vitest';
import type { AulaVirtual } from '../../datos/aulaVirtual.ts';
import type { ContenidoCurso } from './paginas.ts';
import { construirLista, esDocumentoDeFechas, esMaterial, nombreSeguro, nuevosMateriales, tipoDeArchivo } from './materiales.ts';

const c: ContenidoCurso = { secciones: [
  { id: '10', nombre: 'General', modulos: [
    { id: '100', nombre: 'Avisos', tipo: 'forum', seccion: 'General' },
    { id: '101', nombre: 'Guía docente', tipo: 'resource', url: 'https://x/101', seccion: 'General' },
  ] },
  { id: '11', nombre: 'Tema 1: Límites', modulos: [
    { id: '103', nombre: 'Apuntes tema 1', tipo: 'resource', url: 'https://x/103', seccion: 'Tema 1: Límites' },
    { id: '105', nombre: 'Web de ejercicios', tipo: 'url', url: 'https://x/105', seccion: 'Tema 1: Límites' },
    { id: '106', nombre: 'Entrega 1', tipo: 'assign', url: 'https://x/106', seccion: 'Tema 1: Límites' },
  ] },
] };

describe('materiales', () => {
  it('solo recursos, carpetas, enlaces y páginas son materiales', () => {
    expect(c.secciones.flatMap((s) => s.modulos).filter(esMaterial).map((m) => m.id)).toEqual(['101', '103', '105']);
  });
  it('tipo por la extensión', () => {
    expect(tipoDeArchivo('a.PDF')).toBe('pdf');
    expect(tipoDeArchivo('b.pptx')).toBe('presentacion');
    expect(tipoDeArchivo('c.docx')).toBe('documento');
    expect(tipoDeArchivo('d.mp4')).toBe('video');
    expect(tipoDeArchivo('e.zip')).toBe('otro');
  });
  it('nombres de archivo seguros en Windows', () => {
    expect(nombreSeguro('Tema 1: Límites / parte "A"?')).toBe('Tema 1 Límites parte A');
    expect(nombreSeguro('..')).toBe('sin nombre');
    expect(nombreSeguro('x'.repeat(200)).length).toBe(100);
  });
  it('al recortar conserva la extensión y no deja puntos ni espacios al final', () => {
    const de104 = 'Planificación y calendario de evaluación de la asignatura Cálculo, grupo de la mañana, curso 2026-27.pdf';
    expect(de104.length).toBe(104);
    const r = nombreSeguro(de104);
    expect(r.length).toBeLessThanOrEqual(100);
    expect(r.endsWith('.pdf')).toBe(true);
    expect(r).toBe('Planificación y calendario de evaluación de la asignatura Cálculo, grupo de la mañana, curso 202.pdf');
    expect(tipoDeArchivo(r)).toBe('pdf');
    // El carácter 100 es un espacio (y antes un punto): no se quedan al final.
    expect(nombreSeguro('a'.repeat(98) + '. bcd')).toBe('a'.repeat(98));
  });
  it('nombres reservados de Windows llevan _ delante', () => {
    expect(nombreSeguro('CON.pdf')).toBe('_CON.pdf');
    expect(nombreSeguro('aux')).toBe('_aux');
    expect(nombreSeguro('com1.txt')).toBe('_com1.txt');
    expect(nombreSeguro('Lpt9')).toBe('_Lpt9');
    expect(nombreSeguro('console.pdf')).toBe('console.pdf');
  });
  it('documentos cuyo nombre suena a fechas', () => {
    expect(esDocumentoDeFechas('Planificación de la asignatura.pdf')).toBe(true);
    expect(esDocumentoDeFechas('CRONOGRAMA 2026-27')).toBe(true);
    expect(esDocumentoDeFechas('Apuntes tema 1')).toBe(false);
  });
  it('nuevos: los materiales no vistos', () => {
    expect(nuevosMateriales(c, new Set(['101'])).map((m) => m.id)).toEqual(['103', '105']);
  });
  it('lista por temas con archivos; lo que desaparece se marca retirado y conserva su archivo', () => {
    const anterior: AulaVirtual = { actualizado: '2026-10-01', secciones: [
      { nombre: 'Tema 0', materiales: [{ id: '99', nombre: 'Viejo', tipo: 'pdf', enlace: 'https://x/99', archivo: 'Tema 0/Viejo.pdf' }] },
      { nombre: 'Tema 1: Límites', materiales: [{ id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1 Límites/Apuntes tema 1.pdf' }] },
    ] };
    const r = construirLista(c, anterior, new Map([['101', { archivo: 'General/guia.pdf', tipo: 'pdf' as const }]]), '2026-10-04');
    expect(r).toEqual({ actualizado: '2026-10-04', secciones: [
      { nombre: 'General', materiales: [{ id: '101', nombre: 'Guía docente', tipo: 'pdf', enlace: 'https://x/101', archivo: 'General/guia.pdf' }] },
      { nombre: 'Tema 1: Límites', materiales: [
        { id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1 Límites/Apuntes tema 1.pdf' },
        { id: '105', nombre: 'Web de ejercicios', tipo: 'enlace', enlace: 'https://x/105' },
      ] },
      { nombre: 'Ya no está en el aula virtual', materiales: [{ id: '99', nombre: 'Viejo', tipo: 'pdf', enlace: 'https://x/99', archivo: 'Tema 0/Viejo.pdf', retirado: true }] },
    ] });
  });
});
