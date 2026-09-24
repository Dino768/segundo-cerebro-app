# Zona de estudio (v1.2): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la pestaña **Estudio**:
- en el PC, un chat por asignatura que contesta Claude Code con la suscripción de Diego, junto a una pizarra en la que Claude explica y Diego mueve, borra y anota;
- en todas partes, un historial de pizarras guardadas en `my-context`;
- además, los pulidos pendientes de la v1.1.

**Architecture:**
- Un **programa local** en Node (`local/`, TypeScript que Node 24 ejecuta sin compilar) sirve la app compilada en `127.0.0.1:5174`. También lanza `claude -p` en modo restringido dentro de `my-context/estudios/<asignatura>/`, lee las conversaciones que Claude Code guarda en `~/.claude/projects/` y vigila los archivos de pizarra.
- **La app es la misma** en todas partes: si encuentra el programa local, enseña el chat y la pizarra; si no, solo el historial.
- El historial y las asignaturas van por la API de GitHub, como el resto de datos.

**Tech Stack:** React 19, Vite 8, Vitest 5 y TypeScript 7 (ya en el proyecto). Node 24 para `local/` (`node:http`, `node:child_process`, `fs.watch`). Dependencia nueva: `katex`. Se reutilizan `marked`, `dompurify` y `yaml`.

**Spec:** `docs/superpowers/specs/2026-09-24-zona-de-estudio-design.md` (léelo antes de empezar; este plan lo sigue).

## Global Constraints

- Todo el texto visible y los comentarios, en español. Mensajes de commit en español. Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Node está en `C:\Program Files\nodejs`. En la terminal Bash, empieza cada comando con `export PATH="$PATH:/c/Program Files/nodejs";`.
- Trabaja en la rama local `zona-de-estudio` (créala en la Tarea 1). `main` se publica sola al hacer push, así que **nunca hagas `git push` sin que Diego lo sepa**. Tampoco pongas tokens ni datos personales en este repositorio.
- **Registro:** `.superpowers/sdd/2026-09-24-zona-de-estudio/progress.md`. Cada tarea deja su línea `Task N: complete (…)`, y cada decisión que se aparte del plan se apunta como `Ruling:`.
- **Imports:**
  - Los archivos de `local/` y los de `src/estudio/` que usa `local/` (`tipos.ts`, `contexto.ts`, `expresion.ts`, `pizarra.ts`) importan **con la extensión `.ts`** y solo usan sintaxis de TypeScript que se pueda borrar (nada de `enum` ni de parámetros-propiedad), porque Node los ejecuta directamente.
  - El resto de `src/` sigue importando sin extensión.
- **Programa local:**
  - puerto `5174`, escucha solo en `127.0.0.1`;
  - prefijo de la app `/segundo-cerebro-app/` y de la API `/segundo-cerebro-app/api/local/`;
  - `my-context` por defecto en `../my-context` (variable `MY_CONTEXT`).
- **Claude Code se lanza así** (comprobado con la versión 2.1.281): el mensaje va por la entrada estándar (stdin), con estos argumentos:
  ```
  claude -p --output-format stream-json --include-partial-messages --verbose
         (--session-id <uuid> | --resume <uuid>)
         --append-system-prompt-file local/instrucciones-estudio.md
         --restricted --tools Read,Write,Edit,Glob,Grep --strict-mcp-config
         --permission-mode acceptEdits
  ```
  - `--restricted` quita las herramientas que ejecutan comandos y limita las de archivos al directorio de trabajo (comprobado: escribir fuera queda denegado);
  - el directorio de trabajo es `my-context/estudios/<asignatura>/`.
- **Respuesta del chat:** va como NDJSON (una línea JSON por evento en la respuesta de `POST mensaje`), no como Server-Sent Events: se lee más fácil con `fetch` y una petición POST. Los avisos de cambios de pizarra sí usan SSE (`GET eventos`, con `EventSource`). Es una concreción del spec (sección 3): apúntala como `Ruling:` en la Tarea 4.
- **Carpeta de conversaciones de Claude Code:** `~/.claude/projects/<ruta absoluta del directorio de trabajo con cada carácter que no sea [a-zA-Z0-9] cambiado por ->/`. Cada conversación es `<uuid>.jsonl`.
- **Pizarras en curso:** `estudios/<asignatura>/.en-curso/<uuid>/pizarra-<n>.json` y `…/imagenes/<nombre>`. **Historial:** `estudios/<asignatura>/pizarras/AAAA-MM-DD-<titulo>.json` y `…/pizarras/imagenes/<nombre>`.
- **Asignaturas:**
  - se guardan en `estudios/asignaturas.yaml`, con la clave `asignaturas:` y una lista de `{id, nombre, color}`;
  - «General» es fija en el código (id `general`) y no puede ir en el archivo;
  - el id encaja con `^[a-z0-9][a-z0-9-]{0,39}$`.
- **Pizarra:**
  - `version: 1`;
  - tipos de pieza: `texto`, `formula`, `grafica`, `dibujo`, `imagen` y `nota` (un tipo desconocido se ignora con un aviso);
  - `ancho` entre 40 y 2000.
- **Seguridad:**
  - el programa rechaza con 403 toda petición cuyo `Host` no sea `127.0.0.1:5174` o `localhost:5174`, y toda petición con un `Origin` distinto del suyo;
  - las rutas se comprueban con `rutaDentro`;
  - nunca se usa `eval`: las gráficas pasan por un intérprete propio;
  - el SVG de Claude se limpia con DOMPurify.

## Review Focus

1. **Rutas de Windows:** `fs.watch` y las herramientas de Claude dan rutas con `\`. Hay que reconocer las pizarras con `\` y con `/`. Pruebas: `interpretarCambio` (Tarea 10) y `describirHerramienta` (Tarea 2).
2. **Texto con tildes, ñ, emojis y saltos de línea** en el mensaje de Diego: debe llegar entero a Claude Code por stdin. Prueba en la Tarea 4 con «Ñandú 🦕» y dos líneas.
3. **Diego cierra la pestaña a mitad de respuesta:** el proceso de Claude se para (no se queda gastando suscripción) y la conversación no se queda bloqueada con 409. Prueba en la Tarea 4.
4. **Diego y Claude escriben la misma pizarra a la vez**, o la pizarra de Claude está rota justo cuando Diego mueve algo:
   - las operaciones de Diego van en cola y se aplican sobre la versión más nueva;
   - si la pizarra está rota, la operación se rechaza (409) en vez de sobrescribir el trabajo de Claude.

   Pruebas en la Tarea 10.
5. **La app lee una pizarra a medio escribir:** hay que seguir enseñando la última versión buena con un aviso, sin romperse. Prueba en la Tarea 10 (`leerPizarra` tras un archivo roto).

---

## Estructura de archivos

**Programa local (`local/`)**
- `principal.ts`: arranca el servidor (`npm run local`).
- `servidor.ts`: `crearServidor(opciones)`: rutas de la API, archivos estáticos y eventos.
- `seguridad.ts`: `hostPermitido`, `origenPermitido`, `rutaDentro` y la validación de ids.
- `claude.ts`: argumentos, traducción de `stream-json` a eventos y `lanzarClaude`.
- `conversaciones.ts`: carpeta, lista y lectura de los `.jsonl` de Claude Code.
- `pizarras.ts`: leer, crear, operar, validar después de cada respuesta y vigilar cambios.
- `instrucciones-estudio.md`: instrucciones que se añaden a Claude en la zona de estudio.
- `pruebas/claude-falso.ts`: imita a Claude Code en las pruebas.

**Compartido app ↔ programa (`src/estudio/`, imports con `.ts`)**
- `tipos.ts`: `Mensaje`, `ResumenConversacion`, `EventoChat`, `EventoPizarra`, `EstadoPizarra`.
- `contexto.ts`: añade y quita la cabecera `<contexto-estudio>` de los mensajes.
- `expresion.ts`: intérprete de expresiones de las gráficas.
- `pizarra.ts`: tipos, `validarPizarra`, operaciones y `serializarPizarra`.

**Solo app (`src/estudio/`)**
- `grafica.ts`: muestreo de curvas y marcas de los ejes.
- `geometria.ts`: vista (desplazar y zoom), encuadre y bordes de las flechas.
- `formulas.ts`: separar y volver a poner fórmulas `$…$` en el Markdown.
- `svg.ts`: limpiar el SVG de Claude.
- `chat.ts`: aplicar los eventos que llegan a la lista de mensajes.
- `local.ts`: cliente de la API local.
- `useLocal.ts`: detecta el programa local y escucha los cambios.
- `preferencias.ts`: `localStorage` con try/catch.
- `historial.ts`: nombres y entradas del historial.
- `historialRemoto.ts`: historial en GitHub.

**Resto de la app**
- `src/datos/asignaturas.ts`, `src/agenda/asignaturas.ts` y `src/texto.ts`: asignaturas y `aSlug`.
- `src/estado/optimista.ts`: guardado optimista de las casillas.
- `src/estado/cacheEstudio.ts`: caché del historial.
- `src/pantallas/Estudio.tsx`.
- `src/componentes/estudio/`: `PestanasAsignaturas`, `FormAsignatura`, `Chat`, `ListaConversaciones`, `EstudioLocal`, `Pizarra`, `PiezaPizarra`, `Grafica`, `Formula` e `Historial`.
- **Se modifican:**
  - `tsconfig.json`, `package.json`, `vite.config.ts` y `.github/workflows/desplegar.yml`;
  - `src/github/cliente.ts`, `src/repositorio.ts` y `src/datos/rutas.ts`;
  - `src/estado/datos.tsx` y `src/estado/cache.ts`;
  - `src/componentes/navegacion.ts`, `Lateral.tsx`, `Markdown.tsx`, `FilaTarea.tsx` y `FormTarea.tsx`;
  - `src/componentes/FormProyectoDesdeIdea.tsx` y `src/pantallas/Ideas.tsx`, `Inicio.tsx` y `Proyectos.tsx`;
  - `src/App.tsx` y `src/estilos.css`;
  - `src/datos/ideas.ts`, `src/fechas.ts` y `src/estado/hoy.ts`;
  - la documentación.

---

# Etapa 1: programa local y chat

### Task 1: Rama, configuración y seguridad del programa local

**Files:**
- Create: `local/seguridad.ts`, `local/seguridad.test.ts`, `.superpowers/sdd/2026-09-24-zona-de-estudio/progress.md`
- Modify: `tsconfig.json`, `.github/workflows/desplegar.yml`

**Interfaces:**
- Produces:
  - `hostPermitido(host: string | undefined, puerto: number): boolean`
  - `origenPermitido(origin: string | undefined, puerto: number): boolean`
  - `rutaDentro(base: string, relativa: string): string | null`
  - `esIdAsignatura(v: string): boolean`
  - `esIdConversacion(v: string): boolean`
  - `esNombreImagen(v: string): boolean`

- [ ] **Step 1: Crear la rama y el registro**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout -b zona-de-estudio
mkdir -p .superpowers/sdd/2026-09-24-zona-de-estudio
printf '# SDD ledger — plan: docs/superpowers/plans/2026-09-24-zona-de-estudio.md\nSpec: docs/superpowers/specs/2026-09-24-zona-de-estudio-design.md\n' > .superpowers/sdd/2026-09-24-zona-de-estudio/progress.md
```

- [ ] **Step 2: Configurar TypeScript para `local/`**

En `tsconfig.json`, añade dentro de `compilerOptions` (después de `"noEmit": true,`):

```json
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
```

y cambia `"include"` a:

```json
  "include": ["src", "local", "vite.config.ts"]
```

En `.github/workflows/desplegar.yml`, cambia `node-version: 22` por `node-version: 24`: el programa local y sus pruebas necesitan que Node ejecute TypeScript.

- [ ] **Step 3: Escribir la prueba (que falle)**

`local/seguridad.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { esIdAsignatura, esIdConversacion, esNombreImagen, hostPermitido, origenPermitido, rutaDentro } from './seguridad.ts';

describe('hostPermitido', () => {
  it('acepta 127.0.0.1 y localhost en su puerto', () => {
    expect(hostPermitido('127.0.0.1:5174', 5174)).toBe(true);
    expect(hostPermitido('localhost:5174', 5174)).toBe(true);
  });
  it('rechaza otros nombres (otra web que apunta a tu PC) y otros puertos', () => {
    expect(hostPermitido('malvado.com:5174', 5174)).toBe(false);
    expect(hostPermitido('127.0.0.1:80', 5174)).toBe(false);
    expect(hostPermitido(undefined, 5174)).toBe(false);
  });
});

describe('origenPermitido', () => {
  it('sin Origin (peticiones GET de la propia app) sí', () => {
    expect(origenPermitido(undefined, 5174)).toBe(true);
  });
  it('su propio origen sí', () => {
    expect(origenPermitido('http://127.0.0.1:5174', 5174)).toBe(true);
    expect(origenPermitido('http://localhost:5174', 5174)).toBe(true);
  });
  it('otra web no, ni siquiera la app publicada', () => {
    expect(origenPermitido('https://dino768.github.io', 5174)).toBe(false);
    expect(origenPermitido('null', 5174)).toBe(false);
  });
});

describe('rutaDentro', () => {
  const base = path.resolve('/tmp/estudios');
  it('una ruta de dentro devuelve la ruta absoluta', () => {
    expect(rutaDentro(base, 'fisica/a.json')).toBe(path.join(base, 'fisica', 'a.json'));
  });
  it('no deja salir con ..', () => {
    expect(rutaDentro(base, '../secreto.txt')).toBeNull();
    expect(rutaDentro(base, 'fisica/../../secreto.txt')).toBeNull();
  });
  it('no acepta rutas absolutas de fuera', () => {
    expect(rutaDentro(base, path.resolve('/otra/cosa'))).toBeNull();
  });
  it('la propia carpeta no es un archivo', () => {
    expect(rutaDentro(base, '.')).toBeNull();
    expect(rutaDentro(base, '')).toBeNull();
  });
});

describe('ids', () => {
  it('asignaturas: minúsculas, números y guiones (general también vale como carpeta)', () => {
    expect(esIdAsignatura('fisica')).toBe(true);
    expect(esIdAsignatura('calculo-2')).toBe(true);
    expect(esIdAsignatura('general')).toBe(true);
    expect(esIdAsignatura('Física')).toBe(false);
    expect(esIdAsignatura('../x')).toBe(false);
    expect(esIdAsignatura('')).toBe(false);
  });
  it('conversaciones: un uuid', () => {
    expect(esIdConversacion('be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3')).toBe(true);
    expect(esIdConversacion('abc')).toBe(false);
    expect(esIdConversacion('../be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3')).toBe(false);
  });
  it('imágenes: nombre simple con extensión de imagen', () => {
    expect(esNombreImagen('captura-1727180000000-12.png')).toBe(true);
    expect(esNombreImagen('foto.JPG')).toBe(true);
    expect(esNombreImagen('../a.png')).toBe(false);
    expect(esNombreImagen('a.exe')).toBe(false);
  });
});
```

- [ ] **Step 4: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/seguridad.test.ts`
Expected: FAIL, «Failed to load url ./seguridad.ts» (o parecido).

- [ ] **Step 5: Escribir el código**

`local/seguridad.ts`:

```ts
import path from 'node:path';

// El programa solo atiende a tu propio ordenador: así otra web no puede usar el chat ni leer tus archivos.
export function hostPermitido(host: string | undefined, puerto: number): boolean {
  return host === `127.0.0.1:${puerto}` || host === `localhost:${puerto}`;
}

// El navegador pone Origin cuando otra web hace una petición. Sin Origin es la propia app.
export function origenPermitido(origin: string | undefined, puerto: number): boolean {
  if (origin === undefined) return true;
  return origin === `http://127.0.0.1:${puerto}` || origin === `http://localhost:${puerto}`;
}

// Devuelve la ruta absoluta si queda dentro de `base`; si intenta salir, null.
export function rutaDentro(base: string, relativa: string): string | null {
  const absoluta = path.resolve(base, relativa);
  const rel = path.relative(base, absoluta);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return absoluta;
}

export const esIdAsignatura = (v: string) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(v);
export const esIdConversacion = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export const esNombreImagen = (v: string) => /^[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(v);
```

- [ ] **Step 6: Ejecutar las pruebas y el build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/seguridad.test.ts && npm run build`
Expected: PASS y el build termina sin errores. Si `erasableSyntaxOnly` da errores en código antiguo, quítala del `tsconfig.json` y apunta un `Ruling:` en el registro (Node sigue avisando al ejecutar si algo no se puede borrar).

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json .github/workflows/desplegar.yml local/seguridad.ts local/seguridad.test.ts
git commit -m "Programa local: configuración y comprobaciones de seguridad

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Hablar con Claude Code

**Files:**
- Create: `src/estudio/tipos.ts`, `local/claude.ts`, `local/claude.test.ts`, `local/pruebas/claude-falso.ts`

**Interfaces:**
- Produces:
  - En `src/estudio/tipos.ts`:
    ```ts
    export interface Mensaje { rol: 'diego' | 'claude' | 'herramienta'; texto: string; imagenes?: string[] }
    export interface ResumenConversacion { id: string; titulo: string; fecha: string }
    export type EventoChat =
      | { tipo: 'texto'; texto: string }
      | { tipo: 'herramienta'; texto: string }
      | { tipo: 'fin'; parado?: boolean }
      | { tipo: 'error'; mensaje: string; uso?: boolean };
    export interface EventoPizarra { tipo: 'pizarra'; asignatura: string; conversacion: string; n: number }
    ```
  - En `local/claude.ts`:
    - `OpcionesClaude { mensaje, id, nueva, cwd, instrucciones }` y `Comando { bin: string; previos: string[] }`;
    - `argumentosClaude(o): string[]`;
    - `describirHerramienta(nombre, entrada): string`;
    - `explicarError(texto, estado?): { mensaje: string; uso?: boolean }`;
    - `crearTraductor(): (linea: string) => EventoChat[]`;
    - `lanzarClaude(cmd, o, alEvento): Proceso` con `Proceso { parar(): void; terminado: Promise<void> }`;
    - `NO_ENCONTRADO: string`.

- [ ] **Step 1: Crear los tipos compartidos**

`src/estudio/tipos.ts` (este archivo lo usan la app y el programa local):

```ts
// Tipos que comparten la app y el programa local.

export interface Mensaje {
  rol: 'diego' | 'claude' | 'herramienta';
  texto: string;
  imagenes?: string[];
}

export interface ResumenConversacion {
  id: string;
  titulo: string;
  fecha: string; // ISO con hora (última vez que cambió)
}

// Lo que el programa local va mandando mientras Claude contesta.
export type EventoChat =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramienta'; texto: string }
  | { tipo: 'fin'; parado?: boolean }
  | { tipo: 'error'; mensaje: string; uso?: boolean };

// Aviso de que una pizarra en curso ha cambiado en el disco.
export interface EventoPizarra {
  tipo: 'pizarra';
  asignatura: string;
  conversacion: string;
  n: number;
}
```

- [ ] **Step 2: Crear el Claude de mentira**

`local/pruebas/claude-falso.ts`:

```ts
// Imita la salida de «claude -p --output-format stream-json» para las pruebas, sin gastar la suscripción.
// Palabras clave en el mensaje: ERROR-USO, CORTAR, LENTO, PIZARRA-MALA (y «no es válida» para arreglarla).
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let entrada = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (entrada += d));
process.stdin.on('end', () => void responder());

const escribir = (o: unknown) => process.stdout.write(JSON.stringify(o) + '\n');
const texto = (t: string) =>
  escribir({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } } });
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function responder() {
  if (process.env.FALSO_REGISTRO)
    appendFileSync(process.env.FALSO_REGISTRO, JSON.stringify({ args, entrada, cwd: process.cwd() }) + '\n');
  escribir({ type: 'system', subtype: 'init', session_id: 'falso' });
  if (entrada.includes('ERROR-USO')) {
    escribir({ type: 'result', subtype: 'success', is_error: true, result: 'Claude AI usage limit reached', api_error_status: 429 });
    return;
  }
  if (entrada.includes('CORTAR')) {
    texto('Empiezo…');
    process.exit(1);
  }
  if (entrada.includes('LENTO')) {
    texto('Voy ');
    await esperar(10_000);
  }
  const carpeta = /^Pizarras de esta conversación: (.+)$/m.exec(entrada)?.[1];
  if (carpeta && (entrada.includes('PIZARRA-MALA') || entrada.includes('no es válida'))) {
    mkdirSync(carpeta, { recursive: true });
    const archivo = path.join(carpeta, 'pizarra-1.json');
    const buena = entrada.includes('no es válida');
    writeFileSync(
      archivo,
      buena
        ? JSON.stringify({ version: 1, titulo: 'Arreglada', piezas: [], flechas: [], guardarComo: null, guardadaEn: null })
        : '{ "version": 1, "piezas": [',
    );
    escribir({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: archivo } }] } });
  }
  texto('Hola ');
  texto('Diego');
  escribir({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hola Diego' }] } });
  escribir({ type: 'result', subtype: 'success', is_error: false, result: 'Hola Diego' });
}
```

- [ ] **Step 3: Escribir la prueba (que falle)**

`local/claude.test.ts`:

```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { EventoChat } from '../src/estudio/tipos.ts';
import {
  argumentosClaude, crearTraductor, describirHerramienta, lanzarClaude, NO_ENCONTRADO, type Comando, type OpcionesClaude,
} from './claude.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const FALSO: Comando = { bin: process.execPath, previos: [path.join(aqui, 'pruebas', 'claude-falso.ts')] };
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const opciones = (mensaje: string, extra: Partial<OpcionesClaude> = {}): OpcionesClaude => ({
  mensaje, id: ID, nueva: true, cwd: os.tmpdir(), instrucciones: '/x/instrucciones.md', ...extra,
});

async function conversar(cmd: Comando, o: OpcionesClaude, alPrimerTexto?: (parar: () => void) => void) {
  const eventos: EventoChat[] = [];
  const p = lanzarClaude(cmd, o, (e) => {
    eventos.push(e);
    if (e.tipo === 'texto' && eventos.filter((x) => x.tipo === 'texto').length === 1) alPrimerTexto?.(p.parar);
  });
  await p.terminado;
  return eventos;
}

describe('argumentosClaude', () => {
  it('conversación nueva: --session-id, modo restringido y el mensaje fuera de los argumentos', () => {
    const a = argumentosClaude(opciones('hola'));
    expect(a).toContain('--session-id');
    expect(a).toContain(ID);
    expect(a).not.toContain('--resume');
    expect(a).toContain('--restricted');
    expect(a).toEqual(expect.arrayContaining(['--tools', 'Read,Write,Edit,Glob,Grep', '--permission-mode', 'acceptEdits']));
    expect(a).toEqual(expect.arrayContaining(['--append-system-prompt-file', '/x/instrucciones.md']));
    expect(a).not.toContain('hola');
  });
  it('conversación que sigue: --resume', () => {
    const a = argumentosClaude(opciones('hola', { nueva: false }));
    expect(a).toEqual(expect.arrayContaining(['--resume', ID]));
    expect(a).not.toContain('--session-id');
  });
});

describe('describirHerramienta', () => {
  it('reconoce las pizarras con rutas de Windows y de Linux', () => {
    expect(describirHerramienta('Write', { file_path: 'C:\\x\\.en-curso\\id\\pizarra-3.json' })).toBe('✏️ Ha dibujado en la pizarra 3');
    expect(describirHerramienta('Edit', { file_path: '/x/.en-curso/id/pizarra-12.json' })).toBe('✏️ Ha dibujado en la pizarra 12');
  });
  it('otras herramientas', () => {
    expect(describirHerramienta('Read', { file_path: 'C:\\x\\imagenes\\captura-1.png' })).toBe('👀 Ha mirado captura-1.png');
    expect(describirHerramienta('Read', { file_path: '/x/apuntes.md' })).toBe('📖 Ha leído apuntes.md');
    expect(describirHerramienta('Grep', {})).toBe('🔎 Ha buscado en tus apuntes');
    expect(describirHerramienta('Otra', null)).toBe('🔧 Otra');
  });
});

describe('crearTraductor', () => {
  const t = () => crearTraductor();
  it('texto que llega poco a poco', () => {
    expect(t()('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hola"}}}')).toEqual([
      { tipo: 'texto', texto: 'Hola' },
    ]);
  });
  it('separa dos bloques de texto con una línea en blanco', () => {
    const tr = t();
    tr('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}}');
    expect(tr('{"type":"stream_event","event":{"type":"content_block_start","content_block":{"type":"text","text":""}}}')).toEqual([
      { tipo: 'texto', texto: '\n\n' },
    ]);
  });
  it('uso de herramienta → línea gris', () => {
    const linea = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/a/pizarra-2.json' } }] } });
    expect(t()(linea)).toEqual([{ tipo: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 2' }]);
  });
  it('final bien, límite de uso y líneas raras', () => {
    expect(t()('{"type":"result","subtype":"success","is_error":false,"result":"x"}')).toEqual([{ tipo: 'fin' }]);
    const [e] = t()('{"type":"result","subtype":"success","is_error":true,"result":"usage limit reached","api_error_status":429}');
    expect(e).toMatchObject({ tipo: 'error', uso: true });
    expect(t()('no es json')).toEqual([]);
    expect(t()('{"type":"system","subtype":"init"}')).toEqual([]);
  });
});

describe('lanzarClaude (con el Claude de mentira)', () => {
  it('manda el mensaje por stdin en su carpeta y devuelve el texto', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'estudio-'));
    const registro = path.join(dir, 'registro.jsonl');
    process.env.FALSO_REGISTRO = registro;
    const eventos = await conversar(FALSO, opciones('Ñandú 🦕\nlínea 2', { cwd: dir }));
    delete process.env.FALSO_REGISTRO;
    expect(eventos).toEqual([{ tipo: 'texto', texto: 'Hola ' }, { tipo: 'texto', texto: 'Diego' }, { tipo: 'fin' }]);
    const r = JSON.parse(readFileSync(registro, 'utf8').trim());
    expect(r.entrada).toBe('Ñandú 🦕\nlínea 2');
    expect(path.resolve(r.cwd)).toBe(path.resolve(dir));
  });
  it('límite de uso', async () => {
    const eventos = await conversar(FALSO, opciones('ERROR-USO'));
    expect(eventos.at(-1)).toMatchObject({ tipo: 'error', uso: true });
  });
  it('se corta a medias', async () => {
    const eventos = await conversar(FALSO, opciones('CORTAR'));
    expect(eventos[0]).toEqual({ tipo: 'texto', texto: 'Empiezo…' });
    expect(eventos.at(-1)).toMatchObject({ tipo: 'error' });
    expect((eventos.at(-1) as { mensaje: string }).mensaje).toMatch(/cortado/);
  });
  it('parar', async () => {
    const eventos = await conversar(FALSO, opciones('LENTO'), (parar) => parar());
    expect(eventos.at(-1)).toEqual({ tipo: 'fin', parado: true });
  }, 8000);
  it('Claude Code no instalado', async () => {
    const eventos = await conversar({ bin: 'no-existe-claude-xyz', previos: [] }, opciones('hola'));
    expect(eventos).toEqual([{ tipo: 'error', mensaje: NO_ENCONTRADO }]);
  });
});
```

- [ ] **Step 4: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/claude.test.ts`
Expected: FAIL, no encuentra `./claude.ts`.

- [ ] **Step 5: Escribir el código**

`local/claude.ts`:

```ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { EventoChat } from '../src/estudio/tipos.ts';

export interface OpcionesClaude {
  mensaje: string;
  id: string;
  nueva: boolean;
  cwd: string;
  instrucciones: string;
}

export interface Comando {
  bin: string;
  previos: string[];
}

export interface Proceso {
  parar(): void;
  terminado: Promise<void>;
}

export const NO_ENCONTRADO =
  'No encuentro Claude Code en este ordenador. Comprueba que el comando «claude» funciona en una terminal.';

// El mensaje va por stdin (así los saltos de línea, tildes y emojis llegan enteros en Windows).
export function argumentosClaude(o: OpcionesClaude): string[] {
  return [
    '-p',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    ...(o.nueva ? ['--session-id', o.id] : ['--resume', o.id]),
    '--append-system-prompt-file', o.instrucciones,
    // Sin comandos y con los archivos limitados a la carpeta de la asignatura.
    '--restricted',
    '--tools', 'Read,Write,Edit,Glob,Grep',
    '--strict-mcp-config',
    '--permission-mode', 'acceptEdits',
  ];
}

export function describirHerramienta(nombre: string, entrada: unknown): string {
  const e = (typeof entrada === 'object' && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const archivo = typeof e.file_path === 'string' ? path.posix.basename(e.file_path.replace(/\\/g, '/')) : '';
  const pizarra = /^pizarra-(\d+)\.json$/.exec(archivo);
  if ((nombre === 'Write' || nombre === 'Edit') && pizarra) return `✏️ Ha dibujado en la pizarra ${pizarra[1]}`;
  if (nombre === 'Write' || nombre === 'Edit') return `✏️ Ha escrito ${archivo}`;
  if (nombre === 'Read' && pizarra) return `👀 Ha mirado la pizarra ${pizarra[1]}`;
  if (nombre === 'Read' && /\.(png|jpe?g|webp|gif)$/i.test(archivo)) return `👀 Ha mirado ${archivo}`;
  if (nombre === 'Read') return `📖 Ha leído ${archivo}`;
  if (nombre === 'Glob' || nombre === 'Grep') return '🔎 Ha buscado en tus apuntes';
  return `🔧 ${nombre}`;
}

export function explicarError(texto: string, estado?: number): { mensaje: string; uso?: boolean } {
  if (estado === 429 || /usage limit|rate limit|limit reached|límite/i.test(texto))
    return {
      mensaje: 'Has llegado al límite de uso de tu suscripción de Claude. Mira cuándo se renueva en «Uso de Claude».',
      uso: true,
    };
  if (estado === 401 || /log ?in|authenticat|oauth|credential/i.test(texto))
    return { mensaje: 'Claude Code necesita que vuelvas a iniciar sesión: abre una terminal, escribe claude y sigue los pasos.' };
  return { mensaje: `Claude Code ha dado un error: ${texto || 'sin detalles'}` };
}

// Traduce cada línea de «stream-json» a los eventos que entiende la app.
export function crearTraductor(): (linea: string) => EventoChat[] {
  let hayTexto = false;
  return (linea) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let j: any;
    try {
      j = JSON.parse(linea);
    } catch {
      return [];
    }
    if (j?.type === 'stream_event') {
      const ev = j.event;
      if (ev?.type === 'content_block_start' && ev.content_block?.type === 'text' && hayTexto)
        return [{ tipo: 'texto', texto: '\n\n' }];
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && typeof ev.delta.text === 'string') {
        hayTexto = true;
        return [{ tipo: 'texto', texto: ev.delta.text }];
      }
      return [];
    }
    if (j?.type === 'assistant' && Array.isArray(j.message?.content))
      return j.message.content
        .filter((c: { type?: string }) => c?.type === 'tool_use')
        .map((c: { name?: unknown; input?: unknown }) => ({ tipo: 'herramienta', texto: describirHerramienta(String(c.name), c.input) }));
    if (j?.type === 'result') {
      if (!j.is_error && j.subtype === 'success') return [{ tipo: 'fin' }];
      return [{ tipo: 'error', ...explicarError(String(j.result ?? j.subtype ?? ''), j.api_error_status ?? undefined) }];
    }
    return [];
  };
}

export function lanzarClaude(cmd: Comando, o: OpcionesClaude, alEvento: (e: EventoChat) => void): Proceso {
  const hijo = spawn(cmd.bin, [...cmd.previos, ...argumentosClaude(o)], { cwd: o.cwd, windowsHide: true });
  const traducir = crearTraductor();
  let avisado = false;
  let parado = false;
  let errores = '';
  // Después de «fin» o «error» no se manda nada más.
  const avisar = (e: EventoChat) => {
    if (avisado) return;
    if (e.tipo === 'fin' || e.tipo === 'error') avisado = true;
    alEvento(e);
  };

  hijo.stdin.on('error', () => undefined); // si el proceso muere antes de leer el mensaje
  hijo.stdin.end(o.mensaje);
  createInterface({ input: hijo.stdout }).on('line', (l) => {
    for (const e of traducir(l)) avisar(e);
  });
  hijo.stderr.on('data', (d) => {
    errores = (errores + String(d)).slice(-2000);
  });

  const terminado = new Promise<void>((resolver) => {
    let hecho = false;
    const acabar = (codigo: number | null, fallo?: NodeJS.ErrnoException) => {
      if (hecho) return;
      hecho = true;
      if (parado) avisar({ tipo: 'fin', parado: true });
      else if (fallo?.code === 'ENOENT') avisar({ tipo: 'error', mensaje: NO_ENCONTRADO });
      else if (fallo) avisar({ tipo: 'error', mensaje: fallo.message });
      else if (errores.trim()) avisar({ tipo: 'error', ...explicarError(errores.trim()) });
      else avisar({ tipo: 'error', mensaje: `La respuesta se ha cortado (código ${codigo ?? '?'}).` });
      resolver();
    };
    hijo.on('error', (e) => acabar(null, e));
    hijo.on('close', (codigo) => acabar(codigo));
  });

  return {
    parar: () => {
      parado = true;
      hijo.kill();
    },
    terminado,
  };
}
```

- [ ] **Step 6: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/claude.test.ts`
Expected: PASS (11 pruebas).

- [ ] **Step 7: Commit**

```bash
git add src/estudio/tipos.ts local/claude.ts local/claude.test.ts local/pruebas/claude-falso.ts
git commit -m "Programa local: lanzar Claude Code y traducir su respuesta

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Leer las conversaciones guardadas

**Files:**
- Create: `src/estudio/contexto.ts`, `src/estudio/contexto.test.ts`, `local/conversaciones.ts`, `local/conversaciones.test.ts`

**Interfaces:**
- Consumes: `Mensaje` y `ResumenConversacion` (Task 2) y `describirHerramienta` (Task 2).
- Produces:
  - En `contexto.ts`:
    - `interface Contexto { asignatura: string; carpeta: string; pizarraAbierta: number | null; imagenes: string[] }`;
    - `conContexto(c: Contexto, texto: string): string`;
    - `sinContexto(texto: string): { texto: string; imagenes: string[] }`.
  - En `conversaciones.ts`:
    - `carpetaConversaciones(cwd: string, home?: string): string`;
    - `leerConversacion(texto: string): Mensaje[]`;
    - `tituloConversacion(ms: Mensaje[]): string`;
    - `listarConversaciones(carpeta: string): Promise<ResumenConversacion[]>`;
    - `leerConversacionDe(carpeta: string, id: string): Promise<Mensaje[]>`.

- [ ] **Step 1: Escribir las pruebas (que fallen)**

`src/estudio/contexto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { conContexto, sinContexto } from './contexto.ts';

describe('contexto del mensaje', () => {
  const c = { asignatura: 'fisica', carpeta: 'C:\\e\\fisica\\.en-curso\\id', pizarraAbierta: 2, imagenes: ['C:\\e\\fisica\\.en-curso\\id\\imagenes\\captura-1.png'] };
  it('añade la cabecera y la quita al leer', () => {
    const m = conContexto(c, '¿Qué es una fuerza?');
    expect(m).toContain('Asignatura: fisica');
    expect(m).toContain('Pizarras de esta conversación: C:\\e\\fisica\\.en-curso\\id');
    expect(m).toContain('Pizarra abierta: pizarra-2.json');
    expect(sinContexto(m)).toEqual({ texto: '¿Qué es una fuerza?', imagenes: ['captura-1.png'] });
  });
  it('sin pizarra abierta ni imágenes', () => {
    const m = conContexto({ ...c, pizarraAbierta: null, imagenes: [] }, 'Hola');
    expect(m).toContain('Pizarra abierta: ninguna');
    expect(m).not.toContain('Capturas');
    expect(sinContexto(m)).toEqual({ texto: 'Hola', imagenes: [] });
  });
  it('un mensaje escrito en la terminal se queda igual', () => {
    expect(sinContexto('hola')).toEqual({ texto: 'hola', imagenes: [] });
  });
});
```

`local/conversaciones.test.ts`:

```ts
import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { conContexto } from '../src/estudio/contexto.ts';
import { carpetaConversaciones, leerConversacion, listarConversaciones, tituloConversacion } from './conversaciones.ts';

const lineas = (...os: unknown[]) => os.map((o) => JSON.stringify(o)).join('\n') + '\n';
const usuario = (content: unknown, extra = {}) => ({ type: 'user', message: { role: 'user', content }, ...extra });
const claude = (content: unknown[]) => ({ type: 'assistant', message: { role: 'assistant', content } });

describe('carpetaConversaciones', () => {
  it('cambia lo que no es letra o número por guiones, como Claude Code', () => {
    const cwd = path.join(os.tmpdir(), 'mi carpeta', 'física');
    expect(carpetaConversaciones(cwd, '/casa')).toBe(path.join('/casa', '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-')));
  });
  it.runIf(process.platform === 'win32')('ejemplo real de Windows', () => {
    expect(path.basename(carpetaConversaciones('C:\\Users\\Diego\\Desktop\\my-context\\estudios\\fisica', 'C:\\Users\\Diego'))).toBe(
      'C--Users-Diego-Desktop-my-context-estudios-fisica',
    );
  });
});

describe('leerConversacion', () => {
  const texto = lineas(
    { type: 'mode', mode: 'x' },
    usuario(conContexto({ asignatura: 'fisica', carpeta: '/c', pizarraAbierta: null, imagenes: ['/c/imagenes/captura-1.png'] }, '¿Qué es una fuerza?')),
    usuario('<command-name>/clear</command-name>'),
    usuario([{ type: 'text', text: 'instrucciones internas' }], { isMeta: true }),
    claude([{ type: 'thinking', thinking: '' }]),
    claude([{ type: 'text', text: 'Una fuerza es…' }]),
    claude([{ type: 'tool_use', name: 'Write', input: { file_path: '/c/pizarra-1.json' } }]),
    usuario([{ type: 'tool_result', content: 'ok' }]),
    claude([{ type: 'text', text: 'Mira la pizarra.' }]),
    claude([{ type: 'text', text: 'Y otra cosa.' }]),
    usuario([{ type: 'text', text: 'Gracias' }]),
  ) + 'línea rota {\n';

  it('saca solo los mensajes de Diego y de Claude, y resume las herramientas', () => {
    expect(leerConversacion(texto)).toEqual([
      { rol: 'diego', texto: '¿Qué es una fuerza?', imagenes: ['captura-1.png'] },
      { rol: 'claude', texto: 'Una fuerza es…' },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' },
      { rol: 'claude', texto: 'Mira la pizarra.\n\nY otra cosa.' },
      { rol: 'diego', texto: 'Gracias' },
    ]);
  });
  it('título: la primera pregunta, recortada a 60 caracteres', () => {
    expect(tituloConversacion(leerConversacion(texto))).toBe('¿Qué es una fuerza?');
    expect(tituloConversacion([{ rol: 'diego', texto: 'a'.repeat(80) }])).toBe(`${'a'.repeat(59)}…`);
    expect(tituloConversacion([])).toBe('');
  });
});

describe('listarConversaciones', () => {
  it('lista de la más reciente a la más antigua y salta las vacías', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'convs-'));
    mkdirSync(dir, { recursive: true });
    const a = 'aaaaaaaa-0000-4000-8000-000000000001';
    const b = 'bbbbbbbb-0000-4000-8000-000000000002';
    writeFileSync(path.join(dir, `${a}.jsonl`), lineas(usuario('Primera')));
    writeFileSync(path.join(dir, `${b}.jsonl`), lineas(usuario('Segunda')));
    writeFileSync(path.join(dir, 'vacia.jsonl'), lineas({ type: 'mode' }));
    utimesSync(path.join(dir, `${a}.jsonl`), new Date('2026-09-20'), new Date('2026-09-20'));
    utimesSync(path.join(dir, `${b}.jsonl`), new Date('2026-09-22'), new Date('2026-09-22'));
    const lista = await listarConversaciones(dir);
    expect(lista.map((c) => [c.id, c.titulo])).toEqual([[b, 'Segunda'], [a, 'Primera']]);
  });
  it('carpeta que no existe → lista vacía', async () => {
    expect(await listarConversaciones(path.join(os.tmpdir(), 'no-existe-xyz'))).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/contexto.test.ts local/conversaciones.test.ts`
Expected: FAIL, no existen los módulos.

- [ ] **Step 3: Escribir el código**

`src/estudio/contexto.ts`:

```ts
// Cada mensaje que la app manda a Claude lleva delante una cabecera con la asignatura,
// dónde están las pizarras y las capturas. Al enseñar la conversación, la cabecera se quita.
const INICIO = '<contexto-estudio>';
const FIN = '</contexto-estudio>';

export interface Contexto {
  asignatura: string;
  carpeta: string;
  pizarraAbierta: number | null;
  imagenes: string[]; // rutas absolutas
}

export function conContexto(c: Contexto, texto: string): string {
  const lineas = [
    `Asignatura: ${c.asignatura}`,
    `Pizarras de esta conversación: ${c.carpeta}`,
    `Pizarra abierta: ${c.pizarraAbierta === null ? 'ninguna' : `pizarra-${c.pizarraAbierta}.json`}`,
  ];
  if (c.imagenes.length) lineas.push(`Capturas adjuntas: ${c.imagenes.join(', ')}`);
  return `${INICIO}\n${lineas.join('\n')}\n${FIN}\n\n${texto}`;
}

export function sinContexto(texto: string): { texto: string; imagenes: string[] } {
  if (!texto.startsWith(INICIO)) return { texto, imagenes: [] };
  const fin = texto.indexOf(FIN);
  if (fin === -1) return { texto, imagenes: [] };
  const cabecera = texto.slice(INICIO.length, fin);
  const m = /^Capturas adjuntas: (.+)$/m.exec(cabecera);
  const imagenes = m ? m[1].split(', ').map((r) => r.split(/[\\/]/).pop() ?? r) : [];
  return { texto: texto.slice(fin + FIN.length).replace(/^\n+/, ''), imagenes };
}
```

`local/conversaciones.ts`:

```ts
import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sinContexto } from '../src/estudio/contexto.ts';
import type { Mensaje, ResumenConversacion } from '../src/estudio/tipos.ts';
import { describirHerramienta } from './claude.ts';

// Claude Code guarda las conversaciones de cada carpeta en ~/.claude/projects/<ruta con guiones>/.
export function carpetaConversaciones(cwd: string, home = os.homedir()): string {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
}

function textoDeDiego(contenido: unknown): { texto: string; imagenes: string[] } | null {
  let texto: string;
  if (typeof contenido === 'string') texto = contenido;
  else if (Array.isArray(contenido)) {
    const textos = contenido
      .filter((c): c is { type: 'text'; text: string } => c?.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text);
    if (!textos.length) return null; // solo resultados de herramientas
    texto = textos.join('\n');
  } else return null;
  const limpio = sinContexto(texto);
  // Órdenes internas de Claude Code (/comandos, avisos): empiezan por una etiqueta.
  if (!limpio.texto.trim() || limpio.texto.trimStart().startsWith('<')) return null;
  return limpio;
}

export function leerConversacion(texto: string): Mensaje[] {
  const mensajes: Mensaje[] = [];
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let j: any;
    try {
      j = JSON.parse(linea);
    } catch {
      continue;
    }
    if (j.isMeta || j.isSidechain) continue;
    if (j.type === 'user') {
      const d = textoDeDiego(j.message?.content);
      if (d) mensajes.push(d.imagenes.length ? { rol: 'diego', texto: d.texto, imagenes: d.imagenes } : { rol: 'diego', texto: d.texto });
    } else if (j.type === 'assistant' && Array.isArray(j.message?.content)) {
      for (const c of j.message.content) {
        if (c?.type === 'text' && typeof c.text === 'string' && c.text.trim()) {
          const ultimo = mensajes.at(-1);
          if (ultimo?.rol === 'claude') ultimo.texto += `\n\n${c.text}`;
          else mensajes.push({ rol: 'claude', texto: c.text });
        } else if (c?.type === 'tool_use') {
          mensajes.push({ rol: 'herramienta', texto: describirHerramienta(String(c.name), c.input) });
        }
      }
    }
  }
  return mensajes;
}

export function tituloConversacion(mensajes: Mensaje[]): string {
  const primera = mensajes.find((m) => m.rol === 'diego')?.texto.replace(/\s+/g, ' ').trim() ?? '';
  return primera.length > 60 ? `${primera.slice(0, 59)}…` : primera;
}

export async function listarConversaciones(carpeta: string): Promise<ResumenConversacion[]> {
  let nombres: string[];
  try {
    nombres = await readdir(carpeta);
  } catch {
    return [];
  }
  const lista = await Promise.all(
    nombres
      .filter((n) => n.endsWith('.jsonl'))
      .map(async (n): Promise<ResumenConversacion | null> => {
        const ruta = path.join(carpeta, n);
        const [texto, info] = await Promise.all([readFile(ruta, 'utf8'), stat(ruta)]);
        const titulo = tituloConversacion(leerConversacion(texto));
        return titulo ? { id: n.slice(0, -'.jsonl'.length), titulo, fecha: info.mtime.toISOString() } : null;
      }),
  );
  return lista.filter((c): c is ResumenConversacion => c !== null).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function leerConversacionDe(carpeta: string, id: string): Promise<Mensaje[]> {
  try {
    return leerConversacion(await readFile(path.join(carpeta, `${id}.jsonl`), 'utf8'));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/contexto.test.ts local/conversaciones.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/contexto.ts src/estudio/contexto.test.ts local/conversaciones.ts local/conversaciones.test.ts
git commit -m "Programa local: leer las conversaciones de Claude Code

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: El servidor local (chat, capturas y eventos)

**Files:**
- Create: `local/servidor.ts`, `local/servidor.test.ts`, `local/principal.ts`, `local/instrucciones-estudio.md`
- Modify: `package.json` (script `local`), `vite.config.ts` (el service worker no toca `api/`)

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces:
  - `crearServidor(o: OpcionesServidor): { servidor: http.Server; emitirATodos(e: EventoPizarra): void }` con `OpcionesServidor { puerto; estudios; dist; home; comando: Comando; instrucciones }`.
  - Rutas bajo `/segundo-cerebro-app/api/local/`:

    | Ruta | Recibe | Devuelve |
    |---|---|---|
    | `GET estado` | — | `{ok:true}` |
    | `GET conversaciones` | `?asignatura` | `ResumenConversacion[]` |
    | `GET conversacion` | `?asignatura&id` | `Mensaje[]` |
    | `POST mensaje` | `{asignatura,id,nueva,texto,imagenes,pizarraAbierta}` | `EventoChat`, uno por línea (NDJSON) |
    | `POST parar` | `{id}` | — |
    | `POST imagen` | `?asignatura&id`, cuerpo = la imagen | `{nombre}` |
    | `GET archivo` | `?asignatura&id&ruta` | el archivo |
    | `GET eventos` | — | Server-Sent Events con `EventoPizarra` |

- [ ] **Step 1: Escribir la prueba (que falle)**

`local/servidor.test.ts`:

```ts
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { carpetaConversaciones } from './conversaciones.ts';
import { crearServidor } from './servidor.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FALSO = { bin: process.execPath, previos: [path.join(aqui, 'pruebas', 'claude-falso.ts')] };
const PUERTO = 5300 + Math.floor(Math.random() * 600);
const BASE = `http://127.0.0.1:${PUERTO}/segundo-cerebro-app/`;
const API = `${BASE}api/local/`;
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const raiz = mkdtempSync(path.join(os.tmpdir(), 'servidor-'));
const estudios = path.join(raiz, 'my-context', 'estudios');
const dist = path.join(raiz, 'dist');
const home = path.join(raiz, 'casa');
const registro = path.join(raiz, 'registro.jsonl');
let cerrar: () => void;

const post = (ruta: string, cuerpo: unknown, headers: Record<string, string> = {}) =>
  fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(cuerpo) });
const eventos = async (r: Response) => (await r.text()).trim().split('\n').map((l) => JSON.parse(l));
const registrado = () => readFileSync(registro, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

beforeAll(async () => {
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>app</title>');
  writeFileSync(path.join(dist, 'assets', 'a.js'), 'console.log(1)');
  const convs = carpetaConversaciones(path.join(estudios, 'fisica'), home);
  mkdirSync(convs, { recursive: true });
  writeFileSync(path.join(convs, `${ID}.jsonl`), JSON.stringify({ type: 'user', message: { role: 'user', content: 'Primera pregunta' } }) + '\n');
  process.env.FALSO_REGISTRO = registro;
  const { servidor } = crearServidor({ puerto: PUERTO, estudios, dist, home, comando: FALSO, instrucciones: path.join(raiz, 'i.md') });
  await new Promise<void>((r) => servidor.listen(PUERTO, '127.0.0.1', r));
  cerrar = () => servidor.close();
});
afterAll(() => {
  delete process.env.FALSO_REGISTRO;
  cerrar();
});

describe('seguridad', () => {
  it('rechaza otra web (Origin)', async () => {
    const r = await fetch(`${API}estado`, { headers: { Origin: 'https://malvado.com' } });
    expect(r.status).toBe(403);
  });
  it('rechaza otro nombre de host', async () => {
    const estado = await new Promise<number>((resolver) => {
      http.get({ host: '127.0.0.1', port: PUERTO, path: '/segundo-cerebro-app/api/local/estado', headers: { Host: 'malvado.com' } }, (res) => {
        res.resume();
        resolver(res.statusCode ?? 0);
      });
    });
    expect(estado).toBe(403);
  });
  it('asignatura no válida → 400', async () => {
    expect((await fetch(`${API}conversaciones?asignatura=..%2Fx`)).status).toBe(400);
  });
});

describe('app', () => {
  it('sirve la app, cualquier pantalla sin extensión da index.html, y / redirige', async () => {
    expect(await (await fetch(BASE)).text()).toContain('<title>app</title>');
    expect(await (await fetch(`${BASE}estudio`)).text()).toContain('<title>app</title>');
    expect(await (await fetch(`${BASE}assets/a.js`)).text()).toBe('console.log(1)');
    expect((await fetch(`${BASE}assets/no.js`)).status).toBe(404);
    const r = await fetch(`http://127.0.0.1:${PUERTO}/`, { redirect: 'manual' });
    expect(r.status).toBe(302);
  });
  it('estado', async () => {
    expect(await (await fetch(`${API}estado`)).json()).toEqual({ ok: true });
  });
});

describe('conversaciones', () => {
  it('lista y lee las de la asignatura', async () => {
    const lista = await (await fetch(`${API}conversaciones?asignatura=fisica`)).json();
    expect(lista).toMatchObject([{ id: ID, titulo: 'Primera pregunta' }]);
    const ms = await (await fetch(`${API}conversacion?asignatura=fisica&id=${ID}`)).json();
    expect(ms).toEqual([{ rol: 'diego', texto: 'Primera pregunta' }]);
    expect(await (await fetch(`${API}conversaciones?asignatura=calculo`)).json()).toEqual([]);
  });
});

describe('mensaje', () => {
  it('lanza Claude en la carpeta de la asignatura con la cabecera y devuelve los eventos', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const r = await post('mensaje', { asignatura: 'fisica', id, nueva: true, texto: 'Ñandú 🦕\nlínea 2', imagenes: [], pizarraAbierta: null });
    expect(await eventos(r)).toEqual([{ tipo: 'texto', texto: 'Hola ' }, { tipo: 'texto', texto: 'Diego' }, { tipo: 'fin' }]);
    const ultimo = registrado().at(-1);
    expect(path.resolve(ultimo.cwd)).toBe(path.resolve(estudios, 'fisica'));
    expect(ultimo.args).toContain('--session-id');
    expect(ultimo.entrada).toContain('Asignatura: fisica');
    expect(ultimo.entrada).toContain('Ñandú 🦕\nlínea 2');
  });
  it('mensaje vacío → 400', async () => {
    expect((await post('mensaje', { asignatura: 'fisica', id: ID, nueva: false, texto: '  ', imagenes: [] })).status).toBe(400);
  });
  it('una respuesta a la vez por conversación, y parar', async () => {
    const id = '22222222-2222-4222-8222-222222222222';
    const primera = post('mensaje', { asignatura: 'fisica', id, nueva: true, texto: 'LENTO', imagenes: [] });
    await new Promise((r) => setTimeout(r, 800));
    expect((await post('mensaje', { asignatura: 'fisica', id, nueva: false, texto: 'otra', imagenes: [] })).status).toBe(409);
    await post('parar', { id });
    expect((await eventos(await primera)).at(-1)).toEqual({ tipo: 'fin', parado: true });
  }, 10000);
  it('si Diego cierra la pestaña, Claude se para y la conversación queda libre', async () => {
    const id = '44444444-4444-4444-8444-444444444444';
    const control = new AbortController();
    const cortada = fetch(`${API}mensaje`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: control.signal,
      body: JSON.stringify({ asignatura: 'fisica', id, nueva: true, texto: 'LENTO', imagenes: [] }),
    }).catch(() => undefined);
    await new Promise((res) => setTimeout(res, 800));
    control.abort(); // como cerrar la pestaña
    await cortada;
    await new Promise((res) => setTimeout(res, 800));
    // Sin el arreglo, esto daría 409 durante 10 segundos (Claude seguiría contestando a nadie).
    const otra = await post('mensaje', { asignatura: 'fisica', id, nueva: false, texto: 'hola', imagenes: [] });
    expect(otra.status).toBe(200);
    expect((await eventos(otra)).at(-1)).toEqual({ tipo: 'fin' });
  }, 15000);
});

describe('capturas', () => {
  it('guarda la imagen, la sirve y no deja salir de la carpeta', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const r = await fetch(`${API}imagen?asignatura=fisica&id=${ID}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: bytes });
    const { nombre } = await r.json();
    expect(nombre).toMatch(/^captura-\d+-\d+\.png$/);
    const leida = new Uint8Array(await (await fetch(`${API}archivo?asignatura=fisica&id=${ID}&ruta=imagenes/${nombre}`)).arrayBuffer());
    expect([...leida]).toEqual([...bytes]);
    expect((await fetch(`${API}archivo?asignatura=fisica&id=${ID}&ruta=..%2F..%2F..%2Fi.md`)).status).toBe(400);
    expect((await fetch(`${API}imagen?asignatura=fisica&id=${ID}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })).status).toBe(415);
  });
});

describe('eventos', () => {
  it('abre el canal de avisos', async () => {
    const control = new AbortController();
    const r = await fetch(`${API}eventos`, { signal: control.signal });
    expect(r.headers.get('content-type')).toContain('text/event-stream');
    const lector = r.body!.getReader();
    const { value } = await lector.read();
    expect(new TextDecoder().decode(value)).toContain(': conectado');
    control.abort();
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/servidor.test.ts`
Expected: FAIL, no existe `./servidor.ts`.

- [ ] **Step 3: Escribir el servidor**

`local/servidor.ts`:

```ts
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { conContexto } from '../src/estudio/contexto.ts';
import type { EventoChat, EventoPizarra } from '../src/estudio/tipos.ts';
import { lanzarClaude, type Comando, type Proceso } from './claude.ts';
import { carpetaConversaciones, leerConversacionDe, listarConversaciones } from './conversaciones.ts';
import { esIdAsignatura, esIdConversacion, esNombreImagen, hostPermitido, origenPermitido, rutaDentro } from './seguridad.ts';

export interface OpcionesServidor {
  puerto: number;
  estudios: string; // my-context/estudios
  dist: string; // la app compilada
  home: string;
  comando: Comando;
  instrucciones: string;
}

export const PREFIJO = '/segundo-cerebro-app/';
const API = `${PREFIJO}api/local/`;
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
const EXTENSION_IMAGEN: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export class ErrorPeticion extends Error {
  readonly estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

export function enviarJson(res: ServerResponse, estado: number, cuerpo: unknown): void {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpo(req: IncomingMessage, limite: number): Promise<Buffer> {
  const trozos: Buffer[] = [];
  let total = 0;
  for await (const t of req) {
    total += (t as Buffer).length;
    if (total > limite) throw new ErrorPeticion(413, 'Demasiado grande');
    trozos.push(t as Buffer);
  }
  return Buffer.concat(trozos);
}

export async function leerJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const cuerpo = await leerCuerpo(req, 1_000_000);
  try {
    const j = JSON.parse(cuerpo.toString('utf8'));
    if (typeof j === 'object' && j !== null && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch {
    // se trata abajo
  }
  throw new ErrorPeticion(400, 'Petición mal formada');
}

export function asignaturaDe(v: unknown): string {
  if (typeof v !== 'string' || !esIdAsignatura(v)) throw new ErrorPeticion(400, 'Asignatura no válida');
  return v;
}

export function conversacionDe(v: unknown): string {
  if (typeof v !== 'string' || !esIdConversacion(v)) throw new ErrorPeticion(400, 'Conversación no válida');
  return v;
}

async function esArchivo(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

async function enviarArchivo(res: ServerResponse, ruta: string): Promise<void> {
  let datos: Buffer;
  try {
    datos = await readFile(ruta);
  } catch {
    throw new ErrorPeticion(404, 'No existe');
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(datos);
}

export type Manejador = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;

export function crearServidor(o: OpcionesServidor) {
  mkdirSync(o.estudios, { recursive: true });
  const activos = new Map<string, Proceso>();
  const oyentes = new Set<ServerResponse>();
  const cwdDe = (asig: string) => path.join(o.estudios, asig);
  const carpetaDe = (asig: string, id: string) => path.join(o.estudios, asig, '.en-curso', id);

  function emitirATodos(e: EventoPizarra): void {
    for (const res of oyentes) res.write(`data: ${JSON.stringify(e)}\n\n`);
  }

  // Lanza Claude y va mandando sus eventos. Devuelve true si terminó bien.
  async function conversar(asig: string, id: string, nueva: boolean, mensaje: string, emitir: (e: EventoChat) => void, res: ServerResponse): Promise<boolean> {
    let ok = false;
    const proceso = lanzarClaude(o.comando, { mensaje, id, nueva, cwd: cwdDe(asig), instrucciones: o.instrucciones }, (e) => {
      if (e.tipo === 'fin' && !e.parado) ok = true;
      emitir(e);
    });
    activos.set(id, proceso);
    // Si Diego cierra la pestaña a mitad de respuesta, se para Claude.
    const alCerrar = () => {
      if (!res.writableEnded) proceso.parar();
    };
    res.on('close', alCerrar);
    await proceso.terminado;
    res.off('close', alCerrar);
    activos.delete(id);
    return ok;
  }

  const rutas: Record<string, Manejador> = {
    'GET estado': async (_req, res) => enviarJson(res, 200, { ok: true }),

    'GET conversaciones': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      enviarJson(res, 200, await listarConversaciones(carpetaConversaciones(cwdDe(asig), o.home)));
    },

    'GET conversacion': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      enviarJson(res, 200, await leerConversacionDe(carpetaConversaciones(cwdDe(asig), o.home), id));
    },

    'POST mensaje': async (req, res) => {
      const b = await leerJson(req);
      const asig = asignaturaDe(b.asignatura);
      const id = conversacionDe(b.id);
      const texto = typeof b.texto === 'string' ? b.texto.trim() : '';
      const imagenes = Array.isArray(b.imagenes) ? b.imagenes.filter((n): n is string => typeof n === 'string' && esNombreImagen(n)) : [];
      const abierta = typeof b.pizarraAbierta === 'number' && Number.isInteger(b.pizarraAbierta) ? b.pizarraAbierta : null;
      if (!texto && !imagenes.length) throw new ErrorPeticion(400, 'Mensaje vacío');
      if (activos.has(id)) throw new ErrorPeticion(409, 'Ya estoy contestando en esta conversación');
      const carpeta = carpetaDe(asig, id);
      await mkdir(carpeta, { recursive: true });
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
      const emitir = (e: EventoChat) => {
        if (!res.writableEnded) res.write(JSON.stringify(e) + '\n');
      };
      const conCabecera = (t: string) =>
        conContexto({ asignatura: asig, carpeta, pizarraAbierta: abierta, imagenes: imagenes.map((n) => path.join(carpeta, 'imagenes', n)) }, t);
      await conversar(asig, id, b.nueva === true, conCabecera(texto || 'Mira la captura.'), emitir, res);
      res.end();
    },

    'POST parar': async (req, res) => {
      const b = await leerJson(req);
      activos.get(conversacionDe(b.id))?.parar();
      enviarJson(res, 200, { ok: true });
    },

    'POST imagen': async (req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      const ext = EXTENSION_IMAGEN[String(req.headers['content-type'] ?? '').split(';')[0].trim()];
      if (!ext) throw new ErrorPeticion(415, 'Solo se admiten imágenes PNG, JPG, WEBP o GIF');
      const datos = await leerCuerpo(req, 10_000_000);
      const carpeta = path.join(carpetaDe(asig, id), 'imagenes');
      await mkdir(carpeta, { recursive: true });
      const nombre = `captura-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
      await writeFile(path.join(carpeta, nombre), datos);
      enviarJson(res, 200, { nombre });
    },

    'GET archivo': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      const ruta = rutaDentro(carpetaDe(asig, id), url.searchParams.get('ruta') ?? '');
      if (!ruta) throw new ErrorPeticion(400, 'Ruta no válida');
      await enviarArchivo(res, ruta);
    },

    'GET eventos': async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': conectado\n\n');
      oyentes.add(res);
      const latido = setInterval(() => res.write(': latido\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(latido);
        oyentes.delete(res);
      });
    },
  };

  async function estatico(ruta: string, res: ServerResponse): Promise<void> {
    if (!ruta.startsWith(PREFIJO)) {
      res.writeHead(302, { Location: PREFIJO });
      res.end();
      return;
    }
    let rel: string;
    try {
      rel = decodeURIComponent(ruta.slice(PREFIJO.length)) || 'index.html';
    } catch {
      throw new ErrorPeticion(400, 'Ruta no válida');
    }
    const archivo = rutaDentro(o.dist, rel);
    if (archivo && (await esArchivo(archivo))) return enviarArchivo(res, archivo);
    // Las pantallas de la app no tienen extensión: se sirve la app.
    if (path.extname(rel) === '') return enviarArchivo(res, path.join(o.dist, 'index.html'));
    throw new ErrorPeticion(404, 'No existe');
  }

  async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!hostPermitido(req.headers.host, o.puerto) || !origenPermitido(req.headers.origin, o.puerto))
        throw new ErrorPeticion(403, 'No permitido');
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      if (url.pathname.startsWith(API)) {
        const manejador = rutas[`${req.method} ${url.pathname.slice(API.length)}`];
        if (!manejador) throw new ErrorPeticion(404, 'No existe');
        await manejador(req, res, url);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErrorPeticion(405, 'No permitido');
      await estatico(url.pathname, res);
    } catch (e) {
      const estado = e instanceof ErrorPeticion ? e.estado : 500;
      if (!res.headersSent) enviarJson(res, estado, { error: e instanceof Error ? e.message : String(e) });
      else res.end();
    }
  }

  const servidor = http.createServer((req, res) => void manejar(req, res));
  return { servidor, emitirATodos, rutas, carpetaDe, conversar };
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/servidor.test.ts`
Expected: PASS. Si la prueba «cierra la pestaña» falla por tiempos en tu PC, sube las esperas a 1500 ms, pero no cambies lo que comprueba.

- [ ] **Step 5: Instrucciones, arranque y script**

`local/instrucciones-estudio.md`:

```markdown
# Zona de estudio

Estás en la zona de estudio de la app de Diego. Diego estudia primero de Ingeniería de Robótica Software en la URJC. Es principiante: explícale las cosas con palabras sencillas, paso a paso y con ejemplos. Háblale siempre en español.

## Cada mensaje
- Empieza con una cabecera `<contexto-estudio>` (asignatura, carpeta de las pizarras de esta conversación, pizarra abierta y capturas adjuntas). Diego no la ve: no la menciones.
- Si hay capturas adjuntas, míralas con la herramienta de leer archivos antes de contestar.
- Si hay apuntes de Diego en esta carpeta, puedes leerlos y buscar en ellos.

## Cómo contestar
- El chat entiende Markdown y fórmulas: `$F = m \cdot a$` dentro de una frase y `$$…$$` en su propia línea.
- Si la duda es sencilla, contesta solo en el chat, corto y claro.
- Aún no hay pizarra: explica solo en el chat.

## Lo que no debes hacer
- No hagas la rutina de git de `my-context` (ni pull, ni commit, ni push): en la zona de estudio no hace falta.
- No toques archivos fuera de esta carpeta.
```

`local/principal.ts`:

```ts
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearServidor } from './servidor.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const puerto = Number(process.env.PUERTO ?? 5174);
const myContext = path.resolve(process.env.MY_CONTEXT ?? path.join(raiz, '..', 'my-context'));

if (!existsSync(myContext)) {
  console.error(`No encuentro my-context en ${myContext}.`);
  console.error('Descárgalo al lado de segundo-cerebro-app o indica dónde está con la variable MY_CONTEXT.');
  process.exit(1);
}

const estudios = path.join(myContext, 'estudios');
const { servidor } = crearServidor({
  puerto,
  estudios,
  dist: path.join(raiz, 'dist'),
  home: os.homedir(),
  comando: { bin: process.env.CLAUDE_BIN ?? 'claude', previos: [] },
  instrucciones: path.join(aqui, 'instrucciones-estudio.md'),
});

servidor.on('error', (e: NodeJS.ErrnoException) => {
  console.error(
    e.code === 'EADDRINUSE' ? `El puerto ${puerto} ya está en uso: ¿tienes otra ventana con la zona de estudio abierta?` : e.message,
  );
  process.exit(1);
});
servidor.listen(puerto, '127.0.0.1', () => {
  console.log(`\nZona de estudio lista: http://127.0.0.1:${puerto}/segundo-cerebro-app/`);
  console.log(`Apuntes y pizarras en: ${estudios}`);
  console.log('Para cerrarla, pulsa Ctrl+C en esta ventana.\n');
});
```

En `package.json`, añade en `scripts` (después de `"preview"`):

```json
    "local": "vite build && node local/principal.ts",
```

En `vite.config.ts`, dentro de `VitePWA({ ... })`, justo después de `registerType: 'autoUpdate',`, añade:

```ts
      // El service worker nunca contesta por el programa local.
      workbox: { navigateFallbackDenylist: [/\/api\//] },
```

- [ ] **Step 6: Probarlo a mano (sin Claude de verdad)**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todas las pruebas pasan y el build termina.

Run: `export PATH="$PATH:/c/Program Files/nodejs"; timeout 20 npm run local` (en otra terminal: `curl -s http://127.0.0.1:5174/segundo-cerebro-app/api/local/estado`)
Expected: la consola dice «Zona de estudio lista…» y `curl` devuelve `{"ok":true}`.

- [ ] **Step 7: Commit**

```bash
git add local/servidor.ts local/servidor.test.ts local/principal.ts local/instrucciones-estudio.md package.json vite.config.ts
git commit -m "Programa local: servidor con chat, capturas y avisos (npm run local)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Asignaturas

**Files:**
- Create: `src/texto.ts`, `src/texto.test.ts`, `src/datos/asignaturas.ts`, `src/datos/asignaturas.test.ts`, `src/agenda/asignaturas.ts`, `src/agenda/asignaturas.test.ts`
- Modify: `src/datos/rutas.ts`, `src/repositorio.ts`, `src/repositorio.test.ts`, `src/estado/cache.ts`, `src/estado/datos.tsx`

**Interfaces:**
- Produces:
  - `aSlug(texto: string, maximo: number): string`;
  - `Asignatura { id; nombre; color }`, `GENERAL: Asignatura`, `parseAsignaturas(texto)` y `serializarAsignaturas(lista)`;
  - `COLORES_ASIGNATURA`, `idAsignaturaDesdeNombre(nombre, existentes)`, `anadirAsignatura(lista, nombre, color?)`, `editarAsignatura(lista, id, cambios)` y `quitarAsignatura(lista, id)`;
  - `RUTA_ASIGNATURAS = 'estudios/asignaturas.yaml'`;
  - `Datos.asignaturas: Asignatura[]`;
  - `modificarAsignaturas(cfg, cambio, mensaje): Promise<Asignatura[]>`;
  - en el contexto: `cambiarAsignaturas(cambio, mensaje): Promise<boolean>`.

- [ ] **Step 1: Escribir las pruebas (que fallen)**

`src/texto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aSlug } from './texto';

describe('aSlug', () => {
  it('minúsculas, sin tildes y con guiones', () => {
    expect(aSlug('Física II: Ondas', 60)).toBe('fisica-ii-ondas');
    expect(aSlug('  Leyes de Newton!! ', 60)).toBe('leyes-de-newton');
  });
  it('recorta sin dejar un guion al final', () => {
    expect(aSlug('abc def ghi', 5)).toBe('abc-d');
    expect(aSlug('abcd efgh', 5)).toBe('abcd');
  });
  it('nada aprovechable → vacío', () => {
    expect(aSlug('¿¿!!', 60)).toBe('');
  });
});
```

`src/datos/asignaturas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseAsignaturas, serializarAsignaturas } from './asignaturas';

describe('asignaturas.yaml', () => {
  it('lee la lista', () => {
    expect(parseAsignaturas('asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n')).toEqual([
      { id: 'fisica', nombre: 'Física', color: '#3d7bb8' },
    ]);
  });
  it('vacío o sin lista → nada', () => {
    expect(parseAsignaturas('')).toEqual([]);
    expect(parseAsignaturas('asignaturas:\n')).toEqual([]);
  });
  it('errores claros', () => {
    expect(() => parseAsignaturas('- id: x\n')).toThrow(/asignaturas/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: general\n    nombre: G\n    color: "#000000"\n')).toThrow(/reservado/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: Fí sica\n    nombre: F\n    color: "#000000"\n')).toThrow(/id/);
    expect(() =>
      parseAsignaturas('asignaturas:\n  - id: a\n    nombre: A\n    color: "#000000"\n  - id: a\n    nombre: B\n    color: "#000000"\n'),
    ).toThrow(/repetido/);
    expect(() => parseAsignaturas('asignaturas:\n  - id: a\n    nombre: A\n    color: #000000\n')).toThrow(/color/);
  });
  it('ida y vuelta', () => {
    const lista = [{ id: 'fisica', nombre: 'Física', color: '#3d7bb8' }];
    expect(parseAsignaturas(serializarAsignaturas(lista))).toEqual(lista);
  });
});
```

`src/agenda/asignaturas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anadirAsignatura, editarAsignatura, idAsignaturaDesdeNombre, quitarAsignatura } from './asignaturas';

describe('asignaturas', () => {
  it('id desde el nombre, sin repetir y sin usar «general»', () => {
    expect(idAsignaturaDesdeNombre('Física', [])).toBe('fisica');
    expect(idAsignaturaDesdeNombre('Física', ['fisica'])).toBe('fisica-2');
    expect(idAsignaturaDesdeNombre('General', [])).toBe('general-2');
    expect(idAsignaturaDesdeNombre('¿?', [])).toBe('asignatura');
  });
  it('añadir, editar y quitar', () => {
    const a = anadirAsignatura([], '  Cálculo  ');
    expect(a).toEqual([{ id: 'calculo', nombre: 'Cálculo', color: '#3d7bb8' }]);
    const b = anadirAsignatura(a, 'Física', '#123456');
    expect(b[1]).toEqual({ id: 'fisica', nombre: 'Física', color: '#123456' });
    expect(editarAsignatura(b, 'fisica', { nombre: 'Física I' })[1]).toEqual({ id: 'fisica', nombre: 'Física I', color: '#123456' });
    expect(quitarAsignatura(b, 'calculo').map((x) => x.id)).toEqual(['fisica']);
    expect(anadirAsignatura(b, '   ')).toBe(b);
  });
});
```

En `src/repositorio.test.ts`:
- añade `modificarAsignaturas` al import de `./repositorio`;
- en los `mockImplementation` de las pruebas de `cargarTodo` y de `cargarAgenda` que ya existen, añade como **primera línea** dentro de la función:

  ```ts
      if (ruta === 'estudios/asignaturas.yaml') throw new cliente.ErrorGitHub('no-existe', 'no', 404);
  ```
- añade al final del archivo:

```ts
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
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/texto.test.ts src/datos/asignaturas.test.ts src/agenda/asignaturas.test.ts src/repositorio.test.ts`
Expected: FAIL (faltan módulos y `modificarAsignaturas`).

- [ ] **Step 3: Escribir el código**

`src/texto.ts`:

```ts
// «Física II: Ondas» → «fisica-ii-ondas». Sirve para ids y nombres de archivo.
export function aSlug(texto: string, maximo: number): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/, '');
}
```

En `src/datos/rutas.ts` añade:

```ts
export const RUTA_ASIGNATURAS = 'estudios/asignaturas.yaml';
```

`src/datos/asignaturas.ts`:

```ts
import { stringify } from 'yaml';
import { RUTA_ASIGNATURAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Asignatura {
  id: string;
  nombre: string;
  color: string;
}

// «General» siempre existe y no va en el archivo.
export const GENERAL: Asignatura = { id: 'general', nombre: 'General', color: '#8b7b6a' };
export const PATRON_ID_ASIGNATURA = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function parseAsignaturas(texto: string): Asignatura[] {
  const datos = leerYaml(texto, RUTA_ASIGNATURAS);
  if (datos === null || datos === undefined) return [];
  if (typeof datos !== 'object' || Array.isArray(datos))
    throw new ErrorDatos(RUTA_ASIGNATURAS, 'el archivo debe empezar por «asignaturas:» seguido de la lista');
  const lista = (datos as { asignaturas?: unknown }).asignaturas;
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErrorDatos(RUTA_ASIGNATURAS, 'asignaturas debe ser una lista');
  const vistos = new Set<string>();
  return lista.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: necesita id y nombre`);
    if (a.id === GENERAL.id) throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «general» está reservado`);
    if (!PATRON_ID_ASIGNATURA.test(a.id))
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «${a.id}» solo puede tener minúsculas, números y guiones`);
    if (vistos.has(a.id)) throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1}: el id «${a.id}» está repetido`);
    vistos.add(a.id);
    if (typeof a.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(a.color))
      throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1} (${a.id}): color debe escribirse entre comillas, como "#3d7bb8"`);
    return { id: a.id, nombre: a.nombre, color: a.color };
  });
}

export function serializarAsignaturas(lista: Asignatura[]): string {
  return stringify({ asignaturas: lista.map(({ id, nombre, color }) => ({ id, nombre, color })) });
}
```

`src/agenda/asignaturas.ts`:

```ts
import { GENERAL, type Asignatura } from '../datos/asignaturas';
import { aSlug } from '../texto';

export const COLORES_ASIGNATURA = ['#3d7bb8', '#b8603d', '#5a8f4e', '#8a5bb0', '#c08a2e', '#3f8f8a', '#b84a6a'];

export function idAsignaturaDesdeNombre(nombre: string, existentes: string[]): string {
  const base = aSlug(nombre, 36) || 'asignatura';
  const ocupados = new Set([...existentes, GENERAL.id]);
  if (!ocupados.has(base)) return base;
  for (let n = 2; ; n++) if (!ocupados.has(`${base}-${n}`)) return `${base}-${n}`;
}

export function anadirAsignatura(lista: Asignatura[], nombre: string, color?: string): Asignatura[] {
  const limpio = nombre.trim();
  if (!limpio) return lista;
  const id = idAsignaturaDesdeNombre(limpio, lista.map((a) => a.id));
  return [...lista, { id, nombre: limpio, color: color ?? COLORES_ASIGNATURA[lista.length % COLORES_ASIGNATURA.length] }];
}

export function editarAsignatura(lista: Asignatura[], id: string, cambios: { nombre?: string; color?: string }): Asignatura[] {
  return lista.map((a) =>
    a.id === id ? { ...a, nombre: cambios.nombre?.trim() || a.nombre, color: cambios.color ?? a.color } : a,
  );
}

// Solo la quita de la lista: su carpeta y su historial no se borran.
export function quitarAsignatura(lista: Asignatura[], id: string): Asignatura[] {
  return lista.filter((a) => a.id !== id);
}
```

En `src/repositorio.ts`:
- añade los imports:

  ```ts
  import { parseAsignaturas, serializarAsignaturas, type Asignatura } from './datos/asignaturas';
  ```
  y `RUTA_ASIGNATURAS` al import de `./datos/rutas`.
- en `interface Datos` añade `asignaturas: Asignatura[];` (después de `ideas`).
- en `cargarAgenda`:
  - cambia el `Promise.all` para que lea también las asignaturas:

    ```ts
      const [textoTareas, textoAreas, textoBandeja, textoAsignaturas] = await Promise.all([
        leerOpcional(cfg, RUTA_TAREAS),
        leerOpcional(cfg, RUTA_AREAS),
        leerOpcional(cfg, RUTA_BANDEJA),
        leerOpcional(cfg, RUTA_ASIGNATURAS),
      ]);
    ```
  - antes del `return`, añade:

    ```ts
      const asignaturas = intentar(errores, () => (textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas)), []);
    ```
  - y devuelve `{ tareas, areas, ideas, asignaturas, errores }`.
- en `cargarTodo`, cambia la desestructuración por `const [{ tareas, areas, ideas, asignaturas, errores }, nombres]` y el `return` por `return { tareas, areas, ideas, asignaturas, proyectos: …, errores };`.
- añade al final:

```ts
export async function modificarAsignaturas(
  cfg: Config, cambio: (l: Asignatura[]) => Asignatura[], mensaje: string,
): Promise<Asignatura[]> {
  let resultado: Asignatura[] = [];
  await actualizarArchivo(cfg, RUTA_ASIGNATURAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseAsignaturas(texto));
    return serializarAsignaturas(resultado);
  }, mensaje);
  return resultado;
}
```

En `src/estado/cache.ts`:
- en `guardarCache`, el objeto `copia` pasa a ser `{ tareas: d.tareas, areas: d.areas, proyectos: d.proyectos, ideas: d.ideas, asignaturas: d.asignaturas }`;
- en `leerCache`, el objeto devuelto añade `asignaturas: c.asignaturas ?? []`, con el comentario «Una caché antigua no tiene ideas ni asignaturas.».

En `src/estado/datos.tsx`:
- **Imports:** `modificarAsignaturas` junto a `modificarBandeja`; `import type { Asignatura } from '../datos/asignaturas';`; y `RUTA_ASIGNATURAS` junto a `RUTA_AREAS`.
- **`ValorDatos`:** `cambiarAsignaturas(cambio: (l: Asignatura[]) => Asignatura[], mensaje: string): Promise<boolean>;`.
- **`VACIO`:** `{ tareas: [], areas: [], proyectos: [], ideas: [], asignaturas: [], errores: [] }`.
- **`traerAgenda`:** añade `asignaturas: agenda.asignaturas,` y cambia el filtro de errores a `x.archivo !== RUTA_TAREAS && x.archivo !== RUTA_AREAS && x.archivo !== RUTA_ASIGNATURAS`.
- **Nuevo, después de `cambiarIdeas`:**

```ts
  const cambiarAsignaturas = useCallback(
    (cambio: (l: Asignatura[]) => Asignatura[], mensaje: string) =>
      encolar(async () => {
        if (!config) return false;
        try {
          const asignaturas = await modificarAsignaturas(config, cambio, mensaje);
          setDatos((d) => ({ ...d, asignaturas, errores: d.errores.filter((x) => x.archivo !== RUTA_ASIGNATURAS) }));
          setEstado('listo');
          return true;
        } catch (e) {
          alFallar(e, false);
          return false;
        }
      }),
    [config, alFallar, encolar],
  );
```
- **`useMemo` de `valor`:** añade `cambiarAsignaturas` al objeto y a la lista de dependencias.

- [ ] **Step 4: Ejecutar todas las pruebas y el build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/texto.ts src/texto.test.ts src/datos/asignaturas.ts src/datos/asignaturas.test.ts src/agenda/asignaturas.ts src/agenda/asignaturas.test.ts src/datos/rutas.ts src/repositorio.ts src/repositorio.test.ts src/estado/cache.ts src/estado/datos.tsx
git commit -m "Asignaturas: leer, guardar y editar estudios/asignaturas.yaml

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Cliente local, eventos del chat y fórmulas

**Files:**
- Create: `src/estudio/local.ts`, `src/estudio/local.test.ts`, `src/estudio/chat.ts`, `src/estudio/chat.test.ts`, `src/estudio/formulas.ts`, `src/estudio/formulas.test.ts`, `src/estudio/preferencias.ts`
- Modify: `src/componentes/Markdown.tsx`, `package.json` (con `npm install katex`)

**Interfaces:**
- Consumes: `Mensaje`, `EventoChat`, `EventoPizarra` y `ResumenConversacion` (Task 2).
- Produces:
  - **Programa local:**
    - `hayProgramaLocal(): Promise<boolean>`;
    - `listarConversaciones(asig)` y `leerConversacion(asig, id)`;
    - `enviarMensaje(envio: Envio, alEvento): Promise<void>`;
    - `pararRespuesta(asig, id)`;
    - `subirImagen(asig, id, blob): Promise<string>`;
    - `urlArchivo(asig, id, ruta): string`;
    - `urlEventos(): string`;
    - `leerArchivoBase64(asig, id, ruta): Promise<string>`;
    - `crearLectorLineas(alLinea)`;
    - `ErrorLocal`.
  - **Chat:** `aplicarEvento(ms: Mensaje[], e: EventoChat): Mensaje[]`.
  - **Fórmulas:**
    - `separarFormulas(texto): { texto; formulas: Formula[] }`;
    - `ponerFormulas(html, formulas, dibujar)`;
    - `htmlMarkdown(texto, formulas?)`.
  - **Markdown:** `<Markdown texto formulas? className? />`.
  - **Preferencias:** `leerPreferencia(clave): string | null` y `guardarPreferencia(clave, valor): void`.

- [ ] **Step 1: Instalar KaTeX**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm install katex`
Expected: `katex` aparece en `dependencies` de `package.json`. Trae sus propios tipos; si `npm run build` más adelante se queja de que faltan, ejecuta `npm install -D @types/katex`.

- [ ] **Step 2: Escribir las pruebas (que fallen)**

`src/estudio/local.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { crearLectorLineas } from './local';

describe('crearLectorLineas', () => {
  it('junta los trozos que llegan partidos y entrega línea a línea', () => {
    const lineas: string[] = [];
    const leer = crearLectorLineas((l) => lineas.push(l));
    leer('{"a":');
    leer('1}\n{"b"');
    leer(':2}\n\n');
    leer('{"c":3}');
    expect(lineas).toEqual(['{"a":1}', '{"b":2}']);
    leer.fin();
    expect(lineas).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });
});
```

`src/estudio/chat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aplicarEvento } from './chat';
import type { Mensaje } from './tipos';

const base: Mensaje[] = [{ rol: 'diego', texto: 'Hola' }];

describe('aplicarEvento', () => {
  it('el texto de Claude se va juntando en un mismo mensaje', () => {
    const a = aplicarEvento(base, { tipo: 'texto', texto: 'Ho' });
    const b = aplicarEvento(a, { tipo: 'texto', texto: 'la' });
    expect(b).toEqual([...base, { rol: 'claude', texto: 'Hola' }]);
  });
  it('una herramienta corta el mensaje y el texto siguiente empieza otro, sin líneas en blanco delante', () => {
    let ms = aplicarEvento(base, { tipo: 'texto', texto: 'Mira' });
    ms = aplicarEvento(ms, { tipo: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' });
    ms = aplicarEvento(ms, { tipo: 'texto', texto: '\n\n' });
    ms = aplicarEvento(ms, { tipo: 'texto', texto: 'Ya está' });
    expect(ms).toEqual([
      ...base,
      { rol: 'claude', texto: 'Mira' },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' },
      { rol: 'claude', texto: 'Ya está' },
    ]);
  });
  it('fin y error no cambian los mensajes', () => {
    expect(aplicarEvento(base, { tipo: 'fin' })).toBe(base);
    expect(aplicarEvento(base, { tipo: 'error', mensaje: 'x' })).toBe(base);
  });
});
```

`src/estudio/formulas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ponerFormulas, separarFormulas } from './formulas';

describe('separarFormulas', () => {
  it('fórmulas dentro de la frase y en bloque', () => {
    const s = separarFormulas('La ley es $F = m a$.\n\n$$\\int x\\,dx$$');
    expect(s.formulas).toEqual([{ tex: '\\int x\\,dx', bloque: true }, { tex: 'F = m a', bloque: false }]);
    expect(s.texto).toBe('La ley es @@F1@@.\n\n@@F0@@');
  });
  it('no toca precios ni código', () => {
    expect(separarFormulas('Cuesta 5$ y 6$ más').formulas).toEqual([]);
    expect(separarFormulas('Usa `$x$` en el código').formulas).toEqual([]);
    expect(separarFormulas('```\n$a$\n```').formulas).toEqual([]);
  });
  it('ponerFormulas cambia las marcas por el dibujo', () => {
    const s = separarFormulas('a $x$ b');
    expect(ponerFormulas(`<p>${s.texto}</p>`, s.formulas, (f) => `[${f.tex}]`)).toBe('<p>a [x] b</p>');
  });
});
```

- [ ] **Step 3: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/local.test.ts src/estudio/chat.test.ts src/estudio/formulas.test.ts`
Expected: FAIL, no existen los módulos.

- [ ] **Step 4: Escribir el código**

`src/estudio/local.ts`:

```ts
import type { EventoChat, Mensaje, ResumenConversacion } from './tipos';

// Habla con el programa local (npm run local). En la web publicada no existe y todo falla en silencio.
const BASE = `${import.meta.env.BASE_URL}api/local`;

export class ErrorLocal extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorLocal';
  }
}

const consulta = (o: Record<string, string>) => new URLSearchParams(o).toString();

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/${ruta}`, { cache: 'no-store', ...init });
  } catch {
    throw new ErrorLocal('El programa local no responde.');
  }
  const j: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new ErrorLocal((j as { error?: string } | null)?.error ?? `Error del programa local (${r.status})`);
  return j as T;
}

const enviarJson = (cuerpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

export async function hayProgramaLocal(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/estado`, { cache: 'no-store' });
    if (!r.ok) return false;
    return ((await r.json()) as { ok?: boolean }).ok === true;
  } catch {
    return false;
  }
}

export const listarConversaciones = (asignatura: string) =>
  pedir<ResumenConversacion[]>(`conversaciones?${consulta({ asignatura })}`);

export const leerConversacion = (asignatura: string, id: string) =>
  pedir<Mensaje[]>(`conversacion?${consulta({ asignatura, id })}`);

export interface Envio {
  asignatura: string;
  id: string;
  nueva: boolean;
  texto: string;
  imagenes: string[];
  pizarraAbierta: number | null;
}

export function crearLectorLineas(alLinea: (l: string) => void): ((trozo: string) => void) & { fin(): void } {
  let resto = '';
  const leer = ((trozo: string) => {
    resto += trozo;
    const partes = resto.split('\n');
    resto = partes.pop() ?? '';
    for (const p of partes) if (p.trim()) alLinea(p);
  }) as ((trozo: string) => void) & { fin(): void };
  leer.fin = () => {
    if (resto.trim()) alLinea(resto);
    resto = '';
  };
  return leer;
}

// Manda el mensaje y va entregando los eventos según llegan. Termina cuando el programa cierra la respuesta.
export async function enviarMensaje(envio: Envio, alEvento: (e: EventoChat) => void): Promise<void> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/mensaje`, enviarJson(envio));
  } catch {
    alEvento({ tipo: 'error', mensaje: 'El programa local no responde.' });
    return;
  }
  if (!r.ok || !r.body) {
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    alEvento({ tipo: 'error', mensaje: j?.error ?? `Error del programa local (${r.status})` });
    return;
  }
  const leer = crearLectorLineas((l) => {
    try {
      alEvento(JSON.parse(l) as EventoChat);
    } catch {
      // línea rota: se ignora
    }
  });
  const lector = r.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      leer(value);
    }
    leer.fin();
  } catch {
    alEvento({ tipo: 'error', mensaje: 'Se ha perdido la conexión con el programa local.' });
  }
}

export const pararRespuesta = (asignatura: string, id: string) => pedir<{ ok: boolean }>('parar', enviarJson({ asignatura, id }));

export async function subirImagen(asignatura: string, id: string, archivo: Blob): Promise<string> {
  const j = await pedir<{ nombre: string }>(`imagen?${consulta({ asignatura, id })}`, {
    method: 'POST',
    headers: { 'Content-Type': archivo.type },
    body: archivo,
  });
  return j.nombre;
}

export const urlArchivo = (asignatura: string, id: string, ruta: string) => `${BASE}/archivo?${consulta({ asignatura, id, ruta })}`;
export const urlEventos = () => `${BASE}/eventos`;

// Para subir las imágenes al historial (la API de GitHub pide base64).
export async function leerArchivoBase64(asignatura: string, id: string, ruta: string): Promise<string> {
  const r = await fetch(urlArchivo(asignatura, id, ruta), { cache: 'no-store' });
  if (!r.ok) throw new ErrorLocal(`No encuentro ${ruta}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
```

`src/estudio/chat.ts`:

```ts
import type { EventoChat, Mensaje } from './tipos';

// Aplica un evento que llega del programa local a la lista de mensajes del chat.
export function aplicarEvento(ms: Mensaje[], e: EventoChat): Mensaje[] {
  if (e.tipo === 'texto') {
    const ultimo = ms.at(-1);
    if (ultimo?.rol === 'claude') return [...ms.slice(0, -1), { ...ultimo, texto: ultimo.texto + e.texto }];
    const texto = e.texto.replace(/^\n+/, '');
    return texto ? [...ms, { rol: 'claude', texto }] : ms;
  }
  if (e.tipo === 'herramienta') return [...ms, { rol: 'herramienta', texto: e.texto }];
  return ms;
}
```

`src/estudio/formulas.ts`:

```ts
// Las fórmulas $…$ y $$…$$ se sacan antes de pasar el texto por Markdown
// (para que Markdown no las estropee) y se vuelven a poner ya dibujadas.
export interface Formula {
  tex: string;
  bloque: boolean;
}

const marca = (i: number) => `@@F${i}@@`;

export function separarFormulas(texto: string): { texto: string; formulas: Formula[] } {
  const formulas: Formula[] = [];
  const sustituir = (t: string) =>
    t
      .replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => {
        formulas.push({ tex: tex.trim(), bloque: true });
        return marca(formulas.length - 1);
      })
      .replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_m, antes: string, tex: string) => {
        formulas.push({ tex, bloque: false });
        return antes + marca(formulas.length - 1);
      });
  // Los trozos impares son código (```…``` o `…`): no se tocan.
  const partes = texto.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  return { texto: partes.map((p, i) => (i % 2 === 1 ? p : sustituir(p))).join(''), formulas };
}

export function ponerFormulas(html: string, formulas: Formula[], dibujar: (f: Formula) => string): string {
  return html.replace(/@@F(\d+)@@/g, (m, i: string) => {
    const f = formulas[Number(i)];
    return f ? dibujar(f) : m;
  });
}
```

`src/estudio/preferencias.ts`:

```ts
// Pequeñas preferencias de este navegador (última asignatura, ancho del chat…). Si no hay almacenamiento, no pasa nada.
export function leerPreferencia(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardarPreferencia(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // sin almacenamiento
  }
}
```

Sustituye `src/componentes/Markdown.tsx` entero por:

```tsx
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { marked } from 'marked';
import { ponerFormulas, separarFormulas } from '../estudio/formulas';

export function htmlMarkdown(texto: string, formulas = false): string {
  if (!formulas) return DOMPurify.sanitize(marked.parse(texto, { async: false }) as string);
  const s = separarFormulas(texto);
  const html = marked.parse(s.texto, { async: false }) as string;
  return DOMPurify.sanitize(
    ponerFormulas(html, s.formulas, (f) => katex.renderToString(f.tex, { displayMode: f.bloque, throwOnError: false, output: 'html' })),
  );
}

export function Markdown({ texto, formulas = false, className = 'markdown' }: { texto: string; formulas?: boolean; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: htmlMarkdown(texto, formulas) }} />;
}
```

- [ ] **Step 5: Ejecutar las pruebas y el build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/estudio/local.ts src/estudio/local.test.ts src/estudio/chat.ts src/estudio/chat.test.ts src/estudio/formulas.ts src/estudio/formulas.test.ts src/estudio/preferencias.ts src/componentes/Markdown.tsx package.json package-lock.json
git commit -m "Estudio: cliente del programa local, eventos del chat y fórmulas con KaTeX

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Pantalla Estudio con el chat (cierre de la etapa 1)

**Files:**
- Create: `src/estudio/useLocal.ts`, `src/pantallas/Estudio.tsx`, `src/componentes/estudio/PestanasAsignaturas.tsx`, `src/componentes/estudio/FormAsignatura.tsx`, `src/componentes/estudio/Chat.tsx`, `src/componentes/estudio/ListaConversaciones.tsx`, `src/componentes/estudio/EstudioLocal.tsx`
- Modify: `src/componentes/navegacion.ts`, `src/App.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes:
  - de la Task 5: `GENERAL`, `Asignatura`, `anadirAsignatura`, `editarAsignatura`, `quitarAsignatura`, `COLORES_ASIGNATURA` y `cambiarAsignaturas`;
  - de la Task 6: `local.ts`, `aplicarEvento`, `Markdown` y `preferencias`;
  - `URL_USO_CLAUDE`.
- Produces:
  - `useLocal(): { estado: EstadoLocal; suscribir(f: (e: EventoPizarra) => void): () => void }`, con `EstadoLocal = 'comprobando' | 'si' | 'no' | 'cerrado'`;
  - `Pantalla` incluye `'estudio'`;
  - `<EstudioLocal asignatura local />` (se reescribe en la Task 12 y se amplía en la Task 14).

- [ ] **Step 1: Navegación**

En `src/componentes/navegacion.ts`, cambia el tipo `Pantalla` a:

```ts
export type Pantalla = 'inicio' | 'calendario' | 'tareas' | 'proyectos' | 'ideas' | 'estudio' | 'ajustes';
```

y en `SECCIONES` añade, entre Ideas y Ajustes:

```ts
  { id: 'estudio', nombre: 'Estudio', icono: '📚' },
```

- [ ] **Step 2: Detectar el programa local**

`src/estudio/useLocal.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { hayProgramaLocal, urlEventos } from './local';
import type { EventoPizarra } from './tipos';

export type EstadoLocal = 'comprobando' | 'si' | 'no' | 'cerrado';

// ¿Está el programa local? Si se cierra, se vuelve a buscar cada 5 segundos.
export function useLocal(): { estado: EstadoLocal; suscribir(f: (e: EventoPizarra) => void): () => void } {
  const [estado, setEstado] = useState<EstadoLocal>('comprobando');
  const [oyentes] = useState(() => new Set<(e: EventoPizarra) => void>());

  useEffect(() => {
    let cerrado = false;
    let fuente: EventSource | null = null;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    const conectar = async (yaEstaba: boolean) => {
      const hay = await hayProgramaLocal();
      if (cerrado) return;
      if (!hay) {
        setEstado(yaEstaba ? 'cerrado' : 'no');
        if (yaEstaba) reintento = setTimeout(() => void conectar(true), 5000);
        return;
      }
      setEstado('si');
      fuente = new EventSource(urlEventos());
      fuente.onmessage = (m) => {
        try {
          const e = JSON.parse(m.data) as EventoPizarra;
          oyentes.forEach((f) => f(e));
        } catch {
          // aviso roto: se ignora
        }
      };
      fuente.onerror = () => {
        fuente?.close();
        fuente = null;
        if (!cerrado) void conectar(true);
      };
    };
    void conectar(false);
    return () => {
      cerrado = true;
      clearTimeout(reintento);
      fuente?.close();
    };
  }, [oyentes]);

  const suscribir = useCallback(
    (f: (e: EventoPizarra) => void) => {
      oyentes.add(f);
      return () => {
        oyentes.delete(f);
      };
    },
    [oyentes],
  );

  return { estado, suscribir };
}
```

- [ ] **Step 3: Pestañas y formulario de asignaturas**

`src/componentes/estudio/PestanasAsignaturas.tsx`:

```tsx
import type { Asignatura } from '../../datos/asignaturas';
import { GENERAL } from '../../datos/asignaturas';

interface Props {
  asignaturas: Asignatura[];
  actual: string;
  bloqueado: boolean;
  alElegir(id: string): void;
  alNueva(): void;
  alEditar(a: Asignatura): void;
}

export function PestanasAsignaturas({ asignaturas, actual, bloqueado, alElegir, alNueva, alEditar }: Props) {
  return (
    <div className="pestanas-asignaturas">
      {asignaturas.map((a) => (
        <button key={a.id} className={`pastilla${a.id === actual ? ' encendida' : ''}`} onClick={() => alElegir(a.id)}>
          <span className="punto" style={{ background: a.color }} />
          {a.nombre}
          {a.id === actual && a.id !== GENERAL.id && !bloqueado && (
            <span
              className="editar-asignatura"
              role="button"
              aria-label={`Editar ${a.nombre}`}
              onClick={(e) => {
                e.stopPropagation();
                alEditar(a);
              }}
            >
              ✎
            </span>
          )}
        </button>
      ))}
      <button className="pastilla" disabled={bloqueado} onClick={alNueva}>+ asignatura</button>
    </div>
  );
}
```

`src/componentes/estudio/FormAsignatura.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { anadirAsignatura, COLORES_ASIGNATURA, editarAsignatura, quitarAsignatura } from '../../agenda/asignaturas';
import type { Asignatura } from '../../datos/asignaturas';
import { useDatos } from '../../estado/datos';

interface Props {
  asignatura: Asignatura | null; // null = nueva
  cerrar(): void;
  alQuitar(): void;
}

export function FormAsignatura({ asignatura, cerrar, alQuitar }: Props) {
  const { datos, cambiarAsignaturas } = useDatos();
  const [nombre, setNombre] = useState(asignatura?.nombre ?? '');
  const [color, setColor] = useState(asignatura?.color ?? COLORES_ASIGNATURA[datos.asignaturas.length % COLORES_ASIGNATURA.length]);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const ok = await cambiarAsignaturas(
      (l) => (asignatura ? editarAsignatura(l, asignatura.id, { nombre, color }) : anadirAsignatura(l, nombre, color)),
      `${asignatura ? 'Editar' : 'Añadir'} asignatura: ${nombre.trim()}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  async function quitar() {
    if (!asignatura || !confirm(`¿Quitar «${asignatura.nombre}» de la lista? Sus pizarras guardadas no se borran.`)) return;
    setGuardando(true);
    const ok = await cambiarAsignaturas((l) => quitarAsignatura(l, asignatura.id), `Quitar asignatura: ${asignatura.nombre}`);
    setGuardando(false);
    if (ok) {
      alQuitar();
      cerrar();
    }
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{asignatura ? 'Editar asignatura' : 'Nueva asignatura'}</h2>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus maxLength={60} placeholder="Física, Cálculo…" />
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>Guardar</button>
          {asignatura && <button type="button" className="peligro" disabled={guardando} onClick={() => void quitar()}>Quitar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: El chat**

`src/componentes/estudio/Chat.tsx`:

```tsx
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { subirImagen, urlArchivo } from '../../estudio/local';
import type { Mensaje } from '../../estudio/tipos';
import { Markdown } from '../Markdown';
import { URL_USO_CLAUDE } from '../navegacion';

export interface ErrorChat {
  mensaje: string;
  uso?: boolean;
}

interface Props {
  asignatura: string;
  conversacion: string;
  titulo: string;
  mensajes: Mensaje[];
  enviando: boolean;
  error: ErrorChat | null;
  alEnviar(texto: string, imagenes: string[]): void;
  alParar(): void;
  alReintentar(): void;
  alVerLista(): void;
  alNueva(): void;
}

export function Chat(p: Props) {
  const [texto, setTexto] = useState('');
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [p.mensajes, p.enviando]);

  async function adjuntar(archivos: File[]) {
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'));
    if (!imagenes.length) return;
    setSubiendo((n) => n + imagenes.length);
    for (const img of imagenes) {
      try {
        const nombre = await subirImagen(p.asignatura, p.conversacion, img);
        setAdjuntos((a) => [...a, nombre]);
      } catch (e) {
        setAviso(e instanceof Error ? e.message : String(e));
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  function enviar() {
    const limpio = texto.trim();
    if ((!limpio && !adjuntos.length) || p.enviando || subiendo) return;
    p.alEnviar(limpio, adjuntos);
    setTexto('');
    setAdjuntos([]);
    setAviso(null);
  }

  const alTecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };
  const alPegar = (e: ClipboardEvent) => {
    const archivos = [...e.clipboardData.files];
    if (archivos.some((a) => a.type.startsWith('image/'))) {
      e.preventDefault();
      void adjuntar(archivos);
    }
  };
  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    void adjuntar([...e.dataTransfer.files]);
  };
  const esperando = p.enviando && p.mensajes.at(-1)?.rol !== 'claude';

  return (
    <div className="chat">
      <div className="chat-cabecera">
        <button className="enlace" onClick={p.alVerLista}>◂ Conversaciones</button>
        <span className="titulo-chat">{p.titulo || 'Conversación nueva'}</span>
        <button onClick={p.alNueva} disabled={p.enviando} aria-label="Conversación nueva">+</button>
      </div>
      <div className="chat-mensajes" ref={lista}>
        {p.mensajes.length === 0 && (
          <p className="vacio">Pregúntame lo que quieras de esta asignatura: ejercicios, cómo se hace algo, resúmenes… También puedes pegar una captura.</p>
        )}
        {p.mensajes.map((m, i) =>
          m.rol === 'diego' ? (
            <div key={i} className="burbuja-diego">
              {m.texto}
              {m.imagenes?.length ? (
                <div className="miniaturas">
                  {m.imagenes.map((n) => <img key={n} src={urlArchivo(p.asignatura, p.conversacion, `imagenes/${n}`)} alt="Captura" />)}
                </div>
              ) : null}
            </div>
          ) : m.rol === 'claude' ? (
            <Markdown key={i} texto={m.texto} formulas className="markdown burbuja-claude" />
          ) : (
            <p key={i} className="linea-herramienta">{m.texto}</p>
          ),
        )}
        {esperando && <p className="linea-herramienta">Claude está pensando…</p>}
      </div>
      {p.error && (
        <div className="banner error chat-aviso">
          {p.error.mensaje}
          {p.error.uso && <a href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">Uso de Claude</a>}
          <button onClick={p.alReintentar}>Reintentar</button>
        </div>
      )}
      {aviso && <div className="banner aviso chat-aviso">{aviso} <button onClick={() => setAviso(null)}>Cerrar</button></div>}
      {(adjuntos.length > 0 || subiendo > 0) && (
        <div className="miniaturas chat-adjuntos">
          {adjuntos.map((n) => (
            <button key={n} className="miniatura-adjunta" title="Quitar" onClick={() => setAdjuntos((a) => a.filter((x) => x !== n))}>
              <img src={urlArchivo(p.asignatura, p.conversacion, `imagenes/${n}`)} alt="Captura adjunta" />
            </button>
          ))}
          {subiendo > 0 && <span className="detalle">Subiendo…</span>}
        </div>
      )}
      <div
        className={`chat-escribir${arrastrando ? ' arrastrando' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
      >
        <label className="boton-adjuntar" title="Adjuntar captura">
          📎
          <input type="file" accept="image/*" multiple hidden onChange={(e) => void adjuntar([...(e.target.files ?? [])])} />
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTecla}
          onPaste={alPegar}
          placeholder="Escribe… (Enter envía, Mayús+Enter salta de línea)"
          aria-label="Mensaje para Claude"
          rows={2}
        />
        {p.enviando ? (
          <button onClick={p.alParar}>Parar</button>
        ) : (
          <button className="principal" onClick={enviar} disabled={(!texto.trim() && !adjuntos.length) || subiendo > 0}>➤</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Lista de conversaciones**

`src/componentes/estudio/ListaConversaciones.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { listarConversaciones } from '../../estudio/local';
import type { ResumenConversacion } from '../../estudio/tipos';

interface Props {
  asignatura: string;
  alAbrir(id: string): void;
  alNueva(): void;
  alVolver(): void;
}

export function ListaConversaciones({ asignatura, alAbrir, alNueva, alVolver }: Props) {
  const [lista, setLista] = useState<ResumenConversacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarConversaciones(asignatura).then(setLista, (e: Error) => setError(e.message));
  }, [asignatura]);

  return (
    <div className="lista-conversaciones">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>▸ Volver al chat</button>
        <span className="titulo-chat" />
        <button onClick={alNueva}>+ Nueva</button>
      </div>
      <h3>Conversaciones</h3>
      {error && <p className="banner error">{error}</p>}
      {!lista && !error && <p className="cargando">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Aún no hay conversaciones.</p>}
      <ul className="lista">
        {lista?.map((c) => (
          <li key={c.id} className="fila-proyecto">
            <button className="titulo-tarea" onClick={() => alAbrir(c.id)}>{c.titulo}</button>
            <span className="detalle">{new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: La zona local (solo chat por ahora)**

`src/componentes/estudio/EstudioLocal.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { aplicarEvento } from '../../estudio/chat';
import { enviarMensaje, leerConversacion, listarConversaciones, pararRespuesta } from '../../estudio/local';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';
import type { Mensaje } from '../../estudio/tipos';
import type { useLocal } from '../../estudio/useLocal';
import { Chat, type ErrorChat } from './Chat';
import { ListaConversaciones } from './ListaConversaciones';

interface Props {
  asignatura: Asignatura;
  local: ReturnType<typeof useLocal>;
}

interface Conversacion {
  id: string;
  nueva: boolean;
}

const claveUltima = (asig: string) => `sc-estudio-conversacion-${asig}`;

export function EstudioLocal({ asignatura }: Props) {
  const [vista, setVista] = useState<'chat' | 'lista'>('chat');
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorChat | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<{ texto: string; imagenes: string[] } | null>(null);

  const abrir = useCallback(
    async (id: string) => {
      setVista('chat');
      setError(null);
      const ms = await leerConversacion(asignatura.id, id).catch(() => [] as Mensaje[]);
      setConv({ id, nueva: ms.length === 0 });
      setMensajes(ms);
      guardarPreferencia(claveUltima(asignatura.id), id);
    },
    [asignatura.id],
  );

  const nueva = useCallback(() => {
    setVista('chat');
    setError(null);
    setMensajes([]);
    setConv({ id: crypto.randomUUID(), nueva: true });
  }, []);

  // Al entrar, se abre la última conversación de esta asignatura (si sigue existiendo).
  useEffect(() => {
    const ultima = leerPreferencia(claveUltima(asignatura.id));
    listarConversaciones(asignatura.id)
      .then((lista) => (ultima && lista.some((c) => c.id === ultima) ? abrir(ultima) : nueva()))
      .catch(nueva);
  }, [asignatura.id, abrir, nueva]);

  async function enviar(texto: string, imagenes: string[]) {
    if (!conv || enviando) return;
    setUltimoEnvio({ texto, imagenes });
    setError(null);
    setEnviando(true);
    setMensajes((ms) => [...ms, imagenes.length ? { rol: 'diego', texto, imagenes } : { rol: 'diego', texto }]);
    await enviarMensaje(
      { asignatura: asignatura.id, id: conv.id, nueva: conv.nueva, texto, imagenes, pizarraAbierta: null },
      (e) => {
        if (e.tipo === 'error') setError({ mensaje: e.mensaje, uso: e.uso });
        else setMensajes((ms) => aplicarEvento(ms, e));
      },
    );
    setEnviando(false);
    // Se relee lo que guardó Claude Code: así la conversación queda igual que en la terminal.
    const guardados = await leerConversacion(asignatura.id, conv.id).catch(() => [] as Mensaje[]);
    if (guardados.length) {
      setMensajes(guardados);
      setConv({ id: conv.id, nueva: false });
      guardarPreferencia(claveUltima(asignatura.id), conv.id);
    }
  }

  if (!conv) return <p className="cargando">Cargando…</p>;

  return (
    <div className="estudio-local sin-pizarra">
      {vista === 'lista' ? (
        <ListaConversaciones asignatura={asignatura.id} alAbrir={(id) => void abrir(id)} alNueva={nueva} alVolver={() => setVista('chat')} />
      ) : (
        <Chat
          asignatura={asignatura.id}
          conversacion={conv.id}
          titulo={mensajes.find((m) => m.rol === 'diego')?.texto.slice(0, 60) ?? ''}
          mensajes={mensajes}
          enviando={enviando}
          error={error}
          alEnviar={(t, i) => void enviar(t, i)}
          alParar={() => void pararRespuesta(asignatura.id, conv.id).catch(() => undefined)}
          alReintentar={() => ultimoEnvio && void enviar(ultimoEnvio.texto, ultimoEnvio.imagenes)}
          alVerLista={() => setVista('lista')}
          alNueva={nueva}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: La pantalla**

`src/pantallas/Estudio.tsx`:

```tsx
import { useState } from 'react';
import { EstudioLocal } from '../componentes/estudio/EstudioLocal';
import { FormAsignatura } from '../componentes/estudio/FormAsignatura';
import { PestanasAsignaturas } from '../componentes/estudio/PestanasAsignaturas';
import { GENERAL, type Asignatura } from '../datos/asignaturas';
import { guardarPreferencia, leerPreferencia } from '../estudio/preferencias';
import { useLocal } from '../estudio/useLocal';
import { useDatos } from '../estado/datos';

const CLAVE = 'sc-estudio-asignatura';

export function Estudio() {
  const { datos, soloLectura } = useDatos();
  const local = useLocal();
  const asignaturas = [GENERAL, ...datos.asignaturas];
  const [elegida, setElegida] = useState(() => leerPreferencia(CLAVE) ?? GENERAL.id);
  const [form, setForm] = useState<Asignatura | 'nueva' | null>(null);
  const asignatura = asignaturas.find((a) => a.id === elegida) ?? GENERAL;

  const elegir = (id: string) => {
    setElegida(id);
    guardarPreferencia(CLAVE, id);
  };

  return (
    <section className="estudio">
      <div className="barra">
        <h2>Estudio</h2>
      </div>
      <PestanasAsignaturas
        asignaturas={asignaturas}
        actual={asignatura.id}
        bloqueado={soloLectura}
        alElegir={elegir}
        alNueva={() => setForm('nueva')}
        alEditar={(a) => setForm(a)}
      />
      {local.estado === 'comprobando' && <p className="cargando">Buscando el programa local…</p>}
      {local.estado === 'si' && <EstudioLocal key={asignatura.id} asignatura={asignatura} local={local} />}
      {(local.estado === 'no' || local.estado === 'cerrado') && (
        <div className="banner aviso">
          {local.estado === 'cerrado'
            ? 'El programa local se ha cerrado. Vuelve a abrirlo (npm run local) para seguir con el chat.'
            : 'El chat solo está disponible en tu PC.'}
        </div>
      )}
      {form && (
        <FormAsignatura asignatura={form === 'nueva' ? null : form} cerrar={() => setForm(null)} alQuitar={() => elegir(GENERAL.id)} />
      )}
    </section>
  );
}
```

- [ ] **Step 8: Conectar la pantalla en la app**

En `src/App.tsx`:
- **Import:** añade `import { Estudio } from './pantallas/Estudio';`.
- **`<main>`:** cámbialo por `<main className={actual === 'estudio' ? 'ancho' : undefined}>`.
- **La pantalla:** después de la línea de `ideas`, añade:

```tsx
        {actual === 'estudio' && <Estudio />}
```

- [ ] **Step 9: Estilos**

Añade al final de `src/estilos.css`:

```css
/* Estudio */
main.ancho { max-width: none; }
.pestanas-asignaturas { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 12px; }
.editar-asignatura { margin-left: 2px; padding: 0 4px; border-radius: 6px; color: var(--suave); }
.editar-asignatura:hover { background: var(--hover); color: var(--texto); }
.estudio-local { display: grid; grid-template-columns: minmax(0, 1fr); height: calc(100vh - 190px); min-height: 420px; border: 1px solid var(--borde); border-radius: 14px; background: var(--superficie); overflow: hidden; }
.chat, .lista-conversaciones { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.lista-conversaciones { overflow-y: auto; }
.lista-conversaciones > h3, .lista-conversaciones > .lista, .lista-conversaciones > p { margin-left: 14px; margin-right: 14px; }
.chat-cabecera { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--borde); }
.titulo-chat { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--suave); font-size: 14px; }
.chat-mensajes { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.burbuja-diego { align-self: flex-end; max-width: 85%; background: var(--acento-suave); padding: 8px 12px; border-radius: 12px 12px 4px 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.markdown.burbuja-claude { border: none; background: none; padding: 0 2px; }
.linea-herramienta { color: var(--suave); font-size: 13px; margin: 0; }
.miniaturas { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.miniaturas img { height: 64px; border-radius: 6px; border: 1px solid var(--borde); display: block; }
.chat-adjuntos { padding: 6px 12px 0; margin: 0; }
.miniatura-adjunta { padding: 0; border: none; background: none; }
.chat-escribir { display: flex; gap: 8px; align-items: flex-end; padding: 10px; border-top: 1px solid var(--borde); }
.chat-escribir textarea { flex: 1; resize: none; min-height: 42px; max-height: 160px; }
.chat-escribir.arrastrando { background: var(--acento-suave); }
.boton-adjuntar { flex-direction: row; cursor: pointer; font-size: 20px; padding: 6px; color: var(--texto); }
.chat-aviso { margin: 0 14px 10px; }
@media (max-width: 899px) { .estudio-local { height: calc(100vh - 230px); } }
```

- [ ] **Step 10: Pruebas, build y prueba a mano**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm run dev`. Abre http://localhost:5173/segundo-cerebro-app/, entra en **Estudio** y comprueba que:
- aparece «El chat solo está disponible en tu PC» (con `npm run dev` no hay programa local);
- «+ asignatura» crea una asignatura (se guarda en `my-context/estudios/asignaturas.yaml` en GitHub).

Para el servidor de desarrollo después.

- [ ] **Step 11: Commit**

```bash
git add src/estudio/useLocal.ts src/pantallas/Estudio.tsx src/componentes/estudio src/componentes/navegacion.ts src/App.tsx src/estilos.css
git commit -m "Estudio: pantalla con asignaturas y chat con Claude Code en local

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 12: Prueba con Diego (cierre de la etapa 1)**

Explícale a Diego, con estas palabras o parecidas:

> Para usar el chat en el PC, la app se abre con un pequeño programa en tu ordenador:
> 1. Abre una terminal en la carpeta `segundo-cerebro-app` y escribe `npm run local`. Cuando ponga «Zona de estudio lista», abre http://127.0.0.1:5174/segundo-cerebro-app/.
> 2. **La primera vez te pedirá la llave de GitHub.** Para el navegador, esta dirección es «otra web» distinta de la app publicada, y cada web guarda sus llaves por separado. Crea un token nuevo en GitHub con los mismos pasos de la otra vez (solo `my-context`, permiso *Contents* de lectura y escritura, caducidad de 90 días) y pégalo en Ajustes. **Nunca lo pegues en el chat**, solo en la app. Tiene una ventaja: si algún día pierdes una de las llaves, la otra sigue funcionando.
> 3. Entra en Estudio → General y pregúntame algo, por ejemplo: «¿Qué es una derivada? Explícamelo con un ejemplo».
> 4. Para cerrar el programa, pulsa Ctrl+C en la terminal.

Comprobad juntos:
- la respuesta llega poco a poco, con las fórmulas bien escritas;
- se puede pegar una captura con Ctrl+V y Claude la lee;
- «◂ Conversaciones» muestra la conversación;
- «Parar» funciona.

Apunta en el registro lo que Diego diga.

---

# Etapa 2: la pizarra

### Task 8: Intérprete de expresiones y cálculo de las gráficas

**Files:**
- Create: `src/estudio/expresion.ts`, `src/estudio/expresion.test.ts`, `src/estudio/grafica.ts`, `src/estudio/grafica.test.ts`

**Interfaces:**
- Produces:
  - `compilarExpresion(texto: string): (x: number) => number`, que lanza `ErrorExpresion`;
  - `muestrear(f, rangoX, rangoY, n?): Tramo[]`, con `Tramo = { x: number; y: number }[]`;
  - `marcas(a, b, objetivo?): number[]`.

- [ ] **Step 1: Escribir las pruebas (que fallen)**

`src/estudio/expresion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compilarExpresion, ErrorExpresion } from './expresion.ts';

const valor = (expr: string, x = 0) => compilarExpresion(expr)(x);

describe('compilarExpresion', () => {
  it('operaciones y prioridades', () => {
    expect(valor('x^2', 3)).toBe(9);
    expect(valor('2x+1', 2)).toBe(5);
    expect(valor('-x^2', 2)).toBe(-4);
    expect(valor('2^3^2')).toBe(512);
    expect(valor('(x+1)(x-1)', 3)).toBe(8);
    expect(valor('3·x', 2)).toBe(6);
    expect(valor('x**2', 2)).toBe(4);
    expect(valor('10/4')).toBe(2.5);
    expect(valor('2^-1')).toBe(0.5);
  });
  it('funciones y constantes', () => {
    expect(valor('sin(pi/2)')).toBeCloseTo(1);
    expect(valor('sqrt(x)', 4)).toBe(2);
    expect(valor('ln(e)')).toBeCloseTo(1);
    expect(valor('log(100)')).toBeCloseTo(2);
    expect(valor('abs(-3)')).toBe(3);
    expect(valor('2π')).toBeCloseTo(2 * Math.PI);
  });
  it('errores claros, y nunca ejecuta código', () => {
    for (const mala of ['', 'x+', 'sin x', 'foo(x)', 'x)', '2 $ 3', 'constructor', '(x+1', 'alert(1)'])
      expect(() => compilarExpresion(mala), mala).toThrow(ErrorExpresion);
  });
});
```

`src/estudio/grafica.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compilarExpresion } from './expresion.ts';
import { marcas, muestrear } from './grafica';

describe('muestrear', () => {
  it('una curva continua es un solo tramo', () => {
    const t = muestrear(compilarExpresion('x^2'), [-3, 3], [-1, 9]);
    expect(t).toHaveLength(1);
    expect(t[0][0]).toEqual({ x: -3, y: 9 });
  });
  it('1/x se parte en dos tramos', () => {
    expect(muestrear(compilarExpresion('1/x'), [-2, 2], [-5, 5])).toHaveLength(2);
  });
  it('sqrt(x) solo existe a partir de 0', () => {
    const t = muestrear(compilarExpresion('sqrt(x)'), [-2, 2], [-1, 2]);
    expect(t).toHaveLength(1);
    expect(t[0][0].x).toBeGreaterThanOrEqual(0);
  });
});

describe('marcas', () => {
  it('números redondos para los ejes', () => {
    expect(marcas(-3, 3)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(marcas(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(marcas(0, 1)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/expresion.test.ts src/estudio/grafica.test.ts`
Expected: FAIL, no existen los módulos.

- [ ] **Step 3: Escribir el código**

`src/estudio/expresion.ts`:

```ts
// Intérprete propio de expresiones para las gráficas: nunca se ejecuta código (nada de eval).
// Entiende + - * / ^ (y ** · ×), paréntesis, multiplicación sin signo (2x, 2(x+1)),
// x, pi, e y las funciones de FUNCIONES.
export class ErrorExpresion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorExpresion';
  }
}

type Nodo = (x: number) => number;
type Token = { t: 'num'; v: number; p: number } | { t: 'id'; v: string; p: number } | { t: 'op'; v: string; p: number };

const FUNCIONES: Record<string, (v: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
};
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };

function trocear(texto: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    const resto = texto.slice(i);
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(resto);
    if (num) {
      tokens.push({ t: 'num', v: Number(num[1]), p: i });
      i += num[1].length;
      continue;
    }
    const id = /^[a-zA-Z]+/.exec(resto);
    if (id) {
      tokens.push({ t: 'id', v: id[0].toLowerCase(), p: i });
      i += id[0].length;
      continue;
    }
    if (resto.startsWith('**')) {
      tokens.push({ t: 'op', v: '^', p: i });
      i += 2;
      continue;
    }
    const equivalente: Record<string, Token> = { '·': { t: 'op', v: '*', p: i }, '×': { t: 'op', v: '*', p: i }, '−': { t: 'op', v: '-', p: i }, 'π': { t: 'id', v: 'pi', p: i } };
    if ('+-*/^()'.includes(c)) tokens.push({ t: 'op', v: c, p: i });
    else if (Object.hasOwn(equivalente, c)) tokens.push(equivalente[c]);
    else throw new ErrorExpresion(`No entiendo «${c}» (posición ${i + 1})`);
    i++;
  }
  return tokens;
}

export function compilarExpresion(texto: string): (x: number) => number {
  const tokens = trocear(texto);
  let i = 0;
  const fallo = (m: string): never => {
    throw new ErrorExpresion(m);
  };
  const esOp = (v: string) => {
    const t = tokens[i];
    return t?.t === 'op' && t.v === v;
  };
  const empiezaFactor = () => {
    const t = tokens[i];
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  };
  const cerrar = () => {
    if (!esOp(')')) fallo('Falta cerrar un paréntesis');
    i++;
  };

  function suma(): Nodo {
    let izq = producto();
    while (esOp('+') || esOp('-')) {
      const op = tokens[i++].v;
      const der = producto();
      const a = izq;
      izq = op === '+' ? (x) => a(x) + der(x) : (x) => a(x) - der(x);
    }
    return izq;
  }
  function producto(): Nodo {
    let izq = unario();
    for (;;) {
      if (esOp('*') || esOp('/')) {
        const op = tokens[i++].v;
        const der = unario();
        const a = izq;
        izq = op === '*' ? (x) => a(x) * der(x) : (x) => a(x) / der(x);
      } else if (empiezaFactor()) {
        const der = potencia(); // 2x, 2(x+1), (x+1)(x-1)
        const a = izq;
        izq = (x) => a(x) * der(x);
      } else return izq;
    }
  }
  function unario(): Nodo {
    if (esOp('-')) {
      i++;
      const v = unario();
      return (x) => -v(x);
    }
    if (esOp('+')) {
      i++;
      return unario();
    }
    return potencia();
  }
  function potencia(): Nodo {
    const base = atomo();
    if (esOp('^')) {
      i++;
      const exponente = unario(); // 2^3^2 = 2^(3^2) y 2^-1
      return (x) => Math.pow(base(x), exponente(x));
    }
    return base;
  }
  function atomo(): Nodo {
    const t = tokens[i++];
    if (!t) return fallo('La expresión está incompleta');
    if (t.t === 'num') {
      const v = t.v;
      return () => v;
    }
    if (t.t === 'op' && t.v === '(') {
      const dentro = suma();
      cerrar();
      return dentro;
    }
    if (t.t === 'id') {
      if (t.v === 'x') return (x) => x;
      if (Object.hasOwn(CONSTANTES, t.v)) {
        const v = CONSTANTES[t.v];
        return () => v;
      }
      if (Object.hasOwn(FUNCIONES, t.v)) {
        const f = FUNCIONES[t.v];
        if (!esOp('(')) fallo(`Después de ${t.v} va un paréntesis, como ${t.v}(x)`);
        i++;
        const arg = suma();
        cerrar();
        return (x) => f(arg(x));
      }
      return fallo(`No conozco «${t.v}»`);
    }
    return fallo(`No esperaba «${t.v}» (posición ${t.p + 1})`);
  }

  if (!tokens.length) fallo('La expresión está vacía');
  const raiz = suma();
  if (i < tokens.length) fallo(`No esperaba «${String(tokens[i].v)}» (posición ${tokens[i].p + 1})`);
  return raiz;
}
```

`src/estudio/grafica.ts`:

```ts
export type Tramo = { x: number; y: number }[];

// Calcula los puntos de una curva. Se parte en tramos donde no existe o da un salto (como 1/x en 0).
export function muestrear(f: (x: number) => number, [x0, x1]: [number, number], [y0, y1]: [number, number], n = 240): Tramo[] {
  const alto = y1 - y0;
  const tramos: Tramo[] = [];
  let actual: Tramo = [];
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const y = f(x);
    const dentro = Number.isFinite(y) && y > y0 - alto * 4 && y < y1 + alto * 4;
    const salto = dentro && actual.length > 0 && Math.abs(y - actual[actual.length - 1].y) > alto * 2;
    if (!dentro || salto) {
      if (actual.length > 1) tramos.push(actual);
      actual = dentro ? [{ x, y }] : [];
      continue;
    }
    actual.push({ x, y });
  }
  if (actual.length > 1) tramos.push(actual);
  return tramos;
}

// Números redondos (1, 2, 5, 10…) para las marcas de un eje.
export function marcas(a: number, b: number, objetivo = 6): number[] {
  const bruto = (b - a) / objetivo;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((k) => k * potencia).find((p) => p >= bruto * 0.999) ?? 10 * potencia;
  const res: number[] = [];
  for (let k = Math.ceil(a / paso - 1e-9); k * paso <= b + paso * 1e-9; k++) res.push(Number((k * paso).toPrecision(12)));
  return res;
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/expresion.test.ts src/estudio/grafica.test.ts`
Expected: PASS. Si `marcas(0, 1)` diera `0.30000000000000004` o parecido, revisa que se use `toPrecision(12)`.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/expresion.ts src/estudio/expresion.test.ts src/estudio/grafica.ts src/estudio/grafica.test.ts
git commit -m "Pizarra: intérprete de expresiones y cálculo de gráficas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Formato de la pizarra

**Files:**
- Create: `src/estudio/pizarra.ts`, `src/estudio/pizarra.test.ts`
- Modify: `src/estudio/tipos.ts` (añadir `EstadoPizarra`)

**Interfaces:**
- Consumes: `compilarExpresion` y `ErrorExpresion` (Task 8).
- Produces:
  - Tipos: `Pieza`, `Flecha`, `Pizarra`, `ContenidoGrafica`, `Curva`, `PuntoGrafica` y `Operacion`, con este tipo:
    ```ts
    type Operacion =
      | { tipo: 'mover'; id; x; y }
      | { tipo: 'borrar'; id }
      | { tipo: 'nota'; id: string | null; x; y; contenido }
      | { tipo: 'guardada'; ruta }
    ```
  - `ErrorPizarra`.
  - `validarPizarra(bruto): { pizarra; avisos }` y `validarOperacion(bruto): Operacion`.
  - `aplicarOperacion(p, op): Pizarra`, `pizarraVacia(titulo)` y `serializarPizarra(p): string`.
  - En `tipos.ts`: `EstadoPizarra { n; pizarra: Pizarra | null; error: string | null; avisos: string[] }`.

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/estudio/pizarra.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aplicarOperacion, ErrorPizarra, pizarraVacia, validarOperacion, validarPizarra, type Pizarra } from './pizarra.ts';

const ejemplo = {
  version: 1,
  titulo: 'Leyes de Newton',
  piezas: [
    { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 320, contenido: '## Segunda ley\n$F = m·a$' },
    { id: 'f1', tipo: 'formula', x: 400, y: 20, ancho: 300, contenido: '\\vec{F} = m \\cdot \\vec{a}' },
    { id: 'g1', tipo: 'grafica', x: 0, y: 300, ancho: 360, contenido: { x: [-3, 3], y: [-1, 9], curvas: [{ expr: 'x^2', etiqueta: 'y = x²' }], puntos: [{ x: 2, y: 4, etiqueta: '(2, 4)' }] } },
    { id: 'd1', tipo: 'dibujo', x: 420, y: 300, ancho: 300, contenido: '<svg viewBox="0 0 300 200"></svg>' },
    { id: 'i1', tipo: 'imagen', x: 800, y: 0, ancho: 400, contenido: 'imagenes/ejercicio-3.png' },
    { id: 'n1', tipo: 'nota', x: 800, y: 300, ancho: 240, contenido: '¿Y con rozamiento?' },
  ],
  flechas: [{ id: 'a1', de: 't1', a: 'f1', etiqueta: 'en fórmula' }],
  guardarComo: null,
  guardadaEn: null,
};
const con = (cambios: Record<string, unknown>) => ({ ...ejemplo, ...cambios });
const pieza = (i: number, cambios: Record<string, unknown>) => con({ piezas: ejemplo.piezas.map((p, j) => (j === i ? { ...p, ...cambios } : p)) });

describe('validarPizarra', () => {
  it('acepta el ejemplo del diseño', () => {
    const { pizarra, avisos } = validarPizarra(ejemplo);
    expect(avisos).toEqual([]);
    expect(pizarra.piezas).toHaveLength(6);
    expect(pizarra.flechas).toHaveLength(1);
    expect((pizarra.piezas[2].contenido as { puntos: unknown[] }).puntos).toHaveLength(1);
  });
  it('ignora con aviso los tipos que no conoce (como los trazos de la fase siguiente)', () => {
    const r = validarPizarra(con({ piezas: [...ejemplo.piezas, { id: 'z1', tipo: 'trazo', x: 0, y: 0, ancho: 50, contenido: [] }] }));
    expect(r.pizarra.piezas).toHaveLength(6);
    expect(r.avisos[0]).toMatch(/trazo/);
  });
  it('errores', () => {
    const malas: [unknown, RegExp][] = [
      [con({ version: 2 }), /version/],
      [con({ piezas: 'x' }), /piezas/],
      [pieza(1, { id: 't1' }), /repetido/],
      [pieza(0, { ancho: 10 }), /ancho/],
      [pieza(0, { x: '5' }), /x/],
      [pieza(4, { contenido: '../secreto.png' }), /imagen/],
      [pieza(3, { contenido: '<div>' }), /svg/],
      [pieza(2, { contenido: { x: [-3, 3], y: [-1, 9], curvas: [{ expr: 'x^' }] } }), /curvas\[0\]/],
      [pieza(2, { contenido: { x: [3, -3], y: [-1, 9], curvas: [{ expr: 'x' }] } }), /menor/],
      [con({ flechas: [{ id: 'a1', de: 't1', a: 'no-existe' }] }), /flecha/],
      ['no es un objeto', /objeto/],
    ];
    for (const [mala, patron] of malas) expect(() => validarPizarra(mala)).toThrow(patron);
    expect(() => validarPizarra(con({ version: 2 }))).toThrow(ErrorPizarra);
  });
  it('guardarComo vacío cuenta como null', () => {
    expect(validarPizarra(con({ guardarComo: '  ' })).pizarra.guardarComo).toBeNull();
    expect(validarPizarra(con({ guardarComo: 'Newton' })).pizarra.guardarComo).toBe('Newton');
  });
  it('una pizarra vacía es válida', () => {
    expect(validarPizarra(JSON.parse(JSON.stringify(pizarraVacia('Pizarra 1')))).pizarra.titulo).toBe('Pizarra 1');
  });
});

describe('aplicarOperacion', () => {
  const p: Pizarra = validarPizarra(ejemplo).pizarra;
  it('mover redondea la posición', () => {
    expect(aplicarOperacion(p, { tipo: 'mover', id: 'f1', x: 10.6, y: -3.2 }).piezas[1]).toMatchObject({ x: 11, y: -3 });
  });
  it('borrar quita también sus flechas', () => {
    const r = aplicarOperacion(p, { tipo: 'borrar', id: 't1' });
    expect(r.piezas.map((x) => x.id)).not.toContain('t1');
    expect(r.flechas).toEqual([]);
  });
  it('nota nueva con id libre, y editar una nota', () => {
    const a = aplicarOperacion(pizarraVacia('x'), { tipo: 'nota', id: null, x: 5, y: 6, contenido: 'Hola' });
    const b = aplicarOperacion(a, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'Otra' });
    expect(b.piezas.map((x) => x.id)).toEqual(['nota1', 'nota2']);
    expect(aplicarOperacion(b, { tipo: 'nota', id: 'nota1', x: 0, y: 0, contenido: 'Cambiada' }).piezas[0]).toMatchObject({ contenido: 'Cambiada', x: 5 });
  });
  it('una nota nunca pisa una pieza de Claude con el mismo id', () => {
    const r = aplicarOperacion(p, { tipo: 'nota', id: 't1', x: 0, y: 0, contenido: 'x' });
    expect(r.piezas[0].contenido).toBe('## Segunda ley\n$F = m·a$');
    expect(r.piezas).toHaveLength(7);
  });
  it('guardada', () => {
    const r = aplicarOperacion({ ...p, guardarComo: 'Newton' }, { tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json' });
    expect(r).toMatchObject({ guardarComo: null, guardadaEn: 'estudios/fisica/pizarras/a.json' });
  });
  it('mover una pieza que ya no existe no hace nada', () => {
    expect(aplicarOperacion(p, { tipo: 'mover', id: 'zzz', x: 0, y: 0 }).piezas).toEqual(p.piezas);
  });
});

describe('validarOperacion', () => {
  it('acepta las buenas y rechaza las malas', () => {
    expect(validarOperacion({ tipo: 'borrar', id: 'a' })).toEqual({ tipo: 'borrar', id: 'a' });
    expect(() => validarOperacion({ tipo: 'volar' })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'mover', id: 'a', x: 'x', y: 0 })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'guardada', ruta: '../../fuera.json' })).toThrow(ErrorPizarra);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/pizarra.test.ts`
Expected: FAIL, no existe `./pizarra.ts`.

- [ ] **Step 3: Escribir el código**

`src/estudio/pizarra.ts`:

```ts
import { compilarExpresion, ErrorExpresion } from './expresion.ts';

// Formato de pizarra-<n>.json. Lo escribe Claude y lo lee la app (ver docs/diseno.md).
export type TipoTexto = 'texto' | 'formula' | 'dibujo' | 'imagen' | 'nota';
export interface Curva { expr: string; etiqueta?: string; color?: string }
export interface PuntoGrafica { x: number; y: number; etiqueta?: string }
export interface ContenidoGrafica { x: [number, number]; y: [number, number]; curvas: Curva[]; puntos: PuntoGrafica[] }
interface BasePieza { id: string; x: number; y: number; ancho: number; color?: string }
export type Pieza =
  | (BasePieza & { tipo: TipoTexto; contenido: string })
  | (BasePieza & { tipo: 'grafica'; contenido: ContenidoGrafica });
export interface Flecha { id: string; de: string; a: string; etiqueta?: string }
export interface Pizarra {
  version: 1;
  titulo: string;
  piezas: Pieza[];
  flechas: Flecha[];
  guardarComo: string | null;
  guardadaEn: string | null;
}
export type Operacion =
  | { tipo: 'mover'; id: string; x: number; y: number }
  | { tipo: 'borrar'; id: string }
  | { tipo: 'nota'; id: string | null; x: number; y: number; contenido: string }
  | { tipo: 'guardada'; ruta: string };

export class ErrorPizarra extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPizarra';
  }
}

const TIPOS_TEXTO: readonly string[] = ['texto', 'formula', 'dibujo', 'imagen', 'nota'];
const LIMITE = 100_000;

function objeto(v: unknown, donde: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ErrorPizarra(`${donde} debe ser un objeto`);
  return v as Record<string, unknown>;
}
function numero(v: unknown, donde: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITE)
    throw new ErrorPizarra(`${donde} debe ser un número entre -${LIMITE} y ${LIMITE}`);
  return v;
}
function texto(v: unknown, donde: string): string {
  if (typeof v !== 'string') throw new ErrorPizarra(`${donde} debe ser un texto`);
  return v;
}
function opcional(v: unknown, donde: string): string | undefined {
  return v === undefined || v === null ? undefined : texto(v, donde);
}
function rango(v: unknown, donde: string): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) throw new ErrorPizarra(`${donde} debe ser [mínimo, máximo]`);
  const a = numero(v[0], `${donde}[0]`);
  const b = numero(v[1], `${donde}[1]`);
  if (a >= b) throw new ErrorPizarra(`${donde}: el primer número debe ser menor que el segundo`);
  return [a, b];
}
function sinVacios<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function validarGrafica(v: unknown, donde: string): ContenidoGrafica {
  const g = objeto(v, donde);
  if (!Array.isArray(g.curvas) || g.curvas.length === 0 || g.curvas.length > 8)
    throw new ErrorPizarra(`${donde}.curvas debe tener entre 1 y 8 curvas`);
  const curvas = g.curvas.map((c, i) => {
    const o = objeto(c, `${donde}.curvas[${i}]`);
    const expr = texto(o.expr, `${donde}.curvas[${i}].expr`);
    try {
      compilarExpresion(expr);
    } catch (e) {
      if (e instanceof ErrorExpresion) throw new ErrorPizarra(`${donde}.curvas[${i}] «${expr}»: ${e.message}`);
      throw e;
    }
    return sinVacios({ expr, etiqueta: opcional(o.etiqueta, 'etiqueta'), color: opcional(o.color, 'color') });
  });
  if (g.puntos !== undefined && !Array.isArray(g.puntos)) throw new ErrorPizarra(`${donde}.puntos debe ser una lista`);
  const puntos = ((g.puntos as unknown[] | undefined) ?? []).map((pt, i) => {
    const o = objeto(pt, `${donde}.puntos[${i}]`);
    return sinVacios({ x: numero(o.x, `${donde}.puntos[${i}].x`), y: numero(o.y, `${donde}.puntos[${i}].y`), etiqueta: opcional(o.etiqueta, 'etiqueta') });
  });
  return { x: rango(g.x, `${donde}.x`), y: rango(g.y, `${donde}.y`), curvas, puntos };
}

export function validarPizarra(bruto: unknown): { pizarra: Pizarra; avisos: string[] } {
  const p = objeto(bruto, 'La pizarra');
  if (p.version !== 1) throw new ErrorPizarra('version debe ser 1');
  if (!Array.isArray(p.piezas)) throw new ErrorPizarra('piezas debe ser una lista');
  const flechasBrutas = p.flechas ?? [];
  if (!Array.isArray(flechasBrutas)) throw new ErrorPizarra('flechas debe ser una lista');
  const avisos: string[] = [];
  const ids = new Set<string>();
  const piezas: Pieza[] = [];

  p.piezas.forEach((bruta, i) => {
    const donde = `piezas[${i}]`;
    const o = objeto(bruta, donde);
    const id = texto(o.id, `${donde}.id`);
    if (!id || ids.has(id)) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
    if (o.tipo !== 'grafica' && !TIPOS_TEXTO.includes(o.tipo as string)) {
      avisos.push(`${donde}: no conozco el tipo «${String(o.tipo)}», la ignoro`);
      return;
    }
    ids.add(id);
    const ancho = numero(o.ancho, `${donde}.ancho`);
    if (ancho < 40 || ancho > 2000) throw new ErrorPizarra(`${donde}.ancho debe estar entre 40 y 2000`);
    const base = sinVacios({ id, x: numero(o.x, `${donde}.x`), y: numero(o.y, `${donde}.y`), ancho, color: opcional(o.color, `${donde}.color`) });
    if (o.tipo === 'grafica') {
      piezas.push({ ...base, tipo: 'grafica', contenido: validarGrafica(o.contenido, `${donde}.contenido`) });
      return;
    }
    const contenido = texto(o.contenido, `${donde}.contenido`);
    if (o.tipo === 'imagen' && (!/^imagenes\/[\w.-]+$/.test(contenido) || contenido.includes('..')))
      throw new ErrorPizarra(`${donde}: una imagen debe ser «imagenes/<nombre>»`);
    if (o.tipo === 'dibujo' && !contenido.trimStart().startsWith('<svg'))
      throw new ErrorPizarra(`${donde}: un dibujo debe empezar por <svg`);
    piezas.push({ ...base, tipo: o.tipo as TipoTexto, contenido });
  });

  const idsFlechas = new Set<string>();
  const flechas = flechasBrutas.map((b, i): Flecha => {
    const donde = `flechas[${i}]`;
    const o = objeto(b, donde);
    const id = texto(o.id, `${donde}.id`);
    if (!id || idsFlechas.has(id)) throw new ErrorPizarra(`${donde}: el id «${id}» está vacío o repetido`);
    idsFlechas.add(id);
    const de = texto(o.de, `${donde}.de`);
    const a = texto(o.a, `${donde}.a`);
    if (!ids.has(de) || !ids.has(a)) throw new ErrorPizarra(`flecha ${id}: une piezas que no existen`);
    return sinVacios({ id, de, a, etiqueta: opcional(o.etiqueta, `${donde}.etiqueta`) });
  });

  return {
    pizarra: {
      version: 1,
      titulo: typeof p.titulo === 'string' && p.titulo.trim() ? p.titulo : 'Pizarra',
      piezas,
      flechas,
      guardarComo: opcional(p.guardarComo, 'guardarComo')?.trim() || null,
      guardadaEn: opcional(p.guardadaEn, 'guardadaEn') ?? null,
    },
    avisos,
  };
}

export function pizarraVacia(titulo: string): Pizarra {
  return { version: 1, titulo, piezas: [], flechas: [], guardarComo: null, guardadaEn: null };
}

export function serializarPizarra(p: Pizarra): string {
  return JSON.stringify(p, null, 2) + '\n';
}

function idLibre(p: Pizarra, prefijo: string): string {
  const usados = new Set(p.piezas.map((x) => x.id));
  for (let n = 1; ; n++) if (!usados.has(`${prefijo}${n}`)) return `${prefijo}${n}`;
}

export function aplicarOperacion(p: Pizarra, op: Operacion): Pizarra {
  switch (op.tipo) {
    case 'mover':
      return { ...p, piezas: p.piezas.map((x) => (x.id === op.id ? { ...x, x: Math.round(op.x), y: Math.round(op.y) } : x)) };
    case 'borrar':
      return { ...p, piezas: p.piezas.filter((x) => x.id !== op.id), flechas: p.flechas.filter((f) => f.de !== op.id && f.a !== op.id) };
    case 'nota': {
      const existe = op.id !== null && p.piezas.some((x) => x.id === op.id && x.tipo === 'nota');
      if (existe) return { ...p, piezas: p.piezas.map((x) => (x.id === op.id && x.tipo === 'nota' ? { ...x, contenido: op.contenido } : x)) };
      const nueva: Pieza = { id: idLibre(p, 'nota'), tipo: 'nota', x: Math.round(op.x), y: Math.round(op.y), ancho: 240, contenido: op.contenido };
      return { ...p, piezas: [...p.piezas, nueva] };
    }
    case 'guardada':
      return { ...p, guardadaEn: op.ruta, guardarComo: null };
  }
}

export function validarOperacion(bruto: unknown): Operacion {
  const o = objeto(bruto, 'La operación');
  switch (o.tipo) {
    case 'mover':
      return { tipo: 'mover', id: texto(o.id, 'id'), x: numero(o.x, 'x'), y: numero(o.y, 'y') };
    case 'borrar':
      return { tipo: 'borrar', id: texto(o.id, 'id') };
    case 'nota':
      return { tipo: 'nota', id: o.id === null ? null : texto(o.id, 'id'), x: numero(o.x, 'x'), y: numero(o.y, 'y'), contenido: texto(o.contenido, 'contenido').slice(0, 5000) };
    case 'guardada': {
      const ruta = texto(o.ruta, 'ruta');
      if (!/^estudios\/[a-z0-9-]+\/pizarras\/[\w.-]+\.json$/.test(ruta) || ruta.includes('..')) throw new ErrorPizarra('ruta no válida');
      return { tipo: 'guardada', ruta };
    }
    default:
      throw new ErrorPizarra('Operación desconocida');
  }
}
```

Al final de `src/estudio/tipos.ts` añade:

```ts
import type { Pizarra } from './pizarra.ts';

// Una pizarra en curso tal y como la devuelve el programa local.
// Si el archivo está roto, `pizarra` es la última versión buena y `error` explica qué pasa.
export interface EstadoPizarra {
  n: number;
  pizarra: Pizarra | null;
  error: string | null;
  avisos: string[];
}
```

(mueve la línea `import type` al principio del archivo).

- [ ] **Step 4: Ejecutar las pruebas y el build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/pizarra.test.ts && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/pizarra.ts src/estudio/pizarra.test.ts src/estudio/tipos.ts
git commit -m "Pizarra: formato, validación y operaciones de Diego

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Pizarras en el programa local

**Files:**
- Create: `local/pizarras.ts`, `local/pizarras.test.ts`, `../my-context/.gitignore`
- Modify: `local/servidor.ts`, `local/servidor.test.ts`, `local/instrucciones-estudio.md`

**Interfaces:**
- Consumes: `validarPizarra`, `aplicarOperacion`, `validarOperacion`, `pizarraVacia`, `serializarPizarra` y `ErrorPizarra` (Task 9); `EstadoPizarra` y `EventoPizarra`.
- Produces:
  - `rutaPizarra(carpeta, n)` y `leerPizarra(carpeta, n): Promise<EstadoPizarra>`;
  - `listarPizarras(carpeta): Promise<EstadoPizarra[]>`;
  - `crearPizarra(carpeta): Promise<number>`;
  - `operarPizarra(carpeta, n, op): Promise<Pizarra>`;
  - `pizarrasNoValidas(carpeta, desdeMs): Promise<{ n; error }[]>`;
  - `interpretarCambio(nombre): EventoPizarra | null`;
  - `vigilarPizarras(estudios, alCambiar): () => void`;
  - rutas nuevas: `GET pizarras?asignatura&id`, `POST pizarra/nueva {asignatura,id}` → `{n}` y `POST pizarra/operacion {asignatura,id,n,op}` → `Pizarra`.

- [ ] **Step 1: Escribir la prueba (que falle)**

`local/pizarras.test.ts`:

```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EventoPizarra } from '../src/estudio/tipos.ts';
import { crearPizarra, interpretarCambio, leerPizarra, listarPizarras, operarPizarra, pizarrasNoValidas, rutaPizarra, vigilarPizarras } from './pizarras.ts';

const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const carpetaNueva = () => mkdtempSync(path.join(os.tmpdir(), 'pizarras-'));

describe('pizarras en el disco', () => {
  it('crear, listar y operar', async () => {
    const c = carpetaNueva();
    expect(await crearPizarra(c)).toBe(1);
    expect(await crearPizarra(c)).toBe(2);
    const lista = await listarPizarras(c);
    expect(lista.map((e) => [e.n, e.pizarra?.titulo, e.error])).toEqual([[1, 'Pizarra 1', null], [2, 'Pizarra 2', null]]);
    const p = await operarPizarra(c, 1, { tipo: 'nota', id: null, x: 10, y: 20, contenido: 'Hola' });
    expect(p.piezas).toHaveLength(1);
    expect((await leerPizarra(c, 1)).pizarra?.piezas[0]).toMatchObject({ tipo: 'nota', contenido: 'Hola' });
  });
  it('dos operaciones a la vez se aplican las dos (van en cola)', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await Promise.all([
      operarPizarra(c, 1, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'A' }),
      operarPizarra(c, 1, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'B' }),
    ]);
    expect((await leerPizarra(c, 1)).pizarra?.piezas.map((x) => x.contenido)).toEqual(['A', 'B']);
  });
  it('archivo roto: se enseña la última versión buena con el error, y no se deja operar encima', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await leerPizarra(c, 1); // la recuerda como buena
    writeFileSync(rutaPizarra(c, 1), '{ "version": 1, "piezas": [');
    const e = await leerPizarra(c, 1);
    expect(e.pizarra?.titulo).toBe('Pizarra 1');
    expect(e.error).toMatch(/JSON/);
    await expect(operarPizarra(c, 1, { tipo: 'borrar', id: 'x' })).rejects.toThrow();
    const antes = Date.now() - 5000;
    expect(await pizarrasNoValidas(c, antes)).toEqual([{ n: 1, error: e.error }]);
    expect(await pizarrasNoValidas(c, Date.now() + 5000)).toEqual([]);
  });
});

describe('interpretarCambio', () => {
  it('reconoce pizarras con barras de Windows y de Linux', () => {
    const esperado: EventoPizarra = { tipo: 'pizarra', asignatura: 'fisica', conversacion: ID, n: 2 };
    expect(interpretarCambio(`fisica\\.en-curso\\${ID}\\pizarra-2.json`)).toEqual(esperado);
    expect(interpretarCambio(`fisica/.en-curso/${ID}/pizarra-2.json`)).toEqual(esperado);
  });
  it('ignora lo demás', () => {
    expect(interpretarCambio(`fisica/.en-curso/${ID}/pizarra-2.json.123.tmp`)).toBeNull();
    expect(interpretarCambio(`fisica/.en-curso/${ID}/imagenes/a.png`)).toBeNull();
    expect(interpretarCambio('asignaturas.yaml')).toBeNull();
  });
});

describe('vigilarPizarras', () => {
  it('avisa cuando cambia una pizarra', async () => {
    const estudios = carpetaNueva();
    const carpeta = path.join(estudios, 'fisica', '.en-curso', ID);
    mkdirSync(carpeta, { recursive: true });
    const eventos: EventoPizarra[] = [];
    const parar = vigilarPizarras(estudios, (e) => eventos.push(e));
    await new Promise((r) => setTimeout(r, 200));
    writeFileSync(path.join(carpeta, 'pizarra-1.json'), '{}');
    await expect.poll(() => eventos.length, { timeout: 3000 }).toBeGreaterThan(0);
    expect(eventos[0]).toEqual({ tipo: 'pizarra', asignatura: 'fisica', conversacion: ID, n: 1 });
    parar();
  });
});
```

Añade al final de `local/servidor.test.ts`:

```ts
describe('pizarras', () => {
  const id = '55555555-5555-4555-8555-555555555555';
  it('nueva, operación y lista', async () => {
    const { n } = await (await post('pizarra/nueva', { asignatura: 'fisica', id })).json();
    expect(n).toBe(1);
    const p = await (await post('pizarra/operacion', { asignatura: 'fisica', id, n: 1, op: { tipo: 'nota', id: null, x: 1, y: 2, contenido: 'Hola' } })).json();
    expect(p.piezas).toHaveLength(1);
    const lista = await (await fetch(`${API}pizarras?asignatura=fisica&id=${id}`)).json();
    expect(lista[0]).toMatchObject({ n: 1, error: null });
    expect((await post('pizarra/operacion', { asignatura: 'fisica', id, n: 1, op: { tipo: 'volar' } })).status).toBe(400);
  });
  it('si Claude deja una pizarra mal escrita, se le pide que la arregle una vez', async () => {
    const otra = '66666666-6666-4666-8666-666666666666';
    const r = await post('mensaje', { asignatura: 'fisica', id: otra, nueva: true, texto: 'PIZARRA-MALA', imagenes: [] });
    const evs = await eventos(r);
    expect(evs.some((e) => e.tipo === 'herramienta' && e.texto.startsWith('⚠️'))).toBe(true);
    const lista = await (await fetch(`${API}pizarras?asignatura=fisica&id=${otra}`)).json();
    expect(lista[0]).toMatchObject({ n: 1, error: null });
    expect(lista[0].pizarra.titulo).toBe('Arreglada');
    const llamadas = registrado().filter((x) => x.entrada.includes(otra) || x.args.includes(otra));
    expect(llamadas).toHaveLength(2);
    expect(llamadas[1].args).toContain('--resume');
    expect(llamadas[1].entrada).toContain('no es válida');
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run local/pizarras.test.ts local/servidor.test.ts`
Expected: FAIL (no existe `./pizarras.ts` y las rutas nuevas dan 404).

- [ ] **Step 3: Escribir `local/pizarras.ts`**

```ts
import { watch, type FSWatcher } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { aplicarOperacion, ErrorPizarra, pizarraVacia, serializarPizarra, validarPizarra, type Operacion, type Pizarra } from '../src/estudio/pizarra.ts';
import type { EstadoPizarra, EventoPizarra } from '../src/estudio/tipos.ts';

const PATRON = /^pizarra-(\d+)\.json$/;
// Última versión buena de cada pizarra, para enseñarla si Claude deja el archivo a medio escribir.
const ultimasBuenas = new Map<string, Pizarra>();
// Las operaciones de Diego sobre una misma pizarra van de una en una.
const colas = new Map<string, Promise<unknown>>();

export const rutaPizarra = (carpeta: string, n: number) => path.join(carpeta, `pizarra-${n}.json`);

async function numeros(carpeta: string): Promise<number[]> {
  try {
    return (await readdir(carpeta))
      .map((nombre) => PATRON.exec(nombre))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function leerPizarra(carpeta: string, n: number): Promise<EstadoPizarra> {
  const ruta = rutaPizarra(carpeta, n);
  try {
    const { pizarra, avisos } = validarPizarra(JSON.parse(await readFile(ruta, 'utf8')));
    ultimasBuenas.set(ruta, pizarra);
    return { n, pizarra, error: null, avisos };
  } catch (e) {
    const error = e instanceof SyntaxError ? `JSON mal escrito: ${e.message}` : e instanceof Error ? e.message : String(e);
    return { n, pizarra: ultimasBuenas.get(ruta) ?? null, error, avisos: [] };
  }
}

export async function listarPizarras(carpeta: string): Promise<EstadoPizarra[]> {
  return Promise.all((await numeros(carpeta)).map((n) => leerPizarra(carpeta, n)));
}

// Se escribe en un archivo aparte y luego se renombra: así nadie lee nunca media pizarra escrita por la app.
export async function escribirAtomico(ruta: string, texto: string): Promise<void> {
  const temporal = `${ruta}.${process.pid}.tmp`;
  await writeFile(temporal, texto, 'utf8');
  await rename(temporal, ruta);
}

export async function crearPizarra(carpeta: string): Promise<number> {
  await mkdir(carpeta, { recursive: true });
  const n = ((await numeros(carpeta)).at(-1) ?? 0) + 1;
  await escribirAtomico(rutaPizarra(carpeta, n), serializarPizarra(pizarraVacia(`Pizarra ${n}`)));
  return n;
}

export function operarPizarra(carpeta: string, n: number, op: Operacion): Promise<Pizarra> {
  const ruta = rutaPizarra(carpeta, n);
  const siguiente = (colas.get(ruta) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const estado = await leerPizarra(carpeta, n);
      // Si la pizarra está rota (Claude la está escribiendo), no se sobrescribe su trabajo.
      if (estado.error || !estado.pizarra) throw new ErrorPizarra(estado.error ?? 'La pizarra no existe');
      const nueva = aplicarOperacion(estado.pizarra, op);
      await escribirAtomico(ruta, serializarPizarra(nueva));
      ultimasBuenas.set(ruta, nueva);
      return nueva;
    });
  colas.set(ruta, siguiente);
  return siguiente;
}

export async function pizarrasNoValidas(carpeta: string, desde: number): Promise<{ n: number; error: string }[]> {
  const malas: { n: number; error: string }[] = [];
  for (const n of await numeros(carpeta)) {
    try {
      if ((await stat(rutaPizarra(carpeta, n))).mtimeMs < desde) continue;
    } catch {
      continue;
    }
    const e = await leerPizarra(carpeta, n);
    if (e.error) malas.push({ n, error: e.error });
  }
  return malas;
}

const PATRON_CAMBIO = /^([a-z0-9][a-z0-9-]*)[\\/]\.en-curso[\\/]([0-9a-f-]{36})[\\/]pizarra-(\d+)\.json$/;

export function interpretarCambio(nombre: string): EventoPizarra | null {
  const m = PATRON_CAMBIO.exec(nombre);
  return m ? { tipo: 'pizarra', asignatura: m[1], conversacion: m[2], n: Number(m[3]) } : null;
}

export function vigilarPizarras(estudios: string, alCambiar: (e: EventoPizarra) => void): () => void {
  let vigia: FSWatcher | null = null;
  const pendientes = new Map<string, ReturnType<typeof setTimeout>>();
  try {
    vigia = watch(estudios, { recursive: true }, (_tipo, nombre) => {
      const evento = nombre ? interpretarCambio(String(nombre)) : null;
      if (!evento) return;
      // Un guardado genera varios avisos seguidos: se espera un momento y se manda uno.
      const clave = String(nombre);
      clearTimeout(pendientes.get(clave));
      pendientes.set(clave, setTimeout(() => {
        pendientes.delete(clave);
        alCambiar(evento);
      }, 120));
    });
    vigia.on('error', () => undefined);
  } catch (e) {
    console.warn(`No puedo vigilar ${estudios}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return () => {
    vigia?.close();
    pendientes.forEach(clearTimeout);
  };
}
```

- [ ] **Step 4: Conectar las pizarras en el servidor**

En `local/servidor.ts`:

1. Añade los imports:

```ts
import { ErrorPizarra, validarOperacion, type Operacion } from '../src/estudio/pizarra.ts';
import { crearPizarra, listarPizarras, operarPizarra, pizarrasNoValidas, vigilarPizarras } from './pizarras.ts';
```

2. Después de la función `conversacionDe`, añade:

```ts
function numeroPizarra(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new ErrorPeticion(400, 'Número de pizarra no válido');
  return v;
}
```

3. En `'POST mensaje'`, sustituye la línea `await conversar(asig, id, b.nueva === true, conCabecera(texto || 'Mira la captura.'), emitir, res);` por:

```ts
      const inicio = Date.now() - 50;
      const ok = await conversar(asig, id, b.nueva === true, conCabecera(texto || 'Mira la captura.'), emitir, res);
      // Si Claude ha dejado alguna pizarra mal escrita, se le pide una sola vez que la arregle.
      if (ok && !res.destroyed) {
        const malas = await pizarrasNoValidas(carpeta, inicio);
        if (malas.length) {
          emitir({ tipo: 'herramienta', texto: `⚠️ La pizarra ${malas.map((m) => m.n).join(', ')} no era válida: la estoy arreglando` });
          const aviso = malas.map((m) => `La pizarra ${m.n} no es válida: ${m.error}. Arréglala.`).join('\n');
          await conversar(asig, id, false, conCabecera(aviso), emitir, res);
        }
      }
```

4. Dentro del objeto `rutas`, añade:

```ts
    'GET pizarras': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const id = conversacionDe(url.searchParams.get('id'));
      enviarJson(res, 200, await listarPizarras(carpetaDe(asig, id)));
    },

    'POST pizarra/nueva': async (req, res) => {
      const b = await leerJson(req);
      enviarJson(res, 200, { n: await crearPizarra(carpetaDe(asignaturaDe(b.asignatura), conversacionDe(b.id))) });
    },

    'POST pizarra/operacion': async (req, res) => {
      const b = await leerJson(req);
      const carpeta = carpetaDe(asignaturaDe(b.asignatura), conversacionDe(b.id));
      const n = numeroPizarra(b.n);
      let op: Operacion;
      try {
        op = validarOperacion(b.op);
      } catch (e) {
        throw new ErrorPeticion(400, e instanceof Error ? e.message : String(e));
      }
      try {
        enviarJson(res, 200, await operarPizarra(carpeta, n, op));
      } catch (e) {
        if (e instanceof ErrorPizarra) throw new ErrorPeticion(409, e.message);
        throw e;
      }
    },
```

5. Sustituye las dos últimas líneas de `crearServidor` (`const servidor = …` y el `return`) por:

```ts
  const servidor = http.createServer((req, res) => void manejar(req, res));
  const pararVigia = vigilarPizarras(o.estudios, emitirATodos);
  servidor.on('close', pararVigia);
  return { servidor, emitirATodos, rutas, carpetaDe, conversar };
```

- [ ] **Step 5: Instrucciones de la pizarra**

En `local/instrucciones-estudio.md`, sustituye la línea `- Aún no hay pizarra: explica solo en el chat.` por:

````markdown
- Usa la **pizarra** solo cuando Diego pida que le expliques algo con calma, un esquema o un dibujo, o cuando una explicación se entienda mucho mejor vista que leída. Nunca hagas un resumen automático al final.
- En el chat, cuando uses la pizarra, di en una frase qué has puesto en ella («Te lo he dibujado en la pizarra 👉»).

## La pizarra
- Cada conversación tiene su carpeta (la de «Pizarras de esta conversación» en la cabecera). Dentro, las pizarras son `pizarra-1.json`, `pizarra-2.json`…
- Escribe en la **pizarra abierta**. Si no hay ninguna abierta, o Diego pide «pizarra nueva», o cambiáis de tema, crea la siguiente `pizarra-<n>.json`.
- Antes de cambiar una pizarra, léela: Diego puede haber movido o borrado piezas, o haber añadido notas (tipo `nota`). Respeta lo que haya hecho y mira sus notas: a veces te pregunta algo en ellas.
- Formato (JSON, sin comentarios):
  ```json
  { "version": 1, "titulo": "Leyes de Newton",
    "piezas": [ { "id": "t1", "tipo": "texto", "x": 0, "y": 0, "ancho": 320, "contenido": "## Título\nTexto con $F = m a$" } ],
    "flechas": [ { "id": "a1", "de": "t1", "a": "f1", "etiqueta": "por tanto" } ],
    "guardarComo": null, "guardadaEn": null }
  ```
- Tipos de pieza (todos llevan `id` único, `tipo`, `x`, `y` y `ancho` entre 40 y 2000; opcional `color` para el borde):
  - `texto`: Markdown con fórmulas `$…$` y `$$…$$`.
  - `formula`: solo LaTeX, sin `$` (se dibuja grande).
  - `grafica`: `contenido` = `{ "x": [min, max], "y": [min, max], "curvas": [ { "expr": "x^2", "etiqueta": "y = x²" } ], "puntos": [ { "x": 2, "y": 4, "etiqueta": "(2, 4)" } ] }`. Las expresiones usan `x`, `+ - * / ^`, paréntesis, `pi`, `e` y `sin cos tan asin acos atan sqrt abs ln log exp`.
  - `dibujo`: un SVG que empiece por `<svg viewBox="…">`. Sin scripts, sin imágenes externas y sin `<style>`: usa atributos como `stroke` y `fill`. Aquí puedes ser creativo (diagramas de fuerzas, esquemas, circuitos…).
  - `imagen`: `contenido` = `"imagenes/<nombre>"`, para poner en la pizarra una captura que te haya pasado Diego.
  - `nota`: son de Diego. No las crees tú, salvo que te lo pida.
- Reparte las piezas por el lienzo (a la derecha y hacia abajo), con espacio entre ellas, como en una pizarra de verdad. Usa flechas para unir ideas.
- Si Diego te pide guardar la pizarra en el historial, escribe su título en `"guardarComo"` (la app la sube sola y luego vuelve a ponerlo a `null`).
````

- [ ] **Step 6: Que git no suba las pizarras en curso**

```bash
cd /c/Users/Diego/Desktop/my-context && git pull
printf 'estudios/**/.en-curso/\n' > .gitignore
git add .gitignore && git commit -m "No subir las pizarras en curso de la zona de estudio

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push
cd /c/Users/Diego/Desktop/segundo-cerebro-app
```

(Si `my-context/.gitignore` ya existía, añade la línea en vez de sobrescribirlo. `my-context` sigue su propia rutina de git, que sí incluye `git push`: díselo a Diego.)

- [ ] **Step 7: Ejecutar todas las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 8: Commit**

```bash
git add local/pizarras.ts local/pizarras.test.ts local/servidor.ts local/servidor.test.ts local/instrucciones-estudio.md
git commit -m "Programa local: pizarras en curso, operaciones de Diego, arreglo automático y avisos de cambios

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Dibujar la pizarra

**Files:**
- Create: `src/estudio/geometria.ts`, `src/estudio/geometria.test.ts`, `src/estudio/svg.ts`, `src/componentes/estudio/Formula.tsx`, `src/componentes/estudio/Grafica.tsx`, `src/componentes/estudio/PiezaPizarra.tsx`, `src/componentes/estudio/Pizarra.tsx`
- Modify: `src/estilos.css`

**Interfaces:**
- Consumes: `Pizarra`, `Pieza`, `Operacion` y `ContenidoGrafica` (Task 9); `compilarExpresion` (Task 8); `muestrear` y `marcas` (Task 8); `Markdown` (Task 6).
- Produces:
  - `Rect`, `Vista`, `centro`, `puntoEnBorde`, `encuadrar`, `zoomEn` y `aMundo`;
  - `limpiarSvg(svg): string`;
  - `<Pizarra pizarra imagen alOperar? children? />`: sin `alOperar` es de solo lectura. `imagen(ruta): Promise<string>` devuelve una URL para `<img>`.

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/estudio/geometria.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aMundo, encuadrar, puntoEnBorde, zoomEn } from './geometria';

describe('geometría de la pizarra', () => {
  const r = { x: 0, y: 0, w: 100, h: 50 };
  it('la flecha sale del borde de la pieza, no del centro', () => {
    expect(puntoEnBorde(r, { x: 500, y: 25 })).toEqual({ x: 100, y: 25 });
    expect(puntoEnBorde(r, { x: 50, y: -500 })).toEqual({ x: 50, y: 0 });
    expect(puntoEnBorde(r, { x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
  });
  it('encuadrar centra las piezas y no hace un zoom exagerado', () => {
    const v = encuadrar([r], 1000, 600);
    expect(v.escala).toBe(1.5);
    expect(v.x + (50 * v.escala)).toBeCloseTo(500);
    expect(v.y + (25 * v.escala)).toBeCloseTo(300);
    expect(encuadrar([], 1000, 600)).toEqual({ x: 40, y: 40, escala: 1 });
  });
  it('el zoom deja quieto el punto del ratón', () => {
    const v = { x: 10, y: 20, escala: 1 };
    const p = { x: 300, y: 200 };
    const antes = aMundo(v, p);
    const despues = aMundo(zoomEn(v, 2, p), p);
    expect(despues.x).toBeCloseTo(antes.x);
    expect(despues.y).toBeCloseTo(antes.y);
    expect(zoomEn(v, 1000, p).escala).toBe(4);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/geometria.test.ts`
Expected: FAIL, no existe `./geometria`.

- [ ] **Step 3: Escribir la geometría y la limpieza del SVG**

`src/estudio/geometria.ts`:

```ts
export interface Punto { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
// Cómo se ve el lienzo: en pantalla = mundo × escala + (x, y).
export interface Vista { x: number; y: number; escala: number }

export const centro = (r: Rect): Punto => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// Punto del borde de `r` en la línea que va de su centro hacia `hacia`.
export function puntoEnBorde(r: Rect, hacia: Punto): Punto {
  const c = centro(r);
  const dx = hacia.x - c.x;
  const dy = hacia.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const t = Math.min(dx !== 0 ? r.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? r.h / 2 / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export function encuadrar(rects: Rect[], ancho: number, alto: number, margen = 40): Vista {
  if (!rects.length) return { x: margen, y: margen, escala: 1 };
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  const escala = Math.min(1.5, Math.max(0.1, Math.min((ancho - 2 * margen) / (x1 - x0 || 1), (alto - 2 * margen) / (y1 - y0 || 1))));
  return { x: (ancho - (x1 - x0) * escala) / 2 - x0 * escala, y: (alto - (y1 - y0) * escala) / 2 - y0 * escala, escala };
}

export function zoomEn(v: Vista, factor: number, p: Punto): Vista {
  const escala = Math.min(4, Math.max(0.1, v.escala * factor));
  const f = escala / v.escala;
  return { escala, x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f };
}

export const aMundo = (v: Vista, p: Punto): Punto => ({ x: (p.x - v.x) / v.escala, y: (p.y - v.y) / v.escala });
```

`src/estudio/svg.ts`:

```ts
import DOMPurify from 'dompurify';

// El dibujo de Claude se limpia: sin scripts, enlaces, imágenes externas ni estilos que afecten a la página.
export function limpiarSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['image', 'use', 'a', 'foreignObject', 'style', 'script'],
  });
}
```

- [ ] **Step 4: Piezas y lienzo**

`src/componentes/estudio/Formula.tsx`:

```tsx
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

export function Formula({ tex, bloque = false }: { tex: string; bloque?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: bloque, throwOnError: false, output: 'html' }), [tex, bloque]);
  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`src/componentes/estudio/Grafica.tsx`:

```tsx
import { useId, useMemo } from 'react';
import { compilarExpresion } from '../../estudio/expresion';
import { marcas, muestrear } from '../../estudio/grafica';
import type { ContenidoGrafica } from '../../estudio/pizarra';

const COLORES = ['#b8603d', '#3d7bb8', '#5a8f4e', '#8a5bb0', '#c08a2e'];

export function Grafica({ contenido, ancho }: { contenido: ContenidoGrafica; ancho: number }) {
  const idRecorte = useId().replace(/:/g, '');
  const alto = Math.round(ancho * 0.75);
  const m = 28;
  const [x0, x1] = contenido.x;
  const [y0, y1] = contenido.y;
  const px = (x: number) => m + ((x - x0) / (x1 - x0)) * (ancho - 2 * m);
  const py = (y: number) => alto - m - ((y - y0) / (y1 - y0)) * (alto - 2 * m);
  const curvas = useMemo(
    () =>
      contenido.curvas.map((c, i) => {
        try {
          return { c, color: c.color ?? COLORES[i % COLORES.length], tramos: muestrear(compilarExpresion(c.expr), contenido.x, contenido.y), error: null };
        } catch (e) {
          return { c, color: '', tramos: [], error: e instanceof Error ? e.message : String(e) };
        }
      }),
    [contenido],
  );

  return (
    <div className="grafica">
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%">
        <defs>
          <clipPath id={idRecorte}><rect x={m} y={m} width={ancho - 2 * m} height={alto - 2 * m} /></clipPath>
        </defs>
        {marcas(x0, x1).map((v) => (
          <g key={`x${v}`}>
            <line x1={px(v)} x2={px(v)} y1={m} y2={alto - m} className="rejilla" />
            <text x={px(v)} y={alto - m + 14} textAnchor="middle" className="numero-eje">{v}</text>
          </g>
        ))}
        {marcas(y0, y1).map((v) => (
          <g key={`y${v}`}>
            <line x1={m} x2={ancho - m} y1={py(v)} y2={py(v)} className="rejilla" />
            <text x={m - 4} y={py(v) + 4} textAnchor="end" className="numero-eje">{v}</text>
          </g>
        ))}
        {x0 <= 0 && x1 >= 0 && <line x1={px(0)} x2={px(0)} y1={m} y2={alto - m} className="eje" />}
        {y0 <= 0 && y1 >= 0 && <line x1={m} x2={ancho - m} y1={py(0)} y2={py(0)} className="eje" />}
        <g clipPath={`url(#${idRecorte})`}>
          {curvas.map((k, i) =>
            k.tramos.map((t, j) => (
              <polyline key={`${i}-${j}`} points={t.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={k.color} strokeWidth={2} />
            )),
          )}
        </g>
        {contenido.puntos.map((p, i) => (
          <g key={i}>
            <circle cx={px(p.x)} cy={py(p.y)} r={4} fill="#3b3027" />
            {p.etiqueta && <text x={px(p.x) + 6} y={py(p.y) - 6} className="etiqueta-grafica">{p.etiqueta}</text>}
          </g>
        ))}
      </svg>
      <div className="leyenda">
        {curvas.map((k, i) =>
          k.error ? (
            <span key={i} className="error-grafica">«{k.c.expr}»: {k.error}</span>
          ) : (
            <span key={i}><span className="punto" style={{ background: k.color }} /> {k.c.etiqueta ?? `y = ${k.c.expr}`}</span>
          ),
        )}
      </div>
    </div>
  );
}
```

`src/componentes/estudio/PiezaPizarra.tsx`:

```tsx
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Pieza } from '../../estudio/pizarra';
import { limpiarSvg } from '../../estudio/svg';
import { Markdown } from '../Markdown';
import { Formula } from './Formula';
import { Grafica } from './Grafica';

interface Props {
  pieza: Pieza;
  x: number;
  y: number;
  seleccionada: boolean;
  imagen(ruta: string): Promise<string>;
  alMedir(id: string, w: number, h: number): void;
}

export const PiezaPizarra = memo(function PiezaPizarra({ pieza, x, y, seleccionada, imagen, alMedir }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => alMedir(pieza.id, el.offsetWidth, el.offsetHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [pieza.id, alMedir]);

  return (
    <div
      ref={ref}
      data-pieza={pieza.id}
      className={`pieza pieza-${pieza.tipo}${seleccionada ? ' seleccionada' : ''}`}
      style={{ left: x, top: y, width: pieza.ancho, ...(pieza.color ? { borderColor: pieza.color } : {}) }}
    >
      <Contenido pieza={pieza} imagen={imagen} />
    </div>
  );
});

function Contenido({ pieza, imagen }: { pieza: Pieza; imagen(ruta: string): Promise<string> }) {
  switch (pieza.tipo) {
    case 'texto':
      return <Markdown texto={pieza.contenido} formulas className="markdown-pieza" />;
    case 'nota':
      return <p className="texto-nota">{pieza.contenido}</p>;
    case 'formula':
      return <Formula tex={pieza.contenido} bloque />;
    case 'grafica':
      return <Grafica contenido={pieza.contenido} ancho={pieza.ancho} />;
    case 'dibujo':
      return <div className="dibujo" dangerouslySetInnerHTML={{ __html: limpiarSvg(pieza.contenido) }} />;
    case 'imagen':
      return <ImagenPieza ruta={pieza.contenido} imagen={imagen} />;
  }
}

function ImagenPieza({ ruta, imagen }: { ruta: string; imagen(ruta: string): Promise<string> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true;
    imagen(ruta).then(
      (u) => vivo && setUrl(u),
      () => vivo && setFallo(true),
    );
    return () => {
      vivo = false;
    };
  }, [ruta, imagen]);
  if (fallo) return <p className="detalle">No se ha podido cargar la imagen.</p>;
  return url ? <img src={url} alt="" draggable={false} /> : <p className="detalle">Cargando imagen…</p>;
}
```

`src/componentes/estudio/Pizarra.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { aMundo, centro, encuadrar, puntoEnBorde, zoomEn, type Punto, type Rect, type Vista } from '../../estudio/geometria';
import type { Operacion, Pieza, Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { PiezaPizarra } from './PiezaPizarra';

interface Props {
  pizarra: TipoPizarra;
  imagen(ruta: string): Promise<string>;
  alOperar?(op: Operacion): void; // sin esto, la pizarra es de solo lectura
  children?: ReactNode; // botones extra en la barra de abajo
}

type Arrastre =
  | { tipo: 'fondo'; desde: Punto; vista: Vista }
  | { tipo: 'pieza'; id: string; desde: Punto; origen: Punto; movido: boolean };

interface Edicion { id: string | null; x: number; y: number; texto: string }

export function Pizarra({ pizarra, imagen, alOperar, children }: Props) {
  const editable = !!alOperar;
  const marco = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>({ x: 40, y: 40, escala: 1 });
  const [tamanos, setTamanos] = useState<Record<string, { w: number; h: number }>>({});
  const [posiciones, setPosiciones] = useState<Record<string, Punto>>({});
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const punteros = useRef(new Map<number, Punto>());
  const pinza = useRef<number | null>(null);
  const encuadrada = useRef(false);

  // Cuando llega una versión nueva de la pizarra, las posiciones provisionales ya no hacen falta.
  useEffect(() => setPosiciones({}), [pizarra]);

  const medir = useCallback((id: string, w: number, h: number) => {
    setTamanos((t) => (t[id]?.w === w && t[id]?.h === h ? t : { ...t, [id]: { w, h } }));
  }, []);

  const rectDe = (p: Pieza): Rect => {
    const pos = posiciones[p.id] ?? p;
    const t = tamanos[p.id] ?? { w: p.ancho, h: 60 };
    return { x: pos.x, y: pos.y, w: t.w, h: t.h };
  };

  const verTodo = () => {
    const m = marco.current;
    if (m) setVista(encuadrar(pizarra.piezas.map(rectDe), m.clientWidth, m.clientHeight));
  };

  // La primera vez, se encuadra cuando ya se han medido todas las piezas.
  useEffect(() => {
    if (!encuadrada.current && pizarra.piezas.length && pizarra.piezas.every((p) => tamanos[p.id])) {
      encuadrada.current = true;
      verTodo();
    }
  });

  useEffect(() => {
    const m = marco.current;
    if (!m) return;
    const alRueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = m.getBoundingClientRect();
      setVista((v) => zoomEn(v, Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top }));
    };
    m.addEventListener('wheel', alRueda, { passive: false });
    return () => m.removeEventListener('wheel', alRueda);
  }, []);

  const local = (e: { clientX: number; clientY: number }): Punto => {
    const r = marco.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoomCentro = (factor: number) => {
    const m = marco.current;
    if (m) setVista((v) => zoomEn(v, factor, { x: m.clientWidth / 2, y: m.clientHeight / 2 }));
  };

  function alPulsar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('textarea, a')) return;
    marco.current?.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, local(e));
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      pinza.current = Math.hypot(a.x - b.x, a.y - b.y);
      arrastre.current = null;
      return;
    }
    const idPieza = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]')?.dataset.pieza;
    const pieza = idPieza ? pizarra.piezas.find((x) => x.id === idPieza) : undefined;
    if (pieza && editable) {
      setSeleccion(pieza.id);
      arrastre.current = { tipo: 'pieza', id: pieza.id, desde: local(e), origen: { x: pieza.x, y: pieza.y }, movido: false };
    } else {
      if (!pieza) setSeleccion(null);
      arrastre.current = { tipo: 'fondo', desde: local(e), vista };
    }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, local(e));
    if (pinza.current !== null && punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = d / pinza.current;
      pinza.current = d;
      setVista((v) => zoomEn(v, factor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
      return;
    }
    const a = arrastre.current;
    if (!a) return;
    const p = local(e);
    const dx = p.x - a.desde.x;
    const dy = p.y - a.desde.y;
    if (a.tipo === 'fondo') setVista({ ...a.vista, x: a.vista.x + dx, y: a.vista.y + dy });
    else {
      if (Math.abs(dx) + Math.abs(dy) > 3) a.movido = true;
      if (a.movido) setPosiciones((ps) => ({ ...ps, [a.id]: { x: a.origen.x + dx / vista.escala, y: a.origen.y + dy / vista.escala } }));
    }
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinza.current = null;
    const a = arrastre.current;
    arrastre.current = null;
    if (a?.tipo === 'pieza' && a.movido) {
      const pos = posiciones[a.id];
      if (pos) alOperar?.({ tipo: 'mover', id: a.id, x: pos.x, y: pos.y });
    }
  }

  function alDobleClic(e: MouseEvent<HTMLDivElement>) {
    if (!editable) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pieza]');
    if (el) {
      const p = pizarra.piezas.find((x) => x.id === el.dataset.pieza);
      if (p?.tipo === 'nota') setEditando({ id: p.id, x: p.x, y: p.y, texto: p.contenido });
      return;
    }
    const m = aMundo(vista, local(e));
    setEditando({ id: null, x: m.x, y: m.y, texto: '' });
  }

  function terminarNota() {
    const ed = editando;
    setEditando(null);
    if (!ed) return;
    const texto = ed.texto.trim();
    if (!texto) {
      if (ed.id) alOperar?.({ tipo: 'borrar', id: ed.id });
      return;
    }
    alOperar?.({ tipo: 'nota', id: ed.id, x: ed.x, y: ed.y, contenido: texto });
  }

  const borrar = (id: string) => {
    setSeleccion(null);
    alOperar?.({ tipo: 'borrar', id });
  };

  function alTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (editando || !seleccion || !editable) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      borrar(seleccion);
    }
  }

  const porId = new Map(pizarra.piezas.map((p) => [p.id, p]));

  return (
    <div className="pizarra">
      <div
        ref={marco}
        className="lienzo"
        tabIndex={0}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onDoubleClick={alDobleClic}
        onKeyDown={alTecla}
      >
        <div className="mundo" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}>
          <svg className="flechas" width="1" height="1" overflow="visible">
            <defs>
              <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#8b7b6a" />
              </marker>
            </defs>
            {pizarra.flechas.map((f) => {
              const de = porId.get(f.de);
              const a = porId.get(f.a);
              if (!de || !a) return null;
              const rde = rectDe(de);
              const ra = rectDe(a);
              const p1 = puntoEnBorde(rde, centro(ra));
              const p2 = puntoEnBorde(ra, centro(rde));
              return (
                <g key={f.id}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8b7b6a" strokeWidth={2} markerEnd="url(#punta-flecha)" />
                  {f.etiqueta && <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" className="etiqueta-flecha">{f.etiqueta}</text>}
                </g>
              );
            })}
          </svg>
          {pizarra.piezas
            .filter((p) => p.id !== editando?.id)
            .map((p) => {
              const pos = posiciones[p.id] ?? p;
              return <PiezaPizarra key={p.id} pieza={p} x={pos.x} y={pos.y} seleccionada={seleccion === p.id} imagen={imagen} alMedir={medir} />;
            })}
          {editando && (
            <textarea
              className="editor-nota"
              autoFocus
              style={{ left: editando.x, top: editando.y }}
              value={editando.texto}
              placeholder="Escribe tu nota… (Ctrl+Enter para terminar)"
              onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
              onBlur={terminarNota}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditando(null);
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) terminarNota();
              }}
            />
          )}
        </div>
        {pizarra.piezas.length === 0 && !editando && (
          <p className="pizarra-vacia">
            {editable ? 'Pizarra en blanco. Pídele a Claude que te lo explique aquí, o haz doble clic para escribir una nota.' : 'Esta pizarra está vacía.'}
          </p>
        )}
      </div>
      <div className="controles-pizarra">
        <button onClick={verTodo}>Ver todo</button>
        <button onClick={() => zoomCentro(1 / 1.2)} aria-label="Alejar">−</button>
        <button onClick={() => zoomCentro(1.2)} aria-label="Acercar">+</button>
        {editable && seleccion && <button className="peligro" onClick={() => borrar(seleccion)}>🗑 Borrar</button>}
        <span className="hueco" />
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Estilos de la pizarra**

Añade al final de `src/estilos.css`:

```css
/* Pizarra */
.pizarra { position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; }
.lienzo { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; outline: none; background-color: #fdfbf6; background-image: radial-gradient(#e6dccb 1px, transparent 1px); background-size: 22px 22px; }
.lienzo:active { cursor: grabbing; }
.mundo { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.flechas { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.etiqueta-flecha { font-size: 13px; fill: var(--suave); }
.pieza { position: absolute; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; padding: 10px 14px; box-shadow: 0 1px 3px rgb(60 40 20 / 0.08); user-select: none; overflow-wrap: anywhere; }
.pieza.seleccionada { outline: 2px solid var(--acento); outline-offset: 2px; }
.pieza-nota { background: #fff4c2; border-color: #ecd98a; }
.pieza-dibujo, .pieza-imagen, .pieza-grafica { padding: 6px; }
.pieza-formula { text-align: center; padding: 6px 14px; }
.pieza img { display: block; width: 100%; border-radius: 6px; }
.dibujo svg { display: block; width: 100%; height: auto; }
.markdown-pieza > :first-child { margin-top: 0; }
.markdown-pieza > :last-child { margin-bottom: 0; }
.texto-nota { margin: 0; white-space: pre-wrap; }
.editor-nota { position: absolute; width: 240px; min-height: 90px; background: #fff4c2; border: 2px solid var(--acento); }
.pizarra-vacia { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 20px; margin: 0; color: var(--suave); pointer-events: none; }
.controles-pizarra { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; padding: 8px 10px; border-top: 1px solid var(--borde); background: var(--superficie); }
.grafica svg { display: block; }
.rejilla { stroke: #efe7d9; }
.eje { stroke: #b9a68f; }
.numero-eje, .etiqueta-grafica { font-size: 11px; fill: var(--suave); }
.leyenda { display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px; margin-top: 4px; }
.error-grafica { color: var(--peligro); }
```

- [ ] **Step 6: Pruebas y build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/estudio/geometria.ts src/estudio/geometria.test.ts src/estudio/svg.ts src/componentes/estudio/Formula.tsx src/componentes/estudio/Grafica.tsx src/componentes/estudio/PiezaPizarra.tsx src/componentes/estudio/Pizarra.tsx src/estilos.css
git commit -m "Pizarra: lienzo con piezas, flechas, zoom, mover, borrar y notas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: La pizarra junto al chat (cierre de la etapa 2)

**Files:**
- Modify: `src/estudio/local.ts`, `src/componentes/estudio/EstudioLocal.tsx` (se sustituye entero), `src/estilos.css`

**Interfaces:**
- Consumes: `<Pizarra>` (Task 11); las rutas de pizarras (Task 10); `useLocal().suscribir` (Task 7).
- Produces:
  - `leerPizarras(asig, id): Promise<EstadoPizarra[]>`, `nuevaPizarra(asig, id): Promise<number>` y `operarPizarra(asig, id, n, op): Promise<Pizarra>` en `local.ts`;
  - `<EstudioLocal>` con pizarras (la Task 14 le añade el guardado).

- [ ] **Step 1: Cliente de pizarras**

En `src/estudio/local.ts`:
- **Imports:** cambia la primera línea por:

  ```ts
  import type { Operacion, Pizarra } from './pizarra';
  import type { EstadoPizarra, EventoChat, Mensaje, ResumenConversacion } from './tipos';
  ```
- **Al final del archivo**, añade:

```ts
export const leerPizarras = (asignatura: string, id: string) => pedir<EstadoPizarra[]>(`pizarras?${consulta({ asignatura, id })}`);

export async function nuevaPizarra(asignatura: string, id: string): Promise<number> {
  return (await pedir<{ n: number }>('pizarra/nueva', enviarJson({ asignatura, id }))).n;
}

export const operarPizarra = (asignatura: string, id: string, n: number, op: Operacion) =>
  pedir<Pizarra>('pizarra/operacion', enviarJson({ asignatura, id, n, op }));
```

- [ ] **Step 2: Sustituir `EstudioLocal.tsx` entero**

```tsx
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { aplicarEvento } from '../../estudio/chat';
import {
  enviarMensaje, leerConversacion, leerPizarras, listarConversaciones, nuevaPizarra, operarPizarra, pararRespuesta, urlArchivo,
} from '../../estudio/local';
import type { Operacion } from '../../estudio/pizarra';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';
import type { EstadoPizarra, Mensaje } from '../../estudio/tipos';
import type { useLocal } from '../../estudio/useLocal';
import { Chat, type ErrorChat } from './Chat';
import { ListaConversaciones } from './ListaConversaciones';
import { Pizarra } from './Pizarra';

interface Props {
  asignatura: Asignatura;
  local: ReturnType<typeof useLocal>;
}

interface Conversacion {
  id: string;
  nueva: boolean;
}

const claveUltima = (asig: string) => `sc-estudio-conversacion-${asig}`;
const CLAVE_ANCHO = 'sc-estudio-ancho-chat';

export function EstudioLocal({ asignatura, local }: Props) {
  const [vista, setVista] = useState<'chat' | 'lista'>('chat');
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorChat | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<{ texto: string; imagenes: string[] } | null>(null);
  const [pizarras, setPizarras] = useState<EstadoPizarra[]>([]);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [avisoPizarra, setAvisoPizarra] = useState<string | null>(null);
  const [anchoChat, setAnchoChat] = useState(() => Number(leerPreferencia(CLAVE_ANCHO)) || 36);
  const contenedor = useRef<HTMLDivElement>(null);
  const cuantas = useRef(0);

  const recargarPizarras = useCallback(async (id: string) => {
    const lista = await leerPizarras(asignatura.id, id).catch(() => null);
    if (!lista) return;
    setPizarras(lista);
    // Si Claude crea una pizarra nueva, se abre sola.
    if (lista.length > cuantas.current) setAbierta(lista.at(-1)!.n);
    cuantas.current = lista.length;
  }, [asignatura.id]);

  const abrir = useCallback(
    async (id: string) => {
      setVista('chat');
      setError(null);
      const ms = await leerConversacion(asignatura.id, id).catch(() => [] as Mensaje[]);
      setConv({ id, nueva: ms.length === 0 });
      setMensajes(ms);
      cuantas.current = 0;
      setPizarras([]);
      setAbierta(null);
      guardarPreferencia(claveUltima(asignatura.id), id);
      await recargarPizarras(id);
    },
    [asignatura.id, recargarPizarras],
  );

  const nueva = useCallback(() => {
    setVista('chat');
    setError(null);
    setMensajes([]);
    setPizarras([]);
    setAbierta(null);
    cuantas.current = 0;
    setConv({ id: crypto.randomUUID(), nueva: true });
  }, []);

  useEffect(() => {
    const ultima = leerPreferencia(claveUltima(asignatura.id));
    listarConversaciones(asignatura.id)
      .then((lista) => (ultima && lista.some((c) => c.id === ultima) ? abrir(ultima) : nueva()))
      .catch(nueva);
  }, [asignatura.id, abrir, nueva]);

  // Avisos del programa local: una pizarra de esta conversación ha cambiado.
  const { suscribir } = local;
  const idConv = conv?.id;
  useEffect(() => {
    if (!idConv) return;
    return suscribir((e) => {
      if (e.asignatura === asignatura.id && e.conversacion === idConv) void recargarPizarras(idConv);
    });
  }, [suscribir, idConv, asignatura.id, recargarPizarras]);

  async function enviar(texto: string, imagenes: string[]) {
    if (!conv || enviando) return;
    setUltimoEnvio({ texto, imagenes });
    setError(null);
    setEnviando(true);
    setMensajes((ms) => [...ms, imagenes.length ? { rol: 'diego', texto, imagenes } : { rol: 'diego', texto }]);
    await enviarMensaje(
      { asignatura: asignatura.id, id: conv.id, nueva: conv.nueva, texto, imagenes, pizarraAbierta: abierta },
      (e) => {
        if (e.tipo === 'error') setError({ mensaje: e.mensaje, uso: e.uso });
        else setMensajes((ms) => aplicarEvento(ms, e));
      },
    );
    setEnviando(false);
    const guardados = await leerConversacion(asignatura.id, conv.id).catch(() => [] as Mensaje[]);
    if (guardados.length) {
      setMensajes(guardados);
      setConv({ id: conv.id, nueva: false });
      guardarPreferencia(claveUltima(asignatura.id), conv.id);
    }
    await recargarPizarras(conv.id);
  }

  async function operar(n: number, op: Operacion) {
    if (!conv) return;
    try {
      const p = await operarPizarra(asignatura.id, conv.id, n, op);
      setPizarras((ps) => ps.map((e) => (e.n === n ? { ...e, pizarra: p, error: null } : e)));
    } catch (e) {
      setAvisoPizarra(e instanceof Error ? e.message : String(e));
      await recargarPizarras(conv.id);
    }
  }

  async function crearPizarra() {
    if (!conv) return;
    const n = await nuevaPizarra(asignatura.id, conv.id).catch(() => null);
    if (n !== null) {
      await recargarPizarras(conv.id);
      setAbierta(n);
    }
  }

  // La línea entre el chat y la pizarra se puede arrastrar.
  function arrastrarSeparador(e: PointerEvent<HTMLDivElement>) {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const mover = (ev: globalThis.PointerEvent) => {
      const pct = Math.min(70, Math.max(20, ((ev.clientX - caja.left) / caja.width) * 100));
      setAnchoChat(pct);
    };
    const soltar = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      guardarPreferencia(CLAVE_ANCHO, String(Math.round(Math.min(70, Math.max(20, ((ev.clientX - caja.left) / caja.width) * 100)))));
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  if (!conv) return <p className="cargando">Cargando…</p>;

  const actual = pizarras.find((e) => e.n === abierta) ?? pizarras.at(-1) ?? null;
  const conPizarra = pizarras.length > 0;
  const imagen = (ruta: string) => Promise.resolve(urlArchivo(asignatura.id, conv.id, ruta));

  return (
    <div
      ref={contenedor}
      className={`estudio-local ${conPizarra ? 'con-pizarra' : 'sin-pizarra'}`}
      style={conPizarra ? { gridTemplateColumns: `${anchoChat}% 6px minmax(0, 1fr)` } : undefined}
    >
      {vista === 'lista' ? (
        <ListaConversaciones asignatura={asignatura.id} alAbrir={(id) => void abrir(id)} alNueva={nueva} alVolver={() => setVista('chat')} />
      ) : (
        <Chat
          asignatura={asignatura.id}
          conversacion={conv.id}
          titulo={mensajes.find((m) => m.rol === 'diego')?.texto.slice(0, 60) ?? ''}
          mensajes={mensajes}
          enviando={enviando}
          error={error}
          alEnviar={(t, i) => void enviar(t, i)}
          alParar={() => void pararRespuesta(asignatura.id, conv.id).catch(() => undefined)}
          alReintentar={() => ultimoEnvio && void enviar(ultimoEnvio.texto, ultimoEnvio.imagenes)}
          alVerLista={() => setVista('lista')}
          alNueva={nueva}
        />
      )}
      {conPizarra && (
        <>
          <div className="separador" onPointerDown={arrastrarSeparador} role="separator" aria-label="Cambiar el ancho del chat" />
          <div className="zona-pizarra">
            <div className="pestanas-pizarra">
              {pizarras.map((e) => (
                <button key={e.n} className={e.n === actual?.n ? 'encendida' : ''} onClick={() => setAbierta(e.n)}>
                  {e.pizarra?.titulo && e.pizarra.titulo !== `Pizarra ${e.n}` ? `${e.n}. ${e.pizarra.titulo}` : `Pizarra ${e.n}`}
                </button>
              ))}
              <button onClick={() => void crearPizarra()}>+ nueva</button>
            </div>
            {actual?.error && (
              <div className="banner aviso aviso-pizarra">
                ⚠️ Esta pizarra tiene un error ({actual.error}). {actual.pizarra ? 'Ves la última versión buena.' : ''}
              </div>
            )}
            {avisoPizarra && (
              <div className="banner error aviso-pizarra">{avisoPizarra} <button onClick={() => setAvisoPizarra(null)}>Cerrar</button></div>
            )}
            {actual?.pizarra ? (
              <Pizarra key={`${conv.id}-${actual.n}`} pizarra={actual.pizarra} imagen={imagen} alOperar={(op) => void operar(actual.n, op)} />
            ) : (
              <p className="cargando">Esperando a que la pizarra esté lista…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Estilos de la zona dividida**

Añade al final de `src/estilos.css`:

```css
/* Chat + pizarra */
.separador { cursor: col-resize; background: var(--borde-suave); touch-action: none; }
.separador:hover { background: var(--acento-suave); }
.zona-pizarra { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-left: 1px solid var(--borde); }
.pestanas-pizarra { display: flex; gap: 4px; padding: 8px 10px; border-bottom: 1px solid var(--borde); overflow-x: auto; }
.pestanas-pizarra button { padding: 4px 12px; font-size: 14px; white-space: nowrap; }
.pestanas-pizarra button.encendida { border-color: var(--acento); background: var(--acento-suave); }
.aviso-pizarra { margin: 8px 10px 0; font-size: 13px; }
@media (max-width: 899px) {
  .estudio-local.con-pizarra { grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: minmax(0, 1fr) minmax(0, 1.2fr); }
  .separador { display: none; }
}
```

- [ ] **Step 4: Pruebas y build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/local.ts src/componentes/estudio/EstudioLocal.tsx src/estilos.css
git commit -m "Estudio: pizarras junto al chat, con pestañas, separador y avisos en directo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Prueba con Diego (cierre de la etapa 2)**

Con `npm run local` abierto, pide a Diego que pruebe en Estudio → Física (o General):
1. «Explícame las leyes de Newton en la pizarra, con un dibujo de fuerzas y una gráfica».
   - La pizarra aparece a la derecha y se llena sola.
   - Hay texto, fórmulas, dibujo, gráfica y flechas.
2. Mover una pieza, borrar otra, hacer doble clic en un hueco y escribir una nota. Luego preguntar «¿has visto mi nota?».
3. Pegar una captura de un ejercicio y pedir «ponla en la pizarra y explícamela».
4. «Pizarra nueva», cambiando de tema.
5. Una pregunta sencilla («¿cuánto es 2+2?»): la respuesta va solo en el chat.
6. Arrastrar la línea entre el chat y la pizarra.

Apunta en el registro lo que Diego diga y cualquier ajuste que pida.

---

# Etapa 3: historial, asignaturas y móvil

### Task 13: Historial: nombres y GitHub

**Files:**
- Create: `src/estudio/historial.ts`, `src/estudio/historial.test.ts`, `src/estudio/historialRemoto.ts`, `src/estudio/historialRemoto.test.ts`, `src/estado/cacheEstudio.ts`
- Modify: `src/github/cliente.ts`, `src/github/cliente.test.ts`

**Interfaces:**
- Consumes: `Pizarra`, `validarPizarra` y `serializarPizarra` (Task 9); `aSlug` (Task 5).
- Produces:
  - **Cliente de GitHub:** `escribirBase64(cfg, ruta, base64, sha, mensaje): Promise<string>` y `leerBinario(cfg, ruta): Promise<Blob>`.
  - **Historial:** `EntradaHistorial { archivo; fecha: ISODate | null; titulo }`, `carpetaHistorial(asig)`, `nombreHistorial(fecha, titulo, existentes)`, `entradaDeArchivo(archivo)`, `ordenarHistorial`, `imagenesDe(p)` y `paraHistorial(p, titulo)`.
  - **Historial en GitHub:**
    - `listarHistorial(cfg, asig)` y `leerDeHistorial(cfg, asig, archivo)`;
    - `imagenDeHistorial(cfg, asig): (ruta) => Promise<string>`;
    - `subirAlHistorial(cfg, asig, p, titulo, hoy, leerImagen): Promise<string>`, que devuelve la ruta en el repositorio.
  - **Caché:** `guardarHistorialCache`, `leerHistorialCache`, `guardarPizarraCache` y `leerPizarraCache`.

- [ ] **Step 1: Escribir las pruebas (que fallen)**

`src/estudio/historial.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { entradaDeArchivo, imagenesDe, nombreHistorial, ordenarHistorial, paraHistorial } from './historial';
import { pizarraVacia, type Pizarra } from './pizarra';

describe('historial', () => {
  it('nombre del archivo: fecha y título, sin repetir', () => {
    expect(nombreHistorial('2026-09-24', 'Leyes de Newton', [])).toBe('2026-09-24-leyes-de-newton.json');
    expect(nombreHistorial('2026-09-24', 'Leyes de Newton', ['2026-09-24-leyes-de-newton.json'])).toBe('2026-09-24-leyes-de-newton-2.json');
    expect(nombreHistorial('2026-09-24', '¿?', [])).toBe('2026-09-24-pizarra.json');
  });
  it('entrada legible desde el nombre del archivo', () => {
    expect(entradaDeArchivo('2026-09-24-leyes-de-newton.json')).toEqual({ archivo: '2026-09-24-leyes-de-newton.json', fecha: '2026-09-24', titulo: 'Leyes de newton' });
    expect(entradaDeArchivo('notas.md')).toBeNull();
    expect(entradaDeArchivo('suelta.json')).toEqual({ archivo: 'suelta.json', fecha: null, titulo: 'Suelta' });
  });
  it('la más reciente primero', () => {
    const es = ['2026-09-20-a.json', '2026-09-24-b.json'].map((a) => entradaDeArchivo(a)!);
    expect(ordenarHistorial(es).map((e) => e.archivo)).toEqual(['2026-09-24-b.json', '2026-09-20-a.json']);
  });
  it('imágenes que usa una pizarra, y copia limpia para el historial', () => {
    const p: Pizarra = {
      ...pizarraVacia('x'),
      guardarComo: 'Newton',
      guardadaEn: 'estudios/fisica/pizarras/a.json',
      piezas: [
        { id: 'i1', tipo: 'imagen', x: 0, y: 0, ancho: 100, contenido: 'imagenes/a.png' },
        { id: 'i2', tipo: 'imagen', x: 0, y: 0, ancho: 100, contenido: 'imagenes/a.png' },
        { id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 100, contenido: 'hola' },
      ],
    };
    expect(imagenesDe(p)).toEqual(['imagenes/a.png']);
    expect(paraHistorial(p, 'Newton')).toMatchObject({ titulo: 'Newton', guardarComo: null, guardadaEn: null });
  });
});
```

`src/estudio/historialRemoto.test.ts`:

```ts
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
```

En `src/github/cliente.test.ts`:
- añade `escribirBase64` y `leerBinario` al import;
- añade al final:

```ts
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
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/historial.test.ts src/estudio/historialRemoto.test.ts src/github/cliente.test.ts`
Expected: FAIL (faltan módulos y funciones).

- [ ] **Step 3: Cliente de GitHub**

En `src/github/cliente.ts`:

1. Sustituye `textoABase64` por:

```ts
function bytesABase64(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function textoABase64(texto: string): string {
  return bytesABase64(new TextEncoder().encode(texto));
}
```

2. En `peticion`, cambia el objeto `headers` para que respete las cabeceras que se le pasen:

```ts
      headers: {
        Accept: 'application/vnd.github+json',
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${cfg.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
```

3. Sustituye `escribirArchivo` por estas dos funciones y añade `leerBinario`:

```ts
export async function escribirBase64(
  cfg: Config, ruta: string, base64: string, sha: string | null, mensaje: string,
): Promise<string> {
  const res = await peticion(cfg, ruta, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: base64, ...(sha ? { sha } : {}) }),
  });
  return (await res.json()).content.sha;
}

export async function escribirArchivo(
  cfg: Config, ruta: string, texto: string, sha: string | null, mensaje: string,
): Promise<string> {
  return escribirBase64(cfg, ruta, textoABase64(texto), sha, mensaje);
}

// Para imágenes: GitHub las da en crudo (así funciona aunque pesen más de 1 MB).
export async function leerBinario(cfg: Config, ruta: string): Promise<Blob> {
  const res = await peticion(cfg, ruta, { headers: { Accept: 'application/vnd.github.raw+json' } });
  return res.blob();
}
```

- [ ] **Step 4: Historial**

`src/estudio/historial.ts`:

```ts
import { isISODate, type ISODate } from '../fechas';
import { aSlug } from '../texto';
import type { Pizarra } from './pizarra';

export interface EntradaHistorial {
  archivo: string;
  fecha: ISODate | null;
  titulo: string;
}

export const carpetaHistorial = (asignatura: string) => `estudios/${asignatura}/pizarras`;

export function nombreHistorial(fecha: ISODate, titulo: string, existentes: string[]): string {
  const base = `${fecha}-${aSlug(titulo, 60) || 'pizarra'}`;
  const usados = new Set(existentes);
  if (!usados.has(`${base}.json`)) return `${base}.json`;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}.json`)) return `${base}-${n}.json`;
}

// «2026-09-24-leyes-de-newton.json» → fecha y «Leyes de newton» (para la lista, sin abrir el archivo).
export function entradaDeArchivo(archivo: string): EntradaHistorial | null {
  if (!archivo.endsWith('.json')) return null;
  const nombre = archivo.slice(0, -'.json'.length);
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(nombre);
  const fecha = m && isISODate(m[1]) ? m[1] : null;
  const resto = (fecha ? m![2] : nombre).replace(/-/g, ' ').trim();
  return { archivo, fecha, titulo: resto.charAt(0).toUpperCase() + resto.slice(1) };
}

export function ordenarHistorial(entradas: EntradaHistorial[]): EntradaHistorial[] {
  return [...entradas].sort((a, b) => b.archivo.localeCompare(a.archivo));
}

export function imagenesDe(p: Pizarra): string[] {
  return [...new Set(p.piezas.filter((x) => x.tipo === 'imagen').map((x) => x.contenido as string))];
}

export function paraHistorial(p: Pizarra, titulo: string): Pizarra {
  return { ...p, titulo, guardarComo: null, guardadaEn: null };
}
```

`src/estudio/historialRemoto.ts`:

```ts
import type { ISODate } from '../fechas';
import { actualizarArchivo, ErrorGitHub, escribirBase64, leerArchivo, leerBinario, listarCarpeta, type Config } from '../github/cliente';
import {
  carpetaHistorial, entradaDeArchivo, imagenesDe, nombreHistorial, ordenarHistorial, paraHistorial, type EntradaHistorial,
} from './historial';
import { serializarPizarra, validarPizarra, type Pizarra } from './pizarra';

export async function listarHistorial(cfg: Config, asignatura: string): Promise<EntradaHistorial[]> {
  const nombres = await listarCarpeta(cfg, carpetaHistorial(asignatura));
  return ordenarHistorial(nombres.map(entradaDeArchivo).filter((e): e is EntradaHistorial => e !== null));
}

export async function leerDeHistorial(cfg: Config, asignatura: string, archivo: string): Promise<Pizarra> {
  const { texto } = await leerArchivo(cfg, `${carpetaHistorial(asignatura)}/${archivo}`);
  return validarPizarra(JSON.parse(texto)).pizarra;
}

// Devuelve una función que da la URL de una imagen del historial (se descarga una vez).
export function imagenDeHistorial(cfg: Config, asignatura: string): (ruta: string) => Promise<string> {
  const urls = new Map<string, Promise<string>>();
  return (ruta) => {
    if (!urls.has(ruta)) urls.set(ruta, leerBinario(cfg, `${carpetaHistorial(asignatura)}/${ruta}`).then((b) => URL.createObjectURL(b)));
    return urls.get(ruta)!;
  };
}

// Sube la pizarra (y sus imágenes) al historial. Si ya se guardó antes, actualiza el mismo archivo.
export async function subirAlHistorial(
  cfg: Config, asignatura: string, p: Pizarra, titulo: string, hoy: ISODate, leerImagen: (ruta: string) => Promise<string>,
): Promise<string> {
  const carpeta = carpetaHistorial(asignatura);
  const archivo = p.guardadaEn?.startsWith(`${carpeta}/`)
    ? p.guardadaEn.slice(carpeta.length + 1)
    : nombreHistorial(hoy, titulo, await listarCarpeta(cfg, carpeta));
  for (const ruta of imagenesDe(p)) {
    try {
      await escribirBase64(cfg, `${carpeta}/${ruta}`, await leerImagen(ruta), null, `Imagen del historial: ${ruta}`);
    } catch (e) {
      // Ya estaba subida (GitHub no deja crear dos veces el mismo archivo sin su sha).
      if (!(e instanceof ErrorGitHub && e.tipo === 'conflicto')) throw e;
    }
  }
  const destino = `${carpeta}/${archivo}`;
  await actualizarArchivo(cfg, destino, () => serializarPizarra(paraHistorial(p, titulo)), `Pizarra al historial: ${titulo}`);
  return destino;
}
```

`src/estado/cacheEstudio.ts`:

```ts
import type { EntradaHistorial } from '../estudio/historial';
import type { Pizarra } from '../estudio/pizarra';

// Copia del historial para verlo sin internet. Si no hay almacenamiento, no pasa nada.
const clave = (partes: string[]) => `sc-historial-${partes.join('-')}`;

function leer<T>(k: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function guardar(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // sin almacenamiento o lleno
  }
}

export const guardarHistorialCache = (asig: string, es: EntradaHistorial[]) => guardar(clave([asig]), es);
export const leerHistorialCache = (asig: string) => leer<EntradaHistorial[]>(clave([asig]));
export const guardarPizarraCache = (asig: string, archivo: string, p: Pizarra) => guardar(clave([asig, archivo]), p);
export const leerPizarraCache = (asig: string, archivo: string) => leer<Pizarra>(clave([asig, archivo]));
```

- [ ] **Step 5: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/estudio/historial.ts src/estudio/historial.test.ts src/estudio/historialRemoto.ts src/estudio/historialRemoto.test.ts src/estado/cacheEstudio.ts src/github/cliente.ts src/github/cliente.test.ts
git commit -m "Historial de pizarras: nombres, subida con imágenes y lectura desde GitHub

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Historial en pantalla, guardar y vista del móvil (cierre de la etapa 3)

**Files:**
- Create: `src/componentes/estudio/Historial.tsx`
- Modify: `src/componentes/estudio/EstudioLocal.tsx`, `src/componentes/estudio/ListaConversaciones.tsx`, `src/pantallas/Estudio.tsx`, `src/estilos.css`

**Interfaces:**
- Consumes: la Task 13; `leerArchivoBase64` (Task 6); `useDatos().config`; `useHoy()`.
- Produces: `<ListaHistorial asignatura alAbrir />`, `<VisorHistorial asignatura archivo alVolver />` e `<Historial asignatura />`.

- [ ] **Step 1: Componentes del historial**

`src/componentes/estudio/Historial.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { guardarHistorialCache, guardarPizarraCache, leerHistorialCache, leerPizarraCache } from '../../estado/cacheEstudio';
import { useDatos } from '../../estado/datos';
import { formatoCorto } from '../../fechas';
import type { EntradaHistorial } from '../../estudio/historial';
import { imagenDeHistorial, leerDeHistorial, listarHistorial } from '../../estudio/historialRemoto';
import type { Pizarra as TipoPizarra } from '../../estudio/pizarra';
import { Pizarra } from './Pizarra';

export function ListaHistorial({ asignatura, alAbrir }: { asignatura: Asignatura; alAbrir(e: EntradaHistorial): void }) {
  const { config } = useDatos();
  const [lista, setLista] = useState<EntradaHistorial[] | null>(() => leerHistorialCache(asignatura.id));
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    listarHistorial(config, asignatura.id).then(
      (es) => {
        setLista(es);
        guardarHistorialCache(asignatura.id, es);
      },
      () => setAviso('Sin conexión: estás viendo la última lista guardada.'),
    );
  }, [config, asignatura.id]);

  return (
    <div className="lista-historial">
      {aviso && <p className="detalle">{aviso}</p>}
      {!lista && !aviso && <p className="cargando">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Aún no hay pizarras guardadas en {asignatura.nombre}.</p>}
      <ul className="lista">
        {lista?.map((e) => (
          <li key={e.archivo} className="fila-proyecto">
            <button className="titulo-tarea" onClick={() => alAbrir(e)}>{e.titulo}</button>
            {e.fecha && <span className="detalle">{formatoCorto(e.fecha)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VisorHistorial({ asignatura, entrada, alVolver }: { asignatura: Asignatura; entrada: EntradaHistorial; alVolver(): void }) {
  const { config } = useDatos();
  const [pizarra, setPizarra] = useState<TipoPizarra | null>(() => leerPizarraCache(asignatura.id, entrada.archivo));
  const [error, setError] = useState<string | null>(null);
  const imagen = useMemo(
    () => (config ? imagenDeHistorial(config, asignatura.id) : () => Promise.reject(new Error('Sin conexión'))),
    [config, asignatura.id],
  );

  useEffect(() => {
    if (!config) return;
    leerDeHistorial(config, asignatura.id, entrada.archivo).then(
      (p) => {
        setPizarra(p);
        guardarPizarraCache(asignatura.id, entrada.archivo, p);
      },
      (e: Error) => setError(e.message),
    );
  }, [config, asignatura.id, entrada.archivo]);

  return (
    <div className="visor-historial">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">{pizarra?.titulo ?? entrada.titulo}{entrada.fecha ? ` · ${formatoCorto(entrada.fecha)}` : ''}</span>
      </div>
      {error && !pizarra && <p className="banner error">No se ha podido abrir: {error}</p>}
      {pizarra ? <Pizarra pizarra={pizarra} imagen={imagen} /> : !error && <p className="cargando">Cargando…</p>}
    </div>
  );
}

// Para el móvil y la web: el historial de la asignatura, a pantalla completa.
export function Historial({ asignatura }: { asignatura: Asignatura }) {
  const [abierta, setAbierta] = useState<EntradaHistorial | null>(null);
  return abierta ? (
    <VisorHistorial asignatura={asignatura} entrada={abierta} alVolver={() => setAbierta(null)} />
  ) : (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Pizarras guardadas</h2>
      <ListaHistorial asignatura={asignatura} alAbrir={setAbierta} />
    </section>
  );
}
```

- [ ] **Step 2: Historial en la pantalla del móvil y la web**

En `src/pantallas/Estudio.tsx`:
- **Import:** añade `import { Historial } from '../componentes/estudio/Historial';`.
- **Rama sin programa local:** sustituye todo el bloque `{(local.estado === 'no' || local.estado === 'cerrado') && ( … )}` por:

```tsx
      {(local.estado === 'no' || local.estado === 'cerrado') && (
        <>
          <div className="banner aviso">
            {local.estado === 'cerrado'
              ? 'El programa local se ha cerrado. Vuelve a abrirlo (npm run local) para seguir con el chat.'
              : 'El chat solo está disponible en tu PC.'}
          </div>
          <Historial key={asignatura.id} asignatura={asignatura} />
        </>
      )}
```

- [ ] **Step 3: Historial en la lista de conversaciones (PC)**

En `src/componentes/estudio/ListaConversaciones.tsx`:
- **Imports:**

  ```tsx
  import type { Asignatura } from '../../datos/asignaturas';
  import type { EntradaHistorial } from '../../estudio/historial';
  import { ListaHistorial } from './Historial';
  ```
- **`Props`:** cambia `asignatura: string;` por `asignatura: Asignatura;` y añade `alAbrirHistorial(e: EntradaHistorial): void;`.
- **Nombres:** en el cuerpo, usa `asignatura.id` donde ahora pone `asignatura` (en `listarConversaciones(asignatura.id)` y en la dependencia `[asignatura.id]`).
- **Al final, justo antes del `</div>` de cierre**, añade:

  ```tsx
        <h3>Historial</h3>
        <ListaHistorial asignatura={asignatura} alAbrir={alAbrirHistorial} />
  ```
- **La función:** su firma pasa a ser `export function ListaConversaciones({ asignatura, alAbrir, alNueva, alVolver, alAbrirHistorial }: Props)`.

- [ ] **Step 4: Guardar en el historial desde el PC**

En `src/componentes/estudio/EstudioLocal.tsx`:

1. **Imports:**

```tsx
import { useDatos } from '../../estado/datos';
import { useHoy } from '../../estado/hoy';
import type { EntradaHistorial } from '../../estudio/historial';
import { subirAlHistorial } from '../../estudio/historialRemoto';
import { leerArchivoBase64 } from '../../estudio/local';
import { VisorHistorial } from './Historial';
```

(`leerArchivoBase64` se puede añadir al import que ya existe de `../../estudio/local`).

2. **Estado nuevo**, después de `const cuantas = useRef(0);`:

```tsx
  const { config } = useDatos();
  const hoy = useHoy();
  const [historialAbierto, setHistorialAbierto] = useState<EntradaHistorial | null>(null);
  const [guardado, setGuardado] = useState<Record<number, 'subiendo' | 'pendiente' | 'hecho'>>({});
  const subiendo = useRef(new Set<number>());
  const pendientes = useRef(new Map<number, string>());
```

3. **Funciones y efectos**, antes de `if (!conv) return …`:

```tsx
  async function guardarEnHistorial(n: number, titulo: string) {
    const estado = pizarras.find((e) => e.n === n);
    if (!config || !conv || !estado?.pizarra || subiendo.current.has(n)) return;
    subiendo.current.add(n);
    setGuardado((g) => ({ ...g, [n]: 'subiendo' }));
    try {
      const ruta = await subirAlHistorial(config, asignatura.id, estado.pizarra, titulo, hoy, (r) => leerArchivoBase64(asignatura.id, conv.id, r));
      pendientes.current.delete(n);
      await operar(n, { tipo: 'guardada', ruta });
      setGuardado((g) => ({ ...g, [n]: 'hecho' }));
    } catch {
      pendientes.current.set(n, titulo);
      setGuardado((g) => ({ ...g, [n]: 'pendiente' }));
    } finally {
      subiendo.current.delete(n);
    }
  }

  function pedirTitulo(n: number) {
    const p = pizarras.find((e) => e.n === n)?.pizarra;
    const titulo = prompt('Título de la pizarra', p?.titulo ?? '')?.trim();
    if (titulo) void guardarEnHistorial(n, titulo);
  }

  // Si Claude ha pedido guardar una pizarra (guardarComo), se sube sola.
  useEffect(() => {
    for (const e of pizarras)
      if (e.pizarra?.guardarComo && !subiendo.current.has(e.n) && guardado[e.n] !== 'pendiente') void guardarEnHistorial(e.n, e.pizarra.guardarComo);
  });

  // Cuando vuelve internet, se reintenta lo pendiente.
  useEffect(() => {
    const reintentar = () => pendientes.current.forEach((titulo, n) => void guardarEnHistorial(n, titulo));
    window.addEventListener('online', reintentar);
    return () => window.removeEventListener('online', reintentar);
  });

  const textoGuardar = (n: number, guardadaEn: string | null) =>
    guardado[n] === 'subiendo' ? 'Guardando…'
      : guardado[n] === 'pendiente' ? 'Pendiente de subir (reintentar)'
        : guardadaEn ? 'Guardada ✓ (actualizar)'
          : 'Guardar en el historial ⤓';
```

4. **Visor del historial:** justo después de `if (!conv) return <p className="cargando">Cargando…</p>;`, añade:

```tsx
  if (historialAbierto)
    return (
      <div className="estudio-local sin-pizarra">
        <VisorHistorial asignatura={asignatura} entrada={historialAbierto} alVolver={() => setHistorialAbierto(null)} />
      </div>
    );
```

5. **Lista de conversaciones:** en el `<ListaConversaciones … />`, cambia `asignatura={asignatura.id}` por `asignatura={asignatura}` y añade `alAbrirHistorial={setHistorialAbierto}`.

6. **Botón de guardar:** cambia el `<Pizarra key=… />` por:

```tsx
              <Pizarra key={`${conv.id}-${actual.n}`} pizarra={actual.pizarra} imagen={imagen} alOperar={(op) => void operar(actual.n, op)}>
                <button
                  className={actual.pizarra.guardadaEn && guardado[actual.n] !== 'pendiente' ? '' : 'principal'}
                  disabled={!config || guardado[actual.n] === 'subiendo'}
                  onClick={() => pedirTitulo(actual.n)}
                >
                  {textoGuardar(actual.n, actual.pizarra.guardadaEn)}
                </button>
              </Pizarra>
```

- [ ] **Step 5: Estilos**

Añade al final de `src/estilos.css`:

```css
/* Historial */
.visor-historial { display: flex; flex-direction: column; height: calc(100vh - 230px); min-height: 380px; border: 1px solid var(--borde); border-radius: 14px; background: var(--superficie); overflow: hidden; }
.estudio-local .visor-historial { height: 100%; border: none; border-radius: 0; }
.lista-historial .lista { margin: 0; }
```

- [ ] **Step 6: Pruebas y build**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/componentes/estudio/Historial.tsx src/componentes/estudio/EstudioLocal.tsx src/componentes/estudio/ListaConversaciones.tsx src/pantallas/Estudio.tsx src/estilos.css
git commit -m "Estudio: guardar pizarras en el historial y verlas en el móvil y la web

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Prueba con Diego (cierre de la etapa 3)**

Con `npm run local`:
1. En una pizarra, pulsar «Guardar en el historial ⤓» y poner un título. En GitHub aparece `my-context/estudios/<asignatura>/pizarras/2026-…json`.
2. En el chat, «guárdala como Leyes de Newton» → se guarda sola.
3. «◂ Conversaciones» → Historial → abrir la pizarra guardada (solo lectura, con zoom y arrastre).

Luego, **sin programa local**, abre `npm run dev` en http://localhost:5173/segundo-cerebro-app/ (hace lo mismo que el móvil):
- Estudio enseña «El chat solo está disponible en tu PC» y el historial;
- la pizarra se abre y se puede arrastrar.

La prueba en el iPhone de verdad llega con la publicación (Task 19).

---

### Task 15: Documentación y guía del portátil

**Files:**
- Create: `docs/portatil.md`
- Modify: `docs/diseno.md`, `AGENTS.md`, `../my-context/AGENTS.md`

- [ ] **Step 1: `docs/diseno.md`**

1. **Arreglo menor aplazado.** Mueve la línea `El título es el primer encabezado \`#\`. Si no hay ninguno, se usa el \`id\`.` desde el final del bloque de Ideas hasta justo después del bloque de código de ejemplo de Proyectos (detrás de `Notas...` y del cierre `` ``` ``).
2. **Datos de estudio.** Al final de la sección 3 (antes de `## 4. Arquitectura`), añade:

````markdown
### Estudio: `estudios/asignaturas.yaml`
```yaml
asignaturas:
  - id: fisica          # minúsculas, números y guiones; «general» está reservado
    nombre: Física
    color: "#3d7bb8"    # entre comillas
```
«General» siempre existe y no va en el archivo. Quitar una asignatura no borra su carpeta ni su historial.

### Estudio: pizarras
- En curso (solo en el ordenador, git las ignora): `estudios/<asignatura>/.en-curso/<id-conversación>/pizarra-<n>.json` y sus capturas en `…/imagenes/`.
- Historial (se sincroniza): `estudios/<asignatura>/pizarras/AAAA-MM-DD-<titulo>.json` y `…/pizarras/imagenes/`.
- Formato: `{ "version": 1, "titulo", "piezas": [...], "flechas": [...], "guardarComo": null, "guardadaEn": null }`. Cada pieza lleva `id`, `tipo`, `x`, `y`, `ancho` (entre 40 y 2000), `contenido` y, opcional, `color`. Tipos: `texto` (Markdown con `$…$`), `formula` (LaTeX), `grafica` (`{x:[min,max], y:[min,max], curvas:[{expr, etiqueta?, color?}], puntos:[{x,y,etiqueta?}]}`), `dibujo` (SVG), `imagen` (`imagenes/<nombre>`) y `nota` (de Diego). Las flechas son `{id, de, a, etiqueta?}`. Detalle en `docs/superpowers/specs/2026-09-24-zona-de-estudio-design.md`, sección 6.
````

- [ ] **Step 2: `AGENTS.md` de la app**

- **Comandos:** añade `- \`npm run local\`: zona de estudio en el PC (compila la app y arranca el programa local en http://127.0.0.1:5174/segundo-cerebro-app/). Necesita Claude Code instalado y \`my-context\` al lado.`
- **Estructura:** añade:
  - `- \`local/\`: programa local de la zona de estudio (servidor, Claude Code, conversaciones, pizarras). Node lo ejecuta sin compilar: imports con \`.ts\`.`
  - `- \`src/estudio/\`: lógica de la zona de estudio (pizarra, expresiones, historial, cliente local). \`tipos.ts\`, \`contexto.ts\`, \`expresion.ts\` y \`pizarra.ts\` los usa también \`local/\`.`
- **Estado actual:** actualízalo: v1.2 implementada en la rama `zona-de-estudio`, pendiente de revisión final y publicación.

- [ ] **Step 3: `my-context/AGENTS.md`**

En «Dónde está todo», sustituye la línea de `estudios/` por:

```markdown
- `estudios/`: todo lo de la universidad. `asignaturas.yaml` (la app lo lee), una carpeta por asignatura con apuntes y `pizarras/` (el historial de la zona de estudio). Las carpetas `.en-curso/` son pizarras a medias del PC: no se suben.
```

y súbelo siguiendo la rutina de `my-context` (`git pull`, `git add -A`, `git commit -m "…"`, `git push`).

- [ ] **Step 4: Guía del portátil**

`docs/portatil.md`:

````markdown
# Zona de estudio en el portátil

Para tener el chat y la pizarra en el portátil, se necesitan los mismos programas que en el PC. Solo hay que hacerlo una vez.

1. **Node.js**: instala la versión LTS (24 o más nueva) desde https://nodejs.org.
2. **Git**: instálalo desde https://git-scm.com (con las opciones por defecto).
3. **Claude Code**: abre PowerShell y escribe:
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
   Después escribe `claude`, inicia sesión con tu cuenta de Claude y sal con `/exit`.
4. **Los dos repositorios**, en el Escritorio y uno al lado del otro:
   ```powershell
   cd $HOME\Desktop
   git clone https://github.com/Dino768/my-context.git
   git clone https://github.com/Dino768/segundo-cerebro-app.git
   cd segundo-cerebro-app
   npm install
   ```
5. **Arrancarlo** (cada vez que quieras estudiar):
   ```powershell
   cd $HOME\Desktop\segundo-cerebro-app
   npm run local
   ```
   Abre http://127.0.0.1:5174/segundo-cerebro-app/.
6. **La primera vez, la llave de GitHub**: crea un token nuevo para este portátil (solo `my-context`, permiso *Contents* de lectura y escritura, 90 días) y pégalo en Ajustes. Nunca lo pegues en el chat.

Las conversaciones y las pizarras en curso del portátil se quedan en el portátil. El historial de pizarras, las asignaturas, las tareas y todo lo demás se comparten con el PC y el móvil.
````

- [ ] **Step 5: Commit**

```bash
git add docs/diseno.md docs/portatil.md AGENTS.md
git commit -m "Documentación de la zona de estudio y guía para el portátil

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

# Etapa 4: pulidos pendientes de la v1.1

### Task 16: Casillas instantáneas

**Files:**
- Create: `src/estado/optimista.ts`, `src/estado/optimista.test.ts`
- Modify: `src/estado/datos.tsx`, `src/componentes/FilaTarea.tsx`

**Interfaces:**
- Produces:
  - `crearOptimista<T>(fijar: (f: (x: T) => T) => void): { cambiar(cambio, deshacer, guardar, alFallar): Promise<boolean> }`;
  - en el contexto: `cambiarTareasAlInstante(cambio, deshacer, mensaje): Promise<boolean>`.

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/estado/optimista.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { crearOptimista } from './optimista';

function montar(inicial: number[]) {
  let estado = inicial;
  const o = crearOptimista<number[]>((f) => (estado = f(estado)));
  return { o, ver: () => estado };
}

const promesa = <T,>() => {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const p = new Promise<T>((res, rej) => ((resolver = res), (rechazar = rej)));
  return { p, resolver, rechazar };
};

describe('crearOptimista', () => {
  it('cambia al instante y, al guardar, se queda con lo que diga GitHub', async () => {
    const { o, ver } = montar([1]);
    const g = promesa<number[]>();
    const hecho = o.cambiar((x) => [...x, 2], (x) => x.filter((n) => n !== 2), () => g.p, vi.fn());
    expect(ver()).toEqual([1, 2]);
    g.resolver([1, 2, 99]);
    expect(await hecho).toBe(true);
    expect(ver()).toEqual([1, 2, 99]);
  });
  it('con dos cambios seguidos no se pisa el segundo mientras se guarda', async () => {
    const { o, ver } = montar([]);
    const a = promesa<number[]>();
    const b = promesa<number[]>();
    const pa = o.cambiar((x) => [...x, 1], (x) => x, () => a.p, vi.fn());
    const pb = o.cambiar((x) => [...x, 2], (x) => x, () => b.p, vi.fn());
    a.resolver([1]);
    await pa;
    expect(ver()).toEqual([1, 2]);
    b.resolver([1, 2]);
    await pb;
    expect(ver()).toEqual([1, 2]);
  });
  it('si falla, se deshace y se avisa', async () => {
    const { o, ver } = montar([1]);
    const alFallar = vi.fn();
    const r = await o.cambiar((x) => [...x, 2], (x) => x.filter((n) => n !== 2), () => Promise.reject(new Error('red')), alFallar);
    expect(r).toBe(false);
    expect(ver()).toEqual([1]);
    expect(alFallar).toHaveBeenCalledWith(expect.objectContaining({ message: 'red' }));
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estado/optimista.test.ts`
Expected: FAIL, no existe `./optimista`.

- [ ] **Step 3: Escribir el código**

`src/estado/optimista.ts`:

```ts
// Guardado optimista: el cambio se ve al momento y se guarda por detrás.
// Si falla, se deshace. Mientras quedan guardados pendientes, no se pisa la lista local
// con la de GitHub (le faltarían los cambios que aún no han llegado).
export interface Optimista<T> {
  cambiar(cambio: (x: T) => T, deshacer: (x: T) => T, guardar: () => Promise<T>, alFallar: (e: unknown) => void): Promise<boolean>;
}

export function crearOptimista<T>(fijar: (f: (x: T) => T) => void): Optimista<T> {
  let pendientes = 0;
  return {
    async cambiar(cambio, deshacer, guardar, alFallar) {
      fijar(cambio);
      pendientes++;
      try {
        const remoto = await guardar();
        pendientes--;
        if (pendientes === 0) fijar(() => remoto);
        return true;
      } catch (e) {
        pendientes--;
        fijar(deshacer);
        alFallar(e);
        return false;
      }
    },
  };
}
```

En `src/estado/datos.tsx`:
- **Import:** `import { crearOptimista } from './optimista';`.
- **`ValorDatos`:** `cambiarTareasAlInstante(cambio: (ts: Tarea[]) => Tarea[], deshacer: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>;`.
- **Nuevo, después de `cambiarTareas`:**

```tsx
  const [optimista] = useState(() => crearOptimista<Tarea[]>((f) => setDatos((d) => ({ ...d, tareas: f(d.tareas) }))));
  const cambiarTareasAlInstante = useCallback(
    (cambio: (ts: Tarea[]) => Tarea[], deshacer: (ts: Tarea[]) => Tarea[], mensaje: string) => {
      if (!config) return Promise.resolve(false);
      return optimista.cambiar(
        cambio,
        deshacer,
        () => encolar(() => modificarTareas(config, cambio, mensaje)),
        (e) => {
          alFallar(e, false);
          setAviso((a) => `${a ?? 'No se ha podido guardar.'} Se ha deshecho «${mensaje}».`);
        },
      );
    },
    [config, alFallar, encolar, optimista],
  );
```
- **`useMemo` de `valor`:** añade `cambiarTareasAlInstante` al objeto y a las dependencias.

Sustituye el cuerpo de `FilaTarea` desde `const { datos, cambiarTareas, … }` hasta el final de `marcar()` por:

```tsx
  const { datos, cambiarTareasAlInstante, soloLectura, tareasBloqueadas } = useDatos();
  const hecha = hechaEl(tarea, dia);
  const bloqueado = soloLectura || tareasBloqueadas;

  // Se marca al momento; se guarda por detrás y, si falla, se deshace con un aviso.
  function marcar() {
    const valor = !hecha;
    void cambiarTareasAlInstante(
      (ts) => fijarEnLista(ts, tarea.id, dia, valor),
      (ts) => fijarEnLista(ts, tarea.id, dia, !valor),
      `${valor ? 'Completar' : 'Desmarcar'}: ${tarea.titulo}`,
    );
  }
```

y en el `<input type="checkbox">` cambia `disabled={bloqueado || guardando !== null}` por `disabled={bloqueado}` y `onChange={() => void marcar()}` por `onChange={marcar}`. Quita `useState` del import de React (y el import de React entero si queda vacío).

- [ ] **Step 4: Pruebas, build y prueba a mano**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

Con `npm run dev`, marca y desmarca varias tareas seguidas en el Inicio: cambian al instante y, pasados unos segundos, siguen como las dejaste. Luego recarga la página para confirmar que se guardaron.

- [ ] **Step 5: Commit**

```bash
git add src/estado/optimista.ts src/estado/optimista.test.ts src/estado/datos.tsx src/componentes/FilaTarea.tsx
git commit -m "Casillas instantáneas: se marcan al momento y se guardan por detrás

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: A prueba: la hora en el Inicio y el contenido pegado a la izquierda

**Files:**
- Modify: `src/fechas.ts`, `src/fechas.test.ts`, `src/estado/hoy.ts`, `src/pantallas/Inicio.tsx`, `src/estilos.css`

**Interfaces:**
- Produces: `horaCorta(d: Date): string` (`"09:05"`) y `useAhora(): Date` (se actualiza cada minuto).

- [ ] **Step 1: Escribir la prueba (que falle)**

Añade al final de `src/fechas.test.ts` (y `horaCorta` a su import):

```ts
describe('horaCorta', () => {
  it('dos cifras para horas y minutos', () => {
    expect(horaCorta(new Date(2026, 8, 24, 9, 5))).toBe('09:05');
    expect(horaCorta(new Date(2026, 8, 24, 23, 59))).toBe('23:59');
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/fechas.test.ts`
Expected: FAIL, `horaCorta` no existe.

- [ ] **Step 3: Escribir el código**

En `src/fechas.ts` añade:

```ts
export function horaCorta(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
```

En `src/estado/hoy.ts` añade:

```ts
// La hora actual, que avanza sola cada minuto (justo al cambiar de minuto).
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      setAhora(new Date());
      temporizador = setTimeout(siguiente, 60_000 - (Date.now() % 60_000) + 50);
    };
    temporizador = setTimeout(siguiente, 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(temporizador);
  }, []);
  return ahora;
}
```

En `src/pantallas/Inicio.tsx`:
- **Imports:** añade `horaCorta` al import de `../fechas` y `useAhora` al de `../estado/hoy`.
- **Dentro del componente:** junto al `useHoy()`, añade `const ahora = useAhora();`.
- **El saludo:** cambia `<p>{formatoLargo(hoy)}</p>` por:

```tsx
        <p>{formatoLargo(hoy)} · {horaCorta(ahora)}</p>
```

En `src/estilos.css`, dentro de `@media (min-width: 900px)` de la barra lateral, cambia la regla de `main` a:

```css
  main { flex: 1; min-width: 0; padding: 28px 40px 40px; margin: 0; }
```

(así el contenido queda pegado a la barra lateral y mantiene su ancho máximo de 1180 px).

- [ ] **Step 4: Enseñárselo a Diego y que elija**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run dev`

Pide a Diego que abra http://localhost:5173/segundo-cerebro-app/ en el PC y mire las dos cosas:
1. **La hora** junto a la fecha, bajo el saludo.
2. **El contenido pegado a la izquierda**, junto a la barra lateral. Para comparar, puedes quitar un momento `margin: 0;` y recargar.

Diego decide cada una por separado:
- si no le gusta la hora, deshaz los cambios de `Inicio.tsx` y deja `horaCorta` y `useAhora` (tienen prueba y no molestan) o quítalos también;
- si no le gusta el contenido a la izquierda, quita `margin: 0;`.

Apunta lo que elija como `Ruling:` en el registro.

- [ ] **Step 5: Commit**

```bash
git add src/fechas.ts src/fechas.test.ts src/estado/hoy.ts src/pantallas/Inicio.tsx src/estilos.css
git commit -m "Inicio: hora junto a la fecha y contenido junto a la barra lateral (elegido por Diego)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(Ajusta el mensaje a lo que Diego haya elegido.)

---

### Task 18: Arreglos menores aplazados

**Files:**
- Modify: `src/pantallas/Ideas.tsx`, `src/datos/ideas.ts`, `src/datos/ideas.test.ts`, `src/repositorio.ts`, `src/repositorio.test.ts`, `src/componentes/FormTarea.tsx`, `src/componentes/FormProyectoDesdeIdea.tsx`, `src/estado/datos.tsx`, `src/App.tsx`, `src/componentes/Lateral.tsx`, `src/pantallas/Proyectos.tsx`, `src/estilos.css`, `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`

**Interfaces:**
- Produces:
  - `mismoFinDeLinea(nuevo: string, original: string | null): string`;
  - `listarIdsProyectos(cfg): Promise<string[]>`;
  - en el contexto: `idsProyectos(): Promise<string[]>`;
  - prop `alCambiarAbierto?(id: string | null)` en `Proyectos` y prop `proyectoAbierto` en `Lateral`.

- [ ] **Step 1: Escribir las pruebas (que fallen)**

En `src/datos/ideas.test.ts` añade `mismoFinDeLinea` al import y al final:

```ts
describe('fin de línea y BOM', () => {
  it('un BOM al principio no esconde la primera idea', () => {
    expect(ideasDe(parseBandeja('\uFEFF- 2026-09-24: Primera\n'))).toEqual([{ fecha: '2026-09-24', texto: 'Primera' }]);
  });
  it('si el archivo usaba CRLF, se conserva', () => {
    expect(mismoFinDeLinea('a\nb\n', 'x\r\ny\r\n')).toBe('a\r\nb\r\n');
    expect(mismoFinDeLinea('a\nb\n', 'x\ny\n')).toBe('a\nb\n');
    expect(mismoFinDeLinea('a\nb\n', null)).toBe('a\nb\n');
  });
});
```

En `src/repositorio.test.ts` añade `listarIdsProyectos` al import y al final:

```ts
describe('arreglos menores', () => {
  it('modificarBandeja conserva CRLF', async () => {
    const escrito = simularRemoto('# Bandeja\r\n- 2026-09-24: Una\r\n');
    await modificarBandeja(cfg, (ls) => anadirIdea(ls, { fecha: '2026-09-25', texto: 'Otra' }), 'x');
    expect(escrito()).toBe('# Bandeja\r\n- 2026-09-24: Una\r\n- 2026-09-25: Otra\r\n');
  });
  it('listarIdsProyectos lee los ids de GitHub', async () => {
    listar.mockResolvedValue(['juego.md', 'notas.txt', 'app.md']);
    expect(await listarIdsProyectos(cfg)).toEqual(['juego', 'app']);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/datos/ideas.test.ts src/repositorio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Bandeja: BOM y CRLF**

En `src/datos/ideas.ts`:
- **BOM:** en `parseBandeja`, cambia la primera línea por `const normal = texto.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');`.
- **Fin de línea:** añade:

```ts
// Si el archivo original usaba fin de línea de Windows (CRLF), se conserva al escribirlo.
export function mismoFinDeLinea(nuevo: string, original: string | null): string {
  return original?.includes('\r\n') ? nuevo.replace(/\r?\n/g, '\r\n') : nuevo;
}
```

En `src/repositorio.ts`:
- **Imports:** añade `mismoFinDeLinea` al import de `./datos/ideas`.
- **`modificarBandeja`:** cambia `return serializarBandeja(resultado);` por `return mismoFinDeLinea(serializarBandeja(resultado), texto);`.
- **Al final del archivo**, añade:

```ts
export async function listarIdsProyectos(cfg: Config): Promise<string[]> {
  return (await listarCarpeta(cfg, CARPETA_PROYECTOS)).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
}
```

- [ ] **Step 4: Idea → Proyecto sin chocar con un proyecto nuevo de Claude**

En `src/estado/datos.tsx`:
- **Import:** `listarIdsProyectos` junto a los otros de `../repositorio`.
- **`ValorDatos`:** `idsProyectos(): Promise<string[]>;`.
- **Nuevo:**

```tsx
  // Ids de proyectos que hay en GitHub ahora mismo (puede haber alguno nuevo de Claude sin refrescar).
  const idsProyectos = useCallback(async () => {
    const locales = datos.proyectos.map((p) => p.id);
    if (!config) return locales;
    const remotos = await listarIdsProyectos(config).catch(() => [] as string[]);
    return [...new Set([...locales, ...remotos])];
  }, [config, datos.proyectos]);
```
- **`useMemo` de `valor`:** añádelo al objeto y a las dependencias.

En `src/componentes/FormProyectoDesdeIdea.tsx`:
- toma `idsProyectos` de `useDatos()`;
- en `crear`, cambia la línea que construye `p` por:

```tsx
    const p = proyectoDesdeIdea(idea, nombre, area || undefined, await idsProyectos(), hoy);
```

- [ ] **Step 5: Idea → Tarea con un proyecto ya borrado**

En `src/componentes/FormTarea.tsx`:
- **Valor inicial:** cambia la línea `const [proyecto, setProyecto] = useState(…)` por:

```tsx
  // Una idea vinculada a un proyecto que ya no existe no debe guardar ese id viejo en la tarea.
  const proyectoNuevo = nueva.proyecto && datos.proyectos.some((p) => p.id === nueva.proyecto) ? nueva.proyecto : '';
  const [proyecto, setProyecto] = useState(original?.proyecto ?? proyectoNuevo);
```
- **Opción del id desconocido:** dentro del `<select>` de Proyecto, después del `map` de proyectos, añade (así una tarea que ya tenía un proyecto desconocido lo enseña tal cual, como hace el campo Área):

```tsx
              {proyecto && !datos.proyectos.some((p) => p.id === proyecto) && <option value={proyecto}>{proyecto}</option>}
```

- [ ] **Step 6: Ideas: no apuntar dos veces ni tocar una fila que se está guardando**

En `src/pantallas/Ideas.tsx`:
1. **Import:** añade `mismaIdea` al import de `../agenda/ideas`.
2. **Estado:** después de `const [convirtiendo, …]` añade:

```tsx
  const [apuntando, setApuntando] = useState(false);
  // Ideas que se están guardando: su fila se bloquea hasta que termine.
  const [ocupadas, setOcupadas] = useState<Idea[]>([]);
  const ocupada = (idea: Idea) => ocupadas.some((x) => mismaIdea(x, idea));
  async function conCandado(idea: Idea, accion: () => Promise<unknown>) {
    if (ocupada(idea)) return;
    setOcupadas((os) => [...os, idea]);
    try {
      await accion();
    } finally {
      setOcupadas((os) => os.filter((x) => !mismaIdea(x, idea)));
    }
  }
```
3. **`apuntar`:** sustitúyelo por:

```tsx
  async function apuntar(e: { preventDefault(): void }) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || apuntando) return;
    setApuntando(true);
    const ok = await cambiarIdeas((ls) => anadirIdea(ls, { fecha: hoy, texto: limpio }), `Apuntar idea: ${limpio}`);
    setApuntando(false);
    if (ok) setTexto('');
  }
```
4. **`vincular`, `aTarea` y `borrar`:** sustitúyelos por:

```tsx
  const vincular = (idea: Idea, proyecto: string) =>
    void conCandado(idea, () =>
      cambiarIdeas((ls) => vincularIdea(ls, idea, proyecto || undefined), proyecto ? `Vincular idea a ${proyecto}` : 'Desvincular idea'),
    );

  const aTarea = (idea: Idea) =>
    editar({
      nueva: { titulo: idea.texto, proyecto: idea.proyecto },
      nota: 'Al guardar la tarea, la idea sale de la bandeja.',
      alGuardar: () => conCandado(idea, () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Idea pasada a tarea: ${idea.texto}`)),
    });

  const borrar = (idea: Idea) => {
    if (confirm(`¿Borrar la idea «${idea.texto}»?`))
      void conCandado(idea, () => cambiarIdeas((ls) => quitarIdea(ls, idea), `Borrar idea: ${idea.texto}`));
  };
```
5. **Botón «Apuntar idea»:** `disabled={!texto.trim() || soloLectura || apuntando}`.
6. **Fila:**
   - en el `<select>` de cada fila, `disabled={soloLectura || ocupada(idea)}`;
   - en los tres botones, añade `|| ocupada(idea)` a su `disabled`;
   - en el `<li>`, `className={\`fila-idea${ocupada(idea) ? ' guardando' : ''}\`}`.

Añade a `src/estilos.css` (en el bloque de Ideas): `.fila-idea.guardando { opacity: 0.6; }`.

- [ ] **Step 7: La barra lateral resalta el proyecto abierto**

En `src/pantallas/Proyectos.tsx`:
- **Import:** `useEffect` junto a `useState`.
- **`Props`:** añade `alCambiarAbierto?(id: string | null): void;` y recíbelo en la función.
- **Después de `const [abierto, setAbierto] = …`:**

```tsx
  useEffect(() => alCambiarAbierto?.(abierto), [abierto, alCambiarAbierto]);
```

En `src/App.tsx`:
- **Estado:** `const [proyectoAbierto, setProyectoAbierto] = useState<string | null>(null);`.
- **`<Proyectos … />`:** añade `alCambiarAbierto={setProyectoAbierto}`.
- **`<Lateral … />`:** añade `proyectoAbierto={actual === 'proyectos' ? proyectoAbierto : null}`.

En `src/componentes/Lateral.tsx`:
- **`Props`:** añade `proyectoAbierto: string | null;` y recíbelo.
- **Subproyecto:** en el botón de cada subproyecto, cambia `className="item-lateral sub"` por:

```tsx
                className={`item-lateral sub${proyectoAbierto === p.id ? ' activo' : ''}`}
```

- [ ] **Step 8: Marcar los arreglos en el registro de la v1.1**

En `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`, añade al final:

```
Final: minor (deferred) → hechos en la v1.2 (plan 2026-09-24-zona-de-estudio, Task 18 y Task 15 para docs/diseno.md).
```

- [ ] **Step 9: Pruebas, build y prueba a mano**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y el build sin errores.

Con `npm run dev`, comprueba:
1. En Ideas, pulsar Enter dos veces rápido apunta una sola idea.
2. Cambiar el proyecto de una idea y tocar enseguida otro botón de la misma fila: está bloqueado mientras guarda.
3. Al abrir un proyecto, su nombre se resalta en la barra lateral.

- [ ] **Step 10: Commit**

```bash
git add src/pantallas/Ideas.tsx src/datos/ideas.ts src/datos/ideas.test.ts src/repositorio.ts src/repositorio.test.ts src/componentes/FormTarea.tsx src/componentes/FormProyectoDesdeIdea.tsx src/estado/datos.tsx src/App.tsx src/componentes/Lateral.tsx src/pantallas/Proyectos.tsx src/estilos.css
git commit -m "Arreglos menores de la v1.1: ideas sin duplicados, CRLF, proyectos nuevos de Claude y barra lateral

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Revisión final y publicación

**Files:**
- Modify: `AGENTS.md`, `.superpowers/sdd/2026-09-24-zona-de-estudio/progress.md`

- [ ] **Step 1: Todo en verde**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todas las pruebas pasan y el build termina.

- [ ] **Step 2: Revisión de toda la rama**

Pide una revisión de toda la rama (`main..zona-de-estudio`) con el método elegido (el revisor final de `superpowers:subagent-driven-development` o de `superpowers:requesting-code-review`), pasándole el spec y este plan. Arregla lo importante y apunta lo que se aplace como `Final: minor (deferred)` en el registro.

- [ ] **Step 3: Estado actual**

Actualiza la sección «Estado actual» de `AGENTS.md`:
- v1.2 (zona de estudio y pulidos) terminada;
- cómo se usa (`npm run local`);
- lo aplazado;
- la siguiente fase: **dibujo a mano en la pizarra**.

Commit.

- [ ] **Step 4: Publicar, solo con permiso de Diego**

Pregunta a Diego si se publica. Si dice que sí:

```bash
git checkout main && git merge --no-ff zona-de-estudio -m "Versión 1.2: zona de estudio y pulidos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push
```

Espera a que termine el despliegue (`gh run watch` o la pestaña Actions) y pide a Diego que abra la app en el iPhone. En Estudio debe ver el aviso «El chat solo está disponible en tu PC» y el historial con la pizarra guardada en la etapa 3.

- [ ] **Step 5: Cerrar el registro**

Añade al registro `Task 19: complete (…)` con el resultado de la revisión y de la publicación.
