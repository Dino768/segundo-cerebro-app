import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VentanaDialogo } from './Dialogos';

describe('VentanaDialogo', () => {
  it('pregunta con botones de la app', () => {
    const html = renderToString(
      <VentanaDialogo dialogo={{ tipo: 'confirmar', mensaje: '¿Borrar la pizarra 2?', aceptar: 'Borrar', peligro: true }} responder={() => undefined} />,
    );
    expect(html).toContain('class="fondo-modal dialogo"');
    expect(html).toContain('¿Borrar la pizarra 2?');
    expect(html).toMatch(/<button[^>]*class="peligro"[^>]*>Borrar<\/button>/);
    expect(html).toContain('>Cancelar</button>');
    expect(html).not.toContain('<input');
  });
  it('pide un texto con el valor de partida', () => {
    const html = renderToString(
      <VentanaDialogo dialogo={{ tipo: 'texto', mensaje: 'Título de la pizarra', inicial: 'Newton', aceptar: 'Guardar' }} responder={() => undefined} />,
    );
    expect(html).toMatch(/<input[^>]*value="Newton"/);
    expect(html).toMatch(/<button[^>]*class="principal"[^>]*>Guardar<\/button>/);
  });
});
