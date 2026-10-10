import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actualizarArchivo, borrarArchivo, ErrorGitHub, escribirArchivo, escribirBase64, leerArchivo, leerBinario, leerBlob, listarArchivosDe, listarCarpeta,
  listarEntradas, subirCambios,
} from './cliente';

const cfg = { owner: 'diego', repo: 'my-context', token: 'secreto' };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
const b64 = (texto: string) => Buffer.from(texto, 'utf8').toString('base64');
// GitHub devuelve el base64 partido en líneas
const archivo = (texto: string, sha: string) =>
  json(200, { type: 'file', content: b64(texto).replace(/(.{20})/g, '$1\n'), sha });
const cuerpoDe = (llamada: number) => JSON.parse(fetchMock.mock.calls[llamada][1].body);

describe('leerArchivo', () => {
  it('un archivo de más de 1 MB (GitHub no manda el contenido) se lee en crudo', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { type: 'file', content: '', encoding: 'none', sha: 's2', size: 2_000_000 }));
    fetchMock.mockResolvedValueOnce(new Response('{"grande": true}', { status: 200 }));
    expect(await leerArchivo(cfg, 'estudios/fisica/pizarras/a.json')).toEqual({ texto: '{"grande": true}', sha: 's2' });
    expect(fetchMock.mock.calls[1][1].headers.Accept).toBe('application/vnd.github.raw+json');
  });

  it('lee texto con acentos, ñ y emojis', async () => {
    fetchMock.mockResolvedValueOnce(archivo('Ñandú: práctica de Cálculo 🎮\n', 's1'));
    expect(await leerArchivo(cfg, 'agenda/tareas.yaml')).toEqual({ texto: 'Ñandú: práctica de Cálculo 🎮\n', sha: 's1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/diego/my-context/contents/agenda/tareas.yaml');
    expect(init.headers.Authorization).toBe('Bearer secreto');
  });

  it('token inválido → tipo token', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Bad credentials' }));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'token' });
  });

  it('sin red → tipo red', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'red' });
  });

  it('no existe → tipo no-existe', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'no-existe' });
  });
});

describe('listarCarpeta', () => {
  it('devuelve solo archivos', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a.md', type: 'file' }, { name: 'sub', type: 'dir' }]));
    expect(await listarCarpeta(cfg, 'proyectos')).toEqual(['a.md']);
  });
  it('carpeta inexistente → lista vacía', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    expect(await listarCarpeta(cfg, 'proyectos')).toEqual([]);
  });
});

describe('escribirArchivo', () => {
  it('envía el texto en base64 UTF-8, con el sha y el mensaje', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { content: { sha: 's2' } }));
    expect(await escribirArchivo(cfg, 'a.yaml', 'Cálculo ñ 🎮', 's1', 'msg')).toBe('s2');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    const cuerpo = cuerpoDe(0);
    expect(cuerpo.sha).toBe('s1');
    expect(cuerpo.message).toBe('msg');
    expect(Buffer.from(cuerpo.content, 'base64').toString('utf8')).toBe('Cálculo ñ 🎮');
  });
  it('409 → tipo conflicto', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { message: 'conflict' }));
    await expect(escribirArchivo(cfg, 'a', 'x', 's', 'm')).rejects.toMatchObject({ tipo: 'conflicto' });
  });
});

describe('actualizarArchivo', () => {
  it('si hay conflicto, relee y reintenta una vez sobre la versión nueva', async () => {
    fetchMock
      .mockResolvedValueOnce(archivo('v1', 's1'))
      .mockResolvedValueOnce(json(409, { message: 'conflict' }))
      .mockResolvedValueOnce(archivo('v2', 's2'))
      .mockResolvedValueOnce(json(200, { content: { sha: 's3' } }));
    const vistos: (string | null)[] = [];
    const escrito = await actualizarArchivo(cfg, 'a', (t) => {
      vistos.push(t);
      return `${t}+cambio`;
    }, 'm');
    expect(vistos).toEqual(['v1', 'v2']);
    expect(escrito).toBe('v2+cambio');
    expect(cuerpoDe(3).sha).toBe('s2');
  });

  it('si el conflicto se repite, lanza error de conflicto', async () => {
    fetchMock
      .mockResolvedValueOnce(archivo('v1', 's1'))
      .mockResolvedValueOnce(json(409, {}))
      .mockResolvedValueOnce(archivo('v2', 's2'))
      .mockResolvedValueOnce(json(409, {}));
    await expect(actualizarArchivo(cfg, 'a', (t) => `${t}`, 'm')).rejects.toMatchObject({ tipo: 'conflicto' });
  });

  it('si el archivo no existe, lo crea sin sha', async () => {
    fetchMock.mockResolvedValueOnce(json(404, {})).mockResolvedValueOnce(json(201, { content: { sha: 'n' } }));
    const escrito = await actualizarArchivo(cfg, 'a', (t) => (t === null ? 'nuevo' : 'mal'), 'm');
    expect(escrito).toBe('nuevo');
    expect(cuerpoDe(1).sha).toBeUndefined();
  });
});

describe('borrarArchivo', () => {
  it('manda DELETE con el sha y el mensaje', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await borrarArchivo(cfg, 'ideas/bandeja.md', 'abc', 'Borrar bandeja');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/diego/my-context/contents/ideas/bandeja.md');
    expect(init.method).toBe('DELETE');
    expect(cuerpoDe(0)).toEqual({ message: 'Borrar bandeja', sha: 'abc' });
  });
  it('si el archivo cambió, es un conflicto', async () => {
    fetchMock.mockResolvedValueOnce(json(409, {}));
    await expect(borrarArchivo(cfg, 'ideas/bandeja.md', 'viejo', 'x')).rejects.toMatchObject({ tipo: 'conflicto' });
    expect(ErrorGitHub).toBeDefined();
  });
});

describe('binarios', () => {
  it('escribirBase64 manda el base64 tal cual', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { content: { sha: 'n1' } }));
    expect(await escribirBase64(cfg, 'estudios/fisica/pizarras/imagenes/a.png', 'QUJD', null, 'Imagen')).toBe('n1');
    expect(cuerpoDe(0)).toEqual({ message: 'Imagen', content: 'QUJD' });
  });
  it('leerBinario pide el archivo en crudo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const blob = await leerBinario(cfg, 'estudios/fisica/pizarras/imagenes/a.png');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe('application/vnd.github.raw+json');
  });
});

describe('carpetas y blobs', () => {
  it('listarEntradas da archivos y carpetas con su sha; si no existe, []', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a', type: 'dir', sha: 't1' }, { name: 'b.json', type: 'file', sha: 'b1' }]));
    expect(await listarEntradas(cfg, 'estudios/x/chats')).toEqual([{ nombre: 'a', tipo: 'dir', sha: 't1' }, { nombre: 'b.json', tipo: 'file', sha: 'b1' }]);
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    expect(await listarEntradas(cfg, 'no')).toEqual([]);
  });
  it('listarArchivosDe entra en las subcarpetas', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'chat.json', type: 'file', sha: 's1' }, { name: 'imagenes', type: 'dir', sha: 't' }]));
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a.png', type: 'file', sha: 's2' }]));
    expect(await listarArchivosDe(cfg, 'c')).toEqual([{ ruta: 'chat.json', sha: 's1' }, { ruta: 'imagenes/a.png', sha: 's2' }]);
    expect(fetchMock.mock.calls[1][0]).toContain('/contents/c/imagenes');
  });
  it('leerBlob devuelve el base64 sin saltos de línea', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { content: 'QUJD\nREVG\n', encoding: 'base64' }));
    expect(await leerBlob(cfg, 'abc')).toBe('QUJDREVG');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/diego/my-context/git/blobs/abc');
  });
});

describe('subirCambios', () => {
  const pasosHastaArbol = () => {
    fetchMock.mockResolvedValueOnce(json(200, { default_branch: 'main' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'blob1' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c0' } }));
    fetchMock.mockResolvedValueOnce(json(200, { tree: { sha: 'arbol0' } }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'arbol1' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'c1' }));
  };
  it('hace un solo commit con archivos nuevos y borrados', async () => {
    pasosHastaArbol();
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c1' } }));
    await subirCambios(cfg, [{ ruta: 'a/b.json', base64: 'e30=' }, { ruta: 'a/viejo.png', base64: null }], 'Chat compartido: x');
    const urls = fetchMock.mock.calls.map((c) => `${c[1]?.method ?? 'GET'} ${String(c[0]).replace('https://api.github.com/repos/diego/my-context', '')}`);
    expect(urls).toEqual(['GET ', 'POST /git/blobs', 'GET /git/ref/heads/main', 'GET /git/commits/c0', 'POST /git/trees', 'POST /git/commits', 'PATCH /git/refs/heads/main']);
    expect(cuerpoDe(4)).toEqual({ base_tree: 'arbol0', tree: [{ path: 'a/b.json', mode: '100644', type: 'blob', sha: 'blob1' }, { path: 'a/viejo.png', mode: '100644', type: 'blob', sha: null }] });
    expect(cuerpoDe(5)).toEqual({ message: 'Chat compartido: x', tree: 'arbol1', parents: ['c0'] });
    expect(cuerpoDe(6)).toEqual({ sha: 'c1', force: false });
  });
  it('si la rama avanzó entre medias, vuelve a hacer el commit encima', async () => {
    pasosHastaArbol();
    fetchMock.mockResolvedValueOnce(json(422, { message: 'Update is not a fast forward' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c9' } }));
    fetchMock.mockResolvedValueOnce(json(200, { tree: { sha: 'arbol9' } }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'arbol10' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'c10' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c10' } }));
    await subirCambios(cfg, [{ ruta: 'a/b.json', base64: 'e30=' }], 'm');
    expect(cuerpoDe(10)).toEqual({ message: 'm', tree: 'arbol10', parents: ['c9'] });
  });
  it('sin red: ErrorGitHub de tipo red', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(subirCambios(cfg, [{ ruta: 'a', base64: 'e30=' }], 'm')).rejects.toMatchObject({ tipo: 'red' });
  });
});
