import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from './github/cliente';
import { parseProyecto } from './datos/proyectos';
import { ErrorDatos } from './datos/yaml';
import { cargarTodo, guardarProyecto, modificarTareas } from './repositorio';

vi.mock('./github/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('./github/cliente')>();
  return { ...real, leerArchivo: vi.fn(), listarCarpeta: vi.fn(), actualizarArchivo: vi.fn() };
});

const cfg = { owner: 'diego', repo: 'my-context', token: 'x' };
const leer = vi.mocked(cliente.leerArchivo);
const listar = vi.mocked(cliente.listarCarpeta);
const actualizar = vi.mocked(cliente.actualizarArchivo);

function simularRemoto(texto: string | null): () => string | undefined {
  let escrito: string | undefined;
  actualizar.mockImplementation(async (_cfg, _ruta, transformar) => {
    escrito = transformar(texto);
    return escrito;
  });
  return () => escrito;
}

beforeEach(() => vi.resetAllMocks());

describe('cargarTodo', () => {
  it('carga lo que puede y aparta los archivos rotos', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'agenda/tareas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
      if (ruta === 'agenda/areas.yaml') return { texto: '- id: uni\n  nombre: [roto\n', sha: 'a' };
      if (ruta === 'proyectos/juego.md') return { texto: '---\nestado: activo\n---\n# Juego\n', sha: 'p' };
      throw new Error(`ruta inesperada ${ruta}`);
    });
    listar.mockResolvedValue(['juego.md', 'notas.txt']);
    const d = await cargarTodo(cfg);
    expect(d.tareas).toEqual([]);
    expect(d.areas).toEqual([]);
    expect(d.errores.map((e) => e.archivo)).toEqual(['agenda/areas.yaml']);
    expect(d.proyectos.map((p) => p.titulo)).toEqual(['Juego']);
  });
});

describe('modificarTareas', () => {
  it('aplica el cambio sobre la versión remota más reciente', async () => {
    const escrito = simularRemoto('- id: a\n  titulo: Remota\n  area: uni\n');
    const r = await modificarTareas(cfg, (ts) => ts.map((t) => ({ ...t, hecha: true })), 'msg');
    expect(r).toEqual([{ id: 'a', titulo: 'Remota', area: 'uni', hecha: true }]);
    expect(escrito()).toContain('hecha: true');
    expect(actualizar).toHaveBeenCalledWith(cfg, 'agenda/tareas.yaml', expect.any(Function), 'msg');
  });

  it('si el archivo no existe, el cambio parte de una lista vacía', async () => {
    simularRemoto(null);
    const r = await modificarTareas(cfg, (ts) => [...ts, { id: 'n', titulo: 'N', area: 'uni' }], 'm');
    expect(r).toHaveLength(1);
  });

  it('no escribe si el archivo remoto está roto', async () => {
    const escrito = simularRemoto('- id: [roto\n');
    await expect(modificarTareas(cfg, (ts) => ts, 'm')).rejects.toBeInstanceOf(ErrorDatos);
    expect(escrito()).toBeUndefined();
  });
});

describe('guardarProyecto', () => {
  const texto = '---\nestado: idea\n---\n# Juego\nNotas\n';
  const original = parseProyecto('juego', texto);

  it('guarda si nadie lo ha cambiado', async () => {
    const escrito = simularRemoto(texto);
    await guardarProyecto(cfg, { ...original, cuerpo: '# Juego\nNuevo\n' }, original);
    expect(escrito()).toContain('Nuevo');
  });

  it('da conflicto si Claude lo cambió desde que se abrió', async () => {
    simularRemoto(texto.replace('Notas', 'Cambiado por Claude'));
    await expect(guardarProyecto(cfg, { ...original, cuerpo: 'x' }, original)).rejects.toMatchObject({ tipo: 'conflicto' });
  });

  it('no pisa un proyecto existente al crear uno nuevo', async () => {
    simularRemoto(texto);
    await expect(guardarProyecto(cfg, original, null)).rejects.toMatchObject({ tipo: 'conflicto' });
  });
});
