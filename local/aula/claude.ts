// Claude Code sin herramientas: solo lee el texto que le pasamos y contesta con JSON (spec §5).
import { spawn } from 'node:child_process';
import type { Modelo } from '../../src/uni/aula/fechas.ts';
import { explicarError, NO_ENCONTRADO, type Comando } from '../claude.ts';

export class LimiteClaude extends Error {
  constructor(m: string) {
    super(m);
    this.name = 'LimiteClaude';
  }
}

export function argumentosAula(modelo: Modelo, instrucciones: string): string[] {
  return ['-p', '--model', modelo, '--output-format', 'json', '--system-prompt-file', instrucciones, '--tools', '', '--strict-mcp-config'];
}

export function leerSalidaClaude(stdout: string): string {
  let j: { is_error?: boolean; result?: unknown; api_error_status?: number };
  try {
    j = JSON.parse(stdout.trim());
  } catch {
    throw new Error('Claude Code no ha contestado');
  }
  const texto = String(j.result ?? '');
  if (j.is_error) {
    const e = explicarError(texto, j.api_error_status);
    if (e.uso) throw new LimiteClaude(e.mensaje);
    throw new Error(e.mensaje);
  }
  return texto;
}

// `cwd`: la revisión usa os.tmpdir() para que Claude no cargue el AGENTS.md de my-context (gastaría más).
export function preguntarClaude(cmd: Comando, modelo: Modelo, instrucciones: string, texto: string, cwd: string, esperaMaxima = 5 * 60_000): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const hijo = spawn(cmd.bin, [...cmd.previos, ...argumentosAula(modelo, instrucciones)], { cwd, windowsHide: true });
    let acabado = false;
    const reloj = setTimeout(() => {
      acabado = true;
      hijo.kill();
      rechazar(new Error('Claude ha tardado demasiado en contestar'));
    }, esperaMaxima);
    let salida = '';
    let errores = '';
    hijo.stdout.on('data', (d) => (salida += String(d)));
    hijo.stderr.on('data', (d) => (errores = (errores + String(d)).slice(-2000)));
    hijo.stdin.on('error', () => undefined);
    hijo.stdin.end(texto);
    hijo.on('error', (e: NodeJS.ErrnoException) => (clearTimeout(reloj), rechazar(new Error(e.code === 'ENOENT' ? NO_ENCONTRADO : e.message))));
    hijo.on('close', () => {
      clearTimeout(reloj);
      if (acabado) return;
      try {
        resolver(leerSalidaClaude(salida));
      } catch (e) {
        if (!salida.trim() && errores.trim()) {
          const x = explicarError(errores.trim());
          rechazar(x.uso ? new LimiteClaude(x.mensaje) : new Error(x.mensaje));
        } else rechazar(e);
      }
    });
  });
}
