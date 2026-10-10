import { describe, expect, it } from 'vitest';
import { aPortable, cambiarId, dePortable, esTextoPortable } from './portable.ts';

const PC = 'C:\\Users\\Diego\\Desktop\\my-context';
const PORTATIL = 'C:\\Users\\diego\\OneDrive\\Escritorio\\my-context';

describe('rutas portables', () => {
  it('ida y vuelta: la ruta escapada en JSON y la de barras pasan a la del otro ordenador', () => {
    const linea = JSON.stringify({ cwd: `${PC}\\estudios\\calculo`, nota: 'C:/Users/Diego/Desktop/my-context/estudios/x.png' });
    const portable = aPortable(linea, PC);
    expect(portable).not.toContain('Desktop');
    expect(portable).toContain('{{MY_CONTEXT}}\\\\estudios\\\\calculo');
    expect(portable).toContain('{{MY_CONTEXT_BARRAS}}/estudios/x.png');
    const enPortatil = JSON.parse(dePortable(portable, PORTATIL));
    expect(enPortatil.cwd).toBe(`${PORTATIL}\\estudios\\calculo`);
    expect(enPortatil.nota).toBe('C:/Users/diego/OneDrive/Escritorio/my-context/estudios/x.png');
  });
  it('mayúsculas y otro usuario: c:\\users\\diego… también se cambia', () => {
    const t = JSON.stringify({ cwd: 'c:\\users\\diego\\desktop\\my-context\\estudios' });
    expect(aPortable(t, PC)).toContain('{{MY_CONTEXT}}');
  });
  it('una ruta que no es la de my-context no se toca (tampoco my-context-2)', () => {
    const t = JSON.stringify({ a: `${PC}-2\\x`, b: 'C:\\Windows\\x' });
    expect(aPortable(t, PC)).toBe(t);
  });
  it('rutas de Linux/Mac', () => {
    const t = JSON.stringify({ cwd: '/home/diego/my-context/estudios' });
    expect(aPortable(t, '/home/diego/my-context')).toBe(JSON.stringify({ cwd: '{{MY_CONTEXT}}/estudios' }));
    expect(JSON.parse(dePortable('{"cwd":"{{MY_CONTEXT}}\\\\estudios"}', PC)).cwd).toBe(`${PC}\\estudios`);
  });
  it('solo .json y .jsonl', () => {
    expect(esTextoPortable('conversacion.jsonl')).toBe(true);
    expect(esTextoPortable('pizarra-1.json')).toBe(true);
    expect(esTextoPortable('imagenes/a.png')).toBe(false);
  });
  it('cambiarId cambia todas las apariciones', () => {
    expect(cambiarId('{"sessionId":"aaa"}\n{"sessionId":"aaa"}', 'aaa', 'bbb')).toBe('{"sessionId":"bbb"}\n{"sessionId":"bbb"}');
  });
});
