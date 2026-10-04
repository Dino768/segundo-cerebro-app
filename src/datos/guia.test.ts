import { describe, expect, it } from 'vitest';
import { escribirGuia, seccionEvaluacion } from './guia.ts';

describe('guía docente', () => {
  it('escribe el resumen y el texto, y saca la evaluación', () => {
    const md = escribirGuia('Cálculo', '- Examen final: 60 %\n- Parciales: 40 %', 'Texto largo\n## Algo');
    expect(md.startsWith('# Guía docente: Cálculo\n\n## Evaluación\n\n- Examen final: 60 %')).toBe(true);
    expect(md).toContain('## Guía completa\n\nTexto largo');
    expect(seccionEvaluacion(md)).toBe('- Examen final: 60 %\n- Parciales: 40 %');
  });
  it('sin archivo o sin sección, null', () => {
    expect(seccionEvaluacion(null)).toBeNull();
    expect(seccionEvaluacion('# Otra cosa')).toBeNull();
  });
});
