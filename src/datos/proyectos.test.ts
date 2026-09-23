import { describe, expect, it } from 'vitest';
import { idProyectoDesdeTitulo, parseProyecto, serializarProyecto } from './proyectos';
import { ErrorDatos } from './yaml';

const TEXTO = '---\nestado: activo\narea: videojuegos\nprioridad: alta\nextra: 1\n---\n# Juego de plataformas\n\nNotas con ñ.\n';

describe('parseProyecto', () => {
  it('lee el encabezado, el título y el cuerpo', () => {
    const p = parseProyecto('juego', TEXTO);
    expect(p).toMatchObject({ id: 'juego', estado: 'activo', area: 'videojuegos', prioridad: 'alta', titulo: 'Juego de plataformas' });
    expect(p.cuerpo).toBe('# Juego de plataformas\n\nNotas con ñ.\n');
  });

  it('sin encabezado → estado idea', () => {
    const p = parseProyecto('viejo', '# Proyecto viejo\nTexto\n');
    expect(p.estado).toBe('idea');
    expect(p.cuerpo).toBe('# Proyecto viejo\nTexto\n');
  });

  it('acepta saltos de línea de Windows', () => {
    expect(parseProyecto('juego', TEXTO.replace(/\n/g, '\r\n')).estado).toBe('activo');
  });

  it('sin título # usa el id', () => {
    expect(parseProyecto('sin-titulo', '---\nestado: idea\n---\nsolo texto\n').titulo).toBe('sin-titulo');
  });

  it('estado inválido → ErrorDatos con el archivo', () => {
    try {
      parseProyecto('x', '---\nestado: pausado\n---\n# X\n');
      throw new Error('no lanzó');
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDatos);
      expect((e as ErrorDatos).archivo).toBe('proyectos/x.md');
      expect((e as ErrorDatos).message).toContain('estado');
    }
  });

  it('ida y vuelta sin perder campos extra ni texto', () => {
    const p = parseProyecto('juego', TEXTO);
    expect(parseProyecto('juego', serializarProyecto(p))).toEqual(p);
  });

  it('serializar quita del encabezado los campos que se han vaciado', () => {
    const p = { ...parseProyecto('juego', TEXTO), area: undefined };
    expect(serializarProyecto(p)).not.toContain('area:');
  });
});

describe('idProyectoDesdeTitulo', () => {
  it('convierte el título en un nombre de archivo seguro y único', () => {
    expect(idProyectoDesdeTitulo('Juego de Plataformas ñ!', [])).toBe('juego-de-plataformas-n');
    expect(idProyectoDesdeTitulo('Juego', ['juego', 'juego-2'])).toBe('juego-3');
    expect(idProyectoDesdeTitulo('!!!', [])).toBe('proyecto');
  });
});
