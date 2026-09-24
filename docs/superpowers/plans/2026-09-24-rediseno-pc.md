# Rediseño del PC (versión 1.1): plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a la app en el PC un tema claro "papel cálido", una barra lateral, un Inicio tipo panel de Notion, calendarios por área y una sección de Ideas conectada a `ideas/bandeja.md`.

**Architecture:** Igual que la v1: una app estática en React, sin servidor, que lee y escribe los archivos de `my-context` con la API de GitHub. La lógica nueva va en funciones puras con tests:
- formato de la bandeja: `src/datos/ideas.ts`;
- operaciones con ideas: `src/agenda/ideas.ts`;
- progreso de proyectos, saludo y filtro de áreas.

`repositorio.ts` y `datos.tsx` añaden la bandeja con el mismo patrón que las tareas: leer lo último, aplicar el cambio y reintentar, todo por la cola. Las pantallas solo pintan.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Vitest 5, `yaml`. CSS propio en `src/estilos.css`, sin librerías nuevas.

**Spec:** `docs/superpowers/specs/2026-09-24-rediseno-pc-design.md`. Léelo antes de empezar. El boceto aprobado está en `.superpowers/brainstorm/387-1790245911/content/inicio-pc.html` (local).

**Execution note:**
- Diego es principiante: explícale en español y con palabras sencillas qué hace cada tarea y por qué.
- Cada tarea deja su línea en `.superpowers/sdd/plan-v1.1/progress.md` (créalo en la Task 1). Lo que se aparte del plan se apunta como `Ruling:`.
- Los commits son locales: **no hagas `git push`** hasta la Task 13, cuando Diego haya visto la app y dé el visto bueno. Subir a `main` publica la app sola.
- Node: en la terminal Bash de Claude Code, añade `export PATH="$PATH:/c/Program Files/nodejs";` delante de `npm`/`npx`.

## Global Constraints

- 0 € de coste: nada de API ni servicios de pago. Sin dependencias nuevas.
- Textos de la interfaz en español.
- El repositorio es público: ni tokens ni datos personales en el código. Diego nunca pega su token en el chat.
- Tema siempre claro: `color-scheme: light` y ningún bloque `prefers-color-scheme: dark`.
- Colores exactos (spec §3): `--fondo #f6f1e7`, `--lateral #efe7d8`, `--superficie #fbf8f2`, `--texto #3b3027`, `--suave #8b7b6a`, `--borde #e6dccb`, `--acento #b8603d`, `--acento-suave #f1dccf`, `--peligro #b3412e`, `--aviso #fbecc4`, `--error #f6ddd6`.
- Barra lateral a partir de `min-width: 900px`. Por debajo, menú abajo.
- Formato de idea: `- AAAA-MM-DD: texto` o `- AAAA-MM-DD [id-proyecto]: texto`. Las demás líneas de `bandeja.md` se conservan tal cual.
- Casos de dos pasos (idea → tarea, idea → proyecto): primero se crea lo nuevo y después se quita la idea.
- La app nunca sobrescribe un archivo que no ha podido leer y validar (v1).
- Sin comentarios `#` nuevos en `tareas.yaml`. Los ids de tarea siguen siendo `t-AAAAMMDD-n`.

## Review Focus

1. **`bandeja.md` con saltos de línea de Windows (`\r\n`)**, porque Diego o Git en Windows pueden guardarla así: las ideas se reconocen igual y ningún texto acaba con `\r`. Test en la Task 1.
2. **Texto de idea con `: ` o corchetes** («Juego: jefe [final]»): se lee entero, sin confundirlo con un proyecto. Test en la Task 1.
3. **Dos ideas idénticas** (misma fecha y texto): borrar o pasar una a tarea quita **solo una**. Test en la Task 2.
4. **Idea pegada con saltos de línea**: se guarda en una sola línea; si no, rompería el formato de la bandeja. Test en la Task 2.
5. **Filtro del calendario guardado con un área que ya no existe** (se borró de `areas.yaml`): el calendario no se queda vacío y se ven todas. Test en la Task 4.

---

## Estructura de archivos

| Archivo | Qué hace |
|---|---|
| `src/datos/ideas.ts` (nuevo) | Tipos `Idea`/`Linea`, `parseBandeja`, `serializarBandeja`, `ideasDe`, `CABECERA_BANDEJA` |
| `src/agenda/ideas.ts` (nuevo) | `anadirIdea`, `vincularIdea`, `quitarIdea`, `ErrorIdeaCambiada`, `proyectoDesdeIdea` |
| `src/agenda/proyectos.ts` | + `progresoProyecto` |
| `src/datos/proyectos.ts` | + `dondeLoDejamos` |
| `src/agenda/tareas.ts` | + `contarPendientes`, `filtrarPorAreas`, `alternarArea`, `hayOtrasAreas`, `OTRAS` |
| `src/fechas.ts` | + `saludo` |
| `src/datos/rutas.ts` | + `RUTA_BANDEJA` |
| `src/repositorio.ts` | `Agenda`/`Datos` con `ideas`; `cargarAgenda` lee la bandeja; + `modificarBandeja` |
| `src/estado/cache.ts` | guarda también `ideas` |
| `src/estado/datos.tsx` | + `cambiarIdeas`; el refresco trae también las ideas |
| `src/estilos.css` | tema nuevo; cada tarea de pantalla añade su bloque |
| `src/componentes/navegacion.ts` (nuevo) | `Pantalla`, `Destino`, `SECCIONES`, `URL_USO_CLAUDE` |
| `src/componentes/Lateral.tsx` (nuevo) | barra lateral del PC |
| `src/componentes/MenuMovil.tsx` (nuevo) | menú de abajo (móvil) |
| `src/componentes/Captura.tsx` (nuevo) | captura rápida del Inicio |
| `src/componentes/EtiquetaTarea.tsx` (nuevo) | etiqueta de color de una tarea en semana y mes |
| `src/componentes/BarraProgreso.tsx` (nuevo) | barra «N de M tareas» |
| `src/componentes/FormProyectoDesdeIdea.tsx` (nuevo) | ventana «Convertir en proyecto» |
| `src/pantallas/Inicio.tsx` (nuevo) | Inicio; sustituye a `Hoy.tsx`, que se borra |
| `src/pantallas/Ideas.tsx` (nuevo) | pantalla Ideas |
| `src/App.tsx` | diseño de dos columnas y navegación con destino |
| `src/pantallas/Calendario.tsx` | filtro por áreas, `diaInicial`, `EtiquetaTarea` |
| `src/pantallas/Proyectos.tsx`, `PaginaProyecto.tsx`, `Tareas.tsx`, `Ajustes.tsx` | estilo, progreso, ideas del proyecto |
| `src/componentes/FormTarea.tsx` | `nueva.titulo`, `nota`, `alGuardar` |

---

### Task 1: Formato de la bandeja de ideas

**Files:**
- Create: `src/datos/ideas.ts`
- Create: `src/datos/ideas.test.ts`
- Modify: `src/datos/rutas.ts`
- Create: `.superpowers/sdd/plan-v1.1/progress.md`

**Interfaces:**
- Consumes: `isISODate`, `ISODate` de `src/fechas.ts`.
- Produces:
  - `interface Idea { fecha: ISODate; proyecto?: string; texto: string }`
  - `type Linea = { tipo: 'idea'; idea: Idea } | { tipo: 'otra'; texto: string }`
  - `parseBandeja(texto: string): Linea[]`
  - `serializarBandeja(lineas: Linea[]): string`
  - `lineaDeIdea(idea: Idea): string`
  - `ideasDe(lineas: Linea[]): Idea[]`
  - `CABECERA_BANDEJA: string`
  - `RUTA_BANDEJA = 'ideas/bandeja.md'`

- [ ] **Step 1: Crear el registro de progreso**

Crea `.superpowers/sdd/plan-v1.1/progress.md` con:

```markdown
# Registro: plan v1.1 (rediseño del PC)

Plan: docs/superpowers/plans/2026-09-24-rediseno-pc.md
```

- [ ] **Step 2: Escribir el test que falla**

Crea `src/datos/ideas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ideasDe, parseBandeja, serializarBandeja, type Linea } from './ideas';

const REAL =
  '# Bandeja de ideas\n\nAquí van las ideas nuevas. Una línea por idea, con la fecha.\n\n' +
  '- 2026-09-22: App propia con IA y MCP.\n' +
  '- 2026-09-24 [juego-nave]: Personaje: piloto con brazo robótico\n';

describe('parseBandeja', () => {
  it('lee ideas con y sin proyecto y conserva las demás líneas', () => {
    const ls = parseBandeja(REAL);
    expect(ls[0]).toEqual({ tipo: 'otra', texto: '# Bandeja de ideas' });
    expect(ls[1]).toEqual({ tipo: 'otra', texto: '' });
    expect(ls[4]).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'App propia con IA y MCP.' } });
    expect(ls[5]).toEqual({
      tipo: 'idea',
      idea: { fecha: '2026-09-24', proyecto: 'juego-nave', texto: 'Personaje: piloto con brazo robótico' },
    });
  });
  it('leer y volver a escribir deja el archivo idéntico', () => {
    expect(serializarBandeja(parseBandeja(REAL))).toBe(REAL);
  });
  it('entiende los saltos de línea de Windows', () => {
    const ls = parseBandeja('# Bandeja\r\n- 2026-09-24: Idea\r\n');
    expect(ls[1]).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'Idea' } });
    expect(serializarBandeja(ls)).toBe('# Bandeja\n- 2026-09-24: Idea\n');
  });
  it('un texto con dos puntos o corchetes se lee entero y sin proyecto', () => {
    const [l] = parseBandeja('- 2026-09-24: Juego: jefe [final]\n');
    expect(l).toEqual({ tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'Juego: jefe [final]' } });
  });
  it('una fecha imposible no es una idea, pero la línea se conserva', () => {
    expect(parseBandeja('- 2026-13-40: rara\n')).toEqual([{ tipo: 'otra', texto: '- 2026-13-40: rara' }]);
  });
  it('un archivo vacío es una bandeja vacía', () => {
    expect(parseBandeja('')).toEqual([]);
    expect(serializarBandeja([])).toBe('');
  });
});

describe('ideasDe', () => {
  it('ordena de la más nueva a la más antigua y, a igual fecha, la última del archivo primero', () => {
    const ls: Linea[] = [
      { tipo: 'otra', texto: '# Bandeja' },
      { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'a' } },
      { tipo: 'idea', idea: { fecha: '2026-09-24', texto: 'b' } },
      { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'c' } },
    ];
    expect(ideasDe(ls).map((i) => i.texto)).toEqual(['b', 'c', 'a']);
  });
});
```

- [ ] **Step 3: Ejecutar el test y ver que falla**

Run: `npx vitest run src/datos/ideas.test.ts`
Expected: FAIL con «Cannot find module './ideas'».

- [ ] **Step 4: Escribir el código**

En `src/datos/rutas.ts`, añade al final:

```ts
export const RUTA_BANDEJA = 'ideas/bandeja.md';
```

Crea `src/datos/ideas.ts`:

```ts
import { isISODate, type ISODate } from '../fechas';

export interface Idea {
  fecha: ISODate;
  proyecto?: string;
  texto: string;
}

export type Linea = { tipo: 'idea'; idea: Idea } | { tipo: 'otra'; texto: string };

export const CABECERA_BANDEJA =
  '# Bandeja de ideas\n\nAquí van las ideas nuevas, para no dejar lo que estoy haciendo. Una línea por idea, con la fecha. Ya las revisaremos.\n\n';

// - 2026-09-24: texto   o   - 2026-09-24 [id-proyecto]: texto
const PATRON = /^- (\d{4}-\d{2}-\d{2})(?: \[([a-z0-9-]+)\])?: (.+)$/;

export function parseBandeja(texto: string): Linea[] {
  const normal = texto.replace(/\r\n/g, '\n');
  if (normal === '') return [];
  const lineas = (normal.endsWith('\n') ? normal.slice(0, -1) : normal).split('\n');
  return lineas.map((l): Linea => {
    const m = PATRON.exec(l);
    if (!m || !isISODate(m[1])) return { tipo: 'otra', texto: l };
    const idea: Idea = m[2] ? { fecha: m[1], proyecto: m[2], texto: m[3] } : { fecha: m[1], texto: m[3] };
    return { tipo: 'idea', idea };
  });
}

export function lineaDeIdea(idea: Idea): string {
  return `- ${idea.fecha}${idea.proyecto ? ` [${idea.proyecto}]` : ''}: ${idea.texto}`;
}

export function serializarBandeja(lineas: Linea[]): string {
  if (lineas.length === 0) return '';
  return lineas.map((l) => (l.tipo === 'idea' ? lineaDeIdea(l.idea) : l.texto)).join('\n') + '\n';
}

export function ideasDe(lineas: Linea[]): Idea[] {
  return lineas
    .map((l, i) => ({ l, i }))
    .filter((x): x is { l: { tipo: 'idea'; idea: Idea }; i: number } => x.l.tipo === 'idea')
    .sort((a, b) => b.l.idea.fecha.localeCompare(a.l.idea.fecha) || b.i - a.i)
    .map((x) => x.l.idea);
}
```

- [ ] **Step 5: Ejecutar los tests y ver que pasan**

Run: `npx vitest run src/datos/ideas.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/datos/ideas.ts src/datos/ideas.test.ts src/datos/rutas.ts
git commit -m "Ideas: leer y escribir la bandeja sin perder otras líneas"
```

Apunta en el registro: `- Task 1: formato de la bandeja (parseBandeja/serializarBandeja/ideasDe). Tests OK.`

---

### Task 2: Operaciones con ideas

**Files:**
- Create: `src/agenda/ideas.ts`
- Create: `src/agenda/ideas.test.ts`

**Interfaces:**
- Consumes: `Idea`, `Linea`, `parseBandeja`, `CABECERA_BANDEJA` (Task 1).
- Produces:
  - `class ErrorIdeaCambiada extends Error`
  - `mismaIdea(a: Idea, b: Idea): boolean`
  - `anadirIdea(lineas: Linea[], idea: Idea): Linea[]`
  - `vincularIdea(lineas: Linea[], idea: Idea, proyecto: string | undefined): Linea[]`
  - `quitarIdea(lineas: Linea[], idea: Idea): Linea[]`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/agenda/ideas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CABECERA_BANDEJA, ideasDe, parseBandeja, serializarBandeja } from '../datos/ideas';
import { anadirIdea, ErrorIdeaCambiada, quitarIdea, vincularIdea } from './ideas';

const base = parseBandeja('# Bandeja\n\n- 2026-09-22: Vieja\n');
const vieja = { fecha: '2026-09-22', texto: 'Vieja' };

describe('anadirIdea', () => {
  it('añade la idea al final', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', texto: 'Nueva' });
    expect(serializarBandeja(r)).toBe('# Bandeja\n\n- 2026-09-22: Vieja\n- 2026-09-24: Nueva\n');
  });
  it('en una bandeja vacía pone antes la cabecera', () => {
    const r = anadirIdea([], { fecha: '2026-09-24', texto: 'Primera' });
    expect(serializarBandeja(r)).toBe(`${CABECERA_BANDEJA}- 2026-09-24: Primera\n`);
  });
  it('junta en una línea un texto pegado con saltos de línea', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', texto: '  Nivel de hielo\ncon  jefe\r\nfinal ' });
    expect(ideasDe(r)[0].texto).toBe('Nivel de hielo con jefe final');
  });
  it('un texto vacío no añade nada', () => {
    expect(anadirIdea(base, { fecha: '2026-09-24', texto: '  \n ' })).toBe(base);
  });
  it('guarda el proyecto si lo tiene', () => {
    const r = anadirIdea(base, { fecha: '2026-09-24', proyecto: 'juego', texto: 'X' });
    expect(serializarBandeja(r)).toContain('- 2026-09-24 [juego]: X\n');
  });
});

describe('vincularIdea', () => {
  it('pone y quita el proyecto sin mover la idea', () => {
    const vinculada = vincularIdea(base, vieja, 'juego-nave');
    expect(serializarBandeja(vinculada)).toBe('# Bandeja\n\n- 2026-09-22 [juego-nave]: Vieja\n');
    const suelta = vincularIdea(vinculada, { ...vieja, proyecto: 'juego-nave' }, undefined);
    expect(serializarBandeja(suelta)).toBe('# Bandeja\n\n- 2026-09-22: Vieja\n');
  });
  it('si la idea ya no está, lanza ErrorIdeaCambiada', () => {
    expect(() => vincularIdea(base, { fecha: '2026-09-22', texto: 'Otra' }, 'x')).toThrow(ErrorIdeaCambiada);
  });
});

describe('quitarIdea', () => {
  it('quita la idea y deja el resto', () => {
    expect(serializarBandeja(quitarIdea(base, vieja))).toBe('# Bandeja\n\n');
  });
  it('con dos ideas idénticas quita solo una', () => {
    const doble = parseBandeja('- 2026-09-22: Vieja\n- 2026-09-22: Vieja\n');
    expect(ideasDe(quitarIdea(doble, vieja))).toHaveLength(1);
  });
  it('distingue una idea vinculada de la misma sin vincular', () => {
    const ls = parseBandeja('- 2026-09-22 [juego]: Vieja\n');
    expect(() => quitarIdea(ls, vieja)).toThrow(ErrorIdeaCambiada);
  });
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx vitest run src/agenda/ideas.test.ts`
Expected: FAIL con «Cannot find module './ideas'».

- [ ] **Step 3: Escribir el código**

Crea `src/agenda/ideas.ts`:

```ts
import { CABECERA_BANDEJA, parseBandeja, type Idea, type Linea } from '../datos/ideas';

export class ErrorIdeaCambiada extends Error {
  constructor() {
    super('Esta idea ha cambiado mientras tanto (quizá la movió Claude). Se han recargado las ideas.');
    this.name = 'ErrorIdeaCambiada';
  }
}

// Las ideas no tienen id: una idea es su fecha, su proyecto y su texto.
export function mismaIdea(a: Idea, b: Idea): boolean {
  return a.fecha === b.fecha && (a.proyecto ?? '') === (b.proyecto ?? '') && a.texto === b.texto;
}

function posicion(lineas: Linea[], idea: Idea): number {
  const i = lineas.findIndex((l) => l.tipo === 'idea' && mismaIdea(l.idea, idea));
  if (i === -1) throw new ErrorIdeaCambiada();
  return i;
}

function crearIdea(fecha: string, texto: string, proyecto: string | undefined): Idea {
  return proyecto ? { fecha, proyecto, texto } : { fecha, texto };
}

export function anadirIdea(lineas: Linea[], idea: Idea): Linea[] {
  // Una idea es una sola línea del archivo: los saltos de línea pegados se vuelven espacios.
  const texto = idea.texto.replace(/\s+/g, ' ').trim();
  if (!texto) return lineas;
  const base = lineas.length ? lineas : parseBandeja(CABECERA_BANDEJA);
  return [...base, { tipo: 'idea', idea: crearIdea(idea.fecha, texto, idea.proyecto) }];
}

export function vincularIdea(lineas: Linea[], idea: Idea, proyecto: string | undefined): Linea[] {
  const i = posicion(lineas, idea);
  return lineas.map((l, j) => (j === i ? { tipo: 'idea', idea: crearIdea(idea.fecha, idea.texto, proyecto) } : l));
}

export function quitarIdea(lineas: Linea[], idea: Idea): Linea[] {
  const i = posicion(lineas, idea);
  return lineas.filter((_, j) => j !== i);
}
```

- [ ] **Step 4: Ejecutar los tests y ver que pasan**

Run: `npx vitest run src/agenda/ideas.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/agenda/ideas.ts src/agenda/ideas.test.ts
git commit -m "Ideas: añadir, vincular a un proyecto y quitar"
```

Apunta en el registro: `- Task 2: operaciones con ideas. Tests OK.`

---

### Task 3: Progreso de proyectos, «Dónde lo dejamos» y proyecto desde idea

**Files:**
- Modify: `src/agenda/proyectos.ts`
- Modify: `src/datos/proyectos.ts`
- Modify: `src/agenda/ideas.ts`
- Test: `src/agenda/proyectos.test.ts`, `src/datos/proyectos.test.ts`, `src/agenda/ideas.test.ts`

**Interfaces:**
- Consumes: `Tarea`, `esRepetida` (`src/agenda/tareas.ts`); `Proyecto`, `idProyectoDesdeTitulo`, `parseProyecto` (`src/datos/proyectos.ts`); `Idea` (Task 1).
- Produces:
  - `progresoProyecto(ts: Tarea[], id: string): { hechas: number; total: number }`
  - `dondeLoDejamos(cuerpo: string): string | undefined`
  - `proyectoDesdeIdea(idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate): Proyecto`

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `src/agenda/proyectos.test.ts`, añade `progresoProyecto` al import de `./proyectos` y un import de tipo `import type { Tarea } from '../datos/tareas';` si no lo tiene. Después, este bloque:

```ts
describe('progresoProyecto', () => {
  const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'uni', ...x });
  it('cuenta las tareas normales del proyecto y cuántas están hechas', () => {
    const ts = [
      t({ id: 'a', proyecto: 'juego', hecha: true }),
      t({ id: 'b', proyecto: 'juego' }),
      t({ id: 'c', proyecto: 'juego', repetir: ['lun'], hechas: ['2026-09-21'] }),
      t({ id: 'd', proyecto: 'otro', hecha: true }),
      t({ id: 'e' }),
    ];
    expect(progresoProyecto(ts, 'juego')).toEqual({ hechas: 1, total: 2 });
  });
  it('un proyecto sin tareas da 0 de 0', () => {
    expect(progresoProyecto([], 'juego')).toEqual({ hechas: 0, total: 0 });
  });
});
```

Al final de `src/datos/proyectos.test.ts`, añade `dondeLoDejamos` al import de `./proyectos` y este bloque:

```ts
describe('dondeLoDejamos', () => {
  it('devuelve la última línea no vacía de la sección', () => {
    const cuerpo =
      '# Segundo cerebro\n\n## Dónde lo dejamos\n2026-09-22: creada la estructura.\n2026-09-23: fase 1 terminada.\n\n\n## Siguiente\nAlgo\n';
    expect(dondeLoDejamos(cuerpo)).toBe('2026-09-23: fase 1 terminada.');
  });
  it('funciona si la sección es la última y quita el guion de lista', () => {
    expect(dondeLoDejamos('# P\n## Dónde lo dejamos\n- Probando el menú\n')).toBe('Probando el menú');
  });
  it('sin la sección, o con la sección vacía, no devuelve nada', () => {
    expect(dondeLoDejamos('# P\n\nNotas\n')).toBeUndefined();
    expect(dondeLoDejamos('# P\n## Dónde lo dejamos\n\n## Otra\nx\n')).toBeUndefined();
  });
});
```

Al final de `src/agenda/ideas.test.ts`, añade `proyectoDesdeIdea` al import de `./ideas`, `import { parseProyecto, serializarProyecto } from '../datos/proyectos';` y este bloque:

```ts
describe('proyectoDesdeIdea', () => {
  const idea = { fecha: '2026-09-20', texto: 'Juego de naves con hielo' };
  it('crea un proyecto en estado idea con la idea dentro', () => {
    const p = proyectoDesdeIdea(idea, 'Juego de naves', 'videojuegos', [], '2026-09-24');
    expect(p.id).toBe('juego-de-naves');
    expect(p.estado).toBe('idea');
    expect(p.area).toBe('videojuegos');
    expect(p.titulo).toBe('Juego de naves');
    expect(p.cuerpo).toBe(
      '# Juego de naves\n\n## Qué es\nJuego de naves con hielo\n\n## Dónde lo dejamos\n2026-09-24: creado desde la bandeja de ideas.\n',
    );
    const vuelta = parseProyecto(p.id, serializarProyecto(p));
    expect(vuelta).toMatchObject({ estado: 'idea', area: 'videojuegos', titulo: 'Juego de naves' });
  });
  it('no repite un id existente y funciona sin área', () => {
    const p = proyectoDesdeIdea(idea, 'Juego de naves', undefined, ['juego-de-naves'], '2026-09-24');
    expect(p.id).toBe('juego-de-naves-2');
    expect(p.area).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar los tests y ver que fallan**

Run: `npx vitest run src/agenda src/datos/proyectos.test.ts`
Expected: FAIL con «progresoProyecto is not a function», «dondeLoDejamos is not a function» y «proyectoDesdeIdea is not a function».

- [ ] **Step 3: Escribir el código**

En `src/agenda/proyectos.ts`, cambia el import de `./tareas` y añade la función al final:

```ts
import type { Tarea } from '../datos/tareas';
import { compararPrioridad, esRepetida } from './tareas';
```

```ts
// Progreso = tareas normales del proyecto hechas / total. Las que se repiten cada semana no cuentan.
export function progresoProyecto(ts: Tarea[], id: string): { hechas: number; total: number } {
  const delProyecto = ts.filter((t) => t.proyecto === id && !esRepetida(t));
  return { hechas: delProyecto.filter((t) => t.hecha).length, total: delProyecto.length };
}
```

En `src/datos/proyectos.ts`, añade al final:

```ts
export function dondeLoDejamos(cuerpo: string): string | undefined {
  const lineas = cuerpo.replace(/\r\n/g, '\n').split('\n');
  const inicio = lineas.findIndex((l) => /^##\s+d[oó]nde lo dejamos\s*$/i.test(l.trim()));
  if (inicio === -1) return undefined;
  let ultima: string | undefined;
  for (const l of lineas.slice(inicio + 1)) {
    if (/^#{1,2}\s/.test(l)) break;
    const limpia = l.trim().replace(/^[-*]\s+/, '');
    if (limpia) ultima = limpia;
  }
  return ultima;
}
```

En `src/agenda/ideas.ts`, añade los imports y la función:

```ts
import { idProyectoDesdeTitulo, type Proyecto } from '../datos/proyectos';
import type { ISODate } from '../fechas';
```

```ts
export function proyectoDesdeIdea(
  idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate,
): Proyecto {
  const titulo = nombre.trim();
  return {
    id: idProyectoDesdeTitulo(titulo, existentes),
    estado: 'idea',
    area,
    titulo,
    cuerpo: `# ${titulo}\n\n## Qué es\n${idea.texto}\n\n## Dónde lo dejamos\n${hoy}: creado desde la bandeja de ideas.\n`,
    meta: {},
  };
}
```

- [ ] **Step 4: Ejecutar los tests y ver que pasan**

Run: `npx vitest run`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/agenda src/datos/proyectos.ts src/datos/proyectos.test.ts
git commit -m "Proyectos: progreso, «dónde lo dejamos» y proyecto a partir de una idea"
```

Apunta en el registro: `- Task 3: progresoProyecto, dondeLoDejamos, proyectoDesdeIdea. Tests OK.`

---

### Task 4: Saludo, tareas pendientes y filtro por áreas

**Files:**
- Modify: `src/fechas.ts`, `src/agenda/tareas.ts`
- Test: `src/fechas.test.ts`, `src/agenda/tareas.test.ts`

**Interfaces:**
- Produces:
  - `saludo(hora: number): string`
  - `contarPendientes(ts: Tarea[]): number`
  - `OTRAS = 'otras'`
  - `hayOtrasAreas(ts: Tarea[], conocidas: string[]): boolean`
  - `filtrarPorAreas(ts: Tarea[], encendidas: string[], conocidas: string[]): Tarea[]`
  - `alternarArea(encendidas: string[], area: string, todas: string[]): string[]`

  Una lista `encendidas` vacía significa «todas». Los ids de `encendidas` que no están en `todas` o `conocidas` se ignoran.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/fechas.test.ts`, añade `saludo` al import y este bloque al final:

```ts
describe('saludo', () => {
  it('depende de la hora', () => {
    expect(saludo(6)).toBe('Buenos días');
    expect(saludo(13)).toBe('Buenos días');
    expect(saludo(14)).toBe('Buenas tardes');
    expect(saludo(20)).toBe('Buenas tardes');
    expect(saludo(21)).toBe('Buenas noches');
    expect(saludo(0)).toBe('Buenas noches');
    expect(saludo(5)).toBe('Buenas noches');
  });
});
```

En `src/agenda/tareas.test.ts`, añade `alternarArea, contarPendientes, filtrarPorAreas, hayOtrasAreas, OTRAS` al import de `./tareas` y este bloque al final:

```ts
describe('contarPendientes', () => {
  it('cuenta las tareas normales sin hacer', () => {
    const ts = [
      t({ id: 'a' }),
      t({ id: 'b', fecha: '2026-09-20' }),
      t({ id: 'c', hecha: true }),
      t({ id: 'r', repetir: ['lun'] }),
    ];
    expect(contarPendientes(ts)).toBe(2);
  });
});

describe('filtro por áreas', () => {
  const ts = [t({ id: 'u', area: 'uni' }), t({ id: 'p', area: 'personal' }), t({ id: 'x', area: 'rara' })];
  const conocidas = ['uni', 'personal'];
  const todas = ['uni', 'personal', OTRAS];

  it('sin áreas encendidas se ve todo', () => {
    expect(ids(filtrarPorAreas(ts, [], conocidas))).toEqual(['u', 'p', 'x']);
  });
  it('se ven solo las áreas encendidas, y «otras» son las desconocidas', () => {
    expect(ids(filtrarPorAreas(ts, ['uni'], conocidas))).toEqual(['u']);
    expect(ids(filtrarPorAreas(ts, ['personal', OTRAS], conocidas))).toEqual(['p', 'x']);
  });
  it('un área guardada que ya no existe se ignora y, si no queda ninguna, se ve todo', () => {
    expect(ids(filtrarPorAreas(ts, ['borrada'], conocidas))).toEqual(['u', 'p', 'x']);
    expect(ids(filtrarPorAreas(ts, ['borrada', 'uni'], conocidas))).toEqual(['u']);
  });
  it('hayOtrasAreas detecta tareas con un área desconocida', () => {
    expect(hayOtrasAreas(ts, conocidas)).toBe(true);
    expect(hayOtrasAreas(ts.slice(0, 2), conocidas)).toBe(false);
  });
  it('alternarArea apaga un área cuando están todas encendidas', () => {
    expect(alternarArea([], 'uni', todas)).toEqual(['personal', OTRAS]);
  });
  it('alternarArea enciende y apaga', () => {
    expect(alternarArea(['uni'], 'personal', todas)).toEqual(['uni', 'personal']);
    expect(alternarArea(['uni', 'personal'], 'uni', todas)).toEqual(['personal']);
  });
  it('alternarArea vuelve a «todas» si se apagarían todas o se encienden todas', () => {
    expect(alternarArea(['uni'], 'uni', todas)).toEqual([]);
    expect(alternarArea(['uni', 'personal'], OTRAS, todas)).toEqual([]);
  });
  it('alternarArea ignora áreas guardadas que ya no existen', () => {
    expect(alternarArea(['borrada'], 'uni', todas)).toEqual(['personal', OTRAS]);
  });
});
```

- [ ] **Step 2: Ejecutar los tests y ver que fallan**

Run: `npx vitest run src/fechas.test.ts src/agenda/tareas.test.ts`
Expected: FAIL con «saludo is not a function», «contarPendientes is not a function», etc.

- [ ] **Step 3: Escribir el código**

Al final de `src/fechas.ts`:

```ts
export function saludo(hora: number): string {
  if (hora >= 6 && hora < 14) return 'Buenos días';
  if (hora >= 14 && hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
```

Al final de `src/agenda/tareas.ts`:

```ts
export function contarPendientes(ts: Tarea[]): number {
  return ts.filter((t) => !esRepetida(t) && !t.hecha).length;
}

// Filtro de "calendarios" por área. `encendidas` vacía = todas. OTRAS agrupa las áreas que no están en areas.yaml.
export const OTRAS = 'otras';

export function hayOtrasAreas(ts: Tarea[], conocidas: string[]): boolean {
  return ts.some((t) => !conocidas.includes(t.area));
}

export function filtrarPorAreas(ts: Tarea[], encendidas: string[], conocidas: string[]): Tarea[] {
  const validas = encendidas.filter((a) => conocidas.includes(a) || a === OTRAS);
  if (validas.length === 0) return ts;
  return ts.filter((t) => validas.includes(conocidas.includes(t.area) ? t.area : OTRAS));
}

export function alternarArea(encendidas: string[], area: string, todas: string[]): string[] {
  const validas = encendidas.filter((a) => todas.includes(a));
  const actuales = validas.length ? validas : todas;
  const nuevas = actuales.includes(area) ? actuales.filter((a) => a !== area) : [...actuales, area];
  return nuevas.length === 0 || todas.every((a) => nuevas.includes(a)) ? [] : nuevas;
}
```

- [ ] **Step 4: Ejecutar los tests y ver que pasan**

Run: `npx vitest run`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/fechas.ts src/fechas.test.ts src/agenda/tareas.ts src/agenda/tareas.test.ts
git commit -m "Saludo según la hora, tareas pendientes y filtro por áreas"
```

Apunta en el registro: `- Task 4: saludo, contarPendientes, filtrarPorAreas/alternarArea. Tests OK.`

---

### Task 5: Leer y guardar la bandeja en GitHub

**Files:**
- Modify: `src/repositorio.ts`, `src/estado/cache.ts`
- Test: `src/repositorio.test.ts`

**Interfaces:**
- Consumes: `parseBandeja`, `serializarBandeja`, `Linea` (Task 1); `RUTA_BANDEJA`.
- Produces:
  - `Datos` gana `ideas: Linea[]`; `Agenda = Omit<Datos, 'proyectos'>` (ya existe), que así también la incluye.
  - `cargarAgenda(cfg)` devuelve también `ideas`.
  - `modificarBandeja(cfg: Config, cambio: (ls: Linea[]) => Linea[], mensaje: string): Promise<Linea[]>`
  - `leerCache()` devuelve también `ideas` (`[]` si la caché es antigua).

- [ ] **Step 1: Escribir los tests que fallan**

En `src/repositorio.test.ts`:
- Cambia el import de `./repositorio` para añadir `modificarBandeja`.
- Añade `import { anadirIdea, ErrorIdeaCambiada, quitarIdea } from './agenda/ideas';` y `import { ideasDe } from './datos/ideas';`.

En el test de `cargarTodo`, añade esta línea como **primera** línea dentro de `leer.mockImplementation`:

```ts
      if (ruta === 'ideas/bandeja.md') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
```

y, al final de ese test:

```ts
    expect(d.ideas).toEqual([]);
```

En el test de `cargarAgenda`, añade esta línea como primera dentro de `leer.mockImplementation`:

```ts
      if (ruta === 'ideas/bandeja.md') return { texto: '# Bandeja\n- 2026-09-24: Idea\n', sha: 'b' };
```

y, al final de ese test:

```ts
    expect(ideasDe(d.ideas)).toEqual([{ fecha: '2026-09-24', texto: 'Idea' }]);
```

Añade después del `describe('modificarTareas', …)`:

```ts
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
```

- [ ] **Step 2: Ejecutar los tests y ver que fallan**

Run: `npx vitest run src/repositorio.test.ts`
Expected: FAIL: `d.ideas` es `undefined`, «modificarBandeja is not a function».

- [ ] **Step 3: Escribir el código**

En `src/repositorio.ts`:
- Añade a los imports:

```ts
import { parseBandeja, serializarBandeja, type Linea } from './datos/ideas';
```

  y `RUTA_BANDEJA` al import de `./datos/rutas`.
- Añade `ideas: Linea[];` a `interface Datos`, después de `proyectos`.
- Sustituye `cargarAgenda` y `cargarTodo` por:

```ts
export async function cargarAgenda(cfg: Config): Promise<Agenda> {
  const errores: ErrorDatos[] = [];
  const [textoTareas, textoAreas, textoBandeja] = await Promise.all([
    leerOpcional(cfg, RUTA_TAREAS),
    leerOpcional(cfg, RUTA_AREAS),
    leerOpcional(cfg, RUTA_BANDEJA),
  ]);
  const tareas = intentar(errores, () => (textoTareas === null ? [] : parseTareas(textoTareas)), []);
  const areas = intentar(errores, () => (textoAreas === null ? [] : parseAreas(textoAreas)), []);
  // La bandeja no puede estar "rota": lo que no es una idea se guarda como línea normal.
  const ideas = textoBandeja === null ? [] : parseBandeja(textoBandeja);
  return { tareas, areas, ideas, errores };
}

export async function cargarTodo(cfg: Config): Promise<Datos> {
  const [{ tareas, areas, ideas, errores }, nombres] = await Promise.all([
    cargarAgenda(cfg),
    listarCarpeta(cfg, CARPETA_PROYECTOS),
  ]);
```

  (el resto de `cargarTodo` no cambia, salvo el `return`):

```ts
  return { tareas, areas, ideas, proyectos: leidos.filter((p): p is Proyecto => p !== null), errores };
```

- Añade después de `modificarTareas`:

```ts
export async function modificarBandeja(
  cfg: Config, cambio: (ls: Linea[]) => Linea[], mensaje: string,
): Promise<Linea[]> {
  let resultado: Linea[] = [];
  await actualizarArchivo(cfg, RUTA_BANDEJA, (texto) => {
    resultado = cambio(texto === null ? [] : parseBandeja(texto));
    return serializarBandeja(resultado);
  }, mensaje);
  return resultado;
}
```

En `src/estado/cache.ts`, cambia `guardarCache` y `leerCache`:

```ts
export function guardarCache(d: Datos): void {
  try {
    const copia: DatosCache = { tareas: d.tareas, areas: d.areas, proyectos: d.proyectos, ideas: d.ideas };
    localStorage.setItem(CLAVE, JSON.stringify(copia));
  } catch {
    // sin almacenamiento: no habrá modo sin conexión
  }
}

export function leerCache(): DatosCache | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<DatosCache> | null;
    // Una caché de la v1 no tiene ideas.
    return c ? { tareas: c.tareas ?? [], areas: c.areas ?? [], proyectos: c.proyectos ?? [], ideas: c.ideas ?? [] } : null;
  } catch {
    return null;
  }
}
```

En `src/estado/datos.tsx`, cambia `VACIO` para que compile:

```ts
const VACIO: Datos = { tareas: [], areas: [], proyectos: [], ideas: [], errores: [] };
```

- [ ] **Step 4: Ejecutar los tests y la compilación**

Run: `npx vitest run && npm run build`
Expected: todos los tests PASS; la compilación termina con «✓ built».

- [ ] **Step 5: Commit**

```bash
git add src/repositorio.ts src/repositorio.test.ts src/estado/cache.ts src/estado/datos.tsx
git commit -m "Repositorio: leer y guardar la bandeja de ideas"
```

Apunta en el registro: `- Task 5: cargarAgenda lee la bandeja, modificarBandeja, caché con ideas. Tests OK.`

---

### Task 6: Estado de la app: `cambiarIdeas`

**Files:**
- Modify: `src/estado/datos.tsx`

**Interfaces:**
- Consumes: `modificarBandeja`, `cargarAgenda` (Task 5); `ErrorIdeaCambiada` (Task 2); `Linea` (Task 1).
- Produces:
  - `ValorDatos.cambiarIdeas(cambio: (ls: Linea[]) => Linea[], mensaje: string): Promise<boolean>`
  - `datos.ideas` se actualiza también al volver a la app.

Este archivo es un componente de React sin tests propios (como en la v1). Su lógica ya está probada en las Tasks 1, 2 y 5. Aquí se verifica con la compilación.

- [ ] **Step 1: Escribir el código**

En `src/estado/datos.tsx`:
- Añade a los imports `import { ErrorIdeaCambiada } from '../agenda/ideas';`, `import type { Linea } from '../datos/ideas';` y `modificarBandeja` al import de `../repositorio`.
- En `interface ValorDatos`, añade después de `cambiarTareas`:

```ts
  cambiarIdeas(cambio: (ls: Linea[]) => Linea[], mensaje: string): Promise<boolean>;
```

- Sustituye el `useEffect` del refresco al volver a la app (el que usa `visibilitychange`) por esto:

```tsx
  // Trae tareas, áreas e ideas (no proyectos: refrescarlos borraría el texto de una página abierta).
  const traerAgenda = useCallback(async (cfg: Config) => {
    const agenda = await cargarAgenda(cfg);
    setDatos((d) => ({
      ...d,
      tareas: agenda.tareas,
      areas: agenda.areas,
      ideas: agenda.ideas,
      errores: [...d.errores.filter((x) => x.archivo !== RUTA_TAREAS && x.archivo !== RUTA_AREAS), ...agenda.errores],
    }));
  }, []);

  // Al volver a la app (cambiar de pestaña, desbloquear el móvil) trae lo que haya cambiado Claude u otro dispositivo.
  useEffect(() => {
    if (!config) return;
    const alVolver = () => {
      if (document.visibilityState !== 'visible' || estadoActual.current !== 'listo') return;
      void encolar(async () => {
        try {
          await traerAgenda(config);
        } catch (e) {
          // Sin conexión u otro fallo pasajero: se sigue con lo que hay, sin molestar.
          if (e instanceof ErrorGitHub && e.tipo === 'token') setEstado('error-token');
        }
      });
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [config, encolar, traerAgenda]);
```

- Añade después de `cambiarTareas`:

```tsx
  const cambiarIdeas = useCallback(
    (cambio: (ls: Linea[]) => Linea[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const ideas = await modificarBandeja(config, cambio, mensaje);
          setDatos((d) => ({ ...d, ideas }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          // La idea cambió (quizá la movió Claude): se recarga la bandeja para ver cómo está ahora.
          if (e instanceof ErrorIdeaCambiada) await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda],
  );
```

- Añade `cambiarIdeas` al objeto de `useMemo` (después de `cambiarTareas`) y a su lista de dependencias.

`alFallar` ya muestra el mensaje de cualquier `Error` como aviso, así que `ErrorIdeaCambiada` sale con su texto sin más cambios. Sin conexión, sale «Sin conexión: el cambio no se ha guardado.».

- [ ] **Step 2: Verificar**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

- [ ] **Step 3: Commit**

```bash
git add src/estado/datos.tsx
git commit -m "Estado: cambiarIdeas por la cola y refresco de ideas al volver"
```

Apunta en el registro: `- Task 6: cambiarIdeas + refresco con ideas. Build OK.`

---

### Task 7: Tema "papel cálido"

**Files:**
- Modify: `src/estilos.css` (se reescribe entero)

**Interfaces:**
- Produces: clases comunes para las siguientes tareas: `.tarjeta`, `.titulo-seccion`, `button.principal`, `button.enlace`, `.grupo`, `.pastilla`, `.mas`, `.solo-movil`, y las variables CSS de la spec §3.

Es solo CSS: se verifica con la compilación y mirándolo.

- [ ] **Step 1: Reescribir `src/estilos.css`**

Sustituye todo el contenido por:

```css
:root {
  --fondo: #f6f1e7;
  --lateral: #efe7d8;
  --superficie: #fbf8f2;
  --texto: #3b3027;
  --suave: #8b7b6a;
  --borde: #e6dccb;
  --borde-suave: #efe7d9;
  --hover: #e7dcc8;
  --acento: #b8603d;
  --acento-oscuro: #a0522f;
  --acento-suave: #f1dccf;
  --peligro: #b3412e;
  --aviso: #fbecc4;
  --error: #f6ddd6;
  color-scheme: light;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 15px;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto); }
.app { min-height: 100vh; }
main { padding: 16px 16px 96px; max-width: 1180px; margin: 0 auto; }
.cargando, .vacio, .detalle { color: var(--suave); font-size: 0.9rem; }
.banner { padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.banner.aviso { background: var(--aviso); }
.banner.error { background: var(--error); }

/* Botones y campos */
button { font: inherit; color: inherit; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
button:hover:not(:disabled) { background: var(--hover); }
button:disabled { opacity: 0.5; cursor: default; }
button.activa, button.principal { background: var(--acento); color: #fff; border-color: var(--acento); }
button.activa:hover:not(:disabled), button.principal:hover:not(:disabled) { background: var(--acento-oscuro); }
button.peligro { color: var(--peligro); border-color: var(--peligro); background: transparent; }
button.enlace { border: none; background: none; padding: 0; color: var(--acento); font-weight: 500; }
button.enlace:hover:not(:disabled) { background: none; text-decoration: underline; }
input, select, textarea { font: inherit; color: inherit; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 8px; width: 100%; }
input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid var(--acento); outline-offset: 1px; }
input[type='checkbox'] { appearance: none; width: 18px; height: 18px; padding: 0; margin: 0; flex-shrink: 0; border: 1.5px solid #b9a68f; border-radius: 5px; background: var(--superficie); cursor: pointer; }
input[type='checkbox']:checked {
  background: var(--acento) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 13px no-repeat;
  border-color: var(--acento);
}
input[type='checkbox']:disabled { cursor: default; opacity: 0.6; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--suave); }

/* Títulos y tarjetas */
.barra { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.barra h2 { flex: 1; margin: 8px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: 1.8rem; color: var(--texto); }
.barra h2::first-letter { text-transform: uppercase; }
h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--suave); margin: 18px 0 8px; }
h3.atrasadas { color: var(--peligro); }
.tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; }
.titulo-seccion { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--suave); margin: 0 0 12px; }
.titulo-seccion::first-letter { text-transform: uppercase; }
.titulo-seccion .enlace { text-transform: none; letter-spacing: 0; font-size: 14px; }
.grupo { font-size: 13px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--texto); margin: 14px 0 4px; }
.grupo.atrasadas { color: var(--peligro); }

/* Listas de tareas y proyectos */
.lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
.fila-tarea, .fila-proyecto, .fila-idea { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--borde-suave); flex-wrap: wrap; }
.lista > li:last-child { border-bottom: none; }
.fila-tarea.hecha .titulo-tarea { text-decoration: line-through; color: var(--suave); }
.punto { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.titulo-tarea { border: none; background: none; padding: 0; text-align: left; flex: 1; min-width: 120px; }
.titulo-tarea:hover:not(:disabled) { background: none; color: var(--acento); }
.prioridad, .estado { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--borde-suave); color: var(--suave); }
.prioridad.alta { background: var(--error); color: var(--peligro); }
.estado.activo { background: var(--acento-suave); color: var(--acento); }
.mas { font-size: 11px; color: var(--suave); }

/* Pastillas (filtros) */
.filtros, .pestanas-mini, .filtros-areas { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 14px; }
.pastilla { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 12px; font-size: 14px; color: var(--suave); background: transparent; }
.pastilla.encendida { background: var(--superficie); color: var(--texto); border-color: var(--acento); }
.pastilla:not(.encendida) .punto { opacity: 0.35; }

/* Menú de abajo (móvil) */
.navegacion { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 2px; padding: 6px; padding-bottom: calc(6px + env(safe-area-inset-bottom)); background: var(--superficie); border-top: 1px solid var(--borde); z-index: 5; }
.navegacion button { flex: 1; max-width: 120px; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 0.72rem; padding: 6px 2px; border: none; background: none; }
.navegacion button.activa { background: var(--acento-suave); color: var(--acento); }
.navegacion .icono { font-size: 1.1rem; }

/* Ventanas (formularios) */
.fondo-modal { position: fixed; inset: 0; background: rgb(59 48 39 / 0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 10; }
.modal { background: var(--fondo); width: 100%; max-width: 560px; max-height: 90vh; overflow: auto; padding: 20px; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 10px 30px rgb(59 48 39 / 0.2); }
.modal h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
@media (min-width: 700px) {
  .fondo-modal { align-items: center; }
  .modal { border-radius: 16px; }
}
.nota-form { background: var(--acento-suave); padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; margin: 0; }
.fila-campos { display: flex; gap: 10px; flex-wrap: wrap; }
.fila-campos > label { flex: 1; min-width: 140px; }
fieldset { border: 1px solid var(--borde); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
.dia { flex-direction: row; align-items: center; gap: 4px; color: var(--texto); }
.botones { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.editor { min-height: 320px; font-family: ui-monospace, monospace; }
.markdown { background: var(--superficie); border: 1px solid var(--borde); border-radius: 14px; padding: 4px 20px; overflow-wrap: anywhere; }
.ajustes form { display: flex; flex-direction: column; gap: 12px; max-width: 480px; margin-bottom: 16px; }
.solo-movil { display: block; }
@media (min-width: 900px) { .solo-movil { display: none; } }

/* Calendario */
.cal-cabecera, .cal-semana { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.cal-cabecera span { text-align: center; font-size: 12px; color: var(--suave); }
.cal-semana { margin-bottom: 6px; }
.cal-dia { display: flex; flex-direction: column; align-items: stretch; gap: 3px; min-height: 84px; padding: 6px; text-align: left; overflow: hidden; border-radius: 10px; }
.cal-semana.semana .cal-dia { min-height: 200px; }
.cal-dia.fuera { opacity: 0.45; }
.cal-dia .numero { font-size: 12px; color: var(--suave); }
.cal-dia.hoy .numero { color: var(--acento); font-weight: 700; }
.cal-dia.seleccionado { border: 2px solid var(--acento); }
.cal-tarea { font-size: 0.72rem; color: #fff; border-radius: 4px; padding: 1px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-tarea.hecha { opacity: 0.5; text-decoration: line-through; }
@media (max-width: 600px) {
  .cal-dia { min-height: 56px; }
  .cal-semana.mes .cal-tarea { font-size: 0; height: 5px; padding: 0; }
  .cal-semana.semana { grid-template-columns: 1fr; }
  .cal-semana.semana .cal-dia { min-height: 0; }
  .cal-cabecera.semana { display: none; }
}
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: «✓ built».

Arranca `npm run dev` y abre `http://localhost:5173/segundo-cerebro-app/`. Sin llave se ve Ajustes: comprueba que el fondo es crema, que el texto es marrón y que no queda nada morado ni negro, aunque Windows esté en modo oscuro. Para el servidor al terminar.

- [ ] **Step 3: Commit**

```bash
git add src/estilos.css
git commit -m "Tema claro «papel cálido» con acento terracota"
```

Apunta en el registro: `- Task 7: tema papel cálido. Build OK, revisado a ojo.`

---

### Task 8: Barra lateral, menú del móvil y navegación con destino

**Files:**
- Create: `src/componentes/navegacion.ts`, `src/componentes/Lateral.tsx`, `src/componentes/MenuMovil.tsx`
- Modify: `src/App.tsx`, `src/pantallas/Proyectos.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `contarPendientes` (Task 4); `ideasDe` (Task 1); `ordenarProyectos`; `colorDeArea`.
- Produces:
  - `type Pantalla = 'inicio' | 'calendario' | 'tareas' | 'proyectos' | 'ideas' | 'ajustes'`
  - `interface Destino { pantalla: Pantalla; dia?: ISODate; proyecto?: string }`
  - `SECCIONES`
  - `URL_USO_CLAUDE`
  - La función de navegación `ir(d: Destino): void` que `App` pasa a las pantallas.
  - `Proyectos` acepta `abiertoInicial?: string`.

- [ ] **Step 1: Crear `src/componentes/navegacion.ts`**

```ts
import type { ISODate } from '../fechas';

export type Pantalla = 'inicio' | 'calendario' | 'tareas' | 'proyectos' | 'ideas' | 'ajustes';

// A dónde ir: una pantalla y, si hace falta, el día del calendario o el proyecto que abrir.
export interface Destino {
  pantalla: Pantalla;
  dia?: ISODate;
  proyecto?: string;
}

export const SECCIONES: { id: Pantalla; nombre: string; icono: string }[] = [
  { id: 'inicio', nombre: 'Inicio', icono: '🏠' },
  { id: 'calendario', nombre: 'Calendario', icono: '📅' },
  { id: 'tareas', nombre: 'Tareas', icono: '✅' },
  { id: 'proyectos', nombre: 'Proyectos', icono: '📁' },
  { id: 'ideas', nombre: 'Ideas', icono: '💡' },
  { id: 'ajustes', nombre: 'Ajustes', icono: '⚙️' },
];

export const URL_USO_CLAUDE = 'https://claude.ai/settings/usage';
```

- [ ] **Step 2: Crear `src/componentes/Lateral.tsx`**

```tsx
import { Fragment } from 'react';
import { ordenarProyectos } from '../agenda/proyectos';
import { contarPendientes } from '../agenda/tareas';
import { ideasDe } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { colorDeArea } from './areas';
import { SECCIONES, URL_USO_CLAUDE, type Destino, type Pantalla } from './navegacion';

interface Props {
  actual: Pantalla;
  ir(d: Destino): void;
  bloqueado: boolean;
}

export function Lateral({ actual, ir, bloqueado }: Props) {
  const { datos } = useDatos();
  const activos = ordenarProyectos(datos.proyectos).filter((p) => p.estado === 'activo');
  const numeros: Partial<Record<Pantalla, number>> = {
    tareas: contarPendientes(datos.tareas),
    ideas: ideasDe(datos.ideas).length,
  };

  const item = (s: (typeof SECCIONES)[number]) => (
    <button
      key={s.id}
      className={`item-lateral${actual === s.id ? ' activo' : ''}`}
      disabled={bloqueado && s.id !== 'ajustes'}
      onClick={() => ir({ pantalla: s.id })}
    >
      <span className="icono">{s.icono}</span>
      {s.nombre}
      {numeros[s.id] ? <span className="numero-lateral">{numeros[s.id]}</span> : null}
    </button>
  );

  return (
    <nav className="lateral" aria-label="Secciones">
      <div className="marca">
        <span className="logo">✦</span>Segundo cerebro
      </div>
      {SECCIONES.filter((s) => s.id !== 'ajustes').map((s) => (
        <Fragment key={s.id}>
          {item(s)}
          {s.id === 'proyectos' &&
            activos.map((p) => (
              <button
                key={p.id}
                className="item-lateral sub"
                disabled={bloqueado}
                onClick={() => ir({ pantalla: 'proyectos', proyecto: p.id })}
              >
                <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
                {p.titulo}
              </button>
            ))}
        </Fragment>
      ))}
      <div className="hueco" />
      <a className="item-lateral" href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">
        <span className="icono">📊</span>Uso de Claude
      </a>
      {item(SECCIONES.find((s) => s.id === 'ajustes')!)}
    </nav>
  );
}
```

- [ ] **Step 3: Crear `src/componentes/MenuMovil.tsx`**

```tsx
import { SECCIONES, type Destino, type Pantalla } from './navegacion';

interface Props {
  actual: Pantalla;
  ir(d: Destino): void;
  bloqueado: boolean;
}

export function MenuMovil({ actual, ir, bloqueado }: Props) {
  return (
    <nav className="navegacion" aria-label="Secciones">
      {SECCIONES.map((s) => (
        <button
          key={s.id}
          className={actual === s.id ? 'activa' : ''}
          disabled={bloqueado && s.id !== 'ajustes'}
          onClick={() => ir({ pantalla: s.id })}
        >
          <span className="icono">{s.icono}</span>
          {s.nombre}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Reescribir `src/App.tsx`**

```tsx
import { useState } from 'react';
import { FormTarea, type Edicion } from './componentes/FormTarea';
import { Lateral } from './componentes/Lateral';
import { MenuMovil } from './componentes/MenuMovil';
import type { Destino } from './componentes/navegacion';
import { ProveedorDatos, useDatos } from './estado/datos';
import { Ajustes } from './pantallas/Ajustes';
import { Calendario } from './pantallas/Calendario';
import { Hoy } from './pantallas/Hoy';
import { Proyectos } from './pantallas/Proyectos';
import { Tareas } from './pantallas/Tareas';

export default function App() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { estado, aviso, cerrarAviso, datos, recargar } = useDatos();
  const [destino, setDestino] = useState<Destino>({ pantalla: 'inicio' });
  // Cuenta las veces que se navega: sirve de `key` para abrir de nuevo una pantalla aunque sea la misma.
  const [visita, setVisita] = useState(0);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const forzarAjustes = estado === 'sin-config' || estado === 'error-token';
  const actual = forzarAjustes ? 'ajustes' : destino.pantalla;
  const editar = (e: Edicion) => setEdicion(e);
  const ir = (d: Destino) => {
    setDestino(d);
    setVisita((v) => v + 1);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <Lateral actual={actual} ir={ir} bloqueado={forzarAjustes} />
      <main>
        {estado === 'cargando' && <p className="cargando">Cargando…</p>}
        {estado === 'sin-conexion' && (
          <div className="banner aviso">
            Sin conexión: estás viendo los últimos datos guardados y no puedes hacer cambios.
            <button onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}
        {aviso && (
          <div className="banner error">
            {aviso} <button onClick={cerrarAviso}>Cerrar</button>
          </div>
        )}
        {datos.errores.map((e) => (
          <div key={e.archivo} className="banner error">
            Error en <code>{e.archivo}</code>: {e.message}. No se puede editar este archivo hasta que se arregle (pídeselo a Claude).
          </div>
        ))}
        {actual === 'inicio' && <Hoy editar={editar} />}
        {actual === 'calendario' && <Calendario key={visita} editar={editar} />}
        {actual === 'tareas' && <Tareas editar={editar} />}
        {actual === 'proyectos' && <Proyectos key={visita} editar={editar} abiertoInicial={destino.proyecto} />}
        {actual === 'ideas' && <p className="vacio">Ideas: llega en la Task 11.</p>}
        {actual === 'ajustes' && <Ajustes />}
      </main>
      <MenuMovil actual={actual} ir={ir} bloqueado={forzarAjustes} />
      {edicion && <FormTarea edicion={edicion} cerrar={() => setEdicion(null)} />}
    </div>
  );
}
```

`Hoy` y el texto de Ideas son provisionales: los sustituyen las Tasks 9 y 11.

- [ ] **Step 5: `Proyectos` acepta el proyecto que abrir**

En `src/pantallas/Proyectos.tsx`, cambia la firma y el estado `abierto`:

```tsx
export function Proyectos({ editar, abiertoInicial }: { editar(e: Edicion): void; abiertoInicial?: string }) {
  const { datos, soloLectura, guardarProyecto } = useDatos();
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [abierto, setAbierto] = useState<string | null>(abiertoInicial ?? null);
```

- [ ] **Step 6: Estilos de la barra lateral**

Añade al final de `src/estilos.css`:

```css
/* Barra lateral (PC) */
.lateral { display: none; }
@media (min-width: 900px) {
  .app { display: flex; }
  main { flex: 1; min-width: 0; padding: 28px 40px 40px; }
  .navegacion { display: none; }
  .lateral { display: flex; flex-direction: column; gap: 2px; width: 240px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--lateral); border-right: 1px solid var(--borde); padding: 18px 12px; }
}
.marca { display: flex; align-items: center; gap: 10px; padding: 4px 10px 18px; font-weight: 600; }
.logo { width: 28px; height: 28px; border-radius: 8px; background: var(--acento); color: #fff; display: grid; place-items: center; font-size: 15px; }
.item-lateral { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: none; border-radius: 8px; background: none; color: var(--texto); text-align: left; text-decoration: none; font-size: 15px; }
.item-lateral:hover:not(:disabled) { background: var(--hover); }
.item-lateral.activo { background: var(--superficie); box-shadow: 0 1px 2px rgb(60 40 20 / 0.08); font-weight: 600; }
.item-lateral .icono { width: 20px; text-align: center; }
.numero-lateral { margin-left: auto; font-size: 12px; color: var(--suave); }
.item-lateral.sub { padding: 5px 10px 5px 40px; font-size: 14px; color: var(--suave); }
.item-lateral.sub .punto { width: 7px; height: 7px; }
.hueco { flex: 1; }
```

- [ ] **Step 7: Verificar**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

Con `npm run dev`:
- A 1200 px de ancho se ve la barra lateral a la izquierda, con Ajustes abajo.
- A menos de 900 px, el menú abajo con 6 botones.
- Sin llave, todo salvo Ajustes está desactivado.

- [ ] **Step 8: Commit**

```bash
git add src/componentes/navegacion.ts src/componentes/Lateral.tsx src/componentes/MenuMovil.tsx src/App.tsx src/pantallas/Proyectos.tsx src/estilos.css
git commit -m "Barra lateral en el PC, menú abajo en el móvil y navegación con destino"
```

Apunta en el registro: `- Task 8: Lateral, MenuMovil, App con Destino. Build OK.`

---

### Task 9: Pantalla de Inicio

**Files:**
- Create: `src/componentes/Captura.tsx`, `src/componentes/EtiquetaTarea.tsx`, `src/componentes/BarraProgreso.tsx`, `src/pantallas/Inicio.tsx`
- Delete: `src/pantallas/Hoy.tsx`
- Modify: `src/App.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `saludo` (Task 4); `progresoProyecto` (Task 3); `dondeLoDejamos` (Task 3); `anadirIdea` (Task 2); `cambiarIdeas` (Task 6); `Destino` (Task 8); `aplicarEdicion`, `atrasadas`, `tareasDelDia`, `topSinFecha`, `hechaEl`; `LIMITE_ACTIVOS`, `ordenarProyectos`; `cuadriculaMes`, `diasSemana`, `diaDeSemana`, `fromISO`, `formatoLargo`, `nombreMes`, `DIAS`.
- Produces:
  - `<EtiquetaTarea tarea dia />`, que usa también la Task 10;
  - `<BarraProgreso hechas total />`, que usa también la Task 12;
  - `<Inicio editar ir />`.

- [ ] **Step 1: Crear `src/componentes/EtiquetaTarea.tsx`**

```tsx
import { hechaEl } from '../agenda/tareas';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import type { ISODate } from '../fechas';
import { colorDeArea } from './areas';

// Etiqueta de una tarea en la semana y en el mes: fondo suave del color de su área y texto oscuro.
export function EtiquetaTarea({ tarea, dia }: { tarea: Tarea; dia: ISODate }) {
  const { datos } = useDatos();
  const color = colorDeArea(datos.areas, tarea.area);
  return (
    <span
      className={`etiqueta-tarea${hechaEl(tarea, dia) ? ' hecha' : ''}`}
      style={{ background: `color-mix(in srgb, ${color} 25%, var(--superficie))`, borderLeftColor: color }}
      title={tarea.titulo}
    >
      {tarea.hora ? `${tarea.hora} ` : ''}
      {tarea.titulo}
    </span>
  );
}
```

- [ ] **Step 2: Crear `src/componentes/BarraProgreso.tsx`**

```tsx
export function BarraProgreso({ hechas, total }: { hechas: number; total: number }) {
  if (total === 0) return <span className="progreso-texto">Sin tareas todavía</span>;
  return (
    <span className="progreso">
      <span className="progreso-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechas}>
        <span style={{ width: `${(hechas / total) * 100}%` }} />
      </span>
      <span className="progreso-texto">
        {hechas} de {total} tareas
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Crear `src/componentes/Captura.tsx`**

```tsx
import { useState } from 'react';
import { anadirIdea } from '../agenda/ideas';
import { aplicarEdicion } from '../agenda/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

// Captura rápida: una tarea sin fecha (Enter o «+ Tarea») o una idea para la bandeja.
export function Captura() {
  const { datos, cambiarTareas, cambiarIdeas, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const limpio = texto.trim();

  async function crear(tipo: 'tarea' | 'idea') {
    if (!limpio || guardando) return;
    setGuardando(true);
    const ok =
      tipo === 'tarea'
        ? await cambiarTareas(
            (ts) => aplicarEdicion(ts, null, { titulo: limpio, area: datos.areas[0]?.id ?? 'personal' }, new Date()),
            `Crear tarea: ${limpio}`,
          )
        : await cambiarIdeas((ls) => anadirIdea(ls, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`);
    setGuardando(false);
    if (ok) setTexto('');
  }

  return (
    <form
      className="captura"
      onSubmit={(e) => {
        e.preventDefault();
        void crear('tarea');
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Apunta algo rápido… (una tarea o una idea)"
        aria-label="Captura rápida"
        disabled={soloLectura}
      />
      <button type="submit" className="principal" disabled={!limpio || guardando || soloLectura || tareasBloqueadas}>
        + Tarea
      </button>
      <button type="button" disabled={!limpio || guardando || soloLectura} onClick={() => void crear('idea')}>
        💡 Idea
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Crear `src/pantallas/Inicio.tsx`**

```tsx
import { LIMITE_ACTIVOS, ordenarProyectos, progresoProyecto } from '../agenda/proyectos';
import { atrasadas, tareasDelDia, topSinFecha } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import { BarraProgreso } from '../componentes/BarraProgreso';
import { Captura } from '../componentes/Captura';
import { EtiquetaTarea } from '../componentes/EtiquetaTarea';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import type { Destino } from '../componentes/navegacion';
import { dondeLoDejamos } from '../datos/proyectos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import {
  cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoLargo, fromISO, nombreMes, saludo, type ISODate,
} from '../fechas';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function Inicio({ editar, ir }: Props) {
  const { datos } = useDatos();
  const hoy = useHoy();
  const retrasadas = atrasadas(datos.tareas, hoy);
  const deHoy = tareasDelDia(datos.tareas, hoy);
  const top = topSinFecha(datos.tareas);
  const activos = ordenarProyectos(datos.proyectos).filter((p) => p.estado === 'activo');
  const fecha = fromISO(hoy);
  const mes = cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1);

  const lista = (ts: Tarea[], mostrarFecha = false) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  const dia = (d: ISODate, etiqueta: string, maximo: number, fuera = false) => {
    const ts = tareasDelDia(datos.tareas, d);
    const clases = ['sem-dia', d === hoy && 'hoy', fuera && 'fuera'].filter(Boolean).join(' ');
    return (
      <button key={d} className={clases} onClick={() => ir({ pantalla: 'calendario', dia: d })}>
        <span className="sem-numero">{etiqueta}</span>
        {ts.slice(0, maximo).map((t) => (
          <EtiquetaTarea key={t.id} tarea={t} dia={d} />
        ))}
        {ts.length > maximo && <span className="mas">+{ts.length - maximo} más</span>}
      </button>
    );
  };

  return (
    <section className="inicio">
      <header className="saludo">
        <h1>{saludo(new Date().getHours())}, Diego</h1>
        <p>{formatoLargo(hoy)}</p>
      </header>
      <Captura />
      <div className="rejilla-inicio">
        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Hoy <button className="enlace" onClick={() => ir({ pantalla: 'tareas' })}>Ver todas las tareas →</button>
          </h2>
          {retrasadas.length > 0 && (
            <>
              <h3 className="grupo atrasadas">Atrasadas</h3>
              {lista(retrasadas, true)}
            </>
          )}
          <h3 className="grupo">Para hoy</h3>
          {deHoy.length ? lista(deHoy) : <p className="vacio">Nada para hoy.</p>}
          <h3 className="grupo">Sin fecha: lo más importante</h3>
          {top.length ? lista(top) : <p className="vacio">No hay tareas sin fecha pendientes.</p>}
        </section>

        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Proyectos activos <button className="enlace" onClick={() => ir({ pantalla: 'proyectos' })}>Todos →</button>
          </h2>
          {activos.length === 0 && <p className="vacio">No tienes proyectos activos.</p>}
          {activos.map((p) => {
            const dejamos = dondeLoDejamos(p.cuerpo);
            return (
              <button key={p.id} className="tarjeta-proyecto" onClick={() => ir({ pantalla: 'proyectos', proyecto: p.id })}>
                <span className="tarjeta-proyecto-titulo">
                  <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
                  {p.titulo}
                </span>
                {dejamos && <span className="detalle">Dónde lo dejamos: {dejamos}</span>}
                <BarraProgreso {...progresoProyecto(datos.tareas, p.id)} />
              </button>
            );
          })}
          {activos.length > 0 && (
            <p className={`aviso-activos${activos.length > LIMITE_ACTIVOS ? ' demasiados' : ''}`}>
              {activos.length} de {LIMITE_ACTIVOS} proyectos activos
              {activos.length > LIMITE_ACTIVOS ? '. Son muchos a la vez: terminar uno te ayudará a acabar las cosas.' : '.'}
            </p>
          )}
        </section>

        <section className="tarjeta ancha">
          <h2 className="titulo-seccion">
            Esta semana{' '}
            <button className="enlace" onClick={() => ir({ pantalla: 'calendario', dia: hoy })}>Abrir calendario →</button>
          </h2>
          <div className="sem-rejilla">
            {diasSemana(hoy).map((d) =>
              dia(d, `${diaDeSemana(d)} ${fromISO(d).getDate()}${d === hoy ? ' · hoy' : ''}`, 5),
            )}
          </div>
        </section>

        <section className="tarjeta ancha">
          <h2 className="titulo-seccion">{nombreMes(fecha.getFullYear(), fecha.getMonth() + 1)}</h2>
          <div className="sem-rejilla cabecera">
            {DIAS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {mes.map((semana) => (
            <div key={semana[0]} className="sem-rejilla mes">
              {semana.map((d) => dia(d, String(fromISO(d).getDate()), 3, fromISO(d).getMonth() !== fecha.getMonth()))}
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Usar el Inicio en `App.tsx` y borrar `Hoy.tsx`**

En `src/App.tsx`, cambia `import { Hoy } from './pantallas/Hoy';` por `import { Inicio } from './pantallas/Inicio';` y la línea del Inicio por:

```tsx
        {actual === 'inicio' && <Inicio editar={editar} ir={ir} />}
```

Borra el archivo: `git rm src/pantallas/Hoy.tsx`.

- [ ] **Step 6: Estilos del Inicio**

Añade al final de `src/estilos.css`:

```css
/* Inicio */
.saludo h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: 30px; margin: 0; }
.saludo p { margin: 4px 0 20px; color: var(--suave); }
.saludo p::first-letter { text-transform: uppercase; }
.captura { display: flex; gap: 8px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; padding: 8px; margin-bottom: 24px; }
.captura input { flex: 1; min-width: 0; border: none; background: none; padding: 6px 10px; }
.captura input:focus-visible { outline: none; }
.captura:focus-within { border-color: var(--acento); }
.captura button:not(.principal) { background: var(--fondo); }
.rejilla-inicio { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 20px; }
@media (min-width: 900px) {
  .rejilla-inicio { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
  .rejilla-inicio .ancha { grid-column: 1 / -1; }
}
.tarjeta-proyecto { display: flex; flex-direction: column; align-items: stretch; gap: 4px; width: 100%; text-align: left; border: 1px solid var(--borde); border-radius: 12px; padding: 14px; margin-bottom: 10px; background: var(--fondo); }
.tarjeta-proyecto-titulo { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 16px; }
.progreso { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.progreso-barra { flex: 1; height: 6px; background: #e8dcc8; border-radius: 99px; overflow: hidden; }
.progreso-barra span { display: block; height: 100%; background: var(--acento); border-radius: 99px; }
.progreso-texto { font-size: 12px; color: var(--suave); white-space: nowrap; }
.aviso-activos { font-size: 12px; color: var(--suave); margin: 4px 0 0; }
.aviso-activos.demasiados { color: var(--peligro); }
.sem-rejilla { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.sem-rejilla.mes { gap: 6px; margin-bottom: 6px; }
.sem-rejilla.cabecera span { text-align: center; font-size: 12px; color: var(--suave); margin-bottom: 4px; }
.sem-dia { display: flex; flex-direction: column; align-items: stretch; gap: 4px; min-height: 120px; padding: 8px; border-radius: 10px; background: var(--fondo); text-align: left; overflow: hidden; }
.sem-rejilla.mes .sem-dia { min-height: 84px; padding: 6px; }
.sem-dia.hoy { border: 2px solid var(--acento); background: #fdf6ee; }
.sem-dia.fuera { opacity: 0.45; }
.sem-numero { font-size: 12px; color: var(--suave); }
.sem-dia.hoy .sem-numero { color: var(--acento); font-weight: 700; }
.etiqueta-tarea { display: block; font-size: 12px; padding: 2px 6px; border-radius: 6px; border-left: 3px solid; color: var(--texto); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
.etiqueta-tarea.hecha { text-decoration: line-through; opacity: 0.6; }
@media (max-width: 600px) {
  .sem-rejilla { gap: 3px; }
  .sem-dia, .sem-rejilla.mes .sem-dia { min-height: 60px; padding: 4px; }
  .etiqueta-tarea { font-size: 0; height: 5px; padding: 0; }
}
```

- [ ] **Step 7: Verificar**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

Revisa también que ningún archivo importe ya `./pantallas/Hoy`:

Run: `grep -rn "pantallas/Hoy" src`
Expected: sin resultados.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "Inicio: saludo, captura rápida, hoy, proyectos activos, semana y mes"
```

Apunta en el registro: `- Task 9: Inicio (Captura, EtiquetaTarea, BarraProgreso). Hoy.tsx borrado. Build OK.`

---

### Task 10: Calendario con filtro por áreas

**Files:**
- Modify: `src/pantallas/Calendario.tsx`, `src/App.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `filtrarPorAreas`, `alternarArea`, `hayOtrasAreas`, `OTRAS` (Task 4); `EtiquetaTarea` (Task 9); `Destino.dia` (Task 8).
- Produces: `Calendario` acepta `diaInicial?: ISODate`.

- [ ] **Step 1: Cambiar `src/pantallas/Calendario.tsx`**

Cambia los imports del principio por:

```tsx
import { useState } from 'react';
import { alternarArea, filtrarPorAreas, hayOtrasAreas, OTRAS, tareasDelDia } from '../agenda/tareas';
import { EtiquetaTarea } from '../componentes/EtiquetaTarea';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import {
  addDays, cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoCorto, formatoLargo, fromISO, nombreMes,
  sumarMeses, type ISODate,
} from '../fechas';
```

Añade antes de `export function Calendario`:

```tsx
// El filtro de áreas se recuerda en cada dispositivo. Si el navegador no deja guardarlo, se empieza con todas.
const CLAVE_AREAS = 'sc-calendario-areas';

function leerAreas(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLAVE_AREAS) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function guardarAreas(areas: string[]): void {
  try {
    localStorage.setItem(CLAVE_AREAS, JSON.stringify(areas));
  } catch {
    // sin almacenamiento: no se recuerda el filtro
  }
}
```

Cambia la firma y el principio del componente por:

```tsx
export function Calendario({ editar, diaInicial }: { editar(e: Edicion): void; diaInicial?: ISODate }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [vista, setVista] = useState<Vista>('mes');
  const [seleccionado, setSeleccionado] = useState<ISODate>(diaInicial ?? hoy);
  const [encendidas, setEncendidas] = useState<string[]>(leerAreas);

  const conocidas = datos.areas.map((a) => a.id);
  const botones = [
    ...datos.areas.map((a) => ({ id: a.id, nombre: a.nombre, color: a.color })),
    ...(hayOtrasAreas(datos.tareas, conocidas) ? [{ id: OTRAS, nombre: 'Otras', color: '#9ca3af' }] : []),
  ];
  const todas = botones.map((b) => b.id);
  const validas = encendidas.filter((a) => todas.includes(a));
  const estaEncendida = (id: string) => validas.length === 0 || validas.includes(id);
  const tareas = filtrarPorAreas(datos.tareas, encendidas, conocidas);
  const cambiarAreas = (nuevas: string[]) => {
    setEncendidas(nuevas);
    guardarAreas(nuevas);
  };
```

(El resto de variables, `fecha`, `semanas`, `titulo`, `maximo` y `mover`, no cambia.)

En el JSX, justo después del `</div>` que cierra la `barra` de arriba, añade:

```tsx
      <div className="filtros-areas" aria-label="Calendarios">
        <button className={`pastilla${validas.length === 0 ? ' encendida' : ''}`} onClick={() => cambiarAreas([])}>
          Todo
        </button>
        {botones.map((b) => (
          <button
            key={b.id}
            className={`pastilla${estaEncendida(b.id) ? ' encendida' : ''}`}
            aria-pressed={estaEncendida(b.id)}
            onClick={() => cambiarAreas(alternarArea(encendidas, b.id, todas))}
          >
            <span className="punto" style={{ background: b.color }} />
            {b.nombre}
          </button>
        ))}
      </div>
```

En la cuadrícula:
- Cambia `const ts = tareasDelDia(datos.tareas, dia);` por `const ts = tareasDelDia(tareas, dia);`.
- Sustituye el bloque `ts.slice(0, maximo).map(...)` (el `<span className="cal-tarea…">`) por:

```tsx
                {ts.slice(0, maximo).map((t) => (
                  <EtiquetaTarea key={t.id} tarea={t} dia={dia} />
                ))}
```

En la lista del día, cambia `tareasDelDia(datos.tareas, seleccionado)` por `tareasDelDia(tareas, seleccionado)`.

- [ ] **Step 2: Pasar el día desde `App.tsx`**

```tsx
        {actual === 'calendario' && <Calendario key={visita} editar={editar} diaInicial={destino.dia} />}
```

- [ ] **Step 3: Limpiar el CSS viejo**

En `src/estilos.css`:
- Borra las reglas `.cal-tarea { … }` y `.cal-tarea.hecha { … }`.
- Dentro de `@media (max-width: 600px)` del calendario, cambia `.cal-semana.mes .cal-tarea { … }` por:

```css
  .cal-semana.mes .etiqueta-tarea { font-size: 0; height: 5px; padding: 0; }
```

- [ ] **Step 4: Verificar**

Run: `npx vitest run && npm run build && grep -n "cal-tarea" src -r`
Expected: todos PASS, «✓ built» y el `grep` sin resultados.

- [ ] **Step 5: Commit**

```bash
git add src/pantallas/Calendario.tsx src/App.tsx src/estilos.css
git commit -m "Calendario: calendarios por área que se recuerdan y abrir en un día"
```

Apunta en el registro: `- Task 10: filtro por áreas en Calendario, diaInicial, EtiquetaTarea. Build OK.`

---

### Task 11: Pantalla de Ideas

**Files:**
- Create: `src/pantallas/Ideas.tsx`, `src/componentes/FormProyectoDesdeIdea.tsx`
- Modify: `src/componentes/FormTarea.tsx`, `src/App.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `ideasDe`, `Idea` (Task 1); `anadirIdea`, `vincularIdea`, `quitarIdea`, `proyectoDesdeIdea` (Tasks 2 y 3); `cambiarIdeas` (Task 6); `guardarProyecto` (v1); `Destino` (Task 8).
- Produces:
  - `type Edicion = ({ tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string; titulo?: string } }) & { nota?: string; alGuardar?(): Promise<unknown> }`
  - `<Ideas editar ir />`

- [ ] **Step 1: Ampliar `FormTarea`**

En `src/componentes/FormTarea.tsx`:

```tsx
export type Edicion = ({ tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string; titulo?: string } }) & {
  // Aviso que se muestra en el formulario y acción extra tras guardar bien (p. ej. quitar la idea de la bandeja).
  nota?: string;
  alGuardar?(): Promise<unknown>;
};
```

- Cambia el estado del título: `const [titulo, setTitulo] = useState(original?.titulo ?? nueva.titulo ?? '');`.
- En `guardar`, cambia el final:

```tsx
    setGuardando(true);
    const ok = await cambiarTareas(
      (ts) => aplicarEdicion(ts, original, tarea, new Date()),
      `${original ? 'Editar' : 'Crear'} tarea: ${tarea.titulo}`,
    );
    if (ok) await edicion.alGuardar?.();
    setGuardando(false);
    if (ok) cerrar();
```

- Justo después de `<h2>…</h2>`, añade:

```tsx
        {edicion.nota && <p className="nota-form">{edicion.nota}</p>}
```

- [ ] **Step 2: Crear `src/componentes/FormProyectoDesdeIdea.tsx`**

```tsx
import { useState } from 'react';
import { proyectoDesdeIdea, quitarIdea } from '../agenda/ideas';
import type { Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';

interface Props {
  idea: Idea;
  cerrar(): void;
  alCrear(id: string): void;
}

export function FormProyectoDesdeIdea({ idea, cerrar, alCrear }: Props) {
  const { datos, guardarProyecto, cambiarIdeas } = useDatos();
  const hoy = useHoy();
  const [nombre, setNombre] = useState(idea.texto.slice(0, 60).trim());
  const [area, setArea] = useState(datos.proyectos.find((p) => p.id === idea.proyecto)?.area ?? '');
  const [guardando, setGuardando] = useState(false);

  async function crear(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const p = proyectoDesdeIdea(idea, nombre, area || undefined, datos.proyectos.map((x) => x.id), hoy);
    // Primero se crea el proyecto y después se quita la idea: si algo falla, la idea no se pierde.
    const ok = await guardarProyecto(p, null);
    if (ok) await cambiarIdeas((ls) => quitarIdea(ls, idea), `Idea convertida en proyecto: ${p.titulo}`);
    setGuardando(false);
    if (ok) alCrear(p.id);
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void crear(e)}>
        <h2>Convertir en proyecto</h2>
        <p className="nota-form">«{idea.texto}»</p>
        <label>
          Nombre del proyecto
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={80} />
        </label>
        <label>
          Área
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">(ninguna)</option>
            {datos.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear proyecto'}
          </button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/pantallas/Ideas.tsx`**

```tsx
import { useState } from 'react';
import { anadirIdea, quitarIdea, vincularIdea } from '../agenda/ideas';
import type { Edicion } from '../componentes/FormTarea';
import { FormProyectoDesdeIdea } from '../componentes/FormProyectoDesdeIdea';
import type { Destino } from '../componentes/navegacion';
import { ideasDe, type Idea } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import { formatoCorto } from '../fechas';

interface Props {
  editar(e: Edicion): void;
  ir(d: Destino): void;
}

export function Ideas({ editar, ir }: Props) {
  const { datos, cambiarIdeas, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const [convirtiendo, setConvirtiendo] = useState<Idea | null>(null);
  const ideas = ideasDe(datos.ideas);

  async function apuntar(e: { preventDefault(): void }) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    if (await cambiarIdeas((ls) => anadirIdea(ls, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`)) setTexto('');
  }

  const vincular = (idea: Idea, proyecto: string) =>
    void cambiarIdeas(
      (ls) => vincularIdea(ls, idea, proyecto || undefined),
      proyecto ? `Vincular idea a ${proyecto}` : 'Desvincular idea',
    );

  const aTarea = (idea: Idea) =>
    editar({
      nueva: { titulo: idea.texto, proyecto: idea.proyecto },
      nota: 'Al guardar la tarea, la idea sale de la bandeja.',
      alGuardar: () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Idea pasada a tarea: ${idea.texto}`),
    });

  const borrar = (idea: Idea) => {
    if (confirm(`¿Borrar la idea «${idea.texto}»?`))
      void cambiarIdeas((ls) => quitarIdea(ls, idea), `Borrar idea: ${idea.texto}`);
  };

  return (
    <section>
      <div className="barra">
        <h2>Ideas</h2>
      </div>
      <form className="captura" onSubmit={(e) => void apuntar(e)}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Apunta una idea para no desviarte de lo que estás haciendo…"
          aria-label="Nueva idea"
          disabled={soloLectura}
        />
        <button type="submit" className="principal" disabled={!texto.trim() || soloLectura}>
          Apuntar idea
        </button>
      </form>
      {ideas.length === 0 ? (
        <p className="vacio">La bandeja está vacía. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.</p>
      ) : (
        <ul className="lista tarjeta">
          {ideas.map((idea, i) => (
            <li key={`${i}-${idea.fecha}-${idea.texto}`} className="fila-idea">
              <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
              <span className="texto-idea">{idea.texto}</span>
              <select
                aria-label="Proyecto de la idea"
                value={idea.proyecto ?? ''}
                disabled={soloLectura}
                onChange={(e) => vincular(idea, e.target.value)}
              >
                <option value="">(ningún proyecto)</option>
                {datos.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.titulo}</option>
                ))}
                {idea.proyecto && !datos.proyectos.some((p) => p.id === idea.proyecto) && (
                  <option value={idea.proyecto}>{idea.proyecto}</option>
                )}
              </select>
              <button disabled={soloLectura || tareasBloqueadas} onClick={() => aTarea(idea)}>→ Tarea</button>
              <button disabled={soloLectura} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
              <button className="peligro" disabled={soloLectura} onClick={() => borrar(idea)}>Borrar</button>
            </li>
          ))}
        </ul>
      )}
      {convirtiendo && (
        <FormProyectoDesdeIdea
          idea={convirtiendo}
          cerrar={() => setConvirtiendo(null)}
          alCrear={(id) => {
            setConvirtiendo(null);
            ir({ pantalla: 'proyectos', proyecto: id });
          }}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Usar Ideas en `App.tsx`**

Añade `import { Ideas } from './pantallas/Ideas';` y cambia la línea provisional por:

```tsx
        {actual === 'ideas' && <Ideas editar={editar} ir={ir} />}
```

- [ ] **Step 5: Estilos**

Añade al final de `src/estilos.css`:

```css
/* Ideas */
.lista.tarjeta { padding: 8px 20px; }
.fecha-idea { min-width: 56px; }
.texto-idea { flex: 1; min-width: 200px; }
.fila-idea select { width: auto; max-width: 200px; padding: 4px 8px; font-size: 14px; }
.fila-idea button { padding: 4px 10px; font-size: 14px; }
```

- [ ] **Step 6: Verificar**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

- [ ] **Step 7: Commit**

```bash
git add src/pantallas/Ideas.tsx src/componentes/FormProyectoDesdeIdea.tsx src/componentes/FormTarea.tsx src/App.tsx src/estilos.css
git commit -m "Ideas: bandeja con vincular a proyecto, pasar a tarea y convertir en proyecto"
```

Apunta en el registro: `- Task 11: pantalla Ideas, FormProyectoDesdeIdea, Edicion con nota/alGuardar. Build OK.`

---

### Task 12: Proyectos con progreso e ideas, y el resto de pantallas con el estilo nuevo

**Files:**
- Modify: `src/pantallas/Proyectos.tsx`, `src/pantallas/PaginaProyecto.tsx`, `src/pantallas/Tareas.tsx`, `src/pantallas/Ajustes.tsx`, `src/App.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `BarraProgreso` (Task 9); `progresoProyecto` (Task 3); `ideasDe` (Task 1); `Destino` (Task 8); `URL_USO_CLAUDE` (Task 8).
- Produces: `Proyectos` y `PaginaProyecto` aceptan `ir(d: Destino): void`.

- [ ] **Step 1: Proyectos**

En `src/pantallas/Proyectos.tsx`:
- Añade los imports:

```tsx
import { ordenarProyectos, progresoProyecto } from '../agenda/proyectos';
import { BarraProgreso } from '../componentes/BarraProgreso';
import type { Destino } from '../componentes/navegacion';
```

- Cambia la firma:

```tsx
export function Proyectos({ editar, ir, abiertoInicial }: { editar(e: Edicion): void; ir(d: Destino): void; abiertoInicial?: string }) {
```

- Pasa `ir={ir}` a `<PaginaProyecto … />`.
- Cambia la lista por una tarjeta, con la barra en cada fila:

```tsx
      {lista.length > 0 && (
        <ul className="lista tarjeta">
          {lista.map((p) => (
            <li key={p.id} className="fila-proyecto">
              <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
              <button className="titulo-tarea" onClick={() => setAbierto(p.id)}>{p.titulo}</button>
              <span className="fila-progreso"><BarraProgreso {...progresoProyecto(datos.tareas, p.id)} /></span>
              <span className={`estado ${p.estado}`}>{p.estado}</span>
              {prioridadDe(p) !== 'media' && <span className={`prioridad ${prioridadDe(p)}`}>{prioridadDe(p)}</span>}
            </li>
          ))}
        </ul>
      )}
```

- Cambia los botones de filtro para que usen el estilo de pastilla: `className={`pastilla${filtro === f ? ' encendida' : ''}`}`.
- En `src/App.tsx`, pasa `ir={ir}` a `<Proyectos … />`.

- [ ] **Step 2: Página de proyecto**

En `src/pantallas/PaginaProyecto.tsx`:
- Añade los imports:

```tsx
import { LIMITE_ACTIVOS, necesitaAvisoActivos, progresoProyecto } from '../agenda/proyectos';
import { BarraProgreso } from '../componentes/BarraProgreso';
import type { Destino } from '../componentes/navegacion';
import { ideasDe } from '../datos/ideas';
import { formatoCorto } from '../fechas';
```

- Añade `ir(d: Destino): void;` a `interface Props` y `ir` a los parámetros.
- Después de `salir()`, añade:

```tsx
  const irA = (d: Destino) => {
    if (!cambiado || confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) ir(d);
  };
  const ideasProyecto = ideasDe(datos.ideas).filter((i) => i.proyecto === proyecto.id);
```

- Justo después del `</div>` de la primera `barra` (la del título), añade:

```tsx
      <div className="progreso-proyecto">
        <BarraProgreso {...progresoProyecto(datos.tareas, proyecto.id)} />
      </div>
```

- Envuelve la parte de tareas en una tarjeta. Sustituye desde `<div className="barra">` con `<h3>Tareas del proyecto</h3>` hasta el `</ul>` final por:

```tsx
      <section className="tarjeta seccion-proyecto">
        <h2 className="titulo-seccion">
          Tareas del proyecto
          <button
            className="enlace"
            disabled={soloLectura || tareasBloqueadas}
            onClick={() => editar({ nueva: { proyecto: proyecto.id } })}
          >
            + Nueva tarea
          </button>
        </h2>
        <ul className="lista">
          {datos.tareas
            .filter((t) => t.proyecto === proyecto.id)
            .map((t) => (
              <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha alEditar={(x) => editar({ tarea: x })} />
            ))}
        </ul>
      </section>
      {ideasProyecto.length > 0 && (
        <section className="tarjeta">
          <h2 className="titulo-seccion">
            Ideas de este proyecto
            <button className="enlace" onClick={() => irA({ pantalla: 'ideas' })}>Ver en Ideas →</button>
          </h2>
          <ul className="lista">
            {ideasProyecto.map((i, n) => (
              <li key={`${n}-${i.fecha}-${i.texto}`} className="fila-idea">
                <span className="detalle fecha-idea">{formatoCorto(i.fecha)}</span>
                <span className="texto-idea">{i.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
```

- Los selectores de estado, área y prioridad se dejan como están.

- [ ] **Step 3: Tareas en tarjetas**

En `src/pantallas/Tareas.tsx`, sustituye la función `seccion` por:

```tsx
  const seccion = (titulo: string, ts: Tarea[], vacio: string, mostrarFecha = false) => (
    <section className="tarjeta">
      <h2 className="titulo-seccion">{titulo}</h2>
      {ts.length ? (
        <ul className="lista">
          {ts.map((t) => (
            <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
          ))}
        </ul>
      ) : (
        <p className="vacio">{vacio}</p>
      )}
    </section>
  );
```

y pon `className="principal"` al botón «+ Nueva tarea».

- [ ] **Step 4: Ajustes**

En `src/pantallas/Ajustes.tsx`:
- Añade `import { URL_USO_CLAUDE } from '../componentes/navegacion';`.
- Cambia el `<h2>Ajustes</h2>` por `<div className="barra"><h2>Ajustes</h2></div>`.
- Envuelve el `<form>` en `<div className="tarjeta">…</div>` y también el `<details>`.
- Antes del botón «Olvidar la llave», añade:

```tsx
      <p className="solo-movil">
        <a href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">📊 Ver el uso de Claude</a>
      </p>
```

- [ ] **Step 5: Estilos**

Añade al final de `src/estilos.css`:

```css
/* Proyectos */
.progreso-proyecto { max-width: 360px; margin: -4px 0 16px; }
.fila-progreso { width: 180px; }
.seccion-proyecto { margin-top: 20px; }
a { color: var(--acento); }
details summary { cursor: pointer; font-weight: 600; }
@media (max-width: 600px) { .fila-progreso { width: 100%; order: 5; } }
```

- [ ] **Step 6: Verificar**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

- [ ] **Step 7: Commit**

```bash
git add src/pantallas src/App.tsx src/estilos.css
git commit -m "Proyectos con progreso e ideas; Tareas y Ajustes con el estilo nuevo"
```

Apunta en el registro: `- Task 12: progreso e ideas en proyectos, tarjetas en Tareas/Ajustes. Build OK.`

---

### Task 13: Documentación, prueba con Diego y publicación

**Files:**
- Modify: `docs/diseno.md`, `AGENTS.md`, `../my-context/AGENTS.md`

- [ ] **Step 1: `docs/diseno.md`**

En la sección 3 (Datos), añade una subsección después de «Proyectos: `proyectos/<id>.md`»:

```markdown
### Ideas: `ideas/bandeja.md`

Un archivo Markdown. Cada idea es una línea con esta forma:

    - 2026-09-24: texto de la idea
    - 2026-09-24 [id-proyecto]: idea vinculada a proyectos/id-proyecto.md

- La fecha es `AAAA-MM-DD` y el proyecto (opcional) es el nombre del archivo sin `.md`, entre corchetes.
- Una idea ocupa una sola línea.
- Las demás líneas (título, explicaciones) la app las conserva tal cual.
- Las ideas nuevas van al final. La app las muestra de la más nueva a la más antigua.
```

- [ ] **Step 2: `../my-context/AGENTS.md`**

Primero `git pull` en `my-context`. En la sección «Agenda», añade:

```markdown
- Ideas en `ideas/bandeja.md`: una por línea, `- AAAA-MM-DD: idea`. Si es de un proyecto: `- AAAA-MM-DD [id-proyecto]: idea` (id = nombre del archivo en `proyectos/` sin `.md`). La app las lee y escribe.
```

Después, commit y push en `my-context`, según su rutina de Git: `git add -A && git commit -m "Formato de ideas vinculadas a proyectos" && git push`.

- [ ] **Step 3: `AGENTS.md` de este repositorio**

En «Estructura del código», añade estas líneas:

```markdown
- `src/datos/ideas.ts` y `src/agenda/ideas.ts`: la bandeja de ideas (leer/escribir y operaciones).
- `src/componentes/navegacion.ts`, `Lateral.tsx`, `MenuMovil.tsx`: navegación (barra lateral en PC, menú abajo en móvil).
```

Cambia `src/pantallas/` para que diga: «Inicio, Calendario, Tareas, Proyectos, Ideas y Ajustes».

Actualiza «Estado actual»: versión 1.1 (rediseño del PC) hecha, a falta de publicar; lo siguiente es la ronda del móvil. Apunta en el registro los `Ruling:` que haya.

- [ ] **Step 4: Prueba con Diego [Diego]**

Arranca `npm run dev` en segundo plano. Pide a Diego que abra `http://localhost:5173/segundo-cerebro-app/` y que, en Ajustes de **esa ventana**, pegue su usuario, `my-context` y una llave. Nunca en el chat. Es otra dirección que la app publicada, así que la llave se guarda aparte.

Recorred juntos:
1. **Inicio:**
   - saludo y fecha correctos;
   - marcar y desmarcar una tarea;
   - captura «+ Tarea» (aparece en «Sin fecha») y «💡 Idea» (aparece en Ideas);
   - la tarjeta de «Segundo cerebro» con «Dónde lo dejamos» y su barra;
   - pulsar un día de la semana abre el Calendario en ese día.
2. **Calendario:**
   - apagar y encender áreas;
   - «Todo»;
   - recargar la página: el filtro sigue igual.
3. **Ideas:**
   - vincular una idea a «Segundo cerebro», que aparece en la página del proyecto;
   - «→ Tarea», guardar, y la idea desaparece;
   - «→ Proyecto» crea el proyecto y lo abre;
   - «Borrar».
4. Ventana estrecha (menos de 900 px): se ve el menú abajo.
5. `git -C ../my-context pull` y revisar a ojo `ideas/bandeja.md` y `agenda/tareas.yaml`: formato correcto y nada perdido.

Lo que Diego quiera cambiar se arregla antes de seguir, cada cosa con su test si es lógica. Al terminar, detén el servidor.

- [ ] **Step 5: Revisión final y publicación [Diego]**

Run: `npx vitest run && npm run build`
Expected: todos PASS y «✓ built».

Commit de la documentación:

```bash
git add docs/diseno.md AGENTS.md
git commit -m "Documentación de la versión 1.1 (rediseño del PC)"
```

Pregunta a Diego si quiere publicarla. **Solo si dice que sí**, haz `git push`. GitHub Actions la publica sola en unos minutos. Después:
- avísale de que en cada dispositivo la app se actualiza al abrirla;
- recuérdale marcar su tarea «Pulir la app»;
- apunta en el registro: `- Task 13: docs, prueba con Diego, publicado.`
