import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function Markdown({ texto }: { texto: string }) {
  const html = DOMPurify.sanitize(marked.parse(texto, { async: false }) as string);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
