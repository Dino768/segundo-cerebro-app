import { describe, expect, it } from 'vitest';
import { conContexto } from './contexto';
import { describirHerramienta, leerConversacion, tituloConversacion } from './conversacion';

const linea = (o: unknown) => JSON.stringify(o);

describe('conversacion (sin Node)', () => {
  it('lee un .jsonl de Claude Code con cabecera, herramientas y marcas de ruta', () => {
    const texto = [
      linea({ type: 'user', message: { content: conContexto({ asignatura: 'calculo', carpeta: '{{MY_CONTEXT}}\\estudios', pizarraAbierta: null, imagenes: ['{{MY_CONTEXT}}\\x\\imagenes\\captura-1.png'] }, 'Derivadas') } }),
      linea({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '{{MY_CONTEXT}}\\x\\pizarra-2.json' } }] } }),
      linea({ type: 'assistant', message: { content: [{ type: 'text', text: 'Mira.' }] } }),
    ].join('\n');
    const ms = leerConversacion(texto);
    expect(ms).toEqual([
      { rol: 'diego', texto: 'Derivadas', imagenes: ['captura-1.png'] },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 2' },
      { rol: 'claude', texto: 'Mira.' },
    ]);
    expect(tituloConversacion(ms)).toBe('Derivadas');
  });
  it('describirHerramienta saca el nombre del archivo con \\ o con /', () => {
    expect(describirHerramienta('Read', { file_path: 'C:\\a\\apuntes.md' })).toBe('📖 Ha leído apuntes.md');
    expect(describirHerramienta('Read', { file_path: '/a/b/captura-1.png' })).toBe('👀 Ha mirado captura-1.png');
  });
});
