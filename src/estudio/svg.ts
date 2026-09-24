import DOMPurify from 'dompurify';

// El dibujo de Claude se limpia: sin scripts, enlaces, imágenes externas ni estilos que afecten a la página.
export function limpiarSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['image', 'use', 'a', 'foreignObject', 'style', 'script'],
  });
}
