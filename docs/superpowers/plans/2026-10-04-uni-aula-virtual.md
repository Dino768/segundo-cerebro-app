# Aula virtual (parte C): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el programa local del PC revise una vez al día el aula virtual de la URJC y lleve fechas (a la agenda), avisos (a la app), materiales (al PC) y guías docentes (a `my-context`), sin equivocarse con las fechas.

**Architecture:** Lógica pura con pruebas en `src/uni/aula/` y `src/datos/` (Node la ejecuta sin compilar: imports con `.ts`). El programa local (`local/aula/`) maneja Chrome con `playwright-core` (perfil propio), llama a Claude Code sin herramientas (Haiku → Sonnet → Opus si hay dudas), escribe en `my-context` y hace `git commit` y `push`. La app lee `estudios/avisos.yaml`, `estudios/<asignatura>/aula-virtual.yaml` y `guia-docente.md` con la API de GitHub, como el resto.

**Tech Stack:** TypeScript, React 19, Vitest, Node 22+ (`node file.ts`), `yaml`, `playwright-core`, `node-html-parser`, `unpdf`, Claude Code CLI.

**Spec:** `docs/superpowers/specs/2026-10-04-uni-aula-virtual-design.md`

## Global Constraints

- Node está en `C:\Program Files\nodejs`: en Bash, `export PATH="$PATH:/c/Program Files/nodejs";` delante de cada comando.
- Código que ejecuta Node sin compilar (`src/uni/**`, `src/datos/**` que importe `local/` o `sincronizar/`, `local/**`): imports relativos con extensión `.ts`.
- Nunca se escriben en la consola, en los registros ni en el repositorio público: contraseñas, cookies, `sesskey`, nombres de compañeros ni textos reales de avisos. Las páginas guardadas para pruebas se anonimizan.
- Base del aula virtual: `https://www.aulavirtual.urjc.es/moodle`.
- Perfil del navegador: `C:\Users\Diego\.segundo-cerebro\navegador-aula\` (`path.join(os.homedir(), '.segundo-cerebro', 'navegador-aula')`). Interruptor: `~/.segundo-cerebro/aula-virtual.json` (`{ "activo": true }`), apagado si no existe.
- Revisión: al arrancar y cada hora se mira si la última revisión completa tiene más de 20 horas.
- Límite de descarga: 50 MB (`50 * 1024 * 1024`). Vídeos nunca se descargan.
- Rutas nuevas en `my-context`: `estudios/avisos.yaml`, `estudios/aula-sincronizacion.yaml`, `estudios/<id>/aula-virtual.yaml`, `estudios/<id>/guia-docente.md`, `estudios/<id>/aula-virtual/` (no se sube: `.gitignore`).
- Origen de las tareas: `aula:<id asignatura>:<clave>`. Título: `<que>: <nombre asignatura>`; dudosa: `⚠ <que>: <nombre asignatura> (por confirmar)`. Sin `prioridad`. Sin `icono` (igual que la parte A hoy: `fusionar` no pone icono).
- Avisos: se quitan los leídos con fecha de hace más de 60 días. Los avisos del programa siempre `importante: true`.
- Modelos: `haiku`, `sonnet`, `opus` (alias de Claude Code), en ese orden, por asignatura; la siguiente asignatura vuelve a empezar por `haiku`.
- Curso académico: del 1 de septiembre al 31 de julio (2026-27 = `2026-09-01`…`2027-07-31`).
- `VERSION_PROGRAMA` pasa de 4 a 5.
- Nunca `git push` de **este** repositorio sin que Diego lo sepa. El programa local sí sube `my-context` (es su trabajo, como el workflow de la parte A).
- Hablar con Diego en español sencillo; cada tarea deja su línea en `.superpowers/sdd/2026-10-04-uni-aula-virtual/progress.md`; desvíos como `Ruling:`.

## Review Focus

1. **Una página que el programa no entiende** (la URJC cambia el diseño, mantenimiento, curso vacío): no se borra ni se marca como retirado nada, y la revisión acaba en `resultado: error`. → prueba en Task 2 (curso sin secciones → `ErrorFormato`) y en Task 9 (contenido vacío → error, `aula-virtual.yaml` intacto).
2. **Claude devuelve JSON roto o con texto alrededor** (explicaciones, bloque ```json): se extrae el objeto o se trata como fallo de ese modelo y se sube al siguiente; nunca se escribe una fecha. → prueba en Task 6 (`leerRespuesta` con texto alrededor y con basura) y Task 9 (respuesta rota en haiku → sonnet).
3. **Fecha de examen que se adelanta en un aviso nuevo** sobre una tarea que Diego ya tiene: se mueve y sale aviso importante, aunque Diego hubiera editado la hora. → prueba en Task 7 (`fusionar` → `adelantadas`) y Task 9 (aviso del programa creado).
4. **`my-context` con cambios sin subir** (Claude o Diego trabajando a la vez): el programa no escribe nada, no hace `reset`, y lo intenta en la siguiente hora. → prueba en Task 9 (`git.limpio()` falso → `resultado: error`, ningún archivo tocado).
5. **Límite de uso de Claude a mitad de la revisión**: lo ya descargado se guarda, los avisos entran como normales, lo no leído va a `pendientes` y se lee en la siguiente revisión sin repetir descargas. → prueba en Task 9.

---

## Mapa de archivos

**Nuevos (lógica pura, con pruebas):**
- `src/datos/avisos.ts` — formato de `avisos.yaml` (lo usan la app y el programa).
- `src/datos/aulaVirtual.ts` — formato de `aula-virtual.yaml`.
- `src/datos/guia.ts` — escribir `guia-docente.md` y sacar su sección «Evaluación».
- `src/uni/aula/paginas.ts` — leer respuestas del aula virtual (JSON de AJAX y HTML).
- `src/uni/aula/estado.ts` — formato de `aula-sincronizacion.yaml`.
- `src/uni/aula/avisos.ts` — añadir, limpiar y crear avisos del programa.
- `src/uni/aula/materiales.ts` — qué es material, nombres seguros, lista por temas, retirados.
- `src/uni/aula/fechas.ts` — pregunta para Claude, lectura de la respuesta, comprobaciones, decisión final.

**Nuevos (programa local):**
- `local/aula/navegador.ts` — Chrome/Edge con `playwright-core`: entrar, sesión, páginas, AJAX, descargas.
- `local/aula/texto.ts` — texto de PDF y HTML.
- `local/aula/claude.ts` — llamar a Claude sin herramientas con un modelo.
- `local/aula/instrucciones-fechas.md` — instrucciones para Claude.
- `local/aula/git.ts` — `git` en `my-context`.
- `local/aula/revision.ts` — una revisión completa.
- `local/aula/programador.ts` — cuándo revisar e interruptor.
- `scripts/aula-prueba.ts` — Tarea 1: entrar y guardar páginas de ejemplo.

**Nuevos (app):** `src/estado/aula.ts`, `src/componentes/LineaAvisos.tsx`, `src/componentes/estudio/AulaVirtual.tsx`, `src/componentes/AjustesAula.tsx`.

**Cambian:** `package.json`, `src/datos/rutas.ts`, `src/uni/tipos.ts`, `src/uni/vistos.ts`, `src/uni/fusionar.ts`, `local/servidor.ts`, `local/principal.ts`, `local/instrucciones-estudio.md`, `src/estudio/tipos.ts`, `src/estudio/local.ts`, `src/repositorio.ts`, `src/componentes/navegacion.ts`, `src/App.tsx`, `src/pantallas/Inicio.tsx`, `src/pantallas/Estudio.tsx`, `src/pantallas/Ajustes.tsx`, `src/estilos.css`, `docs/diseno.md`, `AGENTS.md`; en `my-context`: `.gitignore`, `AGENTS.md`.

---

### Task 1: Prueba de acceso con Diego (navegador y páginas de ejemplo)

Esta tarea la hace la sesión principal **con Diego delante** (tiene que entrar él). No se delega en un subagente.

**Files:**
- Modify: `package.json`
- Create: `local/aula/navegador.ts`, `local/aula/navegador.test.ts`, `scripts/aula-prueba.ts`
- Create (salida, anonimizada): `src/uni/aula/pruebas/estado-curso.json`, `src/uni/aula/pruebas/cursos.json`, `src/uni/aula/pruebas/foro.html`, `src/uni/aula/pruebas/hilo.html`, `src/uni/aula/pruebas/carpeta.html`, `src/uni/aula/pruebas/NOTAS.md`

**Interfaces:**
- Produces:
  ```ts
  export const BASE_AULA = 'https://www.aulavirtual.urjc.es/moodle';
  export interface Descarga { bytes: Uint8Array; nombre: string; tipo?: string }
  export interface Navegador {
    sesionValida(): Promise<boolean>;
    pedirTexto(url: string): Promise<string>;          // lanza SesionCaducada si acaba en la página de entrada
    ajax(sesskey: string, metodo: string, args: Record<string, unknown>): Promise<unknown>;
    descargar(url: string, limite: number): Promise<Descarga | { demasiadoGrande: true; nombre: string }>;
    cerrar(): Promise<void>;
  }
  export function abrirNavegador(perfil: string): Promise<Navegador>;   // sin ventana
  export function entrar(perfil: string, esperaMaxima?: number): Promise<boolean>; // con ventana
  ```
  (`SesionCaducada` y `esPaginaDeEntrada` vienen de `src/uni/aula/paginas.ts`; en esta tarea se crea ese archivo solo con ellas y `leerSesskey`, y la Task 2 lo amplía.)

- [ ] **Step 1: Instalar las librerías**

```bash
export PATH="$PATH:/c/Program Files/nodejs"; npm install playwright-core node-html-parser unpdf
```
Expected: se añaden a `dependencies` en `package.json`. `playwright-core` no descarga navegadores.

- [ ] **Step 2: Prueba que falla para lo más pequeño**

`src/uni/aula/paginas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { esPaginaDeEntrada, leerSesskey } from './paginas.ts';

describe('entrada', () => {
  it('reconoce la página de entrada de la URJC y la de Moodle', () => {
    expect(esPaginaDeEntrada('https://identifica.urjc.es/CAS/login?service=x')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/login/index.php')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/my/')).toBe(false);
  });
  it('saca la sesskey de una página', () => {
    expect(leerSesskey('<script>M.cfg = {"wwwroot":"x","sesskey":"Ab12Cd34Ef","sessiontimeout":"7200"};</script>')).toBe('Ab12Cd34Ef');
    expect(() => leerSesskey('<html></html>')).toThrow(/sesskey/);
  });
});
```
Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni/aula/paginas.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Implementación mínima**

`src/uni/aula/paginas.ts`:
```ts
// Lee lo que devuelve el aula virtual (Moodle 4.5 de la URJC). Sin red: solo texto → datos.
import { ErrorFormato } from '../tipos.ts';

// La URJC ha cerrado la sesión: hay que volver a entrar (con ventana).
export class SesionCaducada extends Error {
  constructor() {
    super('la sesión del aula virtual ha caducado: hay que volver a entrar');
    this.name = 'SesionCaducada';
  }
}

export function esPaginaDeEntrada(url: string): boolean {
  return /^https:\/\/identifica\.urjc\.es\//.test(url) || /\/moodle\/login\/index\.php/.test(url);
}

export function leerSesskey(html: string): string {
  const m = /"sesskey":"([A-Za-z0-9]+)"/.exec(html);
  if (!m) throw new ErrorFormato('no encuentro la sesskey en la página del aula virtual');
  return m[1];
}
```
Run el test → PASS.

- [ ] **Step 4: El navegador**

`local/aula/navegador.ts`:
```ts
// Chrome (o Edge si no hay Chrome) con un perfil propio, separado del navegador de Diego.
// La contraseña nunca pasa por aquí: Diego entra en la ventana y el perfil guarda las cookies.
import { chromium, type BrowserContext } from 'playwright-core';
import { esPaginaDeEntrada, SesionCaducada } from '../../src/uni/aula/paginas.ts';
import { ErrorFormato } from '../../src/uni/tipos.ts';

export const BASE_AULA = 'https://www.aulavirtual.urjc.es/moodle';
const ENTRADA = `${BASE_AULA}/login/index.php?authCASattras=CASattras`;
const ESPERA = 60_000;

export interface Descarga { bytes: Uint8Array; nombre: string; tipo?: string }
export interface Navegador {
  sesionValida(): Promise<boolean>;
  pedirTexto(url: string): Promise<string>;
  ajax(sesskey: string, metodo: string, args: Record<string, unknown>): Promise<unknown>;
  descargar(url: string, limite: number): Promise<Descarga | { demasiadoGrande: true; nombre: string }>;
  cerrar(): Promise<void>;
}

async function lanzar(perfil: string, visible: boolean): Promise<BrowserContext> {
  const opciones = { headless: !visible, acceptDownloads: false };
  try {
    return await chromium.launchPersistentContext(perfil, { ...opciones, channel: 'chrome' });
  } catch {
    return await chromium.launchPersistentContext(perfil, { ...opciones, channel: 'msedge' });
  }
}

// Nombre del archivo: el de Content-Disposition o el final de la URL.
export function nombreDeDescarga(url: string, disposicion: string | undefined): string {
  const utf = disposicion && /filename\*=UTF-8''([^;]+)/i.exec(disposicion);
  if (utf) return decodeURIComponent(utf[1]);
  const simple = disposicion && /filename="?([^";]+)"?/i.exec(disposicion);
  if (simple) return simple[1];
  const ultimo = new URL(url).pathname.split('/').pop() ?? 'archivo';
  return decodeURIComponent(ultimo) || 'archivo';
}

export async function abrirNavegador(perfil: string): Promise<Navegador> {
  const ctx = await lanzar(perfil, false);
  const req = ctx.request;
  return {
    async sesionValida() {
      const r = await req.get(`${BASE_AULA}/my/`, { timeout: ESPERA });
      return r.ok() && !esPaginaDeEntrada(r.url());
    },
    async pedirTexto(url) {
      const r = await req.get(url, { timeout: ESPERA });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      if (!r.ok()) throw new ErrorFormato(`el aula virtual contestó ${r.status()}`);
      return r.text();
    },
    async ajax(sesskey, metodo, args) {
      const r = await req.post(`${BASE_AULA}/lib/ajax/service.php?sesskey=${sesskey}&info=${metodo}`, {
        data: [{ index: 0, methodname: metodo, args }], timeout: ESPERA,
      });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      const j = (await r.json().catch(() => null)) as { error?: boolean | string; errorcode?: string; data?: unknown; exception?: { errorcode?: string; message?: string } }[] | { error?: string; errorcode?: string } | null;
      const uno = Array.isArray(j) ? j[0] : j;
      const codigo = uno?.errorcode ?? (uno as { exception?: { errorcode?: string } })?.exception?.errorcode;
      if (codigo === 'servicerequireslogin' || codigo === 'invalidsesskey') throw new SesionCaducada();
      if (!uno || uno.error) throw new ErrorFormato(`el aula virtual no ha contestado a ${metodo} (${codigo ?? 'sin código'})`);
      return (uno as { data?: unknown }).data;
    },
    async descargar(url, limite) {
      const cabeza = await req.head(url, { timeout: ESPERA }).catch(() => null);
      const nombre = nombreDeDescarga(cabeza?.url() ?? url, cabeza?.headers()['content-disposition']);
      if (cabeza && esPaginaDeEntrada(cabeza.url())) throw new SesionCaducada();
      if (Number(cabeza?.headers()['content-length'] ?? 0) > limite) return { demasiadoGrande: true, nombre };
      const r = await req.get(url, { timeout: 5 * ESPERA });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      if (!r.ok()) throw new ErrorFormato(`el aula virtual contestó ${r.status()} al descargar`);
      const bytes = new Uint8Array(await r.body());
      if (bytes.length > limite) return { demasiadoGrande: true, nombre };
      return { bytes, nombre: nombreDeDescarga(r.url(), r.headers()['content-disposition']), tipo: r.headers()['content-type'] };
    },
    cerrar: () => ctx.close(),
  };
}

// Abre una ventana en la página de entrada y espera a que Diego esté dentro (o cierre la ventana).
export async function entrar(perfil: string, esperaMaxima = 10 * 60_000): Promise<boolean> {
  const ctx = await lanzar(perfil, true);
  try {
    const pagina = ctx.pages()[0] ?? (await ctx.newPage());
    await pagina.goto(ENTRADA);
    const limite = Date.now() + esperaMaxima;
    while (Date.now() < limite) {
      if (pagina.isClosed()) return false;
      const url = pagina.url();
      if (url.startsWith(BASE_AULA) && !esPaginaDeEntrada(url)) {
        const r = await ctx.request.get(`${BASE_AULA}/my/`);
        if (!esPaginaDeEntrada(r.url())) return true;
      }
      await pagina.waitForTimeout(1000).catch(() => undefined);
    }
    return false;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
```

`local/aula/navegador.test.ts` (solo lo que no necesita navegador):
```ts
import { describe, expect, it } from 'vitest';
import { nombreDeDescarga } from './navegador.ts';

describe('nombreDeDescarga', () => {
  it('usa Content-Disposition (también en UTF-8) y si no, el final de la URL', () => {
    expect(nombreDeDescarga('https://x/a.pdf', "attachment; filename*=UTF-8''Tema%201%20l%C3%ADmites.pdf")).toBe('Tema 1 límites.pdf');
    expect(nombreDeDescarga('https://x/a.pdf', 'inline; filename="apuntes.pdf"')).toBe('apuntes.pdf');
    expect(nombreDeDescarga('https://x/pluginfile.php/1/mod_resource/content/2/Tema%202.pdf', undefined)).toBe('Tema 2.pdf');
  });
});
```
Run: `npx vitest run local/aula/navegador.test.ts` → PASS.

- [ ] **Step 5: Script de prueba**

`scripts/aula-prueba.ts`:
```ts
// Tarea 1 del plan del aula virtual: entrar (con ventana), comprobar la sesión y guardar páginas de ejemplo
// para las pruebas. Lo guardado se anonimiza A MANO antes de añadirlo a Git (nombres, correos, textos de avisos).
// Uso: node scripts/aula-prueba.ts <codigo de una asignatura, p. ej. 2327007> [--sin-entrar]
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { abrirNavegador, BASE_AULA, entrar } from '../local/aula/navegador.ts';
import { leerSesskey } from '../src/uni/aula/paginas.ts';

const perfil = path.join(os.homedir(), '.segundo-cerebro', 'navegador-aula');
const salida = path.join(os.tmpdir(), 'aula-prueba');
const codigo = process.argv[2];
if (!codigo) throw new Error('Falta el código de una asignatura');

if (!process.argv.includes('--sin-entrar')) {
  console.log('Se abre una ventana: entra al aula virtual y marca «No solicitar de nuevo el doble factor».');
  console.log(await entrar(perfil) ? 'Dentro.' : 'No se ha podido entrar.');
}
const nav = await abrirNavegador(perfil);
try {
  console.log('¿Sesión válida sin ventana?', await nav.sesionValida());
  const sesskey = leerSesskey(await nav.pedirTexto(`${BASE_AULA}/my/`));
  await mkdir(salida, { recursive: true });
  const cursos = await nav.ajax(sesskey, 'core_course_get_enrolled_courses_by_timeline_classification',
    { offset: 0, limit: 0, classification: 'all', sort: 'fullname' });
  await writeFile(path.join(salida, 'cursos.json'), JSON.stringify(cursos, null, 2));
  const curso = (cursos as { courses: { id: number; shortname: string }[] }).courses.find((c) => c.shortname.includes(codigo));
  if (!curso) throw new Error('No encuentro el curso con ese código');
  const estado = await nav.ajax(sesskey, 'core_courseformat_get_state', { courseid: curso.id });
  await writeFile(path.join(salida, 'estado-curso.json'), typeof estado === 'string' ? estado : JSON.stringify(estado));
  await writeFile(path.join(salida, 'curso.html'), await nav.pedirTexto(`${BASE_AULA}/course/view.php?id=${curso.id}`));
  console.log(`Guardado en ${salida}. Ahora: buscar el foro de avisos, un hilo, una carpeta y la guía docente en estado-curso.json`);
  console.log('y pedirlos con: node scripts/aula-prueba.ts', codigo, '--sin-entrar (o a mano con pedirTexto).');
} finally {
  await nav.cerrar();
}
```

- [ ] **Step 6: Con Diego: entrar y guardar**

Run (en la terminal de Diego, que verá la ventana): `export PATH="$PATH:/c/Program Files/nodejs"; node scripts/aula-prueba.ts 2327007`

Explicar a Diego antes: se abre una ventana de Chrome que no es su Chrome; entra como siempre y marca «No solicitar de nuevo el doble factor en este dispositivo». Nunca pega la contraseña en el chat.

Después, con `pedirTexto` (añadiendo líneas temporales al script o con un `node -e` que importe `abrirNavegador`), guardar en la misma carpeta:
- `foro.html`: `mod/forum/view.php?id=<cm del foro de avisos>`
- `hilo.html`: `mod/forum/discuss.php?d=<un hilo>`
- `carpeta.html`: `mod/folder/view.php?id=<cm de una carpeta>` (si la asignatura tiene alguna)
- dónde está la guía docente (un `resource` o un `url` del curso, o una web pública de la URJC) → apuntarlo.

Expected: `¿Sesión válida sin ventana? true` y los archivos en `%TEMP%\aula-prueba\`. **Si el AJAX `core_courseformat_get_state` falla** (no permitido para alumnos): Ruling, y en la Task 2 se lee `curso.html` en su lugar (secciones `li.section[data-sectionid]`, actividades `li.activity[data-id]` con `.activityname`/`.instancename` y la clase `modtype_<tipo>`), manteniendo la misma interfaz `leerContenido(...)`.

- [ ] **Step 7: Anonimizar y guardar como pruebas**

Copiar a `src/uni/aula/pruebas/` **recortando** (solo lo que lee la Task 2) y sustituyendo: nombres de personas → `Profesora Ejemplo`, correos → `profe@example.com`, textos de avisos → textos inventados, ids de usuario → `1`. Borrar `sesskey`, tokens y cualquier cookie. Revisar con `grep -i -E "sesskey|@urjc|@alumnos" src/uni/aula/pruebas/*` → sin resultados.

Escribir `src/uni/aula/pruebas/NOTAS.md`: qué método AJAX funciona, campos reales de `estado-curso.json` (`section[].title`, `cm[].module`…), cómo se llama el foro de avisos, dónde está la guía docente y cualquier sorpresa.

- [ ] **Step 8: ¿Cuánto dura la sesión?**

Al día siguiente (o en la siguiente sesión con Diego), sin volver a entrar: `node scripts/aula-prueba.ts 2327007 --sin-entrar`. Apuntar en el registro si `¿Sesión válida sin ventana?` sigue en `true`. Si dura menos de un día, **parar y hablarlo con Diego** antes de la Task 9 (spec §13). Las Tasks 2-8 no dependen de esto y pueden seguir.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json local/aula/navegador.ts local/aula/navegador.test.ts scripts/aula-prueba.ts src/uni/aula/paginas.ts src/uni/aula/paginas.test.ts src/uni/aula/pruebas
git commit -m "Aula virtual: navegador propio y páginas de ejemplo"
```

---

### Task 2: Leer las páginas del aula virtual

**Files:**
- Modify: `src/uni/aula/paginas.ts`, `src/uni/aula/paginas.test.ts`

**Interfaces:**
- Consumes: `ErrorFormato` (`src/uni/tipos.ts`), páginas de `src/uni/aula/pruebas/`.
- Produces:
  ```ts
  export interface CursoAula { id: number; nombreCorto: string; nombre: string }
  export function leerCursos(datos: unknown): CursoAula[];
  export function cursoDeAsignatura(cursos: CursoAula[], codigo: string): CursoAula | undefined;
  export interface ModuloAula { id: string; nombre: string; tipo: string; url?: string; seccion: string }
  export interface SeccionAula { id: string; nombre: string; modulos: ModuloAula[] }
  export interface ContenidoCurso { secciones: SeccionAula[] }
  export function leerContenido(datos: unknown): ContenidoCurso;   // lanza ErrorFormato si no hay secciones
  export interface HiloForo { id: string; titulo: string }
  export function leerForo(html: string): HiloForo[];
  export interface MensajeForo { id: string; titulo: string; texto: string; fecha: ISODate }
  export function leerHilo(html: string, hilo: HiloForo): MensajeForo;
  export function leerCarpeta(html: string): { nombre: string; url: string }[];
  export function foroDeAvisos(c: ContenidoCurso): ModuloAula | undefined;
  export function moduloGuia(c: ContenidoCurso): ModuloAula | undefined;      // resource, url o label llamado «Guía docente»
  export function enlaceGuia(htmlCurso: string, idModulo: string): string | undefined; // primer enlace pluginfile dentro de #module-<id>
  ```

**Lo que encontró la Task 1 (ver `src/uni/aula/pruebas/NOTAS.md`):** los selectores de abajo coinciden con las páginas reales. En las 10 asignaturas la guía docente es una **etiqueta** (`module: 'label'`) llamada «Guía docente» cuyo PDF está enlazado en la página del curso (`course/view.php?id=<curso>`) dentro de `#module-<id>`; por eso `moduloGuia` también acepta `label` y hay `enlaceGuia`. `modname` viene traducido («Etiqueta»): se usa `module`. Las páginas reales anonimizadas están en `src/uni/aula/pruebas/` (`cursos.json`, `estado-curso.json`, `curso-guia.html`, `foro.html`, `hilo.html`, `carpeta.html`).

- [ ] **Step 1: Pruebas que fallan**

Añadir a `src/uni/aula/paginas.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { cursoDeAsignatura, foroDeAvisos, leerCarpeta, leerContenido, leerCursos, leerForo, leerHilo, moduloGuia } from './paginas.ts';

const cursos = { courses: [
  { id: 159508, shortname: '2026-27_2327004_159508_186565', fullname: 'Fundamentos de la Programación' },
  { id: 1, shortname: 'RAC_EMP_FUENLABRADA', fullname: 'RAC' },
], nextoffset: 2 };

const estado = JSON.stringify({
  section: [
    { id: '10', number: 0, title: 'General', cmlist: ['100', '101', '102'] },
    { id: '11', number: 1, title: 'Tema 1. Límites', cmlist: ['103', '104'] },
  ],
  cm: [
    { id: '100', name: 'Avisos', module: 'forum', sectionid: '10', url: 'https://x/mod/forum/view.php?id=100' },
    { id: '101', name: 'Guía docente', module: 'resource', sectionid: '10', url: 'https://x/mod/resource/view.php?id=101' },
    { id: '102', name: 'Foro de dudas', module: 'forum', sectionid: '10', url: 'https://x/mod/forum/view.php?id=102' },
    { id: '103', name: 'Apuntes tema 1', module: 'resource', sectionid: '11', url: 'https://x/mod/resource/view.php?id=103' },
    { id: '104', name: 'Bienvenida', module: 'label', sectionid: '11' },
  ],
});

describe('cursos', () => {
  it('lee los cursos y encuentra el de una asignatura por su código', () => {
    const l = leerCursos(cursos);
    expect(l[0]).toEqual({ id: 159508, nombreCorto: '2026-27_2327004_159508_186565', nombre: 'Fundamentos de la Programación' });
    expect(cursoDeAsignatura(l, '2327004')?.id).toBe(159508);
    expect(cursoDeAsignatura(l, '2327009')).toBeUndefined();
  });
  it('algo que no es una lista de cursos es un error de formato', () => {
    expect(() => leerCursos({ nada: 1 })).toThrow(/cursos/);
  });
});

describe('contenido del curso', () => {
  it('secciones con sus módulos en orden (vale el JSON como texto o como objeto)', () => {
    const c = leerContenido(estado);
    expect(c.secciones.map((s) => s.nombre)).toEqual(['General', 'Tema 1. Límites']);
    expect(c.secciones[1].modulos[0]).toEqual({ id: '103', nombre: 'Apuntes tema 1', tipo: 'resource', url: 'https://x/mod/resource/view.php?id=103', seccion: 'Tema 1. Límites' });
    expect(leerContenido(JSON.parse(estado)).secciones).toHaveLength(2);
  });
  it('un curso sin secciones es un error de formato (nunca se borra nada por no entender la página)', () => {
    expect(() => leerContenido(JSON.stringify({ section: [], cm: [] }))).toThrow(/secciones/);
    expect(() => leerContenido('no es json')).toThrow();
  });
  it('encuentra el foro de avisos y la guía docente', () => {
    const c = leerContenido(estado);
    expect(foroDeAvisos(c)?.id).toBe('100');
    expect(moduloGuia(c)?.id).toBe('101');
  });
  it('sin un foro con nombre de avisos, el primer foro de la primera sección', () => {
    const otro = JSON.parse(estado);
    otro.cm[0].name = 'Foro general';
    expect(foroDeAvisos(leerContenido(otro))?.id).toBe('100');
  });
});

const foro = `<table><tr class="discussion" data-discussionid="555"><th><a href="https://x/mod/forum/discuss.php?d=555" title="Cambio de aula del parcial">Cambio de aula del parcial</a></th></tr>
<tr class="discussion" data-discussionid="556"><th><a href="https://x/mod/forum/discuss.php?d=556">Diapositivas del tema 2</a></th></tr></table>`;
const hilo = `<article id="p9001" data-post-id="9001"><h3 data-region-content="forum-post-core-subject">Cambio de aula del parcial</h3>
<time datetime="2026-10-03T10:12:00+02:00">viernes</time><div class="post-content-container"><p>El parcial del <b>jueves 13</b> será en el aula 204.</p><p>Un saludo.</p></div></article>
<article data-post-id="9002"><div class="post-content-container">Respuesta</div></article>`;
const carpeta = `<div class="foldertree"><a href="https://x/pluginfile.php/1/mod_folder/content/0/Hoja%201.pdf?forcedownload=1"><span class="fp-filename">Hoja 1.pdf</span></a>
<a href="https://x/pluginfile.php/1/mod_folder/content/0/Hoja%202.pdf?forcedownload=1"><span class="fp-filename">Hoja 2.pdf</span></a></div>`;

describe('foro', () => {
  it('lee los hilos sin repetir', () => {
    expect(leerForo(foro)).toEqual([{ id: '555', titulo: 'Cambio de aula del parcial' }, { id: '556', titulo: 'Diapositivas del tema 2' }]);
  });
  it('lee el primer mensaje de un hilo como texto con su fecha de Madrid', () => {
    expect(leerHilo(hilo, { id: '555', titulo: 'X' })).toEqual({
      id: '555', titulo: 'Cambio de aula del parcial', fecha: '2026-10-03',
      texto: 'El parcial del jueves 13 será en el aula 204.\nUn saludo.',
    });
  });
  it('lee los archivos de una carpeta', () => {
    expect(leerCarpeta(carpeta)).toEqual([
      { nombre: 'Hoja 1.pdf', url: 'https://x/pluginfile.php/1/mod_folder/content/0/Hoja%201.pdf?forcedownload=1' },
      { nombre: 'Hoja 2.pdf', url: 'https://x/pluginfile.php/1/mod_folder/content/0/Hoja%202.pdf?forcedownload=1' },
    ]);
  });
});

describe('páginas reales anonimizadas (Tarea 1)', () => {
  const leer = (n: string) => readFileSync(new URL(`./pruebas/${n}`, import.meta.url), 'utf8');
  it('cursos: encuentra Cálculo por su código', () => {
    expect(cursoDeAsignatura(leerCursos(JSON.parse(leer('cursos.json'))), '2327007')?.id).toBe(250589);
  });
  it('el curso real: 16 secciones, foro «Novedades» y guía docente como etiqueta con su PDF', () => {
    const c = leerContenido(leer('estado-curso.json'));
    expect(c.secciones).toHaveLength(16);
    expect(c.secciones[0].nombre).toBe('General');
    expect(foroDeAvisos(c)).toMatchObject({ id: '11070612', nombre: 'Novedades', tipo: 'forum' });
    const guia = moduloGuia(c);
    expect(guia).toMatchObject({ id: '11070615', tipo: 'label' });
    expect(enlaceGuia(leer('curso-guia.html'), guia!.id)).toBe('https://www.aulavirtual.urjc.es/moodle/pluginfile.php/14842895/mod_label/intro/GuiaDocente_EJEMPLO.pdf');
    expect(enlaceGuia(leer('curso-guia.html'), '999')).toBeUndefined();
  });
  it('el foro y el hilo reales se entienden', () => {
    const hilos = leerForo(leer('foro.html'));
    expect(hilos).toEqual([{ id: '956500', titulo: 'Aviso de ejemplo 1' }, { id: '952081', titulo: 'Aviso de ejemplo 2' }]);
    const m = leerHilo(leer('hilo.html'), hilos[0]);
    expect(m.titulo).toBe('Aviso de ejemplo 1');
    expect(m.texto).toBe('Buenos días:\nEl primer parcial será el jueves 12 de noviembre a las 10:00 en el aula 204.\nUn saludo.');
    expect(m.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('la carpeta real: tres archivos', () => {
    expect(leerCarpeta(leer('carpeta.html')).map((f) => f.nombre)).toEqual(['Archivo 1.pdf', 'Archivo 2.pdf', 'Archivo 3.pdf']);
  });
});
```
Añadir `enlaceGuia` al `import` de la prueba.

Run: `npx vitest run src/uni/aula/paginas.test.ts` → FAIL.

- [ ] **Step 2: Implementación**

Añadir a `src/uni/aula/paginas.ts`:
```ts
import { parse, type HTMLElement } from 'node-html-parser';
import type { ISODate } from '../../fechas.ts';
import { enMadrid } from '../hora.ts';

export interface CursoAula { id: number; nombreCorto: string; nombre: string }

export function leerCursos(datos: unknown): CursoAula[] {
  const lista = (datos as { courses?: unknown } | null)?.courses;
  if (!Array.isArray(lista)) throw new ErrorFormato('el aula virtual no ha devuelto la lista de cursos');
  return lista.map((c: { id?: unknown; shortname?: unknown; fullname?: unknown }) => ({
    id: Number(c.id), nombreCorto: String(c.shortname ?? ''), nombre: String(c.fullname ?? ''),
  }));
}

// El nombre corto es como «2026-27_2327004_159508_186565»: se busca un trozo que sea el código.
export function cursoDeAsignatura(cursos: CursoAula[], codigo: string): CursoAula | undefined {
  return cursos.find((c) => c.nombreCorto.split(/\D+/).includes(codigo));
}

export interface ModuloAula { id: string; nombre: string; tipo: string; url?: string; seccion: string }
export interface SeccionAula { id: string; nombre: string; modulos: ModuloAula[] }
export interface ContenidoCurso { secciones: SeccionAula[] }

// Respuesta de core_courseformat_get_state: un JSON (a veces como texto) con `section` y `cm`.
export function leerContenido(datos: unknown): ContenidoCurso {
  let j: unknown = datos;
  if (typeof datos === 'string') {
    try {
      j = JSON.parse(datos);
    } catch {
      throw new ErrorFormato('el contenido del curso no es JSON');
    }
  }
  const o = (j ?? {}) as { section?: unknown; cm?: unknown };
  if (!Array.isArray(o.section) || !Array.isArray(o.cm) || o.section.length === 0)
    throw new ErrorFormato('no encuentro las secciones del curso');
  const modulos = new Map<string, { id?: unknown; name?: unknown; module?: unknown; modname?: unknown; url?: unknown }>();
  for (const m of o.cm as { id?: unknown }[]) modulos.set(String(m.id), m as never);
  const secciones = (o.section as { id?: unknown; title?: unknown; name?: unknown; cmlist?: unknown }[]).map((s) => {
    const nombre = String(s.title ?? s.name ?? '').trim();
    const ids = Array.isArray(s.cmlist) ? s.cmlist.map(String) : [];
    return {
      id: String(s.id),
      nombre,
      modulos: ids.flatMap((id) => {
        const m = modulos.get(id);
        if (!m) return [];
        const url = typeof m.url === 'string' && m.url ? m.url : undefined;
        return [{ id, nombre: String(m.name ?? '').trim(), tipo: String(m.module ?? m.modname ?? ''), ...(url ? { url } : {}), seccion: nombre }];
      }),
    };
  });
  return { secciones };
}

const AVISOS = /aviso|novedad|anuncio|tabl[oó]n|news|announcement/i;
export function foroDeAvisos(c: ContenidoCurso): ModuloAula | undefined {
  const foros = c.secciones.flatMap((s) => s.modulos).filter((m) => m.tipo === 'forum');
  return foros.find((m) => AVISOS.test(m.nombre)) ?? c.secciones[0]?.modulos.find((m) => m.tipo === 'forum');
}

const GUIA = /gu[ií]a\s+(docente|de\s+(la\s+)?asignatura|del\s+estudiante)|teaching\s+guide|course\s+guide/i;
export function moduloGuia(c: ContenidoCurso): ModuloAula | undefined {
  return c.secciones.flatMap((s) => s.modulos).find((m) => ['resource', 'url', 'label'].includes(m.tipo) && GUIA.test(m.nombre));
}

// La guía docente suele ser una etiqueta con el PDF enlazado: se busca en la página del curso.
export function enlaceGuia(htmlCurso: string, idModulo: string): string | undefined {
  return parse(htmlCurso).querySelector(`#module-${idModulo}`)?.querySelector('a[href*="pluginfile.php"]')?.getAttribute('href') ?? undefined;
}

export interface HiloForo { id: string; titulo: string }

export function leerForo(html: string): HiloForo[] {
  const vistos = new Map<string, string>();
  for (const a of parse(html).querySelectorAll('a[href*="discuss.php?d="]')) {
    const id = /discuss\.php\?d=(\d+)/.exec(a.getAttribute('href') ?? '')?.[1];
    const titulo = (a.getAttribute('title') ?? a.text).trim();
    if (id && titulo && !vistos.has(id)) vistos.set(id, titulo);
  }
  return [...vistos].map(([id, titulo]) => ({ id, titulo }));
}

export interface MensajeForo { id: string; titulo: string; texto: string; fecha: ISODate }

// Texto plano de un trozo de HTML: un salto de línea por párrafo, sin espacios de sobra.
export function textoDeElemento(e: HTMLElement): string {
  for (const b of e.querySelectorAll('br')) b.replaceWith('\n');
  for (const p of e.querySelectorAll('p, div, li, h1, h2, h3, h4, tr')) p.insertAdjacentHTML('afterend', '\n');
  return e.text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

export function leerHilo(html: string, hilo: HiloForo): MensajeForo {
  const raiz = parse(html);
  const primero = raiz.querySelector('article[data-post-id]') ?? raiz;
  const contenido = primero.querySelector('.post-content-container');
  if (!contenido) throw new ErrorFormato(`no encuentro el texto del aviso ${hilo.id}`);
  const asunto = primero.querySelector('[data-region-content="forum-post-core-subject"]')?.text.trim();
  const cuando = primero.querySelector('time[datetime]')?.getAttribute('datetime');
  const instante = cuando ? new Date(cuando) : null;
  if (!instante || Number.isNaN(instante.getTime())) throw new ErrorFormato(`no encuentro la fecha del aviso ${hilo.id}`);
  return { id: hilo.id, titulo: asunto || hilo.titulo, texto: textoDeElemento(contenido), fecha: enMadrid(instante).fecha };
}

export function leerCarpeta(html: string): { nombre: string; url: string }[] {
  const r = new Map<string, string>();
  for (const a of parse(html).querySelectorAll('a[href*="pluginfile.php"]')) {
    const url = a.getAttribute('href') ?? '';
    const nombre = (a.querySelector('.fp-filename')?.text ?? a.text).trim();
    if (url && nombre && !r.has(url)) r.set(url, nombre);
  }
  return [...r].map(([url, nombre]) => ({ nombre, url }));
}
```
Nota: `parse` decodifica las entidades en `.text`. Si el test de `leerHilo` deja un salto de más o de menos, ajustar `textoDeElemento` (no el test).

Run: `npx vitest run src/uni/aula/paginas.test.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/uni/aula/paginas.ts src/uni/aula/paginas.test.ts
git commit -m "Aula virtual: leer cursos, temas, foro de avisos y carpetas"
```

---

### Task 3: Formatos de datos nuevos (avisos, materiales, guía, sincronización)

**Files:**
- Modify: `src/datos/rutas.ts`, `src/uni/vistos.ts`
- Create: `src/datos/avisos.ts`, `src/datos/avisos.test.ts`, `src/datos/aulaVirtual.ts`, `src/datos/aulaVirtual.test.ts`, `src/datos/guia.ts`, `src/datos/guia.test.ts`, `src/uni/aula/estado.ts`, `src/uni/aula/estado.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // rutas.ts
  export const RUTA_AVISOS = 'estudios/avisos.yaml';
  export const RUTA_AULA_SINCRONIZACION = 'estudios/aula-sincronizacion.yaml';
  export const rutaAulaVirtual = (id: string) => `estudios/${id}/aula-virtual.yaml`;
  export const rutaGuiaDocente = (id: string) => `estudios/${id}/guia-docente.md`;
  export const carpetaMateriales = (id: string) => `estudios/${id}/aula-virtual`;
  // avisos.ts
  export interface Aviso { id: string; asignatura?: string; fecha: ISODate; titulo: string; texto: string; importante: boolean; leido: boolean; enlace?: string }
  export function parseAvisos(texto: string | null): Aviso[];
  export function serializarAvisos(a: Aviso[]): string;
  export function marcarLeidos(avisos: Aviso[], ids: string[]): Aviso[];
  export function importantesSinLeer(avisos: Aviso[]): Aviso[];
  // aulaVirtual.ts
  export type TipoMaterial = 'pdf' | 'presentacion' | 'documento' | 'carpeta' | 'enlace' | 'video' | 'otro';
  export interface Material { id: string; nombre: string; tipo: TipoMaterial; enlace: string; archivo?: string; retirado?: boolean }
  export interface SeccionMateriales { nombre: string; materiales: Material[] }
  export interface AulaVirtual { actualizado: ISODate; secciones: SeccionMateriales[] }
  export function parseAulaVirtual(texto: string | null, ruta: string): AulaVirtual | null;
  export function serializarAulaVirtual(a: AulaVirtual): string;
  // guia.ts
  export function escribirGuia(nombreAsignatura: string, evaluacion: string, texto: string): string;
  export function seccionEvaluacion(md: string | null): string | null;
  // vistos.ts (cambio)
  export interface Visto { fecha: ISODate; hora?: string; notas?: string; titulo?: string }
  export function leerVisto(origen: string, bruto: unknown, archivo: string): Visto;
  // estado.ts
  export type ResultadoRevision = 'ok' | 'necesita-entrar' | 'error';
  export interface EstadoAula { ultimaRevision?: string; resultado?: ResultadoRevision; mensaje?: string }
  export interface Pendiente { asignatura: string; avisos: string[]; documentos: string[]; guia: boolean }
  export interface SincronizacionAula {
    estado: EstadoAula;
    vistos: { materiales: string[]; avisos: string[]; guias: Record<string, string>; fechas: Vistos };
    pendientes: Pendiente[];
  }
  export function parseSincronizacionAula(texto: string | null): SincronizacionAula;
  export function serializarSincronizacionAula(s: SincronizacionAula): string;
  ```
  Ruling (frente al spec §4): `vistos.materiales` es una lista de ids (no id → huella): se descarga solo lo nuevo; un PDF que el profe sustituye con el mismo id no se vuelve a bajar. Los ids de aviso son `moodle-hilo-<id del hilo>` (el hilo se identifica sin abrirlo).

- [ ] **Step 1: Pruebas que fallan**

`src/datos/avisos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { importantesSinLeer, marcarLeidos, parseAvisos, serializarAvisos, type Aviso } from './avisos.ts';

const a: Aviso = { id: 'moodle-hilo-555', asignatura: 'calculo', fecha: '2026-10-03', titulo: 'Cambio de aula', texto: 'Aula 204.\nUn saludo.', importante: true, leido: false, enlace: 'https://x/d=555' };
const b: Aviso = { id: 'programa-entrar', fecha: '2026-10-04', titulo: 'Vuelve a entrar en el aula virtual', texto: 'La URJC ha cerrado la sesión.', importante: true, leido: false };

describe('avisos.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseAvisos(serializarAvisos([a, b]))).toEqual([a, b]);
    expect(parseAvisos(null)).toEqual([]);
    expect(parseAvisos('')).toEqual([]);
  });
  it('errores claros', () => {
    expect(() => parseAvisos('avisos:\n  - id: x\n')).toThrow(/aviso 1/);
    expect(() => parseAvisos('avisos:\n  - id: x\n    fecha: hoy\n    titulo: t\n    texto: t\n')).toThrow(/fecha/);
  });
  it('marcar leídos y contar importantes sin leer', () => {
    expect(importantesSinLeer([a, b, { ...a, id: 'z', importante: false }])).toHaveLength(2);
    const r = marcarLeidos([a, b], ['programa-entrar', 'no-existe']);
    expect(r.map((x) => x.leido)).toEqual([false, true]);
  });
});
```

`src/datos/aulaVirtual.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseAulaVirtual, serializarAulaVirtual, type AulaVirtual } from './aulaVirtual.ts';

const RUTA = 'estudios/calculo/aula-virtual.yaml';
const lista: AulaVirtual = { actualizado: '2026-10-04', secciones: [
  { nombre: 'Tema 1. Límites', materiales: [
    { id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1. Limites/Apuntes tema 1.pdf' },
    { id: '104', nombre: 'Vídeo', tipo: 'video', enlace: 'https://x/104', retirado: true },
  ] },
] };

describe('aula-virtual.yaml', () => {
  it('ida y vuelta; sin archivo, null', () => {
    expect(parseAulaVirtual(serializarAulaVirtual(lista), RUTA)).toEqual(lista);
    expect(parseAulaVirtual(null, RUTA)).toBeNull();
  });
  it('tipo desconocido es un error', () => {
    expect(() => parseAulaVirtual('actualizado: 2026-10-04\nsecciones:\n  - nombre: T\n    materiales:\n      - id: "1"\n        nombre: x\n        tipo: raro\n        enlace: e\n', RUTA)).toThrow(/tipo/);
  });
});
```

`src/datos/guia.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { escribirGuia, seccionEvaluacion } from './guia.ts';

describe('guía docente', () => {
  it('escribe el resumen y el texto, y saca la evaluación', () => {
    const md = escribirGuia('Cálculo', '- Examen final: 60 %\n- Parciales: 40 %', 'Texto largo\n## Algo');
    expect(md.startsWith('# Guía docente: Cálculo\n\n## Evaluación\n\n- Examen final: 60 %')).toBe(true);
    expect(md).toContain('## Guía completa\n\nTexto largo');
    expect(seccionEvaluacion(md)).toBe('- Examen final: 60 %\n- Parciales: 40 %');
  });
  it('sin archivo o sin sección, null', () => {
    expect(seccionEvaluacion(null)).toBeNull();
    expect(seccionEvaluacion('# Otra cosa')).toBeNull();
  });
});
```

`src/uni/aula/estado.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseSincronizacionAula, serializarSincronizacionAula, type SincronizacionAula } from './estado.ts';

const s: SincronizacionAula = {
  estado: { ultimaRevision: '2026-10-04T09:12', resultado: 'ok', mensaje: '3 avisos nuevos' },
  vistos: {
    materiales: ['103', '104'], avisos: ['moodle-hilo-555'], guias: { calculo: 'abc123' },
    fechas: { 'aula:calculo:primer-parcial': { fecha: '2026-11-13', hora: '10:00', titulo: 'Primer parcial: Cálculo' } },
  },
  pendientes: [{ asignatura: 'calculo', avisos: ['moodle-hilo-556'], documentos: [], guia: false }],
};

describe('aula-sincronizacion.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseSincronizacionAula(serializarSincronizacionAula(s))).toEqual(s);
  });
  it('sin archivo: todo vacío', () => {
    expect(parseSincronizacionAula(null)).toEqual({ estado: {}, vistos: { materiales: [], avisos: [], guias: {}, fechas: {} }, pendientes: [] });
  });
  it('fecha mal escrita en vistos: error', () => {
    expect(() => parseSincronizacionAula('vistos:\n  fechas:\n    aula:x:y:\n      fecha: mañana\n')).toThrow(/fecha/);
  });
});
```
Run: `npx vitest run src/datos/avisos.test.ts src/datos/aulaVirtual.test.ts src/datos/guia.test.ts src/uni/aula/estado.test.ts` → FAIL.

- [ ] **Step 2: Implementación**

`src/datos/rutas.ts`, añadir al final:
```ts
export const RUTA_AVISOS = 'estudios/avisos.yaml';
export const RUTA_AULA_SINCRONIZACION = 'estudios/aula-sincronizacion.yaml';
export const rutaAulaVirtual = (id: string) => `estudios/${id}/aula-virtual.yaml`;
export const rutaGuiaDocente = (id: string) => `estudios/${id}/guia-docente.md`;
export const carpetaMateriales = (id: string) => `estudios/${id}/aula-virtual`;
```

`src/datos/avisos.ts`:
```ts
import { stringify } from 'yaml';
import { isISODate, type ISODate } from '../fechas.ts';
import { RUTA_AVISOS } from './rutas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

// Avisos de los profes (del foro de avisos del aula virtual) y del programa local (spec §4).
export interface Aviso {
  id: string;
  asignatura?: string;
  fecha: ISODate;
  titulo: string;
  texto: string;
  importante: boolean;
  leido: boolean;
  enlace?: string;
}

export function parseAvisos(texto: string | null): Aviso[] {
  if (texto === null) return [];
  const datos = leerYaml(texto, RUTA_AVISOS);
  if (datos === null || datos === undefined) return [];
  const lista = (datos as { avisos?: unknown }).avisos;
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErrorDatos(RUTA_AVISOS, 'avisos debe ser una lista');
  return lista.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    const donde = `aviso ${i + 1}`;
    if (typeof a.id !== 'string' || typeof a.titulo !== 'string' || typeof a.texto !== 'string')
      throw new ErrorDatos(RUTA_AVISOS, `${donde}: necesita id, titulo y texto`);
    if (!isISODate(a.fecha)) throw new ErrorDatos(RUTA_AVISOS, `${donde}: fecha debe tener el formato AAAA-MM-DD`);
    if (a.asignatura !== undefined && typeof a.asignatura !== 'string') throw new ErrorDatos(RUTA_AVISOS, `${donde}: asignatura debe ser texto`);
    if (a.enlace !== undefined && typeof a.enlace !== 'string') throw new ErrorDatos(RUTA_AVISOS, `${donde}: enlace debe ser texto`);
    return {
      id: a.id,
      ...(a.asignatura ? { asignatura: a.asignatura as string } : {}),
      fecha: a.fecha,
      titulo: a.titulo,
      texto: a.texto,
      importante: a.importante === true,
      leido: a.leido === true,
      ...(a.enlace ? { enlace: a.enlace as string } : {}),
    };
  });
}

export function serializarAvisos(avisos: Aviso[]): string {
  return stringify({ avisos }, { lineWidth: 0 });
}

export function marcarLeidos(avisos: Aviso[], ids: string[]): Aviso[] {
  const set = new Set(ids);
  return avisos.map((a) => (set.has(a.id) && !a.leido ? { ...a, leido: true } : a));
}

export function importantesSinLeer(avisos: Aviso[]): Aviso[] {
  return avisos.filter((a) => a.importante && !a.leido);
}
```

`src/datos/aulaVirtual.ts`:
```ts
import { stringify } from 'yaml';
import { isISODate, type ISODate } from '../fechas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

export const TIPOS_MATERIAL = ['pdf', 'presentacion', 'documento', 'carpeta', 'enlace', 'video', 'otro'] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];
export interface Material { id: string; nombre: string; tipo: TipoMaterial; enlace: string; archivo?: string; retirado?: boolean }
export interface SeccionMateriales { nombre: string; materiales: Material[] }
export interface AulaVirtual { actualizado: ISODate; secciones: SeccionMateriales[] }

export function parseAulaVirtual(texto: string | null, ruta: string): AulaVirtual | null {
  if (texto === null) return null;
  const d = leerYaml(texto, ruta) as { actualizado?: unknown; secciones?: unknown } | null;
  if (!d) return null;
  if (!isISODate(d.actualizado)) throw new ErrorDatos(ruta, 'actualizado debe tener el formato AAAA-MM-DD');
  if (!Array.isArray(d.secciones)) throw new ErrorDatos(ruta, 'secciones debe ser una lista');
  return {
    actualizado: d.actualizado,
    secciones: d.secciones.map((s: { nombre?: unknown; materiales?: unknown }, i: number) => {
      if (typeof s?.nombre !== 'string' || !Array.isArray(s.materiales)) throw new ErrorDatos(ruta, `sección ${i + 1}: necesita nombre y materiales`);
      return {
        nombre: s.nombre,
        materiales: s.materiales.map((m: Record<string, unknown>, j: number) => {
          const donde = `sección ${i + 1}, material ${j + 1}`;
          if (typeof m?.id !== 'string' || typeof m.nombre !== 'string' || typeof m.enlace !== 'string')
            throw new ErrorDatos(ruta, `${donde}: necesita id, nombre y enlace`);
          if (!(TIPOS_MATERIAL as readonly unknown[]).includes(m.tipo)) throw new ErrorDatos(ruta, `${donde}: tipo no válido`);
          return {
            id: m.id, nombre: m.nombre, tipo: m.tipo as TipoMaterial, enlace: m.enlace,
            ...(typeof m.archivo === 'string' ? { archivo: m.archivo } : {}),
            ...(m.retirado === true ? { retirado: true } : {}),
          };
        }),
      };
    }),
  };
}

export function serializarAulaVirtual(a: AulaVirtual): string {
  return stringify(a, { lineWidth: 0 });
}
```

`src/datos/guia.ts`:
```ts
// guia-docente.md: primero el resumen de la evaluación (lo escribe Claude) y después la guía entera.
export function escribirGuia(nombreAsignatura: string, evaluacion: string, texto: string): string {
  return `# Guía docente: ${nombreAsignatura}\n\n## Evaluación\n\n${evaluacion.trim()}\n\n## Guía completa\n\n${texto.trim()}\n`;
}

export function seccionEvaluacion(md: string | null): string | null {
  if (!md) return null;
  const m = /^## Evaluación\n([\s\S]*?)(?=^## Guía completa$|(?![\s\S]))/m.exec(md);
  const r = m?.[1].trim();
  return r ? r : null;
}
```

`src/uni/vistos.ts`: extraer la validación de un visto a una función exportada y añadir `titulo`:
```ts
export interface Visto {
  fecha: ISODate;
  hora?: string;
  notas?: string;
  titulo?: string; // solo en las tareas del aula virtual (para poner y quitar la marca ⚠)
}

export function leerVisto(origen: string, bruto: unknown, archivo: string): Visto {
  const v = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
  if (!isISODate(v.fecha)) throw new ErrorDatos(archivo, `${origen}: fecha debe tener el formato AAAA-MM-DD`);
  if (v.hora !== undefined && !isHora(v.hora)) throw new ErrorDatos(archivo, `${origen}: hora debe tener el formato "HH:MM"`);
  if (v.notas !== undefined && typeof v.notas !== 'string') throw new ErrorDatos(archivo, `${origen}: notas debe ser texto`);
  if (v.titulo !== undefined && typeof v.titulo !== 'string') throw new ErrorDatos(archivo, `${origen}: titulo debe ser texto`);
  return {
    fecha: v.fecha,
    ...(v.hora !== undefined ? { hora: v.hora as string } : {}),
    ...(v.notas !== undefined ? { notas: v.notas as string } : {}),
    ...(v.titulo !== undefined ? { titulo: v.titulo as string } : {}),
  };
}
```
y en `parseVistos` sustituir el cuerpo del bucle por `r[origen] = leerVisto(origen, bruto, RUTA_UNI_SINCRONIZACION);`.

`src/uni/aula/estado.ts`:
```ts
import { stringify } from 'yaml';
import { RUTA_AULA_SINCRONIZACION } from '../../datos/rutas.ts';
import { ErrorDatos, leerYaml } from '../../datos/yaml.ts';
import { leerVisto, type Vistos } from '../vistos.ts';

export type ResultadoRevision = 'ok' | 'necesita-entrar' | 'error';
export interface EstadoAula { ultimaRevision?: string; resultado?: ResultadoRevision; mensaje?: string }
// Lo que Claude no pudo leer (límite de uso, fallo): se vuelve a mandar en la siguiente revisión.
export interface Pendiente { asignatura: string; avisos: string[]; documentos: string[]; guia: boolean }
export interface SincronizacionAula {
  estado: EstadoAula;
  vistos: { materiales: string[]; avisos: string[]; guias: Record<string, string>; fechas: Vistos };
  pendientes: Pendiente[];
}

const R = RUTA_AULA_SINCRONIZACION;
const textos = (x: unknown, que: string): string[] => {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x) || !x.every((y) => typeof y === 'string')) throw new ErrorDatos(R, `${que} debe ser una lista de textos`);
  return x;
};

export function parseSincronizacionAula(texto: string | null): SincronizacionAula {
  const d = (texto === null ? null : leerYaml(texto, R)) as Record<string, unknown> | null;
  const e = (d?.estado ?? {}) as Record<string, unknown>;
  const v = (d?.vistos ?? {}) as Record<string, unknown>;
  const fechas: Vistos = {};
  for (const [origen, bruto] of Object.entries((v.fechas ?? {}) as Record<string, unknown>)) fechas[origen] = leerVisto(origen, bruto, R);
  const guias: Record<string, string> = {};
  for (const [k, h] of Object.entries((v.guias ?? {}) as Record<string, unknown>)) if (typeof h === 'string') guias[k] = h;
  const pend = d?.pendientes ?? [];
  if (!Array.isArray(pend)) throw new ErrorDatos(R, 'pendientes debe ser una lista');
  return {
    estado: {
      ...(typeof e.ultimaRevision === 'string' ? { ultimaRevision: e.ultimaRevision } : {}),
      ...(e.resultado === 'ok' || e.resultado === 'necesita-entrar' || e.resultado === 'error' ? { resultado: e.resultado } : {}),
      ...(typeof e.mensaje === 'string' ? { mensaje: e.mensaje } : {}),
    },
    vistos: { materiales: textos(v.materiales, 'vistos.materiales'), avisos: textos(v.avisos, 'vistos.avisos'), guias, fechas },
    pendientes: pend.map((p: Record<string, unknown>) => ({
      asignatura: String(p?.asignatura ?? ''), avisos: textos(p?.avisos, 'pendientes.avisos'),
      documentos: textos(p?.documentos, 'pendientes.documentos'), guia: p?.guia === true,
    })),
  };
}

export function serializarSincronizacionAula(s: SincronizacionAula): string {
  return stringify(s, { lineWidth: 0 });
}
```
Run las cuatro pruebas y `npx vitest run src/uni` (la parte A sigue en verde) → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/datos src/uni/vistos.ts src/uni/aula/estado.ts src/uni/aula/estado.test.ts
git commit -m "Aula virtual: formatos de avisos, materiales, guía y sincronización"
```

---

### Task 4: Avisos del programa (añadir, limpiar, avisos propios)

**Files:**
- Create: `src/uni/aula/avisos.ts`, `src/uni/aula/avisos.test.ts`

**Interfaces:**
- Consumes: `Aviso` (Task 3), `addDays` (`src/fechas.ts`).
- Produces:
  ```ts
  export const ID_ENTRAR = 'programa-entrar';
  export const DIAS_LEIDOS = 60;
  export function anadirAvisos(actuales: Aviso[], nuevos: Aviso[]): Aviso[];      // por id, sin tocar `leido` de los que ya están; los nuevos arriba
  export function limpiarAvisos(avisos: Aviso[], hoy: ISODate): Aviso[];          // quita leídos de hace > 60 días
  export function quitarAviso(avisos: Aviso[], id: string): Aviso[];
  export function avisoPrograma(avisos: Aviso[], hoy: ISODate, titulo: string, texto: string, asignatura?: string): Aviso; // id programa-<hoy>-<n>
  export function avisoEntrar(hoy: ISODate): Aviso;
  ```

- [ ] **Step 1: Prueba que falla**

`src/uni/aula/avisos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Aviso } from '../../datos/avisos.ts';
import { anadirAvisos, avisoEntrar, avisoPrograma, ID_ENTRAR, limpiarAvisos, quitarAviso } from './avisos.ts';

const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, fecha: '2026-10-01', titulo: id, texto: 't', importante: false, leido: false, ...x });

describe('avisos del programa', () => {
  it('añade los nuevos arriba sin duplicar y sin tocar si Diego ya lo leyó', () => {
    const r = anadirAvisos([av('a', { leido: true })], [av('a', { titulo: 'otro' }), av('b')]);
    expect(r.map((x) => x.id)).toEqual(['b', 'a']);
    expect(r[1]).toEqual(av('a', { leido: true }));
  });
  it('quita los leídos de hace más de 60 días, nunca los no leídos', () => {
    const r = limpiarAvisos([av('viejo', { fecha: '2026-08-01', leido: true }), av('viejo-sin-leer', { fecha: '2026-08-01' }), av('reciente', { fecha: '2026-08-10', leido: true })], '2026-10-09');
    expect(r.map((x) => x.id)).toEqual(['viejo-sin-leer', 'reciente']);
  });
  it('avisos propios: importantes, sin leer, con id del día sin repetir', () => {
    const uno = avisoPrograma([], '2026-10-04', 'Fecha por confirmar', 'Texto', 'calculo');
    expect(uno).toEqual({ id: 'programa-2026-10-04-1', asignatura: 'calculo', fecha: '2026-10-04', titulo: 'Fecha por confirmar', texto: 'Texto', importante: true, leido: false });
    expect(avisoPrograma([uno], '2026-10-04', 'X', 'Y').id).toBe('programa-2026-10-04-2');
  });
  it('el de volver a entrar tiene id fijo y se puede quitar', () => {
    expect(avisoEntrar('2026-10-04').id).toBe(ID_ENTRAR);
    expect(quitarAviso([avisoEntrar('2026-10-04'), av('b')], ID_ENTRAR).map((x) => x.id)).toEqual(['b']);
  });
});
```
Run: `npx vitest run src/uni/aula/avisos.test.ts` → FAIL.

- [ ] **Step 2: Implementación**

`src/uni/aula/avisos.ts`:
```ts
import type { Aviso } from '../../datos/avisos.ts';
import { addDays, type ISODate } from '../../fechas.ts';

export const ID_ENTRAR = 'programa-entrar';
export const DIAS_LEIDOS = 60;

export function anadirAvisos(actuales: Aviso[], nuevos: Aviso[]): Aviso[] {
  const ids = new Set(actuales.map((a) => a.id));
  const deVerdad = nuevos.filter((n) => !ids.has(n.id) && (ids.add(n.id), true));
  return [...deVerdad, ...actuales];
}

export function limpiarAvisos(avisos: Aviso[], hoy: ISODate): Aviso[] {
  const limite = addDays(hoy, -DIAS_LEIDOS);
  return avisos.filter((a) => !(a.leido && a.fecha < limite));
}

export function quitarAviso(avisos: Aviso[], id: string): Aviso[] {
  return avisos.filter((a) => a.id !== id);
}

export function avisoPrograma(avisos: Aviso[], hoy: ISODate, titulo: string, texto: string, asignatura?: string): Aviso {
  const prefijo = `programa-${hoy}-`;
  const usados = avisos.filter((a) => a.id.startsWith(prefijo)).map((a) => Number(a.id.slice(prefijo.length)) || 0);
  const n = Math.max(0, ...usados) + 1;
  return { id: `${prefijo}${n}`, ...(asignatura ? { asignatura } : {}), fecha: hoy, titulo, texto, importante: true, leido: false };
}

export function avisoEntrar(hoy: ISODate): Aviso {
  return {
    id: ID_ENTRAR, fecha: hoy, titulo: 'Vuelve a entrar en el aula virtual', importante: true, leido: false,
    texto: 'La URJC ha cerrado la sesión del aula virtual. En el PC, ve a Ajustes → Aula virtual → «Entrar al aula virtual».',
  };
}
```
Comprobar en la prueba de `limpiarAvisos`: `addDays('2026-10-09', -60)` = `2026-08-10`; `2026-08-01 < 2026-08-10` se quita, `2026-08-10` se queda. Run → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/uni/aula/avisos.ts src/uni/aula/avisos.test.ts
git commit -m "Aula virtual: añadir y limpiar avisos, avisos propios del programa"
```

---

### Task 5: Materiales (qué descargar, nombres, lista por temas)

**Files:**
- Create: `src/uni/aula/materiales.ts`, `src/uni/aula/materiales.test.ts`

**Interfaces:**
- Consumes: `ContenidoCurso`, `ModuloAula` (Task 2); `AulaVirtual`, `Material`, `TipoMaterial` (Task 3).
- Produces:
  ```ts
  export const LIMITE_BYTES = 50 * 1024 * 1024;
  export const TIPOS_DE_MATERIAL = ['resource', 'folder', 'url', 'page'];
  export function esMaterial(m: ModuloAula): boolean;
  export function tipoDeArchivo(nombre: string): TipoMaterial;
  export function tipoDeModulo(m: ModuloAula): TipoMaterial;                    // antes de descargar
  export function nombreSeguro(nombre: string): string;
  export function esDocumentoDeFechas(nombre: string): boolean;
  export function nuevosMateriales(c: ContenidoCurso, vistos: Set<string>): ModuloAula[];
  export interface Descargado { archivo?: string; tipo?: TipoMaterial }   // archivo relativo a aula-virtual/
  export function construirLista(c: ContenidoCurso, anterior: AulaVirtual | null, descargados: Map<string, Descargado>, hoy: ISODate): AulaVirtual;
  ```

- [ ] **Step 1: Prueba que falla**

`src/uni/aula/materiales.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { AulaVirtual } from '../../datos/aulaVirtual.ts';
import type { ContenidoCurso } from './paginas.ts';
import { construirLista, esDocumentoDeFechas, esMaterial, nombreSeguro, nuevosMateriales, tipoDeArchivo } from './materiales.ts';

const c: ContenidoCurso = { secciones: [
  { id: '10', nombre: 'General', modulos: [
    { id: '100', nombre: 'Avisos', tipo: 'forum', seccion: 'General' },
    { id: '101', nombre: 'Guía docente', tipo: 'resource', url: 'https://x/101', seccion: 'General' },
  ] },
  { id: '11', nombre: 'Tema 1: Límites', modulos: [
    { id: '103', nombre: 'Apuntes tema 1', tipo: 'resource', url: 'https://x/103', seccion: 'Tema 1: Límites' },
    { id: '105', nombre: 'Web de ejercicios', tipo: 'url', url: 'https://x/105', seccion: 'Tema 1: Límites' },
    { id: '106', nombre: 'Entrega 1', tipo: 'assign', url: 'https://x/106', seccion: 'Tema 1: Límites' },
  ] },
] };

describe('materiales', () => {
  it('solo recursos, carpetas, enlaces y páginas son materiales', () => {
    expect(c.secciones.flatMap((s) => s.modulos).filter(esMaterial).map((m) => m.id)).toEqual(['101', '103', '105']);
  });
  it('tipo por la extensión', () => {
    expect(tipoDeArchivo('a.PDF')).toBe('pdf');
    expect(tipoDeArchivo('b.pptx')).toBe('presentacion');
    expect(tipoDeArchivo('c.docx')).toBe('documento');
    expect(tipoDeArchivo('d.mp4')).toBe('video');
    expect(tipoDeArchivo('e.zip')).toBe('otro');
  });
  it('nombres de archivo seguros en Windows', () => {
    expect(nombreSeguro('Tema 1: Límites / parte "A"?')).toBe('Tema 1 Límites parte A');
    expect(nombreSeguro('..')).toBe('sin nombre');
    expect(nombreSeguro('x'.repeat(200)).length).toBe(100);
  });
  it('documentos cuyo nombre suena a fechas', () => {
    expect(esDocumentoDeFechas('Planificación de la asignatura.pdf')).toBe(true);
    expect(esDocumentoDeFechas('CRONOGRAMA 2026-27')).toBe(true);
    expect(esDocumentoDeFechas('Apuntes tema 1')).toBe(false);
  });
  it('nuevos: los materiales no vistos', () => {
    expect(nuevosMateriales(c, new Set(['101'])).map((m) => m.id)).toEqual(['103', '105']);
  });
  it('lista por temas con archivos; lo que desaparece se marca retirado y conserva su archivo', () => {
    const anterior: AulaVirtual = { actualizado: '2026-10-01', secciones: [
      { nombre: 'Tema 0', materiales: [{ id: '99', nombre: 'Viejo', tipo: 'pdf', enlace: 'https://x/99', archivo: 'Tema 0/Viejo.pdf' }] },
      { nombre: 'Tema 1: Límites', materiales: [{ id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1 Límites/Apuntes tema 1.pdf' }] },
    ] };
    const r = construirLista(c, anterior, new Map([['101', { archivo: 'General/guia.pdf', tipo: 'pdf' as const }]]), '2026-10-04');
    expect(r).toEqual({ actualizado: '2026-10-04', secciones: [
      { nombre: 'General', materiales: [{ id: '101', nombre: 'Guía docente', tipo: 'pdf', enlace: 'https://x/101', archivo: 'General/guia.pdf' }] },
      { nombre: 'Tema 1: Límites', materiales: [
        { id: '103', nombre: 'Apuntes tema 1', tipo: 'pdf', enlace: 'https://x/103', archivo: 'Tema 1 Límites/Apuntes tema 1.pdf' },
        { id: '105', nombre: 'Web de ejercicios', tipo: 'enlace', enlace: 'https://x/105' },
      ] },
      { nombre: 'Ya no está en el aula virtual', materiales: [{ id: '99', nombre: 'Viejo', tipo: 'pdf', enlace: 'https://x/99', archivo: 'Tema 0/Viejo.pdf', retirado: true }] },
    ] });
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implementación**

`src/uni/aula/materiales.ts`:
```ts
import type { AulaVirtual, Material, SeccionMateriales, TipoMaterial } from '../../datos/aulaVirtual.ts';
import type { ISODate } from '../../fechas.ts';
import type { ContenidoCurso, ModuloAula } from './paginas.ts';

export const LIMITE_BYTES = 50 * 1024 * 1024;
export const TIPOS_DE_MATERIAL = ['resource', 'folder', 'url', 'page'];
export const SECCION_RETIRADOS = 'Ya no está en el aula virtual';

export const esMaterial = (m: ModuloAula) => TIPOS_DE_MATERIAL.includes(m.tipo);

const EXTENSIONES: [RegExp, TipoMaterial][] = [
  [/\.pdf$/i, 'pdf'],
  [/\.(pptx?|odp|key)$/i, 'presentacion'],
  [/\.(docx?|odt|txt|md|rtf|xlsx?|ods|csv)$/i, 'documento'],
  [/\.(mp4|mov|avi|mkv|webm|m4v)$/i, 'video'],
];
export function tipoDeArchivo(nombre: string): TipoMaterial {
  return EXTENSIONES.find(([re]) => re.test(nombre))?.[1] ?? 'otro';
}

export function tipoDeModulo(m: ModuloAula): TipoMaterial {
  if (m.tipo === 'folder') return 'carpeta';
  if (m.tipo === 'url') return 'enlace';
  if (m.tipo === 'page') return 'documento';
  return tipoDeArchivo(m.nombre);
}

export function nombreSeguro(nombre: string): string {
  const limpio = nombre.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').trim();
  return (limpio || 'sin nombre').slice(0, 100);
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const FECHAS = /calendario|planificacion|cronograma|evaluacion|parcial|examen|practica|entrega|fechas/;
export const esDocumentoDeFechas = (nombre: string) => FECHAS.test(sinTildes(nombre));

export function nuevosMateriales(c: ContenidoCurso, vistos: Set<string>): ModuloAula[] {
  return c.secciones.flatMap((s) => s.modulos).filter((m) => esMaterial(m) && !vistos.has(m.id));
}

export interface Descargado { archivo?: string; tipo?: TipoMaterial }

export function construirLista(c: ContenidoCurso, anterior: AulaVirtual | null, descargados: Map<string, Descargado>, hoy: ISODate): AulaVirtual {
  const previos = new Map<string, Material>();
  for (const s of anterior?.secciones ?? []) for (const m of s.materiales) previos.set(m.id, m);
  const presentes = new Set<string>();
  const secciones: SeccionMateriales[] = [];
  for (const s of c.secciones) {
    const materiales = s.modulos.filter(esMaterial).map((m): Material => {
      presentes.add(m.id);
      const d = descargados.get(m.id);
      const antes = previos.get(m.id);
      const archivo = d?.archivo ?? antes?.archivo;
      return {
        id: m.id, nombre: m.nombre, tipo: d?.tipo ?? antes?.tipo ?? tipoDeModulo(m), enlace: m.url ?? antes?.enlace ?? '',
        ...(archivo ? { archivo } : {}),
      };
    });
    if (materiales.length) secciones.push({ nombre: s.nombre, materiales });
  }
  const retirados = [...previos.values()].filter((m) => !presentes.has(m.id)).map((m) => ({ ...m, retirado: true }));
  if (retirados.length) secciones.push({ nombre: SECCION_RETIRADOS, materiales: retirados });
  return { actualizado: hoy, secciones };
}
```
Run → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/uni/aula/materiales.ts src/uni/aula/materiales.test.ts
git commit -m "Aula virtual: materiales nuevos, nombres seguros y lista por temas"
```

---

### Task 6: Fechas, parte 1 (pregunta, respuesta y comprobaciones)

**Files:**
- Create: `src/uni/aula/fechas.ts`, `src/uni/aula/fechas.test.ts`

**Interfaces:**
- Consumes: `Asignatura`, `TipoTarea`, `ISODate`, `diaDeSemana`, `isISODate`, `isHora`, `ErrorFormato`.
- Produces:
  ```ts
  export type Modelo = 'haiku' | 'sonnet' | 'opus';
  export const MODELOS: Modelo[];
  export interface FuenteTexto { id: string; tipo: 'aviso' | 'guia' | 'documento'; titulo: string; fecha?: ISODate; enlace?: string; texto: string }
  export interface FechaConocida { origen: string; titulo: string; tipo?: TipoTarea; fecha: ISODate; hora?: string }
  export interface Pregunta { asignatura: Asignatura; hoy: ISODate; conocidas: FechaConocida[]; fuentes: FuenteTexto[]; conGuia: boolean }
  export interface FechaClaude { clave: string; que: string; tipo: 'examen' | 'entrega' | 'evento'; fecha: ISODate | null; hora: string | null; exacta: boolean; cita: string; fuente: string; duda: string | null }
  export interface RespuestaClaude { fechas: FechaClaude[]; avisos: { id: string; importante: boolean }[]; evaluacion: string | null }
  export function cursoAcademico(hoy: ISODate): { inicio: ISODate; fin: ISODate };
  export function textoPregunta(p: Pregunta): string;
  export function leerRespuesta(texto: string): RespuestaClaude;   // lanza ErrorFormato
  export function problemas(f: FechaClaude, p: Pregunta): string[];
  export function necesitaMas(r: RespuestaClaude, p: Pregunta): boolean;
  ```
  `clave` de las fechas ya conocidas del aula = lo que va detrás de `aula:<id>:` en su origen (se pasa en `FechaConocida.origen` completo y Claude lo repite como `clave` sin el prefijo; la pregunta lo explica).

- [ ] **Step 1: Prueba que falla**

`src/uni/aula/fechas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { cursoAcademico, leerRespuesta, necesitaMas, problemas, textoPregunta, type FechaClaude, type Pregunta } from './fechas.ts';

const calculo = { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' };
const p: Pregunta = {
  asignatura: calculo, hoy: '2026-10-04', conGuia: false,
  conocidas: [{ origen: 'urjc-examen:2026-27:2327007:E:AM', titulo: 'Examen: Cálculo (enero)', tipo: 'examen', fecha: '2027-01-21', hora: '09:00' }],
  fuentes: [{ id: 'moodle-hilo-555', tipo: 'aviso', titulo: 'Primer parcial', fecha: '2026-10-03', enlace: 'https://x/555', texto: 'El primer parcial será el jueves 12 de noviembre a las 10:00 en el aula 204.' }],
};
const f = (x: Partial<FechaClaude> = {}): FechaClaude => ({
  clave: 'primer-parcial', que: 'Primer parcial', tipo: 'examen', fecha: '2026-11-12', hora: '10:00', exacta: true,
  cita: 'el primer parcial será el jueves 12 de noviembre a las 10:00', fuente: 'moodle-hilo-555', duda: null, ...x,
});

describe('curso académico', () => {
  it('de septiembre a julio', () => {
    expect(cursoAcademico('2026-10-04')).toEqual({ inicio: '2026-09-01', fin: '2027-07-31' });
    expect(cursoAcademico('2027-03-01')).toEqual({ inicio: '2026-09-01', fin: '2027-07-31' });
    expect(cursoAcademico('2027-08-15')).toEqual({ inicio: '2027-09-01', fin: '2028-07-31' });
  });
});

describe('pregunta', () => {
  it('lleva hoy, el curso, las fechas conocidas y los textos con su id', () => {
    const t = textoPregunta(p);
    expect(t).toContain('Asignatura: Cálculo');
    expect(t).toContain('Hoy: 2026-10-04 (domingo)');
    expect(t).toContain('Curso: 2026-09-01 a 2027-07-31');
    expect(t).toContain('2027-01-21 09:00 · examen · Examen: Cálculo (enero) [urjc-examen:2026-27:2327007:E:AM]');
    expect(t).toContain('### moodle-hilo-555 (aviso, publicado el 2026-10-03): Primer parcial');
    expect(t).toContain('El primer parcial será el jueves 12');
    expect(t).not.toContain('"evaluacion"'); // sin guía no se pide resumen
  });
});

describe('respuesta', () => {
  const buena = { fechas: [f()], avisos: [{ id: 'moodle-hilo-555', importante: true }], evaluacion: null };
  it('lee el JSON aunque venga con texto o con ```json alrededor', () => {
    expect(leerRespuesta(JSON.stringify(buena))).toEqual(buena);
    expect(leerRespuesta('Aquí tienes:\n```json\n' + JSON.stringify(buena) + '\n```\nListo.')).toEqual(buena);
  });
  it('JSON roto o incompleto: ErrorFormato', () => {
    expect(() => leerRespuesta('no sé')).toThrow();
    expect(() => leerRespuesta('{"fechas": [{"clave": 1}]}')).toThrow(/fecha 1/);
    expect(() => leerRespuesta('{"fechas": [], "avisos": "x"}')).toThrow(/avisos/);
  });
});

describe('comprobaciones', () => {
  it('una fecha correcta no tiene problemas', () => {
    expect(problemas(f(), p)).toEqual([]);
  });
  it('la cita tiene que estar de verdad en el texto (sin mayúsculas, tildes ni espacios de sobra)', () => {
    expect(problemas(f({ cita: 'EL  PRIMER parcial sera el jueves 12 de noviembre' }), p)).toEqual([]);
    expect(problemas(f({ cita: 'el parcial es el 20' }), p)).toEqual(['la cita no está en el texto']);
    expect(problemas(f({ fuente: 'otra' }), p)).toEqual(['la cita no está en el texto']);
  });
  it('el día de la semana tiene que cuadrar', () => {
    expect(problemas(f({ fecha: '2026-11-13' }), p)).toContain('el 2026-11-13 no es jueves');
  });
  it('dentro del curso y no en el pasado; hora válida', () => {
    expect(problemas(f({ fecha: '2026-10-01', cita: 'el primer parcial' }), p)).toContain('la fecha ya ha pasado');
    expect(problemas(f({ fecha: '2027-09-10', cita: 'el primer parcial' }), p)).toContain('la fecha está fuera del curso');
    expect(problemas(f({ hora: '25:00' }), p)).toContain('la hora no es válida');
  });
  it('sin fecha exacta no se comprueba nada (no va a la agenda)', () => {
    expect(problemas(f({ exacta: false, fecha: null, cita: 'a mediados de noviembre' }), p)).toEqual([]);
  });
  it('hace falta más inteligencia si hay dudas o problemas', () => {
    expect(necesitaMas({ fechas: [f()], avisos: [], evaluacion: null }, p)).toBe(false);
    expect(necesitaMas({ fechas: [f({ duda: 'el profe dice 12 y luego 19' })], avisos: [], evaluacion: null }, p)).toBe(true);
    expect(necesitaMas({ fechas: [f({ fecha: '2026-11-13' })], avisos: [], evaluacion: null }, p)).toBe(true);
    expect(necesitaMas({ fechas: [f(), f({ fecha: '2026-11-19', cita: 'el primer parcial' })], avisos: [], evaluacion: null }, p)).toBe(true); // misma clave, dos fechas
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implementación**

`src/uni/aula/fechas.ts`:
```ts
// Fechas que Claude encuentra en los avisos, la guía y los documentos (spec §5).
import type { Asignatura } from '../../datos/asignaturas.ts';
import type { TipoTarea } from '../../datos/tareas.ts';
import { diaDeSemana, isHora, isISODate, type ISODate } from '../../fechas.ts';
import { ErrorFormato } from '../tipos.ts';

export type Modelo = 'haiku' | 'sonnet' | 'opus';
export const MODELOS: Modelo[] = ['haiku', 'sonnet', 'opus'];

export interface FuenteTexto { id: string; tipo: 'aviso' | 'guia' | 'documento'; titulo: string; fecha?: ISODate; enlace?: string; texto: string }
export interface FechaConocida { origen: string; titulo: string; tipo?: TipoTarea; fecha: ISODate; hora?: string }
export interface Pregunta { asignatura: Asignatura; hoy: ISODate; conocidas: FechaConocida[]; fuentes: FuenteTexto[]; conGuia: boolean }
export interface FechaClaude {
  clave: string; que: string; tipo: 'examen' | 'entrega' | 'evento'; fecha: ISODate | null; hora: string | null;
  exacta: boolean; cita: string; fuente: string; duda: string | null;
}
export interface RespuestaClaude { fechas: FechaClaude[]; avisos: { id: string; importante: boolean }[]; evaluacion: string | null }

const NOMBRE_DIA: Record<string, string> = { lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado', dom: 'domingo' };

export function cursoAcademico(hoy: ISODate): { inicio: ISODate; fin: ISODate } {
  const [y, m] = hoy.split('-').map(Number);
  const empieza = m >= 8 ? y : y - 1; // en agosto ya se mira el curso que viene
  return { inicio: `${empieza}-09-01`, fin: `${empieza + 1}-07-31` };
}

export function textoPregunta(p: Pregunta): string {
  const curso = cursoAcademico(p.hoy);
  const conocidas = p.conocidas.length
    ? p.conocidas.map((c) => `- ${c.fecha}${c.hora ? ` ${c.hora}` : ''} · ${c.tipo ?? 'tarea'} · ${c.titulo} [${c.origen}]`).join('\n')
    : '- (ninguna)';
  const fuentes = p.fuentes.map((f) => {
    const cabecera = `### ${f.id} (${f.tipo}${f.fecha ? `, publicado el ${f.fecha}` : ''}): ${f.titulo}`;
    return `${cabecera}\n${f.texto}`;
  }).join('\n\n');
  return [
    `Asignatura: ${p.asignatura.nombre}`,
    `Hoy: ${p.hoy} (${NOMBRE_DIA[diaDeSemana(p.hoy)]})`,
    `Curso: ${curso.inicio} a ${curso.fin}`,
    p.conGuia ? 'Entre los textos está la guía docente: escribe también "evaluacion".' : 'No hay guía docente nueva: pon "evaluacion": null.',
    '',
    '## Fechas que Diego ya tiene de esta asignatura',
    conocidas,
    '',
    '## Textos nuevos',
    fuentes,
  ].join('\n');
}

// Claude a veces añade texto o ```json alrededor: se toma desde la primera { hasta la última }.
export function leerRespuesta(texto: string): RespuestaClaude {
  const i = texto.indexOf('{');
  const j = texto.lastIndexOf('}');
  if (i < 0 || j < i) throw new ErrorFormato('Claude no ha devuelto JSON');
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(texto.slice(i, j + 1));
  } catch {
    throw new ErrorFormato('Claude ha devuelto un JSON roto');
  }
  const fechas = d.fechas ?? [];
  const avisos = d.avisos ?? [];
  if (!Array.isArray(fechas)) throw new ErrorFormato('fechas debe ser una lista');
  if (!Array.isArray(avisos)) throw new ErrorFormato('avisos debe ser una lista');
  return {
    fechas: fechas.map((x: Record<string, unknown>, n: number) => {
      const donde = `fecha ${n + 1}`;
      if (typeof x?.clave !== 'string' || !/^[a-z0-9-]{1,60}$/.test(x.clave)) throw new ErrorFormato(`${donde}: clave no válida`);
      if (typeof x.que !== 'string' || !x.que.trim()) throw new ErrorFormato(`${donde}: falta «que»`);
      if (x.tipo !== 'examen' && x.tipo !== 'entrega' && x.tipo !== 'evento') throw new ErrorFormato(`${donde}: tipo no válido`);
      if (typeof x.cita !== 'string' || typeof x.fuente !== 'string') throw new ErrorFormato(`${donde}: faltan cita o fuente`);
      return {
        clave: x.clave, que: x.que.trim(), tipo: x.tipo,
        fecha: typeof x.fecha === 'string' ? x.fecha : null,
        hora: typeof x.hora === 'string' ? x.hora : null,
        exacta: x.exacta === true, cita: x.cita, fuente: x.fuente,
        duda: typeof x.duda === 'string' && x.duda.trim() ? x.duda.trim() : null,
      };
    }),
    avisos: avisos.map((a: Record<string, unknown>) => ({ id: String(a?.id ?? ''), importante: a?.importante === true })),
    evaluacion: typeof d.evaluacion === 'string' && d.evaluacion.trim() ? d.evaluacion.trim() : null,
  };
}

const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const DIAS_TEXTO: [RegExp, string][] = [
  [/\blunes\s+(?:dia\s+)?\d/, 'lun'], [/\bmartes\s+(?:dia\s+)?\d/, 'mar'], [/\bmiercoles\s+(?:dia\s+)?\d/, 'mie'],
  [/\bjueves\s+(?:dia\s+)?\d/, 'jue'], [/\bviernes\s+(?:dia\s+)?\d/, 'vie'], [/\bsabado\s+(?:dia\s+)?\d/, 'sab'], [/\bdomingo\s+(?:dia\s+)?\d/, 'dom'],
];

export function problemas(f: FechaClaude, p: Pregunta): string[] {
  if (!f.exacta) return [];
  const r: string[] = [];
  const fuente = p.fuentes.find((x) => x.id === f.fuente);
  const cita = normal(f.cita);
  if (!fuente || !cita || !normal(fuente.texto).includes(cita)) r.push('la cita no está en el texto');
  if (!isISODate(f.fecha)) {
    r.push('falta la fecha');
    return r;
  }
  const dia = DIAS_TEXTO.find(([re]) => re.test(cita))?.[1];
  if (dia && diaDeSemana(f.fecha) !== dia) r.push(`el ${f.fecha} no es ${NOMBRE_DIA[dia]}`);
  const curso = cursoAcademico(p.hoy);
  if (f.fecha < p.hoy) r.push('la fecha ya ha pasado');
  else if (f.fecha > curso.fin) r.push('la fecha está fuera del curso');
  if (f.hora !== null && !isHora(f.hora)) r.push('la hora no es válida');
  return r;
}

export function necesitaMas(r: RespuestaClaude, p: Pregunta): boolean {
  const porClave = new Map<string, Set<string | null>>();
  for (const f of r.fechas) {
    if (f.duda || problemas(f, p).length) return true;
    if (f.exacta) porClave.set(f.clave, (porClave.get(f.clave) ?? new Set()).add(f.fecha));
  }
  return [...porClave.values()].some((s) => s.size > 1);
}
```
Nota: `diaDeSemana` de `src/fechas.ts` devuelve `'lun'…'dom'` (comprobar; si devuelve otra cosa, adaptar `NOMBRE_DIA`). Run → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/uni/aula/fechas.ts src/uni/aula/fechas.test.ts
git commit -m "Aula virtual: pregunta a Claude, lectura de su respuesta y comprobaciones de fechas"
```

---

### Task 7: Fechas, parte 2 (decisión final y `fusionar` con título y adelantos)

**Files:**
- Modify: `src/uni/aula/fechas.ts`, `src/uni/aula/fechas.test.ts`, `src/uni/tipos.ts`, `src/uni/fusionar.ts`, `src/uni/fusionar.test.ts`

**Interfaces:**
- Consumes: Task 6.
- Produces:
  ```ts
  // tipos.ts
  export interface Propuesta { ...; tituloDeLaFuente?: boolean }
  // fusionar.ts
  export interface Adelanto { origen: string; titulo: string; antes: ISODate; ahora: ISODate }
  export interface ResultadoFusion { tareas; vistos; creadas; actualizadas; adelantadas: Adelanto[] }
  // fechas.ts
  export interface AvisoNuevo { titulo: string; texto: string }
  export interface Decision { propuestas: Propuesta[]; avisos: AvisoNuevo[] }
  export function decidir(r: RespuestaClaude, p: Pregunta): Decision;
  ```

- [ ] **Step 1: Pruebas que fallan**

Añadir a `src/uni/aula/fechas.test.ts`:
```ts
import { decidir } from './fechas.ts';

describe('decisión final', () => {
  const r = (fechas: FechaClaude[]) => ({ fechas, avisos: [], evaluacion: null });
  it('una fecha clara va a la agenda con la cita y el enlace en las notas', () => {
    expect(decidir(r([f()]), p)).toEqual({
      propuestas: [{
        origen: 'aula:calculo:primer-parcial', titulo: 'Primer parcial: Cálculo', tipo: 'examen', area: 'calculo',
        fecha: '2026-11-12', hora: '10:00',
        notas: '«el primer parcial será el jueves 12 de noviembre a las 10:00» (Primer parcial, https://x/555)',
        notasDeLaFuente: true, tituloDeLaFuente: true,
      }],
      avisos: [],
    });
  });
  it('sin día exacto no va a la agenda', () => {
    expect(decidir(r([f({ exacta: false, fecha: null, cita: 'a mediados de noviembre' })]), p).propuestas).toEqual([]);
  });
  it('ante la duda, la más temprana con ⚠ y un aviso importante', () => {
    const d = decidir(r([
      f({ fecha: '2026-11-19', cita: 'el primer parcial', duda: 'el aviso dice 12 y la guía 19' }),
      f({ fecha: '2026-11-12' }),
    ]), p);
    expect(d.propuestas).toHaveLength(1);
    expect(d.propuestas[0].fecha).toBe('2026-11-12');
    expect(d.propuestas[0].titulo).toBe('⚠ Primer parcial: Cálculo (por confirmar)');
    expect(d.propuestas[0].notas).toContain('«el primer parcial»');
    expect(d.avisos).toEqual([{ titulo: 'Fecha por confirmar: Primer parcial de Cálculo', texto: expect.stringContaining('2026-11-12') }]);
  });
  it('una fecha que no pasa las comprobaciones no cuenta como candidata; si no queda ninguna, solo aviso', () => {
    const d = decidir(r([f({ cita: 'inventada' })]), p);
    expect(d.propuestas).toEqual([]);
    expect(d.avisos[0].titulo).toBe('Fecha sin confirmar: Primer parcial de Cálculo');
  });
  it('no repite un examen oficial que ya está el mismo día', () => {
    const conOficial = { ...p, fuentes: [{ ...p.fuentes[0], texto: 'El examen final será el jueves 21 de enero.' }] };
    const d = decidir(r([f({ clave: 'final', que: 'Examen final', fecha: '2027-01-21', hora: null, cita: 'el examen final será el jueves 21 de enero' })]), conOficial);
    expect(d.propuestas).toEqual([]);
  });
});
```

Añadir a `src/uni/fusionar.test.ts`:
```ts
describe('fusionar: tareas del aula virtual', () => {
  const aula = (x: Partial<Propuesta> = {}): Propuesta => ({
    origen: 'aula:calculo:primer-parcial', titulo: '⚠ Primer parcial: Cálculo (por confirmar)', tipo: 'examen', area: 'calculo',
    fecha: '2026-11-12', notas: '«cita»', notasDeLaFuente: true, tituloDeLaFuente: true, ...x,
  });
  it('el título es de la fuente: se quita la ⚠ al confirmarse', () => {
    const uno = fusionar([], {}, [aula()], HOY);
    expect(uno.vistos['aula:calculo:primer-parcial'].titulo).toBe('⚠ Primer parcial: Cálculo (por confirmar)');
    const dos = fusionar(uno.tareas, uno.vistos, [aula({ titulo: 'Primer parcial: Cálculo' })], HOY);
    expect(dos.tareas[0].titulo).toBe('Primer parcial: Cálculo');
  });
  it('si Diego cambió el título, se respeta mientras la fuente no lo cambie', () => {
    const uno = fusionar([], {}, [aula()], HOY);
    const editada = [{ ...uno.tareas[0], titulo: 'Parcial 1 cálculo' }];
    expect(fusionar(editada, uno.vistos, [aula()], HOY).tareas[0].titulo).toBe('Parcial 1 cálculo');
  });
  it('avisa cuando una fecha se adelanta (no cuando se retrasa)', () => {
    const uno = fusionar([], {}, [aula({ fecha: '2026-11-19' })], HOY);
    const antes = fusionar(uno.tareas, uno.vistos, [aula({ fecha: '2026-11-12' })], HOY);
    expect(antes.adelantadas).toEqual([{ origen: 'aula:calculo:primer-parcial', titulo: '⚠ Primer parcial: Cálculo (por confirmar)', antes: '2026-11-19', ahora: '2026-11-12' }]);
    expect(fusionar(antes.tareas, antes.vistos, [aula({ fecha: '2026-11-26' })], HOY).adelantadas).toEqual([]);
  });
  it('la parte A no cambia: sin tituloDeLaFuente el título no se apunta ni se toca', () => {
    const r = fusionar([], {}, [examen()], HOY);
    expect(r.vistos['urjc-examen:2026-27:2327007:E:AM'].titulo).toBeUndefined();
  });
});
```
Run: `npx vitest run src/uni` → FAIL.

- [ ] **Step 2: Implementación**

`src/uni/tipos.ts`, en `Propuesta`, añadir:
```ts
  // true: el título viene de la fuente (aula virtual: marca ⚠) y se actualiza si la fuente lo cambia.
  tituloDeLaFuente?: boolean;
```

`src/uni/fusionar.ts`:
- `const CAMPOS_DE_LA_FUENTE = ['fecha', 'hora', 'notas', 'titulo'] as const;`
- Añadir `export interface Adelanto { origen: string; titulo: string; antes: ISODate; ahora: ISODate }` y `adelantadas: Adelanto[]` a `ResultadoFusion`.
- En el bucle, después de calcular `cambiada`:
```ts
    if (ahora.fecha < antes.fecha && resultado[i].fecha === antes.fecha)
      adelantadas.push({ origen: p.origen, titulo: resultado[i].titulo, antes: antes.fecha, ahora: ahora.fecha });
```
  (calculado antes de sustituir `resultado[i]`; `const adelantadas: Adelanto[] = [];` al principio y devolverlo).
- `vistoDe` añade `...(p.tituloDeLaFuente ? { titulo: p.titulo } : {})`.
- `aplicarCambiosDeLaFuente`: `titulo` es obligatorio en `Tarea`: si `ahora.titulo === undefined` no se borra (con el `continue` de `antes[k] === ahora[k]` ya pasa para la parte A; añadir `if (k === 'titulo' && ahora.titulo === undefined) continue;`).

`src/uni/aula/fechas.ts`, añadir:
```ts
import type { Propuesta } from '../tipos.ts';

export interface AvisoNuevo { titulo: string; texto: string }
export interface Decision { propuestas: Propuesta[]; avisos: AvisoNuevo[] }

function nota(f: FechaClaude, p: Pregunta): string {
  const fuente = p.fuentes.find((x) => x.id === f.fuente);
  const donde = fuente ? ` (${[fuente.titulo, fuente.enlace].filter(Boolean).join(', ')})` : '';
  return `«${f.cita}»${donde}`;
}

export function decidir(r: RespuestaClaude, p: Pregunta): Decision {
  const propuestas: Propuesta[] = [];
  const avisos: AvisoNuevo[] = [];
  const grupos = new Map<string, FechaClaude[]>();
  for (const f of r.fechas) if (f.exacta) grupos.set(f.clave, [...(grupos.get(f.clave) ?? []), f]);
  for (const [clave, fs] of grupos) {
    const que = fs[0].que;
    const validas = fs.filter((f) => problemas(f, p).length === 0 && f.fecha);
    const fechasDistintas = new Set(fs.map((f) => f.fecha));
    const dudosa = fs.some((f) => f.duda || problemas(f, p).length) || fechasDistintas.size > 1;
    const notas = [...new Set(fs.map((f) => nota(f, p)))].join('\n');
    if (validas.length === 0) {
      avisos.push({ titulo: `Fecha sin confirmar: ${que} de ${p.asignatura.nombre}`, texto: `No he podido comprobar la fecha. Lo que dice el profe:\n${notas}` });
      continue;
    }
    const elegida = [...validas].sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1))[0];
    // Un examen oficial (parte A) el mismo día ya está en la agenda.
    const oficial = p.conocidas.some((c) => c.origen.startsWith('urjc-examen:') && c.fecha === elegida.fecha && elegida.tipo === 'examen');
    if (oficial) continue;
    const titulo = dudosa ? `⚠ ${que}: ${p.asignatura.nombre} (por confirmar)` : `${que}: ${p.asignatura.nombre}`;
    propuestas.push({
      origen: `aula:${p.asignatura.id}:${clave}`, titulo, tipo: elegida.tipo, area: p.asignatura.id, fecha: elegida.fecha!,
      ...(elegida.hora && isHora(elegida.hora) ? { hora: elegida.hora } : {}),
      notas, notasDeLaFuente: true, tituloDeLaFuente: true,
    });
    if (dudosa)
      avisos.push({
        titulo: `Fecha por confirmar: ${que} de ${p.asignatura.nombre}`,
        texto: `He puesto la fecha más temprana (${elegida.fecha}) para que no te pille por sorpresa. Compruébala:\n${notas}`,
      });
  }
  return { propuestas, avisos };
}
```
Ajustar la prueba «la parte A no cambia» y las existentes de `fusionar.test.ts` si comparan `ResultadoFusion` entero (añadir `adelantadas: []`). Run: `npx vitest run src/uni sincronizar` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/uni
git commit -m "Aula virtual: decisión final de fechas (la más temprana ante la duda) y adelantos en fusionar"
```

---

### Task 8: Claude y textos en el PC

**Files:**
- Create: `local/aula/claude.ts`, `local/aula/claude.test.ts`, `local/aula/instrucciones-fechas.md`, `local/aula/texto.ts`, `local/aula/texto.test.ts`

**Interfaces:**
- Consumes: `Comando`, `explicarError` (`local/claude.ts`); `Modelo` (Task 6); `textoDeElemento` (Task 2).
- Produces:
  ```ts
  export class LimiteClaude extends Error {}
  export function argumentosAula(modelo: Modelo, instrucciones: string): string[];
  export function leerSalidaClaude(stdout: string): string;           // el texto de «result»; lanza LimiteClaude o Error
  export function preguntarClaude(cmd: Comando, modelo: Modelo, instrucciones: string, texto: string, cwd: string): Promise<string>;
  export function textoDe(bytes: Uint8Array, nombre: string): Promise<string | null>;   // PDF, HTML o texto; null si no se puede
  ```

- [ ] **Step 1: Pruebas que fallan**

`local/aula/claude.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { argumentosAula, LimiteClaude, leerSalidaClaude } from './claude.ts';

describe('Claude para el aula virtual', () => {
  it('sin herramientas, con el modelo pedido y sus propias instrucciones', () => {
    expect(argumentosAula('haiku', 'C:/i.md')).toEqual([
      '-p', '--model', 'haiku', '--output-format', 'json', '--system-prompt-file', 'C:/i.md', '--tools', '', '--strict-mcp-config',
    ]);
  });
  it('lee el texto de la respuesta', () => {
    expect(leerSalidaClaude(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: '{"fechas":[]}' }))).toBe('{"fechas":[]}');
  });
  it('límite de uso → LimiteClaude; otro error → Error', () => {
    expect(() => leerSalidaClaude(JSON.stringify({ type: 'result', is_error: true, result: 'Claude AI usage limit reached' }))).toThrow(LimiteClaude);
    expect(() => leerSalidaClaude(JSON.stringify({ type: 'result', is_error: true, result: 'algo raro' }))).toThrow(/algo raro/);
    expect(() => leerSalidaClaude('')).toThrow();
  });
});
```

`local/aula/texto.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { textoDe } from './texto.ts';

const enc = (s: string) => new TextEncoder().encode(s);
describe('texto de un archivo', () => {
  it('HTML y texto', async () => {
    expect(await textoDe(enc('<p>Parcial el <b>13</b></p><p>Aula 2</p>'), 'guia.html')).toBe('Parcial el 13\nAula 2');
    expect(await textoDe(enc('hola'), 'a.txt')).toBe('hola');
  });
  it('lo que no sabe leer: null', async () => {
    expect(await textoDe(enc('PK'), 'a.pptx')).toBeNull();
    expect(await textoDe(enc('no es un pdf'), 'roto.pdf')).toBeNull();
  });
});
```
(El PDF de verdad se prueba en la Task 15 con un PDF real de Diego; no se añade un PDF al repositorio.)

Run: `npx vitest run local/aula` → FAIL.

- [ ] **Step 2: Implementación**

`local/aula/claude.ts`:
```ts
// Claude Code sin herramientas: solo lee el texto que le pasamos y contesta con JSON (spec §5).
import { spawn } from 'node:child_process';
import type { Modelo } from '../../src/uni/aula/fechas.ts';
import { explicarError, NO_ENCONTRADO, type Comando } from '../claude.ts';

export class LimiteClaude extends Error {
  constructor(m: string) {
    super(m);
    this.name = 'LimiteClaude';
  }
}

export function argumentosAula(modelo: Modelo, instrucciones: string): string[] {
  return ['-p', '--model', modelo, '--output-format', 'json', '--system-prompt-file', instrucciones, '--tools', '', '--strict-mcp-config'];
}

export function leerSalidaClaude(stdout: string): string {
  let j: { is_error?: boolean; result?: unknown; api_error_status?: number };
  try {
    j = JSON.parse(stdout.trim());
  } catch {
    throw new Error('Claude Code no ha contestado');
  }
  const texto = String(j.result ?? '');
  if (j.is_error) {
    const e = explicarError(texto, j.api_error_status);
    if (e.uso) throw new LimiteClaude(e.mensaje);
    throw new Error(e.mensaje);
  }
  return texto;
}

export function preguntarClaude(cmd: Comando, modelo: Modelo, instrucciones: string, texto: string, cwd: string): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const hijo = spawn(cmd.bin, [...cmd.previos, ...argumentosAula(modelo, instrucciones)], { cwd, windowsHide: true });
    let salida = '';
    let errores = '';
    hijo.stdout.on('data', (d) => (salida += String(d)));
    hijo.stderr.on('data', (d) => (errores = (errores + String(d)).slice(-2000)));
    hijo.stdin.on('error', () => undefined);
    hijo.stdin.end(texto);
    hijo.on('error', (e: NodeJS.ErrnoException) => rechazar(new Error(e.code === 'ENOENT' ? NO_ENCONTRADO : e.message)));
    hijo.on('close', () => {
      try {
        resolver(leerSalidaClaude(salida));
      } catch (e) {
        if (!salida.trim() && errores.trim()) {
          const x = explicarError(errores.trim());
          rechazar(x.uso ? new LimiteClaude(x.mensaje) : new Error(x.mensaje));
        } else rechazar(e);
      }
    });
  });
}
```
`cwd`: la revisión usa `os.tmpdir()` para que Claude no cargue el `AGENTS.md` de `my-context` (gastaría más).

`local/aula/instrucciones-fechas.md`:
```markdown
Eres un ayudante que lee avisos, guías docentes y documentos de una asignatura de la universidad (URJC) y saca las fechas importantes para la agenda de un estudiante. Contesta SOLO con un objeto JSON, sin texto alrededor.

Formato:
{
  "fechas": [
    { "clave": "primer-parcial", "que": "Primer parcial", "tipo": "examen", "fecha": "2026-11-12", "hora": "10:00",
      "exacta": true, "cita": "frase exacta copiada del texto", "fuente": "id del texto", "duda": null }
  ],
  "avisos": [ { "id": "id del aviso", "importante": true } ],
  "evaluacion": "resumen o null"
}

Fechas:
- Solo cosas que el estudiante tiene que hacer o a las que tiene que ir: exámenes y parciales ("examen"), entregas de prácticas o trabajos ("entrega"), y otras citas con fecha como presentaciones o sesiones obligatorias ("evento"). No pongas fechas de clases normales ni de publicación de notas.
- "clave": corta, en minúsculas y con guiones (primer-parcial, practica-2). Si la fecha ya está en «Fechas que Diego ya tiene» con origen `aula:<asignatura>:<clave>`, usa ESA clave (así se mueve la fecha en vez de repetirla).
- No repitas los exámenes oficiales que ya están (origen `urjc-examen:`) salvo que el texto los cambie.
- "fecha": AAAA-MM-DD. "hora": "HH:MM" o null. Las fechas relativas («el jueves que viene») se calculan desde la fecha de publicación del aviso.
- "exacta": true solo si hay un día concreto. «A mediados de noviembre» → exacta false y fecha null.
- "cita": copia LITERAL de la frase del texto donde aparece la fecha (sin cambiar ni una palabra). Se comprueba.
- "fuente": el id del texto (lo que va detrás de ### y antes del paréntesis).
- "duda": explica en una frase cualquier cosa rara (el profe se contradice, la fecha es relativa, el año no está claro, cambia una fecha que ya existía, el día de la semana no cuadra). Si estás seguro, null. Si un texto se contradice, devuelve una entrada por cada fecha posible, con la misma clave y la duda explicada.

Avisos: para cada texto de tipo aviso, "importante": true si cambia los planes del estudiante (cambio de fecha o de aula, clase cancelada o movida, examen o entrega nuevos, algo que hacer antes de una fecha). Material subido, saludos o recordatorios generales: false.

Evaluación: si te lo piden, un resumen corto en español, en lista con guiones: qué partes tiene la evaluación, cuánto cuenta cada una, nota mínima y si hay evaluación continua o solo examen final. Si no te lo piden, null.
```

`local/aula/texto.ts`:
```ts
import { parse } from 'node-html-parser';
import { extractText, getDocumentProxy } from 'unpdf';
import { textoDeElemento } from '../../src/uni/aula/paginas.ts';

export async function textoDe(bytes: Uint8Array, nombre: string): Promise<string | null> {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  try {
    if (ext === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      const t = String(text).replace(/[ \t]+/g, ' ').trim();
      return t || null; // escaneado: sin texto
    }
    const texto = new TextDecoder().decode(bytes);
    if (ext === 'html' || ext === 'htm') return textoDeElemento(parse(texto)) || null;
    if (ext === 'txt' || ext === 'md') return texto.trim() || null;
    return null;
  } catch {
    return null;
  }
}
```
Run: `npx vitest run local/aula` → PASS.

- [ ] **Step 3: Commit**

```bash
git add local/aula/claude.ts local/aula/claude.test.ts local/aula/instrucciones-fechas.md local/aula/texto.ts local/aula/texto.test.ts
git commit -m "Aula virtual: Claude sin herramientas por modelo y texto de PDF y HTML"
```

---

### Task 9: Una revisión completa (con navegador, Claude y git simulados)

**Files:**
- Create: `local/aula/git.ts`, `local/aula/revision.ts`, `local/aula/revision.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  ```ts
  // git.ts
  export interface Git { limpio(): Promise<boolean>; traer(): Promise<void>; subir(archivos: string[], mensaje: string): Promise<'ok' | 'rechazado'>; volverAlRemoto(): Promise<void> }
  export function crearGit(carpeta: string): Git;
  // revision.ts
  export interface Dependencias {
    carpeta: string; ahora: Date;
    navegador(): Promise<Navegador>;
    preguntar(modelo: Modelo, texto: string): Promise<string>;
    textoDe(bytes: Uint8Array, nombre: string): Promise<string | null>;
    git: Git;
  }
  export interface ResumenRevision { resultado: ResultadoRevision; mensaje: string }
  export function revisarAula(d: Dependencias): Promise<ResumenRevision>;
  ```

Estructura de `revisarAula` (tres fases, para poder repetir la última si el `push` se rechaza):
1. **Comprobar:** `git.limpio()` (si no → `{ resultado: 'error', mensaje: 'my-context tiene cambios sin subir: lo intento más tarde' }`, sin tocar nada) y `git.traer()`.
2. **Cosechar** (red y Claude; escribe solo los materiales, que no se suben): lee `asignaturas.yaml`, `aula-sincronizacion.yaml`, `avisos.yaml`, `tareas.yaml`, las listas `aula-virtual.yaml`; abre el navegador; si `!sesionValida()` → cosecha `necesita-entrar`. Si no, por asignatura con `codigo`: contenido, materiales nuevos (descarga a `estudios/<id>/aula-virtual/<nombreSeguro(sección)>/<nombreSeguro(archivo)>`; carpetas: cada archivo dentro de `<sección>/<nombreSeguro(carpeta)>/`), foro (hilos nuevos → avisos nuevos), guía (descarga a `aula-virtual/guia-docente.<ext>`, huella sha1 del texto), pendientes anteriores, y Claude (`MODELOS` en orden hasta `!necesitaMas`; respuesta rota en un modelo = pasar al siguiente; si el último sigue roto → la asignatura queda en `pendientes`). `LimiteClaude` → esa asignatura y las siguientes van a `pendientes` (sin más llamadas).
3. **Aplicar y subir** (puro sobre los archivos recién leídos, hasta 3 intentos): avisos nuevos (con `importante` de Claude), avisos del programa (decisiones, adelantos, entrar), `fusionar`, `limpiarAvisos`, listas de materiales, guías, estado; escribir; `git.subir(...)`; si `'rechazado'` → `git.volverAlRemoto()`, volver a leer y aplicar.

- [ ] **Step 1: Pruebas que fallan**

`local/aula/revision.test.ts` (carpeta temporal con `mkdtemp`; navegador, Claude y git falsos):
```ts
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseAvisos } from '../../src/datos/avisos.ts';
import { parseTareas } from '../../src/datos/tareas.ts';
import { SesionCaducada } from '../../src/uni/aula/paginas.ts';
import { parseSincronizacionAula } from '../../src/uni/aula/estado.ts';
import type { Modelo } from '../../src/uni/aula/fechas.ts';
import { LimiteClaude } from './claude.ts';
import type { Git } from './git.ts';
import type { Navegador } from './navegador.ts';
import { revisarAula, type Dependencias } from './revision.ts';

const AHORA = new Date('2026-10-04T08:00:00Z');
let carpeta: string;
const leer = (r: string) => readFile(path.join(carpeta, r), 'utf8').catch(() => null);

const estado = JSON.stringify({
  section: [{ id: '10', title: 'General', cmlist: ['100', '103'] }],
  cm: [
    { id: '100', name: 'Avisos', module: 'forum', url: 'https://aula/mod/forum/view.php?id=100' },
    { id: '103', name: 'Planificación', module: 'resource', url: 'https://aula/mod/resource/view.php?id=103' },
  ],
});
const foro = '<a href="https://aula/mod/forum/discuss.php?d=555">Primer parcial</a>';
const hilo = '<article data-post-id="1"><time datetime="2026-10-03T10:00:00+02:00"></time><div class="post-content-container"><p>El primer parcial será el jueves 12 de noviembre a las 10:00.</p></div></article>';
const respuesta = (x: object = {}) => JSON.stringify({
  fechas: [{ clave: 'primer-parcial', que: 'Primer parcial', tipo: 'examen', fecha: '2026-11-12', hora: '10:00', exacta: true,
    cita: 'el primer parcial será el jueves 12 de noviembre a las 10:00', fuente: 'moodle-hilo-555', duda: null }],
  avisos: [{ id: 'moodle-hilo-555', importante: true }], evaluacion: null, ...x,
});

function navegadorFalso(o: { sesion?: boolean; estado?: string } = {}): Navegador {
  return {
    sesionValida: async () => o.sesion ?? true,
    pedirTexto: async (url) => (url.includes('/my/') ? '"sesskey":"abc"' : url.includes('discuss.php') ? hilo : foro),
    ajax: async (_s, metodo) => metodo.startsWith('core_course_get_enrolled')
      ? { courses: [{ id: 7, shortname: '2026-27_2327007_7_1', fullname: 'Cálculo' }] }
      : (o.estado ?? estado),
    descargar: async () => ({ bytes: new TextEncoder().encode('Sin fechas'), nombre: 'Planificación.pdf' }),
    cerrar: async () => undefined,
  };
}
function gitFalso(x: Partial<Git> = {}): Git & { subidas: string[][] } {
  const subidas: string[][] = [];
  return { limpio: async () => true, traer: async () => undefined, subir: async (a) => (subidas.push(a), 'ok'), volverAlRemoto: async () => undefined, subidas, ...x };
}
const deps = (x: Partial<Dependencias> = {}): Dependencias => ({
  carpeta, ahora: AHORA, navegador: async () => navegadorFalso(),
  preguntar: async () => respuesta(), textoDe: async (b) => new TextDecoder().decode(b), git: gitFalso(), ...x,
});

beforeEach(async () => {
  carpeta = await mkdtemp(path.join(os.tmpdir(), 'aula-'));
  await mkdir(path.join(carpeta, 'estudios'), { recursive: true });
  await mkdir(path.join(carpeta, 'agenda'), { recursive: true });
  await writeFile(path.join(carpeta, 'estudios/asignaturas.yaml'), 'asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n');
  await writeFile(path.join(carpeta, 'agenda/tareas.yaml'), 'tareas: []\n');
});

describe('revisión del aula virtual', () => {
  it('trae el aviso, la fecha y el material, y lo sube', async () => {
    const git = gitFalso();
    const r = await revisarAula(deps({ git }));
    expect(r.resultado).toBe('ok');
    const avisos = parseAvisos(await leer('estudios/avisos.yaml'));
    expect(avisos).toEqual([expect.objectContaining({ id: 'moodle-hilo-555', asignatura: 'calculo', importante: true, leido: false })]);
    const tareas = parseTareas((await leer('agenda/tareas.yaml'))!);
    expect(tareas).toEqual([expect.objectContaining({ titulo: 'Primer parcial: Cálculo', fecha: '2026-11-12', origen: 'aula:calculo:primer-parcial' })]);
    expect(await leer('estudios/calculo/aula-virtual/General/Planificación.pdf')).toBe('Sin fechas');
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toContain('archivo: General/Planificación.pdf');
    expect(git.subidas[0]).toEqual(expect.arrayContaining(['estudios/avisos.yaml', 'agenda/tareas.yaml', 'estudios/aula-sincronizacion.yaml', 'estudios/calculo/aula-virtual.yaml']));
    const s = parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml'));
    expect(s.estado).toEqual({ ultimaRevision: '2026-10-04T10:00', resultado: 'ok', mensaje: '1 aviso nuevo, 1 material, 1 fecha' });
  });
  it('la segunda vez no descarga ni pregunta nada', async () => {
    await revisarAula(deps());
    let preguntas = 0;
    await revisarAula(deps({ preguntar: async () => (preguntas++, respuesta()) }));
    expect(preguntas).toBe(0);
  });
  it('con dudas sube de modelo y vuelve a empezar por haiku en la siguiente asignatura', async () => {
    const usados: Modelo[] = [];
    await revisarAula(deps({ preguntar: async (m) => (usados.push(m), m === 'opus' ? respuesta() : respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], duda: 'no lo sé' }] })) }));
    expect(usados).toEqual(['haiku', 'sonnet', 'opus']);
  });
  it('respuesta rota en haiku: pasa a sonnet', async () => {
    const usados: Modelo[] = [];
    await revisarAula(deps({ preguntar: async (m) => (usados.push(m), m === 'haiku' ? 'no sé' : respuesta()) }));
    expect(usados).toEqual(['haiku', 'sonnet']);
    expect(parseTareas((await leer('agenda/tareas.yaml'))!)).toHaveLength(1);
  });
  it('límite de uso: guarda avisos y materiales, y deja lo no leído en pendientes', async () => {
    const r = await revisarAula(deps({ preguntar: async () => { throw new LimiteClaude('límite'); } }));
    expect(r.resultado).toBe('ok');
    expect(parseAvisos(await leer('estudios/avisos.yaml'))[0].importante).toBe(false);
    const s = parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml'));
    expect(s.pendientes).toEqual([{ asignatura: 'calculo', avisos: ['moodle-hilo-555'], documentos: ['General/Planificación.pdf'], guia: false }]);
    // Al día siguiente se lee lo pendiente sin volver a descargar.
    let descargas = 0;
    const nav = navegadorFalso();
    await revisarAula(deps({ navegador: async () => ({ ...nav, descargar: async (...a) => (descargas++, nav.descargar(...a)) }) }));
    expect(descargas).toBe(0);
    expect(parseTareas((await leer('agenda/tareas.yaml'))!)).toHaveLength(1);
    expect(parseSincronizacionAula(await leer('estudios/aula-sincronizacion.yaml')).pendientes).toEqual([]);
  });
  it('sesión caducada: no toca nada más y deja el aviso de volver a entrar', async () => {
    const r = await revisarAula(deps({ navegador: async () => navegadorFalso({ sesion: false }) }));
    expect(r.resultado).toBe('necesita-entrar');
    expect(parseAvisos(await leer('estudios/avisos.yaml')).map((a) => a.id)).toEqual(['programa-entrar']);
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toBeNull();
    // Al volver a entrar, el aviso se quita solo.
    await revisarAula(deps());
    expect(parseAvisos(await leer('estudios/avisos.yaml')).map((a) => a.id)).toEqual(['moodle-hilo-555']);
  });
  it('sesión que caduca a mitad (SesionCaducada): igual que caducada, sin escribir lo cosechado', async () => {
    const nav = navegadorFalso();
    const r = await revisarAula(deps({ navegador: async () => ({ ...nav, pedirTexto: async () => { throw new SesionCaducada(); } }) }));
    expect(r.resultado).toBe('necesita-entrar');
    expect(await leer('agenda/tareas.yaml')).toBe('tareas: []\n');
  });
  it('página que no entiende: error y no borra ni marca nada', async () => {
    await revisarAula(deps());
    const antes = await leer('estudios/calculo/aula-virtual.yaml');
    const r = await revisarAula(deps({ navegador: async () => navegadorFalso({ estado: '{"section":[],"cm":[]}' }) }));
    expect(r.resultado).toBe('error');
    expect(await leer('estudios/calculo/aula-virtual.yaml')).toBe(antes);
  });
  it('my-context con cambios sin subir: no hace nada', async () => {
    const git = gitFalso({ limpio: async () => false });
    const r = await revisarAula(deps({ git }));
    expect(r).toEqual({ resultado: 'error', mensaje: 'my-context tiene cambios sin subir: lo intento más tarde' });
    expect(git.subidas).toEqual([]);
    expect(await leer('estudios/avisos.yaml')).toBeNull();
  });
  it('push rechazado: vuelve al remoto, aplica otra vez y sube', async () => {
    let intentos = 0;
    let vueltas = 0;
    const git = gitFalso({ subir: async () => (++intentos === 1 ? 'rechazado' : 'ok'), volverAlRemoto: async () => { vueltas++; } });
    const r = await revisarAula(deps({ git }));
    expect(r.resultado).toBe('ok');
    expect([intentos, vueltas]).toEqual([2, 1]);
  });
  it('fecha adelantada: aviso importante del programa', async () => {
    await revisarAula(deps({ preguntar: async () => respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], fecha: '2026-11-19', cita: 'el primer parcial', hora: null }] }) }));
    // nuevo aviso en el foro que lo adelanta
    const nav = navegadorFalso();
    await revisarAula(deps({
      navegador: async () => ({ ...nav, pedirTexto: async (u) => (u.includes('discuss.php?d=556') ? hilo : u.includes('forum/view') ? foro + '<a href="https://aula/mod/forum/discuss.php?d=556">Cambio</a>' : nav.pedirTexto(u)) }),
      preguntar: async () => respuesta({ fechas: [{ ...JSON.parse(respuesta()).fechas[0], fuente: 'moodle-hilo-556' }], avisos: [{ id: 'moodle-hilo-556', importante: true }] }),
    }));
    const avisos = parseAvisos(await leer('estudios/avisos.yaml'));
    expect(avisos.some((a) => a.id.startsWith('programa-') && a.titulo.includes('se adelanta'))).toBe(true);
  });
  it('guía docente como etiqueta: descarga su PDF, Claude la resume y se escribe guia-docente.md (una sola vez)', async () => {
    const conGuia = JSON.stringify({
      section: [{ id: '10', title: 'General', cmlist: ['100', '107'] }],
      cm: [
        { id: '100', name: 'Novedades', module: 'forum', url: 'https://aula/mod/forum/view.php?id=100' },
        { id: '107', name: 'Guía docente', module: 'label' },
      ],
    });
    const nav = navegadorFalso({ estado: conGuia });
    const pedidas: string[] = [];
    const navGuia: Navegador = {
      ...nav,
      pedirTexto: async (u) => (u.includes('/course/view.php') ? '<li id="module-107"><a href="https://aula/pluginfile.php/1/mod_label/intro/Guia.pdf">Guía</a></li>' : nav.pedirTexto(u)),
      descargar: async (u) => (pedidas.push(u), { bytes: new TextEncoder().encode('Examen final 60 %. Parciales 40 %.'), nombre: 'Guia.pdf' }),
    };
    let conGuiaPedida = 0;
    const preguntar = async (_m: Modelo, texto: string) => {
      if (texto.includes('guía docente: escribe también')) conGuiaPedida++;
      return respuesta({ evaluacion: '- Examen final: 60 %\n- Parciales: 40 %' });
    };
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(pedidas).toEqual(['https://aula/pluginfile.php/1/mod_label/intro/Guia.pdf']);
    const md = await leer('estudios/calculo/guia-docente.md');
    expect(md).toContain('## Evaluación\n\n- Examen final: 60 %');
    expect(md).toContain('Examen final 60 %. Parciales 40 %.');
    expect(await leer('estudios/calculo/aula-virtual/guia-docente.pdf')).toBe('Examen final 60 %. Parciales 40 %.');
    // Mismo texto al día siguiente: no se vuelve a mandar a Claude.
    await revisarAula(deps({ navegador: async () => navGuia, preguntar }));
    expect(conGuiaPedida).toBe(1);
  });
});
```
Run: `npx vitest run local/aula/revision.test.ts` → FAIL.

- [ ] **Step 2: `git.ts`**

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
export interface Git {
  limpio(): Promise<boolean>;
  traer(): Promise<void>;
  subir(archivos: string[], mensaje: string): Promise<'ok' | 'rechazado'>;
  volverAlRemoto(): Promise<void>;
}

export function crearGit(carpeta: string): Git {
  const git = (...args: string[]) => ejecutar('git', args, { cwd: carpeta, windowsHide: true });
  const limpio = async () => (await git('status', '--porcelain', '--untracked-files=no')).stdout.trim() === '';
  return {
    limpio,
    traer: async () => void (await git('pull', '--rebase', '--quiet')),
    async subir(archivos, mensaje) {
      await git('add', '--', ...archivos);
      try {
        await git('diff', '--cached', '--quiet');
        return 'ok'; // nada que subir
      } catch {
        // hay cambios preparados
      }
      await git('commit', '--quiet', '-m', mensaje);
      try {
        await git('push', '--quiet');
        return 'ok';
      } catch {
        return 'rechazado';
      }
    },
    // Solo deshace el commit del programa: antes se comprobó que my-context estaba limpio.
    async volverAlRemoto() {
      if (!(await limpio())) throw new Error('my-context ha cambiado mientras revisaba: lo intento más tarde');
      await git('fetch', '--quiet');
      await git('reset', '--hard', '--quiet', '@{u}');
    },
  };
}
```

- [ ] **Step 3: `revision.ts`**

```ts
// Una revisión del aula virtual (spec §3-§9). La llama el programador (una vez al día) o «Revisar ahora».
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseAsignaturas, type Asignatura } from '../../src/datos/asignaturas.ts';
import { parseAulaVirtual, serializarAulaVirtual, type AulaVirtual, type TipoMaterial } from '../../src/datos/aulaVirtual.ts';
import { parseAvisos, serializarAvisos, type Aviso } from '../../src/datos/avisos.ts';
import { escribirGuia } from '../../src/datos/guia.ts';
import { carpetaMateriales, RUTA_ASIGNATURAS, RUTA_AULA_SINCRONIZACION, RUTA_AVISOS, RUTA_TAREAS, rutaAulaVirtual, rutaGuiaDocente } from '../../src/datos/rutas.ts';
import { parseTareas, serializarTareas } from '../../src/datos/tareas.ts';
import { anadirAvisos, avisoEntrar, avisoPrograma, ID_ENTRAR, limpiarAvisos, quitarAviso } from '../../src/uni/aula/avisos.ts';
import { parseSincronizacionAula, serializarSincronizacionAula, type Pendiente, type ResultadoRevision, type SincronizacionAula } from '../../src/uni/aula/estado.ts';
import { decidir, leerRespuesta, MODELOS, necesitaMas, textoPregunta, type AvisoNuevo, type FuenteTexto, type Modelo, type Pregunta, type RespuestaClaude } from '../../src/uni/aula/fechas.ts';
import { construirLista, esDocumentoDeFechas, LIMITE_BYTES, nombreSeguro, nuevosMateriales, tipoDeArchivo, type Descargado } from '../../src/uni/aula/materiales.ts';
import { cursoDeAsignatura, enlaceGuia, foroDeAvisos, leerCarpeta, leerContenido, leerCursos, leerForo, leerHilo, leerSesskey, moduloGuia, SesionCaducada, type ContenidoCurso, type ModuloAula } from '../../src/uni/aula/paginas.ts';
import { fusionar } from '../../src/uni/fusionar.ts';
import { enMadrid, hoyEnMadrid } from '../../src/uni/hora.ts';
import { ErrorFormato, type Propuesta } from '../../src/uni/tipos.ts';
import { LimiteClaude } from './claude.ts';
import type { Git } from './git.ts';
import { BASE_AULA, type Navegador } from './navegador.ts';

export interface Dependencias {
  carpeta: string;
  ahora: Date;
  navegador(): Promise<Navegador>;
  preguntar(modelo: Modelo, texto: string): Promise<string>;
  textoDe(bytes: Uint8Array, nombre: string): Promise<string | null>;
  git: Git;
}
export interface ResumenRevision { resultado: ResultadoRevision; mensaje: string }

// Lo que se trae de una asignatura antes de escribir nada en los archivos que se suben.
interface Cosecha {
  asignatura: Asignatura;
  lista: AulaVirtual;
  materialesVistos: string[];
  avisos: Aviso[];               // nuevos, ya con `importante` de Claude si lo leyó
  avisosVistos: string[];
  guia?: { huella: string; texto: string; evaluacion?: string };
  respuesta?: RespuestaClaude;
  pregunta?: Pregunta;
  pendiente?: Pendiente;
}

const ruta = (d: Dependencias, r: string) => path.join(d.carpeta, ...r.split('/'));
async function leer(d: Dependencias, r: string): Promise<string | null> {
  try {
    return await readFile(ruta(d, r), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
async function escribir(d: Dependencias, r: string, texto: string): Promise<void> {
  await mkdir(path.dirname(ruta(d, r)), { recursive: true });
  await writeFile(ruta(d, r), texto);
}
const huella = (t: string) => createHash('sha1').update(t).digest('hex');
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export async function revisarAula(d: Dependencias): Promise<ResumenRevision> {
  if (!(await d.git.limpio())) return { resultado: 'error', mensaje: 'my-context tiene cambios sin subir: lo intento más tarde' };
  await d.git.traer();
  const hoy = hoyEnMadrid(d.ahora);
  const asignaturas = parseAsignaturas((await leer(d, RUTA_ASIGNATURAS)) ?? '').filter((a) => a.codigo);
  const sinc = parseSincronizacionAula(await leer(d, RUTA_AULA_SINCRONIZACION));

  let cosechas: Cosecha[] | 'necesita-entrar';
  try {
    cosechas = await cosechar(d, asignaturas, sinc, hoy);
  } catch (e) {
    if (e instanceof SesionCaducada) cosechas = 'necesita-entrar';
    else {
      const mensaje = e instanceof Error ? e.message : String(e);
      await aplicarYSubir(d, hoy, sinc, [], { resultado: 'error', mensaje }, false);
      return { resultado: 'error', mensaje };
    }
  }
  if (cosechas === 'necesita-entrar') {
    const mensaje = 'La URJC ha cerrado la sesión: vuelve a entrar al aula virtual';
    await aplicarYSubir(d, hoy, sinc, [], { resultado: 'necesita-entrar', mensaje }, false);
    return { resultado: 'necesita-entrar', mensaje };
  }
  const mensaje = textoResumen(cosechas);
  await aplicarYSubir(d, hoy, sinc, cosechas, { resultado: 'ok', mensaje }, true);
  return { resultado: 'ok', mensaje };
}

function textoResumen(cs: Cosecha[]): string {
  const avisos = cs.reduce((n, c) => n + c.avisos.length, 0);
  const materiales = cs.reduce((n, c) => n + c.materialesVistos.length, 0);
  const fechas = cs.reduce((n, c) => n + (c.respuesta && c.pregunta ? decidir(c.respuesta, c.pregunta).propuestas.length : 0), 0);
  return [plural(avisos, 'aviso nuevo', 'avisos nuevos'), plural(materiales, 'material', 'materiales'), plural(fechas, 'fecha', 'fechas')].join(', ');
}

async function cosechar(d: Dependencias, asignaturas: Asignatura[], sinc: SincronizacionAula, hoy: string): Promise<Cosecha[]> {
  const nav = await d.navegador();
  try {
    if (!(await nav.sesionValida())) throw new SesionCaducada();
    const sesskey = leerSesskey(await nav.pedirTexto(`${BASE_AULA}/my/`));
    const cursos = leerCursos(await nav.ajax(sesskey, 'core_course_get_enrolled_courses_by_timeline_classification', { offset: 0, limit: 0, classification: 'all', sort: 'fullname' }));
    const textos = await leerTareasConocidas(d);
    const r: Cosecha[] = [];
    let sinClaude = false;
    for (const a of asignaturas) {
      const curso = cursoDeAsignatura(cursos, a.codigo!);
      if (!curso) continue;
      const contenido = leerContenido(await nav.ajax(sesskey, 'core_courseformat_get_state', { courseid: curso.id }));
      const c = await cosecharAsignatura(d, nav, a, curso.id, contenido, sinc, hoy, textos);
      if (c.pregunta && c.pregunta.fuentes.length) {
        if (sinClaude) c.pendiente = pendienteDe(c);
        else {
          try {
            c.respuesta = await preguntarConEscalado(d, c.pregunta);
            if (!c.respuesta) c.pendiente = pendienteDe(c);
          } catch (e) {
            if (!(e instanceof LimiteClaude)) throw e;
            sinClaude = true;
            c.pendiente = pendienteDe(c);
          }
        }
      }
      if (c.respuesta) {
        const imp = new Map(c.respuesta.avisos.map((x) => [x.id, x.importante]));
        c.avisos = c.avisos.map((av) => ({ ...av, importante: imp.get(av.id) ?? false }));
        if (c.guia && c.respuesta.evaluacion) c.guia.evaluacion = c.respuesta.evaluacion;
      }
      r.push(c);
    }
    return r;
  } finally {
    await nav.cerrar();
  }
}

async function leerTareasConocidas(d: Dependencias) {
  return parseTareas((await leer(d, RUTA_TAREAS)) ?? 'tareas: []\n');
}

// Haiku → Sonnet → Opus mientras haya dudas o la respuesta no se entienda. undefined: ninguno contestó bien.
async function preguntarConEscalado(d: Dependencias, p: Pregunta): Promise<RespuestaClaude | undefined> {
  const texto = textoPregunta(p);
  let ultima: RespuestaClaude | undefined;
  for (const m of MODELOS) {
    let r: RespuestaClaude;
    try {
      r = leerRespuesta(await d.preguntar(m, texto));
    } catch (e) {
      if (e instanceof LimiteClaude || !(e instanceof ErrorFormato)) throw e;
      continue;
    }
    ultima = r;
    if (!necesitaMas(r, p)) return r;
  }
  return ultima;
}

function pendienteDe(c: Cosecha): Pendiente {
  const fuentes = c.pregunta?.fuentes ?? [];
  return {
    asignatura: c.asignatura.id,
    avisos: fuentes.filter((f) => f.tipo === 'aviso').map((f) => f.id),
    documentos: fuentes.filter((f) => f.tipo === 'documento').map((f) => f.id),
    guia: fuentes.some((f) => f.tipo === 'guia'),
  };
}

async function cosecharAsignatura(
  d: Dependencias, nav: Navegador, a: Asignatura, idCurso: number, contenido: ContenidoCurso, sinc: SincronizacionAula, hoy: string,
  tareas: Awaited<ReturnType<typeof leerTareasConocidas>>,
): Promise<Cosecha> {
  const base = carpetaMateriales(a.id);
  const fuentes: FuenteTexto[] = [];
  const descargados = new Map<string, Descargado>();
  const materialesVistos: string[] = [];
  const guiaModulo = moduloGuia(contenido);

  for (const m of nuevosMateriales(contenido, new Set(sinc.vistos.materiales))) {
    materialesVistos.push(m.id);
    if (m.id === guiaModulo?.id) continue; // la guía va aparte
    const dir = nombreSeguro(m.seccion || 'General');
    if (m.tipo === 'resource') {
      const desc = await bajar(d, nav, `${BASE_AULA}/mod/resource/view.php?id=${m.id}&redirect=1`, `${base}/${dir}`);
      if (desc) {
        descargados.set(m.id, { archivo: `${dir}/${desc.nombre}`, tipo: tipoDeArchivo(desc.nombre) });
        if (esDocumentoDeFechas(m.nombre) || esDocumentoDeFechas(desc.nombre)) {
          const texto = desc.bytes ? await d.textoDe(desc.bytes, desc.nombre) : null;
          if (texto) fuentes.push({ id: `${dir}/${desc.nombre}`, tipo: 'documento', titulo: m.nombre, enlace: m.url, texto });
        }
      }
    } else if (m.tipo === 'folder' && m.url) {
      const sub = `${dir}/${nombreSeguro(m.nombre)}`;
      for (const f of leerCarpeta(await nav.pedirTexto(m.url))) await bajar(d, nav, f.url, `${base}/${sub}`, f.nombre);
      descargados.set(m.id, { archivo: sub, tipo: 'carpeta' });
    }
  }

  // Avisos: hilos nuevos del foro de avisos.
  const avisos: Aviso[] = [];
  const avisosVistos: string[] = [];
  const foro = foroDeAvisos(contenido);
  if (foro?.url) {
    const vistos = new Set(sinc.vistos.avisos);
    for (const h of leerForo(await nav.pedirTexto(foro.url))) {
      const id = `moodle-hilo-${h.id}`;
      if (vistos.has(id)) continue;
      const enlace = `${BASE_AULA}/mod/forum/discuss.php?d=${h.id}`;
      const msj = leerHilo(await nav.pedirTexto(enlace), h);
      avisosVistos.push(id);
      avisos.push({ id, asignatura: a.id, fecha: msj.fecha, titulo: msj.titulo, texto: msj.texto, importante: false, leido: false, enlace });
      fuentes.push({ id, tipo: 'aviso', titulo: msj.titulo, fecha: msj.fecha, enlace, texto: msj.texto });
    }
  }

  // Guía docente: se descarga cada vez (una por asignatura) y solo se manda a Claude si su texto cambió.
  let guia: Cosecha['guia'];
  if (guiaModulo) {
    // En la URJC la guía es una etiqueta con el PDF enlazado en la página del curso (Task 1, NOTAS.md).
    const url = guiaModulo.tipo === 'resource'
      ? `${BASE_AULA}/mod/resource/view.php?id=${guiaModulo.id}&redirect=1`
      : guiaModulo.tipo === 'label'
        ? enlaceGuia(await nav.pedirTexto(`${BASE_AULA}/course/view.php?id=${idCurso}`), guiaModulo.id)
        : guiaModulo.url;
    const desc = url ? await bajar(d, nav, url, base, undefined, 'guia-docente') : null;
    const texto = desc?.bytes ? await d.textoDe(desc.bytes, desc.nombre) : null;
    if (texto && huella(texto) !== sinc.vistos.guias[a.id]) {
      guia = { huella: huella(texto), texto };
      fuentes.push({ id: 'guia-docente', tipo: 'guia', titulo: 'Guía docente', enlace: guiaModulo.url, texto });
    }
  }

  // Lo que quedó pendiente de otra vez (sin volver a descargar).
  for (const p of sinc.pendientes.filter((x) => x.asignatura === a.id)) {
    const todos = parseAvisos(await leer(d, RUTA_AVISOS));
    for (const id of p.avisos) {
      const av = todos.find((x) => x.id === id);
      if (av && !fuentes.some((f) => f.id === id)) fuentes.push({ id, tipo: 'aviso', titulo: av.titulo, fecha: av.fecha, enlace: av.enlace, texto: av.texto });
    }
    for (const doc of p.documentos) {
      if (fuentes.some((f) => f.id === doc)) continue;
      const bytes = await readFile(path.join(d.carpeta, ...base.split('/'), ...doc.split('/'))).catch(() => null);
      const texto = bytes ? await d.textoDe(new Uint8Array(bytes), doc) : null;
      if (texto) fuentes.push({ id: doc, tipo: 'documento', titulo: path.basename(doc), texto });
    }
    if (p.guia && !guia) {
      const md = await leer(d, rutaGuiaDocente(a.id));
      const texto = md?.split('## Guía completa')[1]?.trim();
      if (texto) {
        guia = { huella: huella(texto), texto };
        fuentes.push({ id: 'guia-docente', tipo: 'guia', titulo: 'Guía docente', texto });
      }
    }
  }

  const anterior = parseAulaVirtual(await leer(d, rutaAulaVirtual(a.id)), rutaAulaVirtual(a.id));
  const lista = construirLista(contenido, anterior, descargados, hoy);
  const conocidas = tareas
    .filter((t) => t.area === a.id && t.fecha && t.origen && t.fecha >= hoy)
    .map((t) => ({ origen: t.origen!, titulo: t.titulo, tipo: t.tipo, fecha: t.fecha!, ...(t.hora ? { hora: t.hora } : {}) }));
  const pregunta: Pregunta = { asignatura: a, hoy, conocidas, fuentes, conGuia: fuentes.some((f) => f.tipo === 'guia') };
  return { asignatura: a, lista, materialesVistos, avisos, avisosVistos, guia, pregunta };
}

// Descarga a `estudios/<id>/aula-virtual/...`. Los vídeos y lo de más de 50 MB no se bajan (quedan en la lista con su enlace).
async function bajar(d: Dependencias, nav: Navegador, url: string, carpeta: string, nombre?: string, renombrar?: string) {
  const r = await nav.descargar(url, LIMITE_BYTES);
  if ('demasiadoGrande' in r) return { nombre: nombreSeguro(r.nombre), bytes: null };
  const original = nombreSeguro(nombre ?? r.nombre);
  if (tipoDeArchivo(original) === 'video') return { nombre: original, bytes: null };
  const ext = path.extname(original);
  const final = renombrar ? `${renombrar}${ext}` : original;
  const destino = path.join(d.carpeta, ...carpeta.split('/'), final);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, r.bytes);
  return { nombre: final, bytes: r.bytes };
}

async function aplicarYSubir(
  d: Dependencias, hoy: string, sincInicial: SincronizacionAula, cosechas: Cosecha[],
  estado: { resultado: ResultadoRevision; mensaje: string }, completa: boolean,
): Promise<void> {
  const { fecha, hora } = enMadrid(d.ahora);
  for (let intento = 0; intento < 3; intento++) {
    const sinc = intento === 0 ? sincInicial : parseSincronizacionAula(await leer(d, RUTA_AULA_SINCRONIZACION));
    let avisos = parseAvisos(await leer(d, RUTA_AVISOS));
    let tareas = parseTareas((await leer(d, RUTA_TAREAS)) ?? 'tareas: []\n');
    const archivos = [RUTA_AULA_SINCRONIZACION, RUTA_AVISOS];
    const propuestas: Propuesta[] = [];
    const delPrograma: { asignatura?: string; aviso: AvisoNuevo }[] = [];
    const pendientes = sinc.pendientes.filter((p) => !cosechas.some((c) => c.asignatura.id === p.asignatura));

    for (const c of cosechas) {
      avisos = anadirAvisos(avisos, c.avisos);
      sinc.vistos.materiales = [...new Set([...sinc.vistos.materiales, ...c.materialesVistos])];
      sinc.vistos.avisos = [...new Set([...sinc.vistos.avisos, ...c.avisosVistos])];
      await escribir(d, rutaAulaVirtual(c.asignatura.id), serializarAulaVirtual(c.lista));
      archivos.push(rutaAulaVirtual(c.asignatura.id));
      if (c.pendiente) pendientes.push(c.pendiente);
      if (c.respuesta && c.pregunta) {
        const dec = decidir(c.respuesta, c.pregunta);
        propuestas.push(...dec.propuestas);
        delPrograma.push(...dec.avisos.map((aviso) => ({ asignatura: c.asignatura.id, aviso })));
        if (c.guia?.evaluacion) {
          await escribir(d, rutaGuiaDocente(c.asignatura.id), escribirGuia(c.asignatura.nombre, c.guia.evaluacion, c.guia.texto));
          archivos.push(rutaGuiaDocente(c.asignatura.id));
          sinc.vistos.guias[c.asignatura.id] = c.guia.huella;
        }
      }
    }

    if (propuestas.length) {
      const r = fusionar(tareas, sinc.vistos.fechas, propuestas, hoy);
      tareas = r.tareas;
      sinc.vistos.fechas = r.vistos;
      for (const x of r.adelantadas)
        delPrograma.push({ aviso: { titulo: `${x.titulo} se adelanta`, texto: `Pasa del ${x.antes} al ${x.ahora}. Míralo en la agenda.` } });
      await escribir(d, RUTA_TAREAS, serializarTareas(tareas));
      archivos.push(RUTA_TAREAS);
    }
    for (const p of delPrograma) avisos = [avisoPrograma(avisos, hoy, p.aviso.titulo, p.aviso.texto, p.asignatura), ...avisos];

    if (estado.resultado === 'necesita-entrar') avisos = anadirAvisos(avisos, [avisoEntrar(hoy)]);
    else if (estado.resultado === 'ok') avisos = quitarAviso(avisos, ID_ENTRAR);
    avisos = limpiarAvisos(avisos, hoy);

    sinc.pendientes = pendientes;
    sinc.estado = { ...sinc.estado, resultado: estado.resultado, mensaje: estado.mensaje, ...(completa ? { ultimaRevision: `${fecha}T${hora}` } : {}) };
    await escribir(d, RUTA_AVISOS, serializarAvisos(avisos));
    await escribir(d, RUTA_AULA_SINCRONIZACION, serializarSincronizacionAula(sinc));

    const res = await d.git.subir([...new Set(archivos)], `Aula virtual: ${estado.mensaje}`);
    if (res === 'ok') return;
    await d.git.volverAlRemoto();
  }
  throw new Error('no he podido subir los cambios del aula virtual después de 3 intentos');
}
```
Notas para quien implemente:
- `escribir` de `tareas.yaml` usa `serializarTareas`; si `propuestas` está vacío no se toca (`tareas.yaml` intacto en la prueba de sesión caducada).
- En la prueba de página no entendida, `leerContenido` lanza `ErrorFormato` dentro de `cosechar` → rama de error: no se escriben listas.
- `ultimaRevision` en hora de Madrid: `2026-10-04T08:00Z` → `2026-10-04T10:00`.
- Si alguna prueba de la Task 9 falla por un detalle de formato del resumen, se ajusta el código, no la prueba (salvo que la prueba contradiga el spec: entonces `Ruling:`).

Run: `npx vitest run local/aula` → PASS. Después `npm test` entero → PASS.

- [ ] **Step 4: Commit**

```bash
git add local/aula/git.ts local/aula/revision.ts local/aula/revision.test.ts
git commit -m "Aula virtual: revisión completa (materiales, avisos, guía, fechas con escalado, git)"
```

---

### Task 10: Programador, interruptor y rutas del programa local

**Files:**
- Create: `local/aula/programador.ts`, `local/aula/programador.test.ts`
- Modify: `local/servidor.ts`, `local/servidor.test.ts`, `local/principal.ts`, `src/estudio/tipos.ts`

**Interfaces:**
- Consumes: `revisarAula`, `crearGit`, `abrirNavegador`, `entrar`, `preguntarClaude`, `textoDe`, `parseSincronizacionAula`.
- Produces:
  ```ts
  // programador.ts
  export const HORAS_ENTRE_REVISIONES = 20;
  export function tocaRevisar(ultima: string | undefined, ahora: Date): boolean;   // ultima en hora de Madrid «AAAA-MM-DDTHH:MM»
  export interface Aula {
    estado(): Promise<{ activo: boolean; revisando: boolean; estado: EstadoAula }>;
    activar(activo: boolean): Promise<void>;
    revisarAhora(): Promise<void>;     // no espera a que acabe
    entrar(): Promise<boolean>;
    comprobar(): Promise<void>;        // la llama el temporizador cada hora
    ocupado(): boolean;
  }
  export function crearAula(o: { config: string; leerEstado(): Promise<EstadoAula>; revisar(): Promise<unknown>; entrar(): Promise<boolean>; ahora(): Date }): Aula;
  // servidor.ts: OpcionesServidor gana `aula?: Aula` y `materiales` sirve archivos de estudios/<id>/aula-virtual
  // Rutas: GET aula/estado · POST aula/activo {activo} · POST aula/revisar · POST aula/entrar · GET aula/material?asignatura=&archivo=
  ```

- [ ] **Step 1: Pruebas que fallan**

`local/aula/programador.test.ts`:
```ts
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearAula, tocaRevisar } from './programador.ts';

describe('cuándo revisar', () => {
  it('sin revisión o con más de 20 horas', () => {
    const ahora = new Date('2026-10-04T08:00:00Z'); // 10:00 en Madrid
    expect(tocaRevisar(undefined, ahora)).toBe(true);
    expect(tocaRevisar('2026-10-03T13:00', ahora)).toBe(true);   // 21 h
    expect(tocaRevisar('2026-10-03T15:00', ahora)).toBe(false);  // 19 h
  });
});

describe('interruptor y revisión', () => {
  it('apagado por defecto; encendido revisa cuando toca y no dos a la vez', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let revisiones = 0;
    let soltar: () => void = () => undefined;
    const aula = crearAula({
      config, ahora: () => new Date('2026-10-04T08:00:00Z'), leerEstado: async () => ({}), entrar: async () => true,
      revisar: () => new Promise<void>((r) => { revisiones++; soltar = r; }),
    });
    await aula.comprobar();
    expect(revisiones).toBe(0);
    await aula.activar(true);
    expect(JSON.parse(await readFile(config, 'utf8'))).toEqual({ activo: true });
    await aula.comprobar();
    await aula.comprobar();
    expect(revisiones).toBe(1);
    expect(aula.ocupado()).toBe(true);
    expect((await aula.estado()).revisando).toBe(true);
    soltar();
    await new Promise((r) => setTimeout(r, 0));
    expect(aula.ocupado()).toBe(false);
  });
  it('«Revisar ahora» revisa aunque no toque', async () => {
    const config = path.join(await mkdtemp(path.join(os.tmpdir(), 'aula-cfg-')), 'aula-virtual.json');
    let revisiones = 0;
    const aula = crearAula({ config, ahora: () => new Date(), leerEstado: async () => ({ ultimaRevision: '2099-01-01T00:00' }), entrar: async () => true, revisar: async () => void revisiones++ });
    await aula.activar(true);
    await aula.comprobar();
    await aula.revisarAhora();
    await new Promise((r) => setTimeout(r, 0));
    expect(revisiones).toBe(1);
  });
});
```

En `local/servidor.test.ts`: cambiar `expect(VERSION_PROGRAMA).toBe(4)` por `toBe(5)` (con comentario «… y desde la 5, el aula virtual») y añadir pruebas de las rutas con un `aula` falso:
```ts
it('aula virtual: estado, interruptor, revisar y material', async () => {
  // crear el servidor con `aula: { estado: async () => ({ activo: false, revisando: false, estado: {} }), activar: vi.fn(async () => undefined), revisarAhora: vi.fn(async () => undefined), entrar: async () => true, comprobar: async () => undefined, ocupado: () => false }`
  // GET aula/estado → 200 { activo: false, revisando: false, estado: {} }
  // POST aula/activo { activo: true } → activar(true)
  // POST aula/revisar → revisarAhora()
  // GET aula/material?asignatura=calculo&archivo=Tema%201/a.pdf → 200 con el contenido (crear antes estudios/calculo/aula-virtual/Tema 1/a.pdf)
  // GET aula/material?asignatura=calculo&archivo=../../secreto → 400
});
```
(Escribir la prueba entera siguiendo el patrón de las existentes en `local/servidor.test.ts`, que crean el servidor en un puerto libre y usan `fetch(\`${API}…\`)`.)

Run: `npx vitest run local` → FAIL.

- [ ] **Step 2: Implementación**

`local/aula/programador.ts`:
```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EstadoAula } from '../../src/uni/aula/estado.ts';
import { enMadrid } from '../../src/uni/hora.ts';

export const HORAS_ENTRE_REVISIONES = 20;

// Las horas van en hora de Madrid como texto «AAAA-MM-DDTHH:MM»: se comparan como si fueran UTC (la diferencia sale igual).
const minutos = (t: string) => Date.parse(`${t}:00Z`) / 60_000;
export function tocaRevisar(ultima: string | undefined, ahora: Date): boolean {
  if (!ultima || Number.isNaN(minutos(ultima))) return true;
  const { fecha, hora } = enMadrid(ahora);
  return minutos(`${fecha}T${hora}`) - minutos(ultima) >= HORAS_ENTRE_REVISIONES * 60;
}

export interface Aula {
  estado(): Promise<{ activo: boolean; revisando: boolean; estado: EstadoAula }>;
  activar(activo: boolean): Promise<void>;
  revisarAhora(): Promise<void>;
  entrar(): Promise<boolean>;
  comprobar(): Promise<void>;
  ocupado(): boolean;
}

export function crearAula(o: { config: string; leerEstado(): Promise<EstadoAula>; revisar(): Promise<unknown>; entrar(): Promise<boolean>; ahora(): Date }): Aula {
  let revisando = false;
  const leerActivo = async () => {
    try {
      return JSON.parse(await readFile(o.config, 'utf8')).activo === true;
    } catch {
      return false;
    }
  };
  const lanzar = () => {
    if (revisando) return;
    revisando = true;
    void o.revisar()
      .catch((e) => console.error(`Aula virtual: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => (revisando = false));
  };
  return {
    estado: async () => ({ activo: await leerActivo(), revisando, estado: await o.leerEstado().catch(() => ({})) }),
    async activar(activo) {
      await mkdir(path.dirname(o.config), { recursive: true });
      await writeFile(o.config, JSON.stringify({ activo }));
    },
    async revisarAhora() {
      lanzar();
    },
    entrar: () => o.entrar(),
    async comprobar() {
      if (revisando || !(await leerActivo())) return;
      if (tocaRevisar((await o.leerEstado().catch(() => ({}) as EstadoAula)).ultimaRevision, o.ahora())) lanzar();
    },
    ocupado: () => revisando,
  };
}
```

`local/servidor.ts`:
- `import type { Aula } from './aula/programador.ts';` y en `OpcionesServidor`: `aula?: Aula;`
- `TIPOS`: añadir `'.pdf': 'application/pdf'`.
- Rutas:
```ts
    'GET aula/estado': async (_req, res) => {
      if (!o.aula) throw new ErrorPeticion(404, 'No existe');
      enviarJson(res, 200, await o.aula.estado());
    },
    'POST aula/activo': async (req, res) => {
      if (!o.aula) throw new ErrorPeticion(404, 'No existe');
      await o.aula.activar((await leerJson(req)).activo === true);
      enviarJson(res, 200, { ok: true });
    },
    'POST aula/revisar': async (_req, res) => {
      if (!o.aula) throw new ErrorPeticion(404, 'No existe');
      await o.aula.revisarAhora();
      enviarJson(res, 200, { ok: true });
    },
    'POST aula/entrar': async (_req, res) => {
      if (!o.aula) throw new ErrorPeticion(404, 'No existe');
      enviarJson(res, 200, { ok: await o.aula.entrar() });
    },
    'GET aula/material': async (_req, res, url) => {
      const asig = asignaturaDe(url.searchParams.get('asignatura'));
      const archivo = rutaDentro(path.join(o.estudios, asig, 'aula-virtual'), url.searchParams.get('archivo') ?? '');
      if (!archivo) throw new ErrorPeticion(400, 'Ruta no válida');
      await enviarArchivo(res, archivo);
    },
```
- `ocupado` devuelve `activos.size > 0 || (o.aula?.ocupado() ?? false)` (así no se reinicia a mitad de una revisión).

`src/estudio/tipos.ts`: `export const VERSION_PROGRAMA = 5;`

`local/principal.ts`, antes de `crearServidor`:
```ts
import { readFile } from 'node:fs/promises';
import { parseSincronizacionAula } from '../src/uni/aula/estado.ts';
import { RUTA_AULA_SINCRONIZACION } from '../src/datos/rutas.ts';
import { preguntarClaude } from './aula/claude.ts';
import { crearGit } from './aula/git.ts';
import { abrirNavegador, entrar } from './aula/navegador.ts';
import { crearAula } from './aula/programador.ts';
import { revisarAula } from './aula/revision.ts';
import { textoDe } from './aula/texto.ts';

const carpetaPrograma = path.join(os.homedir(), '.segundo-cerebro');
const perfilAula = path.join(carpetaPrograma, 'navegador-aula');
const comando = { bin: process.env.CLAUDE_BIN ?? 'claude', previos: [] };
const instruccionesFechas = path.join(aqui, 'aula', 'instrucciones-fechas.md');
const aula = crearAula({
  config: path.join(carpetaPrograma, 'aula-virtual.json'),
  ahora: () => new Date(),
  leerEstado: async () => parseSincronizacionAula(await readFile(path.join(myContext, ...RUTA_AULA_SINCRONIZACION.split('/')), 'utf8').catch(() => null)).estado,
  entrar: () => entrar(perfilAula),
  revisar: async () => {
    const r = await revisarAula({
      carpeta: myContext, ahora: new Date(), navegador: () => abrirNavegador(perfilAula),
      preguntar: (modelo, texto) => preguntarClaude(comando, modelo, instruccionesFechas, texto, os.tmpdir()),
      textoDe, git: crearGit(myContext),
    });
    console.log(`Aula virtual: ${r.mensaje}`);
    // Tras volver a entrar, se revisa enseguida.
    return r;
  },
});
```
pasar `comando` y `aula` a `crearServidor({ …, comando, aula })`, y al final:
```ts
// Aula virtual: al arrancar (tras un minuto, para no frenar el arranque de Windows) y luego cada hora.
setTimeout(() => void aula.comprobar(), 60_000).unref();
setInterval(() => void aula.comprobar(), 60 * 60_000).unref();
```
En la ruta `POST aula/entrar`, si `entrar()` devuelve `true`, llamar también a `o.aula.revisarAhora()` (así el aviso de volver a entrar se quita enseguida).

Run: `npx vitest run local` y `npm test` → PASS. `npm run build` → sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add local src/estudio/tipos.ts
git commit -m "Aula virtual: revisión diaria, interruptor y rutas del programa local (programa v5)"
```

---

### Task 11: La app lee avisos y aula virtual; línea del Inicio

**Files:**
- Modify: `src/repositorio.ts`, `src/repositorio.test.ts`, `src/componentes/navegacion.ts`, `src/App.tsx`, `src/pantallas/Inicio.tsx`, `src/estilos.css`
- Create: `src/estado/aula.ts`, `src/componentes/LineaAvisos.tsx`, `src/componentes/LineaAvisos.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // repositorio.ts
  export function cargarAvisos(cfg: Config): Promise<Aviso[]>;
  export function leerAvisos(cfg: Config, ids: string[]): Promise<Aviso[]>;      // marca leídos y devuelve la lista nueva
  export function cargarAulaAsignatura(cfg: Config, id: string): Promise<{ aula: AulaVirtual | null; evaluacion: string | null }>;
  // estado/aula.ts
  export function useAvisos(): { avisos: Aviso[]; cargando: boolean; marcarLeidos(ids: string[]): Promise<void> };
  // navegacion.ts: Destino gana `aula?: boolean`
  // LineaAvisos.tsx
  export function LineaAvisos({ avisos, ir }: { avisos: Aviso[]; ir(d: Destino): void }): JSX.Element | null;
  ```

- [ ] **Step 1: Pruebas que fallan**

`src/componentes/LineaAvisos.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Aviso } from '../datos/avisos';
import { LineaAvisos } from './LineaAvisos';

const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, fecha: '2026-10-03', titulo: id, texto: 't', importante: true, leido: false, ...x });

describe('línea de avisos del Inicio', () => {
  it('solo cuenta los importantes sin leer', () => {
    const html = renderToString(<LineaAvisos avisos={[av('a'), av('b'), av('c', { leido: true }), av('d', { importante: false })]} ir={() => undefined} />);
    expect(html).toContain('2 avisos importantes de la uni');
  });
  it('singular', () => {
    expect(renderToString(<LineaAvisos avisos={[av('a')]} ir={() => undefined} />)).toContain('1 aviso importante de la uni');
  });
  it('sin importantes sin leer, nada', () => {
    expect(renderToString(<LineaAvisos avisos={[av('a', { leido: true })]} ir={() => undefined} />)).toBe('');
  });
});
```

En `src/repositorio.test.ts`, siguiendo cómo se simula GitHub en ese archivo, añadir:
- `cargarAvisos` sin archivo → `[]`; con archivo → la lista.
- `leerAvisos(cfg, ['a'])` escribe `avisos.yaml` con `leido: true` en `a` y respeta un aviso nuevo que el programa haya añadido entre medias (el `actualizarArchivo` parte del texto remoto).
- `cargarAulaAsignatura` sin archivos → `{ aula: null, evaluacion: null }`.

Run: `npx vitest run src/componentes/LineaAvisos.test.tsx src/repositorio.test.ts` → FAIL.

- [ ] **Step 2: Implementación**

`src/repositorio.ts`:
```ts
import { parseAulaVirtual, type AulaVirtual } from './datos/aulaVirtual';
import { marcarLeidos, parseAvisos, serializarAvisos, type Aviso } from './datos/avisos';
import { seccionEvaluacion } from './datos/guia';
// y RUTA_AVISOS, rutaAulaVirtual, rutaGuiaDocente en el import de './datos/rutas'

export async function cargarAvisos(cfg: Config): Promise<Aviso[]> {
  return parseAvisos(await leerOpcional(cfg, RUTA_AVISOS));
}

// Solo cambia `leido`: lo demás lo escribe el programa del PC y se respeta lo que haya añadido mientras tanto.
export async function leerAvisos(cfg: Config, ids: string[]): Promise<Aviso[]> {
  let r: Aviso[] = [];
  await actualizarArchivo(cfg, RUTA_AVISOS, (texto) => {
    r = marcarLeidos(parseAvisos(texto), ids);
    return serializarAvisos(r);
  }, ids.length === 1 ? 'Aviso leído' : `${ids.length} avisos leídos`);
  return r;
}

export async function cargarAulaAsignatura(cfg: Config, id: string): Promise<{ aula: AulaVirtual | null; evaluacion: string | null }> {
  const [lista, guia] = await Promise.all([leerOpcional(cfg, rutaAulaVirtual(id)), leerOpcional(cfg, rutaGuiaDocente(id))]);
  return { aula: parseAulaVirtual(lista, rutaAulaVirtual(id)), evaluacion: seccionEvaluacion(guia) };
}
```

`src/estado/aula.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import type { Aviso } from '../datos/avisos';
import { cargarAvisos, leerAvisos } from '../repositorio';
import { useDatos } from './datos';

// Avisos de la uni: se leen al abrir la pantalla y al volver a la app. Si fallan, no molestan (la línea no sale).
export function useAvisos(): { avisos: Aviso[]; cargando: boolean; marcarLeidos(ids: string[]): Promise<void> } {
  const { config, estado } = useDatos();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState(true);

  const traer = useCallback(async () => {
    if (!config || estado !== 'listo') return;
    try {
      setAvisos(await cargarAvisos(config));
    } catch {
      // sin conexión o archivo roto: se queda lo que había
    } finally {
      setCargando(false);
    }
  }, [config, estado]);

  useEffect(() => {
    void traer();
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [traer]);

  const marcarLeidos = useCallback(async (ids: string[]) => {
    if (!config || !ids.length) return;
    setAvisos((as) => as.map((a) => (ids.includes(a.id) ? { ...a, leido: true } : a)));
    try {
      setAvisos(await leerAvisos(config, ids));
    } catch {
      await traer();
    }
  }, [config, traer]);

  return { avisos, cargando, marcarLeidos };
}
```

`src/componentes/LineaAvisos.tsx`:
```tsx
import { importantesSinLeer, type Aviso } from '../datos/avisos';
import type { Destino } from './navegacion';

// Una sola línea en el Inicio, solo si hay avisos importantes sin leer (spec §8).
export function LineaAvisos({ avisos, ir }: { avisos: Aviso[]; ir(d: Destino): void }) {
  const n = importantesSinLeer(avisos).length;
  if (n === 0) return null;
  return (
    <button className="linea-avisos" onClick={() => ir({ pantalla: 'estudio', aula: true })}>
      📣 {n === 1 ? '1 aviso importante de la uni' : `${n} avisos importantes de la uni`} →
    </button>
  );
}
```

`src/componentes/navegacion.ts`: en `Destino`, `aula?: boolean; // Estudio: abrir la sección Aula virtual con todos los avisos`.

`src/App.tsx`: `{actual === 'estudio' && <Estudio key={visita} aulaInicial={destino.aula === true} />}`.

`src/pantallas/Inicio.tsx`: `const { avisos } = useAvisos();` y justo debajo de `<Captura />`: `<LineaAvisos avisos={avisos} ir={ir} />`.

`src/estilos.css`:
```css
.linea-avisos { display: block; width: 100%; text-align: left; margin: 0 0 16px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--borde); background: var(--aviso); font-weight: 600; }
```
(`Estudio` todavía no tiene la prop `aulaInicial`: se añade en la Task 12; para que compile en esta tarea, declararla ya en `Estudio` como `{ aulaInicial = false }: { aulaInicial?: boolean }` sin usarla.)

Run: `npx vitest run` → PASS; `npm run build` → sin errores.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "Aula virtual en la app: leer avisos y línea discreta en el Inicio"
```

---

### Task 12: Estudio → «Aula virtual» (avisos, materiales, evaluación)

**Files:**
- Create: `src/componentes/estudio/AulaVirtual.tsx`, `src/componentes/estudio/AulaVirtual.test.tsx`
- Modify: `src/pantallas/Estudio.tsx`, `src/estudio/local.ts`, `src/estilos.css`

**Interfaces:**
- Consumes: `useAvisos`, `cargarAulaAsignatura`, `useLocal`, `GENERAL`.
- Produces:
  ```ts
  // local.ts
  export const urlMaterial: (asignatura: string, archivo: string) => string;
  // AulaVirtual.tsx
  export function AulaVirtual(p: { asignatura: Asignatura; enPc: boolean }): JSX.Element;
  export function ListaAvisos(p: { avisos: Aviso[]; asignaturas: Asignatura[]; marcar(ids: string[]): void }): JSX.Element;
  export function ListaMateriales(p: { aula: AulaVirtual | null; asignatura: string; enPc: boolean }): JSX.Element;
  ```

- [ ] **Step 1: Pruebas que fallan**

`src/componentes/estudio/AulaVirtual.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Aviso } from '../../datos/avisos';
import { ListaAvisos, ListaMateriales } from './AulaVirtual';

const asignaturas = [{ id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }];
const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, asignatura: 'calculo', fecha: '2026-10-03', titulo: `Título ${id}`, texto: 'Línea 1\nLínea 2', importante: false, leido: false, ...x });

describe('avisos', () => {
  it('más nuevos arriba, importantes destacados, con su asignatura y enlace', () => {
    const html = renderToString(<ListaAvisos avisos={[av('a', { fecha: '2026-10-01' }), av('b', { importante: true, enlace: 'https://x/b' })]} asignaturas={asignaturas} marcar={() => undefined} />);
    expect(html.indexOf('Título b')).toBeLessThan(html.indexOf('Título a'));
    expect(html).toContain('aviso importante');
    expect(html).toContain('Cálculo');
    expect(html).toContain('href="https://x/b"');
    expect(html).toContain('Marcar todos como leídos');
  });
  it('sin avisos', () => {
    expect(renderToString(<ListaAvisos avisos={[]} asignaturas={asignaturas} marcar={() => undefined} />)).toContain('No hay avisos');
  });
});

describe('materiales', () => {
  const aula = { actualizado: '2026-10-04', secciones: [{ nombre: 'Tema 1', materiales: [
    { id: '1', nombre: 'Apuntes', tipo: 'pdf' as const, enlace: 'https://x/1', archivo: 'Tema 1/Apuntes.pdf' },
    { id: '2', nombre: 'Viejo', tipo: 'pdf' as const, enlace: 'https://x/2', retirado: true },
  ] }] };
  it('en el PC abre el archivo descargado; fuera, el aula virtual', () => {
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc />)).toContain('api/local/aula/material?asignatura=calculo&amp;archivo=Tema+1%2FApuntes.pdf');
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc={false} />)).toContain('href="https://x/1"');
  });
  it('los retirados salen tachados', () => {
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc={false} />)).toContain('<s>Viejo</s>');
  });
  it('sin lista todavía', () => {
    expect(renderToString(<ListaMateriales aula={null} asignatura="calculo" enPc={false} />)).toContain('Todavía no hay materiales');
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implementación**

`src/estudio/local.ts`, añadir:
```ts
export const urlMaterial = (asignatura: string, archivo: string) => `${BASE}/aula/material?${consulta({ asignatura, archivo })}`;
```

`src/componentes/estudio/AulaVirtual.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { GENERAL, type Asignatura } from '../../datos/asignaturas';
import type { AulaVirtual as Lista } from '../../datos/aulaVirtual';
import type { Aviso } from '../../datos/avisos';
import { useAvisos } from '../../estado/aula';
import { useDatos } from '../../estado/datos';
import { urlMaterial } from '../../estudio/local';
import { formatoCorto } from '../../fechas';
import { cargarAulaAsignatura } from '../../repositorio';
import { Markdown } from '../Markdown';

type Pestana = 'avisos' | 'materiales' | 'evaluacion';
const ICONO: Record<string, string> = { pdf: '📄', presentacion: '📊', documento: '📝', carpeta: '📁', enlace: '🔗', video: '🎬', otro: '📎' };

export function ListaAvisos({ avisos, asignaturas, marcar }: { avisos: Aviso[]; asignaturas: Asignatura[]; marcar(ids: string[]): void }) {
  if (avisos.length === 0) return <p className="vacio">No hay avisos.</p>;
  const ordenados = [...avisos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const sinLeer = ordenados.filter((a) => !a.leido).map((a) => a.id);
  return (
    <>
      {sinLeer.length > 0 && <button className="enlace" onClick={() => marcar(sinLeer)}>Marcar todos como leídos</button>}
      <ul className="lista avisos">
        {ordenados.map((a) => {
          const asig = asignaturas.find((x) => x.id === a.asignatura);
          return (
            <li key={a.id} className={['aviso-uni', a.importante && 'importante', a.leido && 'leido'].filter(Boolean).join(' ')}>
              <div className="aviso-cabecera">
                {a.importante && <span className="etiqueta" aria-label="aviso importante">❗ aviso importante</span>}
                <strong>{a.titulo}</strong>
                <span className="detalle">{formatoCorto(a.fecha)}{asig ? ` · ${asig.nombre}` : ''}</span>
              </div>
              <p className="aviso-texto">{a.texto}</p>
              <div className="aviso-acciones">
                {a.enlace && <a href={a.enlace} target="_blank" rel="noreferrer">Abrir en el aula virtual</a>}
                {!a.leido && <button className="enlace" onClick={() => marcar([a.id])}>Marcar como leído</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ListaMateriales({ aula, asignatura, enPc }: { aula: Lista | null; asignatura: string; enPc: boolean }) {
  if (!aula || aula.secciones.length === 0) return <p className="vacio">Todavía no hay materiales: aparecen después de la primera revisión del aula virtual en el PC.</p>;
  return (
    <>
      {aula.secciones.map((s) => (
        <section key={s.nombre}>
          <h3 className="grupo">{s.nombre}</h3>
          <ul className="lista materiales">
            {s.materiales.map((m) => {
              const href = enPc && m.archivo && m.tipo !== 'carpeta' ? urlMaterial(asignatura, m.archivo) : m.enlace;
              const nombre = m.retirado ? <s>{m.nombre}</s> : m.nombre;
              return (
                <li key={m.id}>
                  <a href={href} target="_blank" rel="noreferrer">{ICONO[m.tipo] ?? '📎'} {nombre}</a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="detalle">Actualizado el {formatoCorto(aula.actualizado)}.</p>
    </>
  );
}

// Sección «Aula virtual» de Estudio. En «General» se ven los avisos de todas las asignaturas.
export function AulaVirtual({ asignatura, enPc }: { asignatura: Asignatura; enPc: boolean }) {
  const { config, datos } = useDatos();
  const { avisos, marcarLeidos } = useAvisos();
  const [pestana, setPestana] = useState<Pestana>('avisos');
  const [datosAula, setDatosAula] = useState<{ aula: Lista | null; evaluacion: string | null } | null>(null);
  const todas = asignatura.id === GENERAL.id;

  useEffect(() => {
    if (todas || !config) return;
    let vivo = true;
    cargarAulaAsignatura(config, asignatura.id).then((d) => vivo && setDatosAula(d)).catch(() => vivo && setDatosAula({ aula: null, evaluacion: null }));
    return () => {
      vivo = false;
    };
  }, [config, asignatura.id, todas]);

  const deEsta = todas ? avisos : avisos.filter((a) => a.asignatura === asignatura.id || !a.asignatura);
  return (
    <div className="aula-virtual">
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'avisos'} className={pestana === 'avisos' ? 'activa' : ''} onClick={() => setPestana('avisos')}>📣 Avisos</button>
        {!todas && <button role="tab" aria-selected={pestana === 'materiales'} className={pestana === 'materiales' ? 'activa' : ''} onClick={() => setPestana('materiales')}>📚 Materiales</button>}
        {!todas && <button role="tab" aria-selected={pestana === 'evaluacion'} className={pestana === 'evaluacion' ? 'activa' : ''} onClick={() => setPestana('evaluacion')}>🎯 Evaluación</button>}
      </div>
      {pestana === 'avisos' && <ListaAvisos avisos={deEsta} asignaturas={datos.asignaturas} marcar={(ids) => void marcarLeidos(ids)} />}
      {pestana === 'materiales' && !todas && (datosAula ? <ListaMateriales aula={datosAula.aula} asignatura={asignatura.id} enPc={enPc} /> : <p className="cargando">Cargando…</p>)}
      {pestana === 'evaluacion' && !todas && (datosAula?.evaluacion ? <Markdown texto={datosAula.evaluacion} /> : <p className="vacio">Todavía no hay resumen de la guía docente.</p>)}
    </div>
  );
}
```
(Comprobar la interfaz real de `src/componentes/Markdown.tsx` —nombre de la prop— y usarla.)

`src/pantallas/Estudio.tsx`:
- Prop `{ aulaInicial = false }: { aulaInicial?: boolean }`.
- Estado `const [vista, setVista] = useState<'chat' | 'aula'>(aulaInicial ? 'aula' : 'chat');` y, si `aulaInicial`, empezar en `GENERAL` (`useState(() => (aulaInicial ? GENERAL.id : leerPreferencia(CLAVE) ?? GENERAL.id))`).
- Tras `PestanasAsignaturas`, si `asignatura.codigo || asignatura.id === GENERAL.id`:
```tsx
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={vista === 'chat'} className={vista === 'chat' ? 'activa' : ''} onClick={() => setVista('chat')}>💬 Chat y pizarras</button>
        <button role="tab" aria-selected={vista === 'aula'} className={vista === 'aula' ? 'activa' : ''} onClick={() => setVista('aula')}>🎓 Aula virtual</button>
      </div>
```
- Si `vista === 'aula'`: `<AulaVirtual key={asignatura.id} asignatura={asignatura} enPc={local.estado === 'si'} />` en lugar de lo de abajo (chat/historial). Si la asignatura no tiene `codigo` ni es General, siempre `chat`.

`src/estilos.css`:
```css
.aula-virtual .avisos li { border-bottom: 1px solid var(--borde); padding: 10px 0; }
.aviso-uni.importante { border-left: 3px solid var(--peligro); padding-left: 10px; }
.aviso-uni.leido { opacity: 0.6; }
.aviso-cabecera { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; }
.aviso-texto { white-space: pre-line; margin: 6px 0; }
.aviso-acciones { display: flex; gap: 14px; font-size: 14px; }
.etiqueta { font-size: 12px; color: var(--peligro); font-weight: 600; }
.materiales li { padding: 4px 0; }
```
Run: `npx vitest run` y `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "Aula virtual en Estudio: avisos, materiales por temas y evaluación"
```

---

### Task 13: Ajustes → «Aula virtual» (solo en el PC)

**Files:**
- Create: `src/componentes/AjustesAula.tsx`, `src/componentes/AjustesAula.test.tsx`
- Modify: `src/estudio/local.ts`, `src/estudio/localVersion.test.ts`, `src/pantallas/Ajustes.tsx`

**Interfaces:**
- Produces:
  ```ts
  // local.ts
  export interface EstadoAulaLocal { activo: boolean; revisando: boolean; estado: { ultimaRevision?: string; resultado?: 'ok' | 'necesita-entrar' | 'error'; mensaje?: string } }
  export const estadoAula: () => Promise<EstadoAulaLocal>;
  export const activarAula: (activo: boolean) => Promise<{ ok: true }>;
  export const revisarAula: () => Promise<{ ok: true }>;
  export const entrarAula: () => Promise<{ ok: boolean }>;
  // AjustesAula.tsx
  export function TextoEstadoAula({ e }: { e: EstadoAulaLocal }): JSX.Element;
  export function AjustesAula(): JSX.Element | null;   // null si el programa local no está
  ```

- [ ] **Step 1: Pruebas que fallan**

`src/componentes/AjustesAula.test.tsx`:
```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TextoEstadoAula } from './AjustesAula';

describe('estado del aula virtual en Ajustes', () => {
  it('última revisión con su resumen', () => {
    const html = renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: { ultimaRevision: '2026-10-04T09:12', resultado: 'ok', mensaje: '3 avisos nuevos, 2 materiales, 1 fecha' } }} />);
    expect(html).toContain('Última revisión: 4 oct · 09:12');
    expect(html).toContain('3 avisos nuevos, 2 materiales, 1 fecha');
  });
  it('revisando, sin revisión y necesita entrar', () => {
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: true, estado: {} }} />)).toContain('Revisando el aula virtual…');
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: {} }} />)).toContain('Todavía no ha revisado');
    expect(renderToString(<TextoEstadoAula e={{ activo: true, revisando: false, estado: { resultado: 'necesita-entrar', mensaje: 'x' } }} />)).toContain('Vuelve a entrar');
  });
});
```
En `src/estudio/localVersion.test.ts`, añadir: `estadoAula()` con `fetch` simulado devuelve el JSON; `activarAula(true)` hace `POST` a `aula/activo` con `{"activo":true}`.

Run → FAIL.

- [ ] **Step 2: Implementación**

`src/estudio/local.ts`:
```ts
export interface EstadoAulaLocal { activo: boolean; revisando: boolean; estado: { ultimaRevision?: string; resultado?: 'ok' | 'necesita-entrar' | 'error'; mensaje?: string } }
export const estadoAula = () => pedir<EstadoAulaLocal>('aula/estado');
export const activarAula = (activo: boolean) => pedir<{ ok: true }>('aula/activo', enviarJson({ activo }));
export const revisarAula = () => pedir<{ ok: true }>('aula/revisar', { method: 'POST' });
export const entrarAula = () => pedir<{ ok: boolean }>('aula/entrar', { method: 'POST' });
```

`src/componentes/AjustesAula.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'react';
import { activarAula, entrarAula, estadoAula, revisarAula, type EstadoAulaLocal } from '../estudio/local';
import { useLocal } from '../estudio/useLocal';
import { formatoCorto } from '../fechas';

export function TextoEstadoAula({ e }: { e: EstadoAulaLocal }) {
  if (e.revisando) return <p>Revisando el aula virtual…</p>;
  const s = e.estado;
  return (
    <>
      {s.resultado === 'necesita-entrar' && <p className="banner aviso">Vuelve a entrar en el aula virtual: la URJC ha cerrado la sesión.</p>}
      {s.resultado === 'error' && s.mensaje && <p className="banner error">La última revisión falló: {s.mensaje}</p>}
      <p>
        {s.ultimaRevision
          ? <>Última revisión: {formatoCorto(s.ultimaRevision.slice(0, 10))} · {s.ultimaRevision.slice(11, 16)}{s.resultado === 'ok' && s.mensaje ? ` · ${s.mensaje}` : ''}</>
          : 'Todavía no ha revisado el aula virtual.'}
      </p>
    </>
  );
}

// Solo en la zona de estudio del PC (con el programa local abierto).
export function AjustesAula() {
  const local = useLocal();
  const [e, setE] = useState<EstadoAulaLocal | null>(null);
  const [entrando, setEntrando] = useState(false);
  const refrescar = useCallback(() => estadoAula().then(setE).catch(() => setE(null)), []);

  useEffect(() => {
    if (local.estado !== 'si') return;
    void refrescar();
    const t = setInterval(() => void refrescar(), 5000);
    return () => clearInterval(t);
  }, [local.estado, refrescar]);

  if (local.estado !== 'si' || !e) return null;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Aula virtual</h2>
      <label className="casilla">
        <input type="checkbox" checked={e.activo} onChange={(x) => void activarAula(x.target.checked).then(refrescar)} />
        Este ordenador revisa el aula virtual (una vez al día)
      </label>
      <TextoEstadoAula e={e} />
      <div className="botones">
        <button disabled={e.revisando || !e.activo} onClick={() => void revisarAula().then(refrescar)}>Revisar ahora</button>
        <button disabled={entrando} onClick={() => { setEntrando(true); void entrarAula().finally(() => { setEntrando(false); void refrescar(); }); }}>
          {entrando ? 'Esperando a que entres en la ventana…' : 'Entrar al aula virtual'}
        </button>
      </div>
      <p className="detalle">Se abre una ventana de Chrome aparte: entra como siempre y marca «No solicitar de nuevo el doble factor en este dispositivo». Tu contraseña no se guarda.</p>
    </section>
  );
}
```
(`formatoCorto('2026-10-04')` debe dar `4 oct`; si da otro formato, ajustar el texto esperado de la prueba al formato real de la app.)

`src/pantallas/Ajustes.tsx`: debajo de `{config && <ListaAreas />}`, `{config && <AjustesAula />}`.

Run: `npx vitest run` y `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "Aula virtual en Ajustes: interruptor, estado, revisar ahora y entrar"
```

---

### Task 14: Claude de la zona de estudio y documentación

**Files:**
- Modify: `local/instrucciones-estudio.md`, `docs/diseno.md`, `AGENTS.md`
- Modify (en `my-context`, con Diego al tanto): `.gitignore`, `AGENTS.md`

- [ ] **Step 1: Instrucciones de la zona de estudio**

En `local/instrucciones-estudio.md`, tras «Si hay apuntes de Diego en esta carpeta…», añadir:
```markdown
- Material del aula virtual de esta asignatura (si existe): `aula-virtual.yaml` (lista por temas, con el archivo de cada material), la carpeta `aula-virtual/` (los PDFs y presentaciones de los profes) y `guia-docente.md` (cómo se evalúa). Léelos solo si hacen falta para contestar (por ejemplo, «el ejercicio 3 del tema 2» o «cuánto cuenta el parcial»). Dile a Diego de qué archivo lo has sacado.
```
Comprobar que `--restricted` deja leer `estudios/<asignatura>/aula-virtual/` (está dentro del `cwd`): con el programa local abierto y un PDF de prueba en esa carpeta, preguntar en el chat de esa asignatura «¿qué hay en aula-virtual?». Apuntar el resultado en el registro.

- [ ] **Step 2: Formatos en `docs/diseno.md` (sección 3)**

Añadir subsecciones para `estudios/avisos.yaml`, `estudios/aula-sincronizacion.yaml` (lo escribe solo el programa local del PC), `estudios/<asignatura>/aula-virtual.yaml`, `estudios/<asignatura>/guia-docente.md`, y el `origen` `aula:<asignatura>:<clave>` en la tabla de `tareas.yaml`. Copiar los ejemplos de la sección 4 del spec.

- [ ] **Step 3: `AGENTS.md` de este repositorio**

- En «Estructura del código», una línea: `src/uni/aula/` y `local/aula/`: aula virtual (parte C). `local/aula/revision.ts` hace una revisión; `programador.ts`, cuándo; perfil del navegador en `~/.segundo-cerebro/navegador-aula/`, interruptor en `~/.segundo-cerebro/aula-virtual.json`. Prueba manual: `node scripts/aula-prueba.ts <codigo> --sin-entrar`.
- En «Estado actual», la línea de la parte C (se completa en la Task 15).

- [ ] **Step 4: `my-context` (avisar a Diego antes de subir)**

```bash
cd ../my-context && git pull
```
- `.gitignore`: añadir `estudios/*/aula-virtual/`.
- `AGENTS.md`, sección «Agenda», añadir:
  - `estudios/avisos.yaml`: avisos de los profes y del programa del PC. La app solo cambia `leido`. No los borres a mano salvo que Diego lo pida.
  - `estudios/aula-sincronizacion.yaml` y las tareas con `origen: aula:…` las escribe el programa del PC: no quites `origen`.
  - `estudios/<asignatura>/aula-virtual.yaml`, `guia-docente.md` y la carpeta `aula-virtual/` (solo en el PC): materiales y guía de cada asignatura. Úsalos cuando Diego pregunte por una asignatura.
```bash
git add .gitignore AGENTS.md && git commit -m "Aula virtual: materiales fuera de Git y formatos nuevos" && git push
```

- [ ] **Step 5: Commit (este repositorio)**

```bash
git add local/instrucciones-estudio.md docs/diseno.md AGENTS.md
git commit -m "Aula virtual: instrucciones de la zona de estudio y documentación"
```

---

### Task 15: Puesta en marcha con Diego

Con Diego delante (spec §13). No se delega.

- [ ] **Step 1: Revisión final del código** (`superpowers:requesting-code-review`, revisor nuevo, sobre toda la rama). Arreglar críticos e importantes con prueba; apuntar menores en el registro.

- [ ] **Step 2: Duración de la sesión.** Confirmar el resultado de la Task 1, Step 8. Si la sesión dura menos de un día, hablarlo con Diego antes de seguir.

- [ ] **Step 3: Primera revisión a mano.** Con el código en `main` en el PC (sin publicar todavía): `npm run local`, Ajustes → Aula virtual → encender el interruptor → «Revisar ahora». Mirar la consola: `Aula virtual: …`. Revisar con Diego en la app:
  - Estudio → Aula virtual: avisos de cada asignatura, materiales por temas (abrir un PDF desde el PC), evaluación.
  - Agenda: cada fecha `aula:` con su cita en las notas. **Diego comprueba cada fecha con el aula virtual.** Si alguna está mal, se corrige y se ajustan las instrucciones de Claude (`Ruling:`).
  - Inicio: la línea solo sale si hay avisos importantes sin leer.
  - Un PDF real con texto: `textoDe` lo lee (mirar `pendientes` vacío y que la fecha de un documento de planificación, si lo hay, llega).

- [ ] **Step 4: Publicar** (con el visto bueno de Diego): `git push` de este repositorio (GitHub Pages publica la app). La zona de estudio se reinicia sola con el código nuevo (programa v5).

- [ ] **Step 5: Cerrar**
  - `AGENTS.md` → «Estado actual»: línea de la parte C publicada (fecha, qué hay, registro, siguiente: horario de clases).
  - `my-context/proyectos/segundo-cerebro.md` → sustituir «Dónde lo dejamos» (solo el punto actual) y subir.
  - Registro: línea `Final:`.
  - Recordar a Diego: el interruptor solo en el PC (no en el portátil).
