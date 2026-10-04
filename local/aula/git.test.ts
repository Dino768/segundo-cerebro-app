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

describe('antes de revisar', () => {
  const otroClon = async () => {
    const otro = path.join(path.dirname(clon), 'otro');
    git(path.dirname(clon), 'clone', '--quiet', path.join(path.dirname(clon), 'remoto.git'), otro);
    git(otro, 'config', 'user.name', 'Otro');
    git(otro, 'config', 'user.email', 'o@example.com');
    return otro;
  };
  it('un commit del programa que quedó sin subir se sube (aunque el remoto haya avanzado)', async () => {
    const g = crearGit(clon);
    await writeFile(path.join(clon, 'b.txt'), '2');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'Aula virtual: sin subir');
    const otro = await otroClon();
    await writeFile(path.join(otro, 'c.txt'), '3');
    git(otro, 'add', '-A');
    git(otro, 'commit', '-m', 'desde el móvil');
    git(otro, 'push', '--quiet');
    expect(await g.listoParaRevisar()).toBe(true);
    git(otro, 'pull', '--quiet');
    expect(git(otro, 'log', '-1', '--format=%s')).toBe('Aula virtual: sin subir');
  });
  it('si hay un commit de Diego sin subir, no sube nada', async () => {
    const g = crearGit(clon);
    await writeFile(path.join(clon, 'b.txt'), '2');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'Aula virtual: sin subir');
    await writeFile(path.join(clon, 'c.txt'), '3');
    git(clon, 'add', '-A');
    git(clon, 'commit', '-m', 'mío');
    expect(await g.listoParaRevisar()).toBe(false);
    expect(git(clon, 'rev-list', '--count', '@{u}..HEAD')).toBe('2');
  });
  it('con cambios sin guardar en un commit, no está listo', async () => {
    const g = crearGit(clon);
    await writeFile(path.join(clon, 'a.txt'), 'cambiado');
    expect(await g.listoParaRevisar()).toBe(false);
  });
  it('sabe si una ruta está en el .gitignore', async () => {
    const g = crearGit(clon);
    expect(await g.ignorado('estudios/calculo/aula-virtual/x.pdf')).toBe(false);
    await writeFile(path.join(clon, '.gitignore'), 'estudios/*/aula-virtual/\n');
    expect(await g.ignorado('estudios/calculo/aula-virtual/x.pdf')).toBe(true);
  });
});
