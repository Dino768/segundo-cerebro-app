import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { conContexto } from '../src/estudio/contexto.ts';
import { avisoCarpetaConversaciones, carpetaConversaciones, leerConversacion, listarConversaciones, tituloConversacion } from './conversaciones.ts';

const lineas = (...os: unknown[]) => os.map((o) => JSON.stringify(o)).join('\n') + '\n';
const usuario = (content: unknown, extra = {}) => ({ type: 'user', message: { role: 'user', content }, ...extra });
const claude = (content: unknown[]) => ({ type: 'assistant', message: { role: 'assistant', content } });

describe('carpetaConversaciones', () => {
  it('cambia lo que no es letra o número por guiones, como Claude Code', () => {
    const cwd = path.join(os.tmpdir(), 'mi carpeta', 'física');
    expect(carpetaConversaciones(cwd, '/casa')).toBe(path.join('/casa', '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-')));
  });
  it.runIf(process.platform === 'win32')('ejemplo real de Windows', () => {
    expect(path.basename(carpetaConversaciones('C:\\Users\\Diego\\Desktop\\my-context\\estudios\\fisica', 'C:\\Users\\Diego'))).toBe(
      'C--Users-Diego-Desktop-my-context-estudios-fisica',
    );
  });
});

describe('leerConversacion', () => {
  const texto = lineas(
    { type: 'mode', mode: 'x' },
    usuario(conContexto({ asignatura: 'fisica', carpeta: '/c', pizarraAbierta: null, imagenes: ['/c/imagenes/captura-1.png'] }, '¿Qué es una fuerza?')),
    usuario('<command-name>/clear</command-name>'),
    usuario([{ type: 'text', text: 'instrucciones internas' }], { isMeta: true }),
    claude([{ type: 'thinking', thinking: '' }]),
    claude([{ type: 'text', text: 'Una fuerza es…' }]),
    claude([{ type: 'tool_use', name: 'Write', input: { file_path: '/c/pizarra-1.json' } }]),
    usuario([{ type: 'tool_result', content: 'ok' }]),
    claude([{ type: 'text', text: 'Mira la pizarra.' }]),
    claude([{ type: 'text', text: 'Y otra cosa.' }]),
    usuario([{ type: 'text', text: 'Gracias' }]),
  ) + 'línea rota {\n';

  it('saca solo los mensajes de Diego y de Claude, y resume las herramientas', () => {
    expect(leerConversacion(texto)).toEqual([
      { rol: 'diego', texto: '¿Qué es una fuerza?', imagenes: ['captura-1.png'] },
      { rol: 'claude', texto: 'Una fuerza es…' },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' },
      { rol: 'claude', texto: 'Mira la pizarra.\n\nY otra cosa.' },
      { rol: 'diego', texto: 'Gracias' },
    ]);
  });
  it('título: la primera pregunta, recortada a 60 caracteres', () => {
    expect(tituloConversacion(leerConversacion(texto))).toBe('¿Qué es una fuerza?');
    expect(tituloConversacion([{ rol: 'diego', texto: 'a'.repeat(80) }])).toBe(`${'a'.repeat(59)}…`);
    expect(tituloConversacion([])).toBe('');
  });
});

describe('listarConversaciones', () => {
  it('lista de la más reciente a la más antigua y salta las vacías', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'convs-'));
    mkdirSync(dir, { recursive: true });
    const a = 'aaaaaaaa-0000-4000-8000-000000000001';
    const b = 'bbbbbbbb-0000-4000-8000-000000000002';
    writeFileSync(path.join(dir, `${a}.jsonl`), lineas(usuario('Primera')));
    writeFileSync(path.join(dir, `${b}.jsonl`), lineas(usuario('Segunda')));
    writeFileSync(path.join(dir, 'vacia.jsonl'), lineas({ type: 'mode' }));
    utimesSync(path.join(dir, `${a}.jsonl`), new Date('2026-09-20'), new Date('2026-09-20'));
    utimesSync(path.join(dir, `${b}.jsonl`), new Date('2026-09-22'), new Date('2026-09-22'));
    const lista = await listarConversaciones(dir);
    expect(lista.map((c) => [c.id, c.titulo])).toEqual([[b, 'Segunda'], [a, 'Primera']]);
  });
  it('carpeta que no existe → lista vacía', async () => {
    expect(await listarConversaciones(path.join(os.tmpdir(), 'no-existe-xyz'))).toEqual([]);
  });
});

describe('avisoCarpetaConversaciones', () => {
  it('avisa si Claude Code guarda conversaciones pero no en la carpeta esperada', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'casa-'));
    const cwd = path.join(home, 'estudios', 'fisica');
    mkdirSync(path.join(home, '.claude', 'projects', 'otra-cosa'), { recursive: true });
    expect(avisoCarpetaConversaciones(cwd, home)).toMatch(/No encuentro/);
    mkdirSync(carpetaConversaciones(cwd, home), { recursive: true });
    expect(avisoCarpetaConversaciones(cwd, home)).toBeNull();
  });
});
