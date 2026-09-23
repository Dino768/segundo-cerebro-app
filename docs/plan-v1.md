# App del segundo cerebro v1: plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una app web (PWA) gratuita para ver y editar las tareas, el calendario y los proyectos de Diego, guardados como archivos en su repositorio privado `my-context` de GitHub.

**Architecture:** App estática en React alojada en GitHub Pages. No hay servidor: la app lee y escribe los archivos de `my-context` con la API *contents* de GitHub, usando un token *fine-grained* que se pega una vez por dispositivo. La lógica pura (formato de datos, agenda, cliente de GitHub, repositorio) va separada de las pantallas y está cubierta por tests con Vitest.

**Tech Stack:** Node ≥ 20, Vite, React, TypeScript, Vitest, `yaml`, `marked` + `dompurify`, `vite-plugin-pwa`, GitHub Actions + GitHub Pages.

**Spec:** `docs/diseno.md`, en este mismo repositorio. Léelo antes de empezar.

**Execution note:** Diego es principiante. Explícale en español y con palabras sencillas qué hace cada tarea y por qué. Los pasos marcados como **[Diego]** los hace él: explícale cómo, y si es un comando, pídele que lo escriba con `!` delante en la terminal de Claude Code.

## Global Constraints

- 0 € de coste: solo GitHub (gratis) y paquetes de npm. Nada de API ni servicios de pago.
- Datos en el repositorio privado `USUARIO/my-context`: `agenda/tareas.yaml`, `agenda/areas.yaml` y `proyectos/<id>.md`, con los formatos exactos de `docs/diseno.md` §3.
- La app **nunca** sobrescribe un archivo que no ha podido leer y validar.
- Todos los textos de la interfaz, en español.
- El repositorio `segundo-cerebro-app` es público: ni tokens ni datos personales en el código.
- Ruta base de la app: `/segundo-cerebro-app/`. URL final: `https://USUARIO.github.io/segundo-cerebro-app/`.
- Los comentarios `#` de `tareas.yaml` no se conservan al guardar desde la app (queda escrito en `AGENTS.md`).
- Claude nunca ejecuta `git config`. La identidad de Git la configura Diego.
- `USUARIO` es el nombre de usuario de GitHub de Diego, que se obtiene en la Task 0.

## Review Focus

1. **Acentos, ñ y emojis** en títulos y notas ("Cálculo", "Ñandú 🎮"): deben volver idénticos tras guardar en GitHub (base64 UTF-8). Test en la Task 7.
2. **Diego edita una tarea que Claude borró mientras tanto**: al guardar, la tarea se vuelve a añadir en lugar de perderse. Test en la Task 5 (`guardarEnLista`).
3. **Diego guarda la página de un proyecto que Claude cambió desde que la abrió**: error de conflicto, sin pisar lo de Claude y sin borrar el texto de la pantalla. Test en la Task 8.
4. **Primer uso** (`tareas.yaml` vacío o inexistente): la app muestra una lista vacía y crea el archivo con el primer cambio. Tests en las Tasks 3 y 8.
5. **Fechas cerca de medianoche y cambios de hora** (horario de verano en España): "hoy" es la fecha local, nunca la UTC. Tests en la Task 2.

---

### Task 0: Preparación [Diego]

Sin código. Deja listo lo necesario.

- [ ] **Step 1: Comprobar las herramientas**

Run: `git --version` y `node --version`
Expected: Git 2.x y Node v20 o superior. Si falta Node: `winget install OpenJS.NodeJS.LTS` (pide confirmación a Diego) y abre una terminal nueva.

- [ ] **Step 2: [Diego] Cuenta de GitHub**

Si no tiene cuenta, que la cree en https://github.com/signup. Apunta su nombre de usuario (`USUARIO`).

- [ ] **Step 3: [Diego] Identidad de Git**

Que escriba en la terminal de Claude Code (el email "noreply" está en https://github.com/settings/emails):
```
! git config --global user.name "Diego Oliva"
! git config --global user.email "SU_EMAIL_NOREPLY_DE_GITHUB"
```

- [ ] **Step 4: [Diego] Crear los dos repositorios vacíos**

En https://github.com/new, sin README, sin .gitignore y sin licencia:
- `my-context` → **Private**
- `segundo-cerebro-app` → **Public**. Explícale que `docs/diseno.md` y este plan serán públicos (mencionan su nombre y su universidad) y confirma que le parece bien.

---

### Task 1: `my-context` a GitHub, con la carpeta `agenda/`

**Files (en `C:\Users\Diego\Desktop\my-context`):**
- Create: `agenda/tareas.yaml`, `agenda/areas.yaml`
- Modify: `proyectos/segundo-cerebro.md` (encabezado YAML), `AGENTS.md` (rutina de Git y agenda)

**Interfaces:**
- Produces: repositorio privado `USUARIO/my-context` con los archivos que leerá la app.

- [ ] **Step 1: Crear `agenda/areas.yaml`**

```yaml
- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
- id: personal
  nombre: Personal
  color: "#f59e0b"
- id: salud
  nombre: Salud/Deporte
  color: "#22c55e"
```

- [ ] **Step 2: Crear `agenda/tareas.yaml`**

```yaml
- id: t-20260923-1
  titulo: Probar la app del segundo cerebro en el móvil
  area: personal
  prioridad: alta
  proyecto: segundo-cerebro
```

- [ ] **Step 3: Añadir el encabezado a `proyectos/segundo-cerebro.md`**

Inserta esto al principio del archivo, antes de `# Segundo cerebro`:
```markdown
---
estado: activo
area: personal
prioridad: alta
---
```

- [ ] **Step 4: Actualizar `AGENTS.md`**

En "Dónde está todo", añade detrás de la línea de `ideas/bandeja.md`:
```markdown
- `agenda/`: `tareas.yaml` (tareas y eventos) y `areas.yaml` (áreas y colores). La app los usa.
```
Al final del archivo, añade:
```markdown
## Agenda
- Formato de `agenda/tareas.yaml`, `agenda/areas.yaml` y del encabezado de `proyectos/*.md`: `Desktop/segundo-cerebro-app/docs/diseno.md`, sección 3.
- Id de tarea nueva: `t-AAAAMMDD-n`, sin repetir ninguno existente.
- No pongas comentarios `#` en `tareas.yaml`: la app no los conserva.

## Rutina de Git (obligatoria)
- Al empezar cada sesión, ejecuta `git pull` para traer lo que Diego apuntó en la app.
- Cuando cambies archivos, ejecuta `git add -A`, `git commit -m "<qué cambió>"` y `git push`.
```

- [ ] **Step 5: Crear el repositorio local y subirlo**

```bash
cd /c/Users/Diego/Desktop/my-context
git init -b main
git add -A
git status
git commit -m "Segundo cerebro: contexto inicial y agenda"
git remote add origin https://github.com/USUARIO/my-context.git
git push -u origin main
```
Expected: `git status` muestra solo los archivos de contexto. Al hacer push se abre el navegador para que **Diego** inicie sesión en GitHub (Git Credential Manager). El push termina bien.

- [ ] **Step 6: Verificar**

Diego abre `https://github.com/USUARIO/my-context` y ve sus archivos con el candado de "Private".

---

### Task 2: Esqueleto de la app y utilidades de fechas

**Files (en `C:\Users\Diego\Desktop\segundo-cerebro-app`):**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/fechas.ts`
- Test: `src/fechas.test.ts`

**Interfaces:**
- Produces (`src/fechas.ts`): `type ISODate = string`; `DIAS: readonly ['lun','mar','mie','jue','vie','sab','dom']`; `type Dia`; `toISO(d: Date): ISODate`; `fromISO(iso): Date`; `addDays(iso, n): ISODate`; `sumarMeses(iso, n): ISODate` (devuelve el día 1 del mes resultante); `diaDeSemana(iso): Dia`; `isISODate(x: unknown): x is ISODate`; `isHora(x: unknown): x is string`; `diasSemana(iso): ISODate[]` (de lunes a domingo); `cuadriculaMes(year, month1a12): ISODate[][]`; `formatoLargo(iso): string`; `formatoCorto(iso): string`; `nombreMes(year, month1a12): string`.

- [ ] **Step 1: Crear los archivos de configuración**

`package.json`:
```json
{
  "name": "segundo-cerebro-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/segundo-cerebro-app/',
  plugins: [react()],
  test: { environment: 'node' },
});
```

`index.html`:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#6d28d9" />
    <title>Segundo cerebro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (se sustituye en la Task 9):
```tsx
export default function App() {
  return <h1>Segundo cerebro</h1>;
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
npm install react react-dom yaml marked dompurify
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vitest
```
Expected: sin errores. Si npm avisa de incompatibilidades entre versiones (*peer dependency*), instala la última versión de `vite` que acepte `@vitejs/plugin-react`.

- [ ] **Step 3: Escribir el test que falla**

`src/fechas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  addDays, cuadriculaMes, diaDeSemana, diasSemana, fromISO, isHora, isISODate, sumarMeses, toISO,
} from './fechas';

describe('fechas', () => {
  it('toISO usa la fecha local, no la UTC', () => {
    expect(toISO(new Date(2026, 8, 23, 23, 59))).toBe('2026-09-23');
    expect(toISO(new Date(2026, 8, 23, 0, 1))).toBe('2026-09-23');
  });

  it('fromISO y toISO son inversos', () => {
    expect(toISO(fromISO('2026-02-28'))).toBe('2026-02-28');
  });

  it('addDays cruza meses, años y cambios de hora', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('sumarMeses devuelve el día 1 del mes resultante', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarMeses('2026-01-15', -1)).toBe('2025-12-01');
  });

  it('diaDeSemana', () => {
    expect(diaDeSemana('2026-09-21')).toBe('lun');
    expect(diaDeSemana('2026-09-23')).toBe('mie');
    expect(diaDeSemana('2026-09-27')).toBe('dom');
  });

  it('isISODate solo acepta fechas reales AAAA-MM-DD', () => {
    expect(isISODate('2026-09-01')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-9-1')).toBe(false);
    expect(isISODate(20260901)).toBe(false);
  });

  it('isHora solo acepta HH:MM', () => {
    expect(isHora('18:00')).toBe(true);
    expect(isHora('24:00')).toBe(false);
    expect(isHora('7:00')).toBe(false);
  });

  it('diasSemana va de lunes a domingo', () => {
    expect(diasSemana('2026-09-23')).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
  });

  it('cuadriculaMes da semanas completas de lunes a domingo', () => {
    const sep = cuadriculaMes(2026, 9);
    expect(sep).toHaveLength(5);
    expect(sep[0][0]).toBe('2026-08-31');
    expect(sep[4][6]).toBe('2026-10-04');
    const dic = cuadriculaMes(2026, 12);
    expect(dic[0][0]).toBe('2026-11-30');
    expect(dic[dic.length - 1][6]).toBe('2027-01-03');
  });
});
```

- [ ] **Step 4: Ejecutar y comprobar que falla**

Run: `npx vitest run src/fechas.test.ts`
Expected: FAIL (no se puede resolver `./fechas`)

- [ ] **Step 5: Implementar `src/fechas.ts`**

```ts
export type ISODate = string;

export const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
export type Dia = (typeof DIAS)[number];

export function toISO(d: Date): ISODate {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function sumarMeses(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function diaDeSemana(iso: ISODate): Dia {
  return DIAS[(fromISO(iso).getDay() + 6) % 7];
}

export function isISODate(x: unknown): x is ISODate {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && toISO(fromISO(x)) === x;
}

export function isHora(x: unknown): x is string {
  return typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
}

export function diasSemana(iso: ISODate): ISODate[] {
  const lunes = addDays(iso, -DIAS.indexOf(diaDeSemana(iso)));
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
}

export function cuadriculaMes(year: number, month: number): ISODate[][] {
  const semanas: ISODate[][] = [];
  let lunes = diasSemana(toISO(new Date(year, month - 1, 1)))[0];
  do {
    semanas.push(diasSemana(lunes));
    lunes = addDays(lunes, 7);
  } while (fromISO(lunes).getMonth() === month - 1);
  return semanas;
}

export function formatoLargo(iso: ISODate): string {
  return fromISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatoCorto(iso: ISODate): string {
  return fromISO(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function nombreMes(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}
```

- [ ] **Step 6: Ejecutar los tests y la app**

Run: `npx vitest run src/fechas.test.ts` → Expected: PASS (9 tests)
Run: `npm run build` → Expected: sin errores de TypeScript.
Run: `npm run dev` y abre `http://localhost:5173/segundo-cerebro-app/` → se ve "Segundo cerebro". Para el servidor.

- [ ] **Step 7: Commit**

```bash
git init -b main
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src docs
git commit -m "Esqueleto de la app y utilidades de fechas"
```

---

### Task 3: Leer y escribir `tareas.yaml`

**Files:**
- Create: `src/datos/rutas.ts`, `src/datos/yaml.ts`, `src/datos/tareas.ts`
- Test: `src/datos/tareas.test.ts`

**Interfaces:**
- Consumes: `isISODate`, `isHora`, `DIAS`, `Dia`, `ISODate` de `src/fechas.ts`.
- Produces:
  - `rutas.ts`: `RUTA_TAREAS = 'agenda/tareas.yaml'`, `RUTA_AREAS = 'agenda/areas.yaml'`, `CARPETA_PROYECTOS = 'proyectos'`.
  - `yaml.ts`: `class ErrorDatos extends Error { archivo: string; linea?: number }`; `leerYaml(texto: string, archivo: string): unknown` (lanza `ErrorDatos` con la línea si el YAML está mal escrito).
  - `tareas.ts`: `type Prioridad = 'alta'|'media'|'baja'`; `PRIORIDADES: Prioridad[]`; `interface Tarea { id; titulo; area; prioridad?; fecha?; hora?; repetir?: Dia[]; proyecto?; notas?; hecha?: boolean; hechas?: ISODate[] }`; `parseTareas(texto: string): Tarea[]` (lanza `ErrorDatos`); `serializarTareas(ts: Tarea[]): string`. Los campos desconocidos se conservan en el objeto en tiempo de ejecución, aunque no estén en el tipo.

- [ ] **Step 1: Escribir el test que falla**

`src/datos/tareas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseTareas, serializarTareas } from './tareas';
import { ErrorDatos } from './yaml';

const EJEMPLO = `- id: t-20260923-1
  titulo: Ir a entrenar
  area: salud
  hora: "18:00"
  repetir: [lun, mie, vie]
  hechas: [2026-09-21]

- id: t-20260923-2
  titulo: Entregar práctica 1 de Programación
  area: uni
  prioridad: alta
  fecha: 2026-10-05

- id: t-20260923-3
  titulo: Aprender retopología en Blender
  area: videojuegos
  prioridad: alta
`;

function errorDe(texto: string): ErrorDatos {
  try {
    parseTareas(texto);
  } catch (e) {
    if (e instanceof ErrorDatos) return e;
    throw e;
  }
  throw new Error('no lanzó ErrorDatos');
}

describe('parseTareas', () => {
  it('lee el ejemplo del diseño', () => {
    const ts = parseTareas(EJEMPLO);
    expect(ts).toHaveLength(3);
    expect(ts[0]).toEqual({
      id: 't-20260923-1', titulo: 'Ir a entrenar', area: 'salud', hora: '18:00',
      repetir: ['lun', 'mie', 'vie'], hechas: ['2026-09-21'],
    });
    expect(ts[1].fecha).toBe('2026-10-05');
    expect(ts[2].prioridad).toBe('alta');
  });

  it('un archivo vacío o con [] es una lista vacía', () => {
    expect(parseTareas('')).toEqual([]);
    expect(parseTareas('  \n')).toEqual([]);
    expect(parseTareas('[]\n')).toEqual([]);
  });

  it('los campos opcionales vacíos cuentan como ausentes', () => {
    expect(parseTareas('- id: a\n  titulo: X\n  area: uni\n  fecha:\n')[0]).toEqual({ id: 'a', titulo: 'X', area: 'uni' });
  });

  it('YAML mal escrito da la línea del error', () => {
    const e = errorDe('- id: a\n  titulo: [sin cerrar\n  area: uni\n');
    expect(e.archivo).toBe('agenda/tareas.yaml');
    expect(e.linea).toBeGreaterThan(0);
    expect(e.message).toContain('línea');
  });

  it('rechaza lo que no es una lista', () => {
    expect(errorDe('titulo: suelto\n').message).toContain('lista');
  });

  it.each([
    ['- titulo: X\n  area: uni\n', 'id'],
    ['- id: a\n  area: uni\n', 'titulo'],
    ['- id: a\n  titulo: X\n', 'area'],
    ['- id: a\n  titulo: X\n  area: uni\n  prioridad: urgente\n', 'prioridad'],
    ['- id: a\n  titulo: X\n  area: uni\n  fecha: 2026-02-30\n', 'fecha'],
    ['- id: a\n  titulo: X\n  area: uni\n  hora: "7:00"\n', 'hora'],
    ['- id: a\n  titulo: X\n  area: uni\n  repetir: [lunes]\n', 'repetir'],
    ['- id: a\n  titulo: X\n  area: uni\n- id: a\n  titulo: Y\n  area: uni\n', 'repetido'],
  ])('valida los campos: %j', (texto, palabra) => {
    const e = errorDe(texto);
    expect(e.message).toContain(palabra);
    expect(e.message).toMatch(/tarea \d/);
  });
});

describe('serializarTareas', () => {
  it('ida y vuelta sin perder campos desconocidos ni acentos', () => {
    const texto = '- id: a\n  titulo: Cálculo ñ 🎮\n  area: uni\n  inventado: 42\n';
    const ts = parseTareas(texto);
    expect(parseTareas(serializarTareas(ts))).toEqual(ts);
    expect((ts[0] as unknown as Record<string, unknown>).inventado).toBe(42);
  });

  it('omite los campos undefined', () => {
    expect(serializarTareas([{ id: 'a', titulo: 'X', area: 'uni', fecha: undefined }])).not.toContain('fecha');
  });

  it('una lista vacía se guarda como []', () => {
    expect(serializarTareas([])).toBe('[]\n');
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/datos/tareas.test.ts`
Expected: FAIL (no se puede resolver `./tareas`)

- [ ] **Step 3: Implementar**

`src/datos/rutas.ts`:
```ts
export const RUTA_TAREAS = 'agenda/tareas.yaml';
export const RUTA_AREAS = 'agenda/areas.yaml';
export const CARPETA_PROYECTOS = 'proyectos';
```

`src/datos/yaml.ts`:
```ts
import { parse, YAMLParseError } from 'yaml';

export class ErrorDatos extends Error {
  readonly archivo: string;
  readonly linea?: number;

  constructor(archivo: string, mensaje: string, linea?: number) {
    super(mensaje);
    this.name = 'ErrorDatos';
    this.archivo = archivo;
    this.linea = linea;
  }
}

export function leerYaml(texto: string, archivo: string): unknown {
  try {
    return parse(texto);
  } catch (e) {
    if (e instanceof YAMLParseError) {
      const linea = e.linePos?.[0]?.line;
      throw new ErrorDatos(archivo, `YAML mal escrito${linea ? ` en la línea ${linea}` : ''}: ${e.message}`, linea);
    }
    throw e;
  }
}

export function quitarNulos(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));
}
```

`src/datos/tareas.ts`:
```ts
import { stringify } from 'yaml';
import { DIAS, isHora, isISODate, type Dia, type ISODate } from '../fechas';
import { RUTA_TAREAS } from './rutas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export type Prioridad = 'alta' | 'media' | 'baja';
export const PRIORIDADES: Prioridad[] = ['alta', 'media', 'baja'];

export interface Tarea {
  id: string;
  titulo: string;
  area: string;
  prioridad?: Prioridad;
  fecha?: ISODate;
  hora?: string;
  repetir?: Dia[];
  proyecto?: string;
  notas?: string;
  hecha?: boolean;
  hechas?: ISODate[];
}

function textoNoVacio(x: unknown): boolean {
  return typeof x === 'string' && x.trim() !== '';
}

function problema(t: Record<string, unknown>): string | null {
  if (!textoNoVacio(t.id)) return 'el campo id es obligatorio y debe ser texto';
  if (!textoNoVacio(t.titulo)) return 'el campo titulo es obligatorio';
  if (!textoNoVacio(t.area)) return 'el campo area es obligatorio';
  if (t.prioridad !== undefined && !PRIORIDADES.includes(t.prioridad as Prioridad))
    return 'prioridad debe ser alta, media o baja';
  if (t.fecha !== undefined && !isISODate(t.fecha)) return 'fecha debe tener el formato AAAA-MM-DD';
  if (t.hora !== undefined && !isHora(t.hora)) return 'hora debe tener el formato "HH:MM"';
  if (t.repetir !== undefined && (!Array.isArray(t.repetir) || !t.repetir.every((d) => (DIAS as readonly unknown[]).includes(d))))
    return 'repetir debe ser una lista de días (lun, mar, mie, jue, vie, sab, dom)';
  if (t.hechas !== undefined && (!Array.isArray(t.hechas) || !t.hechas.every(isISODate)))
    return 'hechas debe ser una lista de fechas AAAA-MM-DD';
  if (t.hecha !== undefined && typeof t.hecha !== 'boolean') return 'hecha debe ser true o false';
  if (t.proyecto !== undefined && typeof t.proyecto !== 'string') return 'proyecto debe ser texto';
  if (t.notas !== undefined && typeof t.notas !== 'string') return 'notas debe ser texto';
  return null;
}

export function parseTareas(texto: string): Tarea[] {
  const datos = leerYaml(texto, RUTA_TAREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_TAREAS, 'tareas.yaml debe ser una lista de tareas');
  const ids = new Set<string>();
  return datos.map((bruto, i) => {
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto))
      throw new ErrorDatos(RUTA_TAREAS, `tarea ${i + 1}: no es una tarea válida`);
    const t = quitarNulos(bruto as Record<string, unknown>);
    const etiqueta = `tarea ${i + 1}${typeof t.id === 'string' ? ` (${t.id})` : ''}`;
    const p = problema(t);
    if (p) throw new ErrorDatos(RUTA_TAREAS, `${etiqueta}: ${p}`);
    if (ids.has(t.id as string)) throw new ErrorDatos(RUTA_TAREAS, `${etiqueta}: id repetido`);
    ids.add(t.id as string);
    return t as unknown as Tarea;
  });
}

export function serializarTareas(ts: Tarea[]): string {
  return stringify(ts, { lineWidth: 0 });
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/datos/tareas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/datos
git commit -m "Leer, validar y escribir tareas.yaml"
```

---

### Task 4: Áreas y proyectos

**Files:**
- Create: `src/datos/areas.ts`, `src/datos/proyectos.ts`
- Test: `src/datos/areas.test.ts`, `src/datos/proyectos.test.ts`

**Interfaces:**
- Consumes: `ErrorDatos`, `leerYaml`, `quitarNulos` (Task 3); `RUTA_AREAS`, `CARPETA_PROYECTOS`; `PRIORIDADES`, `Prioridad`.
- Produces:
  - `areas.ts`: `interface Area { id: string; nombre: string; color: string }`; `parseAreas(texto): Area[]`.
  - `proyectos.ts`: `ESTADOS = ['activo','parado','idea','terminado'] as const`; `type Estado`; `interface Proyecto { id; estado: Estado; area?: string; prioridad?: Prioridad; titulo: string; cuerpo: string; meta: Record<string, unknown> }`; `tituloDesdeCuerpo(cuerpo, id): string`; `parseProyecto(id, texto): Proyecto`; `serializarProyecto(p): string`; `idProyectoDesdeTitulo(titulo, existentes: string[]): string`.

- [ ] **Step 1: Escribir los tests que fallan**

`src/datos/areas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseAreas } from './areas';

describe('parseAreas', () => {
  it('lee las áreas', () => {
    expect(parseAreas('- id: uni\n  nombre: Uni\n  color: "#3b82f6"\n')).toEqual([
      { id: 'uni', nombre: 'Uni', color: '#3b82f6' },
    ]);
  });
  it('vacío → lista vacía', () => {
    expect(parseAreas('')).toEqual([]);
  });
  it('un color sin comillas (que YAML toma como comentario) da un error claro', () => {
    expect(() => parseAreas('- id: uni\n  nombre: Uni\n  color: #3b82f6\n')).toThrow(/color/);
  });
});
```

`src/datos/proyectos.test.ts`:
```ts
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
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npx vitest run src/datos/areas.test.ts src/datos/proyectos.test.ts`
Expected: FAIL (módulos no encontrados)

- [ ] **Step 3: Implementar**

`src/datos/areas.ts`:
```ts
import { RUTA_AREAS } from './rutas';
import { ErrorDatos, leerYaml } from './yaml';

export interface Area {
  id: string;
  nombre: string;
  color: string;
}

export function parseAreas(texto: string): Area[] {
  const datos = leerYaml(texto, RUTA_AREAS);
  if (datos === null || datos === undefined) return [];
  if (!Array.isArray(datos)) throw new ErrorDatos(RUTA_AREAS, 'areas.yaml debe ser una lista de áreas');
  return datos.map((bruto, i) => {
    const a = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.nombre !== 'string')
      throw new ErrorDatos(RUTA_AREAS, `área ${i + 1}: necesita id y nombre`);
    if (typeof a.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(a.color))
      throw new ErrorDatos(RUTA_AREAS, `área ${i + 1} (${a.id}): color debe escribirse entre comillas, como "#3b82f6"`);
    return { id: a.id, nombre: a.nombre, color: a.color };
  });
}
```

`src/datos/proyectos.ts`:
```ts
import { stringify } from 'yaml';
import { CARPETA_PROYECTOS } from './rutas';
import { PRIORIDADES, type Prioridad } from './tareas';
import { ErrorDatos, leerYaml, quitarNulos } from './yaml';

export const ESTADOS = ['activo', 'parado', 'idea', 'terminado'] as const;
export type Estado = (typeof ESTADOS)[number];

export interface Proyecto {
  id: string;
  estado: Estado;
  area?: string;
  prioridad?: Prioridad;
  titulo: string;
  cuerpo: string;
  meta: Record<string, unknown>;
}

export function tituloDesdeCuerpo(cuerpo: string, id: string): string {
  return /^# (.+)$/m.exec(cuerpo)?.[1].trim() || id;
}

export function parseProyecto(id: string, texto: string): Proyecto {
  const archivo = `${CARPETA_PROYECTOS}/${id}.md`;
  const normal = texto.replace(/\r\n/g, '\n');
  let meta: Record<string, unknown> = {};
  let cuerpo = normal;

  if (normal.startsWith('---\n')) {
    let fin = normal.indexOf('\n---\n', 3);
    if (fin === -1 && normal.endsWith('\n---')) fin = normal.length - 4;
    if (fin !== -1) {
      const datos = leerYaml(normal.slice(4, fin + 1), archivo);
      if (datos !== null && datos !== undefined && (typeof datos !== 'object' || Array.isArray(datos)))
        throw new ErrorDatos(archivo, 'el encabezado debe tener campos como "estado: activo"');
      meta = quitarNulos((datos ?? {}) as Record<string, unknown>);
      cuerpo = normal.slice(fin + 5);
    }
  }

  const estado = meta.estado ?? 'idea';
  if (!(ESTADOS as readonly unknown[]).includes(estado))
    throw new ErrorDatos(archivo, 'estado debe ser activo, parado, idea o terminado');
  if (meta.area !== undefined && typeof meta.area !== 'string') throw new ErrorDatos(archivo, 'area debe ser texto');
  if (meta.prioridad !== undefined && !PRIORIDADES.includes(meta.prioridad as Prioridad))
    throw new ErrorDatos(archivo, 'prioridad debe ser alta, media o baja');

  return {
    id,
    estado: estado as Estado,
    area: meta.area as string | undefined,
    prioridad: meta.prioridad as Prioridad | undefined,
    titulo: tituloDesdeCuerpo(cuerpo, id),
    cuerpo,
    meta,
  };
}

export function serializarProyecto(p: Proyecto): string {
  const encabezado = { ...p.meta, estado: p.estado, area: p.area, prioridad: p.prioridad };
  return `---\n${stringify(encabezado, { lineWidth: 0 })}---\n${p.cuerpo}`;
}

export function idProyectoDesdeTitulo(titulo: string, existentes: string[]): string {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'proyecto';
  let id = base;
  for (let n = 2; existentes.includes(id); n++) id = `${base}-${n}`;
  return id;
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/datos`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/datos
git commit -m "Leer y escribir áreas y proyectos"
```

---

### Task 5: Lógica de la agenda (tareas)

**Files:**
- Create: `src/agenda/tareas.ts`
- Test: `src/agenda/tareas.test.ts`

**Interfaces:**
- Consumes: `Tarea`, `Prioridad` (Task 3); `diaDeSemana`, `toISO`, `ISODate` (Task 2).
- Produces: `type TareaSinId = Omit<Tarea, 'id'> & { id?: string }`; `prioridadDe(x: { prioridad?: Prioridad }): Prioridad`; `compararPrioridad(a, b): number`; `esRepetida(t): boolean`; `ocurreEl(t, dia): boolean`; `hechaEl(t, dia): boolean`; `tareasDelDia(ts, dia): Tarea[]`; `atrasadas(ts, hoy): Tarea[]`; `proximas(ts, hoy): Tarea[]`; `repetidas(ts): Tarea[]`; `sinFecha(ts): Tarea[]`; `topSinFecha(ts, n = 3): Tarea[]`; `alternarHecha(t, dia): Tarea`; `nuevoIdTarea(ahora: Date, existentes: Tarea[]): string`; `guardarEnLista(ts, t: TareaSinId, ahora: Date): Tarea[]`; `borrarDeLista(ts, id): Tarea[]`; `alternarEnLista(ts, id, dia): Tarea[]`.

- [ ] **Step 1: Escribir el test que falla**

`src/agenda/tareas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import {
  alternarEnLista, alternarHecha, atrasadas, borrarDeLista, guardarEnLista, hechaEl, nuevoIdTarea,
  ocurreEl, proximas, repetidas, sinFecha, tareasDelDia, topSinFecha,
} from './tareas';

const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'uni', ...x });
const ids = (ts: Tarea[]) => ts.map((x) => x.id);

// 2026-09-21 es lunes; 2026-09-23 es miércoles.
describe('ocurreEl', () => {
  it('una tarea con fecha ocurre solo ese día', () => {
    expect(ocurreEl(t({ id: 'a', fecha: '2026-09-23' }), '2026-09-23')).toBe(true);
    expect(ocurreEl(t({ id: 'a', fecha: '2026-09-23' }), '2026-09-24')).toBe(false);
  });
  it('una tarea repetida ocurre los días indicados', () => {
    const r = t({ id: 'r', repetir: ['lun', 'mie'] });
    expect(ocurreEl(r, '2026-09-21')).toBe(true);
    expect(ocurreEl(r, '2026-09-22')).toBe(false);
  });
  it('una repetida con fecha empieza ese día', () => {
    const r = t({ id: 'r', repetir: ['lun'], fecha: '2026-09-23' });
    expect(ocurreEl(r, '2026-09-21')).toBe(false);
    expect(ocurreEl(r, '2026-09-28')).toBe(true);
  });
  it('una tarea sin fecha ni repetición no aparece en ningún día', () => {
    expect(ocurreEl(t({ id: 's' }), '2026-09-23')).toBe(false);
  });
});

describe('tareasDelDia', () => {
  it('primero las que tienen hora (por hora) y luego el resto por prioridad', () => {
    const dia = '2026-09-23';
    const ts = [
      t({ id: 'tarde', fecha: dia, hora: '18:00', prioridad: 'baja' }),
      t({ id: 'sinHoraBaja', fecha: dia, prioridad: 'baja' }),
      t({ id: 'manana', fecha: dia, hora: '09:00' }),
      t({ id: 'sinHoraAlta', fecha: dia, prioridad: 'alta' }),
      t({ id: 'otroDia', fecha: '2026-09-24' }),
    ];
    expect(ids(tareasDelDia(ts, dia))).toEqual(['manana', 'tarde', 'sinHoraAlta', 'sinHoraBaja']);
  });
});

describe('hechaEl y alternarHecha', () => {
  it('tarea normal', () => {
    const a = t({ id: 'a', fecha: '2026-09-23' });
    expect(hechaEl(a, '2026-09-23')).toBe(false);
    expect(hechaEl(alternarHecha(a, '2026-09-23'), '2026-09-23')).toBe(true);
  });
  it('tarea repetida: se marca por día', () => {
    const r = t({ id: 'r', repetir: ['lun'] });
    const marcada = alternarHecha(r, '2026-09-21');
    expect(marcada.hechas).toEqual(['2026-09-21']);
    expect(hechaEl(marcada, '2026-09-28')).toBe(false);
    expect(alternarHecha(marcada, '2026-09-21').hechas).toBeUndefined();
  });
});

describe('listas', () => {
  const hoy = '2026-09-23';
  const ts = [
    t({ id: 'vieja', fecha: '2026-09-01' }),
    t({ id: 'viejaHecha', fecha: '2026-09-01', hecha: true }),
    t({ id: 'ayer', fecha: '2026-09-22', prioridad: 'alta' }),
    t({ id: 'rep', repetir: ['lun'] }),
    t({ id: 'futura', fecha: '2026-10-05' }),
    t({ id: 'hoy', fecha: hoy }),
    t({ id: 'sfBaja', prioridad: 'baja' }),
    t({ id: 'sfMedia' }),
    t({ id: 'sfAlta', prioridad: 'alta' }),
    t({ id: 'sfAlta2', prioridad: 'alta' }),
    t({ id: 'sfHecha', prioridad: 'alta', hecha: true }),
  ];

  it('atrasadas: con fecha pasada y sin hacer, nunca repetidas', () => {
    expect(ids(atrasadas(ts, hoy))).toEqual(['vieja', 'ayer']);
  });
  it('proximas: de hoy en adelante y sin hacer', () => {
    expect(ids(proximas(ts, hoy))).toEqual(['hoy', 'futura']);
  });
  it('repetidas', () => {
    expect(ids(repetidas(ts))).toEqual(['rep']);
  });
  it('sinFecha: por prioridad y con las hechas al final', () => {
    expect(ids(sinFecha(ts))).toEqual(['sfAlta', 'sfAlta2', 'sfMedia', 'sfBaja', 'sfHecha']);
  });
  it('topSinFecha: las 3 más prioritarias sin hacer', () => {
    expect(ids(topSinFecha(ts))).toEqual(['sfAlta', 'sfAlta2', 'sfMedia']);
  });
});

describe('nuevoIdTarea', () => {
  const ahora = new Date(2026, 8, 23, 12);
  it('usa el siguiente número libre del día', () => {
    expect(nuevoIdTarea(ahora, [t({ id: 't-20260923-1' }), t({ id: 't-20260923-4' }), t({ id: 't-20260922-9' })])).toBe('t-20260923-5');
  });
  it('empieza en 1', () => {
    expect(nuevoIdTarea(ahora, [])).toBe('t-20260923-1');
  });
});

describe('cambios sobre la lista', () => {
  const ahora = new Date(2026, 8, 23, 12);
  const ts = [t({ id: 'a' }), t({ id: 'b' })];

  it('guardarEnLista añade una tarea nueva con id', () => {
    const r = guardarEnLista(ts, { titulo: 'Nueva', area: 'uni' }, ahora);
    expect(r).toHaveLength(3);
    expect(r[2]).toEqual({ id: 't-20260923-1', titulo: 'Nueva', area: 'uni' });
  });
  it('guardarEnLista sustituye una tarea existente en su sitio', () => {
    expect(guardarEnLista(ts, { id: 'a', titulo: 'Cambiada', area: 'uni' }, ahora)[0].titulo).toBe('Cambiada');
  });
  it('guardarEnLista vuelve a añadir una tarea que se borró mientras se editaba', () => {
    const r = guardarEnLista([t({ id: 'b' })], { id: 'a', titulo: 'Editada', area: 'uni' }, ahora);
    expect(ids(r)).toEqual(['b', 'a']);
  });
  it('borrarDeLista', () => {
    expect(ids(borrarDeLista(ts, 'a'))).toEqual(['b']);
  });
  it('alternarEnLista cambia solo esa tarea', () => {
    const r = alternarEnLista(ts, 'b', '2026-09-23');
    expect(r[0].hecha).toBeUndefined();
    expect(r[1].hecha).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/agenda/tareas.test.ts`
Expected: FAIL (módulo no encontrado)

- [ ] **Step 3: Implementar `src/agenda/tareas.ts`**

```ts
import type { Prioridad, Tarea } from '../datos/tareas';
import { diaDeSemana, toISO, type ISODate } from '../fechas';

export type TareaSinId = Omit<Tarea, 'id'> & { id?: string };

const RANGO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export function prioridadDe(x: { prioridad?: Prioridad }): Prioridad {
  return x.prioridad ?? 'media';
}

export function compararPrioridad(a: { prioridad?: Prioridad }, b: { prioridad?: Prioridad }): number {
  return RANGO[prioridadDe(a)] - RANGO[prioridadDe(b)];
}

export function esRepetida(t: Tarea): boolean {
  return (t.repetir?.length ?? 0) > 0;
}

export function ocurreEl(t: Tarea, dia: ISODate): boolean {
  if (esRepetida(t)) return t.repetir!.includes(diaDeSemana(dia)) && (!t.fecha || dia >= t.fecha);
  return t.fecha === dia;
}

export function hechaEl(t: Tarea, dia: ISODate): boolean {
  return esRepetida(t) ? (t.hechas ?? []).includes(dia) : t.hecha === true;
}

function compararHora(a: Tarea, b: Tarea): number {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return 0;
}

export function tareasDelDia(ts: Tarea[], dia: ISODate): Tarea[] {
  return ts.filter((t) => ocurreEl(t, dia)).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
}

export function atrasadas(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !!t.fecha && t.fecha < hoy && !t.hecha)
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!) || compararPrioridad(a, b));
}

export function proximas(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !!t.fecha && t.fecha >= hoy && !t.hecha)
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!) || compararHora(a, b) || compararPrioridad(a, b));
}

export function repetidas(ts: Tarea[]): Tarea[] {
  return ts.filter(esRepetida).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
}

export function sinFecha(ts: Tarea[]): Tarea[] {
  return ts
    .filter((t) => !esRepetida(t) && !t.fecha)
    .sort((a, b) => Number(!!a.hecha) - Number(!!b.hecha) || compararPrioridad(a, b));
}

export function topSinFecha(ts: Tarea[], n = 3): Tarea[] {
  return sinFecha(ts)
    .filter((t) => !t.hecha)
    .slice(0, n);
}

export function alternarHecha(t: Tarea, dia: ISODate): Tarea {
  if (esRepetida(t)) {
    const actuales = t.hechas ?? [];
    const hechas = actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia].sort();
    return { ...t, hechas: hechas.length ? hechas : undefined };
  }
  return { ...t, hecha: !t.hecha };
}

export function nuevoIdTarea(ahora: Date, existentes: Tarea[]): string {
  const prefijo = `t-${toISO(ahora).replace(/-/g, '')}-`;
  let max = 0;
  for (const t of existentes) {
    if (!t.id.startsWith(prefijo)) continue;
    const n = Number(t.id.slice(prefijo.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefijo}${max + 1}`;
}

export function guardarEnLista(ts: Tarea[], t: TareaSinId, ahora: Date): Tarea[] {
  if (t.id && ts.some((x) => x.id === t.id)) return ts.map((x) => (x.id === t.id ? (t as Tarea) : x));
  return [...ts, { ...t, id: t.id ?? nuevoIdTarea(ahora, ts) }];
}

export function borrarDeLista(ts: Tarea[], id: string): Tarea[] {
  return ts.filter((t) => t.id !== id);
}

export function alternarEnLista(ts: Tarea[], id: string, dia: ISODate): Tarea[] {
  return ts.map((t) => (t.id === id ? alternarHecha(t, dia) : t));
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/agenda/tareas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agenda
git commit -m "Lógica de la agenda: días, atrasadas, prioridades y cambios"
```

---

### Task 6: Lógica de proyectos

**Files:**
- Create: `src/agenda/proyectos.ts`
- Test: `src/agenda/proyectos.test.ts`

**Interfaces:**
- Consumes: `Proyecto`, `Estado` (Task 4); `compararPrioridad` (Task 5).
- Produces: `LIMITE_ACTIVOS = 2`; `necesitaAvisoActivos(ps: Proyecto[], id: string, nuevoEstado: Estado): boolean` (true solo al **pasar** a activo con ≥ 2 activos más); `ordenarProyectos(ps): Proyecto[]` (activo > parado > idea > terminado, luego prioridad y luego título).

- [ ] **Step 1: Escribir el test que falla**

`src/agenda/proyectos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../datos/proyectos';
import { necesitaAvisoActivos, ordenarProyectos } from './proyectos';

const p = (x: Partial<Proyecto> & { id: string }): Proyecto => ({
  estado: 'idea', titulo: x.id, cuerpo: '', meta: {}, ...x,
});

describe('necesitaAvisoActivos', () => {
  const ps = [p({ id: 'a', estado: 'activo' }), p({ id: 'b', estado: 'activo' }), p({ id: 'c' })];
  it('avisa al activar un tercer proyecto', () => {
    expect(necesitaAvisoActivos(ps, 'c', 'activo')).toBe(true);
  });
  it('no avisa si el proyecto ya estaba activo', () => {
    expect(necesitaAvisoActivos(ps, 'a', 'activo')).toBe(false);
  });
  it('no avisa con menos de 2 activos', () => {
    expect(necesitaAvisoActivos(ps.slice(1), 'c', 'activo')).toBe(false);
  });
  it('no avisa si el nuevo estado no es activo', () => {
    expect(necesitaAvisoActivos(ps, 'c', 'parado')).toBe(false);
  });
});

describe('ordenarProyectos', () => {
  it('por estado, prioridad y título', () => {
    const r = ordenarProyectos([
      p({ id: 'fin', estado: 'terminado' }),
      p({ id: 'idea' }),
      p({ id: 'zeta', estado: 'activo' }),
      p({ id: 'alfa', estado: 'activo' }),
      p({ id: 'urgente', estado: 'activo', prioridad: 'alta' }),
      p({ id: 'parado', estado: 'parado' }),
    ]);
    expect(r.map((x) => x.id)).toEqual(['urgente', 'alfa', 'zeta', 'parado', 'idea', 'fin']);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/agenda/proyectos.test.ts`
Expected: FAIL (módulo no encontrado)

- [ ] **Step 3: Implementar `src/agenda/proyectos.ts`**

```ts
import type { Estado, Proyecto } from '../datos/proyectos';
import { compararPrioridad } from './tareas';

export const LIMITE_ACTIVOS = 2;

export function necesitaAvisoActivos(ps: Proyecto[], id: string, nuevoEstado: Estado): boolean {
  if (nuevoEstado !== 'activo') return false;
  if (ps.find((p) => p.id === id)?.estado === 'activo') return false;
  return ps.filter((p) => p.estado === 'activo' && p.id !== id).length >= LIMITE_ACTIVOS;
}

const ORDEN_ESTADO: Record<Estado, number> = { activo: 0, parado: 1, idea: 2, terminado: 3 };

export function ordenarProyectos(ps: Proyecto[]): Proyecto[] {
  return [...ps].sort(
    (a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
      compararPrioridad(a, b) ||
      a.titulo.localeCompare(b.titulo, 'es'),
  );
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/agenda`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agenda
git commit -m "Aviso de más de 2 proyectos activos y orden de proyectos"
```

---

### Task 7: Cliente de GitHub

**Files:**
- Create: `src/github/cliente.ts`
- Test: `src/github/cliente.test.ts`

**Interfaces:**
- Produces: `interface Config { owner: string; repo: string; token: string }`; `class ErrorGitHub extends Error { tipo: 'token'|'conflicto'|'no-existe'|'red'|'otro'; estado?: number }` con el constructor `(tipo, mensaje, estado?)`; `interface Archivo { texto: string; sha: string }`; `leerArchivo(cfg, ruta): Promise<Archivo>`; `listarCarpeta(cfg, ruta): Promise<string[]>` (solo nombres de archivos; `[]` si la carpeta no existe); `escribirArchivo(cfg, ruta, texto, sha: string | null, mensaje): Promise<string>` (devuelve el sha nuevo); `actualizarArchivo(cfg, ruta, transformar: (texto: string | null) => string, mensaje): Promise<string>` (relee, transforma y escribe; si hay conflicto, reintenta una vez; devuelve el texto escrito).

- [ ] **Step 1: Escribir el test que falla**

`src/github/cliente.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarArchivo, escribirArchivo, leerArchivo, listarCarpeta } from './cliente';

const cfg = { owner: 'diego', repo: 'my-context', token: 'secreto' };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
const b64 = (texto: string) => Buffer.from(texto, 'utf8').toString('base64');
// GitHub devuelve el base64 partido en líneas
const archivo = (texto: string, sha: string) =>
  json(200, { type: 'file', content: b64(texto).replace(/(.{20})/g, '$1\n'), sha });
const cuerpoDe = (llamada: number) => JSON.parse(fetchMock.mock.calls[llamada][1].body);

describe('leerArchivo', () => {
  it('lee texto con acentos, ñ y emojis', async () => {
    fetchMock.mockResolvedValueOnce(archivo('Ñandú: práctica de Cálculo 🎮\n', 's1'));
    expect(await leerArchivo(cfg, 'agenda/tareas.yaml')).toEqual({ texto: 'Ñandú: práctica de Cálculo 🎮\n', sha: 's1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/diego/my-context/contents/agenda/tareas.yaml');
    expect(init.headers.Authorization).toBe('Bearer secreto');
  });

  it('token inválido → tipo token', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Bad credentials' }));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'token' });
  });

  it('sin red → tipo red', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'red' });
  });

  it('no existe → tipo no-existe', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    await expect(leerArchivo(cfg, 'x')).rejects.toMatchObject({ tipo: 'no-existe' });
  });
});

describe('listarCarpeta', () => {
  it('devuelve solo archivos', async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ name: 'a.md', type: 'file' }, { name: 'sub', type: 'dir' }]));
    expect(await listarCarpeta(cfg, 'proyectos')).toEqual(['a.md']);
  });
  it('carpeta inexistente → lista vacía', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { message: 'Not Found' }));
    expect(await listarCarpeta(cfg, 'proyectos')).toEqual([]);
  });
});

describe('escribirArchivo', () => {
  it('envía el texto en base64 UTF-8, con el sha y el mensaje', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { content: { sha: 's2' } }));
    expect(await escribirArchivo(cfg, 'a.yaml', 'Cálculo ñ 🎮', 's1', 'msg')).toBe('s2');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    const cuerpo = cuerpoDe(0);
    expect(cuerpo.sha).toBe('s1');
    expect(cuerpo.message).toBe('msg');
    expect(Buffer.from(cuerpo.content, 'base64').toString('utf8')).toBe('Cálculo ñ 🎮');
  });
  it('409 → tipo conflicto', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { message: 'conflict' }));
    await expect(escribirArchivo(cfg, 'a', 'x', 's', 'm')).rejects.toMatchObject({ tipo: 'conflicto' });
  });
});

describe('actualizarArchivo', () => {
  it('si hay conflicto, relee y reintenta una vez sobre la versión nueva', async () => {
    fetchMock
      .mockResolvedValueOnce(archivo('v1', 's1'))
      .mockResolvedValueOnce(json(409, { message: 'conflict' }))
      .mockResolvedValueOnce(archivo('v2', 's2'))
      .mockResolvedValueOnce(json(200, { content: { sha: 's3' } }));
    const vistos: (string | null)[] = [];
    const escrito = await actualizarArchivo(cfg, 'a', (t) => {
      vistos.push(t);
      return `${t}+cambio`;
    }, 'm');
    expect(vistos).toEqual(['v1', 'v2']);
    expect(escrito).toBe('v2+cambio');
    expect(cuerpoDe(3).sha).toBe('s2');
  });

  it('si el conflicto se repite, lanza error de conflicto', async () => {
    fetchMock
      .mockResolvedValueOnce(archivo('v1', 's1'))
      .mockResolvedValueOnce(json(409, {}))
      .mockResolvedValueOnce(archivo('v2', 's2'))
      .mockResolvedValueOnce(json(409, {}));
    await expect(actualizarArchivo(cfg, 'a', (t) => `${t}`, 'm')).rejects.toMatchObject({ tipo: 'conflicto' });
  });

  it('si el archivo no existe, lo crea sin sha', async () => {
    fetchMock.mockResolvedValueOnce(json(404, {})).mockResolvedValueOnce(json(201, { content: { sha: 'n' } }));
    const escrito = await actualizarArchivo(cfg, 'a', (t) => (t === null ? 'nuevo' : 'mal'), 'm');
    expect(escrito).toBe('nuevo');
    expect(cuerpoDe(1).sha).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/github/cliente.test.ts`
Expected: FAIL (módulo no encontrado)

- [ ] **Step 3: Implementar `src/github/cliente.ts`**

```ts
export interface Config {
  owner: string;
  repo: string;
  token: string;
}

export type TipoErrorGitHub = 'token' | 'conflicto' | 'no-existe' | 'red' | 'otro';

export class ErrorGitHub extends Error {
  readonly tipo: TipoErrorGitHub;
  readonly estado?: number;

  constructor(tipo: TipoErrorGitHub, mensaje: string, estado?: number) {
    super(mensaje);
    this.name = 'ErrorGitHub';
    this.tipo = tipo;
    this.estado = estado;
  }
}

export interface Archivo {
  texto: string;
  sha: string;
}

function base64ATexto(b64: string): string {
  const binario = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

function textoABase64(texto: string): string {
  let binario = '';
  for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte);
  return btoa(binario);
}

async function peticion(cfg: Config, ruta: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cfg.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ErrorGitHub('red', 'Sin conexión con GitHub');
  }
  if (res.ok) return res;
  if (res.status === 401 || res.status === 403)
    throw new ErrorGitHub('token', 'La llave de GitHub no es válida o ha caducado', res.status);
  if (res.status === 404) throw new ErrorGitHub('no-existe', `No existe ${ruta}`, res.status);
  if (res.status === 409 || res.status === 422)
    throw new ErrorGitHub('conflicto', `${ruta} ha cambiado en GitHub mientras tanto`, res.status);
  const cuerpo = (await res.json().catch(() => null)) as { message?: string } | null;
  throw new ErrorGitHub('otro', `Error de GitHub (${res.status}): ${cuerpo?.message ?? res.statusText}`, res.status);
}

export async function leerArchivo(cfg: Config, ruta: string): Promise<Archivo> {
  const j = await (await peticion(cfg, ruta)).json();
  if (Array.isArray(j) || j.type !== 'file') throw new ErrorGitHub('otro', `${ruta} no es un archivo`);
  return { texto: base64ATexto(j.content), sha: j.sha };
}

export async function listarCarpeta(cfg: Config, ruta: string): Promise<string[]> {
  try {
    const j = (await (await peticion(cfg, ruta)).json()) as { name: string; type: string }[];
    return j.filter((e) => e.type === 'file').map((e) => e.name);
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return [];
    throw e;
  }
}

export async function escribirArchivo(
  cfg: Config, ruta: string, texto: string, sha: string | null, mensaje: string,
): Promise<string> {
  const res = await peticion(cfg, ruta, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: textoABase64(texto), ...(sha ? { sha } : {}) }),
  });
  return (await res.json()).content.sha;
}

export async function actualizarArchivo(
  cfg: Config, ruta: string, transformar: (texto: string | null) => string, mensaje: string,
): Promise<string> {
  for (let intento = 0; ; intento++) {
    let actual: Archivo | null = null;
    try {
      actual = await leerArchivo(cfg, ruta);
    } catch (e) {
      if (!(e instanceof ErrorGitHub && e.tipo === 'no-existe')) throw e;
    }
    const nuevo = transformar(actual?.texto ?? null);
    try {
      await escribirArchivo(cfg, ruta, nuevo, actual?.sha ?? null, mensaje);
      return nuevo;
    } catch (e) {
      if (e instanceof ErrorGitHub && e.tipo === 'conflicto' && intento === 0) continue;
      throw e;
    }
  }
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx vitest run src/github`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/github
git commit -m "Cliente de GitHub: leer, escribir y reintentar si hay conflicto"
```

---

### Task 8: Repositorio (cargar todo y guardar cambios)

**Files:**
- Create: `src/repositorio.ts`
- Test: `src/repositorio.test.ts`

**Interfaces:**
- Consumes: `leerArchivo`, `listarCarpeta`, `actualizarArchivo`, `ErrorGitHub`, `Config` (Task 7); `parseTareas`, `serializarTareas`, `Tarea` (Task 3); `parseAreas`, `Area`, `parseProyecto`, `serializarProyecto`, `Proyecto` (Task 4); `ErrorDatos`; rutas.
- Produces: `interface Datos { tareas: Tarea[]; areas: Area[]; proyectos: Proyecto[]; errores: ErrorDatos[] }`; `cargarTodo(cfg): Promise<Datos>` (los archivos rotos van a `errores` y no impiden cargar el resto); `modificarTareas(cfg, cambio: (ts: Tarea[]) => Tarea[], mensaje): Promise<Tarea[]>` (aplica el cambio sobre la versión remota más reciente y lanza `ErrorDatos` sin escribir si el remoto está roto); `guardarProyecto(cfg, p: Proyecto, original: Proyecto | null): Promise<void>` (lanza `ErrorGitHub('conflicto')` si el remoto cambió desde `original`, o si ya existe cuando `original` es `null`).

- [ ] **Step 1: Escribir el test que falla**

`src/repositorio.test.ts`:
```ts
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
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/repositorio.test.ts`
Expected: FAIL (módulo no encontrado)

- [ ] **Step 3: Implementar `src/repositorio.ts`**

```ts
import { parseAreas, type Area } from './datos/areas';
import { parseProyecto, serializarProyecto, type Proyecto } from './datos/proyectos';
import { CARPETA_PROYECTOS, RUTA_AREAS, RUTA_TAREAS } from './datos/rutas';
import { parseTareas, serializarTareas, type Tarea } from './datos/tareas';
import { ErrorDatos } from './datos/yaml';
import { actualizarArchivo, ErrorGitHub, leerArchivo, listarCarpeta, type Config } from './github/cliente';

export interface Datos {
  tareas: Tarea[];
  areas: Area[];
  proyectos: Proyecto[];
  errores: ErrorDatos[];
}

async function leerOpcional(cfg: Config, ruta: string): Promise<string | null> {
  try {
    return (await leerArchivo(cfg, ruta)).texto;
  } catch (e) {
    if (e instanceof ErrorGitHub && e.tipo === 'no-existe') return null;
    throw e;
  }
}

function intentar<T>(errores: ErrorDatos[], leer: () => T, porDefecto: T): T {
  try {
    return leer();
  } catch (e) {
    if (e instanceof ErrorDatos) {
      errores.push(e);
      return porDefecto;
    }
    throw e;
  }
}

export async function cargarTodo(cfg: Config): Promise<Datos> {
  const errores: ErrorDatos[] = [];
  const [textoTareas, textoAreas, nombres] = await Promise.all([
    leerOpcional(cfg, RUTA_TAREAS),
    leerOpcional(cfg, RUTA_AREAS),
    listarCarpeta(cfg, CARPETA_PROYECTOS),
  ]);
  const tareas = intentar(errores, () => (textoTareas === null ? [] : parseTareas(textoTareas)), []);
  const areas = intentar(errores, () => (textoAreas === null ? [] : parseAreas(textoAreas)), []);
  const leidos = await Promise.all(
    nombres
      .filter((n) => n.endsWith('.md'))
      .map(async (n) => {
        const id = n.slice(0, -3);
        const { texto } = await leerArchivo(cfg, `${CARPETA_PROYECTOS}/${n}`);
        return intentar<Proyecto | null>(errores, () => parseProyecto(id, texto), null);
      }),
  );
  return { tareas, areas, proyectos: leidos.filter((p): p is Proyecto => p !== null), errores };
}

export async function modificarTareas(
  cfg: Config, cambio: (ts: Tarea[]) => Tarea[], mensaje: string,
): Promise<Tarea[]> {
  let resultado: Tarea[] = [];
  await actualizarArchivo(cfg, RUTA_TAREAS, (texto) => {
    resultado = cambio(texto === null ? [] : parseTareas(texto));
    return serializarTareas(resultado);
  }, mensaje);
  return resultado;
}

export async function guardarProyecto(cfg: Config, p: Proyecto, original: Proyecto | null): Promise<void> {
  await actualizarArchivo(cfg, `${CARPETA_PROYECTOS}/${p.id}.md`, (remoto) => {
    if (remoto !== null && !original)
      throw new ErrorGitHub('conflicto', `Ya existe un proyecto con el id "${p.id}"`);
    if (remoto !== null && original && serializarProyecto(parseProyecto(p.id, remoto)) !== serializarProyecto(original))
      throw new ErrorGitHub(
        'conflicto',
        'Este proyecto ha cambiado desde que lo abriste (quizá lo editó Claude). Copia tu texto, pulsa Recargar y vuelve a pegarlo.',
      );
    return serializarProyecto(p);
  }, `${original ? 'Editar' : 'Crear'} proyecto: ${p.titulo}`);
}
```

- [ ] **Step 4: Ejecutar todos los tests**

Run: `npm test`
Expected: PASS (todos)

- [ ] **Step 5: Commit**

```bash
git add src/repositorio.ts src/repositorio.test.ts
git commit -m "Repositorio: cargar datos y guardar cambios sin pisar otros"
```

---

### Task 9: Estado de la app, pantalla de ajustes y estructura visual

**Files:**
- Create: `src/estado/config.ts`, `src/estado/cache.ts`, `src/estado/datos.tsx`, `src/pantallas/Ajustes.tsx`, `src/componentes/areas.ts`, `src/estilos.css`
- Modify: `src/App.tsx` (se sustituye entero), `src/main.tsx` (importar los estilos)

**Interfaces:**
- Consumes: `Config`, `ErrorGitHub` (Task 7); `Datos`, `cargarTodo`, `modificarTareas`, `guardarProyecto` (Task 8); `parseProyecto`, `serializarProyecto`; `ErrorDatos`; `RUTA_TAREAS`.
- Produces:
  - `estado/datos.tsx`: `ProveedorDatos`; `useDatos(): ValorDatos` con `{ estado: 'sin-config'|'cargando'|'listo'|'sin-conexion'|'error-token'; datos: Datos; config: Config | null; aviso: string | null; soloLectura: boolean; tareasBloqueadas: boolean; cerrarAviso(): void; recargar(): Promise<void>; conectar(c: Config): void; desconectar(): void; cambiarTareas(cambio: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>; guardarProyecto(p: Proyecto, original: Proyecto | null): Promise<boolean> }`.
  - `componentes/areas.ts`: `colorDeArea(areas: Area[], id: string | undefined): string`.
  - Clases CSS que usan las Tasks 10 a 13: `barra`, `lista`, `fila-tarea`, `fila-proyecto`, `hecha`, `punto`, `titulo-tarea`, `detalle`, `prioridad`, `estado`, `vacio`, `atrasadas`, `fondo-modal`, `modal`, `fila-campos`, `dia`, `botones`, `peligro`, `activa`, `filtros`, `pestanas-mini`, `editor`, `markdown`, `cal-*`.

- [ ] **Step 1: `src/estado/config.ts`**

```ts
import type { Config } from '../github/cliente';

const CLAVE = 'sc-config';

export function leerConfig(): Config | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Config | null;
    return c && c.owner && c.repo && c.token ? c : null;
  } catch {
    return null;
  }
}

export function guardarConfig(c: Config): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    // navegador sin almacenamiento: la llave solo dura esta sesión
  }
}

export function borrarConfig(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
```

- [ ] **Step 2: `src/estado/cache.ts`**

```ts
import type { Datos } from '../repositorio';

const CLAVE = 'sc-datos';
type DatosCache = Omit<Datos, 'errores'>;

export function guardarCache(d: Datos): void {
  try {
    const copia: DatosCache = { tareas: d.tareas, areas: d.areas, proyectos: d.proyectos };
    localStorage.setItem(CLAVE, JSON.stringify(copia));
  } catch {
    // sin almacenamiento: no habrá modo sin conexión
  }
}

export function leerCache(): DatosCache | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as DatosCache | null;
  } catch {
    return null;
  }
}

export function borrarCache(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
```

- [ ] **Step 3: `src/estado/datos.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseProyecto, serializarProyecto, type Proyecto } from '../datos/proyectos';
import { RUTA_TAREAS } from '../datos/rutas';
import type { Tarea } from '../datos/tareas';
import { ErrorDatos } from '../datos/yaml';
import { ErrorGitHub, type Config } from '../github/cliente';
import { cargarTodo, guardarProyecto as guardarProyectoRemoto, modificarTareas, type Datos } from '../repositorio';
import { borrarCache, guardarCache, leerCache } from './cache';
import { borrarConfig, guardarConfig, leerConfig } from './config';

export type EstadoConexion = 'sin-config' | 'cargando' | 'listo' | 'sin-conexion' | 'error-token';

export interface ValorDatos {
  estado: EstadoConexion;
  datos: Datos;
  config: Config | null;
  aviso: string | null;
  soloLectura: boolean;
  tareasBloqueadas: boolean;
  cerrarAviso(): void;
  recargar(): Promise<void>;
  conectar(c: Config): void;
  desconectar(): void;
  cambiarTareas(cambio: (ts: Tarea[]) => Tarea[], mensaje: string): Promise<boolean>;
  guardarProyecto(p: Proyecto, original: Proyecto | null): Promise<boolean>;
}

const VACIO: Datos = { tareas: [], areas: [], proyectos: [], errores: [] };
const Contexto = createContext<ValorDatos | null>(null);

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(() => leerConfig());
  const [estado, setEstado] = useState<EstadoConexion>(() => (leerConfig() ? 'cargando' : 'sin-config'));
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [aviso, setAviso] = useState<string | null>(null);

  const alFallar = useCallback((e: unknown, alCargar: boolean) => {
    if (e instanceof ErrorGitHub && e.tipo === 'red') {
      if (alCargar) {
        const c = leerCache();
        if (c) setDatos({ ...c, errores: [] });
      } else {
        setAviso('Sin conexión: el cambio no se ha guardado.');
      }
      setEstado('sin-conexion');
      return;
    }
    if (e instanceof ErrorGitHub && e.tipo === 'token') {
      setEstado('error-token');
      return;
    }
    if (e instanceof ErrorDatos)
      setDatos((d) => ({ ...d, errores: [...d.errores.filter((x) => x.archivo !== e.archivo), e] }));
    setAviso(e instanceof Error ? e.message : String(e));
    if (alCargar) setEstado('listo');
  }, []);

  const recargar = useCallback(async () => {
    if (!config) {
      setEstado('sin-config');
      return;
    }
    setEstado('cargando');
    try {
      setDatos(await cargarTodo(config));
      setEstado('listo');
    } catch (e) {
      alFallar(e, true);
    }
  }, [config, alFallar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (estado === 'listo') guardarCache(datos);
  }, [datos, estado]);

  const cambiarTareas = useCallback(
    async (cambio: (ts: Tarea[]) => Tarea[], mensaje: string) => {
      if (!config) return false;
      try {
        const tareas = await modificarTareas(config, cambio, mensaje);
        setDatos((d) => ({ ...d, tareas, errores: d.errores.filter((x) => x.archivo !== RUTA_TAREAS) }));
        setEstado('listo');
        return true;
      } catch (e) {
        alFallar(e, false);
        return false;
      }
    },
    [config, alFallar],
  );

  const guardarProyecto = useCallback(
    async (p: Proyecto, original: Proyecto | null) => {
      if (!config) return false;
      try {
        await guardarProyectoRemoto(config, p, original);
        const guardado = parseProyecto(p.id, serializarProyecto(p));
        setDatos((d) => ({ ...d, proyectos: [...d.proyectos.filter((x) => x.id !== p.id), guardado] }));
        return true;
      } catch (e) {
        alFallar(e, false);
        return false;
      }
    },
    [config, alFallar],
  );

  const conectar = useCallback((c: Config) => {
    guardarConfig(c);
    setConfig(c);
  }, []);

  const desconectar = useCallback(() => {
    borrarConfig();
    borrarCache();
    setConfig(null);
    setDatos(VACIO);
  }, []);

  const valor = useMemo<ValorDatos>(
    () => ({
      estado,
      datos,
      config,
      aviso,
      soloLectura: estado !== 'listo',
      tareasBloqueadas: datos.errores.some((e) => e.archivo === RUTA_TAREAS),
      cerrarAviso: () => setAviso(null),
      recargar,
      conectar,
      desconectar,
      cambiarTareas,
      guardarProyecto,
    }),
    [estado, datos, config, aviso, recargar, conectar, desconectar, cambiarTareas, guardarProyecto],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos(): ValorDatos {
  const v = useContext(Contexto);
  if (!v) throw new Error('useDatos se usó fuera de ProveedorDatos');
  return v;
}
```

- [ ] **Step 4: `src/componentes/areas.ts`**

```ts
import type { Area } from '../datos/areas';

export function colorDeArea(areas: Area[], id: string | undefined): string {
  return areas.find((a) => a.id === id)?.color ?? '#9ca3af';
}
```

- [ ] **Step 5: `src/pantallas/Ajustes.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useDatos } from '../estado/datos';

export function Ajustes() {
  const { config, conectar, desconectar, estado } = useDatos();
  const [owner, setOwner] = useState(config?.owner ?? '');
  const [repo, setRepo] = useState(config?.repo ?? 'my-context');
  const [token, setToken] = useState('');
  const necesitaToken = !config || estado === 'error-token';

  function enviar(e: FormEvent) {
    e.preventDefault();
    conectar({ owner: owner.trim(), repo: repo.trim(), token: token.trim() || config?.token || '' });
    setToken('');
  }

  return (
    <section className="ajustes">
      <h2>Ajustes</h2>
      {estado === 'error-token' && (
        <p className="banner error">La llave de GitHub no funciona (puede que haya caducado o que esté mal copiada). Pega una nueva.</p>
      )}
      {estado === 'sin-config' && (
        <p>Para empezar, conecta la app con tu repositorio <code>my-context</code> de GitHub.</p>
      )}
      <form onSubmit={enviar}>
        <label>
          Usuario de GitHub
          <input value={owner} onChange={(e) => setOwner(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Repositorio
          <input value={repo} onChange={(e) => setRepo(e.target.value)} required />
        </label>
        <label>
          Llave (token){!necesitaToken && ': déjalo vacío para mantener la actual'}
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} required={necesitaToken} autoComplete="off" />
        </label>
        <button type="submit">Guardar y conectar</button>
      </form>
      <details>
        <summary>¿Cómo creo la llave?</summary>
        <ol>
          <li>
            Entra en{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              github.com/settings/personal-access-tokens/new
            </a>
            .
          </li>
          <li>En «Repository access» elige «Only select repositories» y marca <code>my-context</code>.</li>
          <li>En «Permissions», busca «Contents» y elige «Read and write».</li>
          <li>Pulsa «Generate token», copia la llave y pégala aquí.</li>
        </ol>
      </details>
      {config && (
        <button className="peligro" onClick={() => confirm('¿Olvidar la llave en este dispositivo?') && desconectar()}>
          Olvidar la llave en este dispositivo
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 6: `src/estilos.css`**

```css
:root {
  --fondo: #f7f7f8;
  --superficie: #ffffff;
  --texto: #1f2328;
  --suave: #6b7280;
  --borde: #e5e7eb;
  --acento: #6d28d9;
  --peligro: #dc2626;
  --aviso: #fef3c7;
  --error: #fee2e2;
  color-scheme: light dark;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fondo: #111318;
    --superficie: #1b1e25;
    --texto: #e6e8eb;
    --suave: #9aa3af;
    --borde: #2d323c;
    --acento: #a78bfa;
    --aviso: #3b2f0b;
    --error: #3f1515;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto); }
.app { max-width: 960px; margin: 0 auto; padding: 0 16px 90px; }
.cabecera { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
.cabecera h1 { font-size: 1.2rem; margin: 0; }
.cargando, .vacio, .detalle { color: var(--suave); font-size: 0.9rem; }
.banner { padding: 10px 12px; border-radius: 8px; margin: 8px 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.banner.aviso { background: var(--aviso); }
.banner.error { background: var(--error); }
button { font: inherit; color: inherit; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: default; }
button.activa { background: var(--acento); color: #fff; border-color: var(--acento); }
button.peligro { color: var(--peligro); border-color: var(--peligro); }
input, select, textarea { font: inherit; color: inherit; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 8px; width: 100%; }
input[type='checkbox'] { width: auto; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--suave); }
.barra { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.barra h2, .barra h3 { flex: 1; margin: 12px 0; font-size: 1.1rem; color: var(--texto); text-transform: capitalize; }
h3 { font-size: 1rem; margin: 16px 0 6px; }
h3.atrasadas { color: var(--peligro); }
.lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.fila-tarea, .fila-proyecto { display: flex; align-items: center; gap: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; padding: 8px 12px; flex-wrap: wrap; }
.fila-tarea.hecha .titulo-tarea { text-decoration: line-through; color: var(--suave); }
.punto { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.titulo-tarea { border: none; background: none; padding: 0; text-align: left; flex: 1; min-width: 120px; }
.prioridad, .estado { font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--borde); }
.prioridad.alta { color: var(--peligro); border-color: var(--peligro); }
.estado.activo { color: var(--acento); border-color: var(--acento); }
.navegacion { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 4px; padding: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); background: var(--superficie); border-top: 1px solid var(--borde); }
.navegacion button { flex: 1; max-width: 160px; font-size: 0.85rem; padding: 8px 4px; }
.fondo-modal { position: fixed; inset: 0; background: rgb(0 0 0 / 0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 10; }
.modal { background: var(--fondo); width: 100%; max-width: 560px; max-height: 90vh; overflow: auto; padding: 16px; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; gap: 10px; }
@media (min-width: 700px) {
  .fondo-modal { align-items: center; }
  .modal { border-radius: 16px; }
}
.fila-campos { display: flex; gap: 10px; flex-wrap: wrap; }
.fila-campos > label { flex: 1; min-width: 140px; }
fieldset { border: 1px solid var(--borde); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
.dia { flex-direction: row; align-items: center; gap: 4px; color: var(--texto); }
.botones { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.filtros, .pestanas-mini { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
.editor { min-height: 320px; font-family: ui-monospace, monospace; }
.markdown { background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; padding: 4px 16px; overflow-wrap: anywhere; }
.ajustes form { display: flex; flex-direction: column; gap: 12px; max-width: 480px; margin-bottom: 16px; }
.cal-cabecera, .cal-semana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-cabecera span { text-align: center; font-size: 0.8rem; color: var(--suave); }
.cal-semana { margin-bottom: 4px; }
.cal-dia { display: flex; flex-direction: column; align-items: stretch; gap: 2px; min-height: 80px; padding: 4px; text-align: left; overflow: hidden; }
.cal-semana.semana .cal-dia { min-height: 200px; }
.cal-dia.fuera { opacity: 0.45; }
.cal-dia.hoy .numero { color: var(--acento); font-weight: 700; }
.cal-dia.seleccionado { border: 2px solid var(--acento); }
.cal-tarea { font-size: 0.72rem; color: #fff; border-radius: 4px; padding: 1px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-tarea.hecha { opacity: 0.5; text-decoration: line-through; }
.mas { font-size: 0.7rem; color: var(--suave); }
@media (max-width: 600px) {
  .cal-dia { min-height: 56px; }
  .cal-semana.mes .cal-tarea { font-size: 0; height: 5px; padding: 0; }
  .cal-semana.semana { grid-template-columns: 1fr; }
  .cal-semana.semana .cal-dia { min-height: 0; }
  .cal-cabecera.semana { display: none; }
}
```

- [ ] **Step 7: Sustituir `src/App.tsx` y añadir los estilos a `src/main.tsx`**

`src/App.tsx`:
```tsx
import { useState } from 'react';
import { ProveedorDatos, useDatos } from './estado/datos';
import { Ajustes } from './pantallas/Ajustes';

type Pantalla = 'hoy' | 'calendario' | 'tareas' | 'proyectos' | 'ajustes';

const PESTANAS: { id: Pantalla; nombre: string }[] = [{ id: 'ajustes', nombre: 'Ajustes' }];

export default function App() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { estado, aviso, cerrarAviso, datos, recargar } = useDatos();
  const [pantalla, setPantalla] = useState<Pantalla>('ajustes');
  const forzarAjustes = estado === 'sin-config' || estado === 'error-token';
  const actual: Pantalla = forzarAjustes ? 'ajustes' : pantalla;

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Segundo cerebro</h1>
        {estado === 'cargando' && <span className="cargando">Cargando…</span>}
      </header>
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
      <main>{actual === 'ajustes' && <Ajustes />}</main>
      <nav className="navegacion">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={actual === p.id ? 'activa' : ''}
            disabled={forzarAjustes && p.id !== 'ajustes'}
            onClick={() => setPantalla(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

En `src/main.tsx`, añade detrás de `import App from './App';`:
```tsx
import './estilos.css';
```

- [ ] **Step 8: Comprobar que compila y que los tests siguen pasando**

Run: `npm run build && npm test`
Expected: sin errores, todos los tests en PASS.

- [ ] **Step 9: [Diego] Crear la llave y probar la conexión**

Diego crea el token siguiendo los pasos de «¿Cómo creo la llave?». Caducidad: la máxima que permita GitHub. Ejecuta `npm run dev`, abre `http://localhost:5173/segundo-cerebro-app/`, pega usuario, `my-context` y la llave.
Expected: desaparece "Cargando…" y no sale ningún banner de error.
Prueba también con una llave falsa (`abc`): debe salir "La llave de GitHub no funciona". Después vuelve a poner la buena.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "Estado de la app, ajustes y estilos"
```

---

### Task 10: Vista "Hoy", fila de tarea y formulario de tarea

**Files:**
- Create: `src/componentes/FilaTarea.tsx`, `src/componentes/FormTarea.tsx`, `src/pantallas/Hoy.tsx`
- Modify: `src/App.tsx` (se sustituye entero; ver el Step 4)

**Interfaces:**
- Consumes: `useDatos` (Task 9); `alternarEnLista`, `guardarEnLista`, `borrarDeLista`, `esRepetida`, `hechaEl`, `prioridadDe`, `atrasadas`, `tareasDelDia`, `topSinFecha`, `TareaSinId` (Task 5); `colorDeArea`; `DIAS`, `Dia`, `toISO`, `formatoLargo`, `ISODate`; `PRIORIDADES`, `Prioridad`, `Tarea`.
- Produces: `FilaTarea({ tarea, dia, mostrarFecha?, alEditar })`; `type Edicion = { tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string } }`; `FormTarea({ edicion, cerrar })`; `Hoy({ editar })`, donde `editar: (e: Edicion) => void`. Las Tasks 11 a 13 usan esas mismas props.

- [ ] **Step 1: `src/componentes/FilaTarea.tsx`**

```tsx
import { alternarEnLista, esRepetida, hechaEl, prioridadDe } from '../agenda/tareas';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import type { ISODate } from '../fechas';
import { colorDeArea } from './areas';

interface Props {
  tarea: Tarea;
  dia: ISODate;
  mostrarFecha?: boolean;
  alEditar(t: Tarea): void;
}

export function FilaTarea({ tarea, dia, mostrarFecha = false, alEditar }: Props) {
  const { datos, cambiarTareas, soloLectura, tareasBloqueadas } = useDatos();
  const hecha = hechaEl(tarea, dia);
  const bloqueado = soloLectura || tareasBloqueadas;
  const prioridad = prioridadDe(tarea);
  const detalle = [
    mostrarFecha ? tarea.fecha : undefined,
    tarea.hora,
    esRepetida(tarea) ? `cada ${tarea.repetir!.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`fila-tarea${hecha ? ' hecha' : ''}`}>
      <input
        type="checkbox"
        checked={hecha}
        disabled={bloqueado}
        aria-label={`Marcar «${tarea.titulo}»`}
        onChange={() =>
          void cambiarTareas((ts) => alternarEnLista(ts, tarea.id, dia), `${hecha ? 'Desmarcar' : 'Completar'}: ${tarea.titulo}`)
        }
      />
      <span className="punto" style={{ background: colorDeArea(datos.areas, tarea.area) }} />
      <button className="titulo-tarea" onClick={() => alEditar(tarea)} disabled={bloqueado}>
        {tarea.titulo}
      </button>
      {detalle && <span className="detalle">{detalle}</span>}
      {prioridad !== 'media' && <span className={`prioridad ${prioridad}`}>{prioridad}</span>}
    </li>
  );
}
```

- [ ] **Step 2: `src/componentes/FormTarea.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { borrarDeLista, guardarEnLista, type TareaSinId } from '../agenda/tareas';
import { PRIORIDADES, type Prioridad, type Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { DIAS, type Dia, type ISODate } from '../fechas';

export type Edicion = { tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string } };

interface Props {
  edicion: Edicion;
  cerrar(): void;
}

export function FormTarea({ edicion, cerrar }: Props) {
  const { datos, cambiarTareas } = useDatos();
  const original = 'tarea' in edicion ? edicion.tarea : null;
  const nueva = 'nueva' in edicion ? edicion.nueva : {};
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [area, setArea] = useState(original?.area ?? datos.areas[0]?.id ?? 'personal');
  const [prioridad, setPrioridad] = useState<Prioridad>(original?.prioridad ?? 'media');
  const [fecha, setFecha] = useState(original?.fecha ?? nueva.fecha ?? '');
  const [hora, setHora] = useState(original?.hora ?? '');
  const [repetir, setRepetir] = useState<Dia[]>(original?.repetir ?? []);
  const [proyecto, setProyecto] = useState(original?.proyecto ?? nueva.proyecto ?? '');
  const [notas, setNotas] = useState(original?.notas ?? '');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const tarea: TareaSinId = {
      ...original,
      titulo: titulo.trim(),
      area,
      prioridad: prioridad === 'media' ? undefined : prioridad,
      fecha: fecha || undefined,
      hora: hora || undefined,
      repetir: repetir.length ? DIAS.filter((d) => repetir.includes(d)) : undefined,
      proyecto: proyecto || undefined,
      notas: notas.trim() || undefined,
    };
    setGuardando(true);
    const ok = await cambiarTareas(
      (ts) => guardarEnLista(ts, tarea, new Date()),
      `${original ? 'Editar' : 'Crear'} tarea: ${tarea.titulo}`,
    );
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!original || !confirm(`¿Borrar «${original.titulo}»?`)) return;
    setGuardando(true);
    const ok = await cambiarTareas((ts) => borrarDeLista(ts, original.id), `Borrar tarea: ${original.titulo}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  const alternarDia = (d: Dia) => setRepetir((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d]));

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={guardar}>
        <h2>{original ? 'Editar tarea' : 'Nueva tarea'}</h2>
        <label>
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
        </label>
        <div className="fila-campos">
          <label>
            Área
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {datos.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
              {!datos.areas.some((a) => a.id === area) && <option value={area}>{area}</option>}
            </select>
          </label>
          <label>
            Prioridad
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="fila-campos">
          <label>
            Fecha (opcional)
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label>
            Hora (opcional)
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend>Repetir cada semana</legend>
          {DIAS.map((d) => (
            <label key={d} className="dia">
              <input type="checkbox" checked={repetir.includes(d)} onChange={() => alternarDia(d)} />
              {d}
            </label>
          ))}
        </fieldset>
        <label>
          Proyecto
          <select value={proyecto} onChange={(e) => setProyecto(e.target.value)}>
            <option value="">(ninguno)</option>
            {datos.proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
          </select>
        </label>
        <label>
          Notas
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
        </label>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando}>Guardar</button>
          {original && (
            <button type="button" className="peligro" onClick={() => void borrar()} disabled={guardando}>Borrar</button>
          )}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: `src/pantallas/Hoy.tsx`**

```tsx
import { atrasadas, tareasDelDia, topSinFecha } from '../agenda/tareas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { formatoLargo, toISO, type ISODate } from '../fechas';

export function Hoy({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = toISO(new Date());
  const retrasadas = atrasadas(datos.tareas, hoy);
  const deHoy = tareasDelDia(datos.tareas, hoy);
  const top = topSinFecha(datos.tareas);

  const lista = (ts: Tarea[], dia: ISODate, mostrarFecha = false) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={dia} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  return (
    <section>
      <div className="barra">
        <h2>Hoy, {formatoLargo(hoy)}</h2>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: { fecha: hoy } })}>
          + Nueva tarea
        </button>
      </div>
      {retrasadas.length > 0 && (
        <>
          <h3 className="atrasadas">Atrasadas</h3>
          {lista(retrasadas, hoy, true)}
        </>
      )}
      <h3>Para hoy</h3>
      {deHoy.length ? lista(deHoy, hoy) : <p className="vacio">Nada para hoy.</p>}
      <h3>Sin fecha: lo más importante</h3>
      {top.length ? lista(top, hoy) : <p className="vacio">No hay tareas sin fecha pendientes.</p>}
    </section>
  );
}
```

- [ ] **Step 4: Sustituir `src/App.tsx`**

```tsx
import { useState } from 'react';
import { FormTarea, type Edicion } from './componentes/FormTarea';
import { ProveedorDatos, useDatos } from './estado/datos';
import { Ajustes } from './pantallas/Ajustes';
import { Hoy } from './pantallas/Hoy';

type Pantalla = 'hoy' | 'calendario' | 'tareas' | 'proyectos' | 'ajustes';

const PESTANAS: { id: Pantalla; nombre: string }[] = [
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'ajustes', nombre: 'Ajustes' },
];

export default function App() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { estado, aviso, cerrarAviso, datos, recargar } = useDatos();
  const [pantalla, setPantalla] = useState<Pantalla>('hoy');
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const forzarAjustes = estado === 'sin-config' || estado === 'error-token';
  const actual: Pantalla = forzarAjustes ? 'ajustes' : pantalla;
  const editar = (e: Edicion) => setEdicion(e);

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Segundo cerebro</h1>
        {estado === 'cargando' && <span className="cargando">Cargando…</span>}
      </header>
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
      <main>
        {actual === 'hoy' && <Hoy editar={editar} />}
        {actual === 'ajustes' && <Ajustes />}
      </main>
      <nav className="navegacion">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={actual === p.id ? 'activa' : ''}
            disabled={forzarAjustes && p.id !== 'ajustes'}
            onClick={() => setPantalla(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </nav>
      {edicion && <FormTarea edicion={edicion} cerrar={() => setEdicion(null)} />}
    </div>
  );
}
```

- [ ] **Step 5: Compilar y probar a mano**

Run: `npm run build && npm test` → Expected: sin errores.
Run: `npm run dev`. En el navegador:
1. En "Hoy" aparece "Probar la app del segundo cerebro en el móvil" en "Sin fecha", con la etiqueta `alta`.
2. Crea "Prueba con acentos: Cálculo ñ 🎮" para hoy a las 18:00. Aparece en "Para hoy". En GitHub, `agenda/tareas.yaml` tiene la tarea con los acentos bien.
3. Márcala como hecha: se tacha. Recarga la página: sigue tachada.
4. Edítala, ponle fecha de ayer y quita la marca de hecha: aparece en "Atrasadas".
5. Crea una tarea que se repita cada día de la semana: aparece hoy. Márcala: el commit en GitHub añade `hechas: [<hoy>]`.
6. Borra las tareas de prueba.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Vista Hoy y formulario de tareas"
```

---

### Task 11: Vista "Tareas"

**Files:**
- Create: `src/pantallas/Tareas.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `proximas`, `repetidas`, `sinFecha` (Task 5); `FilaTarea`, `Edicion` (Task 10); `useDatos`; `toISO`.
- Produces: `Tareas({ editar })`.

- [ ] **Step 1: `src/pantallas/Tareas.tsx`**

```tsx
import { proximas, repetidas, sinFecha } from '../agenda/tareas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { toISO } from '../fechas';

export function Tareas({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = toISO(new Date());

  const seccion = (titulo: string, ts: Tarea[], vacio: string, mostrarFecha = false) => (
    <>
      <h3>{titulo}</h3>
      {ts.length ? (
        <ul className="lista">
          {ts.map((t) => (
            <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
          ))}
        </ul>
      ) : (
        <p className="vacio">{vacio}</p>
      )}
    </>
  );

  return (
    <section>
      <div className="barra">
        <h2>Tareas</h2>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: {} })}>
          + Nueva tarea
        </button>
      </div>
      {seccion('Próximas', proximas(datos.tareas, hoy), 'No hay tareas con fecha pendientes.', true)}
      {seccion('Se repiten', repetidas(datos.tareas), 'No hay tareas que se repitan.')}
      {seccion('Sin fecha', sinFecha(datos.tareas), 'No hay tareas sin fecha.')}
    </section>
  );
}
```

- [ ] **Step 2: Añadirla a `src/App.tsx`**

Añade el import:
```tsx
import { Tareas } from './pantallas/Tareas';
```
En `PESTANAS`, detrás de `{ id: 'hoy', nombre: 'Hoy' },`, añade:
```tsx
  { id: 'tareas', nombre: 'Tareas' },
```
En `<main>`, detrás de la línea de `Hoy`, añade:
```tsx
        {actual === 'tareas' && <Tareas editar={editar} />}
```

- [ ] **Step 3: Compilar y probar a mano**

Run: `npm run build` → sin errores.
En `npm run dev`: la pestaña "Tareas" muestra las tres secciones. Una tarea sin fecha de prioridad alta sale arriba de "Sin fecha". Una tarea sin fecha marcada como hecha baja al final, tachada.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Vista Tareas: próximas, repetidas y sin fecha"
```

---

### Task 12: Calendario (mes y semana)

**Files:**
- Create: `src/pantallas/Calendario.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `tareasDelDia`, `hechaEl` (Task 5); `cuadriculaMes`, `diasSemana`, `addDays`, `sumarMeses`, `fromISO`, `toISO`, `diaDeSemana`, `DIAS`, `formatoLargo`, `formatoCorto`, `nombreMes`, `ISODate` (Task 2); `colorDeArea`; `FilaTarea`, `Edicion`.
- Produces: `Calendario({ editar })`.

- [ ] **Step 1: `src/pantallas/Calendario.tsx`**

```tsx
import { useState } from 'react';
import { hechaEl, tareasDelDia } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { useDatos } from '../estado/datos';
import {
  addDays, cuadriculaMes, DIAS, diaDeSemana, diasSemana, formatoCorto, formatoLargo, fromISO, nombreMes,
  sumarMeses, toISO, type ISODate,
} from '../fechas';

type Vista = 'mes' | 'semana';

export function Calendario({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = toISO(new Date());
  const [vista, setVista] = useState<Vista>('mes');
  const [seleccionado, setSeleccionado] = useState<ISODate>(hoy);

  const fecha = fromISO(seleccionado);
  const semanas = vista === 'mes' ? cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1) : [diasSemana(seleccionado)];
  const titulo = vista === 'mes' ? nombreMes(fecha.getFullYear(), fecha.getMonth() + 1) : `Semana del ${formatoCorto(semanas[0][0])}`;
  const maximo = vista === 'mes' ? 3 : 8;
  const mover = (n: number) => setSeleccionado((s) => (vista === 'semana' ? addDays(s, 7 * n) : sumarMeses(s, n)));

  return (
    <section>
      <div className="barra">
        <button onClick={() => mover(-1)} aria-label="Anterior">‹</button>
        <h2>{titulo}</h2>
        <button onClick={() => mover(1)} aria-label="Siguiente">›</button>
        <button onClick={() => setSeleccionado(hoy)}>Hoy</button>
        <button onClick={() => setVista((v) => (v === 'mes' ? 'semana' : 'mes'))}>
          {vista === 'mes' ? 'Ver semana' : 'Ver mes'}
        </button>
      </div>
      <div className={`cal-cabecera ${vista}`}>
        {DIAS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {semanas.map((semana) => (
        <div key={semana[0]} className={`cal-semana ${vista}`}>
          {semana.map((dia) => {
            const ts = tareasDelDia(datos.tareas, dia);
            const fuera = vista === 'mes' && fromISO(dia).getMonth() !== fecha.getMonth();
            const clases = ['cal-dia', dia === hoy && 'hoy', dia === seleccionado && 'seleccionado', fuera && 'fuera']
              .filter(Boolean)
              .join(' ');
            return (
              <button key={dia} className={clases} onClick={() => setSeleccionado(dia)}>
                <span className="numero">
                  {vista === 'semana' ? `${diaDeSemana(dia)} ${fromISO(dia).getDate()}` : fromISO(dia).getDate()}
                </span>
                {ts.slice(0, maximo).map((t) => (
                  <span
                    key={t.id}
                    className={`cal-tarea${hechaEl(t, dia) ? ' hecha' : ''}`}
                    style={{ background: colorDeArea(datos.areas, t.area) }}
                  >
                    {t.hora ? `${t.hora} ` : ''}
                    {t.titulo}
                  </span>
                ))}
                {ts.length > maximo && <span className="mas">+{ts.length - maximo}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="barra">
        <h3>{formatoLargo(seleccionado)}</h3>
        <button disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: { fecha: seleccionado } })}>
          + Nueva tarea
        </button>
      </div>
      <ul className="lista">
        {tareasDelDia(datos.tareas, seleccionado).map((t) => (
          <FilaTarea key={t.id} tarea={t} dia={seleccionado} alEditar={(x) => editar({ tarea: x })} />
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Añadirlo a `src/App.tsx`**

Añade el import:
```tsx
import { Calendario } from './pantallas/Calendario';
```
En `PESTANAS`, detrás de `{ id: 'hoy', nombre: 'Hoy' },`, añade:
```tsx
  { id: 'calendario', nombre: 'Calendario' },
```
En `<main>`, detrás de la línea de `Hoy`, añade:
```tsx
        {actual === 'calendario' && <Calendario editar={editar} />}
```

- [ ] **Step 3: Compilar y probar a mano**

Run: `npm run build` → sin errores.
En `npm run dev`:
1. El mes actual empieza en lunes y hoy está resaltado.
2. Crea una tarea que se repita los lunes: sale todos los lunes del mes con el color de su área.
3. Pulsa un día: debajo salen sus tareas, y "+ Nueva tarea" rellena ese día.
4. "Ver semana" enseña 7 días. Las flechas avanzan y retroceden (prueba a cruzar de diciembre a enero).
5. Con las herramientas del navegador en modo móvil (unos 375 px de ancho), el mes se ve con barritas de color y la semana en una columna.
6. Borra la tarea de prueba.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Calendario con vista de mes y de semana"
```

---

### Task 13: Proyectos y página de proyecto

**Files:**
- Create: `src/componentes/Markdown.tsx`, `src/pantallas/Proyectos.tsx`, `src/pantallas/PaginaProyecto.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ordenarProyectos`, `necesitaAvisoActivos`, `LIMITE_ACTIVOS` (Task 6); `prioridadDe` (Task 5); `ESTADOS`, `Estado`, `Proyecto`, `idProyectoDesdeTitulo`, `serializarProyecto`, `tituloDesdeCuerpo` (Task 4); `PRIORIDADES`, `Prioridad`; `useDatos`; `colorDeArea`; `FilaTarea`, `Edicion`; `toISO`.
- Produces: `Markdown({ texto })`; `Proyectos({ editar })`; `PaginaProyecto({ proyecto, volver, editar })`.

- [ ] **Step 1: `src/componentes/Markdown.tsx`**

```tsx
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function Markdown({ texto }: { texto: string }) {
  const html = DOMPurify.sanitize(marked.parse(texto, { async: false }) as string);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 2: `src/pantallas/PaginaProyecto.tsx`**

```tsx
import { useState } from 'react';
import { LIMITE_ACTIVOS, necesitaAvisoActivos } from '../agenda/proyectos';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Markdown } from '../componentes/Markdown';
import { ESTADOS, tituloDesdeCuerpo, type Estado, type Proyecto } from '../datos/proyectos';
import { PRIORIDADES, type Prioridad } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { toISO } from '../fechas';

interface Props {
  proyecto: Proyecto;
  volver(): void;
  editar(e: Edicion): void;
}

export function PaginaProyecto({ proyecto, volver, editar }: Props) {
  const { datos, soloLectura, tareasBloqueadas, guardarProyecto, recargar } = useDatos();
  const [estado, setEstado] = useState<Estado>(proyecto.estado);
  const [area, setArea] = useState(proyecto.area ?? '');
  const [prioridad, setPrioridad] = useState<Prioridad>(proyecto.prioridad ?? 'media');
  const [cuerpo, setCuerpo] = useState(proyecto.cuerpo);
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [guardando, setGuardando] = useState(false);
  const hoy = toISO(new Date());

  const cambiado =
    estado !== proyecto.estado ||
    area !== (proyecto.area ?? '') ||
    prioridad !== (proyecto.prioridad ?? 'media') ||
    cuerpo !== proyecto.cuerpo;

  function cambiarEstado(nuevo: Estado) {
    if (
      necesitaAvisoActivos(datos.proyectos, proyecto.id, nuevo) &&
      !confirm(`Ya tienes ${LIMITE_ACTIVOS} proyectos activos. ¿Seguro que quieres activar otro? Terminar uno antes te ayudará a acabar las cosas.`)
    )
      return;
    setEstado(nuevo);
  }

  async function guardar() {
    const nuevo: Proyecto = {
      ...proyecto,
      estado,
      area: area || undefined,
      prioridad: prioridad === 'media' ? undefined : prioridad,
      cuerpo,
      titulo: tituloDesdeCuerpo(cuerpo, proyecto.id),
    };
    setGuardando(true);
    await guardarProyecto(nuevo, proyecto);
    setGuardando(false);
  }

  function salir() {
    if (!cambiado || confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) volver();
  }

  return (
    <section>
      <div className="barra">
        <button onClick={salir}>‹ Proyectos</button>
        <h2>{proyecto.titulo}</h2>
      </div>
      <div className="fila-campos">
        <label>
          Estado
          <select value={estado} onChange={(e) => cambiarEstado(e.target.value as Estado)} disabled={soloLectura}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Área
          <select value={area} onChange={(e) => setArea(e.target.value)} disabled={soloLectura}>
            <option value="">(ninguna)</option>
            {datos.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)} disabled={soloLectura}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="pestanas-mini">
        <button className={modo === 'ver' ? 'activa' : ''} onClick={() => setModo('ver')}>Ver</button>
        <button className={modo === 'editar' ? 'activa' : ''} onClick={() => setModo('editar')} disabled={soloLectura}>
          Editar
        </button>
      </div>
      {modo === 'editar' ? (
        <textarea className="editor" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
      ) : (
        <Markdown texto={cuerpo} />
      )}
      <div className="botones">
        <button className="activa" onClick={() => void guardar()} disabled={soloLectura || guardando || !cambiado}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={() => void recargar()}>Recargar</button>
      </div>
      <div className="barra">
        <h3>Tareas del proyecto</h3>
        <button
          disabled={soloLectura || tareasBloqueadas}
          onClick={() => editar({ nueva: { proyecto: proyecto.id } })}
        >
          + Nueva tarea
        </button>
      </div>
      <ul className="lista">
        {datos.tareas
          .filter((t) => t.proyecto === proyecto.id)
          .map((t) => (
            <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha alEditar={(x) => editar({ tarea: x })} />
          ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: `src/pantallas/Proyectos.tsx`**

```tsx
import { useState } from 'react';
import { ordenarProyectos } from '../agenda/proyectos';
import { prioridadDe } from '../agenda/tareas';
import { colorDeArea } from '../componentes/areas';
import type { Edicion } from '../componentes/FormTarea';
import { ESTADOS, idProyectoDesdeTitulo, serializarProyecto, type Estado, type Proyecto } from '../datos/proyectos';
import { useDatos } from '../estado/datos';
import { PaginaProyecto } from './PaginaProyecto';

export function Proyectos({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, guardarProyecto } = useDatos();
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);

  const proyectoAbierto = datos.proyectos.find((p) => p.id === abierto);
  if (proyectoAbierto)
    return (
      <PaginaProyecto
        key={serializarProyecto(proyectoAbierto)}
        proyecto={proyectoAbierto}
        volver={() => setAbierto(null)}
        editar={editar}
      />
    );

  async function crear() {
    const titulo = prompt('Nombre del proyecto')?.trim();
    if (!titulo) return;
    const id = idProyectoDesdeTitulo(titulo, datos.proyectos.map((p) => p.id));
    const nuevo: Proyecto = { id, estado: 'idea', titulo, cuerpo: `# ${titulo}\n\n`, meta: {} };
    if (await guardarProyecto(nuevo, null)) setAbierto(id);
  }

  const lista = ordenarProyectos(datos.proyectos).filter((p) => filtro === 'todos' || p.estado === filtro);

  return (
    <section>
      <div className="barra">
        <h2>Proyectos</h2>
        <button disabled={soloLectura} onClick={() => void crear()}>+ Nuevo proyecto</button>
      </div>
      <div className="filtros">
        {(['todos', ...ESTADOS] as const).map((f) => (
          <button key={f} className={filtro === f ? 'activa' : ''} onClick={() => setFiltro(f)}>{f}</button>
        ))}
      </div>
      <ul className="lista">
        {lista.map((p) => (
          <li key={p.id} className="fila-proyecto">
            <span className="punto" style={{ background: colorDeArea(datos.areas, p.area) }} />
            <button className="titulo-tarea" onClick={() => setAbierto(p.id)}>{p.titulo}</button>
            <span className={`estado ${p.estado}`}>{p.estado}</span>
            {prioridadDe(p) !== 'media' && <span className={`prioridad ${prioridadDe(p)}`}>{prioridadDe(p)}</span>}
          </li>
        ))}
      </ul>
      {lista.length === 0 && <p className="vacio">No hay proyectos aquí.</p>}
    </section>
  );
}
```

- [ ] **Step 4: Añadirlo a `src/App.tsx`**

Añade el import:
```tsx
import { Proyectos } from './pantallas/Proyectos';
```
En `PESTANAS`, delante de `{ id: 'ajustes', nombre: 'Ajustes' },`, añade:
```tsx
  { id: 'proyectos', nombre: 'Proyectos' },
```
En `<main>`, delante de la línea de `Ajustes`, añade:
```tsx
        {actual === 'proyectos' && <Proyectos editar={editar} />}
```

- [ ] **Step 5: Compilar y probar a mano**

Run: `npm run build && npm test` → sin errores.
En `npm run dev`:
1. "Proyectos" muestra "Segundo cerebro" con la etiqueta `activo` y la prioridad `alta`. Al abrirlo, el Markdown se ve con formato y abajo aparece su tarea.
2. Crea "Proyecto de prueba ñ". En GitHub aparece `proyectos/proyecto-de-prueba-n.md` con `estado: idea`.
3. Crea otro proyecto de prueba y ponlo en `activo` (ya tendrías 2 activos). Luego intenta activar el tercero: sale el aviso de los 2 proyectos activos. Si pulsas Cancelar, no cambia.
4. **Conflicto:** abre el proyecto de prueba y pulsa Editar. Desde la terminal, cambia el mismo archivo en `my-context` y haz push (`git pull`, editar, `git commit -am "prueba"`, `git push`). En la app, escribe algo y pulsa Guardar: sale el aviso de "ha cambiado desde que lo abriste" y tu texto sigue en el editor. "Recargar" trae la versión nueva.
5. **Seguridad:** escribe `<img src=x onerror=alert(1)>` en las notas y pulsa Ver: no salta ninguna alerta.
6. Borra los proyectos de prueba desde la terminal (`git rm`, commit y push).

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Proyectos: lista, página con notas y aviso de activos"
```

---

### Task 14: Instalable en el móvil (PWA) y publicación en GitHub Pages

**Files:**
- Create: `public/icono.svg`, los iconos generados en `public/`, `.github/workflows/desplegar.yml`
- Modify: `vite.config.ts`, `index.html`, `package.json` (dependencias)

**Interfaces:**
- Produces: app publicada en `https://USUARIO.github.io/segundo-cerebro-app/`, instalable en el móvil.

- [ ] **Step 1: Instalar el plugin y crear el icono**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
```
`public/icono.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#6d28d9"/>
  <circle cx="200" cy="228" r="92" fill="#ffffff" opacity="0.92"/>
  <circle cx="312" cy="228" r="92" fill="#ffffff" opacity="0.92"/>
  <rect x="150" y="336" width="212" height="40" rx="20" fill="#ffffff"/>
</svg>
```
```bash
npx pwa-assets-generator --preset minimal-2023 public/icono.svg
```
Expected: en `public/` aparecen `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` y `favicon.ico`.

- [ ] **Step 2: Configurar la PWA en `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/segundo-cerebro-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Segundo cerebro',
        short_name: 'Cerebro',
        description: 'Tareas, calendario y proyectos',
        lang: 'es',
        theme_color: '#6d28d9',
        background_color: '#111318',
        display: 'standalone',
        start_url: '/segundo-cerebro-app/',
        scope: '/segundo-cerebro-app/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
```

En `index.html`, detrás de la línea `<meta name="theme-color" ...>`, añade:
```html
    <link rel="icon" href="%BASE_URL%favicon.ico" />
    <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon-180x180.png" />
```

- [ ] **Step 3: Comprobar la versión final en local**

Run: `npm run build && npm run preview`
Expected: build sin errores. En `http://localhost:4173/segundo-cerebro-app/`, en las herramientas del navegador (Application → Manifest) se ven el nombre y los iconos, y en Service Workers el worker aparece activo. En el modo "Offline" de la pestaña Network, al recargar la página se ve el banner "Sin conexión" con los últimos datos.

- [ ] **Step 4: Crear `.github/workflows/desplegar.yml`**

```yaml
name: Desplegar
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  construir:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  desplegar:
    needs: construir
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.despliegue.outputs.page_url }}
    steps:
      - id: despliegue
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Commit**

```bash
git add public vite.config.ts index.html package.json package-lock.json .github
git commit -m "App instalable (PWA) y publicación en GitHub Pages"
```

- [ ] **Step 6: [Diego] Activar GitHub Pages y publicar**

Diego entra en `https://github.com/USUARIO/segundo-cerebro-app/settings/pages` y en "Source" elige **GitHub Actions**. Después, con su permiso:
```bash
git remote add origin https://github.com/USUARIO/segundo-cerebro-app.git
git push -u origin main
```
Expected: en la pestaña "Actions" del repositorio, el flujo "Desplegar" termina en verde y `https://USUARIO.github.io/segundo-cerebro-app/` abre la app.

---

### Task 15: Prueba final con Diego

**Files:**
- Modify (en `my-context`): `proyectos/segundo-cerebro.md` (sección "Dónde lo dejamos"), `AGENTS.md` (enlace a la app)

- [ ] **Step 1: [Diego] Instalar en cada dispositivo**

- **PC y portátil:** abre la URL en Chrome o Edge, pega la llave en Ajustes y pulsa el icono de "Instalar" de la barra de direcciones.
- **Móvil:** abre la URL (Chrome en Android; Safari en iPhone, con "Compartir → Añadir a pantalla de inicio"), pega la llave e instálala.

- [ ] **Step 2: Probar que la app y Claude comparten los datos**

1. Claude, en `my-context`: `git pull`, añade a `agenda/tareas.yaml` una tarea para mañana ("Prueba desde Claude"), y hace commit y push. Diego recarga la app en el móvil y la ve en el calendario.
2. Diego la marca como hecha en el móvil. Claude hace `git pull` y ve `hecha: true` en el archivo.
3. Diego pone el móvil en modo avión y abre la app: ve sus datos con el aviso "Sin conexión".
4. Claude borra la tarea de prueba, y hace commit y push.

- [ ] **Step 3: Actualizar el contexto**

En `AGENTS.md`, en "Dónde está todo", añade:
```markdown
- App: `https://USUARIO.github.io/segundo-cerebro-app/` (código en `Desktop/segundo-cerebro-app`).
```
En `proyectos/segundo-cerebro.md`, en "Dónde lo dejamos", añade la fecha del día con "versión 1 de la app terminada y en uso" y, como siguiente paso, "usarla unos días y apuntar lo que molesta; luego, versión 2: notificaciones". Haz commit y push en `my-context`.
