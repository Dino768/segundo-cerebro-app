// «Física II: Ondas» → «fisica-ii-ondas». Sirve para ids y nombres de archivo.
export function aSlug(texto: string, maximo: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/, '');
}
