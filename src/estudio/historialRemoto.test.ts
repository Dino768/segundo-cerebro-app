import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from '../github/cliente';
import { listarHistorial, leerDeHistorial, subirAlHistorial } from './historialRemoto';
import { pizarraVacia, serializarPizarra, type Pizarra } from './pizarra';

vi.mock('../github/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('../github/cliente')>();
  return { ...real, leerArchivo: vi.fn(), listarCarpeta: vi.fn(), actualizarArchivo: vi.fn(), escribirBase64: vi.fn(), leerBinario: vi.fn() };
});

const cfg = { owner: 'diego', repo: 'my-context', token: 'x' };
const listar = vi.mocked(cliente.listarCarpeta);
const leer = vi.mocked(cliente.leerArchivo);
const actualizar = vi.mocked(cliente.actualizarArchivo);
const escribirB64 = vi.mocked(cliente.escribirBase64);

const conImagen: Pizarra = { ...pizarraVacia('Newton'), piezas: [{ id: 'i1', tipo: 'imagen', x: 0, y: 0, ancho: 100, contenido: 'imagenes/a.png' }] };

beforeEach(() => vi.resetAllMocks());

describe('historial en GitHub', () => {
  it('lista solo los .json, de más nuevo a más viejo', async () => {
    listar.mockResolvedValue(['2026-09-20-a.json', 'LEEME.md', '2026-09-24-b.json']);
    expect((await listarHistorial(cfg, 'fisica')).map((e) => e.archivo)).toEqual(['2026-09-24-b.json', '2026-09-20-a.json']);
    expect(listar).toHaveBeenCalledWith(cfg, 'estudios/fisica/pizarras');
  });
  it('lee y valida una pizarra', async () => {
    leer.mockResolvedValue({ texto: serializarPizarra(pizarraVacia('Hola')), sha: 's' });
    expect((await leerDeHistorial(cfg, 'fisica', 'a.json')).titulo).toBe('Hola');
    leer.mockResolvedValue({ texto: '{"version":2}', sha: 's' });
    await expect(leerDeHistorial(cfg, 'fisica', 'a.json')).rejects.toThrow();
  });
  it('sube una pizarra nueva con sus imágenes y un nombre libre', async () => {
    listar.mockResolvedValue(['2026-09-24-newton.json']);
    let escrito = '';
    actualizar.mockImplementation(async (_c, _r, transformar) => (escrito = transformar(null)));
    escribirB64.mockResolvedValue('sha');
    const ruta = await subirAlHistorial(cfg, 'fisica', conImagen, 'Newton', '2026-09-24', async () => 'QUJD');
    expect(ruta).toBe('estudios/fisica/pizarras/2026-09-24-newton-2.json');
    expect(escribirB64).toHaveBeenCalledWith(cfg, 'estudios/fisica/pizarras/imagenes/a.png', 'QUJD', null, expect.any(String));
    expect(JSON.parse(escrito)).toMatchObject({ titulo: 'Newton', guardarComo: null, guardadaEn: null });
  });
  it('una pizarra ya guardada se actualiza en el mismo archivo, y una imagen ya subida no es un error', async () => {
    actualizar.mockImplementation(async (_c, _r, transformar) => transformar('antiguo'));
    escribirB64.mockRejectedValue(new cliente.ErrorGitHub('conflicto', 'ya existe', 422));
    const ya = { ...conImagen, guardadaEn: 'estudios/fisica/pizarras/2026-09-20-newton.json' };
    expect(await subirAlHistorial(cfg, 'fisica', ya, 'Newton', '2026-09-24', async () => 'QUJD')).toBe('estudios/fisica/pizarras/2026-09-20-newton.json');
    expect(listar).not.toHaveBeenCalled();
  });
  it('sin red, el error llega al que llama (para marcar «pendiente de subir»)', async () => {
    listar.mockRejectedValue(new cliente.ErrorGitHub('red', 'Sin conexión con GitHub'));
    await expect(subirAlHistorial(cfg, 'fisica', conImagen, 'Newton', '2026-09-24', async () => 'x')).rejects.toMatchObject({ tipo: 'red' });
  });
});
