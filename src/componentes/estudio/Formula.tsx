import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

export function Formula({ tex, bloque = false }: { tex: string; bloque?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: bloque, throwOnError: false, output: 'html' }), [tex, bloque]);
  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
