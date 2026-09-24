import type { EventoChat, Mensaje } from './tipos';

// Aplica un evento que llega del programa local a la lista de mensajes del chat.
export function aplicarEvento(ms: Mensaje[], e: EventoChat): Mensaje[] {
  if (e.tipo === 'texto') {
    const ultimo = ms.at(-1);
    if (ultimo?.rol === 'claude') return [...ms.slice(0, -1), { ...ultimo, texto: ultimo.texto + e.texto }];
    const texto = e.texto.replace(/^\n+/, '');
    return texto ? [...ms, { rol: 'claude', texto }] : ms;
  }
  if (e.tipo === 'herramienta') return [...ms, { rol: 'herramienta', texto: e.texto }];
  return ms;
}
