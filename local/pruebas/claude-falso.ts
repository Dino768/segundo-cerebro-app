// Imita la salida de «claude -p --output-format stream-json» para las pruebas, sin gastar la suscripción.
// Palabras clave en el mensaje: ERROR-USO, CORTAR, LENTO, PIZARRA-MALA (y «no es válida» para arreglarla).
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let entrada = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (entrada += d));
process.stdin.on('end', () => void responder());

const escribir = (o: unknown) => process.stdout.write(JSON.stringify(o) + '\n');
const texto = (t: string) =>
  escribir({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } } });
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function responder() {
  if (process.env.FALSO_REGISTRO)
    appendFileSync(process.env.FALSO_REGISTRO, JSON.stringify({ args, entrada, cwd: process.cwd() }) + '\n');
  escribir({ type: 'system', subtype: 'init', session_id: 'falso' });
  if (entrada.includes('ERROR-USO')) {
    escribir({ type: 'result', subtype: 'success', is_error: true, result: 'Claude AI usage limit reached', api_error_status: 429 });
    return;
  }
  if (entrada.includes('CORTAR')) {
    texto('Empiezo…');
    process.exit(1);
  }
  if (entrada.includes('LENTO')) {
    texto('Voy ');
    await esperar(10_000);
  }
  const carpeta = /^Pizarras de esta conversación: (.+)$/m.exec(entrada)?.[1];
  if (carpeta && (entrada.includes('PIZARRA-MALA') || entrada.includes('no es válida'))) {
    mkdirSync(carpeta, { recursive: true });
    const archivo = path.join(carpeta, 'pizarra-1.json');
    const buena = entrada.includes('no es válida');
    writeFileSync(
      archivo,
      buena
        ? JSON.stringify({ version: 1, titulo: 'Arreglada', piezas: [], flechas: [], guardarComo: null, guardadaEn: null })
        : '{ "version": 1, "piezas": [',
    );
    escribir({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: archivo } }] } });
  }
  texto('Hola ');
  texto('Diego');
  escribir({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hola Diego' }] } });
  escribir({ type: 'result', subtype: 'success', is_error: false, result: 'Hola Diego' });
}
