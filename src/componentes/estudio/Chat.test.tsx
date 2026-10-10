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
  it('botón para enseñar la pizarra: desactivado sin pizarra o mientras Claude contesta', () => {
    const boton = /<button[^>]*aria-label="Enseñar la pizarra"[^>]*>/;
    expect(renderToString(<Chat {...props} enviando={false} />).match(boton)?.[0]).toContain('disabled=""');
    expect(renderToString(<Chat {...props} enviando={false} alEnsenarPizarra={() => undefined} />).match(boton)?.[0]).not.toContain('disabled=""');
    expect(renderToString(<Chat {...props} enviando alEnsenarPizarra={() => undefined} />).match(boton)?.[0]).toContain('disabled=""');
  });
});

describe('botón ☁ de compartir', () => {
  const con = (estado: 'no' | 'subiendo' | 'pendiente' | 'hecho' | 'sin-token', mensajes = [{ rol: 'diego' as const, texto: 'Hola' }]) =>
    renderToString(<Chat {...props} mensajes={mensajes} enviando={false} compartir={{ estado, alCompartir: () => undefined, alDejar: () => undefined }} />);
  it('sin mensajes no aparece', () => expect(con('no', [])).not.toContain('☁'));
  it('cada estado tiene su texto', () => {
    expect(con('no')).toContain('☁ Compartir');
    expect(con('subiendo')).toContain('☁ Subiendo…');
    expect(con('pendiente')).toContain('☁ Sin subir');
    expect(con('hecho')).toContain('☁ Compartido');
    expect(con('sin-token')).toMatch(/<button[^>]*disabled=""[^>]*title="Para compartir chats, pon tu llave de GitHub en Ajustes"/);
  });
  it('mientras Claude contesta, el botón está desactivado', () => {
    const html = renderToString(<Chat {...props} mensajes={[{ rol: 'diego', texto: 'Hola' }]} enviando compartir={{ estado: 'no', alCompartir: () => undefined, alDejar: () => undefined }} />);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>☁ Compartir<\/button>/);
  });
});
