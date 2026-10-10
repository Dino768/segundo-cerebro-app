import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FilasChats } from './ListaConversaciones';

vi.mock('../../estado/dialogos', () => ({ confirmar: vi.fn(), pedirTexto: vi.fn() }));

const nada = () => undefined;
const lista = [
  { id: '1', titulo: 'Derivadas', fecha: '2026-09-28T10:00:00Z' },
  { id: '2', titulo: 'Leyes de Newton', fecha: '2026-09-27T10:00:00Z' },
];

describe('FilasChats', () => {
  it('cada chat con su nombre y sus botones de cambiar el nombre y borrar, y la casilla de buscar', () => {
    const html = renderToString(<FilasChats lista={lista} busqueda="" alBuscar={nada} alAbrir={nada} alRenombrar={nada} alBorrar={nada} />);
    expect(html).toContain('Derivadas');
    expect(html).toContain('Leyes de Newton');
    expect(html.match(/aria-label="Cambiar el nombre"/g)).toHaveLength(2);
    expect(html.match(/aria-label="Borrar el chat"/g)).toHaveLength(2);
    expect(html).toContain('placeholder="🔎 Buscar chat…"');
  });
  it('filtra por lo buscado y avisa si no hay ninguno', () => {
    expect(renderToString(<FilasChats lista={lista} busqueda="newton" alBuscar={nada} alAbrir={nada} alRenombrar={nada} alBorrar={nada} />)).not.toContain('Derivadas');
    expect(renderToString(<FilasChats lista={lista} busqueda="química" alBuscar={nada} alAbrir={nada} alRenombrar={nada} alBorrar={nada} />)).toContain('Ningún chat se llama así.');
  });
  it('los chats compartidos llevan ☁', () => {
    const conNube = [{ id: 'a', titulo: 'Newton', fecha: '2026-10-10T10:00:00Z', compartido: true }, { id: 'b', titulo: 'Derivadas', fecha: '2026-10-10T10:00:00Z' }];
    const html = renderToString(<FilasChats lista={conNube} busqueda="" alBuscar={nada} alAbrir={nada} alRenombrar={nada} alBorrar={nada} />);
    expect(html).toContain('title="Compartido con tus otros dispositivos"');
    expect(html.match(/☁/g)).toHaveLength(1);
  });
});
