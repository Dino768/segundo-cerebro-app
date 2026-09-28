import type { ResumenConversacion } from './tipos';

// Sin tildes ni mayúsculas, para que «fisica» encuentre «Física».
const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Los chats cuyo nombre tiene todas las palabras buscadas (en cualquier orden). Sin texto, todos.
export function buscarChats(lista: ResumenConversacion[], texto: string): ResumenConversacion[] {
  const palabras = plano(texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return lista;
  return lista.filter((c) => {
    const titulo = plano(c.titulo);
    return palabras.every((p) => titulo.includes(p));
  });
}
