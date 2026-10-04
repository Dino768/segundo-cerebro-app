import { parse } from 'node-html-parser';
import { extractText, getDocumentProxy } from 'unpdf';
import { textoDeElemento } from '../../src/uni/aula/paginas.ts';

export async function textoDe(bytes: Uint8Array, nombre: string): Promise<string | null> {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  try {
    if (ext === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      const t = String(text).replace(/[ \t]+/g, ' ').trim();
      return t || null; // escaneado: sin texto
    }
    const texto = new TextDecoder().decode(bytes);
    if (ext === 'html' || ext === 'htm') return textoDeElemento(parse(texto)) || null;
    if (ext === 'txt' || ext === 'md') return texto.trim() || null;
    return null;
  } catch {
    return null;
  }
}
