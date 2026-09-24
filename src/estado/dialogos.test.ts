import { describe, expect, it } from 'vitest';
import { crearDialogos } from './dialogos';

describe('crearDialogos (ventanas de la app en vez de las del navegador)', () => {
  it('confirmar: enseña la pregunta y devuelve la respuesta', async () => {
    const d = crearDialogos();
    const r = d.confirmar('¿Borrar?', { aceptar: 'Borrar', peligro: true });
    expect(d.actual()).toEqual({ tipo: 'confirmar', mensaje: '¿Borrar?', aceptar: 'Borrar', peligro: true });
    d.responder(true);
    expect(await r).toBe(true);
    expect(d.actual()).toBeNull();
  });
  it('pedirTexto: quita espacios y, si se cancela o queda vacío, devuelve null', async () => {
    const d = crearDialogos();
    const a = d.pedirTexto('Título', { inicial: 'Newton' });
    expect(d.actual()).toMatchObject({ tipo: 'texto', mensaje: 'Título', inicial: 'Newton', aceptar: 'Guardar' });
    d.responder('  Leyes de Newton ');
    expect(await a).toBe('Leyes de Newton');
    const b = d.pedirTexto('Título');
    d.responder('   ');
    expect(await b).toBeNull();
    const c = d.pedirTexto('Título');
    d.responder(null);
    expect(await c).toBeNull();
  });
  it('si se piden dos a la vez, salen de una en una', async () => {
    const d = crearDialogos();
    const a = d.confirmar('Primera');
    const b = d.confirmar('Segunda');
    expect(d.actual()?.mensaje).toBe('Primera');
    d.responder(false);
    expect(await a).toBe(false);
    expect(d.actual()?.mensaje).toBe('Segunda');
    d.responder(true);
    expect(await b).toBe(true);
  });
  it('avisa a quien escucha cuando cambia la ventana', () => {
    const d = crearDialogos();
    let avisos = 0;
    const quitar = d.suscribir(() => avisos++);
    void d.confirmar('¿Seguro?');
    d.responder(true);
    expect(avisos).toBe(2);
    quitar();
    void d.confirmar('Otra');
    expect(avisos).toBe(2);
  });
});
