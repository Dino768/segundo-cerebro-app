// Los .jsonl de Claude Code llevan rutas absolutas de este ordenador. Para compartir un chat se cambian
// por marcas, y al instalarlo en otro ordenador por su propia ruta de my-context (spec chats compartidos §3.3).
export const MARCA = '{{MY_CONTEXT}}'; // la ruta tal y como va dentro de un texto JSON (\ escapadas)
export const MARCA_BARRAS = '{{MY_CONTEXT_BARRAS}}'; // la misma ruta con /

const enJson = (s: string) => JSON.stringify(s).slice(1, -1);
const conBarras = (s: string) => s.replace(/\\/g, '/');
const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Que no siga una letra, número, _ o - (así my-context-2 no cuenta). Sin distinguir mayúsculas (c:\users… en Windows).
const exacta = (s: string) => new RegExp(`${escaparRegex(s)}(?![\\w-])`, 'gi');

export function aPortable(texto: string, raiz: string): string {
  const json = enJson(raiz);
  const barras = conBarras(raiz);
  let t = texto.replace(exacta(json), MARCA);
  if (barras !== json) t = t.replace(exacta(barras), MARCA_BARRAS);
  return t;
}

export function dePortable(texto: string, raiz: string): string {
  return texto.split(MARCA_BARRAS).join(conBarras(raiz)).split(MARCA).join(enJson(raiz));
}

export const esTextoPortable = (ruta: string) => /\.jsonl?$/i.test(ruta);

export const cambiarId = (texto: string, viejo: string, nuevo: string) => texto.split(viejo).join(nuevo);
