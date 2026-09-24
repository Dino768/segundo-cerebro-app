import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from './github/cliente';
import { parseProyecto } from './datos/proyectos';
import { ErrorDatos } from './datos/yaml';
import { cargarAgenda, cargarTodo, guardarProyecto, modificarBandeja, modificarTareas } from './repositorio';
import { anadirIdea, ErrorIdeaCambiada, quitarIdea } from './agenda/ideas';
import { ideasDe } from './datos/ideas';

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
      if (ruta === 'ideas/bandeja.md') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
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
    expect(d.ideas).toEqual([]);
  });
});

describe('cargarAgenda', () => {
  it('lee solo tareas y áreas, sin tocar los proyectos', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'ideas/bandeja.md') return { texto: '# Bandeja\n- 2026-09-24: Idea\n', sha: 'b' };
      if (ruta === 'agenda/tareas.yaml') return { texto: '- id: a\n  titulo: A\n  area: uni\n', sha: 't' };
      if (ruta === 'agenda/areas.yaml') return { texto: '- id: uni\n  nombre: [roto\n', sha: 'a' };
      throw new Error(`ruta inesperada ${ruta}`);
    });
    const d = await cargarAgenda(cfg);
    expect(d.tareas.map((t) => t.id)).toEqual(['a']);
    expect(d.areas).toEqual([]);
    expect(d.errores.map((e) => e.archivo)).toEqual(['agenda/areas.yaml']);
    expect(listar).not.toHaveBeenCalled();
    expect(ideasDe(d.ideas)).toEqual([{ fecha: '2026-09-24', texto: 'Idea' }]);
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

describe('modificarBandeja', () => {
  it('aplica el cambio sobre la bandeja remota más reciente', async () => {
    const escrito = simularRemoto('# Bandeja\n\n- 2026-09-22: Vieja\n');
    const r = await modificarBandeja(cfg, (ls) => anadirIdea(ls, { fecha: '2026-09-24', texto: 'Nueva' }), 'msg');
    expect(ideasDe(r).map((i) => i.texto)).toEqual(['Nueva', 'Vieja']);
    expect(escrito()).toBe('# Bandeja\n\n- 2026-09-22: Vieja\n- 2026-09-24: Nueva\n');
    expect(actualizar).toHaveBeenCalledWith(cfg, 'ideas/bandeja.md', expect.any(Function), 'msg');
  });
  it('si el archivo no existe, parte de una bandeja vacía', async () => {
    const escrito = simularRemoto(null);
    await modificarBandeja(cfg, (ls) => anadirIdea(ls, { fecha: '2026-09-24', texto: 'Primera' }), 'm');
    expect(escrito()).toContain('# Bandeja de ideas');
  });
  it('si la idea ya no está, no escribe nada', async () => {
    const escrito = simularRemoto('- 2026-09-22: Otra\n');
    await expect(
      modificarBandeja(cfg, (ls) => quitarIdea(ls, { fecha: '2026-09-22', texto: 'Borrada' }), 'm'),
    ).rejects.toBeInstanceOf(ErrorIdeaCambiada);
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
