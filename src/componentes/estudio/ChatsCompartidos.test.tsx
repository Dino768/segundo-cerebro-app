import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ListaChatsCompartidos } from './ChatsCompartidos';
import { MensajesChat } from './MensajesChat';

// DOMPurify necesita un navegador: aquí basta con saber qué texto llega a cada burbuja de Claude.
vi.mock('../Markdown', () => ({ Markdown: ({ texto, className }: { texto: string; className: string }) => <div className={className}>{texto}</div> }));

describe('chats compartidos en el móvil', () => {
  it('lista con nombre y fecha; vacía, lo explica', () => {
    const html = renderToString(<ListaChatsCompartidos chats={[{ id: 'a', titulo: 'Derivadas', actualizado: '2026-10-10T10:00:00Z' }]} alAbrir={() => undefined} />);
    expect(html).toContain('Derivadas');
    expect(html).toContain('10 oct');
    expect(renderToString(<ListaChatsCompartidos chats={[]} alAbrir={() => undefined} />)).toContain('Aún no has compartido ningún chat de esta asignatura');
  });
  it('los mensajes se leen sin caja para escribir', () => {
    const html = renderToString(
      <MensajesChat mensajes={[{ rol: 'diego', texto: 'Hola' }, { rol: 'claude', texto: '**Hola**' }, { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' }]} imagen={() => ''} />,
    );
    expect(html).toContain('burbuja-diego');
    expect(html).toContain('<div class="markdown burbuja-claude">**Hola**</div>');
    expect(html).toContain('linea-herramienta');
    expect(html).not.toContain('textarea');
  });
});
