# Organización (versión 1.3): plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Áreas con subáreas que Diego gestiona, iconos de Tabler (opcionales, puestos solos y cambiables con un buscador) en tareas, ideas y proyectos, ideas completas guardadas en `ideas/ideas.yaml`, y la sección Ideas dentro de Proyectos.

**Architecture:** Igual que siempre: app estática en React, sin servidor, que lee y escribe `my-context` con la API de GitHub. La lógica nueva va en funciones puras con pruebas:
- formatos: `src/datos/areas.ts`, `src/datos/ideas.ts` (nuevo formato) y `src/datos/bandeja.ts` (el antiguo, solo para el paso);
- operaciones: `src/agenda/areas.ts`, `src/agenda/ideas.ts`, `src/agenda/agrupar.ts` y `src/agenda/cambios.ts`;
- iconos: `src/iconos/`.

`repositorio.ts` y `estado/datos.tsx` siguen el patrón de siempre: leer lo último, aplicar el cambio y reintentar, todo por la cola. Las pantallas solo pintan.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Vitest 5 (pruebas de componentes con `renderToString`, sin navegador), `yaml`. Dependencia nueva de desarrollo: `@tabler/icons@3.48.0` (MIT), que solo usa el script que genera los iconos.

**Spec:** `docs/superpowers/specs/2026-09-25-organizacion-design.md`. Léelo antes de empezar.

**Execution note:**
- Diego es principiante: explícale en español y con palabras sencillas qué hace cada tarea y por qué.
- Rama: `organizacion` (ya creada desde `main`).
- Cada tarea deja su línea en `.superpowers/sdd/2026-09-25-organizacion/progress.md` (créalo en la Task 1). Lo que se aparte del plan se apunta como `Ruling:`.
- Los commits son locales: **no hagas `git push`** hasta la Task 15, cuando Diego haya probado la app y dado el visto bueno. Subir a `main` publica la app sola.
- Node: en la terminal Bash de Claude Code, añade `export PATH="$PATH:/c/Program Files/nodejs";` delante de `npm`/`npx`/`node`.
- Al terminar cada tarea: `npm test` y `npm run build` en verde.

## Global Constraints

- 0 € de coste: nada de API ni servicios de pago. La única dependencia nueva es `@tabler/icons` (devDependency).
- Textos de la interfaz en español.
- El repositorio es público: ni tokens ni datos personales en el código ni en las pruebas (usa datos inventados).
- Todo lo nuevo es opcional: sin icono y sin título la app funciona como ahora.
- Los emojis de la barra lateral (`SECCIONES`) no cambian.
- Ids únicos en todo `areas.yaml` (áreas y subáreas). Un solo nivel de subáreas.
- Una subárea nueva nace con el color de su área.
- Id de idea: `i-AAAAMMDD-n`, con la fecha de la idea y sin repetir. Id de tarea: `t-AAAAMMDD-n` (sin cambios).
- `tareas.yaml` e `ideas.yaml`: sin comentarios `#` (no se conservan).
- La app nunca sobrescribe un archivo que no ha podido leer y validar.
- Pasos dobles (crear algo nuevo y quitar lo viejo): primero se crea lo nuevo y después se quita lo viejo.
- Al borrar un área nada se pierde: primero se mueve todo al destino y al final se escribe `areas.yaml`.
- Color para un área desconocida: `#9ca3af`.

## Review Focus

1. **Caché antigua del navegador** (móvil de Diego con la v1.2): `ideas` guardadas como líneas de la bandeja (`{ tipo, idea }`). La app no se rompe y no enseña ideas raras: se descartan las que no tengan `id` y `texto`. Test en la Task 5.
2. **Claude escribe en `bandeja.md` después del paso** (existen los dos archivos): se fusiona sin duplicar nada. Repetir la fusión no cambia nada. Test en la Task 4.
3. **Borrar la única área que queda, o elegir como destino el área que se borra o una de sus subáreas**: no se permite, con un mensaje claro. Las tareas siempre necesitan un área. Test en la Task 2.
4. **Título con tildes, mayúsculas o plural** («EXÁMENES de física»): el icono se encuentra igual (se normaliza y se compara por principio de palabra). Test en la Task 8.
5. **Texto de idea con varias líneas y caracteres que YAML trata de forma especial** (`: `, `#`, `- `, comillas, `\r\n`): se lee y se escribe sin cambiar ni un carácter (los `\r\n` pasan a `\n`). Test en la Task 4.

---

## Estructura de archivos

| Archivo | Qué hace |
|---|---|
| `src/datos/areas.ts` | Tipos `Area`/`Subarea`, `parseAreas` con subáreas y validación, `serializarAreas` |
| `src/agenda/areas.ts` (nuevo) | Buscar, área madre, ids, color, nombre, crear, editar, quitar, destinos, mover, opciones del selector, `PALETA` |
| `src/componentes/areas.ts` | Se borra: `colorDeArea` pasa a `src/agenda/areas.ts` |
| `src/agenda/tareas.ts` | El filtro del calendario agrupa por área madre; `aplicarEdicion` usa `mezclarCambios` |
| `src/agenda/cambios.ts` (nuevo) | `mezclarCambios`: aplicar solo los campos cambiados |
| `src/datos/tareas.ts`, `src/datos/proyectos.ts` | Campo `icono` |
| `src/datos/bandeja.ts` | El antiguo `src/datos/ideas.ts` (formato de `bandeja.md`), solo para el paso |
| `src/datos/ideas.ts` | Formato de `ideas/ideas.yaml`, `nuevoIdIdea`, `ordenarIdeas`, `fusionarBandeja` |
| `src/agenda/ideas.ts` | Operaciones por id: añadir, editar, quitar, a proyecto, a tarea, título visible |
| `src/agenda/agrupar.ts` (nuevo) | `agruparPorArea` para proyectos e ideas |
| `src/github/cliente.ts` | + `borrarArchivo` |
| `src/repositorio.ts` | Lee `ideas.yaml` y la bandeja; `modificarIdeas`, `migrarBandeja`, `modificarAreas`, `cambiarAreaDeProyecto` |
| `src/estado/cache.ts` | Descarta ideas antiguas |
| `src/estado/datos.tsx` | `cambiarIdeas` con `Idea[]`, `cambiarAreas`, `borrarArea`, lanza el paso de la bandeja |
| `scripts/iconos.ts` (nuevo) | Genera `public/iconos/tabler.json` (no se sube) y `src/iconos/basicos.ts` (sí se sube) |
| `src/iconos/diccionario.ts` (nuevo) | Palabras → icono, `normalizar`, `iconoPara`, `iconoAlEscribir` |
| `src/iconos/basicos.ts` (generado) | Dibujos de los iconos del diccionario (van dentro de la app) |
| `src/iconos/coleccion.ts` (nuevo) | Carga la colección completa una sola vez; `buscarIconos` |
| `src/componentes/Icono.tsx` (nuevo) | Dibuja un icono por su nombre |
| `src/componentes/SelectorIcono.tsx` (nuevo) | Botón + ventana con buscador |
| `src/componentes/SelectorArea.tsx` (nuevo) | `<select>` con áreas y subáreas sangradas |
| `src/componentes/FormIdea.tsx` (nuevo) | Crear y editar ideas |
| `src/componentes/ListaIdeas.tsx` (nuevo) | Pestaña Ideas (sustituye a `src/pantallas/Ideas.tsx`) |
| `src/componentes/VentanaArea.tsx` (nuevo) | Crear, editar y borrar áreas y subáreas |
| `src/componentes/ListaAreas.tsx` (nuevo) | Árbol de áreas con lápiz (Ajustes) |
| `src/componentes/navegacion.ts`, `Lateral.tsx`, `MenuMovil.tsx`, `src/App.tsx` | Sin pantalla Ideas; `Destino.pestana`; desplegable |
| `src/pantallas/Proyectos.tsx` | Pestañas `Proyectos | Ideas` y grupos por área |
| Resto de pantallas y componentes | Iconos y selector de área |
| `vite.config.ts`, `package.json`, `.gitignore` | Script de iconos, caché del service worker |

---

### Task 1: Áreas con subáreas (formato)

**Files:**
- Modify: `src/datos/areas.ts`
- Test: `src/datos/areas.test.ts`
- Create: `.superpowers/sdd/2026-09-25-organizacion/progress.md`

**Interfaces:**
- Produces:
  ```ts
  export interface Subarea { id: string; nombre: string; color: string }
  export interface Area extends Subarea { subareas: Subarea[] }
  export function parseAreas(texto: string): Area[];
  export function serializarAreas(areas: Area[]): string;
  ```

- [ ] **Step 1: Crea el registro**

`.superpowers/sdd/2026-09-25-organizacion/progress.md`:
```markdown
# Registro: organización (v1.3)
Plan: docs/superpowers/plans/2026-09-25-organizacion.md
```

- [ ] **Step 2: Escribe las pruebas que fallan**

Sustituye `src/datos/areas.test.ts` por:
```ts
import { describe, expect, it } from 'vitest';
import { parseAreas, serializarAreas } from './areas';

const CON_SUBAREAS = `- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#a855f7"
    - id: unreal
      nombre: Unreal
      color: "#6b21a8"
`;

describe('parseAreas', () => {
  it('lee las áreas de siempre (sin subáreas)', () => {
    expect(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n')).toEqual([
      { id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] },
    ]);
  });
  it('lee las subáreas', () => {
    const as = parseAreas(CON_SUBAREAS);
    expect(as[1].subareas).toEqual([
      { id: 'blender', nombre: 'Blender', color: '#a855f7' },
      { id: 'unreal', nombre: 'Unreal', color: '#6b21a8' },
    ]);
  });
  it('vacío → lista vacía', () => {
    expect(parseAreas('')).toEqual([]);
  });
  it('un color sin comillas (que YAML toma como comentario) da un error claro', () => {
    expect(() => parseAreas('- id: uni\n  nombre: Uni\n  color: #3b82f6\n')).toThrow(/color/);
  });
  it('un color mal escrito en una subárea da error', () => {
    expect(() => parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: B\n      color: rojo\n')).toThrow(/b.*color/);
  });
  it('un id repetido (aunque sea entre área y subárea) da error', () => {
    expect(() =>
      parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: uni\n      nombre: Otra\n      color: "#a855f7"\n'),
    ).toThrow(/uni.*repetido/);
  });
  it('una subárea con subáreas da error', () => {
    expect(() =>
      parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: B\n      color: "#a855f7"\n      subareas: []\n'),
    ).toThrow(/un solo nivel/);
  });
  it('subareas que no es una lista da error', () => {
    expect(() => parseAreas('- id: v\n  nombre: V\n  color: "#a855f7"\n  subareas: blender\n')).toThrow(/subareas/);
  });
});

describe('serializarAreas', () => {
  it('leer y volver a escribir deja el archivo idéntico', () => {
    expect(serializarAreas(parseAreas(CON_SUBAREAS))).toBe(CON_SUBAREAS);
  });
  it('sin subáreas no escribe la clave subareas', () => {
    expect(serializarAreas([{ id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] }])).toBe(
      '- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n',
    );
  });
  it('lista vacía → archivo vacío', () => {
    expect(serializarAreas([])).toBe('');
  });
});
```

- [ ] **Step 3: Comprueba que fallan**

Run: `npx vitest run src/datos/areas.test.ts`
Expected: FAIL (`serializarAreas` no existe; las áreas no tienen `subareas`).

- [ ] **Step 4: Escribe el código**

Sustituye `src/datos/areas.ts` por:
```ts
import { stringify } from 'yaml';
import { RUTA_AREAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Subarea {
  id: string;
  nombre: string;
  color: string;
}

export interface Area extends Subarea {
  subareas: Subarea[];
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

function leerUna(bruto: unknown, donde: string): Subarea & { subareas?: unknown } {
  const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
  if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
    throw new ErrorDatos(RUTA_AREAS, `${donde}: necesita id y nombre`);
  if (typeof a.color !== 'string' || !COLOR.test(a.color))
    throw new ErrorDatos(RUTA_AREAS, `${donde} (${a.id}): color debe escribirse entre comillas, como "#3b82f6"`);
  return { id: a.id, nombre: a.nombre, color: a.color, subareas: a.subareas };
}

export function parseAreas(texto: string): Area[] {
  const datos = leerYaml(texto, RUTA_AREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_AREAS, 'areas.yaml debe ser una lista de áreas');
  const vistos = new Set<string>();
  const anotar = (id: string) => {
    if (vistos.has(id)) throw new ErrorDatos(RUTA_AREAS, `el id "${id}" está repetido: cada área y subárea necesita uno distinto`);
    vistos.add(id);
  };
  return datos.map((bruto, i) => {
    const { subareas, ...area } = leerUna(bruto, `área ${i + 1}`);
    anotar(area.id);
    if (subareas !== undefined && subareas !== null && !Array.isArray(subareas))
      throw new ErrorDatos(RUTA_AREAS, `área ${area.id}: subareas debe ser una lista`);
    const subs = ((subareas ?? []) as unknown[]).map((b, j) => {
      const { subareas: nietas, ...sub } = leerUna(b, `subárea ${j + 1} de ${area.id}`);
      if (nietas !== undefined) throw new ErrorDatos(RUTA_AREAS, `subárea ${sub.id}: las subáreas tienen un solo nivel (no pueden tener subareas)`);
      anotar(sub.id);
      return sub;
    });
    return { ...area, subareas: subs };
  });
}

// El color va entre comillas: sin ellas, YAML toma "#..." como un comentario.
export function serializarAreas(areas: Area[]): string {
  if (areas.length === 0) return '';
  const limpio = areas.map(({ subareas, ...a }) => (subareas.length ? { ...a, subareas } : a));
  return stringify(limpio, { lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN' }).replace(
    /^(\s*)color: (#[0-9a-fA-F]{6})$/gm,
    '$1color: "$2"',
  );
}
```
Nota: si `stringify` ya pone las comillas por su cuenta, el `replace` no cambia nada. Lo que manda es la prueba de «idéntico».

- [ ] **Step 5: Comprueba que pasan, y el resto**

Run: `npx vitest run src/datos/areas.test.ts` → PASS. Después `npm test` y `npm run build`. Si alguna prueba antigua comparaba áreas con `toEqual` sin `subareas`, añade `subareas: []` en lo esperado (es el formato nuevo, no un fallo).

- [ ] **Step 6: Registro y commit**

Añade al registro: `Task 1: áreas con subáreas (formato) — hecho`.
```bash
git add src/datos/areas.ts src/datos/areas.test.ts
git commit -m "Áreas con subáreas: leer, validar y escribir areas.yaml"
```

---

### Task 2: Áreas (operaciones y filtro del calendario)

**Files:**
- Create: `src/agenda/areas.ts`, `src/agenda/areas.test.ts`
- Delete: `src/componentes/areas.ts` (y cambia sus imports a `../agenda/areas`)
- Modify: `src/agenda/tareas.ts` (filtro), `src/agenda/tareas.test.ts`, `src/pantallas/Calendario.tsx`

**Interfaces:**
- Consumes: `Area`, `Subarea` (Task 1); `aSlug(texto, maximo)` de `src/texto.ts`.
- Produces:
  ```ts
  export const COLOR_DESCONOCIDO = '#9ca3af';
  export const PALETA: string[];
  export class ErrorArea extends Error {}
  export function buscarArea(areas: Area[], id: string | undefined): { area: Subarea; madre: Area } | undefined;
  export function areaMadre(areas: Area[], id: string | undefined): string | undefined;
  export function idsDeArea(areas: Area[], id: string): string[];
  export function todosLosIds(areas: Area[]): string[];
  export function colorDeArea(areas: Area[], id: string | undefined): string;
  export function nombreDeArea(areas: Area[], id: string | undefined): string | undefined;
  export function nuevoIdArea(nombre: string, areas: Area[]): string;
  export function crearArea(areas: Area[], datos: { nombre: string; color?: string }, madre?: string): Area[];
  export function editarArea(areas: Area[], id: string, cambios: { nombre?: string; color?: string }): Area[];
  export function quitarArea(areas: Area[], id: string): Area[];
  export function destinosPosibles(areas: Area[], id: string): string[];
  export function moverDeArea<T extends { area?: string }>(xs: T[], ids: string[], destino: string): T[];
  export function opcionesDeArea(areas: Area[]): { id: string; nombre: string; sub: boolean }[];
  // en src/agenda/tareas.ts (cambian de firma):
  export function hayOtrasAreas(ts: Tarea[], areas: Area[]): boolean;
  export function filtrarPorAreas(ts: Tarea[], encendidas: string[], areas: Area[]): Tarea[];
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/agenda/areas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import {
  areaMadre, buscarArea, colorDeArea, crearArea, destinosPosibles, editarArea, ErrorArea, idsDeArea, moverDeArea,
  nombreDeArea, nuevoIdArea, opcionesDeArea, quitarArea, todosLosIds,
} from './areas';

const AREAS = parseAreas(`- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#f97316"
    - id: unreal
      nombre: Unreal
      color: "#a855f7"
`);

describe('buscar', () => {
  it('encuentra áreas y subáreas, con su madre', () => {
    expect(buscarArea(AREAS, 'uni')?.madre.id).toBe('uni');
    expect(buscarArea(AREAS, 'blender')?.area.nombre).toBe('Blender');
    expect(buscarArea(AREAS, 'blender')?.madre.id).toBe('videojuegos');
    expect(buscarArea(AREAS, 'nada')).toBeUndefined();
    expect(buscarArea(AREAS, undefined)).toBeUndefined();
  });
  it('areaMadre, ids, color y nombre', () => {
    expect(areaMadre(AREAS, 'unreal')).toBe('videojuegos');
    expect(areaMadre(AREAS, 'nada')).toBeUndefined();
    expect(idsDeArea(AREAS, 'videojuegos')).toEqual(['videojuegos', 'blender', 'unreal']);
    expect(idsDeArea(AREAS, 'blender')).toEqual(['blender']);
    expect(idsDeArea(AREAS, 'nada')).toEqual([]);
    expect(todosLosIds(AREAS)).toEqual(['uni', 'videojuegos', 'blender', 'unreal']);
    expect(colorDeArea(AREAS, 'blender')).toBe('#f97316');
    expect(colorDeArea(AREAS, 'nada')).toBe('#9ca3af');
    expect(nombreDeArea(AREAS, 'blender')).toBe('Blender');
  });
});

describe('crear y editar', () => {
  it('el id sale del nombre, sin tildes y sin repetir entre áreas y subáreas', () => {
    expect(nuevoIdArea('Música y Piano', AREAS)).toBe('musica-y-piano');
    expect(nuevoIdArea('Blender', AREAS)).toBe('blender-2');
    expect(nuevoIdArea('¡¡!!', AREAS)).toBe('area');
  });
  it('un área nueva va al final; una subárea nace con el color de su área', () => {
    const r = crearArea(AREAS, { nombre: 'Salud', color: '#22c55e' });
    expect(r.at(-1)).toEqual({ id: 'salud', nombre: 'Salud', color: '#22c55e', subareas: [] });
    const s = crearArea(AREAS, { nombre: 'Roblox' }, 'videojuegos');
    expect(s[1].subareas.at(-1)).toEqual({ id: 'roblox', nombre: 'Roblox', color: '#a855f7' });
  });
  it('crear dentro de una subárea no se puede', () => {
    expect(() => crearArea(AREAS, { nombre: 'X' }, 'blender')).toThrow(ErrorArea);
  });
  it('editar cambia nombre o color sin tocar el id', () => {
    const r = editarArea(AREAS, 'unreal', { nombre: 'Unreal Engine', color: '#111111' });
    expect(r[1].subareas[1]).toEqual({ id: 'unreal', nombre: 'Unreal Engine', color: '#111111' });
    expect(editarArea(AREAS, 'uni', { color: '#000000' })[0].color).toBe('#000000');
  });
  it('editar un área que ya no existe lanza ErrorArea', () => {
    expect(() => editarArea(AREAS, 'nada', { nombre: 'X' })).toThrow(ErrorArea);
  });
});

describe('borrar', () => {
  it('quitar un área quita también sus subáreas; quitar una subárea deja su área', () => {
    expect(todosLosIds(quitarArea(AREAS, 'videojuegos'))).toEqual(['uni']);
    expect(todosLosIds(quitarArea(AREAS, 'blender'))).toEqual(['uni', 'videojuegos', 'unreal']);
  });
  it('los destinos no incluyen lo que se borra', () => {
    expect(destinosPosibles(AREAS, 'videojuegos')).toEqual(['uni']);
    expect(destinosPosibles(AREAS, 'blender')).toEqual(['uni', 'videojuegos', 'unreal']);
  });
  it('si solo queda un área, no hay destinos', () => {
    expect(destinosPosibles(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n'), 'uni')).toEqual([]);
  });
  it('mover cambia el área solo de lo que estaba dentro', () => {
    const xs = [{ area: 'blender' }, { area: 'uni' }, { area: 'videojuegos' }, {}];
    expect(moverDeArea(xs, ['videojuegos', 'blender', 'unreal'], 'uni')).toEqual([{ area: 'uni' }, { area: 'uni' }, { area: 'uni' }, {}]);
  });
  it('mover a un destino que se va a borrar lanza ErrorArea', () => {
    expect(() => moverDeArea([{ area: 'blender' }], ['videojuegos', 'blender'], 'blender')).toThrow(ErrorArea);
  });
});

describe('opcionesDeArea', () => {
  it('cada área seguida de sus subáreas', () => {
    expect(opcionesDeArea(AREAS)).toEqual([
      { id: 'uni', nombre: 'Uni', sub: false },
      { id: 'videojuegos', nombre: 'Videojuegos', sub: false },
      { id: 'blender', nombre: 'Blender', sub: true },
      { id: 'unreal', nombre: 'Unreal', sub: true },
    ]);
  });
});
```

En `src/agenda/tareas.test.ts`, en los dos bloques `describe('filtro por áreas'…)`:
- añade `import { parseAreas } from '../datos/areas';`;
- sustituye `const conocidas = ['uni', 'personal'];` por
  ```ts
  const conocidas = parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n  subareas:\n    - id: fisica\n      nombre: Física\n      color: "#3b82f6"\n- id: personal\n  nombre: Personal\n  color: "#f59e0b"\n');
  ```
- en el segundo bloque, cambia `['uni', 'personal']` por `conocidas` (decláralo igual dentro del bloque);
- añade esta prueba al primer bloque:
  ```ts
  it('encender un área enseña también lo de sus subáreas', () => {
    const conSub = [...ts, { id: 'f', titulo: 'F', area: 'fisica' }];
    expect(ids(filtrarPorAreas(conSub, ['uni'], conocidas))).toEqual(['u', 'f']);
    expect(hayOtrasAreas([{ id: 'f', titulo: 'F', area: 'fisica' }], conocidas)).toBe(false);
  });
  ```
  (Si el nombre de la lista del bloque no es `ts` o el de la función auxiliar no es `ids`, usa los que haya.)

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/agenda/areas.test.ts src/agenda/tareas.test.ts`
Expected: FAIL (`./areas` no existe; `filtrarPorAreas` espera una lista de ids).

- [ ] **Step 3: Escribe el código**

`src/agenda/areas.ts`:
```ts
import type { Area, Subarea } from '../datos/areas';
import { aSlug } from '../texto';

export const COLOR_DESCONOCIDO = '#9ca3af';

// Colores del tema para elegir rápido (también hay un selector libre).
export const PALETA = ['#3b82f6', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#78716c'];

export class ErrorArea extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorArea';
  }
}

export function buscarArea(areas: Area[], id: string | undefined): { area: Subarea; madre: Area } | undefined {
  if (!id) return undefined;
  for (const madre of areas) {
    if (madre.id === id) return { area: madre, madre };
    const sub = madre.subareas.find((s) => s.id === id);
    if (sub) return { area: sub, madre };
  }
  return undefined;
}

export function areaMadre(areas: Area[], id: string | undefined): string | undefined {
  return buscarArea(areas, id)?.madre.id;
}

// Un área grande cubre su id y los de sus subáreas; una subárea, solo el suyo.
export function idsDeArea(areas: Area[], id: string): string[] {
  const grande = areas.find((a) => a.id === id);
  if (grande) return [grande.id, ...grande.subareas.map((s) => s.id)];
  return buscarArea(areas, id) ? [id] : [];
}

export function todosLosIds(areas: Area[]): string[] {
  return areas.flatMap((a) => [a.id, ...a.subareas.map((s) => s.id)]);
}

export function colorDeArea(areas: Area[], id: string | undefined): string {
  return buscarArea(areas, id)?.area.color ?? COLOR_DESCONOCIDO;
}

export function nombreDeArea(areas: Area[], id: string | undefined): string | undefined {
  return buscarArea(areas, id)?.area.nombre;
}

export function nuevoIdArea(nombre: string, areas: Area[]): string {
  const base = aSlug(nombre, 40) || 'area';
  const usados = todosLosIds(areas);
  let id = base;
  for (let n = 2; usados.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function crearArea(areas: Area[], datos: { nombre: string; color?: string }, madre?: string): Area[] {
  const nombre = datos.nombre.trim();
  const id = nuevoIdArea(nombre, areas);
  if (!madre) return [...areas, { id, nombre, color: datos.color ?? PALETA[areas.length % PALETA.length], subareas: [] }];
  const grande = areas.find((a) => a.id === madre);
  if (!grande) throw new ErrorArea('Solo se pueden crear subáreas dentro de un área grande (y esta ya no existe o es una subárea).');
  return areas.map((a) => (a === grande ? { ...a, subareas: [...a.subareas, { id, nombre, color: datos.color ?? a.color }] } : a));
}

export function editarArea(areas: Area[], id: string, cambios: { nombre?: string; color?: string }): Area[] {
  if (!buscarArea(areas, id)) throw new ErrorArea('Esta área ha cambiado mientras tanto (quizá la borró Claude u otro dispositivo).');
  const aplicar = <T extends Subarea>(x: T): T =>
    x.id === id ? { ...x, ...(cambios.nombre?.trim() ? { nombre: cambios.nombre.trim() } : {}), ...(cambios.color ? { color: cambios.color } : {}) } : x;
  return areas.map((a) => aplicar({ ...a, subareas: a.subareas.map(aplicar) }));
}

export function quitarArea(areas: Area[], id: string): Area[] {
  return areas.filter((a) => a.id !== id).map((a) => ({ ...a, subareas: a.subareas.filter((s) => s.id !== id) }));
}

export function destinosPosibles(areas: Area[], id: string): string[] {
  const fuera = idsDeArea(areas, id);
  return todosLosIds(areas).filter((x) => !fuera.includes(x));
}

export function moverDeArea<T extends { area?: string }>(xs: T[], ids: string[], destino: string): T[] {
  if (ids.includes(destino)) throw new ErrorArea('El destino no puede ser el área que se borra ni una de sus subáreas.');
  return xs.map((x) => (x.area !== undefined && ids.includes(x.area) ? { ...x, area: destino } : x));
}

export function opcionesDeArea(areas: Area[]): { id: string; nombre: string; sub: boolean }[] {
  return areas.flatMap((a) => [
    { id: a.id, nombre: a.nombre, sub: false },
    ...a.subareas.map((s) => ({ id: s.id, nombre: s.nombre, sub: true })),
  ]);
}
```

En `src/agenda/tareas.ts`, sustituye `hayOtrasAreas` y `filtrarPorAreas` por:
```ts
export function hayOtrasAreas(ts: Tarea[], areas: Area[]): boolean {
  return ts.some((t) => areaMadre(areas, t.area) === undefined);
}

// Cada tarea cuenta para su área grande: encender «Videojuegos» enseña también Blender, Unreal…
export function filtrarPorAreas(ts: Tarea[], encendidas: string[], areas: Area[]): Tarea[] {
  // «Otras» solo cuenta si de verdad hay tareas con áreas desconocidas; si no, el calendario saldría vacío.
  const conocidas = areas.map((a) => a.id);
  const hayOtras = hayOtrasAreas(ts, areas);
  const validas = encendidas.filter((a) => conocidas.includes(a) || (a === OTRAS && hayOtras));
  if (validas.length === 0) return ts;
  return ts.filter((t) => validas.includes(areaMadre(areas, t.area) ?? OTRAS));
}
```
con los imports `import type { Area } from '../datos/areas';` e `import { areaMadre } from './areas';`.

En `src/pantallas/Calendario.tsx`: `hayOtrasAreas(datos.tareas, datos.areas)` y `filtrarPorAreas(datos.tareas, encendidas, datos.areas)`. La variable `conocidas` ya no hace falta.

Borra `src/componentes/areas.ts` y cambia en `EtiquetaTarea.tsx`, `FilaTarea.tsx`, `Lateral.tsx`, `Inicio.tsx` y `Proyectos.tsx` el import `from './areas'` / `from '../componentes/areas'` por `from '../agenda/areas'` (o `'./../agenda/areas'` según la carpeta).

- [ ] **Step 4: Comprueba que pasan**

Run: `npx vitest run src/agenda/areas.test.ts src/agenda/tareas.test.ts` → PASS. Después `npm test` y `npm run build`.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src/agenda src/componentes src/pantallas/Calendario.tsx
git commit -m "Áreas: buscar, crear, editar y borrar con subáreas; el calendario agrupa por área grande"
```

---

### Task 3: Icono en tareas y proyectos (y `mezclarCambios`)

**Files:**
- Create: `src/agenda/cambios.ts`, `src/agenda/cambios.test.ts`
- Modify: `src/datos/tareas.ts`, `src/datos/tareas.test.ts`, `src/datos/proyectos.ts`, `src/datos/proyectos.test.ts`, `src/agenda/tareas.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/agenda/cambios.ts
  export function mezclarCambios<T extends object>(remota: T, antes: T, despues: Omit<T, 'id'> | T): T;
  // Tarea gana `icono?: string`; Proyecto gana `icono?: string`.
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/agenda/cambios.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mezclarCambios } from './cambios';

describe('mezclarCambios', () => {
  it('aplica solo lo que cambió y respeta lo que otro cambió en lo demás', () => {
    const antes = { id: 'a', titulo: 'A', notas: 'n' } as { id: string; titulo: string; notas?: string; icono?: string };
    const remota = { ...antes, notas: 'cambiada por Claude' };
    const despues = { titulo: 'A', notas: 'n', icono: 'cube' };
    expect(mezclarCambios(remota, antes, despues)).toEqual({ id: 'a', titulo: 'A', notas: 'cambiada por Claude', icono: 'cube' });
  });
  it('un campo que pasa a undefined se borra', () => {
    const antes = { id: 'a', titulo: 'A', icono: 'cube' } as { id: string; titulo: string; icono?: string };
    expect(mezclarCambios(antes, antes, { titulo: 'A', icono: undefined })).toEqual({ id: 'a', titulo: 'A' });
  });
});
```

En `src/datos/tareas.test.ts`, dentro de `describe('parseTareas'…)`:
```ts
  it('lee el icono y rechaza uno que no es texto', () => {
    expect(parseTareas('- id: a\n  titulo: A\n  area: uni\n  icono: cube\n')[0].icono).toBe('cube');
    expect(() => parseTareas('- id: a\n  titulo: A\n  area: uni\n  icono: 3\n')).toThrow(/icono/);
  });
```

En `src/datos/proyectos.test.ts`:
```ts
describe('icono del proyecto', () => {
  it('se lee y se escribe en el encabezado', () => {
    const p = parseProyecto('juego', '---\nestado: activo\nicono: device-gamepad-2\n---\n# Juego\n');
    expect(p.icono).toBe('device-gamepad-2');
    expect(serializarProyecto({ ...p, icono: 'cube' })).toContain('icono: cube\n');
    expect(serializarProyecto({ ...p, icono: undefined })).not.toContain('icono');
  });
  it('un icono que no es texto da error', () => {
    expect(() => parseProyecto('x', '---\nicono: [a]\n---\n# X\n')).toThrow(/icono/);
  });
});
```
(Importa `parseProyecto` y `serializarProyecto` si el archivo no los importa ya.)

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/agenda/cambios.test.ts src/datos/tareas.test.ts src/datos/proyectos.test.ts`
Expected: FAIL.

- [ ] **Step 3: Escribe el código**

`src/agenda/cambios.ts`:
```ts
// Aplica sobre la versión remota solo los campos que el usuario cambió respecto a `antes`,
// para no pisar lo que otro (Claude, otro dispositivo) haya cambiado mientras tanto.
export function mezclarCambios<T extends object>(remota: T, antes: T, despues: Omit<T, 'id'> | T): T {
  const resultado: Record<string, unknown> = { ...remota };
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
    if (k === 'id' || JSON.stringify(a[k]) === JSON.stringify(d[k])) continue;
    if (d[k] === undefined) delete resultado[k];
    else resultado[k] = d[k];
  }
  return resultado as T;
}
```

En `src/agenda/tareas.ts`, `aplicarEdicion` queda:
```ts
export function aplicarEdicion(ts: Tarea[], original: Tarea | null, editada: TareaSinId, ahora: Date): Tarea[] {
  if (!original) return [...ts, { ...editada, id: nuevoIdTarea(ahora, ts) }];
  const remota = ts.find((x) => x.id === original.id);
  if (!remota) return [...ts, { ...editada, id: original.id }];
  return ts.map((x) => (x === remota ? mezclarCambios(remota, original, editada) : x));
}
```
(con `import { mezclarCambios } from './cambios';` y quitando el comentario de arriba, que ya está en `cambios.ts`).

En `src/datos/tareas.ts`: añade `icono?: string;` a `Tarea` (después de `titulo`) y en `problema()`:
```ts
  if (t.icono !== undefined && typeof t.icono !== 'string') return 'icono debe ser el nombre de un icono (texto)';
```

En `src/datos/proyectos.ts`: añade `icono?: string;` a `Proyecto`; en `parseProyecto`:
```ts
  if (meta.icono !== undefined && typeof meta.icono !== 'string') throw new ErrorDatos(archivo, 'icono debe ser el nombre de un icono (texto)');
```
y en el objeto devuelto `icono: meta.icono as string | undefined,`. En `serializarProyecto`:
```ts
  const encabezado = { ...p.meta, estado: p.estado, area: p.area, prioridad: p.prioridad, icono: p.icono };
```
(`stringify` omite las claves `undefined`: la prueba lo comprueba).

- [ ] **Step 4: Comprueba que pasan**

Run: las tres pruebas → PASS. `npm test` y `npm run build`.

- [ ] **Step 5: Registro y commit**
```bash
git add src/agenda/cambios.ts src/agenda/cambios.test.ts src/agenda/tareas.ts src/datos
git commit -m "Campo icono en tareas y proyectos; mezclarCambios reutilizable"
```

---

### Task 4: Formato de `ideas/ideas.yaml` y fusión con la bandeja antigua

**Files:**
- Move: `src/datos/ideas.ts` → `src/datos/bandeja.ts` y `src/datos/ideas.test.ts` → `src/datos/bandeja.test.ts` (con `git mv`; cambia los imports que apunten a `datos/ideas` por `datos/bandeja`, sin cambiar nada más)
- Create: `src/datos/ideas.ts`, `src/datos/ideas.test.ts`
- Modify: `src/datos/rutas.ts`

**Interfaces:**
- Consumes: `parseBandeja`, `type Linea` (ahora en `src/datos/bandeja.ts`).
- Produces:
  ```ts
  export const RUTA_IDEAS = 'ideas/ideas.yaml';           // en rutas.ts
  export interface Idea { id: string; fecha: ISODate; texto: string; titulo?: string; icono?: string; area?: string; proyecto?: string }
  export type IdeaSinId = Omit<Idea, 'id'>;
  export function parseIdeas(texto: string): Idea[];
  export function serializarIdeas(ideas: Idea[]): string;
  export function nuevoIdIdea(fecha: ISODate, existentes: Idea[]): string;
  export function ordenarIdeas(ideas: Idea[]): Idea[];      // la más nueva primero
  export function fusionarBandeja(ideas: Idea[], bandeja: Linea[]): Idea[];
  ```

- [ ] **Step 1: Mueve el formato antiguo**

```bash
git mv src/datos/ideas.ts src/datos/bandeja.ts
git mv src/datos/ideas.test.ts src/datos/bandeja.test.ts
```
Cambia `from './ideas'` por `from './bandeja'` en `bandeja.test.ts` y `from '../datos/ideas'` / `from './datos/ideas'` por `.../datos/bandeja` en el resto (`grep -rn "datos/ideas" src`). Run: `npm test` y `npm run build` → todo en verde (no cambia nada más). Commit:
```bash
git add -A src && git commit -m "El formato de bandeja.md pasa a src/datos/bandeja.ts"
```

- [ ] **Step 2: Escribe las pruebas que fallan**

`src/datos/ideas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseBandeja } from './bandeja';
import { fusionarBandeja, nuevoIdIdea, ordenarIdeas, parseIdeas, serializarIdeas, type Idea } from './ideas';
import { ErrorDatos } from './yaml';

const EJEMPLO = `- id: i-20260925-1
  fecha: 2026-09-25
  titulo: Juego de gravedad
  icono: planet
  area: unreal
  proyecto: juego-gravedad
  texto: |-
    Cambias la gravedad para resolver puzles.
    - Mecánica: girar el mundo 90º
- id: i-20260922-1
  fecha: 2026-09-22
  texto: App propia con IA y MCP.
`;

describe('parseIdeas', () => {
  it('lee el ejemplo del diseño', () => {
    const is = parseIdeas(EJEMPLO);
    expect(is[0]).toEqual({
      id: 'i-20260925-1', fecha: '2026-09-25', titulo: 'Juego de gravedad', icono: 'planet', area: 'unreal',
      proyecto: 'juego-gravedad', texto: 'Cambias la gravedad para resolver puzles.\n- Mecánica: girar el mundo 90º',
    });
    expect(is[1]).toEqual({ id: 'i-20260922-1', fecha: '2026-09-22', texto: 'App propia con IA y MCP.' });
  });
  it('vacío → lista vacía', () => {
    expect(parseIdeas('')).toEqual([]);
  });
  it('rechaza ideas sin id, sin texto o con fecha mal escrita, diciendo cuál', () => {
    expect(() => parseIdeas('- fecha: 2026-09-25\n  texto: X\n')).toThrow(ErrorDatos);
    expect(() => parseIdeas('- id: i-1\n  fecha: 2026-09-25\n  texto: "  "\n')).toThrow(/texto/);
    expect(() => parseIdeas('- id: i-1\n  fecha: 25/09/2026\n  texto: X\n')).toThrow(/fecha/);
    expect(() => parseIdeas('- id: i-1\n  fecha: 2026-09-25\n  texto: X\n  icono: 3\n')).toThrow(/i-1.*icono/);
    expect(() => parseIdeas('texto: suelto\n')).toThrow(/lista/);
  });
  it('rechaza ids repetidos', () => {
    expect(() => parseIdeas('- id: a\n  fecha: 2026-09-25\n  texto: X\n- id: a\n  fecha: 2026-09-25\n  texto: Y\n')).toThrow(/repetido/);
  });
});

describe('serializarIdeas', () => {
  it('leer y escribir conserva todo', () => {
    expect(parseIdeas(serializarIdeas(parseIdeas(EJEMPLO)))).toEqual(parseIdeas(EJEMPLO));
  });
  it('texto con caracteres especiales de YAML y varias líneas se conserva exacto', () => {
    const raro = 'Jefe: "el final" # no es comentario\n- lista\n\n  sangría: sí\n[corchetes] {llaves} & * ! |';
    const idea: Idea = { id: 'i-20260925-1', fecha: '2026-09-25', texto: raro, titulo: '#1: ¿qué?' };
    expect(parseIdeas(serializarIdeas([idea]))).toEqual([idea]);
  });
  it('lista vacía → archivo vacío', () => {
    expect(serializarIdeas([])).toBe('');
  });
});

describe('nuevoIdIdea', () => {
  it('usa la fecha de la idea y el siguiente número libre', () => {
    const is = parseIdeas(EJEMPLO);
    expect(nuevoIdIdea('2026-09-25', is)).toBe('i-20260925-2');
    expect(nuevoIdIdea('2026-10-01', is)).toBe('i-20261001-1');
  });
});

describe('ordenarIdeas', () => {
  it('la más nueva primero; a igual fecha, la última del archivo primero', () => {
    const is: Idea[] = [
      { id: 'a', fecha: '2026-09-22', texto: 'A' },
      { id: 'b', fecha: '2026-09-25', texto: 'B' },
      { id: 'c', fecha: '2026-09-22', texto: 'C' },
    ];
    expect(ordenarIdeas(is).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('fusionarBandeja', () => {
  const BANDEJA = parseBandeja('# Bandeja de ideas\n\nTexto de cabecera.\n\n- 2026-09-22 [segundo-cerebro]: App propia\r\n- 2026-09-24: Juego: jefe [final]\n');
  it('pasa cada idea con su fecha, proyecto y texto, y descarta la cabecera', () => {
    expect(fusionarBandeja([], BANDEJA)).toEqual([
      { id: 'i-20260922-1', fecha: '2026-09-22', proyecto: 'segundo-cerebro', texto: 'App propia' },
      { id: 'i-20260924-1', fecha: '2026-09-24', texto: 'Juego: jefe [final]' },
    ]);
  });
  it('no duplica las que ya están y repetirlo no cambia nada', () => {
    const una = fusionarBandeja([], BANDEJA);
    expect(fusionarBandeja(una, BANDEJA)).toEqual(una);
  });
  it('si existen los dos archivos, añade solo las nuevas al final, con ids libres', () => {
    const ya: Idea[] = [{ id: 'i-20260922-1', fecha: '2026-09-22', proyecto: 'segundo-cerebro', texto: 'App propia' }];
    expect(fusionarBandeja(ya, BANDEJA).map((i) => i.id)).toEqual(['i-20260922-1', 'i-20260924-1']);
  });
});
```

- [ ] **Step 3: Comprueba que fallan**

Run: `npx vitest run src/datos/ideas.test.ts` → FAIL.

- [ ] **Step 4: Escribe el código**

En `src/datos/rutas.ts` añade `export const RUTA_IDEAS = 'ideas/ideas.yaml';` (deja `RUTA_BANDEJA`: se usa para el paso).

`src/datos/ideas.ts`:
```ts
import { stringify } from 'yaml';
import { isISODate, type ISODate } from '../fechas';
import type { Linea } from './bandeja';
import { RUTA_IDEAS } from './rutas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export interface Idea {
  id: string;
  fecha: ISODate;
  titulo?: string;
  icono?: string;
  area?: string;
  proyecto?: string;
  texto: string;
}

export type IdeaSinId = Omit<Idea, 'id'>;

const OPCIONALES = ['titulo', 'icono', 'area', 'proyecto'] as const;

function problema(i: Record<string, unknown>): string | null {
  if (typeof i.id !== 'string' || !i.id.trim()) return 'el campo id es obligatorio y debe ser texto';
  if (!isISODate(i.fecha)) return 'fecha debe tener el formato AAAA-MM-DD';
  if (typeof i.texto !== 'string' || !i.texto.trim()) return 'el campo texto es obligatorio';
  for (const k of OPCIONALES) if (i[k] !== undefined && typeof i[k] !== 'string') return `${k} debe ser texto`;
  return null;
}

export function parseIdeas(texto: string): Idea[] {
  const datos = leerYaml(texto, RUTA_IDEAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_IDEAS, 'ideas.yaml debe ser una lista de ideas');
  const vistos = new Set<string>();
  return datos.map((bruto, n) => {
    const i = quitarNulos((typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>);
    const etiqueta = `idea ${n + 1}${typeof i.id === 'string' ? ` (${i.id})` : ''}`;
    const p = problema(i);
    if (p) throw new ErrorDatos(RUTA_IDEAS, `${etiqueta}: ${p}`);
    if (vistos.has(i.id as string)) throw new ErrorDatos(RUTA_IDEAS, `${etiqueta}: el id está repetido`);
    vistos.add(i.id as string);
    return i as unknown as Idea;
  });
}

// Orden fijo de los campos, para que el archivo se lea igual siempre.
export function serializarIdeas(ideas: Idea[]): string {
  if (ideas.length === 0) return '';
  const ordenadas = ideas.map((i) => ({
    id: i.id, fecha: i.fecha, titulo: i.titulo, icono: i.icono, area: i.area, proyecto: i.proyecto, texto: i.texto,
  }));
  return stringify(ordenadas, { lineWidth: 0 });
}

export function nuevoIdIdea(fecha: ISODate, existentes: Idea[]): string {
  const prefijo = `i-${fecha.replace(/-/g, '')}-`;
  let max = 0;
  for (const i of existentes) {
    if (!i.id.startsWith(prefijo)) continue;
    const n = Number(i.id.slice(prefijo.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefijo}${max + 1}`;
}

export function ordenarIdeas(ideas: Idea[]): Idea[] {
  return ideas
    .map((idea, i) => ({ idea, i }))
    .sort((a, b) => b.idea.fecha.localeCompare(a.idea.fecha) || b.i - a.i)
    .map((x) => x.idea);
}

const clave = (fecha: string, texto: string, proyecto: string | undefined) => `${fecha}|${proyecto ?? ''}|${texto}`;

// Paso de bandeja.md a ideas.yaml: añade al final las ideas de la bandeja que aún no estén (misma fecha, proyecto y texto).
export function fusionarBandeja(ideas: Idea[], bandeja: Linea[]): Idea[] {
  const resultado = [...ideas];
  const vistas = new Set(ideas.map((i) => clave(i.fecha, i.texto, i.proyecto)));
  for (const l of bandeja) {
    if (l.tipo !== 'idea') continue;
    const { fecha, texto, proyecto } = l.idea;
    const k = clave(fecha, texto, proyecto);
    if (vistas.has(k)) continue;
    vistas.add(k);
    resultado.push({ id: nuevoIdIdea(fecha, resultado), fecha, ...(proyecto ? { proyecto } : {}), texto });
  }
  return resultado;
}
```
Si la prueba de «caracteres especiales» falla por cómo `yaml` escribe el texto, no cambies la prueba: ajusta las opciones de `stringify` (por ejemplo `blockQuote: 'literal'`). La prueba manda.

Nota sobre `\r\n`: `parseBandeja` ya normaliza los finales de línea, así que ningún texto acaba en `\r` (lo comprueba la prueba de `fusionarBandeja`).

- [ ] **Step 5: Comprueba que pasan**

Run: `npx vitest run src/datos` → PASS. `npm test`, `npm run build`.

- [ ] **Step 6: Registro y commit**
```bash
git add src/datos
git commit -m "Formato de ideas/ideas.yaml y fusión con la bandeja antigua"
```

---

### Task 5: Las ideas pasan a `ideas.yaml` en toda la app

**Files:**
- Modify: `src/agenda/ideas.ts`, `src/agenda/ideas.test.ts` (reescribir), `src/repositorio.ts`, `src/repositorio.test.ts`, `src/estado/cache.ts`, `src/estado/datos.tsx`, `src/pantallas/Ideas.tsx`, `src/componentes/Captura.tsx`, `src/componentes/FormProyectoDesdeIdea.tsx`, `src/pantallas/PaginaProyecto.tsx`, `src/componentes/Lateral.tsx`
- Create: `src/estado/cache.test.ts`

**Interfaces:**
- Consumes: todo lo de la Task 4; `mezclarCambios` (Task 3).
- Produces:
  ```ts
  // src/agenda/ideas.ts
  export class ErrorIdeaCambiada extends Error {}
  export function anadirIdea(ideas: Idea[], nueva: IdeaSinId): Idea[];
  export function editarIdea(ideas: Idea[], original: Idea, editada: IdeaSinId): Idea[];
  export function quitarIdea(ideas: Idea[], id: string): Idea[];
  export function tituloDeIdea(idea: Idea): string;           // título o primera línea
  export function tareaDesdeIdea(idea: Idea): { titulo: string; notas?: string; proyecto?: string; area?: string; icono?: string };
  export function proyectoDesdeIdea(idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate): Proyecto;
  // src/repositorio.ts
  export interface Datos { tareas; areas; proyectos; ideas: Idea[]; asignaturas; errores }
  export type Agenda = Omit<Datos, 'proyectos'> & { bandejaPendiente: boolean };
  export function cargarAgenda(cfg: Config): Promise<Agenda>;
  export function cargarTodo(cfg: Config): Promise<Datos & { bandejaPendiente: boolean }>;
  export function modificarIdeas(cfg: Config, cambio: (is: Idea[]) => Idea[], mensaje: string): Promise<Idea[]>;
  // src/estado/datos.tsx
  cambiarIdeas(cambio: (is: Idea[]) => Idea[], mensaje: string): Promise<boolean>;
  ```
  `modificarBandeja` desaparece.

- [ ] **Step 1: Escribe las pruebas que fallan**

Sustituye `src/agenda/ideas.test.ts` por:
```ts
import { describe, expect, it } from 'vitest';
import type { Idea } from '../datos/ideas';
import { anadirIdea, editarIdea, ErrorIdeaCambiada, proyectoDesdeIdea, quitarIdea, tareaDesdeIdea, tituloDeIdea } from './ideas';

const vieja: Idea = { id: 'i-20260922-1', fecha: '2026-09-22', texto: 'Vieja' };

describe('anadirIdea', () => {
  it('añade al final con id nuevo y conserva las líneas del texto', () => {
    const r = anadirIdea([vieja], { fecha: '2026-09-22', texto: '  Nivel de hielo\r\ncon jefe  ', titulo: '  Hielo ', icono: 'snowflake' });
    expect(r[1]).toEqual({ id: 'i-20260922-2', fecha: '2026-09-22', texto: 'Nivel de hielo\ncon jefe', titulo: 'Hielo', icono: 'snowflake' });
  });
  it('un título vacío no se guarda', () => {
    expect(anadirIdea([], { fecha: '2026-09-25', texto: 'X', titulo: '  ' })[0]).toEqual({ id: 'i-20260925-1', fecha: '2026-09-25', texto: 'X' });
  });
  it('un texto vacío no añade nada', () => {
    const base = [vieja];
    expect(anadirIdea(base, { fecha: '2026-09-25', texto: ' \n ' })).toBe(base);
  });
});

describe('editarIdea', () => {
  it('cambia solo lo que se tocó y respeta lo que cambió otro', () => {
    const remota = { ...vieja, proyecto: 'juego' }; // Claude la vinculó mientras tanto
    const r = editarIdea([remota], vieja, { fecha: vieja.fecha, texto: 'Vieja', titulo: 'Con título' });
    expect(r[0]).toEqual({ ...vieja, proyecto: 'juego', titulo: 'Con título' });
  });
  it('si la idea ya no está, lanza ErrorIdeaCambiada', () => {
    expect(() => editarIdea([], vieja, { fecha: vieja.fecha, texto: 'X' })).toThrow(ErrorIdeaCambiada);
  });
});

describe('quitarIdea', () => {
  it('quita solo la del id, aunque haya otra igual', () => {
    const gemela = { ...vieja, id: 'i-20260922-2' };
    expect(quitarIdea([vieja, gemela], vieja.id)).toEqual([gemela]);
  });
});

describe('título, tarea y proyecto', () => {
  const larga: Idea = { id: 'x', fecha: '2026-09-25', texto: 'Primera línea\nSegunda', proyecto: 'juego', area: 'unreal', icono: 'planet' };
  it('el título visible es el título o la primera línea', () => {
    expect(tituloDeIdea(larga)).toBe('Primera línea');
    expect(tituloDeIdea({ ...larga, titulo: 'Gravedad' })).toBe('Gravedad');
  });
  it('a tarea: título, notas si hay más texto, y proyecto, área e icono', () => {
    expect(tareaDesdeIdea(larga)).toEqual({ titulo: 'Primera línea', notas: 'Primera línea\nSegunda', proyecto: 'juego', area: 'unreal', icono: 'planet' });
    expect(tareaDesdeIdea(vieja)).toEqual({ titulo: 'Vieja' });
  });
  it('a proyecto: el texto va en «Qué es» y lleva el icono', () => {
    const p = proyectoDesdeIdea(larga, 'Juego de gravedad', 'unreal', [], '2026-09-25');
    expect(p).toMatchObject({ id: 'juego-de-gravedad', estado: 'idea', area: 'unreal', icono: 'planet', titulo: 'Juego de gravedad' });
    expect(p.cuerpo).toContain('## Qué es\nPrimera línea\nSegunda\n');
  });
});
```

En `src/repositorio.test.ts`:
- en el `vi.mock`, añade `borrarArchivo: vi.fn()` (se usará en la Task 6);
- cambia el import de `modificarBandeja` por `modificarIdeas`, y los de `agenda/ideas` / `datos/bandeja` según lo que usen las pruebas que quedan;
- en las rutas simuladas, añade `if (ruta === 'ideas/ideas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);` donde haga falta (los `leer.mockImplementation` lanzan `ruta inesperada` si falta);
- borra las pruebas de `modificarBandeja` y añade:
```ts
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
```

`src/estado/cache.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { leerCache } from './cache';

const almacen = new Map<string, string>();
beforeEach(() => {
  almacen.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
});

describe('leerCache', () => {
  it('descarta las ideas guardadas con el formato antiguo de la bandeja', () => {
    almacen.set('sc-datos', JSON.stringify({
      tareas: [], areas: [], proyectos: [], asignaturas: [],
      ideas: [{ tipo: 'otra', texto: '# Bandeja' }, { tipo: 'idea', idea: { fecha: '2026-09-22', texto: 'X' } }, { id: 'i-1', fecha: '2026-09-25', texto: 'Buena' }],
    }));
    expect(leerCache()?.ideas).toEqual([{ id: 'i-1', fecha: '2026-09-25', texto: 'Buena' }]);
  });
  it('las áreas antiguas (sin subareas) se leen con subareas vacías', () => {
    almacen.set('sc-datos', JSON.stringify({ areas: [{ id: 'uni', nombre: 'Uni', color: '#3b82f6' }] }));
    expect(leerCache()?.areas).toEqual([{ id: 'uni', nombre: 'Uni', color: '#3b82f6', subareas: [] }]);
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/agenda/ideas.test.ts src/repositorio.test.ts src/estado/cache.test.ts` → FAIL.

- [ ] **Step 3: Escribe la lógica**

Sustituye `src/agenda/ideas.ts` por:
```ts
import { nuevoIdIdea, type Idea, type IdeaSinId } from '../datos/ideas';
import { idProyectoDesdeTitulo, type Proyecto } from '../datos/proyectos';
import type { ISODate } from '../fechas';
import { mezclarCambios } from './cambios';

export class ErrorIdeaCambiada extends Error {
  constructor() {
    super('Esta idea ha cambiado mientras tanto (quizá la movió Claude). Se han recargado las ideas.');
    this.name = 'ErrorIdeaCambiada';
  }
}

function limpiar(i: IdeaSinId): IdeaSinId {
  const texto = i.texto.replace(/\r\n/g, '\n').trim();
  const titulo = i.titulo?.trim() || undefined;
  const r: Record<string, unknown> = { ...i, texto, titulo };
  for (const k of Object.keys(r)) if (r[k] === undefined || r[k] === '') delete r[k];
  return r as unknown as IdeaSinId;
}

export function anadirIdea(ideas: Idea[], nueva: IdeaSinId): Idea[] {
  const limpia = limpiar(nueva);
  if (!limpia.texto) return ideas;
  return [...ideas, { id: nuevoIdIdea(limpia.fecha, ideas), ...limpia }];
}

export function editarIdea(ideas: Idea[], original: Idea, editada: IdeaSinId): Idea[] {
  const remota = ideas.find((i) => i.id === original.id);
  if (!remota) throw new ErrorIdeaCambiada();
  const limpia = limpiar(editada);
  if (!limpia.texto) return ideas;
  const despues = { titulo: undefined, icono: undefined, area: undefined, proyecto: undefined, ...limpia };
  return ideas.map((i) => (i === remota ? mezclarCambios(remota, original, despues) : i));
}

export function quitarIdea(ideas: Idea[], id: string): Idea[] {
  return ideas.filter((i) => i.id !== id);
}

export function tituloDeIdea(idea: Idea): string {
  return idea.titulo ?? idea.texto.split('\n')[0];
}

export function tareaDesdeIdea(idea: Idea): { titulo: string; notas?: string; proyecto?: string; area?: string; icono?: string } {
  const titulo = tituloDeIdea(idea).slice(0, 120);
  const r: Record<string, string | undefined> = {
    titulo,
    notas: idea.texto !== titulo ? idea.texto : undefined,
    proyecto: idea.proyecto,
    area: idea.area,
    icono: idea.icono,
  };
  for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
  return r as { titulo: string };
}

export function proyectoDesdeIdea(
  idea: Idea, nombre: string, area: string | undefined, existentes: string[], hoy: ISODate,
): Proyecto {
  const titulo = nombre.trim();
  return {
    id: idProyectoDesdeTitulo(titulo, existentes),
    estado: 'idea',
    area,
    icono: idea.icono,
    titulo,
    cuerpo: `# ${titulo}\n\n## Qué es\n${idea.texto}\n\n## Dónde lo dejamos\n${hoy}: creado desde las ideas.\n`,
    meta: {},
  };
}
```
Nota: en `editarIdea`, `despues` pone a `undefined` los campos opcionales que el formulario ha vaciado, para que `mezclarCambios` los borre si antes tenían valor.

- [ ] **Step 4: Repositorio y caché**

En `src/repositorio.ts`:
- imports: `parseBandeja` desde `./datos/bandeja`; `fusionarBandeja, parseIdeas, serializarIdeas, type Idea` desde `./datos/ideas`; `RUTA_IDEAS` desde `./datos/rutas`. Quita `mismoFinDeLinea` y `serializarBandeja` si ya no se usan.
- `Datos.ideas: Idea[]`.
- `cargarAgenda`:
```ts
export type Agenda = Omit<Datos, 'proyectos'> & { bandejaPendiente: boolean };

export async function cargarAgenda(cfg: Config): Promise<Agenda> {
  const errores: ErrorDatos[] = [];
  const [textoTareas, textoAreas, textoIdeas, textoBandeja, textoAsignaturas] = await Promise.all([
    leerOpcional(cfg, RUTA_TAREAS),
    leerOpcional(cfg, RUTA_AREAS),
    leerOpcional(cfg, RUTA_IDEAS),
    leerOpcional(cfg, RUTA_BANDEJA),
    leerOpcional(cfg, RUTA_ASIGNATURAS),
  ]);
  const tareas = intentar(errores, () => (textoTareas === null ? [] : parseTareas(textoTareas)), []);
  const areas = intentar(errores, () => (textoAreas === null ? [] : parseAreas(textoAreas)), []);
  // null = ideas.yaml está roto: se aparta con su error y no se intenta el paso de la bandeja.
  const guardadas = intentar<Idea[] | null>(errores, () => (textoIdeas === null ? [] : parseIdeas(textoIdeas)), null);
  // Mientras la bandeja antigua exista, sus ideas se enseñan junto a las de ideas.yaml (el paso se hace después).
  const ideas = textoBandeja === null ? (guardadas ?? []) : fusionarBandeja(guardadas ?? [], parseBandeja(textoBandeja));
  const asignaturas = intentar(errores, () => (textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas)), []);
  return { tareas, areas, ideas, asignaturas, errores, bandejaPendiente: textoBandeja !== null && guardadas !== null };
}
```
- `cargarTodo` devuelve también `bandejaPendiente` (sácalo del resultado de `cargarAgenda` y añádelo al objeto final).
- Sustituye `modificarBandeja` por:
```ts
export async function modificarIdeas(cfg: Config, cambio: (is: Idea[]) => Idea[], mensaje: string): Promise<Idea[]> {
  let resultado: Idea[] = [];
  await actualizarArchivo(cfg, RUTA_IDEAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseIdeas(texto));
    return serializarIdeas(resultado);
  }, mensaje);
  return resultado;
}
```

En `src/estado/cache.ts`, `leerCache` queda:
```ts
export function leerCache(): DatosCache | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<DatosCache> | null;
    if (!c) return null;
    // Una caché antigua puede no tener ideas ni asignaturas, tener ideas con el formato de la bandeja o áreas sin subáreas.
    const ideas = (c.ideas ?? []).filter((i) => typeof i?.id === 'string' && typeof i?.texto === 'string');
    const areas = (c.areas ?? []).map((a) => ({ ...a, subareas: a.subareas ?? [] }));
    return { tareas: c.tareas ?? [], areas, proyectos: c.proyectos ?? [], ideas, asignaturas: c.asignaturas ?? [] };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Estado y pantallas (sin diseño nuevo todavía)**

En `src/estado/datos.tsx`:
- `import type { Idea } from '../datos/ideas';` en vez de `Linea`; `modificarIdeas` en vez de `modificarBandeja`; `RUTA_IDEAS` en los imports de rutas.
- `cambiarIdeas(cambio: (is: Idea[]) => Idea[], mensaje: string)`: igual que ahora, pero llama a `modificarIdeas` y limpia los errores de `RUTA_IDEAS`: `setDatos((d) => ({ ...d, ideas, errores: d.errores.filter((x) => x.archivo !== RUTA_IDEAS) }))`.
- `recargar`: `const { bandejaPendiente, ...d } = await cargarTodo(config); setDatos(d);` (guarda `bandejaPendiente` en una variable; la usa la Task 6).
- `traerAgenda`: igual, descartando `bandejaPendiente` por ahora, y filtrando también los errores de `RUTA_IDEAS`.
- Añade `ideasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_IDEAS)` a `ValorDatos` (como `tareasBloqueadas`).

Adapta los que usaban la bandeja (sin cambiar cómo se ven):
- `src/pantallas/Ideas.tsx`: `const ideas = ordenarIdeas(datos.ideas);`; el candado usa ids (`ocupadas: string[]`, `ocupada = (idea) => ocupadas.includes(idea.id)`); `apuntar` → `anadirIdea(is, { fecha: hoy, texto: limpio })`; `vincular` → `cambiarIdeas((is) => editarIdea(is, idea, { ...idea, proyecto: proyecto || undefined }), …)` (quita `id` del objeto: `const { id: _, ...resto } = idea;`); `aTarea` → `editar({ nueva: tareaDesdeIdea(idea), nota: 'Al guardar la tarea, la idea sale de tus ideas.', alGuardar: () => conCandado(idea, () => cambiarIdeas((is) => quitarIdea(is, idea.id), …)) })`; `borrar` → `quitarIdea(is, idea.id)`; el texto visible es `tituloDeIdea(idea)`; la `key` es `idea.id`. Todos los botones se desactivan también con `ideasBloqueadas`.
- `src/componentes/FormTarea.tsx`: `Edicion.nueva` admite también `area?: string; icono?: string; notas?: string;` y el formulario los usa como valor de partida (`area` → `useState(original?.area ?? nueva.area ?? datos.areas[0]?.id ?? 'personal')`, igual con `notas`; el icono lo usará la Task 10: guárdalo ya en `const [icono] = useState(original?.icono ?? nueva.icono)` y ponlo en `tarea`).
- `src/componentes/Captura.tsx`: `anadirIdea(is, { fecha: hoy, texto: limpio })`.
- `src/componentes/FormProyectoDesdeIdea.tsx`: el nombre de partida es `tituloDeIdea(idea).slice(0, 60).trim()`; el área de partida `idea.area ?? (área del proyecto vinculado) ?? ''`; quitar la idea con `quitarIdea(is, idea.id)`; la nota muestra `«{tituloDeIdea(idea)}»`.
- `src/pantallas/PaginaProyecto.tsx`: `ordenarIdeas(datos.ideas).filter(...)`, `key={i.id}` y texto `tituloDeIdea(i)`.
- `src/componentes/Lateral.tsx`: `ideas: datos.ideas.length`.

- [ ] **Step 6: Comprueba que todo pasa**

Run: `npm test` y `npm run build` → verde. Si alguna prueba antigua de `repositorio.test.ts` falla solo porque no simula `ideas/ideas.yaml`, añádele esa ruta (ver Step 1).

- [ ] **Step 7: Registro y commit**
```bash
git add -A src
git commit -m "Las ideas se guardan en ideas/ideas.yaml, con id; la caché antigua no rompe nada"
```

---

### Task 6: Paso automático de `bandeja.md` a `ideas.yaml`

**Files:**
- Modify: `src/github/cliente.ts`, `src/repositorio.ts`, `src/repositorio.test.ts`, `src/estado/datos.tsx`
- Test: `src/github/cliente.test.ts` (si no existe, créalo)

**Interfaces:**
- Produces:
  ```ts
  export async function borrarArchivo(cfg: Config, ruta: string, sha: string, mensaje: string): Promise<void>; // cliente.ts
  export async function migrarBandeja(cfg: Config): Promise<Idea[] | null>; // repositorio.ts; null = no había bandeja
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

En `src/github/cliente.test.ts` (si el archivo ya existe, sigue su forma de simular `fetch`):
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { borrarArchivo, ErrorGitHub } from './cliente';

const cfg = { owner: 'diego', repo: 'my-context', token: 'x' };
afterEach(() => vi.unstubAllGlobals());

describe('borrarArchivo', () => {
  it('manda DELETE con el sha y el mensaje', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await borrarArchivo(cfg, 'ideas/bandeja.md', 'abc', 'Borrar bandeja');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/diego/my-context/contents/ideas/bandeja.md');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Borrar bandeja', sha: 'abc' });
  });
  it('si el archivo cambió, es un conflicto', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 409 })));
    await expect(borrarArchivo(cfg, 'ideas/bandeja.md', 'viejo', 'x')).rejects.toMatchObject({ tipo: 'conflicto' });
    expect(ErrorGitHub).toBeDefined();
  });
});
```

En `src/repositorio.test.ts` (importa `migrarBandeja` y usa `const borrar = vi.mocked(cliente.borrarArchivo);`):
```ts
describe('migrarBandeja', () => {
  it('sin bandeja no hace nada', async () => {
    leer.mockRejectedValue(new cliente.ErrorGitHub('no-existe', 'no', 404));
    expect(await migrarBandeja(cfg)).toBeNull();
    expect(actualizar).not.toHaveBeenCalled();
  });
  it('primero escribe ideas.yaml con todo y después borra la bandeja con su sha', async () => {
    leer.mockResolvedValue({ texto: '# Bandeja\n- 2026-09-22 [juego]: Vieja\n', sha: 'b1' });
    const orden: string[] = [];
    actualizar.mockImplementation(async (_c, ruta, t) => {
      orden.push(`escribir ${ruta}`);
      return t('- id: i-20260925-1\n  fecha: 2026-09-25\n  texto: Nueva\n');
    });
    borrar.mockImplementation(async (_c, ruta, sha) => void orden.push(`borrar ${ruta} ${sha}`));
    const r = await migrarBandeja(cfg);
    expect(r?.map((i) => i.texto)).toEqual(['Nueva', 'Vieja']);
    expect(orden).toEqual(['escribir ideas/ideas.yaml', 'borrar ideas/bandeja.md b1']);
  });
  it('si el borrado falla, ideas.yaml ya tiene las ideas (la próxima vez se fusiona sin duplicar)', async () => {
    leer.mockResolvedValue({ texto: '- 2026-09-22: Vieja\n', sha: 'b1' });
    const escrito = simularRemoto(null);
    borrar.mockRejectedValue(new cliente.ErrorGitHub('conflicto', 'cambió', 409));
    await expect(migrarBandeja(cfg)).rejects.toMatchObject({ tipo: 'conflicto' });
    expect(escrito()).toContain('texto: Vieja');
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/github src/repositorio.test.ts` → FAIL.

- [ ] **Step 3: Escribe el código**

En `src/github/cliente.ts`:
```ts
export async function borrarArchivo(cfg: Config, ruta: string, sha: string, mensaje: string): Promise<void> {
  await peticion(cfg, ruta, { method: 'DELETE', body: JSON.stringify({ message: mensaje, sha }) });
}
```

En `src/repositorio.ts` (importa `borrarArchivo`):
```ts
// Paso de la bandeja antigua: primero se escriben todas sus ideas en ideas.yaml y después se borra bandeja.md.
// Si el borrado falla (p. ej. Claude acaba de escribir en la bandeja), la próxima carga vuelve a fusionar sin duplicar.
export async function migrarBandeja(cfg: Config): Promise<Idea[] | null> {
  let bandeja;
  try {
    bandeja = await leerArchivo(cfg, RUTA_BANDEJA);
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return null;
    throw e;
  }
  const lineas = parseBandeja(bandeja.texto);
  const ideas = await modificarIdeas(cfg, (is) => fusionarBandeja(is, lineas), 'Pasar las ideas de bandeja.md a ideas.yaml');
  await borrarArchivo(cfg, RUTA_BANDEJA, bandeja.sha, 'Borrar bandeja.md (las ideas ya están en ideas.yaml)');
  return ideas;
}
```

En `src/estado/datos.tsx`, añade una función que se encola tras cargar:
```ts
  // Si aún existe la bandeja antigua, se pasa a ideas.yaml por detrás. Si falla, se reintenta en la próxima carga.
  const pasarBandeja = useCallback(
    (cfg: Config) =>
      encolar(async () => {
        try {
          const ideas = await migrarBandeja(cfg);
          if (ideas) setDatos((d) => ({ ...d, ideas }));
        } catch {
          // sin conexión, conflicto o archivo roto: se deja para la próxima vez, sin molestar
        }
      }),
    [encolar],
  );
```
y llámala (`void pasarBandeja(config)`) en `recargar` y en `traerAgenda` cuando `bandejaPendiente` sea `true`. Declara `pasarBandeja` antes que `recargar` y añádelo a sus dependencias.

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Paso automático de bandeja.md a ideas.yaml, seguro si algo falla a mitad"
```

---

### Task 7: Guardar y borrar áreas (repositorio y estado)

**Files:**
- Modify: `src/repositorio.ts`, `src/repositorio.test.ts`, `src/estado/datos.tsx`

**Interfaces:**
- Consumes: `serializarAreas`, `parseAreas` (Task 1); `idsDeArea`, `moverDeArea`, `quitarArea`, `destinosPosibles`, `ErrorArea` (Task 2); `modificarTareas`, `modificarIdeas`.
- Produces:
  ```ts
  // repositorio.ts
  export function modificarAreas(cfg: Config, cambio: (as: Area[]) => Area[], mensaje: string): Promise<Area[]>;
  export function cambiarAreaDeProyecto(cfg: Config, id: string, ids: string[], destino: string): Promise<Proyecto | null>;
  export function moverYBorrarArea(cfg: Config, id: string, destino: string, proyectos: string[]): Promise<{ areas: Area[]; tareas: Tarea[]; ideas: Idea[]; proyectos: Proyecto[] }>;
  // datos.tsx (ValorDatos)
  cambiarAreas(cambio: (as: Area[]) => Area[], mensaje: string): Promise<boolean>;
  borrarArea(id: string, destino: string | null): Promise<boolean>; // null = no hay nada dentro que mover
  areasBloqueadas: boolean;
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

En `src/repositorio.test.ts` (importa `modificarAreas`, `moverYBorrarArea`):
```ts
describe('áreas', () => {
  const AREAS = '- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: videojuegos\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: blender\n      nombre: Blender\n      color: "#a855f7"\n';

  it('modificarAreas escribe areas.yaml con el cambio', async () => {
    const escrito = simularRemoto(AREAS);
    await modificarAreas(cfg, (as) => as.filter((a) => a.id !== 'uni'), 'Borrar área');
    expect(escrito()).not.toContain('id: uni');
    expect(escrito()).toContain('subareas:');
  });

  it('moverYBorrarArea mueve tareas, ideas y proyectos y deja areas.yaml para el final', async () => {
    const remoto: Record<string, string> = {
      'agenda/tareas.yaml': '- id: t1\n  titulo: Modelar\n  area: blender\n- id: t2\n  titulo: Estudiar\n  area: uni\n',
      'ideas/ideas.yaml': '- id: i1\n  fecha: 2026-09-25\n  area: videojuegos\n  texto: Juego\n',
      'proyectos/nave.md': '---\nestado: activo\narea: blender\n---\n# Nave\n',
      'agenda/areas.yaml': AREAS,
    };
    const orden: string[] = [];
    leer.mockResolvedValue({ texto: AREAS, sha: 'a' });
    actualizar.mockImplementation(async (_c, ruta, t) => {
      orden.push(ruta);
      remoto[ruta] = t(remoto[ruta] ?? null);
      return remoto[ruta];
    });
    const r = await moverYBorrarArea(cfg, 'videojuegos', 'uni', ['nave']);
    expect(orden).toEqual(['agenda/tareas.yaml', 'ideas/ideas.yaml', 'proyectos/nave.md', 'agenda/areas.yaml']);
    expect(remoto['agenda/tareas.yaml']).not.toContain('blender');
    expect(remoto['ideas/ideas.yaml']).toContain('area: uni');
    expect(remoto['proyectos/nave.md']).toContain('area: uni');
    expect(r.areas.map((a) => a.id)).toEqual(['uni']);
  });

  it('un destino que se va a borrar no toca nada', async () => {
    leer.mockResolvedValue({ texto: AREAS, sha: 'a' });
    const escrito = simularRemoto(AREAS);
    await expect(moverYBorrarArea(cfg, 'videojuegos', 'blender', [])).rejects.toThrow(/destino/);
    expect(escrito()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/repositorio.test.ts` → FAIL.

- [ ] **Step 3: Escribe el código**

En `src/repositorio.ts` (imports: `serializarAreas`, `type Area`; `idsDeArea, moverDeArea, quitarArea, ErrorArea` de `./agenda/areas`):
```ts
export async function modificarAreas(cfg: Config, cambio: (as: Area[]) => Area[], mensaje: string): Promise<Area[]> {
  let resultado: Area[] = [];
  await actualizarArchivo(cfg, RUTA_AREAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseAreas(texto));
    return serializarAreas(resultado);
  }, mensaje);
  return resultado;
}

export async function cambiarAreaDeProyecto(cfg: Config, id: string, ids: string[], destino: string): Promise<Proyecto | null> {
  let resultado: Proyecto | null = null;
  await actualizarArchivo(cfg, `${CARPETA_PROYECTOS}/${id}.md`, (texto) => {
    if (texto === null) throw new ErrorGitHub('no-existe', `No existe el proyecto ${id}`);
    const p = parseProyecto(id, texto);
    resultado = p.area && ids.includes(p.area) ? { ...p, area: destino } : p;
    return serializarProyecto(resultado);
  }, `Mover proyecto ${id} al área ${destino}`);
  return resultado;
}

// Borrar un área: primero todo lo de dentro va al destino y al final se quita de areas.yaml.
// Si algo falla a mitad, el área sigue existiendo y se puede volver a intentar.
export async function moverYBorrarArea(
  cfg: Config, id: string, destino: string, proyectos: string[],
): Promise<{ areas: Area[]; tareas: Tarea[]; ideas: Idea[]; proyectos: Proyecto[] }> {
  const actuales = parseAreas((await leerOpcional(cfg, RUTA_AREAS)) ?? '');
  const ids = idsDeArea(actuales, id);
  if (ids.length === 0) throw new ErrorArea('Esta área ya no existe (quizá la borró Claude u otro dispositivo).');
  if (ids.includes(destino) || !idsDeArea(actuales, destino).length)
    throw new ErrorArea('El destino no es válido: elige otra área que no sea la que se borra ni una de sus subáreas.');
  const tareas = await modificarTareas(cfg, (ts) => moverDeArea(ts, ids, destino), `Mover tareas al área ${destino}`);
  const ideas = await modificarIdeas(cfg, (is) => moverDeArea(is, ids, destino), `Mover ideas al área ${destino}`);
  const movidos: Proyecto[] = [];
  for (const p of proyectos) {
    const r = await cambiarAreaDeProyecto(cfg, p, ids, destino);
    if (r) movidos.push(r);
  }
  const areas = await modificarAreas(cfg, (as) => quitarArea(as, id), `Borrar área ${id}`);
  return { areas, tareas, ideas, proyectos: movidos };
}
```
Nota: `moverYBorrarArea` lee `areas.yaml` con `leerOpcional`, que usa `leerArchivo` (por eso las pruebas simulan `leer`).

En `src/estado/datos.tsx`:
```ts
  const cambiarAreas = useCallback(
    (cambio: (as: Area[]) => Area[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const areas = await modificarAreas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, areas, errores: d.errores.filter((x) => x.archivo !== RUTA_AREAS) }));
          return true;
        } catch (e) {
          alFallar(e, false);
          if (e instanceof ErrorArea) await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda],
  );

  const borrarArea = useCallback(
    (id: string, destino: string | null) =>
      encolar(async () => {
        if (!config) return false;
        try {
          if (destino === null) {
            const areas = await modificarAreas(config, (as) => quitarArea(as, id), `Borrar área ${id}`);
            setDatos((d) => ({ ...d, areas }));
            return true;
          }
          const ids = idsDeArea(datos.areas, id);
          const afectados = datos.proyectos.filter((p) => p.area && ids.includes(p.area)).map((p) => p.id);
          const r = await moverYBorrarArea(config, id, destino, afectados);
          setDatos((d) => ({
            ...d,
            areas: r.areas,
            tareas: r.tareas,
            ideas: r.ideas,
            proyectos: d.proyectos.map((p) => r.proyectos.find((x) => x.id === p.id) ?? p),
          }));
          return true;
        } catch (e) {
          alFallar(e, false);
          await traerAgenda(config).catch(() => undefined);
          return false;
        }
      }),
    [config, alFallar, encolar, traerAgenda, datos.areas, datos.proyectos],
  );
```
Añade `cambiarAreas`, `borrarArea` y `areasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_AREAS)` a `ValorDatos` y a `valor` (con sus dependencias).

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Guardar áreas y borrarlas moviendo antes todo lo de dentro"
```

---

### Task 8: Iconos (colección, diccionario y componente `Icono`)

**Files:**
- Create: `scripts/iconos.ts`, `src/iconos/diccionario.ts`, `src/iconos/diccionario.test.ts`, `src/iconos/basicos.ts` (generado), `src/iconos/coleccion.ts`, `src/iconos/coleccion.test.ts`, `src/componentes/Icono.tsx`, `src/componentes/Icono.test.tsx`
- Modify: `package.json`, `.gitignore`, `vite.config.ts`, `src/estilos.css`

**Interfaces:**
- Produces:
  ```ts
  // src/iconos/diccionario.ts
  export type Nodo = [string, Record<string, string>];
  export const DICCIONARIO: { icono: string; palabras: string[] }[];
  export function normalizar(texto: string): string;               // minúsculas, sin tildes
  export function iconoPara(titulo: string): string | undefined;
  export function iconoAlEscribir(titulo: string, actual: string | undefined, fijado: boolean): string | undefined;
  // src/iconos/basicos.ts (generado)
  export const BASICOS: Record<string, Nodo[]>;
  // src/iconos/coleccion.ts
  export interface Coleccion { nodos: Record<string, Nodo[]>; etiquetas: Record<string, string[]> }
  export function cargarColeccion(): Promise<Coleccion>;           // una sola descarga
  export function coleccionCargada(): Coleccion | null;
  export function buscarIconos(consulta: string, coleccion: Coleccion | null, limite?: number): string[];
  // src/componentes/Icono.tsx
  export function Icono(props: { nombre?: string; tamano?: number; className?: string }): JSX.Element | null;
  ```

- [ ] **Step 1: Dependencia y script generador**

```bash
npm install --save-dev --save-exact @tabler/icons@3.48.0
```

`scripts/iconos.ts` (se ejecuta con `node scripts/iconos.ts`, sin compilar, como `local/`):
```ts
// Genera los iconos de Tabler que usa la app:
// - public/iconos/tabler.json: la colección completa (no se sube; se genera antes de dev y build).
// - src/iconos/basicos.ts: solo los del diccionario, que van dentro de la app (sí se sube).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DICCIONARIO } from '../src/iconos/diccionario.ts';

const base = new URL('../node_modules/@tabler/icons/', import.meta.url);
const nodos = JSON.parse(readFileSync(new URL('tabler-nodes-outline.json', base), 'utf8')) as Record<string, [string, Record<string, string>][]>;
const info = JSON.parse(readFileSync(new URL('icons.json', base), 'utf8')) as Record<string, { tags?: unknown[]; styles?: { outline?: unknown } }>;

// Solo lo que hace falta para dibujar: se quitan atributos como "key".
const limpio = (ns: [string, Record<string, string>][]) =>
  ns.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key'))]);

const coleccion: Record<string, { n: unknown; t: string[] }> = {};
for (const [nombre, ns] of Object.entries(nodos)) {
  coleccion[nombre] = { n: limpio(ns), t: (info[nombre]?.tags ?? []).map(String) };
}
mkdirSync(new URL('../public/iconos/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/iconos/tabler.json', import.meta.url), JSON.stringify(coleccion));

const usados = [...new Set(DICCIONARIO.map((e) => e.icono))].sort();
const faltan = usados.filter((n) => !nodos[n]);
if (faltan.length) throw new Error(`Estos iconos del diccionario no existen en Tabler: ${faltan.join(', ')}`);
const basicos = Object.fromEntries(usados.map((n) => [n, limpio(nodos[n])]));
writeFileSync(
  new URL('../src/iconos/basicos.ts', import.meta.url),
  `// Generado por scripts/iconos.ts: no lo edites a mano.\nimport type { Nodo } from './diccionario';\n\nexport const BASICOS: Record<string, Nodo[]> = ${JSON.stringify(basicos, null, 1)};\n`,
);
console.log(`Iconos: ${Object.keys(coleccion).length} en la colección, ${usados.length} básicos.`);
```

En `package.json`, `scripts`:
```json
    "iconos": "node scripts/iconos.ts",
    "predev": "node scripts/iconos.ts",
    "prebuild": "node scripts/iconos.ts",
    "local": "node scripts/iconos.ts && vite build && node local/principal.ts",
```
En `.gitignore` añade `public/iconos/`.

En `vite.config.ts`, dentro de `workbox`:
```ts
      workbox: {
        navigateFallbackDenylist: [/\/api\//],
        // La colección de iconos se descarga la primera vez que hace falta y se guarda para usarla sin conexión.
        runtimeCaching: [{ urlPattern: /\/iconos\/tabler\.json$/, handler: 'CacheFirst', options: { cacheName: 'iconos' } }],
      },
```

- [ ] **Step 2: Escribe las pruebas que fallan**

`src/iconos/diccionario.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BASICOS } from './basicos';
import { DICCIONARIO, iconoAlEscribir, iconoPara, normalizar } from './diccionario';

describe('iconoPara', () => {
  it('encuentra el icono por una palabra del título', () => {
    expect(iconoPara('Examen de física')).toBe('file-pencil');
    expect(iconoPara('Modelar la nave en Blender')).toBe('brand-blender');
    expect(iconoPara('Tocar el piano')).toBe('piano');
    expect(iconoPara('Ir al gym')).toBe('barbell');
    expect(iconoPara('Prototipo en Unity')).toBe('brand-unity');
  });
  it('las palabras cortas (3 letras o menos) tienen que ser exactas', () => {
    expect(iconoPara('Tarea de la uni')).toBe('school');
    expect(iconoPara('Unir las piezas')).toBeUndefined(); // «unir» no es «uni»
  });
  it('da igual mayúsculas, tildes y plurales', () => {
    expect(iconoPara('EXÁMENES de FÍSICA')).toBe('file-pencil');
    expect(normalizar('Música ÁRBOL')).toBe('musica arbol');
  });
  it('no confunde palabras que solo contienen otra', () => {
    expect(iconoPara('Sacar al perro')).toBeUndefined(); // «sacar» no es «car»
  });
  it('sin palabras conocidas no pone nada', () => {
    expect(iconoPara('Cosas varias')).toBeUndefined();
    expect(iconoPara('')).toBeUndefined();
  });
  it('todos los iconos del diccionario están en los básicos', () => {
    for (const e of DICCIONARIO) expect(BASICOS[e.icono], e.icono).toBeDefined();
  });
});

describe('iconoAlEscribir', () => {
  it('sigue al título mientras no se haya elegido a mano', () => {
    expect(iconoAlEscribir('Examen', undefined, false)).toBe('file-pencil');
    expect(iconoAlEscribir('Cosas', 'file-pencil', false)).toBeUndefined();
  });
  it('si se eligió (o quitó) a mano, no cambia', () => {
    expect(iconoAlEscribir('Examen', 'cube', true)).toBe('cube');
    expect(iconoAlEscribir('Examen', undefined, true)).toBeUndefined();
  });
});
```

`src/iconos/coleccion.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buscarIconos, type Coleccion } from './coleccion';

const COLECCION: Coleccion = {
  nodos: { 'music': [], 'music-off': [], 'piano': [], 'cube': [], 'box': [] },
  etiquetas: { 'music': ['sound'], 'music-off': ['sound'], 'piano': ['instrument'], 'cube': ['3d'], 'box': ['cube', 'package'] },
};

describe('buscarIconos', () => {
  it('busca en español con el diccionario (salen primero)', () => {
    expect(buscarIconos('música', COLECCION).slice(0, 2)).toEqual(['music', 'piano']);
  });
  it('busca en inglés por nombre y por etiquetas', () => {
    expect(buscarIconos('cube', COLECCION)).toEqual(['cube', 'box']);
    expect(buscarIconos('instrument', COLECCION)).toContain('piano');
  });
  it('sin colección busca solo en el diccionario', () => {
    expect(buscarIconos('piano', null)).toEqual(['piano']);
  });
  it('vacío → los del diccionario', () => {
    expect(buscarIconos('', null).length).toBeGreaterThan(10);
  });
  it('respeta el límite', () => {
    expect(buscarIconos('', COLECCION, 3)).toHaveLength(3);
  });
});
```
(En el diccionario, `music` va antes que `piano` y los dos tienen la palabra `musica`: por eso salen en ese orden.)

`src/componentes/Icono.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icono } from './Icono';

describe('Icono', () => {
  it('dibuja un icono básico como SVG del color del texto', () => {
    const html = renderToString(<Icono nombre="piano" />);
    expect(html).toMatch(/^<svg[^>]*class="icono-tabler"/);
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('<path');
  });
  it('sin nombre, o con un nombre que no existe, no dibuja nada', () => {
    expect(renderToString(<Icono />)).toBe('');
    expect(renderToString(<Icono nombre="no-existe-de-verdad" />)).toBe('');
  });
});
```

- [ ] **Step 3: Comprueba que fallan**

Run: `npx vitest run src/iconos src/componentes/Icono.test.tsx` → FAIL.

- [ ] **Step 4: Escribe el diccionario**

`src/iconos/diccionario.ts` (todos estos nombres existen en Tabler 3.48; el script falla si alguno no existe):
```ts
// Palabras → icono de Tabler. Se compara por principio de palabra, sin tildes ni mayúsculas:
// «exámenes» encaja con «examen». El primero que encaje gana, así que lo más concreto va antes.
export type Nodo = [string, Record<string, string>];

export const DICCIONARIO: { icono: string; palabras: string[] }[] = [
  // Marcas primero: son lo más concreto.
  { icono: 'brand-blender', palabras: ['blender'] },
  { icono: 'brand-unity', palabras: ['unity'] },
  // Uni
  { icono: 'file-pencil', palabras: ['examen', 'parcial', 'test', 'recuperacion'] },
  { icono: 'clipboard-text', palabras: ['practica', 'entrega', 'trabajo', 'memoria', 'informe'] },
  { icono: 'school', palabras: ['clase', 'uni', 'universidad', 'tutoria', 'asignatura', 'carrera'] },
  { icono: 'math-function', palabras: ['mates', 'matematicas', 'calculo', 'algebra', 'integral', 'derivada'] },
  { icono: 'atom', palabras: ['fisica', 'quimica', 'newton'] },
  { icono: 'code', palabras: ['programacion', 'programar', 'codigo', 'python', 'java', 'c++', 'git', 'app'] },
  { icono: 'robot', palabras: ['robot', 'robotica', 'ros', 'arduino'] },
  { icono: 'cpu', palabras: ['electronica', 'circuito', 'hardware'] },
  { icono: 'books', palabras: ['estudiar', 'repasar', 'apuntes', 'temario', 'libro', 'leer'] },
  { icono: 'language', palabras: ['ingles', 'idioma', 'english'] },
  // Videojuegos y 3D
  { icono: 'device-gamepad-2', palabras: ['juego', 'videojuego', 'unreal', 'roblox', 'gamejam', 'jam', 'jugar', 'game'] },
  { icono: 'cube', palabras: ['3d', 'modelar', 'modelado', 'retopologia', 'render', 'escultura', 'malla'] },
  { icono: 'sword', palabras: ['combate', 'enemigo', 'jefe', 'arma', 'rpg'] },
  { icono: 'map-pin', palabras: ['nivel', 'mapa', 'escenario', 'mundo'] },
  { icono: 'ghost', palabras: ['personaje', 'npc', 'criatura'] },
  // Arte, música, vídeo
  { icono: 'movie', palabras: ['animacion', 'animar', 'video', 'pelicula', 'corto'] },
  { icono: 'brush', palabras: ['dibujo', 'dibujar', 'pintar', 'ilustracion', 'arte', 'boceto', 'sketch'] },
  { icono: 'palette', palabras: ['color', 'diseno', 'textura'] },
  { icono: 'music', palabras: ['musica', 'cancion', 'componer', 'composicion', 'melodia', 'banda'] },
  { icono: 'piano', palabras: ['piano', 'teclado', 'musica'] },
  { icono: 'headphones', palabras: ['escuchar', 'podcast', 'sonido', 'audio'] },
  { icono: 'writing', palabras: ['escribir', 'historia', 'guion', 'relato', 'lore'] },
  { icono: 'camera', palabras: ['foto', 'fotografia'] },
  // Salud y deporte
  { icono: 'barbell', palabras: ['gym', 'gimnasio', 'pesas', 'entrenar', 'entreno', 'musculacion'] },
  { icono: 'run', palabras: ['correr', 'running'] },
  { icono: 'bike', palabras: ['bici', 'bicicleta', 'ciclismo'] },
  { icono: 'swimming', palabras: ['nadar', 'natacion', 'piscina'] },
  { icono: 'ball-football', palabras: ['futbol', 'partido'] },
  { icono: 'yoga', palabras: ['yoga', 'estirar', 'meditar'] },
  { icono: 'stethoscope', palabras: ['medico', 'doctor', 'cita', 'dentista', 'revision'] },
  { icono: 'pill', palabras: ['pastilla', 'medicina', 'farmacia'] },
  // Vida diaria
  { icono: 'shopping-cart', palabras: ['compra', 'comprar', 'super', 'mercado'] },
  { icono: 'cake', palabras: ['cumple', 'cumpleanos', 'fiesta'] },
  { icono: 'gift', palabras: ['regalo'] },
  { icono: 'plane', palabras: ['viaje', 'viajar', 'vuelo', 'vacaciones'] },
  { icono: 'train', palabras: ['tren', 'cercanias'] },
  { icono: 'bus', palabras: ['bus', 'autobus'] },
  { icono: 'car', palabras: ['coche', 'carnet', 'conducir'] },
  { icono: 'home', palabras: ['casa', 'limpiar', 'ordenar', 'habitacion'] },
  { icono: 'users', palabras: ['amigos', 'quedar', 'familia', 'reunion'] },
  { icono: 'heart', palabras: ['pareja', 'amor', 'san valentin'] },
  { icono: 'briefcase', palabras: ['curro', 'empleo', 'entrevista', 'cv', 'portfolio'] },
  { icono: 'calculator', palabras: ['dinero', 'pagar', 'factura', 'ahorro', 'presupuesto'] },
  { icono: 'message', palabras: ['llamar', 'mensaje', 'email', 'correo', 'escribirle'] },
  { icono: 'alarm', palabras: ['recordar', 'recordatorio', 'despertar'] },
  { icono: 'bulb', palabras: ['idea', 'ideas', 'inventar'] },
  { icono: 'tools', palabras: ['arreglar', 'reparar', 'montar', 'configurar', 'instalar'] },
];

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function palabrasDe(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9+ñ]+/).filter(Boolean);
}

// ¿La palabra del título es la clave o una forma cercana (plural, «-ar»…)? Las claves cortas tienen que ser exactas.
function encaja(palabra: string, clave: string): boolean {
  if (clave.length <= 3) return palabra === clave || palabra === `${clave}s`;
  return palabra.startsWith(clave) && palabra.length - clave.length <= 3;
}

export function iconoPara(titulo: string): string | undefined {
  const palabras = palabrasDe(titulo);
  if (!palabras.length) return undefined;
  const seguidas = ` ${palabras.join(' ')} `;
  for (const e of DICCIONARIO)
    if (e.palabras.some((clave) => {
      const partes = palabrasDe(clave);
      // Una clave de varias palabras («san valentin») tiene que aparecer seguida.
      if (partes.length > 1) return seguidas.includes(` ${partes.join(' ')} `);
      return palabras.some((p) => encaja(p, partes[0]));
    }))
      return e.icono;
  return undefined;
}

// Mientras se escribe el título, el icono lo pone el diccionario; si Diego lo eligió (o quitó) a mano, se queda.
export function iconoAlEscribir(titulo: string, actual: string | undefined, fijado: boolean): string | undefined {
  return fijado ? actual : iconoPara(titulo);
}
```
La regla de `encaja` deja pasar plurales y formas cercanas («exámenes», «practicas», «modelado»). Las claves de 3 letras o menos («uni», «gym», «3d») tienen que ser exactas, para que «unir» o «unity» no encajen con «uni». Si falla una prueba de palabras, ajusta la regla o el orden del diccionario, no la prueba.

- [ ] **Step 5: Genera los básicos y escribe la colección y el componente**

Run: `npm run iconos` → crea `public/iconos/tabler.json` y `src/iconos/basicos.ts`. Anota en el registro el tamaño de `public/iconos/tabler.json` y lo que pesa comprimido (`gzip -c public/iconos/tabler.json | wc -c`). Si pasa de ~600 KB comprimido, apúntalo como `Ruling:` y avisa en el informe de la tarea (spec §4.1).

`src/iconos/coleccion.ts`:
```ts
import { BASICOS } from './basicos';
import { DICCIONARIO, normalizar, type Nodo } from './diccionario';

export interface Coleccion {
  nodos: Record<string, Nodo[]>;
  etiquetas: Record<string, string[]>;
}

let cargada: Coleccion | null = null;
let pendiente: Promise<Coleccion> | null = null;

export function coleccionCargada(): Coleccion | null {
  return cargada;
}

// La colección completa (unos 5.000 iconos) se descarga solo cuando hace falta, y una sola vez.
export function cargarColeccion(): Promise<Coleccion> {
  pendiente ??= fetch(`${import.meta.env.BASE_URL}iconos/tabler.json`)
    .then((r) => {
      if (!r.ok) throw new Error('No se pudo descargar la colección de iconos');
      return r.json() as Promise<Record<string, { n: Nodo[]; t: string[] }>>;
    })
    .then((j) => {
      cargada = {
        nodos: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.n])),
        etiquetas: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.t])),
      };
      return cargada;
    })
    .catch((e) => {
      pendiente = null; // se podrá reintentar con conexión
      throw e;
    });
  return pendiente;
}

export function nodosDe(nombre: string): Nodo[] | undefined {
  return BASICOS[nombre] ?? cargada?.nodos[nombre];
}

// Primero los del diccionario (español), luego nombres en inglés que empiezan por la búsqueda,
// luego nombres que la contienen y al final los que la tienen en sus etiquetas.
export function buscarIconos(consulta: string, coleccion: Coleccion | null, limite = 120): string[] {
  const q = normalizar(consulta.trim());
  const resultado: string[] = [];
  const meter = (n: string) => {
    if (!resultado.includes(n)) resultado.push(n);
  };
  for (const e of DICCIONARIO)
    if (!q || e.icono.includes(q) || e.palabras.some((p) => normalizar(p).startsWith(q))) meter(e.icono);
  if (coleccion && q) {
    const nombres = Object.keys(coleccion.nodos);
    nombres.filter((n) => n.startsWith(q)).forEach(meter);
    nombres.filter((n) => n.includes(q)).forEach(meter);
    nombres.filter((n) => coleccion.etiquetas[n]?.some((t) => normalizar(t).startsWith(q))).forEach(meter);
  }
  return resultado.slice(0, limite);
}
```
Si la prueba de `buscarIconos('cube', …)` espera `['cube', 'box']` y sale algo más del diccionario (por ejemplo `cube` ya viene del diccionario), el orden sigue siendo correcto; ajusta solo si el diccionario añade otros iconos con «cube».

`src/componentes/Icono.tsx`:
```tsx
import { createElement, useEffect, useState } from 'react';
import { cargarColeccion, nodosDe } from '../iconos/coleccion';

interface Props {
  nombre?: string;
  tamano?: number;
  className?: string;
}

// Un icono de Tabler por su nombre, del color del texto. Si no existe (o no hay conexión para la colección), no dibuja nada.
export function Icono({ nombre, tamano = 18, className }: Props) {
  const [, setCargada] = useState(0);
  const nodos = nombre ? nodosDe(nombre) : undefined;
  useEffect(() => {
    if (!nombre || nodos) return;
    let vivo = true;
    cargarColeccion().then(() => vivo && setCargada((n) => n + 1)).catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [nombre, nodos]);
  if (!nodos) return null;
  return (
    <svg
      className={`icono-tabler${className ? ` ${className}` : ''}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {nodos.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
```
En `src/estilos.css`: `.icono-tabler { flex-shrink: 0; vertical-align: -3px; }`.

- [ ] **Step 6: Comprueba que pasan**

Run: `npx vitest run src/iconos src/componentes/Icono.test.tsx` → PASS. `npm test`, `npm run build` (debe generar los iconos antes de compilar y copiar `iconos/tabler.json` a `dist/`: compruébalo con `ls dist/iconos`).

- [ ] **Step 7: Registro y commit**
```bash
git add package.json package-lock.json .gitignore vite.config.ts scripts src/iconos src/componentes/Icono.tsx src/componentes/Icono.test.tsx src/estilos.css
git commit -m "Iconos de Tabler: diccionario en español, colección bajo demanda y componente Icono"
```

---

### Task 9: Selector de icono y selector de área

**Files:**
- Create: `src/componentes/SelectorIcono.tsx`, `src/componentes/SelectorIcono.test.tsx`, `src/componentes/SelectorArea.tsx`, `src/componentes/SelectorArea.test.tsx`
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: `Icono`, `buscarIconos`, `cargarColeccion`, `coleccionCargada` (Task 8); `opcionesDeArea` (Task 2).
- Produces:
  ```tsx
  export function SelectorIcono(props: { icono?: string; elegir(icono: string | undefined): void; disabled?: boolean }): JSX.Element;
  export function VentanaIconos(props: { actual?: string; elegir(icono: string | undefined): void; cerrar(): void }): JSX.Element;
  export function SelectorArea(props: { areas: Area[]; valor: string; cambiar(id: string): void; ninguna?: string; disabled?: boolean; etiqueta?: string }): JSX.Element;
  ```
  `elegir` recibe `undefined` para «Sin icono». Quien lo usa decide que elegir a mano «fija» el icono.

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/componentes/SelectorIcono.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectorIcono, VentanaIconos } from './SelectorIcono';

describe('SelectorIcono', () => {
  it('con icono, lo enseña en el botón', () => {
    const html = renderToString(<SelectorIcono icono="piano" elegir={() => undefined} />);
    expect(html).toContain('class="selector-icono"');
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="Cambiar icono"');
  });
  it('sin icono, enseña un hueco con +', () => {
    const html = renderToString(<SelectorIcono elegir={() => undefined} />);
    expect(html).toContain('>+<');
    expect(html).toContain('aria-label="Elegir icono"');
  });
});

describe('VentanaIconos', () => {
  it('tiene buscador, cuadrícula de iconos y «Sin icono»', () => {
    const html = renderToString(<VentanaIconos elegir={() => undefined} cerrar={() => undefined} />);
    expect(html).toContain('placeholder="Busca: música, examen, cube…"');
    expect(html).toContain('class="rejilla-iconos"');
    expect(html).toContain('>Sin icono</button>');
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThan(10);
  });
});
```

`src/componentes/SelectorArea.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import { SelectorArea } from './SelectorArea';

const AREAS = parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#a855f7"\n');

describe('SelectorArea', () => {
  it('las subáreas salen sangradas bajo su área', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="b" cambiar={() => undefined} />);
    expect(html).toMatch(/<option value="v">Videojuegos<\/option><option value="b" selected="">    Blender<\/option>/);
  });
  it('puede ofrecer «ninguna» y conserva un área desconocida', () => {
    const html = renderToString(<SelectorArea areas={AREAS} valor="borrada" ninguna="(ninguna)" cambiar={() => undefined} />);
    expect(html).toContain('<option value="">(ninguna)</option>');
    expect(html).toContain('<option value="borrada" selected="">borrada (desconocida)</option>');
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/componentes/SelectorIcono.test.tsx src/componentes/SelectorArea.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`src/componentes/SelectorArea.tsx`:
```tsx
import { buscarArea, opcionesDeArea } from '../agenda/areas';
import type { Area } from '../datos/areas';

interface Props {
  areas: Area[];
  valor: string;
  cambiar(id: string): void;
  ninguna?: string; // texto de la opción vacía; sin él, no hay opción vacía
  disabled?: boolean;
  etiqueta?: string;
}

export function SelectorArea({ areas, valor, cambiar, ninguna, disabled, etiqueta = 'Área' }: Props) {
  return (
    <select value={valor} onChange={(e) => cambiar(e.target.value)} disabled={disabled} aria-label={etiqueta}>
      {ninguna !== undefined && <option value="">{ninguna}</option>}
      {opcionesDeArea(areas).map((o) => (
        <option key={o.id} value={o.id}>
          {o.sub ? '    ' : ''}
          {o.nombre}
        </option>
      ))}
      {valor && !buscarArea(areas, valor) && <option value={valor}>{valor} (desconocida)</option>}
    </select>
  );
}
```
(Si `renderToString` mete `<!-- -->` entre la sangría y el nombre, pon el texto en una sola cadena: `` {`${o.sub ? ' '.repeat(4) : ''}${o.nombre}`} ``.)

`src/componentes/SelectorIcono.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { buscarIconos, cargarColeccion, coleccionCargada, type Coleccion } from '../iconos/coleccion';
import { Icono } from './Icono';

interface Props {
  icono?: string;
  elegir(icono: string | undefined): void;
  disabled?: boolean;
}

export function SelectorIcono({ icono, elegir, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="selector-icono"
        disabled={disabled}
        aria-label={icono ? 'Cambiar icono' : 'Elegir icono'}
        title={icono ?? 'Elegir icono'}
        onClick={() => setAbierto(true)}
      >
        {icono ? <Icono nombre={icono} tamano={20} /> : <span className="hueco-icono">+</span>}
      </button>
      {abierto && (
        <VentanaIconos
          actual={icono}
          elegir={(i) => {
            elegir(i);
            setAbierto(false);
          }}
          cerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

export function VentanaIconos({ actual, elegir, cerrar }: { actual?: string; elegir(i: string | undefined): void; cerrar(): void }) {
  const [consulta, setConsulta] = useState('');
  const [coleccion, setColeccion] = useState<Coleccion | null>(coleccionCargada);
  const [sinConexion, setSinConexion] = useState(false);
  useEffect(() => {
    if (coleccion) return;
    let vivo = true;
    cargarColeccion()
      .then((c) => vivo && setColeccion(c))
      .catch(() => vivo && setSinConexion(true));
    return () => {
      vivo = false;
    };
  }, [coleccion]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [cerrar]);
  const iconos = buscarIconos(consulta, coleccion);
  return (
    <div className="fondo-modal dialogo" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="modal ventana-iconos" role="dialog" aria-modal="true" aria-label="Elegir icono">
        <input autoFocus value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Busca: música, examen, cube…" aria-label="Buscar icono" />
        {sinConexion && <p className="nota-form">Conéctate para ver todos los iconos. Mientras, tienes los más usados.</p>}
        <div className="rejilla-iconos">
          {iconos.map((n) => (
            <button key={n} type="button" className={n === actual ? 'activa' : ''} title={n} aria-label={n} onClick={() => elegir(n)}>
              <Icono nombre={n} tamano={22} />
            </button>
          ))}
          {iconos.length === 0 && <p className="vacio">No hay iconos con «{consulta}».</p>}
        </div>
        <div className="botones-dialogo">
          <button type="button" onClick={() => elegir(undefined)}>Sin icono</button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
```

En `src/estilos.css`:
```css
.selector-icono { width: 40px; height: 40px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hueco-icono { color: var(--suave); font-size: 20px; }
.campo-titulo { display: flex; gap: 8px; align-items: flex-end; }
.campo-titulo label { flex: 1; }
.ventana-iconos { max-width: 520px; }
.rejilla-iconos { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; max-height: 50vh; overflow: auto; }
.rejilla-iconos button { height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 4: Comprueba que pasan**

Run: las dos pruebas → PASS. `npm test`, `npm run build`.

- [ ] **Step 5: Registro y commit**
```bash
git add src/componentes/SelectorIcono.tsx src/componentes/SelectorIcono.test.tsx src/componentes/SelectorArea.tsx src/componentes/SelectorArea.test.tsx src/estilos.css
git commit -m "Selector de icono con buscador y selector de área con subáreas"
```

---

### Task 10: Iconos y subáreas en tareas y proyectos

**Files:**
- Modify: `src/componentes/FormTarea.tsx`, `src/componentes/FilaTarea.tsx`, `src/componentes/EtiquetaTarea.tsx`, `src/componentes/Captura.tsx`, `src/componentes/Lateral.tsx`, `src/componentes/FormProyectoDesdeIdea.tsx`, `src/pantallas/Inicio.tsx`, `src/pantallas/Proyectos.tsx`, `src/pantallas/PaginaProyecto.tsx`, `src/estilos.css`
- Create: `src/componentes/FormTarea.test.tsx`, `src/componentes/FilaTarea.test.tsx`

**Interfaces:**
- Consumes: `SelectorIcono`, `SelectorArea` (Task 9), `Icono`, `iconoAlEscribir`, `iconoPara` (Task 8), `nombreDeArea` (Task 2).
- Produces: ningún tipo nuevo. `FormTarea` guarda `icono`; un proyecto nuevo nace con `icono: iconoPara(titulo)`.

- [ ] **Step 1: Escribe las pruebas que fallan**

Estas pruebas necesitan `useDatos`. Simúlalo con `vi.mock('../estado/datos', …)`:

`src/componentes/FilaTarea.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FilaTarea } from './FilaTarea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: { areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#f97316"\n'), tareas: [], proyectos: [], ideas: [] },
    cambiarTareasAlInstante: vi.fn(), soloLectura: false, tareasBloqueadas: false,
  }),
}));

describe('FilaTarea', () => {
  it('enseña el icono delante del título y el color y nombre de la subárea', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Modelar nave', area: 'b', icono: 'cube' }} dia="2026-09-25" alEditar={() => undefined} />);
    expect(html).toMatch(/<svg[^>]*icono-tabler[\s\S]*Modelar nave/);
    expect(html).toContain('background:#f97316');
    expect(html).toContain('title="Blender"');
  });
  it('sin icono, como siempre', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'X', area: 'v' }} dia="2026-09-25" alEditar={() => undefined} />);
    expect(html).not.toContain('<svg');
  });
});
```

`src/componentes/FormTarea.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FormTarea } from './FormTarea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: { areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n  subareas:\n    - id: fisica\n      nombre: Física\n      color: "#3b82f6"\n'), tareas: [], proyectos: [], ideas: [] },
    cambiarTareas: vi.fn(),
  }),
}));

describe('FormTarea', () => {
  it('una tarea nueva con título ya trae su icono sugerido', () => {
    const html = renderToString(<FormTarea edicion={{ nueva: { titulo: 'Examen de física' } }} cerrar={() => undefined} />);
    expect(html).toContain('class="selector-icono"');
    expect(html).toContain('title="file-pencil"');
  });
  it('al editar se conserva el icono guardado', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Examen', area: 'fisica', icono: 'cube' } }} cerrar={() => undefined} />);
    expect(html).toContain('title="cube"');
    expect(html).toMatch(/<option value="fisica" selected="">/);
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/componentes/FilaTarea.test.tsx src/componentes/FormTarea.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`FormTarea.tsx`:
- estado: `const [icono, setIcono] = useState(original?.icono ?? nueva.icono ?? iconoPara(original?.titulo ?? nueva.titulo ?? ''));` y `const [fijado, setFijado] = useState(Boolean(original?.icono ?? nueva.icono));`. Si se edita una tarea sin icono, el título ya existe: la regla es la misma que en la creación (se sugiere). Solo el icono guardado cuenta como fijado.
- al cambiar el título: `setTitulo(v); setIcono((i) => iconoAlEscribir(v, i, fijado));`
- al elegir en el selector: `setIcono(i); setFijado(true);`
- el campo título queda:
  ```tsx
  <div className="campo-titulo">
    <SelectorIcono icono={icono} elegir={(i) => { setIcono(i); setFijado(true); }} />
    <label>
      Título
      <input value={titulo} onChange={(e) => cambiarTitulo(e.target.value)} required autoFocus />
    </label>
  </div>
  ```
- el `<select>` de área se sustituye por `<SelectorArea areas={datos.areas} valor={area} cambiar={setArea} />`.
- al cambiar de proyecto: `setProyecto(v); const a = datos.proyectos.find((p) => p.id === v)?.area; if (a) setArea(a);`
- en `tarea`: `icono,` (queda `undefined` si no hay).

`FilaTarea.tsx`: después del punto, `<Icono nombre={tarea.icono} />`; el punto gana `title={nombreDeArea(datos.areas, tarea.area) ?? 'Área desconocida'}`.

`EtiquetaTarea.tsx`: delante del título, `<Icono nombre={tarea.icono} tamano={13} />`.

`Captura.tsx` (tarea rápida): `{ titulo: limpio, area: datos.areas[0]?.id ?? 'personal', icono: iconoPara(limpio) }`. `aplicarEdicion` recibe `icono: undefined` si no encaja nada; quita la clave si es `undefined` para no escribir `icono:` vacío (`...(icono ? { icono } : {})`).

`Proyectos.tsx` → `crear()`: `const nuevo: Proyecto = { id, estado: 'idea', titulo, icono: iconoPara(titulo), cuerpo: `# ${titulo}\n\n`, meta: {} };`. En cada fila, `<Icono nombre={p.icono} />` delante del título.

`PaginaProyecto.tsx`:
- estado `const [icono, setIcono] = useState(proyecto.icono);` y `cambiado` incluye `icono !== proyecto.icono`;
- en la barra: `<SelectorIcono icono={icono} elegir={setIcono} disabled={soloLectura} />` antes del `<h2>`;
- `guardar()` pone `icono`;
- el `<select>` de área pasa a `<SelectorArea areas={datos.areas} valor={area} cambiar={setArea} ninguna="(ninguna)" disabled={soloLectura} />`.

`FormProyectoDesdeIdea.tsx`: el `<select>` de área pasa a `SelectorArea` con `ninguna="(ninguna)"`.

`Inicio.tsx` (tarjeta de proyecto activo) y `Lateral.tsx` (proyectos activos): `<Icono nombre={p.icono} />` justo después del punto.

En `src/estilos.css`: `.etiqueta-tarea .icono-tabler { vertical-align: -2px; margin-right: 2px; }`.

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde. Abre `npm run dev` y comprueba a mano que al escribir «Examen» sale el icono, que al elegir otro ya no cambia al seguir escribiendo, y que en un proyecto se puede poner y quitar el icono.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Iconos y subáreas en tareas y proyectos; el icono se pone solo al escribir"
```

---

### Task 11: Formulario de idea (crear, editar, desde Inicio)

**Files:**
- Create: `src/componentes/FormIdea.tsx`, `src/componentes/FormIdea.test.tsx`
- Modify: `src/componentes/Captura.tsx`

**Interfaces:**
- Consumes: `anadirIdea`, `editarIdea`, `quitarIdea` (Task 5), `SelectorIcono`, `SelectorArea` (Task 9), `iconoPara`, `iconoAlEscribir` (Task 8).
- Produces:
  ```tsx
  export function FormIdea(props: { idea?: Idea; inicial?: Partial<IdeaSinId>; cerrar(): void }): JSX.Element;
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/componentes/FormIdea.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { FormIdea } from './FormIdea';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n'),
      proyectos: [{ id: 'nave', titulo: 'Nave', estado: 'activo', area: 'v', cuerpo: '', meta: {} }],
      tareas: [], ideas: [],
    },
    cambiarIdeas: vi.fn(), soloLectura: false, ideasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-09-25' }));

describe('FormIdea', () => {
  it('nueva desde Inicio: trae el texto, sugiere icono y tiene todos los campos', () => {
    const html = renderToString(<FormIdea inicial={{ texto: 'Un juego de piano' }} cerrar={() => undefined} />);
    expect(html).toContain('<h2>Nueva idea</h2>');
    expect(html).toMatch(/<textarea[^>]*>Un juego de piano<\/textarea>/);
    expect(html).toContain('title="device-gamepad-2"');
    expect(html).toContain('placeholder="(opcional)"');
    expect(html).toContain('aria-label="Área"');
    expect(html).toContain('aria-label="Proyecto"');
    expect(html).not.toContain('>Borrar</button>');
  });
  it('editar: título y proyecto puestos, y se puede borrar', () => {
    const html = renderToString(
      <FormIdea idea={{ id: 'i-1', fecha: '2026-09-22', titulo: 'Gravedad', texto: 'X', proyecto: 'nave', icono: 'planet' }} cerrar={() => undefined} />,
    );
    expect(html).toContain('<h2>Editar idea</h2>');
    expect(html).toContain('value="Gravedad"');
    expect(html).toMatch(/<option value="nave" selected="">/);
    expect(html).toContain('title="planet"');
    expect(html).toContain('>Borrar</button>');
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/componentes/FormIdea.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`src/componentes/FormIdea.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { anadirIdea, editarIdea, quitarIdea } from '../agenda/ideas';
import type { Idea, IdeaSinId } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { useHoy } from '../estado/hoy';
import { iconoAlEscribir, iconoPara } from '../iconos/diccionario';
import { SelectorArea } from './SelectorArea';
import { SelectorIcono } from './SelectorIcono';

interface Props {
  idea?: Idea;
  inicial?: Partial<IdeaSinId>;
  cerrar(): void;
}

export function FormIdea({ idea, inicial = {}, cerrar }: Props) {
  const { datos, cambiarIdeas } = useDatos();
  const hoy = useHoy();
  const base = idea ?? inicial;
  const [titulo, setTitulo] = useState(base.titulo ?? '');
  const [texto, setTexto] = useState(base.texto ?? '');
  const [area, setArea] = useState(base.area ?? '');
  const [proyecto, setProyecto] = useState(base.proyecto ?? '');
  const [icono, setIcono] = useState(base.icono ?? iconoPara(`${base.titulo ?? ''} ${base.texto ?? ''}`));
  const [fijado, setFijado] = useState(Boolean(base.icono));
  const [guardando, setGuardando] = useState(false);

  // El icono se sugiere con el título y, si no hay título, con el texto.
  const sugerir = (t: string, x: string) => setIcono((i) => iconoAlEscribir(`${t} ${x}`, i, fijado));

  function elegirProyecto(id: string) {
    setProyecto(id);
    const a = datos.proyectos.find((p) => p.id === id)?.area;
    if (a) setArea(a);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const editada: IdeaSinId = {
      fecha: idea?.fecha ?? hoy,
      texto,
      titulo: titulo || undefined,
      icono,
      area: area || undefined,
      proyecto: proyecto || undefined,
    };
    const nombre = titulo.trim() || texto.trim().split('\n')[0];
    setGuardando(true);
    const ok = await cambiarIdeas(
      (is) => (idea ? editarIdea(is, idea, editada) : anadirIdea(is, editada)),
      `${idea ? 'Editar' : 'Apuntar'} idea: ${nombre}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!idea || !(await confirmar('¿Borrar esta idea?', { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await cambiarIdeas((is) => quitarIdea(is, idea.id), `Borrar idea: ${titulo || texto.split('\n')[0]}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{idea ? 'Editar idea' : 'Nueva idea'}</h2>
        <div className="campo-titulo">
          <SelectorIcono icono={icono} elegir={(i) => { setIcono(i); setFijado(true); }} />
          <label>
            Título
            <input value={titulo} placeholder="(opcional)" maxLength={120} onChange={(e) => { setTitulo(e.target.value); sugerir(e.target.value, texto); }} />
          </label>
        </div>
        <label>
          Idea
          <textarea value={texto} rows={5} required autoFocus onChange={(e) => { setTexto(e.target.value); sugerir(titulo, e.target.value); }} />
        </label>
        <div className="fila-campos">
          <label>
            Área
            <SelectorArea areas={datos.areas} valor={area} cambiar={setArea} ninguna="(ninguna)" />
          </label>
          <label>
            Proyecto
            <select value={proyecto} onChange={(e) => elegirProyecto(e.target.value)} aria-label="Proyecto">
              <option value="">(ninguno)</option>
              {datos.proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
              {proyecto && !datos.proyectos.some((p) => p.id === proyecto) && <option value={proyecto}>{proyecto}</option>}
            </select>
          </label>
        </div>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando || !texto.trim()}>Guardar</button>
          {idea && <button type="button" className="peligro" disabled={guardando} onClick={() => void borrar()}>Borrar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```
Nota: `SelectorArea` pone `aria-label="Área"` por defecto; la prueba lo busca así.

`Captura.tsx`: el botón «💡 Idea» ya no guarda directamente: abre el formulario con el texto.
```tsx
  const [idea, setIdea] = useState<string | null>(null);
  // …
      <button type="button" disabled={!limpio || soloLectura || ideasBloqueadas} onClick={() => setIdea(limpio)}>
        💡 Idea
      </button>
    </form>
    {idea !== null && (
      <FormIdea inicial={{ texto: idea }} cerrar={() => { setIdea(null); setTexto(''); }} />
    )}
```
Envuelve el `<form>` y el `FormIdea` en un fragmento `<>…</>`. Quita `anadirIdea` y `cambiarIdeas` si ya no se usan. Nota: `cerrar` borra el texto también al cancelar. Si prefieres conservarlo al cancelar, pasa a `FormIdea` una prop `alGuardar` y apúntalo como `Ruling:`.

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Formulario de idea con título, icono, área y proyecto; también desde Inicio"
```

---

### Task 12: Agrupar por área y pantalla Proyectos con pestañas

**Files:**
- Create: `src/agenda/agrupar.ts`, `src/agenda/agrupar.test.ts`, `src/componentes/ListaIdeas.tsx`, `src/componentes/ListaIdeas.test.tsx`
- Delete: `src/pantallas/Ideas.tsx` (su contenido pasa a `ListaIdeas.tsx`)
- Modify: `src/pantallas/Proyectos.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `Area`, `Subarea`, `buscarArea`; `ordenarProyectos`; `ordenarIdeas`; `FormIdea`.
- Produces:
  ```ts
  export interface Grupo<T> { area: Area | null; items: T[]; subgrupos: { subarea: Subarea; items: T[] }[] }
  export function agruparPorArea<T extends { area?: string }>(items: T[], areas: Area[]): Grupo<T>[];
  // Proyectos acepta `pestanaInicial?: Pestana` y `alCambiarPestana?(p: Pestana): void`.
  export type Pestana = 'proyectos' | 'ideas'; // en src/componentes/navegacion.ts
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/agenda/agrupar.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import { agruparPorArea } from './agrupar';

const AREAS = parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#a855f7"\n    - id: r\n      nombre: Roblox\n      color: "#a855f7"\n');

describe('agruparPorArea', () => {
  it('por área en el orden de areas.yaml, con subgrupos por subárea y «sin área» al final', () => {
    const items = [{ n: 1, area: 'b' }, { n: 2 }, { n: 3, area: 'v' }, { n: 4, area: 'borrada' }, { n: 5, area: 'b' }];
    const g = agruparPorArea(items, AREAS);
    expect(g.map((x) => x.area?.id ?? null)).toEqual(['v', null]); // uni está vacía: no sale
    expect(g[0].items.map((x) => x.n)).toEqual([3]);
    expect(g[0].subgrupos.map((s) => [s.subarea.id, s.items.map((x) => x.n)])).toEqual([['b', [1, 5]]]); // roblox vacía: no sale
    expect(g[1].items.map((x) => x.n)).toEqual([2, 4]);
  });
  it('conserva el orden que traen los elementos', () => {
    const g = agruparPorArea([{ n: 2, area: 'uni' }, { n: 1, area: 'uni' }], AREAS);
    expect(g[0].items.map((x) => x.n)).toEqual([2, 1]);
  });
  it('sin nada → sin grupos', () => {
    expect(agruparPorArea([], AREAS)).toEqual([]);
  });
});
```

`src/componentes/ListaIdeas.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { ListaIdeas } from './ListaIdeas';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n'),
      proyectos: [], tareas: [],
      ideas: [
        { id: 'i-1', fecha: '2026-09-22', texto: 'Suelta, primera línea\nsegunda' },
        { id: 'i-2', fecha: '2026-09-25', titulo: 'Gravedad', texto: 'X', area: 'v', icono: 'piano' },
      ],
    },
    cambiarIdeas: vi.fn(), soloLectura: false, tareasBloqueadas: false, ideasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-09-25' }));

describe('ListaIdeas', () => {
  it('agrupa por área, enseña icono y título en negrita, y «Sin área» al final', () => {
    const html = renderToString(<ListaIdeas editar={() => undefined} ir={() => undefined} />);
    expect(html.indexOf('Videojuegos')).toBeLessThan(html.indexOf('Sin área'));
    expect(html).toMatch(/<svg[\s\S]*<strong>Gravedad<\/strong>/);
    expect(html).toContain('Suelta, primera línea');
    expect(html).not.toContain('segunda');
    expect(html).toContain('>+ Idea</button>');
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/agenda/agrupar.test.ts src/componentes/ListaIdeas.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`src/agenda/agrupar.ts`:
```ts
import type { Area, Subarea } from '../datos/areas';
import { buscarArea } from './areas';

export interface Grupo<T> {
  area: Area | null; // null = «Sin área» (sin área o con un área que no existe)
  items: T[];
  subgrupos: { subarea: Subarea; items: T[] }[];
}

// Agrupa en el orden de areas.yaml; dentro de cada grupo se respeta el orden que traen los elementos.
// Los grupos y subgrupos vacíos no salen.
export function agruparPorArea<T extends { area?: string }>(items: T[], areas: Area[]): Grupo<T>[] {
  const grupos: Grupo<T>[] = areas.map((a) => ({ area: a, items: [], subgrupos: a.subareas.map((s) => ({ subarea: s, items: [] })) }));
  const sinArea: Grupo<T> = { area: null, items: [], subgrupos: [] };
  for (const x of items) {
    const b = buscarArea(areas, x.area);
    if (!b) {
      sinArea.items.push(x);
      continue;
    }
    const g = grupos[areas.indexOf(b.madre)];
    if (b.area === b.madre) g.items.push(x);
    else g.subgrupos.find((s) => s.subarea === b.area)!.items.push(x);
  }
  return [...grupos, sinArea]
    .map((g) => ({ ...g, subgrupos: g.subgrupos.filter((s) => s.items.length) }))
    .filter((g) => g.items.length || g.subgrupos.length);
}
```

`src/componentes/ListaIdeas.tsx`: parte de `src/pantallas/Ideas.tsx` (Task 5) y cambia:
- ya no hay formulario de captura arriba: un botón `+ Idea` en la barra abre `<FormIdea cerrar=… />`;
- tocar una idea abre `<FormIdea idea={idea} … />` (estado `editando: Idea | null`);
- las ideas se pintan por grupos: `agruparPorArea(ordenarIdeas(datos.ideas), datos.areas)`. Cada grupo es un `<h3 className="grupo">` con el punto del color y el nombre (o «Sin área»). Cada subgrupo es un `<h4 className="subgrupo">`;
- cada fila:
  ```tsx
  <li key={idea.id} className={`fila-idea${ocupada(idea) ? ' guardando' : ''}`}>
    <button className="titulo-idea" onClick={() => setEditando(idea)} disabled={soloLectura || ideasBloqueadas}>
      <Icono nombre={idea.icono} />
      {idea.titulo ? <strong>{idea.titulo}</strong> : <span>{tituloDeIdea(idea)}</span>}
    </button>
    {idea.proyecto && <span className="detalle">📁 {datos.proyectos.find((p) => p.id === idea.proyecto)?.titulo ?? idea.proyecto}</span>}
    <span className="detalle fecha-idea">{formatoCorto(idea.fecha)}</span>
    <button disabled={soloLectura || tareasBloqueadas || ideasBloqueadas || ocupada(idea)} onClick={() => aTarea(idea)}>→ Tarea</button>
    <button disabled={soloLectura || ideasBloqueadas || ocupada(idea)} onClick={() => setConvirtiendo(idea)}>→ Proyecto</button>
  </li>
  ```
  (Vincular y borrar se hacen ahora desde el formulario: se quitan el `<select>` y el botón Borrar de la fila.)
- props: `{ editar(e: Edicion): void; ir(d: Destino): void }`, las mismas que tenía `Ideas`.

`src/pantallas/Proyectos.tsx`:
- añade `export type Pestana = 'proyectos' | 'ideas';` en `src/componentes/navegacion.ts` e impórtalo aquí; props nuevas `pestanaInicial?: Pestana; alCambiarPestana?(p: Pestana): void;`, estado `const [pestana, setPestana] = useState<Pestana>(pestanaInicial ?? 'proyectos');` y `useEffect(() => alCambiarPestana?.(pestana), [pestana, alCambiarPestana]);`
- debajo de la barra:
  ```tsx
  <div className="pestanas" role="tablist">
    <button role="tab" aria-selected={pestana === 'proyectos'} className={pestana === 'proyectos' ? 'activa' : ''} onClick={() => setPestana('proyectos')}>📁 Proyectos</button>
    <button role="tab" aria-selected={pestana === 'ideas'} className={pestana === 'ideas' ? 'activa' : ''} onClick={() => setPestana('ideas')}>💡 Ideas ({datos.ideas.length})</button>
  </div>
  ```
- con `pestana === 'ideas'`: `<ListaIdeas editar={editar} ir={ir} />` (el título `<h2>` sigue siendo «Proyectos» y el botón `+ Nuevo proyecto` solo sale en la pestaña Proyectos).
- con `pestana === 'proyectos'`: se mantienen los filtros por estado. La lista `ordenarProyectos(...)` filtrada se pasa por `agruparPorArea` y se pinta por grupos, igual que las ideas (cabecera con punto y nombre; subgrupos). Las filas no cambian. Debajo de todo, el aviso de proyectos activos, igual que en Inicio:
  ```tsx
  {activos > 0 && (
    <p className={`aviso-activos${activos > LIMITE_ACTIVOS ? ' demasiados' : ''}`}>
      {activos} de {LIMITE_ACTIVOS} proyectos activos{activos > LIMITE_ACTIVOS ? '. Son muchos a la vez: terminar uno te ayudará a acabar las cosas.' : '.'}
    </p>
  )}
  ```
  con `const activos = datos.proyectos.filter((p) => p.estado === 'activo').length;`.

En `src/estilos.css`:
```css
.pestanas { display: flex; gap: 4px; border-bottom: 1px solid var(--borde); margin-bottom: 16px; }
.pestanas button { border: none; border-bottom: 2px solid transparent; border-radius: 0; background: none; padding: 8px 14px; color: var(--suave); }
.pestanas button.activa { color: var(--acento); border-bottom-color: var(--acento); background: none; }
.grupo-area { display: flex; align-items: center; gap: 8px; }
h4.subgrupo { margin: 10px 0 4px 16px; font-size: 14px; color: var(--suave); font-weight: 600; }
.titulo-idea { flex: 1; display: flex; align-items: center; gap: 8px; border: none; background: none; text-align: left; padding: 0; min-width: 0; }
```

En `src/App.tsx`: quita el import y el uso de `Ideas` (la navegación se arregla en la Task 13). Para que compile ya, cambia `{actual === 'ideas' && <Ideas … />}` por `{actual === 'ideas' && <Proyectos key={visita} editar={editar} ir={ir} guardian={guardian} pestanaInicial="ideas" />}`. La Task 13 lo limpia.

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Proyectos con pestañas Proyectos e Ideas, agrupados por área y subárea"
```

---

### Task 13: Navegación (móvil sin Ideas y desplegable en el PC)

**Files:**
- Modify: `src/componentes/navegacion.ts`, `src/componentes/MenuMovil.tsx`, `src/componentes/Lateral.tsx`, `src/App.tsx`, `src/pantallas/PaginaProyecto.tsx`, `src/estilos.css`
- Create: `src/componentes/Lateral.test.tsx`, `src/componentes/navegacion.test.ts`

**Interfaces:**
- Consumes: `Pestana` (Task 12, en `navegacion.ts`).
- Produces:
  ```ts
  export type Pantalla = 'inicio' | 'calendario' | 'tareas' | 'proyectos' | 'estudio' | 'ajustes';
  export interface Destino { pantalla: Pantalla; dia?: ISODate; proyecto?: string; pestana?: Pestana }
  // Lateral: props nuevas `pestana: Pestana | null` (qué pestaña de Proyectos está abierta).
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/componentes/navegacion.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SECCIONES } from './navegacion';

describe('SECCIONES', () => {
  it('ya no tiene Ideas (vive dentro de Proyectos) y conserva los emojis', () => {
    expect(SECCIONES.map((s) => s.id)).toEqual(['inicio', 'calendario', 'tareas', 'proyectos', 'estudio', 'ajustes']);
    expect(SECCIONES.find((s) => s.id === 'proyectos')?.icono).toBe('📁');
  });
});
```

`src/componentes/Lateral.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Lateral } from './Lateral';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: [], tareas: [],
      proyectos: [{ id: 'nave', titulo: 'Nave', estado: 'activo', icono: 'rocket', cuerpo: '', meta: {} }],
      ideas: [{ id: 'i-1', fecha: '2026-09-25', texto: 'X' }, { id: 'i-2', fecha: '2026-09-25', texto: 'Y' }],
    },
  }),
}));

describe('Lateral', () => {
  it('Proyectos se despliega con Ideas (y su número) y los proyectos activos', () => {
    const html = renderToString(<Lateral actual="proyectos" pestana="ideas" ir={() => undefined} bloqueado={false} proyectoAbierto={null} />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toMatch(/item-lateral sub activo[^>]*>[\s\S]*?💡[\s\S]*?Ideas[\s\S]*?>2</);
    expect(html).toContain('Nave');
  });
});
```
(Si `rocket` no se dibuja porque no está en los básicos, no pasa nada: la prueba no lo mira.)

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/componentes/navegacion.test.ts src/componentes/Lateral.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`navegacion.ts`: quita `'ideas'` de `Pantalla` y su línea de `SECCIONES`; añade `pestana?: Pestana` a `Destino` (`Pestana` ya está en este archivo desde la Task 12).

`MenuMovil.tsx`: no cambia (usa `SECCIONES`, que ya no tiene Ideas).

`Lateral.tsx`:
- prop nueva `pestana: Pestana | null`;
- el número de Ideas se quita de `numeros` y se pinta en el subelemento;
- estado del desplegable guardado en el dispositivo:
  ```ts
  const CLAVE_DESPLEGADO = 'sc-lateral-proyectos';
  function leerDesplegado(): boolean {
    try {
      return localStorage.getItem(CLAVE_DESPLEGADO) !== 'no';
    } catch {
      return true;
    }
  }
  // en el componente:
  const [desplegado, setDesplegado] = useState(leerDesplegado);
  const alternar = () => {
    setDesplegado((d) => {
      try { localStorage.setItem(CLAVE_DESPLEGADO, d ? 'no' : 'si'); } catch { /* sin almacenamiento */ }
      return !d;
    });
  };
  ```
  (`leerDesplegado` debe funcionar sin `localStorage`, como en la prueba: el `try` lo cubre.)
- dentro del bucle, para `s.id === 'proyectos'`:
  ```tsx
  <div className="fila-lateral">
    {item(s)}
    <button className="flecha-lateral" aria-expanded={desplegado} aria-label={desplegado ? 'Plegar proyectos' : 'Desplegar proyectos'} onClick={alternar}>
      {desplegado ? '▾' : '▸'}
    </button>
  </div>
  {desplegado && (
    <>
      <button
        className={`item-lateral sub${actual === 'proyectos' && pestana === 'ideas' ? ' activo' : ''}`}
        disabled={bloqueado}
        onClick={() => ir({ pantalla: 'proyectos', pestana: 'ideas' })}
      >
        <span className="icono">💡</span>Ideas
        {datos.ideas.length ? <span className="numero-lateral">{datos.ideas.length}</span> : null}
      </button>
      {activos.map((p) => /* igual que ahora, con <Icono nombre={p.icono} /> tras el punto */)}
    </>
  )}
  ```
  El item «Proyectos» no se marca activo cuando la pestaña abierta es Ideas: `actual === s.id && !(s.id === 'proyectos' && pestana === 'ideas')`.

`App.tsx`:
- estado `const [pestana, setPestana] = useState<Pestana | null>(null);`;
- `{actual === 'proyectos' && <Proyectos key={visita} … pestanaInicial={destino.pestana} alCambiarPestana={setPestana} />}` y borra la línea de `actual === 'ideas'`;
- `<Lateral … pestana={actual === 'proyectos' ? pestana : null} />`.

`PaginaProyecto.tsx`: «Ver en Ideas →» pasa a `ir({ pantalla: 'proyectos', pestana: 'ideas' })`.

En `src/estilos.css`:
```css
.fila-lateral { display: flex; align-items: center; }
.fila-lateral .item-lateral { flex: 1; }
.flecha-lateral { border: none; background: none; padding: 4px 8px; color: var(--suave); }
```

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde. Con `npm run dev`, mira en una ventana estrecha (móvil) que la barra de abajo tiene 6 botones, y en una ancha que el desplegable funciona y se recuerda al recargar.

- [ ] **Step 5: Registro y commit**
```bash
git add -A src
git commit -m "Navegación: Ideas dentro de Proyectos (6 botones en el móvil, desplegable en el PC)"
```

---

### Task 14: Ventana de área (Calendario, Ajustes y Proyectos)

**Files:**
- Create: `src/componentes/VentanaArea.tsx`, `src/componentes/VentanaArea.test.tsx`, `src/componentes/ListaAreas.tsx`
- Modify: `src/pantallas/Calendario.tsx`, `src/pantallas/Ajustes.tsx`, `src/pantallas/Proyectos.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: `crearArea`, `editarArea`, `destinosPosibles`, `idsDeArea`, `buscarArea`, `nombreDeArea`, `PALETA` (Task 2); `cambiarAreas`, `borrarArea`, `areasBloqueadas` (Task 7).
- Produces:
  ```tsx
  // id: área o subárea que se edita; sin id = nueva (con `madre` = subárea nueva de esa área)
  export function VentanaArea(props: { id?: string; madre?: string; cerrar(): void }): JSX.Element;
  export function ListaAreas(): JSX.Element; // árbol con lápiz y «+ Nueva área»
  export function contarDentro(datos: Pick<Datos, 'tareas' | 'ideas' | 'proyectos' | 'areas'>, id: string): number;
  ```

- [ ] **Step 1: Escribe las pruebas que fallan**

`src/componentes/VentanaArea.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { contarDentro, VentanaArea } from './VentanaArea';

const AREAS = parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n- id: v\n  nombre: Videojuegos\n  color: "#a855f7"\n  subareas:\n    - id: b\n      nombre: Blender\n      color: "#f97316"\n');
const DATOS = {
  areas: AREAS,
  tareas: [{ id: 't', titulo: 'T', area: 'b' }, { id: 'u', titulo: 'U', area: 'uni' }],
  ideas: [{ id: 'i', fecha: '2026-09-25', texto: 'X', area: 'v' }],
  proyectos: [{ id: 'p', titulo: 'P', estado: 'activo' as const, area: 'b', cuerpo: '', meta: {} }],
};
vi.mock('../estado/datos', () => ({
  useDatos: () => ({ datos: DATOS, cambiarAreas: vi.fn(), borrarArea: vi.fn(), soloLectura: false, areasBloqueadas: false }),
}));

describe('contarDentro', () => {
  it('cuenta tareas, ideas y proyectos del área y de sus subáreas', () => {
    expect(contarDentro(DATOS, 'v')).toBe(3);
    expect(contarDentro(DATOS, 'b')).toBe(2);
    expect(contarDentro(DATOS, 'uni')).toBe(1);
  });
});

describe('VentanaArea', () => {
  it('editar un área grande: nombre, color, sus subáreas y borrar', () => {
    const html = renderToString(<VentanaArea id="v" cerrar={() => undefined} />);
    expect(html).toContain('<h2>Editar área</h2>');
    expect(html).toContain('value="Videojuegos"');
    expect(html).toContain('type="color"');
    expect(html).toContain('Blender');
    expect(html).toContain('>+ Subárea</button>');
    expect(html).toContain('>Borrar</button>');
  });
  it('una subárea nueva parte del color de su área y no tiene lista de subáreas', () => {
    const html = renderToString(<VentanaArea madre="v" cerrar={() => undefined} />);
    expect(html).toContain('<h2>Nueva subárea de Videojuegos</h2>');
    expect(html).toContain('value="#a855f7"');
    expect(html).not.toContain('+ Subárea');
    expect(html).not.toContain('>Borrar</button>');
  });
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `npx vitest run src/componentes/VentanaArea.test.tsx` → FAIL.

- [ ] **Step 3: Escribe el código**

`src/componentes/VentanaArea.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { buscarArea, crearArea, destinosPosibles, editarArea, idsDeArea, nombreDeArea, PALETA } from '../agenda/areas';
import type { Datos } from '../repositorio';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { SelectorArea } from './SelectorArea';

export function contarDentro(d: Pick<Datos, 'tareas' | 'ideas' | 'proyectos' | 'areas'>, id: string): number {
  const ids = idsDeArea(d.areas, id);
  const dentro = (x: { area?: string }) => x.area !== undefined && ids.includes(x.area);
  return d.tareas.filter(dentro).length + d.ideas.filter(dentro).length + d.proyectos.filter(dentro).length;
}

interface Props {
  id?: string;
  madre?: string;
  cerrar(): void;
}

export function VentanaArea({ id, madre, cerrar }: Props) {
  const { datos, cambiarAreas, borrarArea, soloLectura, areasBloqueadas } = useDatos();
  const actual = buscarArea(datos.areas, id);
  const grande = actual && actual.area === actual.madre ? actual.madre : null;
  const colorMadre = datos.areas.find((a) => a.id === madre)?.color;
  const [nombre, setNombre] = useState(actual?.area.nombre ?? '');
  const [color, setColor] = useState(actual?.area.color ?? colorMadre ?? PALETA[datos.areas.length % PALETA.length]);
  const [borrando, setBorrando] = useState(false);
  const [destino, setDestino] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sub, setSub] = useState<{ id?: string; madre?: string } | null>(null);
  const bloqueado = soloLectura || areasBloqueadas || guardando;

  const titulo = id ? (grande ? 'Editar área' : 'Editar subárea') : madre ? `Nueva subárea de ${nombreDeArea(datos.areas, madre)}` : 'Nueva área';

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const ok = await cambiarAreas(
      (as) => (id ? editarArea(as, id, { nombre, color }) : crearArea(as, { nombre, color }, madre)),
      `${id ? 'Editar' : 'Crear'} área: ${nombre.trim()}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  const dentro = id ? contarDentro(datos, id) : 0;
  const destinos = id ? destinosPosibles(datos.areas, id) : [];

  async function confirmarBorrado() {
    if (!id) return;
    const aviso = grande && grande.subareas.length ? ` También se borran sus subáreas (${grande.subareas.map((s) => s.nombre).join(', ')}).` : '';
    const destinoNombre = nombreDeArea(datos.areas, destino);
    const texto = dentro
      ? `¿Borrar «${nombre}»? Sus ${dentro} cosas pasan a «${destinoNombre}».${aviso}`
      : `¿Borrar «${nombre}»?${aviso}`;
    if (!(await confirmar(texto, { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await borrarArea(id, dentro ? destino : null);
    setGuardando(false);
    if (ok) cerrar();
  }

  function empezarBorrado() {
    // Si se borra una subárea, lo normal es mandar lo de dentro a su área.
    setDestino(actual && actual.area !== actual.madre ? actual.madre.id : (destinos[0] ?? ''));
    setBorrando(true);
  }

  if (sub) return <VentanaArea id={sub.id} madre={sub.madre} cerrar={() => setSub(null)} />;

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{titulo}</h2>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={40} />
        </label>
        <fieldset className="paleta">
          <legend>Color</legend>
          {PALETA.map((c) => (
            <button key={c} type="button" className={`muestra${c === color ? ' elegida' : ''}`} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Otro color" />
        </fieldset>
        {grande && (
          <div className="subareas">
            <h3>Subáreas</h3>
            {grande.subareas.length === 0 && <p className="vacio">Aún no tiene subáreas.</p>}
            {grande.subareas.map((s) => (
              <button key={s.id} type="button" className="fila-subarea" onClick={() => setSub({ id: s.id })} disabled={bloqueado}>
                <span className="punto" style={{ background: s.color }} />
                {s.nombre} <span className="detalle">✏️</span>
              </button>
            ))}
            <button type="button" onClick={() => setSub({ madre: grande.id })} disabled={bloqueado}>+ Subárea</button>
          </div>
        )}
        {borrando && id && (
          <div className="banner aviso">
            {destinos.length === 0 ? (
              <p>No se puede borrar: es la única área, y las tareas siempre necesitan una. Crea otra antes.</p>
            ) : dentro > 0 ? (
              <label>
                Tiene {dentro} cosas dentro (tareas, ideas y proyectos). ¿A dónde las paso?
                <SelectorArea areas={datos.areas.filter((a) => destinos.includes(a.id) || a.subareas.some((s) => destinos.includes(s.id)))} valor={destino} cambiar={setDestino} etiqueta="Destino" />
              </label>
            ) : (
              <p>Está vacía: se puede borrar sin mover nada.</p>
            )}
            {destinos.length > 0 && (
              <button type="button" className="peligro" disabled={bloqueado || (dentro > 0 && !destinos.includes(destino))} onClick={() => void confirmarBorrado()}>
                Borrar definitivamente
              </button>
            )}
          </div>
        )}
        <div className="botones">
          <button type="submit" className="activa" disabled={bloqueado}>Guardar</button>
          {id && !borrando && <button type="button" className="peligro" disabled={bloqueado} onClick={empezarBorrado}>Borrar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```
Nota: el `SelectorArea` del destino puede mostrar el área madre de la que se borra (por ejemplo «Videojuegos» al borrar «Blender»), porque es un destino válido. Al borrar un área grande, esa área y sus subáreas no salen. El botón de borrar definitivo se desactiva si el destino elegido no es válido.

`src/componentes/ListaAreas.tsx`:
```tsx
import { useState } from 'react';
import { useDatos } from '../estado/datos';
import { VentanaArea } from './VentanaArea';

// Árbol de áreas y subáreas con su lápiz (Ajustes).
export function ListaAreas() {
  const { datos, soloLectura, areasBloqueadas } = useDatos();
  const [abierta, setAbierta] = useState<{ id?: string; madre?: string } | null>(null);
  const bloqueado = soloLectura || areasBloqueadas;
  return (
    <div className="tarjeta lista-areas">
      <h3>Áreas</h3>
      <ul>
        {datos.areas.map((a) => (
          <li key={a.id}>
            <button className="fila-subarea" disabled={bloqueado} onClick={() => setAbierta({ id: a.id })}>
              <span className="punto" style={{ background: a.color }} />
              {a.nombre} <span className="detalle">✏️</span>
            </button>
            {a.subareas.length > 0 && (
              <ul>
                {a.subareas.map((s) => (
                  <li key={s.id}>
                    <button className="fila-subarea" disabled={bloqueado} onClick={() => setAbierta({ id: s.id })}>
                      <span className="punto" style={{ background: s.color }} />
                      {s.nombre} <span className="detalle">✏️</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <button disabled={bloqueado} onClick={() => setAbierta({})}>+ Nueva área</button>
      {abierta && <VentanaArea id={abierta.id} madre={abierta.madre} cerrar={() => setAbierta(null)} />}
    </div>
  );
}
```

Puntos de entrada:
- `Ajustes.tsx`: `{config && <ListaAreas />}` después de la tarjeta de conexión.
- `Calendario.tsx`: estado `const [editandoArea, setEditandoArea] = useState<{ id?: string } | null>(null);`. Tras cada pastilla de un área de `datos.areas` (no «Otras» ni «Todo»), un botón pequeño `<button className="lapiz" aria-label={`Editar ${b.nombre}`} onClick={() => setEditandoArea({ id: b.id })} disabled={soloLectura}>✏️</button>`. Al final, `<button className="pastilla" onClick={() => setEditandoArea({})} disabled={soloLectura}>+ Nueva área</button>`. Y `{editandoArea && <VentanaArea id={editandoArea.id} cerrar={() => setEditandoArea(null)} />}`.
- `Proyectos.tsx` (pestaña Proyectos): botón `+ Área` junto a `+ Nuevo proyecto`, y un lápiz en la cabecera de cada grupo que tenga área (y de cada subgrupo). Abren la misma `VentanaArea`.

En `src/estilos.css`:
```css
.paleta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border: none; padding: 0; }
.paleta legend { width: 100%; margin-bottom: 4px; }
.muestra { width: 28px; height: 28px; border-radius: 50%; padding: 0; border: 2px solid transparent; }
.muestra.elegida { border-color: var(--texto); }
.paleta input[type='color'] { width: 40px; height: 32px; padding: 0; border: none; background: none; }
.fila-subarea { display: flex; align-items: center; gap: 8px; border: none; background: none; padding: 6px 4px; width: 100%; text-align: left; }
.lista-areas ul { list-style: none; margin: 0; padding: 0; }
.lista-areas ul ul { padding-left: 22px; }
.lapiz { border: none; background: none; padding: 2px 4px; font-size: 12px; opacity: 0.6; }
.lapiz:hover:not(:disabled) { opacity: 1; background: none; }
```

- [ ] **Step 4: Comprueba que pasan**

Run: `npm test` y `npm run build` → verde.

- [ ] **Step 5: Prueba manual con datos de prueba**

Con `npm run dev` y la app conectada, **no** borres áreas reales de Diego. Crea un área «Prueba» con una subárea «Sub», pon una tarea en «Sub», borra «Prueba» moviendo la tarea a otra área, y comprueba en GitHub que `tareas.yaml` y `areas.yaml` han quedado bien. Si no puedes conectarte, dilo en el informe: la prueba la hará Diego en la Task 15.

- [ ] **Step 6: Registro y commit**
```bash
git add -A src
git commit -m "Ventana de área: crear, editar, subáreas y borrar moviendo lo de dentro, desde Calendario, Ajustes y Proyectos"
```

---

### Task 15: Documentación, prueba con Diego y publicación

**Files:**
- Modify: `docs/diseno.md` (sección 3), `AGENTS.md` (estructura y estado), `../my-context/AGENTS.md`

- [ ] **Step 1: `docs/diseno.md`, sección 3**

- `### agenda/areas.yaml`: añade el ejemplo con `subareas` (spec §3.1) y sus reglas: ids únicos entre áreas y subáreas, un solo nivel, color entre comillas, y que una tarea, idea o proyecto puede usar el id de un área o de una subárea.
- `### agenda/tareas.yaml` y `### Proyectos`: el campo opcional `icono` (nombre de un icono de Tabler, en inglés, por ejemplo `cube`; lista en https://tabler.io/icons).
- Sustituye `### Ideas: ideas/bandeja.md` por `### Ideas: ideas/ideas.yaml` con el ejemplo y las reglas de spec §3.4, y una línea sobre el paso desde la bandeja antigua (spec §3.5).

- [ ] **Step 2: `AGENTS.md` de este repositorio**

- «Estructura del código»: añade `src/agenda/areas.ts`, `src/agenda/agrupar.ts`, `src/agenda/cambios.ts`, `src/datos/bandeja.ts` (solo para el paso), `src/iconos/` y `scripts/iconos.ts` (genera los iconos antes de `dev` y `build`).
- «Estado actual»: v1.3 (organización) implementada y probada, con enlaces al diseño, al plan y al registro.

- [ ] **Step 3: `../my-context/AGENTS.md`**

Sustituye la sección de ideas y añade lo de áreas e iconos (y no pongas datos nuevos de Diego, solo reglas):
```markdown
- Ideas en `ideas/ideas.yaml` (la app las lee y escribe). Cada idea: `id` (`i-AAAAMMDD-n`, con la fecha de la idea, sin repetir), `fecha`, `texto` (puede tener varias líneas: usa `texto: |`), y opcionales `titulo`, `icono`, `area` y `proyecto` (id = nombre del archivo en `proyectos/` sin `.md`). Sin comentarios `#`.
- Si aún existe `ideas/bandeja.md` (formato antiguo), pasa sus ideas a `ideas.yaml` sin duplicar y bórrala.
- Áreas en `agenda/areas.yaml`. Un área puede tener `subareas` (un solo nivel). Los ids no se repiten entre áreas y subáreas. Una tarea, idea o proyecto puede usar un área o una subárea.
- Iconos: al crear una tarea, idea o proyecto, pon en `icono` el nombre de un icono de Tabler relacionado (https://tabler.io/icons, en inglés, por ejemplo `cube`, `school`, `device-gamepad-2`). Si no encaja ninguno, no pongas icono.
```
Después, en `../my-context`: `git add -A && git commit -m "Instrucciones: ideas.yaml, subáreas e iconos" && git push` (es la rutina de Git de `my-context`; avisa a Diego de que lo subes).

- [ ] **Step 4: Verificación completa**

Run: `npm test` (anota cuántas pruebas pasan; antes eran 255) y `npm run build`. Las dos en verde.

- [ ] **Step 5: Revisión final y prueba con Diego**

- Pide una revisión de toda la rama (`superpowers:requesting-code-review`) y arregla lo crítico e importante. Apunta los menores aplazados como líneas `Final:` del registro.
- Explícale a Diego cómo probarlo con `npm run dev` en el PC: crear un área con subárea, borrarla, crear una idea desde Inicio, editarla, iconos en una tarea, las pestañas de Proyectos, el desplegable de la barra lateral y la barra de abajo en una ventana estrecha. Avísale de que la primera vez que abra la app con su token, sus ideas pasarán de `bandeja.md` a `ideas.yaml` (se verá un commit en `my-context`).
- Arregla lo que encuentre (cada arreglo con su prueba).

- [ ] **Step 6: Publicar (solo con el visto bueno de Diego)**

Pregúntale a Diego si quiere publicar. Si dice que sí:
```bash
git switch main && git merge --ff-only organizacion && git push origin main
```
Si `--ff-only` falla, no fuerces nada: cuéntaselo a Diego. Después, actualiza «Estado actual» en `AGENTS.md` («publicada») y haz commit y push.
