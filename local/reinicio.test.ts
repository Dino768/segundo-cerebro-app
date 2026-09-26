import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { debeReiniciar, leerCommit } from './reinicio.ts';

function git(archivos: Record<string, string>): string {
  const d = mkdtempSync(path.join(os.tmpdir(), 'git-'));
  for (const [ruta, texto] of Object.entries(archivos)) {
    mkdirSync(path.dirname(path.join(d, ruta)), { recursive: true });
    writeFileSync(path.join(d, ruta), texto);
  }
  return d;
}

describe('versión del código', () => {
  it('lee el commit de la rama actual', () => {
    expect(leerCommit(git({ HEAD: 'ref: refs/heads/main\n', 'refs/heads/main': 'abc123\n' }))).toBe('abc123');
  });
  it('también si la rama solo está en packed-refs, o si HEAD apunta a un commit suelto', () => {
    expect(leerCommit(git({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': '# pack-refs\nfff111 refs/heads/otra\nddd222 refs/heads/main\n' }))).toBe('ddd222');
    expect(leerCommit(git({ HEAD: 'eee333\n' }))).toBe('eee333');
  });
  it('sin git, null', () => {
    expect(leerCommit(path.join(os.tmpdir(), 'no-existe-nunca-123'))).toBeNull();
  });
});

describe('cuándo reiniciarse', () => {
  it('solo si el código ha cambiado y Claude no está contestando', () => {
    expect(debeReiniciar('a', 'b', false)).toBe(true);
    expect(debeReiniciar('a', 'a', false)).toBe(false);
    expect(debeReiniciar('a', 'b', true)).toBe(false);
    expect(debeReiniciar('a', null, false)).toBe(false);
  });
});
