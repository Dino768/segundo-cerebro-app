import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from '../github/cliente';
import { bajarPaquete, leerMensajesRemotos, listarRemotos, quitarRemoto, subirPaquete } from './chatsCompartidos';

vi.mock('../github/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('../github/cliente')>();
  return {
    ...real, listarEntradas: vi.fn(), listarArchivosDe: vi.fn(), leerBlob: vi.fn(), subirCambios: vi.fn(), leerArchivo: vi.fn(), leerBinario: vi.fn(),
    comprobarAcceso: vi.fn(),
  };
});
const cfg = { owner: 'diego', repo: 'my-context', token: 'x' };
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const entradas = vi.mocked(cliente.listarEntradas);
const archivos = vi.mocked(cliente.listarArchivosDe);
const subir = vi.mocked(cliente.subirCambios);
beforeEach(() => vi.resetAllMocks());

describe('chats compartidos en GitHub', () => {
  it('lista las carpetas de chats (con su sha como versión) e ignora lo demás', async () => {
    entradas.mockResolvedValue([{ nombre: ID, tipo: 'dir', sha: 'v1' }, { nombre: 'LEEME.md', tipo: 'file', sha: 'x' }, { nombre: 'otra', tipo: 'dir', sha: 'y' }]);
    expect(await listarRemotos(cfg, 'calculo')).toEqual([{ id: ID, version: 'v1' }]);
    expect(entradas).toHaveBeenCalledWith(cfg, 'estudios/calculo/chats', undefined);
  });
  it('una carpeta de chats que no existe da [] solo si la llave ve el repositorio (si no, no se borra nada aquí)', async () => {
    entradas.mockResolvedValue([]);
    vi.mocked(cliente.comprobarAcceso).mockResolvedValueOnce(undefined);
    expect(await listarRemotos(cfg, 'calculo')).toEqual([]);
    vi.mocked(cliente.comprobarAcceso).mockRejectedValueOnce(new cliente.ErrorGitHub('no-existe', 'No existe el repositorio'));
    await expect(listarRemotos(cfg, 'calculo')).rejects.toMatchObject({ tipo: 'no-existe' });
  });
  it('sube en un commit solo lo que ha cambiado y borra lo que ya no está; la versión es la de su propio commit', async () => {
    const igual = createHash('sha1').update('blob 2\0{}').digest('hex'); // el de 'e30=' ({}), ya en GitHub
    archivos.mockResolvedValue([{ ruta: 'conversacion.jsonl', sha: igual }, { ruta: 'chat.json', sha: 'a' }, { ruta: 'pizarra-2.json', sha: 'b' }]);
    subir.mockResolvedValue('c7');
    entradas.mockImplementation(async (_c, _r, ref) => [{ nombre: ID, tipo: 'dir', sha: ref === 'c7' ? 'v2' : 'v1' }]);
    const v = await subirPaquete(cfg, 'calculo', ID, [{ ruta: 'chat.json', base64: 'eyJhIjoxfQ==' }, { ruta: 'conversacion.jsonl', base64: 'e30=' }], 'Derivadas', 'v1');
    expect(v).toBe('v2');
    expect(subir).toHaveBeenCalledWith(cfg, [
      { ruta: `estudios/calculo/chats/${ID}/chat.json`, base64: 'eyJhIjoxfQ==' },
      { ruta: `estudios/calculo/chats/${ID}/pizarra-2.json`, base64: null },
    ], 'Chat compartido: calculo · Derivadas', expect.any(Function));
  });
  it('si otro dispositivo subió este chat justo antes, no lo pisa: da conflicto', async () => {
    archivos.mockResolvedValue([]);
    subir.mockImplementation(async (_c, _cambios, _m, comprobar) => {
      await comprobar!('c8');
      return 'c9';
    });
    entradas.mockImplementation(async (_c, _r, ref) => [{ nombre: ID, tipo: 'dir', sha: ref === 'c8' ? 'v-del-otro' : 'v1' }]);
    await expect(subirPaquete(cfg, 'calculo', ID, [{ ruta: 'chat.json', base64: 'e30=' }], 'Derivadas', 'v1')).rejects.toMatchObject({ tipo: 'conflicto' });
    expect(entradas).toHaveBeenCalledWith(cfg, 'estudios/calculo/chats', 'c8');
  });
  it('baja todos los archivos por su sha', async () => {
    archivos.mockResolvedValue([{ ruta: 'conversacion.jsonl', sha: 's1' }, { ruta: 'imagenes/a.png', sha: 's2' }]);
    vi.mocked(cliente.leerBlob).mockImplementation(async (_c, sha) => `B64-${sha}`);
    expect(await bajarPaquete(cfg, 'calculo', ID)).toEqual([{ ruta: 'conversacion.jsonl', base64: 'B64-s1' }, { ruta: 'imagenes/a.png', base64: 'B64-s2' }]);
  });
  it('quitar borra todos sus archivos en un commit; si no existía, no hace nada', async () => {
    archivos.mockResolvedValue([{ ruta: 'chat.json', sha: 'a' }]);
    await quitarRemoto(cfg, 'calculo', ID, 'Derivadas');
    expect(subir).toHaveBeenCalledWith(cfg, [{ ruta: `estudios/calculo/chats/${ID}/chat.json`, base64: null }], 'Chat ya no compartido: calculo · Derivadas');
    subir.mockClear();
    archivos.mockResolvedValue([]);
    await quitarRemoto(cfg, 'calculo', ID, 'Derivadas');
    expect(subir).not.toHaveBeenCalled();
  });
  it('lee los mensajes del .jsonl', async () => {
    vi.mocked(cliente.leerArchivo).mockResolvedValue({ texto: JSON.stringify({ type: 'user', message: { content: 'Hola' } }) + '\n', sha: 's' });
    expect(await leerMensajesRemotos(cfg, 'calculo', ID)).toEqual([{ rol: 'diego', texto: 'Hola' }]);
  });
});
