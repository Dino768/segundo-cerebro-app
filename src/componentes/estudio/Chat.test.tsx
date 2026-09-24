import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chat } from './Chat';

const props = {
  asignatura: 'fisica', conversacion: 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3', titulo: '', mensajes: [], error: null,
  alEnviar: () => undefined, alParar: () => undefined, alReintentar: () => undefined, alVerLista: () => undefined, alNueva: () => undefined,
};

describe('Chat', () => {
  it('mientras Claude contesta no se puede ir a otra conversación', () => {
    const html = renderToString(<Chat {...props} enviando />);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>◂ Conversaciones<\/button>/);
  });
  it('sin respuesta en marcha, sí', () => {
    const html = renderToString(<Chat {...props} enviando={false} />);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>◂ Conversaciones<\/button>/);
  });
});
