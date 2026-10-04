import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearGit } from './git.ts';

let clon: string;
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();

beforeEach(async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'git-'));
  const remoto = path.join(base, 'remoto.git');
  clon = path.join(base, 'clon');
  git(base, 'init', '--bare', '-b', 'main', remoto);
  git(base, 'clone', '--quiet', remoto, clon);
  git(clon, 'config', 'user.name', 'Prueba');
  git(clon, 'config', 'user.email', 'p@example.com');
  await writeFile(path.join(clon, 'a.txt'), '1');
  git(clon, 'add', '-A');
  git(clon, 'commit', '-m', 'inicial');
  git(clon, 'push', '--quiet', '-u', 'origin', 'main');
});

describe('git de my-context', () => {
  it('con un commit sin subir no está limpio', async () => {
    const g = crearGit(clon);
    expect(await g.limpio()).toBe(true);
    await writeFile(path.join(clon, 'b.txt'), '2');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'mío');
    expect(await g.limpio()).toBe(false);
  });
  it('volverAlRemoto deshace solo el commit del programa', async () => {
    const g = crearGit(clon);
    const remoto = git(clon, 'rev-parse', 'HEAD');
    await writeFile(path.join(clon, 'b.txt'), '2');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'Aula virtual: x');
    await g.volverAlRemoto();
    expect(git(clon, 'rev-parse', 'HEAD')).toBe(remoto);
  });
  it('si encima hay un commit de otra persona, no toca nada', async () => {
    const g = crearGit(clon);
    await writeFile(path.join(clon, 'b.txt'), '2');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'otra cosa');
    const antes = git(clon, 'rev-parse', 'HEAD');
    await expect(g.volverAlRemoto()).rejects.toThrow(/ha cambiado/);
    expect(git(clon, 'rev-parse', 'HEAD')).toBe(antes);
  });
});
