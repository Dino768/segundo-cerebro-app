# Chats de estudio compartidos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diego comparte un chat de la zona de estudio con un botón ☁. A partir de ahí se sube solo a `my-context` en GitHub, se sigue en el otro ordenador (PC ↔ portátil) y se lee en el móvil y la web.

**Architecture:**
- El programa local (`local/`) solo maneja archivos del ordenador:
  - prepara el «paquete» de un chat (su `.jsonl` de Claude Code, la carpeta de sesión, las pizarras, las imágenes y `chat.json`), cambiando las rutas absolutas por marcas portables;
  - instala un paquete bajado de forma atómica;
  - hace copias de un chat;
  - guarda `compartidos.json`.
- La app del navegador sube y baja los paquetes con la API de GitHub y el token, en un commit por subida (API de árboles de Git).
- Una función pura decide qué hacer con cada chat al sincronizar.

**Tech Stack:** TypeScript, React 19, Vitest, Node sin compilar en `local/` (imports con `.ts`), API REST de GitHub.

**Spec:** `docs/superpowers/specs/2026-10-10-chats-compartidos-design.md`

## Global Constraints

- Coste 0 €. Nada nuevo que instalar, ni en el PC ni en el portátil.
- El programa local nunca usa Git ni GitHub para los chats. Solo la app, con el token de Ajustes (`useDatos().config`).
- Un chat solo se comparte si Diego toca «☁ Compartir». Desde ahí se sube solo después de cada respuesta de Claude y tras cambiar su pizarra.
- Carpeta en GitHub: `estudios/<asignatura>/chats/<id>/` con `chat.json`, `conversacion.jsonl`, `sesion/…`, `pizarra-N.json`, `pizarra-N.subida.json` e `imagenes/…`.
- En cada ordenador: `estudios/<asignatura>/.en-curso/compartidos.json` (no se sube; `.en-curso/` ya está en el `.gitignore` de `my-context`).
- Marcas de ruta: `{{MY_CONTEXT}}` (forma escapada en JSON) y `{{MY_CONTEXT_BARRAS}}` (con `/`). Solo en archivos `.json` y `.jsonl`.
- Mensaje de commit al subir: `Chat compartido: <asignatura> · <título>`. Al quitarlo: `Chat ya no compartido: <asignatura> · <título>`.
- 🗑 en un chat compartido lo borra en todos los dispositivos, con la ventana «Se borrará en todos tus dispositivos». «Dejar de compartir» lo deja solo en este ordenador.
- Si se usa a la vez en dos sitios: lo de GitHub gana y lo de aquí queda como chat nuevo no compartido, «<nombre> (copia de <dispositivo>)», con una ventana que lo explica.
- Más de 50 MB (50 000 000 bytes) en total: no se sube y se avisa.
- Móvil y web: solo lectura, en Estudio → «Chats compartidos» de cada asignatura.
- `VERSION_PROGRAMA` pasa de 5 a 6.
- Textos de la app en español sencillo; nada de `confirm()` ni `prompt()` (usar `src/estado/dialogos.ts`).
- Comandos: `export PATH="$PATH:/c/Program Files/nodejs";` delante. Pruebas: `npx vitest run <archivo>`. Todo: `npm test` y `npm run build`.

## Review Focus

1. **Diego dibuja en la pizarra de un chat compartido sin mandar mensaje y luego sigue en el otro ordenador.** El dibujo tiene que llegar. Es la subida diferida tras `operar` (Tarea 9, prueba de `crearSubidaDiferida`).
2. **El portátil tiene otro usuario de Windows o la letra de unidad en minúscula (`c:\…`).** Las rutas se cambian igual (Tarea 2, prueba «mayúsculas y otro usuario»).
3. **Diego cierra el navegador justo después de una respuesta, así que la subida no llegó a hacerse.** Al volver a abrir la lista de chats, se sube (Tarea 7 «pendiente y sin cambios en GitHub → subir»; Tarea 8 «sincronizar sube lo pendiente»).
4. **Toca ☁ en un chat nuevo sin mensajes.** El botón no aparece hasta que hay mensajes, y el programa local responde con un error claro si se pide igualmente (Tarea 3 «sin conversación falla»; Tarea 9 prueba del botón).
5. **Borra un chat compartido sin internet.** No se borra a medias: en local sigue estando y se ve el error (Tarea 8, prueba «borrarEnTodos sin red no toca lo local»).

---

### Task 1: Leer conversaciones también en el navegador

`leerConversacion`, `tituloConversacion` y `describirHerramienta` pasan a `src/estudio/conversacion.ts`, sin nada de Node, para que el móvil pueda leer un `.jsonl`.

**Files:**
- Create: `src/estudio/conversacion.ts`
- Create: `src/estudio/conversacion.test.ts`
- Modify: `local/conversaciones.ts` (quitar `textoDeDiego`, `leerConversacion` y `tituloConversacion`; importarlos y reexportarlos)
- Modify: `local/claude.ts:44-55` (quitar `describirHerramienta`; reexportarla)

**Interfaces:**
- Produces: `leerConversacion(texto: string): Mensaje[]`, `tituloConversacion(m: Mensaje[]): string` y `describirHerramienta(nombre: string, entrada: unknown): string`, en `src/estudio/conversacion.ts`. Las pruebas actuales de `local/` siguen importándolas desde `local/conversaciones.ts` y `local/claude.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/estudio/conversacion.test.ts
import { describe, expect, it } from 'vitest';
import { conContexto } from './contexto';
import { describirHerramienta, leerConversacion, tituloConversacion } from './conversacion';

const linea = (o: unknown) => JSON.stringify(o);

describe('conversacion (sin Node)', () => {
  it('lee un .jsonl de Claude Code con cabecera, herramientas y marcas de ruta', () => {
    const texto = [
      linea({ type: 'user', message: { content: conContexto({ asignatura: 'calculo', carpeta: '{{MY_CONTEXT}}\\estudios', pizarraAbierta: null, imagenes: ['{{MY_CONTEXT}}\\x\\imagenes\\captura-1.png'] }, 'Derivadas') } }),
      linea({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '{{MY_CONTEXT}}\\x\\pizarra-2.json' } }] } }),
      linea({ type: 'assistant', message: { content: [{ type: 'text', text: 'Mira.' }] } }),
    ].join('\n');
    const ms = leerConversacion(texto);
    expect(ms).toEqual([
      { rol: 'diego', texto: 'Derivadas', imagenes: ['captura-1.png'] },
      { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 2' },
      { rol: 'claude', texto: 'Mira.' },
    ]);
    expect(tituloConversacion(ms)).toBe('Derivadas');
  });
  it('describirHerramienta saca el nombre del archivo con \\ o con /', () => {
    expect(describirHerramienta('Read', { file_path: 'C:\\a\\apuntes.md' })).toBe('📖 Ha leído apuntes.md');
    expect(describirHerramienta('Read', { file_path: '/a/b/captura-1.png' })).toBe('👀 Ha mirado captura-1.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/estudio/conversacion.test.ts`
Expected: FAIL («Failed to resolve import "./conversacion"»).

- [ ] **Step 3: Write minimal implementation**

Crear `src/estudio/conversacion.ts`:
- Mover tal cual `textoDeDiego`, `leerConversacion` y `tituloConversacion` desde `local/conversaciones.ts`, cambiando los imports a `./contexto.ts` y `./tipos.ts`.
- Mover `describirHerramienta` desde `local/claude.ts`, cambiando solo cómo saca el nombre del archivo:

```ts
// Lectura de los .jsonl de Claude Code. Sin Node: la usan el programa local y la app (chats compartidos en el móvil).
import { sinContexto } from './contexto.ts';
import type { Mensaje } from './tipos.ts';

export function describirHerramienta(nombre: string, entrada: unknown): string {
  const e = (typeof entrada === 'object' && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const archivo = typeof e.file_path === 'string' ? (e.file_path.split(/[\\/]/).pop() ?? '') : '';
  const pizarra = /^pizarra-(\d+)\.json$/.exec(archivo);
  if ((nombre === 'Write' || nombre === 'Edit') && pizarra) return `✏️ Ha dibujado en la pizarra ${pizarra[1]}`;
  if (nombre === 'Write' || nombre === 'Edit') return `✏️ Ha escrito ${archivo}`;
  if (nombre === 'Read' && pizarra) return `👀 Ha mirado la pizarra ${pizarra[1]}`;
  if (nombre === 'Read' && /\.(png|jpe?g|webp|gif)$/i.test(archivo)) return `👀 Ha mirado ${archivo}`;
  if (nombre === 'Read') return `📖 Ha leído ${archivo}`;
  if (nombre === 'Glob' || nombre === 'Grep') return '🔎 Ha buscado en tus apuntes';
  return `🔧 ${nombre}`;
}

// … textoDeDiego, leerConversacion y tituloConversacion, copiados sin cambios …
```

En `local/conversaciones.ts`:
- Borrar esas tres funciones y el import de `describirHerramienta`.
- Poner `import { leerConversacion, tituloConversacion } from '../src/estudio/conversacion.ts';` y `export { leerConversacion, tituloConversacion };`. `sinContexto` deja de hacer falta; quitar el import si queda sin uso.

En `local/claude.ts`:
- Borrar la función.
- Poner `import { describirHerramienta } from '../src/estudio/conversacion.ts';` y `export { describirHerramienta };`, porque la usa el traductor de la línea 92.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/estudio/conversacion.test.ts local/conversaciones.test.ts local/claude.test.ts`
Expected: PASS (las pruebas antiguas siguen en verde).

- [ ] **Step 5: Commit**

```bash
git add src/estudio/conversacion.ts src/estudio/conversacion.test.ts local/conversaciones.ts local/claude.ts
git commit -m "Chats compartidos: leer conversaciones también en el navegador"
```

---

### Task 2: Rutas portables y cambio de id

**Files:**
- Create: `local/portable.ts`
- Test: `local/portable.test.ts`

**Interfaces:**
- Produces:
  - `aPortable(texto: string, raiz: string): string` y `dePortable(texto: string, raiz: string): string`. `raiz` es la ruta absoluta de `my-context` en ese ordenador.
  - `esTextoPortable(ruta: string): boolean`: `true` para `.json` y `.jsonl`.
  - `cambiarId(texto: string, viejo: string, nuevo: string): string`.
  - Constantes `MARCA = '{{MY_CONTEXT}}'` y `MARCA_BARRAS = '{{MY_CONTEXT_BARRAS}}'`.

- [ ] **Step 1: Write the failing test**

```ts
// local/portable.test.ts
import { describe, expect, it } from 'vitest';
import { aPortable, cambiarId, dePortable, esTextoPortable } from './portable.ts';

const PC = 'C:\\Users\\Diego\\Desktop\\my-context';
const PORTATIL = 'C:\\Users\\diego\\OneDrive\\Escritorio\\my-context';

describe('rutas portables', () => {
  it('ida y vuelta: la ruta escapada en JSON y la de barras pasan a la del otro ordenador', () => {
    const linea = JSON.stringify({ cwd: `${PC}\\estudios\\calculo`, nota: 'C:/Users/Diego/Desktop/my-context/estudios/x.png' });
    const portable = aPortable(linea, PC);
    expect(portable).not.toContain('Desktop');
    expect(portable).toContain('{{MY_CONTEXT}}\\\\estudios\\\\calculo');
    expect(portable).toContain('{{MY_CONTEXT_BARRAS}}/estudios/x.png');
    const enPortatil = JSON.parse(dePortable(portable, PORTATIL));
    expect(enPortatil.cwd).toBe(`${PORTATIL}\\estudios\\calculo`);
    expect(enPortatil.nota).toBe('C:/Users/diego/OneDrive/Escritorio/my-context/estudios/x.png');
  });
  it('mayúsculas y otro usuario: c:\\users\\diego… también se cambia', () => {
    const t = JSON.stringify({ cwd: 'c:\\users\\diego\\desktop\\my-context\\estudios' });
    expect(aPortable(t, PC)).toContain('{{MY_CONTEXT}}');
  });
  it('una ruta que no es la de my-context no se toca (tampoco my-context-2)', () => {
    const t = JSON.stringify({ a: `${PC}-2\\x`, b: 'C:\\Windows\\x' });
    expect(aPortable(t, PC)).toBe(t);
  });
  it('rutas de Linux/Mac', () => {
    const t = JSON.stringify({ cwd: '/home/diego/my-context/estudios' });
    expect(aPortable(t, '/home/diego/my-context')).toBe(JSON.stringify({ cwd: '{{MY_CONTEXT}}/estudios' }));
    expect(JSON.parse(dePortable('{"cwd":"{{MY_CONTEXT}}\\\\estudios"}', PC)).cwd).toBe(`${PC}\\estudios`);
  });
  it('solo .json y .jsonl', () => {
    expect(esTextoPortable('conversacion.jsonl')).toBe(true);
    expect(esTextoPortable('pizarra-1.json')).toBe(true);
    expect(esTextoPortable('imagenes/a.png')).toBe(false);
  });
  it('cambiarId cambia todas las apariciones', () => {
    expect(cambiarId('{"sessionId":"aaa"}\n{"sessionId":"aaa"}', 'aaa', 'bbb')).toBe('{"sessionId":"bbb"}\n{"sessionId":"bbb"}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run local/portable.test.ts`
Expected: FAIL (no existe `./portable.ts`).

- [ ] **Step 3: Write minimal implementation**

```ts
// local/portable.ts
// Los .jsonl de Claude Code llevan rutas absolutas de este ordenador. Para compartir un chat se cambian
// por marcas, y al instalarlo en otro ordenador por su propia ruta de my-context (spec §3.3).
export const MARCA = '{{MY_CONTEXT}}'; // la ruta tal y como va dentro de un texto JSON (\ escapadas)
export const MARCA_BARRAS = '{{MY_CONTEXT_BARRAS}}'; // la misma ruta con /

const enJson = (s: string) => JSON.stringify(s).slice(1, -1);
const conBarras = (s: string) => s.replace(/\\/g, '/');
const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Que no siga una letra, número, _ o - (así my-context-2 no cuenta).
const exacta = (s: string) => new RegExp(`${escaparRegex(s)}(?![\\w-])`, 'gi');

export function aPortable(texto: string, raiz: string): string {
  const json = enJson(raiz);
  const barras = conBarras(raiz);
  let t = texto.replace(exacta(json), MARCA);
  if (barras !== json) t = t.replace(exacta(barras), MARCA_BARRAS);
  return t;
}

export function dePortable(texto: string, raiz: string): string {
  return texto.split(MARCA_BARRAS).join(conBarras(raiz)).split(MARCA).join(enJson(raiz));
}

export const esTextoPortable = (ruta: string) => /\.jsonl?$/i.test(ruta);

export const cambiarId = (texto: string, viejo: string, nuevo: string) => texto.split(viejo).join(nuevo);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run local/portable.test.ts`
Expected: PASS. En la prueba de Linux, `json === barras`, así que todo queda como `{{MY_CONTEXT}}`.

- [ ] **Step 5: Commit**

```bash
git add local/portable.ts local/portable.test.ts
git commit -m "Chats compartidos: rutas portables entre ordenadores"
```

---

### Task 3: Paquete de un chat en el programa local

Preparar, instalar y copiar un chat, y guardar `compartidos.json`.

**Files:**
- Modify: `src/estudio/tipos.ts` (tipos compartidos)
- Create: `local/compartir.ts`
- Test: `local/compartir.test.ts`

**Interfaces:**
- Consumes: `aPortable`, `dePortable`, `esTextoPortable` y `cambiarId` (Tarea 2); `ponerNombre` y `leerNombres` (`local/conversaciones.ts`); `escribirAtomico` (`local/pizarras.ts`).
- Produces (en `src/estudio/tipos.ts`):

```ts
// Un archivo de un chat compartido: ruta relativa con / (p. ej. "imagenes/captura-1.png") y su contenido en base64.
export interface ArchivoPaquete { ruta: string; base64: string }
// chat.json de un chat compartido.
export interface InfoChat { nombre?: string; compartidoEl: string; actualizado: string; dispositivo: string }
// compartidos.json de cada ordenador. version: sha de la carpeta del chat en GitHub tras la última subida o bajada ('' = aún no subido).
export interface EntradaCompartido { version: string; pendiente: boolean; compartidoEl: string }
export type Compartidos = Record<string, EntradaCompartido>;
```

- Produces (en `local/compartir.ts`):
  - `interface LugarChat { carpetaClaude: string; cwd: string; raiz: string; id: string }`
  - `prepararPaquete(l: LugarChat, info: InfoChat): Promise<ArchivoPaquete[]>`
  - `instalarPaquete(l: LugarChat, archivos: ArchivoPaquete[]): Promise<InfoChat | null>`
  - `copiarChat(l: LugarChat, nuevoId: string, nombre: string): Promise<void>`
  - `leerCompartidos(cwd: string): Promise<Compartidos>`
  - `ponerCompartido(cwd: string, id: string, e: EntradaCompartido | null): Promise<void>`
  - `esRutaPaquete(ruta: string): boolean`
  - `tamanoPaquete(a: ArchivoPaquete[]): number` (bytes reales)

- [ ] **Step 1: Write the failing test**

```ts
// local/compartir.test.ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { copiarChat, esRutaPaquete, instalarPaquete, leerCompartidos, ponerCompartido, prepararPaquete, tamanoPaquete, type LugarChat } from './compartir.ts';
import { leerNombres, ponerNombre } from './conversaciones.ts';

const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const NUEVO = '11111111-2222-4333-8444-555555555555';
const b64 = (s: string) => Buffer.from(s).toString('base64');
const texto = (b: string) => Buffer.from(b, 'base64').toString('utf8');

function ordenador(nombre: string): LugarChat {
  const base = mkdtempSync(path.join(os.tmpdir(), `compartir-${nombre}-`));
  const raiz = path.join(base, 'my-context');
  const cwd = path.join(raiz, 'estudios', 'calculo');
  const carpetaClaude = path.join(base, 'casa', '.claude', 'projects', 'x');
  mkdirSync(cwd, { recursive: true });
  mkdirSync(carpetaClaude, { recursive: true });
  return { carpetaClaude, cwd, raiz, id: ID };
}
const info = { compartidoEl: '2026-10-10', actualizado: '2026-10-10T10:00:00.000Z', dispositivo: 'PC' };

function conChat(l: LugarChat) {
  writeFileSync(path.join(l.carpetaClaude, `${ID}.jsonl`), JSON.stringify({ sessionId: ID, cwd: l.cwd }) + '\n');
  mkdirSync(path.join(l.carpetaClaude, ID, 'subagents'), { recursive: true });
  writeFileSync(path.join(l.carpetaClaude, ID, 'subagents', 'a.jsonl'), JSON.stringify({ cwd: l.cwd }) + '\n');
  mkdirSync(path.join(l.cwd, '.en-curso', ID, 'imagenes'), { recursive: true });
  writeFileSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-1.json'), '{"version":1}');
  writeFileSync(path.join(l.cwd, '.en-curso', ID, 'imagenes', 'captura-1.png'), Buffer.from([1, 2, 3]));
}

describe('prepararPaquete', () => {
  it('junta conversación, sesión, pizarras, imágenes y chat.json, con rutas portables', async () => {
    const pc = ordenador('pc');
    conChat(pc);
    await ponerNombre(pc.cwd, ID, 'Derivadas');
    const p = await prepararPaquete(pc, info);
    expect(p.map((a) => a.ruta).sort()).toEqual(['chat.json', 'conversacion.jsonl', 'imagenes/captura-1.png', 'pizarra-1.json', 'sesion/subagents/a.jsonl']);
    const conv = texto(p.find((a) => a.ruta === 'conversacion.jsonl')!.base64);
    expect(conv).toContain('{{MY_CONTEXT}}');
    expect(conv).not.toContain(JSON.stringify(pc.raiz).slice(1, -1));
    expect(JSON.parse(texto(p.find((a) => a.ruta === 'chat.json')!.base64))).toEqual({ ...info, nombre: 'Derivadas' });
    expect(tamanoPaquete(p)).toBeGreaterThan(3);
  });
  it('sin conversación falla con un mensaje claro', async () => {
    await expect(prepararPaquete(ordenador('vacio'), info)).rejects.toThrow('Este chat aún no tiene mensajes');
  });
});

describe('instalarPaquete', () => {
  it('en otro ordenador queda con sus rutas, su nombre y sus pizarras', async () => {
    const pc = ordenador('pc2');
    conChat(pc);
    await ponerNombre(pc.cwd, ID, 'Derivadas');
    const paquete = await prepararPaquete(pc, info);
    const portatil = ordenador('portatil');
    expect(await instalarPaquete(portatil, paquete)).toMatchObject({ nombre: 'Derivadas', dispositivo: 'PC' });
    const conv = JSON.parse(readFileSync(path.join(portatil.carpetaClaude, `${ID}.jsonl`), 'utf8'));
    expect(conv.cwd).toBe(portatil.cwd);
    expect(existsSync(path.join(portatil.carpetaClaude, ID, 'subagents', 'a.jsonl'))).toBe(true);
    expect(readFileSync(path.join(portatil.cwd, '.en-curso', ID, 'imagenes', 'captura-1.png'))).toEqual(Buffer.from([1, 2, 3]));
    expect((await leerNombres(portatil.cwd))[ID]).toBe('Derivadas');
  });
  it('reemplaza lo que había (una pizarra borrada en el otro lado desaparece)', async () => {
    const l = ordenador('reemplazo');
    conChat(l);
    writeFileSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-2.json'), '{}');
    await instalarPaquete(l, [{ ruta: 'conversacion.jsonl', base64: b64('{}\n') }]);
    expect(existsSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-2.json'))).toBe(false);
  });
  it('un paquete con rutas peligrosas o sin conversación no toca nada', async () => {
    const l = ordenador('malo');
    conChat(l);
    await expect(instalarPaquete(l, [{ ruta: 'conversacion.jsonl', base64: b64('{}') }, { ruta: '../fuera.txt', base64: '' }])).rejects.toThrow();
    await expect(instalarPaquete(l, [{ ruta: 'pizarra-1.json', base64: b64('{}') }])).rejects.toThrow();
    expect(existsSync(path.join(l.carpetaClaude, `${ID}.jsonl`))).toBe(true);
    expect(existsSync(path.join(l.cwd, '.en-curso', ID, 'pizarra-1.json'))).toBe(true);
  });
  it('esRutaPaquete', () => {
    expect(esRutaPaquete('imagenes/captura-1.png')).toBe(true);
    for (const mala of ['../x', '/x', 'a//b', '.git/x', 'a\\b', '']) expect(esRutaPaquete(mala)).toBe(false);
  });
});

describe('copiarChat', () => {
  it('hace un chat nuevo con el id cambiado dentro y su nombre', async () => {
    const l = ordenador('copia');
    conChat(l);
    await copiarChat(l, NUEVO, 'Derivadas (copia de PC)');
    expect(readFileSync(path.join(l.carpetaClaude, `${NUEVO}.jsonl`), 'utf8')).toContain(NUEVO);
    expect(readFileSync(path.join(l.carpetaClaude, `${NUEVO}.jsonl`), 'utf8')).not.toContain(ID);
    expect(existsSync(path.join(l.cwd, '.en-curso', NUEVO, 'pizarra-1.json'))).toBe(true);
    expect((await leerNombres(l.cwd))[NUEVO]).toBe('Derivadas (copia de PC)');
  });
});

describe('compartidos.json', () => {
  it('guarda y quita entradas', async () => {
    const l = ordenador('lista');
    expect(await leerCompartidos(l.cwd)).toEqual({});
    await ponerCompartido(l.cwd, ID, { version: 'v1', pendiente: false, compartidoEl: '2026-10-10' });
    expect((await leerCompartidos(l.cwd))[ID].version).toBe('v1');
    await ponerCompartido(l.cwd, ID, null);
    expect(await leerCompartidos(l.cwd)).toEqual({});
  });
  it('un archivo roto se lee como vacío', async () => {
    const l = ordenador('roto');
    mkdirSync(path.join(l.cwd, '.en-curso'), { recursive: true });
    writeFileSync(path.join(l.cwd, '.en-curso', 'compartidos.json'), '{roto');
    expect(await leerCompartidos(l.cwd)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run local/compartir.test.ts`
Expected: FAIL (no existe `./compartir.ts`).

- [ ] **Step 3: Write minimal implementation**

Primero, añadir a `src/estudio/tipos.ts` los cuatro tipos de **Interfaces**, debajo de `ResumenConversacion`. Después:

```ts
// local/compartir.ts
// Paquete de un chat compartido (spec §3-§4). Solo archivos de este ordenador: GitHub lo hace la app.
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArchivoPaquete, Compartidos, EntradaCompartido, InfoChat } from '../src/estudio/tipos.ts';
import { leerNombres, ponerNombre } from './conversaciones.ts';
import { escribirAtomico } from './pizarras.ts';
import { aPortable, cambiarId, dePortable, esTextoPortable } from './portable.ts';

export interface LugarChat {
  carpetaClaude: string; // ~/.claude/projects/<cwd con guiones>
  cwd: string; // my-context/estudios/<asignatura>
  raiz: string; // my-context
  id: string;
}

const CONVERSACION = 'conversacion.jsonl';
const INFO = 'chat.json';
const SESION = 'sesion';

export const esRutaPaquete = (r: string) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/.test(r);
export const tamanoPaquete = (a: ArchivoPaquete[]) => a.reduce((t, x) => t + Buffer.byteLength(x.base64, 'base64'), 0);

// Rutas relativas (con /) de todos los archivos de una carpeta; [] si no existe.
async function archivosDe(carpeta: string, prefijo = ''): Promise<string[]> {
  let entradas;
  try {
    entradas = await readdir(carpeta, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entradas) {
    const rel = prefijo ? `${prefijo}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await archivosDe(path.join(carpeta, e.name), rel)));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

async function empaquetar(archivo: string, ruta: string, raiz: string): Promise<ArchivoPaquete> {
  const datos = await readFile(archivo);
  const contenido = esTextoPortable(ruta) ? Buffer.from(aPortable(datos.toString('utf8'), raiz), 'utf8') : datos;
  return { ruta, base64: contenido.toString('base64') };
}

export async function prepararPaquete(l: LugarChat, info: InfoChat): Promise<ArchivoPaquete[]> {
  const jsonl = path.join(l.carpetaClaude, `${l.id}.jsonl`);
  if (!existsSync(jsonl)) throw new Error('Este chat aún no tiene mensajes');
  const sesion = path.join(l.carpetaClaude, l.id);
  const curso = path.join(l.cwd, '.en-curso', l.id);
  const nombre = (await leerNombres(l.cwd))[l.id];
  const paquete: ArchivoPaquete[] = [await empaquetar(jsonl, CONVERSACION, l.raiz)];
  for (const r of await archivosDe(sesion)) paquete.push(await empaquetar(path.join(sesion, ...r.split('/')), `${SESION}/${r}`, l.raiz));
  for (const r of await archivosDe(curso)) paquete.push(await empaquetar(path.join(curso, ...r.split('/')), r, l.raiz));
  const completa: InfoChat = nombre ? { ...info, nombre } : info;
  paquete.push({ ruta: INFO, base64: Buffer.from(JSON.stringify(completa, null, 2) + '\n').toString('base64') });
  return paquete;
}

function leerInfo(base64: string | undefined): InfoChat | null {
  if (!base64) return null;
  try {
    const j = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return typeof j?.compartidoEl === 'string' && typeof j?.dispositivo === 'string' ? (j as InfoChat) : null;
  } catch {
    return null;
  }
}

// Se escribe todo en carpetas temporales y solo al final se cambia por lo que había (si algo falla, lo de antes se queda).
export async function instalarPaquete(l: LugarChat, archivos: ArchivoPaquete[]): Promise<InfoChat | null> {
  if (!archivos.some((a) => a.ruta === CONVERSACION)) throw new Error('El chat compartido no tiene conversación');
  for (const a of archivos) if (!esRutaPaquete(a.ruta)) throw new Error(`Ruta no válida en el chat compartido: ${a.ruta}`);
  const tmpClaude = path.join(l.carpetaClaude, `${l.id}.instalando`);
  const tmpCurso = path.join(l.cwd, '.en-curso', `${l.id}.instalando`);
  await rm(tmpClaude, { recursive: true, force: true });
  await rm(tmpCurso, { recursive: true, force: true });
  try {
    for (const a of archivos) {
      if (a.ruta === INFO) continue;
      const enClaude = a.ruta === CONVERSACION || a.ruta.startsWith(`${SESION}/`);
      const destino = path.join(enClaude ? tmpClaude : tmpCurso, ...a.ruta.split('/'));
      await mkdir(path.dirname(destino), { recursive: true });
      const datos = Buffer.from(a.base64, 'base64');
      await writeFile(destino, esTextoPortable(a.ruta) ? dePortable(datos.toString('utf8'), l.raiz) : datos);
    }
    await mkdir(tmpCurso, { recursive: true });
    await rm(path.join(l.carpetaClaude, `${l.id}.jsonl`), { force: true });
    await rm(path.join(l.carpetaClaude, l.id), { recursive: true, force: true });
    await rm(path.join(l.cwd, '.en-curso', l.id), { recursive: true, force: true });
    await rename(path.join(tmpClaude, CONVERSACION), path.join(l.carpetaClaude, `${l.id}.jsonl`));
    if (existsSync(path.join(tmpClaude, SESION))) await rename(path.join(tmpClaude, SESION), path.join(l.carpetaClaude, l.id));
    await rename(tmpCurso, path.join(l.cwd, '.en-curso', l.id));
  } finally {
    await rm(tmpClaude, { recursive: true, force: true });
    await rm(tmpCurso, { recursive: true, force: true });
  }
  const info = leerInfo(archivos.find((a) => a.ruta === INFO)?.base64);
  const antes = (await leerNombres(l.cwd))[l.id];
  if (info?.nombre) await ponerNombre(l.cwd, l.id, info.nombre);
  else if (antes !== undefined) await ponerNombre(l.cwd, l.id, '');
  return info;
}

async function copiarConId(origen: string, destino: string, viejo: string, nuevo: string): Promise<void> {
  await mkdir(path.dirname(destino), { recursive: true });
  if (esTextoPortable(origen)) await writeFile(destino, cambiarId(await readFile(origen, 'utf8'), viejo, nuevo));
  else await cp(origen, destino);
}

export async function copiarChat(l: LugarChat, nuevoId: string, nombre: string): Promise<void> {
  const jsonl = path.join(l.carpetaClaude, `${l.id}.jsonl`);
  if (existsSync(jsonl)) await copiarConId(jsonl, path.join(l.carpetaClaude, `${nuevoId}.jsonl`), l.id, nuevoId);
  for (const r of await archivosDe(path.join(l.carpetaClaude, l.id)))
    await copiarConId(path.join(l.carpetaClaude, l.id, ...r.split('/')), path.join(l.carpetaClaude, nuevoId, ...r.split('/')), l.id, nuevoId);
  const curso = path.join(l.cwd, '.en-curso', l.id);
  if (existsSync(curso)) await cp(curso, path.join(l.cwd, '.en-curso', nuevoId), { recursive: true });
  await ponerNombre(l.cwd, nuevoId, nombre);
}

const archivoCompartidos = (cwd: string) => path.join(cwd, '.en-curso', 'compartidos.json');

export async function leerCompartidos(cwd: string): Promise<Compartidos> {
  try {
    const j: unknown = JSON.parse(await readFile(archivoCompartidos(cwd), 'utf8'));
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return {};
    const out: Compartidos = {};
    for (const [id, e] of Object.entries(j as Record<string, Partial<EntradaCompartido>>))
      if (typeof e?.version === 'string' && typeof e.pendiente === 'boolean' && typeof e.compartidoEl === 'string')
        out[id] = { version: e.version, pendiente: e.pendiente, compartidoEl: e.compartidoEl };
    return out;
  } catch {
    return {};
  }
}

export async function ponerCompartido(cwd: string, id: string, e: EntradaCompartido | null): Promise<void> {
  const c = await leerCompartidos(cwd);
  if (e) c[id] = e;
  else delete c[id];
  await mkdir(path.dirname(archivoCompartidos(cwd)), { recursive: true });
  await escribirAtomico(archivoCompartidos(cwd), JSON.stringify(c, null, 2) + '\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run local/compartir.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/tipos.ts local/compartir.ts local/compartir.test.ts
git commit -m "Chats compartidos: preparar, instalar y copiar el paquete de un chat"
```

---

### Task 4: Peticiones nuevas del programa local (y en la app)

**Files:**
- Modify: `local/servidor.ts` (opción `dispositivo` y cinco rutas nuevas)
- Modify: `src/estudio/tipos.ts` (`VERSION_PROGRAMA = 6`)
- Modify: `src/estudio/local.ts` (cinco funciones nuevas)
- Test: `local/servidor.test.ts` (nuevo `describe`)

**Interfaces:**
- Consumes: todo lo de `local/compartir.ts` (Tarea 3).
- Produces (en el programa local):

| Petición | Cuerpo | Respuesta |
|---|---|---|
| `POST chat/paquete` | `{asignatura, id, compartidoEl}` | `{ archivos: ArchivoPaquete[] }` |
| `POST chat/instalar` | `{asignatura, id, archivos}` (hasta 80 MB) | `{ info: InfoChat \| null }` |
| `POST chat/copia` | `{asignatura, id, nombre}` | `{ id }` |
| `GET compartidos?asignatura` | | `Compartidos` |
| `POST compartidos` | `{asignatura, id, entrada: EntradaCompartido \| null}` | `{ ok: true }` |

  Mientras Claude contesta en ese chat, `chat/paquete` e `chat/instalar` dan 409. Más de 50 MB da 413 con el mensaje «Este chat ocupa más de 50 MB y no se puede compartir».
- Produces (en `src/estudio/local.ts`):
  - `prepararPaqueteLocal(asignatura: string, id: string, compartidoEl: string): Promise<ArchivoPaquete[]>`
  - `instalarPaqueteLocal(asignatura: string, id: string, archivos: ArchivoPaquete[]): Promise<InfoChat | null>`
  - `copiarChatLocal(asignatura: string, id: string, nombre: string): Promise<string>`
  - `leerCompartidosLocal(asignatura: string): Promise<Compartidos>`
  - `ponerCompartidoLocal(asignatura: string, id: string, entrada: EntradaCompartido | null): Promise<void>`

- [ ] **Step 1: Write the failing test**

Añadir al final de `local/servidor.test.ts`. Usa el `ID`, `estudios`, `home` y `post` que ya hay. El chat de `fisica` ya existe en `beforeAll`. Pasar `dispositivo: 'PC-PRUEBA'` en la llamada a `crearServidor` del `beforeAll`.

```ts
describe('chats compartidos', () => {
  const OTRO = '22222222-3333-4444-8555-666666666666';
  it('prepara el paquete con chat.json del dispositivo', async () => {
    const r = await post('chat/paquete', { asignatura: 'fisica', id: ID, compartidoEl: '2026-10-10' });
    expect(r.status).toBe(200);
    const { archivos } = (await r.json()) as { archivos: { ruta: string; base64: string }[] };
    const info = JSON.parse(Buffer.from(archivos.find((a) => a.ruta === 'chat.json')!.base64, 'base64').toString('utf8'));
    expect(info).toMatchObject({ compartidoEl: '2026-10-10', dispositivo: 'PC-PRUEBA' });
  });
  it('un chat sin mensajes da un error claro', async () => {
    const r = await post('chat/paquete', { asignatura: 'fisica', id: OTRO, compartidoEl: '2026-10-10' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe('Este chat aún no tiene mensajes');
  });
  it('instala un paquete y luego se lee como conversación', async () => {
    const conv = Buffer.from(JSON.stringify({ type: 'user', message: { content: 'Desde el portátil' } }) + '\n').toString('base64');
    const r = await post('chat/instalar', { asignatura: 'fisica', id: OTRO, archivos: [{ ruta: 'conversacion.jsonl', base64: conv }] });
    expect(r.status).toBe(200);
    const ms = await (await fetch(`${API}conversacion?asignatura=fisica&id=${OTRO}`)).json();
    expect(ms[0].texto).toBe('Desde el portátil');
  });
  it('copia un chat con un id nuevo y el nombre del dispositivo', async () => {
    const r = await post('chat/copia', { asignatura: 'fisica', id: ID, nombre: 'Newton' });
    const { id } = (await r.json()) as { id: string };
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const lista = (await (await fetch(`${API}conversaciones?asignatura=fisica`)).json()) as { id: string; titulo: string }[];
    expect(lista.find((c) => c.id === id)?.titulo).toBe('Newton (copia de PC-PRUEBA)');
  });
  it('guarda y lee compartidos.json', async () => {
    await post('compartidos', { asignatura: 'fisica', id: ID, entrada: { version: 'v1', pendiente: true, compartidoEl: '2026-10-10' } });
    expect((await (await fetch(`${API}compartidos?asignatura=fisica`)).json())[ID]).toEqual({ version: 'v1', pendiente: true, compartidoEl: '2026-10-10' });
    await post('compartidos', { asignatura: 'fisica', id: ID, entrada: null });
    expect(await (await fetch(`${API}compartidos?asignatura=fisica`)).json()).toEqual({});
  });
  it('rechaza una entrada mal formada', async () => {
    expect((await post('compartidos', { asignatura: 'fisica', id: ID, entrada: { version: 1 } })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run local/servidor.test.ts -t "chats compartidos"`
Expected: FAIL (404 «No existe»).

- [ ] **Step 3: Write minimal implementation**

En `local/servidor.ts`:
- Imports: `import os from 'node:os';` y, desde `./compartir.ts`, `copiarChat`, `instalarPaquete`, `leerCompartidos`, `ponerCompartido`, `prepararPaquete`, `tamanoPaquete`, `type LugarChat`.
- En `OpcionesServidor`, añadir `dispositivo?: string; // nombre de este ordenador en los chats compartidos (por defecto, el de Windows)`.
- Dentro de `crearServidor`:

```ts
  const dispositivo = o.dispositivo ?? os.hostname();
  const raiz = path.dirname(o.estudios);
  const lugar = (asig: string, id: string): LugarChat => ({ carpetaClaude: carpetaConversaciones(cwdDe(asig), o.home), cwd: cwdDe(asig), raiz, id });
  const LIMITE_COMPARTIR = 50_000_000;
  const esFecha = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  function entradaDe(v: unknown) {
    if (v === null) return null;
    const e = v as Record<string, unknown> | undefined;
    if (typeof e?.version !== 'string' || typeof e.pendiente !== 'boolean' || !esFecha(e.compartidoEl)) throw new ErrorPeticion(400, 'Entrada no válida');
    return { version: e.version, pendiente: e.pendiente, compartidoEl: e.compartidoEl };
  }
```

- Rutas nuevas en `rutas`:

```ts
    'POST chat/paquete': async (req, res) => {
      const b = await leerJson(req);
      const asig = asignaturaDe(b.asignatura);
      const id = conversacionDe(b.id);
      if (!esFecha(b.compartidoEl)) throw new ErrorPeticion(400, 'Fecha no válida');
      if (activos.has(id)) throw new ErrorPeticion(409, 'Espera a que Claude termine de contestar');
      let archivos;
      try {
        archivos = await prepararPaquete(lugar(asig, id), { compartidoEl: b.compartidoEl, actualizado: new Date().toISOString(), dispositivo });
      } catch (e) {
        throw new ErrorPeticion(400, e instanceof Error ? e.message : String(e));
      }
      if (tamanoPaquete(archivos) > LIMITE_COMPARTIR) throw new ErrorPeticion(413, 'Este chat ocupa más de 50 MB y no se puede compartir');
      enviarJson(res, 200, { archivos });
    },

    'POST chat/instalar': async (req, res) => {
      const b = await leerJson(req, 80_000_000);
      const asig = asignaturaDe(b.asignatura);
      const id = conversacionDe(b.id);
      if (activos.has(id)) throw new ErrorPeticion(409, 'Espera a que Claude termine de contestar');
      const archivos = Array.isArray(b.archivos)
        ? b.archivos.filter((a): a is { ruta: string; base64: string } => typeof a?.ruta === 'string' && typeof a?.base64 === 'string')
        : [];
      try {
        enviarJson(res, 200, { info: await instalarPaquete(lugar(asig, id), archivos) });
      } catch (e) {
        throw new ErrorPeticion(400, e instanceof Error ? e.message : String(e));
      }
    },

    'POST chat/copia': async (req, res) => {
      const b = await leerJson(req);
      const asig = asignaturaDe(b.asignatura);
      const id = conversacionDe(b.id);
      const nombre = nombreChatDe(typeof b.nombre === 'string' ? b.nombre.slice(0, 50) : '') || 'Chat';
      const nuevo = crypto.randomUUID();
      await copiarChat(lugar(asig, id), nuevo, `${nombre} (copia de ${dispositivo})`.slice(0, LIMITE_NOMBRE_CHAT));
      enviarJson(res, 200, { id: nuevo });
    },

    'GET compartidos': async (_req, res, url) => enviarJson(res, 200, await leerCompartidos(cwdDe(asignaturaDe(url.searchParams.get('asignatura'))))),

    'POST compartidos': async (req, res) => {
      const b = await leerJson(req);
      await ponerCompartido(cwdDe(asignaturaDe(b.asignatura)), conversacionDe(b.id), entradaDe(b.entrada));
      enviarJson(res, 200, { ok: true });
    },
```

(`crypto` es global en Node 24.)

En `src/estudio/tipos.ts`: `export const VERSION_PROGRAMA = 6;`.

En `src/estudio/local.ts`, añadir los tipos al import de `./tipos` y estas funciones:

```ts
// Chats compartidos (spec chats compartidos §4): el programa local prepara e instala; GitHub lo hace la app.
export const prepararPaqueteLocal = async (asignatura: string, id: string, compartidoEl: string) =>
  (await pedir<{ archivos: ArchivoPaquete[] }>('chat/paquete', enviarJson({ asignatura, id, compartidoEl }))).archivos;
export const instalarPaqueteLocal = async (asignatura: string, id: string, archivos: ArchivoPaquete[]) =>
  (await pedir<{ info: InfoChat | null }>('chat/instalar', enviarJson({ asignatura, id, archivos }))).info;
export const copiarChatLocal = async (asignatura: string, id: string, nombre: string) =>
  (await pedir<{ id: string }>('chat/copia', enviarJson({ asignatura, id, nombre }))).id;
export const leerCompartidosLocal = (asignatura: string) => pedir<Compartidos>(`compartidos?${consulta({ asignatura })}`);
export const ponerCompartidoLocal = async (asignatura: string, id: string, entrada: EntradaCompartido | null) =>
  void (await pedir<{ ok: true }>('compartidos', enviarJson({ asignatura, id, entrada })));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run local/servidor.test.ts src/estudio/localVersion.test.ts`
Expected: PASS. Si `localVersion.test.ts` comprueba el número de versión de forma literal, actualizarlo a 6.

- [ ] **Step 5: Commit**

```bash
git add local/servidor.ts local/servidor.test.ts src/estudio/tipos.ts src/estudio/local.ts
git commit -m "Chats compartidos: peticiones del programa local (VERSION_PROGRAMA 6)"
```

---

### Task 5: Cliente de GitHub: un commit con muchos archivos, carpetas y blobs

**Files:**
- Modify: `src/github/cliente.ts`
- Test: `src/github/cliente.test.ts` (nuevos `describe`)

**Interfaces:**
- Produces:
  - `interface EntradaCarpeta { nombre: string; tipo: 'file' | 'dir'; sha: string }`
  - `listarEntradas(cfg: Config, ruta: string): Promise<EntradaCarpeta[]>`: `[]` si no existe.
  - `listarArchivosDe(cfg: Config, ruta: string): Promise<{ ruta: string; sha: string }[]>`: recursivo; `ruta` es relativa a la carpeta y va con `/`.
  - `leerBlob(cfg: Config, sha: string): Promise<string>`: devuelve base64 sin saltos de línea; admite hasta 100 MB.
  - `interface CambioArbol { ruta: string; base64: string | null }`: `null` significa borrar.
  - `subirCambios(cfg: Config, cambios: CambioArbol[], mensaje: string): Promise<void>`: un commit en la rama por defecto; si alguien subió entre medias, lo reintenta hasta 3 veces.

- [ ] **Step 1: Write the failing test**

```ts
// añadir a src/github/cliente.test.ts (y al import: leerBlob, listarArchivosDe, listarEntradas, subirCambios)
describe('carpetas y blobs', () => {
  it('listarEntradas da archivos y carpetas con su sha; si no existe, []', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a', type: 'dir', sha: 't1' }, { name: 'b.json', type: 'file', sha: 'b1' }]));
    expect(await listarEntradas(cfg, 'estudios/x/chats')).toEqual([{ nombre: 'a', tipo: 'dir', sha: 't1' }, { nombre: 'b.json', tipo: 'file', sha: 'b1' }]);
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    expect(await listarEntradas(cfg, 'no')).toEqual([]);
  });
  it('listarArchivosDe entra en las subcarpetas', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'chat.json', type: 'file', sha: 's1' }, { name: 'imagenes', type: 'dir', sha: 't' }]));
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a.png', type: 'file', sha: 's2' }]));
    expect(await listarArchivosDe(cfg, 'c')).toEqual([{ ruta: 'chat.json', sha: 's1' }, { ruta: 'imagenes/a.png', sha: 's2' }]);
    expect(fetchMock.mock.calls[1][0]).toContain('/contents/c/imagenes');
  });
  it('leerBlob devuelve el base64 sin saltos de línea', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { content: 'QUJD\nREVG\n', encoding: 'base64' }));
    expect(await leerBlob(cfg, 'abc')).toBe('QUJDREVG');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/diego/my-context/git/blobs/abc');
  });
});

describe('subirCambios', () => {
  const pasosHastaArbol = () => {
    fetchMock.mockResolvedValueOnce(json(200, { default_branch: 'main' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'blob1' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c0' } }));
    fetchMock.mockResolvedValueOnce(json(200, { tree: { sha: 'arbol0' } }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'arbol1' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'c1' }));
  };
  it('hace un solo commit con archivos nuevos y borrados', async () => {
    pasosHastaArbol();
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c1' } }));
    await subirCambios(cfg, [{ ruta: 'a/b.json', base64: 'e30=' }, { ruta: 'a/viejo.png', base64: null }], 'Chat compartido: x');
    const urls = fetchMock.mock.calls.map((c) => `${c[1]?.method ?? 'GET'} ${String(c[0]).replace('https://api.github.com/repos/diego/my-context', '')}`);
    expect(urls).toEqual(['GET ', 'POST /git/blobs', 'GET /git/ref/heads/main', 'GET /git/commits/c0', 'POST /git/trees', 'POST /git/commits', 'PATCH /git/refs/heads/main']);
    expect(cuerpoDe(4)).toEqual({ base_tree: 'arbol0', tree: [{ path: 'a/b.json', mode: '100644', type: 'blob', sha: 'blob1' }, { path: 'a/viejo.png', mode: '100644', type: 'blob', sha: null }] });
    expect(cuerpoDe(5)).toEqual({ message: 'Chat compartido: x', tree: 'arbol1', parents: ['c0'] });
    expect(cuerpoDe(6)).toEqual({ sha: 'c1', force: false });
  });
  it('si la rama avanzó entre medias, vuelve a hacer el commit encima', async () => {
    pasosHastaArbol();
    fetchMock.mockResolvedValueOnce(json(422, { message: 'Update is not a fast forward' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c9' } }));
    fetchMock.mockResolvedValueOnce(json(200, { tree: { sha: 'arbol9' } }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'arbol10' }));
    fetchMock.mockResolvedValueOnce(json(201, { sha: 'c10' }));
    fetchMock.mockResolvedValueOnce(json(200, { object: { sha: 'c10' } }));
    await subirCambios(cfg, [{ ruta: 'a/b.json', base64: 'e30=' }], 'm');
    expect(cuerpoDe(10)).toEqual({ message: 'm', tree: 'arbol10', parents: ['c9'] });
  });
  it('sin red: ErrorGitHub de tipo red', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(subirCambios(cfg, [{ ruta: 'a', base64: 'e30=' }], 'm')).rejects.toMatchObject({ tipo: 'red' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/github/cliente.test.ts`
Expected: FAIL (las funciones nuevas no se exportan).

- [ ] **Step 3: Write minimal implementation**

En `src/github/cliente.ts`, separar la parte común de `peticion` en `pedirUrl`. `peticion` sigue igual hacia fuera.

```ts
const API_REPO = (cfg: Config) => `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;

async function pedirUrl(cfg: Config, url: string, nombre: string, init: RequestInit = {}): Promise<Response> {
  // … el cuerpo actual de peticion desde «let res: Response;», usando `url` y `nombre` en vez de `ruta` en los mensajes …
}

async function peticion(cfg: Config, ruta: string, init: RequestInit = {}): Promise<Response> {
  return pedirUrl(cfg, `${API_REPO(cfg)}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`, ruta, init);
}

// Peticiones a la API de Git del repositorio (git/blobs, git/trees…). `ruta` vacía = el propio repositorio.
const peticionRepo = (cfg: Config, ruta: string, init: RequestInit = {}) =>
  pedirUrl(cfg, ruta ? `${API_REPO(cfg)}/${ruta}` : API_REPO(cfg), ruta || 'el repositorio', init);

export interface EntradaCarpeta {
  nombre: string;
  tipo: 'file' | 'dir';
  sha: string;
}

export async function listarEntradas(cfg: Config, ruta: string): Promise<EntradaCarpeta[]> {
  try {
    const j = (await (await peticion(cfg, ruta)).json()) as { name: string; type: string; sha: string }[];
    if (!Array.isArray(j)) return [];
    return j.filter((e) => e.type === 'file' || e.type === 'dir').map((e) => ({ nombre: e.name, tipo: e.type as 'file' | 'dir', sha: e.sha }));
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return [];
    throw e;
  }
}

export async function listarArchivosDe(cfg: Config, ruta: string, prefijo = ''): Promise<{ ruta: string; sha: string }[]> {
  const out: { ruta: string; sha: string }[] = [];
  for (const e of await listarEntradas(cfg, prefijo ? `${ruta}/${prefijo}` : ruta)) {
    const rel = prefijo ? `${prefijo}/${e.nombre}` : e.nombre;
    if (e.tipo === 'dir') out.push(...(await listarArchivosDe(cfg, ruta, rel)));
    else out.push({ ruta: rel, sha: e.sha });
  }
  return out;
}

// Contenido de un archivo por su sha (hasta 100 MB), en base64.
export async function leerBlob(cfg: Config, sha: string): Promise<string> {
  const j = (await (await peticionRepo(cfg, `git/blobs/${sha}`)).json()) as { content: string };
  return j.content.replace(/\s/g, '');
}

export interface CambioArbol {
  ruta: string;
  base64: string | null; // null = borrar
}

// Todos los cambios en un solo commit (API de árboles). Si la rama avanzó mientras tanto, se rehace encima (hasta 3 veces).
export async function subirCambios(cfg: Config, cambios: CambioArbol[], mensaje: string): Promise<void> {
  const post = (ruta: string, cuerpo: unknown) => peticionRepo(cfg, ruta, { method: 'POST', body: JSON.stringify(cuerpo) }).then((r) => r.json());
  const rama = ((await (await peticionRepo(cfg, '')).json()) as { default_branch: string }).default_branch;
  const shas = new Map<string, string>();
  for (const c of cambios) if (c.base64 !== null) shas.set(c.ruta, ((await post('git/blobs', { content: c.base64, encoding: 'base64' })) as { sha: string }).sha);
  const arbol = cambios.map((c) => ({ path: c.ruta, mode: '100644', type: 'blob', sha: c.base64 === null ? null : shas.get(c.ruta)! }));
  for (let intento = 0; ; intento++) {
    const padre = ((await (await peticionRepo(cfg, `git/ref/heads/${rama}`)).json()) as { object: { sha: string } }).object.sha;
    const base = ((await (await peticionRepo(cfg, `git/commits/${padre}`)).json()) as { tree: { sha: string } }).tree.sha;
    const nuevoArbol = ((await post('git/trees', { base_tree: base, tree: arbol })) as { sha: string }).sha;
    const commit = ((await post('git/commits', { message: mensaje, tree: nuevoArbol, parents: [padre] })) as { sha: string }).sha;
    try {
      await peticionRepo(cfg, `git/refs/heads/${rama}`, { method: 'PATCH', body: JSON.stringify({ sha: commit, force: false }) });
      return;
    } catch (e) {
      if (e instanceof ErrorGitHub && e.tipo === 'conflicto' && intento < 2) continue;
      throw e;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/github/cliente.test.ts`
Expected: PASS, incluidas las pruebas antiguas de `peticion`.

- [ ] **Step 5: Commit**

```bash
git add src/github/cliente.ts src/github/cliente.test.ts
git commit -m "GitHub: subir varios archivos en un commit, listar carpetas y leer blobs"
```

---

### Task 6: Chats compartidos en GitHub

**Files:**
- Create: `src/estudio/chatsCompartidos.ts`
- Test: `src/estudio/chatsCompartidos.test.ts`

**Interfaces:**
- Consumes: `listarEntradas`, `listarArchivosDe`, `leerBlob`, `subirCambios`, `leerArchivo` y `leerBinario` (Tarea 5 y las que ya había); `leerConversacion` (Tarea 1); los tipos de la Tarea 3.
- Produces:
  - `carpetaChats(asig: string): string` → `estudios/<asig>/chats`
  - `interface ChatRemoto { id: string; version: string }`
  - `listarRemotos(cfg, asig): Promise<ChatRemoto[]>`: solo carpetas con id de chat válido.
  - `subirPaquete(cfg, asig, id, archivos: ArchivoPaquete[], titulo: string): Promise<string>`: devuelve la versión nueva.
  - `bajarPaquete(cfg, asig, id): Promise<ArchivoPaquete[]>`
  - `quitarRemoto(cfg, asig, id, titulo): Promise<void>`: si ya no existía, no hace nada.
  - `leerInfoRemota(cfg, asig, id): Promise<InfoChat | null>`
  - `leerMensajesRemotos(cfg, asig, id): Promise<Mensaje[]>`
  - `imagenDeChat(cfg, asig, id): (nombre: string) => Promise<string>`: URL de objeto, guardada para no pedirla dos veces.

- [ ] **Step 1: Write the failing test**

```ts
// src/estudio/chatsCompartidos.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliente from '../github/cliente';
import { bajarPaquete, leerMensajesRemotos, listarRemotos, quitarRemoto, subirPaquete } from './chatsCompartidos';

vi.mock('../github/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('../github/cliente')>();
  return { ...real, listarEntradas: vi.fn(), listarArchivosDe: vi.fn(), leerBlob: vi.fn(), subirCambios: vi.fn(), leerArchivo: vi.fn(), leerBinario: vi.fn() };
});
const cfg = { owner: 'diego', repo: 'my-context', token: 'x' };
const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const entradas = vi.mocked(cliente.listarEntradas);
const archivos = vi.mocked(cliente.listarArchivosDe);
const subir = vi.mocked(cliente.subirCambios);
beforeEach(() => vi.resetAllMocks());

describe('chats compartidos en GitHub', () => {
  it('lista las carpetas de chats (con su sha como versión) e ignora lo demás', async () => {
    entradas.mockResolvedValue([{ nombre: ID, tipo: 'dir', sha: 'v1' }, { nombre: 'LEEME.md', tipo: 'file', sha: 'x' }, { nombre: 'otra', tipo: 'dir', sha: 'y' }]);
    expect(await listarRemotos(cfg, 'calculo')).toEqual([{ id: ID, version: 'v1' }]);
    expect(entradas).toHaveBeenCalledWith(cfg, 'estudios/calculo/chats');
  });
  it('sube en un commit y borra lo que ya no está; devuelve la versión nueva', async () => {
    archivos.mockResolvedValue([{ ruta: 'chat.json', sha: 'a' }, { ruta: 'pizarra-2.json', sha: 'b' }]);
    entradas.mockResolvedValue([{ nombre: ID, tipo: 'dir', sha: 'v2' }]);
    const v = await subirPaquete(cfg, 'calculo', ID, [{ ruta: 'chat.json', base64: 'e30=' }, { ruta: 'conversacion.jsonl', base64: 'e30=' }], 'Derivadas');
    expect(v).toBe('v2');
    expect(subir).toHaveBeenCalledWith(cfg, [
      { ruta: `estudios/calculo/chats/${ID}/chat.json`, base64: 'e30=' },
      { ruta: `estudios/calculo/chats/${ID}/conversacion.jsonl`, base64: 'e30=' },
      { ruta: `estudios/calculo/chats/${ID}/pizarra-2.json`, base64: null },
    ], 'Chat compartido: calculo · Derivadas');
  });
  it('baja todos los archivos por su sha', async () => {
    archivos.mockResolvedValue([{ ruta: 'conversacion.jsonl', sha: 's1' }, { ruta: 'imagenes/a.png', sha: 's2' }]);
    vi.mocked(cliente.leerBlob).mockImplementation(async (_c, sha) => `B64-${sha}`);
    expect(await bajarPaquete(cfg, 'calculo', ID)).toEqual([{ ruta: 'conversacion.jsonl', base64: 'B64-s1' }, { ruta: 'imagenes/a.png', base64: 'B64-s2' }]);
  });
  it('quitar borra todos sus archivos en un commit; si no existía, no hace nada', async () => {
    archivos.mockResolvedValue([{ ruta: 'chat.json', sha: 'a' }]);
    await quitarRemoto(cfg, 'calculo', ID, 'Derivadas');
    expect(subir).toHaveBeenCalledWith(cfg, [{ ruta: `estudios/calculo/chats/${ID}/chat.json`, base64: null }], 'Chat ya no compartido: calculo · Derivadas');
    subir.mockClear();
    archivos.mockResolvedValue([]);
    await quitarRemoto(cfg, 'calculo', ID, 'Derivadas');
    expect(subir).not.toHaveBeenCalled();
  });
  it('lee los mensajes del .jsonl', async () => {
    vi.mocked(cliente.leerArchivo).mockResolvedValue({ texto: JSON.stringify({ type: 'user', message: { content: 'Hola' } }) + '\n', sha: 's' });
    expect(await leerMensajesRemotos(cfg, 'calculo', ID)).toEqual([{ rol: 'diego', texto: 'Hola' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/estudio/chatsCompartidos.test.ts`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/estudio/chatsCompartidos.ts
// Los chats compartidos en GitHub: estudios/<asignatura>/chats/<id>/ (spec chats compartidos §3.1).
import { ErrorGitHub, leerArchivo, leerBinario, leerBlob, listarArchivosDe, listarEntradas, subirCambios, type Config } from '../github/cliente';
import { leerConversacion } from './conversacion';
import type { ArchivoPaquete, InfoChat, Mensaje } from './tipos';

export const carpetaChats = (asig: string) => `estudios/${asig}/chats`;
const carpetaChat = (asig: string, id: string) => `${carpetaChats(asig)}/${id}`;
const ES_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ChatRemoto {
  id: string;
  version: string; // sha de su carpeta: cambia con cualquier archivo de dentro
}

export async function listarRemotos(cfg: Config, asig: string): Promise<ChatRemoto[]> {
  return (await listarEntradas(cfg, carpetaChats(asig))).filter((e) => e.tipo === 'dir' && ES_ID.test(e.nombre)).map((e) => ({ id: e.nombre, version: e.sha }));
}

export async function subirPaquete(cfg: Config, asig: string, id: string, archivos: ArchivoPaquete[], titulo: string): Promise<string> {
  const carpeta = carpetaChat(asig, id);
  const nuevos = new Set(archivos.map((a) => a.ruta));
  const viejos = (await listarArchivosDe(cfg, carpeta)).filter((a) => !nuevos.has(a.ruta));
  await subirCambios(cfg, [
    ...archivos.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: a.base64 })),
    ...viejos.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: null })),
  ], `Chat compartido: ${asig} · ${titulo}`);
  const version = (await listarRemotos(cfg, asig)).find((c) => c.id === id)?.version;
  if (!version) throw new ErrorGitHub('otro', 'El chat no aparece en GitHub después de subirlo');
  return version;
}

export async function bajarPaquete(cfg: Config, asig: string, id: string): Promise<ArchivoPaquete[]> {
  const lista = await listarArchivosDe(cfg, carpetaChat(asig, id));
  return Promise.all(lista.map(async (a) => ({ ruta: a.ruta, base64: await leerBlob(cfg, a.sha) })));
}

export async function quitarRemoto(cfg: Config, asig: string, id: string, titulo: string): Promise<void> {
  const carpeta = carpetaChat(asig, id);
  const lista = await listarArchivosDe(cfg, carpeta);
  if (!lista.length) return;
  await subirCambios(cfg, lista.map((a) => ({ ruta: `${carpeta}/${a.ruta}`, base64: null })), `Chat ya no compartido: ${asig} · ${titulo}`);
}

export async function leerInfoRemota(cfg: Config, asig: string, id: string): Promise<InfoChat | null> {
  try {
    const j = JSON.parse((await leerArchivo(cfg, `${carpetaChat(asig, id)}/chat.json`)).texto);
    return typeof j?.compartidoEl === 'string' && typeof j?.actualizado === 'string' ? (j as InfoChat) : null;
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo !== 'no-existe') throw e;
    return null;
  }
}

export async function leerMensajesRemotos(cfg: Config, asig: string, id: string): Promise<Mensaje[]> {
  return leerConversacion((await leerArchivo(cfg, `${carpetaChat(asig, id)}/conversacion.jsonl`)).texto);
}

export function imagenDeChat(cfg: Config, asig: string, id: string): (nombre: string) => Promise<string> {
  const urls = new Map<string, Promise<string>>();
  return (nombre) => {
    if (!urls.has(nombre)) urls.set(nombre, leerBinario(cfg, `${carpetaChat(asig, id)}/imagenes/${nombre}`).then((b) => URL.createObjectURL(b)));
    return urls.get(nombre)!;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/estudio/chatsCompartidos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/chatsCompartidos.ts src/estudio/chatsCompartidos.test.ts
git commit -m "Chats compartidos: subir, bajar, quitar y leer en GitHub"
```

---

### Task 7: Decidir qué hacer con cada chat (función pura)

**Files:**
- Create: `src/estudio/sincronizarChats.ts`
- Test: `src/estudio/sincronizarChats.test.ts`

**Interfaces:**
- Consumes: `Compartidos` (Tarea 3) y `ChatRemoto` (Tarea 6).
- Produces:
  - `type Accion = { tipo: 'bajar' | 'subir' | 'conflicto' | 'borrar-local' | 'olvidar'; id: string; version?: string }`. `version` es la de GitHub en `bajar` y en `conflicto`.
  - `decidir(compartidos: Compartidos, remotos: ChatRemoto[], ocupado?: (id: string) => boolean): Accion[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/estudio/sincronizarChats.test.ts
import { describe, expect, it } from 'vitest';
import { decidir } from './sincronizarChats';

const e = (version: string, pendiente = false) => ({ version, pendiente, compartidoEl: '2026-10-10' });

describe('decidir', () => {
  it('nuevo en GitHub → bajar', () => expect(decidir({}, [{ id: 'a', version: 'v1' }])).toEqual([{ tipo: 'bajar', id: 'a', version: 'v1' }]));
  it('igual y sin pendiente → nada', () => expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v1' }])).toEqual([]));
  it('pendiente y sin cambios en GitHub → subir', () => expect(decidir({ a: e('v1', true) }, [{ id: 'a', version: 'v1' }])).toEqual([{ tipo: 'subir', id: 'a' }]));
  it('cambiado en GitHub y sin pendiente → bajar', () => expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v2' }])).toEqual([{ tipo: 'bajar', id: 'a', version: 'v2' }]));
  it('cambiado en los dos sitios → conflicto', () => expect(decidir({ a: e('v1', true) }, [{ id: 'a', version: 'v2' }])).toEqual([{ tipo: 'conflicto', id: 'a', version: 'v2' }]));
  it('ya no está en GitHub y sin pendiente → borrar-local', () => expect(decidir({ a: e('v1') }, [])).toEqual([{ tipo: 'borrar-local', id: 'a' }]));
  it('ya no está en GitHub y con pendiente → olvidar (queda como no compartido)', () => expect(decidir({ a: e('v1', true) }, [])).toEqual([{ tipo: 'olvidar', id: 'a' }]));
  it('aún no subido nunca (version vacía) → subir, esté o no en GitHub', () => {
    expect(decidir({ a: e('', true) }, [])).toEqual([{ tipo: 'subir', id: 'a' }]);
    expect(decidir({ a: e('', true) }, [{ id: 'a', version: 'v9' }])).toEqual([{ tipo: 'subir', id: 'a' }]);
  });
  it('un chat en el que Claude está contestando no se toca', () => {
    expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v2' }, { id: 'b', version: 'v1' }], (id) => id === 'a')).toEqual([{ tipo: 'bajar', id: 'b', version: 'v1' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/estudio/sincronizarChats.test.ts`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/estudio/sincronizarChats.ts
// Qué hacer con cada chat compartido al comparar este ordenador con GitHub (spec chats compartidos §5.3).
import type { ChatRemoto } from './chatsCompartidos';
import type { Compartidos } from './tipos';

export interface Accion {
  tipo: 'bajar' | 'subir' | 'conflicto' | 'borrar-local' | 'olvidar';
  id: string;
  version?: string;
}

export function decidir(compartidos: Compartidos, remotos: ChatRemoto[], ocupado: (id: string) => boolean = () => false): Accion[] {
  const acciones: Accion[] = [];
  const enGitHub = new Map(remotos.map((r) => [r.id, r.version]));
  for (const [id, e] of Object.entries(compartidos)) {
    if (ocupado(id)) continue;
    const remota = enGitHub.get(id);
    if (e.version === '') acciones.push({ tipo: 'subir', id });
    else if (remota === undefined) acciones.push({ tipo: e.pendiente ? 'olvidar' : 'borrar-local', id });
    else if (remota === e.version) {
      if (e.pendiente) acciones.push({ tipo: 'subir', id });
    } else acciones.push({ tipo: e.pendiente ? 'conflicto' : 'bajar', id, version: remota });
  }
  for (const r of remotos) if (!compartidos[r.id] && !ocupado(r.id)) acciones.push({ tipo: 'bajar', id: r.id, version: r.version });
  return acciones;
}
```

Para que las pruebas pasen tal cual, el orden es: primero los chats que ya conoce este ordenador y luego los nuevos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/estudio/sincronizarChats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/sincronizarChats.ts src/estudio/sincronizarChats.test.ts
git commit -m "Chats compartidos: decidir qué hacer con cada chat"
```

---

### Task 8: El sincronizador (compartir, subir, antes de enviar, dejar, borrar)

**Files:**
- Create: `src/estudio/sincronizador.ts`
- Test: `src/estudio/sincronizador.test.ts`

**Interfaces:**
- Consumes: `decidir` y `Accion` (Tarea 7); `ChatRemoto` (Tarea 6); los tipos de la Tarea 3; `ErrorGitHub` (`src/github/cliente.ts`).
- Produces:

```ts
export interface DependenciasSinc {
  local: {
    preparar(asig: string, id: string, compartidoEl: string): Promise<ArchivoPaquete[]>;
    instalar(asig: string, id: string, archivos: ArchivoPaquete[]): Promise<InfoChat | null>;
    copiar(asig: string, id: string, nombre: string): Promise<string>;
    leerCompartidos(asig: string): Promise<Compartidos>;
    poner(asig: string, id: string, e: EntradaCompartido | null): Promise<void>;
    borrar(asig: string, id: string): Promise<void>;
  };
  remoto: {
    listar(asig: string): Promise<ChatRemoto[]>;
    subir(asig: string, id: string, archivos: ArchivoPaquete[], titulo: string): Promise<string>;
    bajar(asig: string, id: string): Promise<ArchivoPaquete[]>;
    quitar(asig: string, id: string, titulo: string): Promise<void>;
  };
  hoy(): string; // AAAA-MM-DD
  avisar(mensaje: string): Promise<void>;
}
export type ResultadoSubida = 'hecho' | 'pendiente' | 'conflicto' | 'olvidado' | 'no-compartido';
export function crearSincronizador(d: DependenciasSinc): {
  sincronizar(asig: string, titulos: Record<string, string>, ocupado?: (id: string) => boolean): Promise<boolean>; // true si cambió algo aquí
  compartir(asig: string, id: string, titulo: string): Promise<ResultadoSubida>;
  subir(asig: string, id: string, titulo: string): Promise<ResultadoSubida>;
  antesDeEnviar(asig: string, id: string, titulo: string): Promise<'igual' | 'bajado' | 'conflicto'>;
  dejarDeCompartir(asig: string, id: string, titulo: string): Promise<void>;
  borrarEnTodos(asig: string, id: string, titulo: string): Promise<void>;
};
```

- `subir` deja `pendiente` si falla la red y lanza los errores del programa local (por ejemplo, el de 50 MB).
- `dejarDeCompartir` y `borrarEnTodos` lanzan el error si no hay red, y entonces no tocan nada en local.

- [ ] **Step 1: Write the failing test**

```ts
// src/estudio/sincronizador.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ErrorGitHub } from '../github/cliente';
import { crearSincronizador, type DependenciasSinc } from './sincronizador';
import type { Compartidos } from './tipos';

function falso(inicial: Compartidos = {}, remotos: { id: string; version: string }[] = []) {
  const compartidos: Compartidos = { ...inicial };
  const d = {
    local: {
      preparar: vi.fn(async () => [{ ruta: 'conversacion.jsonl', base64: 'e30=' }]),
      instalar: vi.fn(async () => ({ compartidoEl: '2026-10-01', actualizado: 'x', dispositivo: 'PORTATIL' })),
      copiar: vi.fn(async () => 'nuevo-id'),
      leerCompartidos: vi.fn(async () => ({ ...compartidos })),
      poner: vi.fn(async (_a: string, id: string, e: Compartidos[string] | null) => {
        if (e) compartidos[id] = e;
        else delete compartidos[id];
      }),
      borrar: vi.fn(async () => undefined),
    },
    remoto: {
      listar: vi.fn(async () => remotos),
      subir: vi.fn(async () => 'v-nueva'),
      bajar: vi.fn(async () => [{ ruta: 'conversacion.jsonl', base64: 'e30=' }]),
      quitar: vi.fn(async () => undefined),
    },
    hoy: () => '2026-10-10',
    avisar: vi.fn(async () => undefined),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/estudio/sincronizador.test.ts`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/estudio/sincronizador.ts
// Compartir, subir y bajar chats entre este ordenador y GitHub (spec chats compartidos §5-§6).
// No sabe de React ni de fetch: recibe el programa local y GitHub como dependencias (así se prueba con falsos).
import { ErrorGitHub } from '../github/cliente';
import type { ChatRemoto } from './chatsCompartidos';
import { decidir } from './sincronizarChats';
import type { ArchivoPaquete, Compartidos, EntradaCompartido, InfoChat } from './tipos';

export interface DependenciasSinc { /* … tal cual en Interfaces … */ }
export type ResultadoSubida = 'hecho' | 'pendiente' | 'conflicto' | 'olvidado' | 'no-compartido';

const sinRed = (e: unknown) => e instanceof ErrorGitHub && (e.tipo === 'red' || e.tipo === 'otro');

export function crearSincronizador(d: DependenciasSinc) {
  async function bajarEInstalar(asig: string, id: string, version: string, anterior?: EntradaCompartido) {
    const info = await d.local.instalar(asig, id, await d.remoto.bajar(asig, id));
    await d.local.poner(asig, id, { version, pendiente: false, compartidoEl: info?.compartidoEl ?? anterior?.compartidoEl ?? d.hoy() });
  }

  async function conflicto(asig: string, id: string, version: string, titulo: string, e: EntradaCompartido) {
    await d.local.copiar(asig, id, titulo);
    await bajarEInstalar(asig, id, version, e);
    await d.avisar(`«${titulo}» se ha usado a la vez en otro dispositivo. Lo que escribiste aquí está en un chat nuevo, «${titulo} (copia…)», y el chat compartido tiene lo del otro dispositivo.`);
  }

  async function subir(asig: string, id: string, titulo: string): Promise<ResultadoSubida> {
    const e = (await d.local.leerCompartidos(asig))[id];
    if (!e) return 'no-compartido';
    const marcada = { ...e, pendiente: true };
    await d.local.poner(asig, id, marcada);
    let remota: ChatRemoto | undefined;
    try {
      remota = (await d.remoto.listar(asig)).find((r) => r.id === id);
    } catch (err) {
      if (sinRed(err)) return 'pendiente';
      throw err;
    }
    if (e.version !== '' && !remota) {
      await d.local.poner(asig, id, null);
      return 'olvidado';
    }
    if (e.version !== '' && remota && remota.version !== e.version) {
      await conflicto(asig, id, remota.version, titulo, marcada);
      return 'conflicto';
    }
    const archivos = await d.local.preparar(asig, id, e.compartidoEl);
    try {
      const version = await d.remoto.subir(asig, id, archivos, titulo);
      await d.local.poner(asig, id, { version, pendiente: false, compartidoEl: e.compartidoEl });
      return 'hecho';
    } catch (err) {
      if (sinRed(err) || (err instanceof ErrorGitHub && err.tipo === 'conflicto')) return 'pendiente';
      throw err;
    }
  }

  return {
    subir,

    async compartir(asig: string, id: string, titulo: string) {
      await d.local.poner(asig, id, { version: '', pendiente: true, compartidoEl: d.hoy() });
      return subir(asig, id, titulo);
    },

    async sincronizar(asig: string, titulos: Record<string, string>, ocupado?: (id: string) => boolean) {
      let compartidos: Compartidos;
      let remotos: ChatRemoto[];
      try {
        [compartidos, remotos] = await Promise.all([d.local.leerCompartidos(asig), d.remoto.listar(asig)]);
      } catch (err) {
        if (sinRed(err)) return false;
        throw err;
      }
      const acciones = decidir(compartidos, remotos, ocupado);
      for (const a of acciones) {
        const titulo = titulos[a.id] ?? 'Chat';
        try {
          if (a.tipo === 'bajar') await bajarEInstalar(asig, a.id, a.version!, compartidos[a.id]);
          else if (a.tipo === 'subir') await subir(asig, a.id, titulo);
          else if (a.tipo === 'conflicto') await conflicto(asig, a.id, a.version!, titulo, compartidos[a.id]);
          else if (a.tipo === 'borrar-local') {
            await d.local.borrar(asig, a.id);
            await d.local.poner(asig, a.id, null);
          } else await d.local.poner(asig, a.id, null);
        } catch (err) {
          if (!sinRed(err)) console.warn('chat compartido', a, err); // un chat que falla no para a los demás
        }
      }
      return acciones.length > 0;
    },

    async antesDeEnviar(asig: string, id: string, titulo: string): Promise<'igual' | 'bajado' | 'conflicto'> {
      const e = (await d.local.leerCompartidos(asig))[id];
      if (!e || e.version === '') return 'igual';
      let remota: ChatRemoto | undefined;
      try {
        remota = (await d.remoto.listar(asig)).find((r) => r.id === id);
      } catch (err) {
        if (sinRed(err)) return 'igual';
        throw err;
      }
      if (!remota) {
        await d.local.poner(asig, id, null); // lo quitaron en otro dispositivo: sigue aquí como chat normal
        return 'igual';
      }
      if (remota.version === e.version) return 'igual';
      if (e.pendiente) {
        await conflicto(asig, id, remota.version, titulo, e);
        return 'conflicto';
      }
      await bajarEInstalar(asig, id, remota.version, e);
      return 'bajado';
    },

    async dejarDeCompartir(asig: string, id: string, titulo: string) {
      await d.remoto.quitar(asig, id, titulo);
      await d.local.poner(asig, id, null);
    },

    async borrarEnTodos(asig: string, id: string, titulo: string) {
      if ((await d.local.leerCompartidos(asig))[id]) await d.remoto.quitar(asig, id, titulo);
      await d.local.borrar(asig, id);
      await d.local.poner(asig, id, null);
    },
  };
}
```

Nota: en la prueba «sin red, compartir queda pendiente», `listar` falla una sola vez. Por eso la segunda llamada, dentro de `sincronizar`, ya funciona y devuelve `[]` con `version: ''`: `decidir` responde `subir` y la subida se hace.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/estudio/sincronizador.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/sincronizador.ts src/estudio/sincronizador.test.ts
git commit -m "Chats compartidos: sincronizador (compartir, subir, bajar, conflicto, borrar)"
```

---

### Task 9: Pantalla en el PC y el portátil (botón ☁, lista, subidas solas)

**Files:**
- Create: `src/estudio/subidaDiferida.ts` + `src/estudio/subidaDiferida.test.ts`
- Create: `src/componentes/estudio/useCompartir.ts`
- Modify: `src/estudio/tipos.ts` (`ResumenConversacion.compartido?: boolean`)
- Modify: `src/componentes/estudio/Chat.tsx` (prop `compartir`)
- Modify: `src/componentes/estudio/ListaConversaciones.tsx` (sincronizar al abrir, ☁ en cada fila, borrar/renombrar compartidos)
- Modify: `src/componentes/estudio/EstudioLocal.tsx` (antes de enviar, después de responder, tras cambiar la pizarra)
- Modify: `src/estilos.css` (`.estado-compartir`)
- Test: `src/componentes/estudio/Chat.test.tsx`, `src/componentes/estudio/ListaConversaciones.test.tsx`

**Interfaces:**
- Consumes: `crearSincronizador` (Tarea 8); las funciones `*Local` (Tarea 4); `listarRemotos`, `subirPaquete`, `bajarPaquete` y `quitarRemoto` (Tarea 6); `confirmar` (`src/estado/dialogos.ts`); `hoyISO` o lo que use `useHoy()` (`src/estado/hoy.ts`; mirar su export y usarlo).
- Produces:
  - `crearSubidaDiferida(subir: () => Promise<void>, ms?: number): { avisar(): void; ya(): Promise<void>; parar(): void }`. `ms` es 5000 por defecto.
  - `sincronizadorDe(cfg: Config): ReturnType<typeof crearSincronizador>`, en `useCompartir.ts`.
  - `useCompartir(asig: string, id: string | null, titulo: string)`, que devuelve:

```ts
{
  estado: EstadoCompartir;
  compartir(): Promise<void>;
  dejar(): Promise<void>;
  antesDeEnviar(): Promise<'igual' | 'bajado' | 'conflicto'>;
  tras(inmediato: boolean): void;
  error: string | null;
  quitarError(): void;
}
```

  Con `EstadoCompartir = 'no' | 'subiendo' | 'pendiente' | 'hecho' | 'sin-token'`.
  - Prop nueva de `Chat`: `compartir?: { estado: EstadoCompartir; alCompartir(): void; alDejar(): void }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/estudio/subidaDiferida.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSubidaDiferida } from './subidaDiferida';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('crearSubidaDiferida', () => {
  it('varios cambios seguidos → una sola subida, 5 s después del último', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    await vi.advanceTimersByTimeAsync(3000);
    s.avisar();
    await vi.advanceTimersByTimeAsync(4999);
    expect(subir).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(subir).toHaveBeenCalledTimes(1);
  });
  it('ya() sube enseguida y cancela la espera', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    await s.ya();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(subir).toHaveBeenCalledTimes(1);
  });
  it('si llega un cambio mientras sube, vuelve a subir al terminar', async () => {
    let soltar!: () => void;
    const subir = vi.fn(() => new Promise<void>((r) => (soltar = r)));
    const s = crearSubidaDiferida(subir, 10);
    s.avisar();
    await vi.advanceTimersByTimeAsync(10);
    s.avisar();
    soltar();
    await vi.advanceTimersByTimeAsync(10);
    expect(subir).toHaveBeenCalledTimes(2);
  });
  it('parar() cancela lo que estaba esperando', async () => {
    const subir = vi.fn(async () => undefined);
    const s = crearSubidaDiferida(subir);
    s.avisar();
    s.parar();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(subir).not.toHaveBeenCalled();
  });
});
```

Añadir a `src/componentes/estudio/Chat.test.tsx`:

```ts
describe('botón ☁ de compartir', () => {
  const con = (estado: 'no' | 'subiendo' | 'pendiente' | 'hecho' | 'sin-token', mensajes = [{ rol: 'diego' as const, texto: 'Hola' }]) =>
    renderToString(<Chat {...props} mensajes={mensajes} enviando={false} compartir={{ estado, alCompartir: () => undefined, alDejar: () => undefined }} />);
  it('sin mensajes no aparece', () => expect(con('no', [])).not.toContain('☁'));
  it('cada estado tiene su texto', () => {
    expect(con('no')).toContain('☁ Compartir');
    expect(con('subiendo')).toContain('☁ Subiendo…');
    expect(con('pendiente')).toContain('☁ Sin subir');
    expect(con('hecho')).toContain('☁ Compartido');
    expect(con('sin-token')).toMatch(/<button[^>]*disabled=""[^>]*title="Para compartir chats, pon tu llave de GitHub en Ajustes"/);
  });
  it('mientras Claude contesta, el botón está desactivado', () => {
    const html = renderToString(<Chat {...props} mensajes={[{ rol: 'diego', texto: 'Hola' }]} enviando compartir={{ estado: 'no', alCompartir: () => undefined, alDejar: () => undefined }} />);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>☁ Compartir<\/button>/);
  });
});
```

Añadir a `src/componentes/estudio/ListaConversaciones.test.tsx`:

```ts
it('los chats compartidos llevan ☁', () => {
  const html = renderToString(<FilasChats lista={[{ id: 'a', titulo: 'Newton', fecha: '2026-10-10T10:00:00Z', compartido: true }, { id: 'b', titulo: 'Derivadas', fecha: '2026-10-10T10:00:00Z' }]} busqueda="" alBuscar={nada} alAbrir={nada} alRenombrar={nada} alBorrar={nada} />);
  expect(html).toContain('title="Compartido con tus otros dispositivos"');
  expect(html.match(/☁/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/estudio/subidaDiferida.test.ts src/componentes/estudio/Chat.test.tsx src/componentes/estudio/ListaConversaciones.test.tsx`
Expected: FAIL (no existe `subidaDiferida` y aún no salen los textos con ☁).

- [ ] **Step 3: Write the implementation**

`src/estudio/subidaDiferida.ts`:

```ts
// Junta cambios seguidos en una sola subida (Diego dibujando en la pizarra de un chat compartido).
export function crearSubidaDiferida(subir: () => Promise<void>, ms = 5000) {
  let espera: ReturnType<typeof setTimeout> | undefined;
  let subiendo: Promise<void> | null = null;
  let otraVez = false;
  async function lanzar(): Promise<void> {
    clearTimeout(espera);
    espera = undefined;
    if (subiendo) {
      otraVez = true;
      return subiendo;
    }
    subiendo = subir().catch(() => undefined).finally(() => {
      subiendo = null;
      if (otraVez) {
        otraVez = false;
        espera = setTimeout(() => void lanzar(), ms);
      }
    });
    return subiendo;
  }
  return {
    avisar() {
      if (subiendo) {
        otraVez = true;
        return;
      }
      clearTimeout(espera);
      espera = setTimeout(() => void lanzar(), ms);
    },
    ya: lanzar,
    parar() {
      clearTimeout(espera);
      espera = undefined;
      otraVez = false;
    },
  };
}
```

`src/estudio/tipos.ts`: en `ResumenConversacion`, añadir `compartido?: boolean; // lo pone la app con compartidos.json`.

`src/componentes/estudio/useCompartir.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Config } from '../../github/cliente';
import { confirmar } from '../../estado/dialogos';
import { useDatos } from '../../estado/datos';
import { useHoy } from '../../estado/hoy';
import { bajarPaquete, listarRemotos, quitarRemoto, subirPaquete } from '../../estudio/chatsCompartidos';
import {
  borrarConversacion, copiarChatLocal, instalarPaqueteLocal, leerCompartidosLocal, ponerCompartidoLocal, prepararPaqueteLocal,
} from '../../estudio/local';
import { crearSincronizador, type ResultadoSubida } from '../../estudio/sincronizador';
import { crearSubidaDiferida } from '../../estudio/subidaDiferida';

export type EstadoCompartir = 'no' | 'subiendo' | 'pendiente' | 'hecho' | 'sin-token';

export function sincronizadorDe(cfg: Config, hoy: () => string) {
  return crearSincronizador({
    local: {
      preparar: prepararPaqueteLocal, instalar: instalarPaqueteLocal, copiar: copiarChatLocal,
      leerCompartidos: leerCompartidosLocal, poner: ponerCompartidoLocal, borrar: async (a, id) => void (await borrarConversacion(a, id)),
    },
    remoto: {
      listar: (a) => listarRemotos(cfg, a), subir: (a, id, ar, t) => subirPaquete(cfg, a, id, ar, t),
      bajar: (a, id) => bajarPaquete(cfg, a, id), quitar: (a, id, t) => quitarRemoto(cfg, a, id, t),
    },
    hoy,
    avisar: async (m) => void (await confirmar(m, { aceptar: 'Entendido' })),
  });
}

const DE_RESULTADO: Record<ResultadoSubida, EstadoCompartir> = { hecho: 'hecho', pendiente: 'pendiente', conflicto: 'hecho', olvidado: 'no', 'no-compartido': 'no' };

export function useCompartir(asig: string, id: string | null, titulo: string) {
  const { config } = useDatos();
  const hoy = useHoy();
  const hoyRef = useRef(hoy);
  hoyRef.current = hoy;
  const sinc = useMemo(() => (config ? sincronizadorDe(config, () => hoyRef.current) : null), [config]);
  const [estado, setEstado] = useState<EstadoCompartir>('no');
  const [error, setError] = useState<string | null>(null);
  const tituloRef = useRef(titulo);
  tituloRef.current = titulo;

  // Al abrir un chat: ¿está compartido? ¿quedó algo sin subir?
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    void leerCompartidosLocal(asig).then((c) => {
      if (!vivo) return;
      setEstado(!config ? 'sin-token' : !c[id] ? 'no' : c[id].pendiente ? 'pendiente' : 'hecho');
    }, () => undefined);
    return () => void (vivo = false);
  }, [asig, id, config]);

  const subirAhora = useCallback(async () => {
    if (!sinc || !id) return;
    setEstado((e) => (e === 'no' ? e : 'subiendo'));
    try {
      setEstado(DE_RESULTADO[await sinc.subir(asig, id, tituloRef.current || 'Chat')]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEstado('pendiente');
    }
  }, [sinc, asig, id]);

  const diferida = useMemo(() => crearSubidaDiferida(subirAhora), [subirAhora]);
  useEffect(() => () => diferida.parar(), [diferida]);
  useEffect(() => {
    const alVolver = () => void diferida.ya();
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [diferida]);

  return {
    estado,
    error,
    quitarError: () => setError(null),
    async compartir() {
      if (!sinc || !id) return;
      setEstado('subiendo');
      try {
        setEstado(DE_RESULTADO[await sinc.compartir(asig, id, tituloRef.current || 'Chat')]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        await ponerCompartidoLocal(asig, id, null).catch(() => undefined);
        setEstado('no');
      }
    },
    async dejar() {
      if (!sinc || !id) return;
      const ok = await confirmar('¿Dejar de compartir este chat? Desaparece de tus otros dispositivos y se queda solo en este ordenador.', { aceptar: 'Dejar de compartir' });
      if (!ok) return;
      try {
        await sinc.dejarDeCompartir(asig, id, tituloRef.current || 'Chat');
        setEstado('no');
      } catch (e) {
        setError(`No se ha podido dejar de compartir: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    antesDeEnviar: async () => (sinc && id && estado !== 'no' ? sinc.antesDeEnviar(asig, id, tituloRef.current || 'Chat') : 'igual' as const),
    // Tras una respuesta de Claude (inmediato) o un cambio en la pizarra (se espera 5 s).
    tras(inmediato: boolean) {
      if (estado === 'no' || estado === 'sin-token') return;
      if (inmediato) void diferida.ya();
      else diferida.avisar();
    },
  };
}
```

`Chat.tsx`:
- Importar `type EstadoCompartir` desde `./useCompartir`.
- En `Props`, añadir `compartir?: { estado: EstadoCompartir; alCompartir(): void; alDejar(): void };`.
- En la cabecera, entre el título y el botón `+`:

```tsx
        {p.compartir && p.mensajes.length > 0 && (
          p.compartir.estado === 'subiendo' ? <span className="detalle estado-compartir">☁ Subiendo…</span>
            : p.compartir.estado === 'hecho' ? <button className="enlace estado-compartir" disabled={p.enviando} title="Dejar de compartir" onClick={p.compartir.alDejar}>☁ Compartido</button>
              : p.compartir.estado === 'pendiente' ? <button className="enlace estado-compartir" disabled={p.enviando} title="No se ha podido subir: tócalo para reintentar" onClick={p.compartir.alCompartir}>☁ Sin subir</button>
                : <button className="estado-compartir" disabled={p.enviando || p.compartir.estado === 'sin-token'}
                    title={p.compartir.estado === 'sin-token' ? 'Para compartir chats, pon tu llave de GitHub en Ajustes' : 'Compartir con tus otros dispositivos'}
                    onClick={p.compartir.alCompartir}>☁ Compartir</button>
        )}
```

(«☁ Sin subir» llama a `alCompartir`; `EstudioLocal` lo convierte en «subir ahora», ver abajo.)

`ListaConversaciones.tsx`:
- **`FilasChats`:** delante del botón del título, `{c.compartido && <span className="detalle" title="Compartido con tus otros dispositivos">☁</span>}`.
- **Al abrir la lista:** si hay `config`, primero sincroniza y después lista, marcando los compartidos:

```tsx
  const { config } = useDatos();
  const hoy = useHoy();
  const cargar = useCallback(async () => {
    const [l, c] = await Promise.all([listarConversaciones(asignatura.id), leerCompartidosLocal(asignatura.id).catch(() => ({}))]);
    setLista(l.map((x) => (c[x.id] ? { ...x, compartido: true } : x)));
  }, [asignatura.id]);
  useEffect(() => {
    void (async () => {
      try {
        await cargar(); // lo de este ordenador, enseguida
        if (!config) return;
        const titulos = Object.fromEntries((await listarConversaciones(asignatura.id)).map((x) => [x.id, x.titulo]));
        if (await sincronizadorDe(config, () => hoy).sincronizar(asignatura.id, titulos, (id) => id === abiertaYContestando)) await cargar();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [asignatura.id, config, cargar]);
```

  Añadir a `Props` `contestando: string | null` (el id del chat abierto si Claude está contestando). En `EstudioLocal`, pasar `contestando={enviando ? conv.id : null}` y usarlo como `abiertaYContestando`.
- **`borrar`:** si `c.compartido`, el texto pasa a ser `¿Borrar el chat «${c.titulo}»? Está compartido: se borrará en todos tus dispositivos. Las pizarras que guardaste en el historial se quedan. No se puede deshacer.` y se llama a `sincronizadorDe(config, () => hoy).borrarEnTodos(asignatura.id, c.id, c.titulo)` en vez de `borrarConversacion`. Sin `config`, se muestra el error «Para borrar un chat compartido hace falta la llave de GitHub (Ajustes)».
- **`renombrar`:** si `c.compartido` y hay `config`, después de renombrar se llama a `void sincronizadorDe(config, () => hoy).subir(asignatura.id, c.id, nombre)`.

`EstudioLocal.tsx`:
- Crear `const compartir = useCompartir(asignatura.id, conv?.id ?? null, nombreChat ?? mensajes.find((m) => m.rol === 'diego')?.texto.slice(0, 60) ?? '');`. Va antes del `if (!conv) return …`, porque los hooks no pueden ir después de un return.
- En `enviar`, justo después de `setEnviando(true)`:

```ts
    const antes = await compartir.antesDeEnviar().catch(() => 'igual' as const);
    if (antes !== 'igual') {
      const ms = await leerConversacion(asignatura.id, conv.id).catch(() => [] as Mensaje[]);
      setMensajes(ms);
      await recargarPizarras(conv.id);
    }
```

- En `enviar`, después de `await recargarPizarras(conv.id);` (al final): `compartir.tras(true);`.
- En `operar`, tras `const p = await operarPizarra(…)`: `if (esOperacionDeDiego(op) || op.tipo === 'guardada') compartir.tras(false);`.
- En `<Chat …>`: `compartir={{ estado: compartir.estado, alCompartir: () => void (compartir.estado === 'pendiente' ? compartir.tras(true) : compartir.compartir()), alDejar: () => void compartir.dejar() }}`.
- Junto a `avisoPizarra`, enseñar `compartir.error` en un `banner error` con «Cerrar» (`compartir.quitarError`).

`src/estilos.css`: `.estado-compartir { white-space: nowrap; font-size: 0.85em; }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/estudio/subidaDiferida.test.ts src/componentes/estudio/Chat.test.tsx src/componentes/estudio/ListaConversaciones.test.tsx`
Expected: PASS.

Después, `npm run build`. Expected: sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/estudio/subidaDiferida.ts src/estudio/subidaDiferida.test.ts src/componentes/estudio/useCompartir.ts src/estudio/tipos.ts src/componentes/estudio/Chat.tsx src/componentes/estudio/Chat.test.tsx src/componentes/estudio/ListaConversaciones.tsx src/componentes/estudio/ListaConversaciones.test.tsx src/componentes/estudio/EstudioLocal.tsx src/estilos.css
git commit -m "Chats compartidos: botón ☁, lista sincronizada y subidas solas en el PC"
```

---

### Task 10: Leer los chats compartidos en el móvil y la web

**Files:**
- Create: `src/componentes/estudio/MensajesChat.tsx` (la lista de burbujas, sacada de `Chat.tsx`)
- Create: `src/componentes/estudio/ChatsCompartidos.tsx`
- Create: `src/componentes/estudio/ChatsCompartidos.test.tsx`
- Modify: `src/componentes/estudio/Chat.tsx` (usar `MensajesChat`)
- Modify: `src/pantallas/Estudio.tsx` (sin programa local: `ChatsCompartidos` debajo del historial)

**Interfaces:**
- Consumes: `listarRemotos`, `leerInfoRemota`, `leerMensajesRemotos` e `imagenDeChat` (Tarea 6); `Markdown`.
- Produces:
  - `MensajesChat({ mensajes, imagen }: { mensajes: Mensaje[]; imagen(nombre: string): string | Promise<string> })`
  - `ListaChatsCompartidos({ chats, alAbrir }: { chats: { id: string; titulo: string; actualizado: string }[]; alAbrir(id: string): void })`
  - `ChatsCompartidos({ asignatura }: { asignatura: Asignatura })`

- [ ] **Step 1: Write the failing test**

```tsx
// src/componentes/estudio/ChatsCompartidos.test.tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ListaChatsCompartidos } from './ChatsCompartidos';
import { MensajesChat } from './MensajesChat';

describe('chats compartidos en el móvil', () => {
  it('lista con nombre y fecha; vacía, lo explica', () => {
    const html = renderToString(<ListaChatsCompartidos chats={[{ id: 'a', titulo: 'Derivadas', actualizado: '2026-10-10T10:00:00Z' }]} alAbrir={() => undefined} />);
    expect(html).toContain('Derivadas');
    expect(html).toContain('10 oct');
    expect(renderToString(<ListaChatsCompartidos chats={[]} alAbrir={() => undefined} />)).toContain('Aún no has compartido ningún chat de esta asignatura');
  });
  it('los mensajes se leen sin caja para escribir', () => {
    const html = renderToString(<MensajesChat mensajes={[{ rol: 'diego', texto: 'Hola' }, { rol: 'claude', texto: '**Hola**' }, { rol: 'herramienta', texto: '✏️ Ha dibujado en la pizarra 1' }]} imagen={() => ''} />);
    expect(html).toContain('burbuja-diego');
    expect(html).toContain('<strong>Hola</strong>');
    expect(html).toContain('linea-herramienta');
    expect(html).not.toContain('textarea');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/componentes/estudio/ChatsCompartidos.test.tsx`
Expected: FAIL (no existen los componentes).

- [ ] **Step 3: Write the implementation**

`MensajesChat.tsx`: el `map` de mensajes que hay ahora en `Chat.tsx`, con una miniatura que acepta una URL o una promesa.

```tsx
import { useEffect, useState } from 'react';
import type { Mensaje } from '../../estudio/tipos';
import { Markdown } from '../Markdown';

function Miniatura({ fuente }: { fuente: string | Promise<string> }) {
  const [src, setSrc] = useState(typeof fuente === 'string' ? fuente : '');
  useEffect(() => {
    if (typeof fuente === 'string') setSrc(fuente);
    else void fuente.then(setSrc, () => undefined);
  }, [fuente]);
  return src ? <img src={src} alt="Captura" /> : <span className="detalle">🖼</span>;
}

export function MensajesChat({ mensajes, imagen }: { mensajes: Mensaje[]; imagen(nombre: string): string | Promise<string> }) {
  return (
    <>
      {mensajes.map((m, i) =>
        m.rol === 'diego' ? (
          <div key={i} className="burbuja-diego">
            {m.texto}
            {m.imagenes?.length ? <div className="miniaturas">{m.imagenes.map((n) => <Miniatura key={n} fuente={imagen(n)} />)}</div> : null}
          </div>
        ) : m.rol === 'claude' ? (
          <Markdown key={i} texto={m.texto} formulas className="markdown burbuja-claude" />
        ) : (
          <p key={i} className="linea-herramienta">{m.texto}</p>
        ),
      )}
    </>
  );
}
```

En `Chat.tsx`, cambiar el `p.mensajes.map(...)` por `<MensajesChat mensajes={p.mensajes} imagen={(n) => urlArchivo(p.asignatura, p.conversacion, \`imagenes/${n}\`)} />` y quitar el import de `Markdown` si ya no se usa ahí.

`ChatsCompartidos.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import { useDatos } from '../../estado/datos';
import { imagenDeChat, leerInfoRemota, leerMensajesRemotos, listarRemotos } from '../../estudio/chatsCompartidos';
import type { Mensaje } from '../../estudio/tipos';
import { MensajesChat } from './MensajesChat';

interface Fila { id: string; titulo: string; actualizado: string }

export function ListaChatsCompartidos({ chats, alAbrir }: { chats: Fila[]; alAbrir(id: string): void }) {
  if (!chats.length) return <p className="vacio">Aún no has compartido ningún chat de esta asignatura. Se comparten desde el PC o el portátil con «☁ Compartir».</p>;
  return (
    <ul className="lista">
      {chats.map((c) => (
        <li key={c.id} className="fila-proyecto">
          <button className="titulo-tarea" onClick={() => alAbrir(c.id)}>☁ {c.titulo}</button>
          <span className="detalle">{new Date(c.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
        </li>
      ))}
    </ul>
  );
}

function LectorChat({ asignatura, fila, alVolver }: { asignatura: Asignatura; fila: Fila; alVolver(): void }) {
  const { config } = useDatos();
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagen = useMemo(() => (config ? imagenDeChat(config, asignatura.id, fila.id) : () => Promise.reject(new Error('Sin llave'))), [config, asignatura.id, fila.id]);
  useEffect(() => {
    if (!config) return;
    leerMensajesRemotos(config, asignatura.id, fila.id).then(setMensajes, (e: Error) => setError(e.message));
  }, [config, asignatura.id, fila.id]);
  return (
    <section className="tarjeta chat-compartido">
      <div className="chat-cabecera">
        <button className="enlace" onClick={alVolver}>◂ Volver</button>
        <span className="titulo-chat">☁ {fila.titulo}</span>
      </div>
      <p className="detalle">Solo lectura: para seguir este chat, ábrelo en el PC o el portátil.</p>
      {error && <p className="banner error">No se ha podido abrir: {error}</p>}
      {!mensajes && !error && <p className="cargando">Cargando…</p>}
      {mensajes && <div className="chat-mensajes"><MensajesChat mensajes={mensajes} imagen={imagen} /></div>}
    </section>
  );
}

export function ChatsCompartidos({ asignatura }: { asignatura: Asignatura }) {
  const { config } = useDatos();
  const [chats, setChats] = useState<Fila[] | null>(null);
  const [abierto, setAbierto] = useState<Fila | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!config) return;
    void (async () => {
      try {
        const remotos = await listarRemotos(config, asignatura.id);
        const filas = await Promise.all(remotos.map(async (r) => {
          const info = await leerInfoRemota(config, asignatura.id, r.id).catch(() => null);
          // Sin nombre puesto por Diego, el título es su primera pregunta (como en el PC).
          const titulo = info?.nombre ?? (tituloConversacion(await leerMensajesRemotos(config, asignatura.id, r.id).catch(() => [])) || 'Chat');
          return { id: r.id, titulo, actualizado: info?.actualizado ?? new Date(0).toISOString() };
        }));
        setChats(filas.sort((a, b) => b.actualizado.localeCompare(a.actualizado)));
      } catch {
        setAviso('Sin conexión: no se pueden ver los chats compartidos.');
      }
    })();
  }, [config, asignatura.id]);
  if (!config) return null;
  if (abierto) return <LectorChat asignatura={asignatura} fila={abierto} alVolver={() => setAbierto(null)} />;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Chats compartidos</h2>
      {aviso && <p className="detalle">{aviso}</p>}
      {!chats && !aviso && <p className="cargando">Cargando…</p>}
      {chats && <ListaChatsCompartidos chats={chats} alAbrir={(id) => setAbierto(chats.find((c) => c.id === id) ?? null)} />}
    </section>
  );
}
```

Importar `tituloConversacion` desde `../../estudio/conversacion`.

`Estudio.tsx`: dentro del bloque sin programa local, debajo de `<Historial … />`, poner `<ChatsCompartidos key={asignatura.id} asignatura={asignatura} />`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/componentes/estudio/`
Expected: PASS (también las pruebas antiguas de `Chat`).

- [ ] **Step 5: Commit**

```bash
git add src/componentes/estudio/MensajesChat.tsx src/componentes/estudio/ChatsCompartidos.tsx src/componentes/estudio/ChatsCompartidos.test.tsx src/componentes/estudio/Chat.tsx src/pantallas/Estudio.tsx
git commit -m "Chats compartidos: leerlos en el móvil y la web"
```

---

### Task 11: Documentación, comprobación completa y registro

**Files:**
- Modify: `docs/portatil.md` (última línea, y un paso para comprobar el chat)
- Modify: `docs/diseno.md` (sección «Estudio: pizarras»: los chats compartidos)
- Modify: `AGENTS.md` (Estructura del código y Estado actual)
- Modify: `../my-context/AGENTS.md` (sección «Dónde está todo»: `estudios/<asignatura>/chats/`)
- Create: `.superpowers/sdd/2026-10-10-chats-compartidos/progress.md` (si no existe ya desde la Tarea 1)

- [ ] **Step 1: Docs**

`docs/portatil.md`, cambiar la última línea por:

> Los chats son de cada ordenador, salvo los que compartas: toca **«☁ Compartir»** en un chat y se subirá solo a `my-context` después de cada respuesta. En el otro ordenador aparece con ☁ en la lista de conversaciones y puedes seguirlo donde lo dejaste. En el móvil se lee en Estudio → «Chats compartidos». «☁ Compartido» → «Dejar de compartir» lo deja solo en el ordenador donde estés; 🗑 lo borra en todos.

`docs/diseno.md`, añadir tras el último punto de «Estudio: pizarras»:

> - Chats compartidos (desde 2026-10-10): `estudios/<asignatura>/chats/<id>/` con `chat.json` (`nombre?`, `compartidoEl`, `actualizado`, `dispositivo`), `conversacion.jsonl` (el de Claude Code, con `{{MY_CONTEXT}}` / `{{MY_CONTEXT_BARRAS}}` en vez de la ruta de `my-context`), `sesion/…`, las pizarras e `imagenes/`. Los escribe solo la app. En cada ordenador, `.en-curso/compartidos.json` guarda la versión (sha de la carpeta) y si hay algo sin subir. Detalle: `docs/superpowers/specs/2026-10-10-chats-compartidos-design.md`.

`AGENTS.md`, en «Estructura del código», línea de `src/estudio/`:

> Chats compartidos: `conversacion.ts` (leer `.jsonl`, también en el navegador), `chatsCompartidos.ts` (GitHub), `sincronizarChats.ts` (qué hacer con cada chat), `sincronizador.ts`, `subidaDiferida.ts`; `local/compartir.ts` y `local/portable.ts` (paquete y rutas); pantalla: `useCompartir.ts`, `ChatsCompartidos.tsx`, `MensajesChat.tsx`.

En «Estado actual», añadir la entrada de la versión (fecha, qué hay, enlaces al diseño, al plan y al registro, y «Siguiente: Diego prueba en el PC, el portátil y el iPhone»).

`../my-context/AGENTS.md`, en «Dónde está todo», línea de `estudios/`, añadir:

> `chats/` son los chats de la zona de estudio que Diego ha compartido (los escribe la app: no los toques).

- [ ] **Step 2: Comprobación completa**

Run: `npm test` y `npm run build`.
Expected: todo en verde, sin errores de tipos. Apuntar el número de pruebas en el registro.

- [ ] **Step 3: Commit**

```bash
git add docs/portatil.md docs/diseno.md AGENTS.md
git commit -m "Docs: chats compartidos"
cd ../my-context && git pull && git add AGENTS.md && git commit -m "AGENTS: carpeta chats/ de los chats compartidos" && git push
```

No subir `segundo-cerebro-app` (`git push`) sin que Diego lo sepa. Lo de `my-context` sigue su rutina de Git.

- [ ] **Step 4: Prueba manual con Diego (al terminar, con la app publicada)**

1. En el PC, abrir un chat de Cálculo con mensajes → «☁ Compartir» → pasa a «☁ Compartido». En GitHub aparece `estudios/calculo/chats/<id>/`.
2. Preguntar algo y dibujar en la pizarra: se sube solo (un commit por respuesta, otro unos segundos después del dibujo).
3. En el portátil (guía `docs/portatil.md`), abrir Estudio → Cálculo → Conversaciones: el chat sale con ☁. Abrirlo, seguir hablando y comprobar que Claude recuerda lo de antes.
4. Volver al PC: abrir la lista y el chat; está lo del portátil.
5. En el iPhone: Estudio → Cálculo → «Chats compartidos» → se lee, con capturas.
6. «☁ Compartido» → «Dejar de compartir» en el portátil: en el PC desaparece al abrir la lista, pero en el portátil se queda.
7. Compartir otro chat de prueba y borrarlo con 🗑 → desaparece en los dos ordenadores.
