import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { marked } from 'marked';
import { ponerFormulas, separarFormulas } from '../estudio/formulas';

export function htmlMarkdown(texto: string, formulas = false): string {
  if (!formulas) return DOMPurify.sanitize(marked.parse(texto, { async: false }) as string);
  const s = separarFormulas(texto);
  const html = marked.parse(s.texto, { async: false }) as string;
  return DOMPurify.sanitize(
    ponerFormulas(html, s.formulas, (f) => katex.renderToString(f.tex, { displayMode: f.bloque, throwOnError: false, output: 'html' })),
  );
}

export function Markdown({ texto, formulas = false, className = 'markdown' }: { texto: string; formulas?: boolean; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: htmlMarkdown(texto, formulas) }} />;
}
