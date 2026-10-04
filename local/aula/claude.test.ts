import { describe, expect, it } from 'vitest';
import { argumentosAula, LimiteClaude, leerSalidaClaude } from './claude.ts';

describe('Claude para el aula virtual', () => {
  it('sin herramientas, con el modelo pedido y sus propias instrucciones', () => {
    expect(argumentosAula('haiku', 'C:/i.md')).toEqual([
      '-p', '--model', 'haiku', '--output-format', 'json', '--system-prompt-file', 'C:/i.md', '--tools', '', '--strict-mcp-config',
    ]);
  });
  it('lee el texto de la respuesta', () => {
    expect(leerSalidaClaude(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: '{"fechas":[]}' }))).toBe('{"fechas":[]}');
  });
  it('límite de uso → LimiteClaude; otro error → Error', () => {
    expect(() => leerSalidaClaude(JSON.stringify({ type: 'result', is_error: true, result: 'Claude AI usage limit reached' }))).toThrow(LimiteClaude);
    expect(() => leerSalidaClaude(JSON.stringify({ type: 'result', is_error: true, result: 'algo raro' }))).toThrow(/algo raro/);
    expect(() => leerSalidaClaude('')).toThrow();
  });
});
