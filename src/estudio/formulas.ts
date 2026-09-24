// Las fórmulas $…$ y $$…$$ se sacan antes de pasar el texto por Markdown
// (para que Markdown no las estropee) y se vuelven a poner ya dibujadas.
export interface Formula {
  tex: string;
  bloque: boolean;
}

const marca = (i: number) => `@@F${i}@@`;

export function separarFormulas(texto: string): { texto: string; formulas: Formula[] } {
  const formulas: Formula[] = [];
  const sustituir = (t: string) =>
    t
      .replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => {
        formulas.push({ tex: tex.trim(), bloque: true });
        return marca(formulas.length - 1);
      })
      .replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_m, antes: string, tex: string) => {
        formulas.push({ tex, bloque: false });
        return antes + marca(formulas.length - 1);
      });
  // Los trozos impares son código (```…``` o `…`): no se tocan.
  const partes = texto.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  return { texto: partes.map((p, i) => (i % 2 === 1 ? p : sustituir(p))).join(''), formulas };
}

export function ponerFormulas(html: string, formulas: Formula[], dibujar: (f: Formula) => string): string {
  return html.replace(/@@F(\d+)@@/g, (m, i: string) => {
    const f = formulas[Number(i)];
    return f ? dibujar(f) : m;
  });
}
