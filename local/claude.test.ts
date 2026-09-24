import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { EventoChat } from '../src/estudio/tipos.ts';
import {
  argumentosClaude, crearTraductor, describirHerramienta, lanzarClaude, NO_ENCONTRADO, type Comando, type OpcionesClaude,
} from './claude.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FALSO: Comando = { bin: process.execPath, previos: [path.join(aqui, 'pruebas', 'claude-falso.ts')] };
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const opciones = (mensaje: string, extra: Partial<OpcionesClaude> = {}): OpcionesClaude => ({
  mensaje, id: ID, nueva: true, cwd: os.tmpdir(), instrucciones: '/x/instrucciones.md', ...extra,
});

async function conversar(cmd: Comando, o: OpcionesClaude, alPrimerTexto?: (parar: () => void) => void) {
  const eventos: EventoChat[] = [];
  const p = lanzarClaude(cmd, o, (e) => {
    eventos.push(e);
    if (e.tipo === 'texto' && eventos.filter((x) => x.tipo === 'texto').length === 1) alPrimerTexto?.(p.parar);
  });
  await p.terminado;
  return eventos;
}

describe('argumentosClaude', () => {
  it('conversación nueva: --session-id, modo restringido y el mensaje fuera de los argumentos', () => {
    const a = argumentosClaude(opciones('hola'));
    expect(a).toContain('--session-id');
    expect(a).toContain(ID);
    expect(a).not.toContain('--resume');
    expect(a).toContain('--restricted');
    expect(a).toEqual(expect.arrayContaining(['--tools', 'Read,Write,Edit,Glob,Grep', '--permission-mode', 'acceptEdits']));
    expect(a).toEqual(expect.arrayContaining(['--append-system-prompt-file', '/x/instrucciones.md']));
    expect(a).not.toContain('hola');
  });
  it('conversación que sigue: --resume', () => {
    const a = argumentosClaude(opciones('hola', { nueva: false }));
    expect(a).toEqual(expect.arrayContaining(['--resume', ID]));
    expect(a).not.toContain('--session-id');
  });
});

describe('describirHerramienta', () => {
  it('reconoce las pizarras con rutas de Windows y de Linux', () => {
    expect(describirHerramienta('Write', { file_path: 'C:\\x\\.en-curso\\id\\pizarra-3.json' })).toBe('✏️ Ha dibujado en la pizarra 3');
    expect(describirHerramienta('Edit', { file_path: '/x/.en-curso/id/pizarra-12.json' })).toBe('✏️ Ha dibujado en la pizarra 12');
  });
  it('otras herramientas', () => {
    expect(describirHerramienta('Read', { file_path: 'C:\\x\\imagenes\\captura-1.png' })).toBe('👀 Ha mirado captura-1.png');
    expect(describirHerramienta('Read', { file_path: '/x/apuntes.md' })).toBe('📖 Ha leído apuntes.md');
    expect(describirHerramienta('Grep', {})).toBe('🔎 Ha buscado en tus apuntes');
    expect(describirHerramienta('Otra', null)).toBe('🔧 Otra');
  });
});

describe('crearTraductor', () => {
  const t = () => crearTraductor();
  it('texto que llega poco a poco', () => {
    expect(t()('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hola"}}}')).toEqual([
      { tipo: 'texto', texto: 'Hola' },
    ]);
  });
  it('separa dos bloques de texto con una línea en blanco', () => {
    const tr = t();
    tr('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}}');
    expect(tr('{"type":"stream_event","event":{"type":"content_block_start","content_block":{"type":"text","text":""}}}')).toEqual([
      { tipo: 'texto', texto: '\n\n' },
    ]);
  });
  it('uso de herramienta → línea gris', () => {
    const linea = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/a/pizarra-2.json' } }] } });
    expect(t()(linea)).toEqual([{ tipo: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 2' }]);
  });
  it('final bien, límite de uso y líneas raras', () => {
    expect(t()('{"type":"result","subtype":"success","is_error":false,"result":"x"}')).toEqual([{ tipo: 'fin' }]);
    const [e] = t()('{"type":"result","subtype":"success","is_error":true,"result":"usage limit reached","api_error_status":429}');
    expect(e).toMatchObject({ tipo: 'error', uso: true });
    expect(t()('no es json')).toEqual([]);
    expect(t()('{"type":"system","subtype":"init"}')).toEqual([]);
  });
});

describe('lanzarClaude (con el Claude de mentira)', () => {
  it('manda el mensaje por stdin en su carpeta y devuelve el texto', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'estudio-'));
    const registro = path.join(dir, 'registro.jsonl');
    process.env.FALSO_REGISTRO = registro;
    const eventos = await conversar(FALSO, opciones('Ñandú 🦕\nlínea 2', { cwd: dir }));
    delete process.env.FALSO_REGISTRO;
    expect(eventos).toEqual([{ tipo: 'texto', texto: 'Hola ' }, { tipo: 'texto', texto: 'Diego' }, { tipo: 'fin' }]);
    const r = JSON.parse(readFileSync(registro, 'utf8').trim());
    expect(r.entrada).toBe('Ñandú 🦕\nlínea 2');
    expect(path.resolve(r.cwd)).toBe(path.resolve(dir));
  });
  it('límite de uso', async () => {
    const eventos = await conversar(FALSO, opciones('ERROR-USO'));
    expect(eventos.at(-1)).toMatchObject({ tipo: 'error', uso: true });
  });
  it('se corta a medias', async () => {
    const eventos = await conversar(FALSO, opciones('CORTAR'));
    expect(eventos[0]).toEqual({ tipo: 'texto', texto: 'Empiezo…' });
    expect(eventos.at(-1)).toMatchObject({ tipo: 'error' });
    expect((eventos.at(-1) as { mensaje: string }).mensaje).toMatch(/cortado/);
  });
  it('parar', async () => {
    const eventos = await conversar(FALSO, opciones('LENTO'), (parar) => parar());
    expect(eventos.at(-1)).toEqual({ tipo: 'fin', parado: true });
  }, 8000);
  it('Claude Code no instalado', async () => {
    const eventos = await conversar({ bin: 'no-existe-claude-xyz', previos: [] }, opciones('hola'));
    expect(eventos).toEqual([{ tipo: 'error', mensaje: NO_ENCONTRADO }]);
  });
});
