import { escalaFoto, type Etiqueta, type Zona } from '../../estudio/foto';

export interface FotoPizarra { blob: Blob; zona: Zona }
export type HacerFoto = () => Promise<FotoPizarra>;

// Foto de lo que se ve en el lienzo (piezas, flechas, trazos y papel), con el id de cada pieza encima.
// html-to-image se carga solo al hacer la primera foto (no pesa al abrir la app).
export async function fotografiar(el: HTMLElement, etiquetas: (escala: number) => Etiqueta[]): Promise<Blob> {
  const { toCanvas } = await import('html-to-image');
  const escala = escalaFoto(el.clientWidth);
  const lienzo = await toCanvas(el, {
    pixelRatio: escala,
    backgroundColor: '#fdfbf6',
    // La barrita, el tirador y los avisos no salen en la foto.
    filter: (n) => !(n instanceof HTMLElement && n.dataset.fueraDeFoto !== undefined),
  });
  const ctx = lienzo.getContext('2d');
  if (ctx) {
    ctx.font = '600 12px system-ui, sans-serif';
    for (const e of etiquetas(escala)) {
      const w = ctx.measureText(e.texto).width + 8;
      ctx.fillStyle = 'rgba(59, 48, 39, 0.85)';
      ctx.fillRect(e.x, e.y, w, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(e.texto, e.x + 4, e.y + 12);
    }
  }
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se ha podido crear la foto'))), 'image/png'));
}
