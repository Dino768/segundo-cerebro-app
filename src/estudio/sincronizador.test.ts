import { describe, expect, it, vi } from 'vitest';
import { ErrorGitHub } from '../github/cliente';
import { crearSincronizador, type DependenciasSinc } from './sincronizador';
import type { ArchivoPaquete, Compartidos, EntradaCompartido, InfoChat } from './tipos';

function falso(inicial: Compartidos = {}, remotos: { id: string; version: string }[] = []) {
  const compartidos: Compartidos = { ...inicial };
  const d = {
    local: {
      preparar: vi.fn(async (_a: string, _id: string, _f: string): Promise<ArchivoPaquete[]> => [{ ruta: 'conversacion.jsonl', base64: 'e30=' }]),
      instalar: vi.fn(async (_a: string, _id: string, _p: ArchivoPaquete[]): Promise<InfoChat | null> => ({ compartidoEl: '2026-10-01', actualizado: 'x', dispositivo: 'PORTATIL' })),
      copiar: vi.fn(async (_a: string, _id: string, _n: string) => 'nuevo-id'),
      leerCompartidos: vi.fn(async (_a: string) => ({ ...compartidos })),
      poner: vi.fn(async (_a: string, id: string, e: EntradaCompartido | null) => {
        if (e) compartidos[id] = e;
        else delete compartidos[id];
      }),
      borrar: vi.fn(async (_a: string, _id: string) => undefined),
    },
    remoto: {
      listar: vi.fn(async (_a: string) => remotos),
      subir: vi.fn(async (_a: string, _id: string, _p: ArchivoPaquete[], _t: string) => 'v-nueva'),
      bajar: vi.fn(async (_a: string, _id: string): Promise<ArchivoPaquete[]> => [{ ruta: 'conversacion.jsonl', base64: 'e30=' }]),
      quitar: vi.fn(async (_a: string, _id: string, _t: string) => undefined),
    },
    hoy: () => '2026-10-10',
    avisar: vi.fn(async (_m: string) => undefined),
  } satisfies DependenciasSinc;
  return { d, s: crearSincronizador(d), compartidos };
}
const e = (version: string, pendiente = false) => ({ version, pendiente, compartidoEl: '2026-10-01' });

describe('sincronizador', () => {
  it('compartir sube el chat y guarda la versión', async () => {
    const { s, d, compartidos } = falso();
    expect(await s.compartir('calculo', 'a', 'Derivadas')).toBe('hecho');
    expect(d.local.preparar).toHaveBeenCalledWith('calculo', 'a', '2026-10-10');
    expect(compartidos.a).toEqual({ version: 'v-nueva', pendiente: false, compartidoEl: '2026-10-10' });
  });
  it('sin red, compartir queda pendiente (y luego sincronizar lo sube)', async () => {
    const { s, d, compartidos } = falso();
    d.remoto.listar.mockRejectedValueOnce(new ErrorGitHub('red', 'Sin conexión'));
    expect(await s.compartir('calculo', 'a', 'Derivadas')).toBe('pendiente');
    expect(compartidos.a).toMatchObject({ version: '', pendiente: true });
    expect(await s.sincronizar('calculo', { a: 'Derivadas' })).toBe(true);
    expect(compartidos.a).toMatchObject({ version: 'v-nueva', pendiente: false });
  });
  it('subir un chat que no está compartido no hace nada', async () => {
    const { s, d } = falso();
    expect(await s.subir('calculo', 'a', 'x')).toBe('no-compartido');
    expect(d.remoto.subir).not.toHaveBeenCalled();
  });
  it('subir con cambios en GitHub y aquí → conflicto: copia lo de aquí, baja lo de allí y avisa', async () => {
    const { s, d, compartidos } = falso({ a: e('v1') }, [{ id: 'a', version: 'v2' }]);
    expect(await s.subir('calculo', 'a', 'Derivadas')).toBe('conflicto');
    expect(d.local.copiar).toHaveBeenCalledWith('calculo', 'a', 'Derivadas');
    expect(d.local.instalar).toHaveBeenCalled();
    expect(d.remoto.subir).not.toHaveBeenCalled();
    expect(compartidos.a).toMatchObject({ version: 'v2', pendiente: false });
    expect(d.avisar).toHaveBeenCalledWith(expect.stringContaining('a la vez'));
  });
  it('subir un chat borrado en otro dispositivo lo deja como no compartido', async () => {
    const { s, compartidos } = falso({ a: e('v1') }, []);
    expect(await s.subir('calculo', 'a', 'x')).toBe('olvidado');
    expect(compartidos.a).toBeUndefined();
  });
  it('el error de 50 MB del programa local llega al que llama', async () => {
    const { s, d } = falso({ a: e('v1') }, [{ id: 'a', version: 'v1' }]);
    d.local.preparar.mockRejectedValueOnce(new Error('Este chat ocupa más de 50 MB y no se puede compartir'));
    await expect(s.subir('calculo', 'a', 'x')).rejects.toThrow('50 MB');
  });
  it('sincronizar baja lo nuevo, borra lo quitado y no falla sin red', async () => {
    const { s, d, compartidos } = falso({ viejo: e('v1') }, [{ id: 'nuevo', version: 'v5' }]);
    expect(await s.sincronizar('calculo', {})).toBe(true);
    expect(d.local.instalar).toHaveBeenCalledWith('calculo', 'nuevo', expect.any(Array));
    expect(compartidos.nuevo).toEqual({ version: 'v5', pendiente: false, compartidoEl: '2026-10-01' });
    expect(d.local.borrar).toHaveBeenCalledWith('calculo', 'viejo');
    expect(compartidos.viejo).toBeUndefined();
    d.remoto.listar.mockRejectedValueOnce(new ErrorGitHub('red', 'Sin conexión'));
    expect(await s.sincronizar('calculo', {})).toBe(false);
  });
  it('antesDeEnviar baja la versión nueva si aquí no había nada pendiente', async () => {
    const { s, compartidos } = falso({ a: e('v1') }, [{ id: 'a', version: 'v2' }]);
    expect(await s.antesDeEnviar('calculo', 'a', 'x')).toBe('bajado');
    expect(compartidos.a.version).toBe('v2');
  });
  it('antesDeEnviar sin red sigue como si nada', async () => {
    const { s, d } = falso({ a: e('v1') });
    d.remoto.listar.mockRejectedValueOnce(new ErrorGitHub('red', 'Sin conexión'));
    expect(await s.antesDeEnviar('calculo', 'a', 'x')).toBe('igual');
  });
  it('dejarDeCompartir quita de GitHub y de compartidos.json, pero no borra el chat', async () => {
    const { s, d, compartidos } = falso({ a: e('v1') });
    await s.dejarDeCompartir('calculo', 'a', 'Derivadas');
    expect(d.remoto.quitar).toHaveBeenCalledWith('calculo', 'a', 'Derivadas');
    expect(compartidos.a).toBeUndefined();
    expect(d.local.borrar).not.toHaveBeenCalled();
  });
  it('borrarEnTodos sin red no toca lo local', async () => {
    const { s, d, compartidos } = falso({ a: e('v1') });
    d.remoto.quitar.mockRejectedValueOnce(new ErrorGitHub('red', 'Sin conexión'));
    await expect(s.borrarEnTodos('calculo', 'a', 'x')).rejects.toMatchObject({ tipo: 'red' });
    expect(d.local.borrar).not.toHaveBeenCalled();
    expect(compartidos.a).toBeDefined();
  });
  it('borrarEnTodos con red borra allí y aquí', async () => {
    const { s, d, compartidos } = falso({ a: e('v1') });
    await s.borrarEnTodos('calculo', 'a', 'x');
    expect(d.local.borrar).toHaveBeenCalledWith('calculo', 'a');
    expect(compartidos.a).toBeUndefined();
  });
});
