import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from './github/cliente';
import { parseProyecto } from './datos/proyectos';
import { ErrorDatos } from './datos/yaml';
import { cargarAgenda, cargarTodo, guardarProyecto, listarIdsProyectos, modificarAsignaturas, modificarIdeas, modificarTareas } from './repositorio';

vi.mock('./github/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('./github/cliente')>();
  return { ...real, leerArchivo: vi.fn(), listarCarpeta: vi.fn(), actualizarArchivo: vi.fn(), borrarArchivo: vi.fn() };
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
      if (ruta === 'estudios/asignaturas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
      if (ruta === 'ideas/ideas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
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
      if (ruta === 'estudios/asignaturas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
      if (ruta === 'ideas/ideas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
      if (ruta === 'ideas/bandeja.md') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
      if (ruta === 'agenda/tareas.yaml') return { texto: '- id: a\n  titulo: A\n  area: uni\n', sha: 't' };
      if (ruta === 'agenda/areas.yaml') return { texto: '- id: uni\n  nombre: [roto\n', sha: 'a' };
      throw new Error(`ruta inesperada ${ruta}`);
    });
    const d = await cargarAgenda(cfg);
    expect(d.tareas.map((t) => t.id)).toEqual(['a']);
    expect(d.areas).toEqual([]);
    expect(d.errores.map((e) => e.archivo)).toEqual(['agenda/areas.yaml']);
    expect(listar).not.toHaveBeenCalled();
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

describe('ideas', () => {
  it('cargarAgenda lee ideas.yaml y suma lo que quede en la bandeja antigua', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'ideas/ideas.yaml') return { texto: '- id: i-20260925-1\n  fecha: 2026-09-25\n  texto: Nueva\n', sha: 'i' };
      if (ruta === 'ideas/bandeja.md') return { texto: '# Bandeja\n- 2026-09-24: De la bandeja\n', sha: 'b' };
      throw new cliente.ErrorGitHub('no-existe', 'no', 404);
    });
    const d = await cargarAgenda(cfg);
    expect(d.ideas.map((i) => i.texto)).toEqual(['Nueva', 'De la bandeja']);
    expect(d.bandejaPendiente).toBe(true);
  });
  it('sin bandeja no hay nada pendiente', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'ideas/ideas.yaml') return { texto: '', sha: 'i' };
      throw new cliente.ErrorGitHub('no-existe', 'no', 404);
    });
    expect((await cargarAgenda(cfg)).bandejaPendiente).toBe(false);
  });
  it('un ideas.yaml roto se aparta y no se intenta el paso', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'ideas/ideas.yaml') return { texto: '- id: [roto\n', sha: 'i' };
      if (ruta === 'ideas/bandeja.md') return { texto: '- 2026-09-24: X\n', sha: 'b' };
      throw new cliente.ErrorGitHub('no-existe', 'no', 404);
    });
    const d = await cargarAgenda(cfg);
    expect(d.errores.map((e) => e.archivo)).toEqual(['ideas/ideas.yaml']);
    expect(d.bandejaPendiente).toBe(false);
  });
  it('modificarIdeas aplica el cambio sobre lo último de GitHub', async () => {
    const escrito = simularRemoto('- id: i-20260922-1\n  fecha: 2026-09-22\n  texto: Vieja\n');
    const r = await modificarIdeas(cfg, (is) => is.filter((i) => i.id !== 'i-20260922-1'), 'Borrar idea');
    expect(r).toEqual([]);
    expect(escrito()).toBe('');
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

describe('asignaturas', () => {
  it('cargarAgenda lee las asignaturas', async () => {
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'estudios/asignaturas.yaml')
        return { texto: 'asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n', sha: 's' };
      throw new cliente.ErrorGitHub('no-existe', 'no', 404);
    });
    expect((await cargarAgenda(cfg)).asignaturas).toEqual([{ id: 'fisica', nombre: 'Física', color: '#3d7bb8' }]);
  });
  it('modificarAsignaturas aplica el cambio sobre lo que hay en GitHub', async () => {
    const escrito = simularRemoto(null);
    const r = await modificarAsignaturas(cfg, (l) => [...l, { id: 'fisica', nombre: 'Física', color: '#3d7bb8' }], 'Añadir asignatura');
    expect(r).toHaveLength(1);
    expect(escrito()).toContain('asignaturas:');
    expect(escrito()).toContain('id: fisica');
  });
});

describe('arreglos menores', () => {
  it('listarIdsProyectos lee los ids de GitHub', async () => {
    listar.mockResolvedValue(['juego.md', 'notas.txt', 'app.md']);
    expect(await listarIdsProyectos(cfg)).toEqual(['juego', 'app']);
  });
});
