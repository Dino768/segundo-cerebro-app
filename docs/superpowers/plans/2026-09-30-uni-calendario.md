# Calendario de la uni automático (parte A). Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada 3 horas, un workflow de GitHub en `my-context` descarga el calendario del aula virtual y los exámenes oficiales de la URJC y mete en `agenda/tareas.yaml` los exámenes, entregas y eventos nuevos de las asignaturas de Diego, sin pisar nada suyo.

**Architecture:** Lógica pura y probada en `src/uni/` (leer `.ics`, hora de Madrid, exámenes → propuestas, aula virtual → propuestas, fusionar con las tareas y la lista de vistos). Un programa de Node sin compilar, `sincronizar/uni.ts`, descarga las dos fuentes, lee y escribe los archivos de `my-context` con los parsers que ya usa la app, y solo escribe si algo cambió. El workflow `my-context/.github/workflows/uni.yml` hace checkout de los dos repositorios, ejecuta el programa y sube el resultado.

**Tech Stack:** TypeScript ejecutado por Node 24 sin compilar (imports con `.ts`), Vitest (entorno `node`), paquete `yaml` (ya instalado), GitHub Actions. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-30-uni-calendario-design.md`

## Global Constraints

- Habla con Diego en español sencillo. Mensajes del programa, comentarios y títulos, en español.
- Node está en `C:\Program Files\nodejs`. En Bash: `export PATH="$PATH:/c/Program Files/nodejs";` delante de cada comando.
- Pruebas: `npm test` (Vitest). Tipos y compilación: `npm run build`.
- Todo lo que ejecuta Node sin compilar importa con extensión `.ts`: `src/uni/*`, `sincronizar/*` y, desde este plan, `src/datos/tareas.ts` y `src/datos/asignaturas.ts` (que pasan a importar `../fechas.ts`, `./rutas.ts`, `./yaml.ts`). El resto de la app sigue sin extensión.
- `src/uni/` no importa React ni hace peticiones de red. Solo `sincronizar/uni.ts` descarga.
- **La URL del calendario es una llave.** Nunca se escribe en la consola, en errores, en pruebas, en commits ni en este repositorio (público). Las pruebas usan datos inventados, nunca los reales. En el chat, Diego nunca la pega.
- Fuentes (spec, sección 2): calendario = URL del secret `URJC_CALENDARIO` (iCalendar). Exámenes = `POST https://servicios.urjc.es/examenes/informacion` con `titulacion=2327&convocatoria=T`, cabeceras `Content-Type: application/x-www-form-urlencoded` y `X-Requested-With: XMLHttpRequest`, respuesta JSON `{"CONSULTA":[…]}` (no hace falta cookie; comprobado el 2026-09-30).
- Hora: siempre `Europe/Madrid`. «Hoy» es la fecha de Madrid.
- Formatos (spec, secciones 3 y 4): examen → `titulo: "Examen: <nombre> (<enero|mayo|junio|septiembre>)"`, `prioridad: alta`, `icono: school`, `hora` = inicio, `notas: "<HORA> · <aula> · <aula>"`, `origen: "urjc-examen:<CURSO_ACADEMICO>:<COD_ASIGNATURA>:<CONVOCATORIA>:<GRUPO>"`. Aula virtual → `se abre` se descarta; `se cierra`/`vence` → `titulo: "Entrega: <resto>"` e `icono: file-upload`; el resto con su título; `prioridad` media (no se escribe); `00:00` de Madrid → día anterior `"23:59"`; `notas` = descripción en texto plano; `origen: "moodle:<UID>"`.
- Reglas (spec, sección 3): solo se crea lo que no está en `vistos`; un campo (`fecha`, `hora`, `notas` de examen) solo se cambia si cambia en la fuente respecto a lo apuntado en `vistos`; nunca se tocan `titulo`, `prioridad`, `icono`, `proyecto`, `hecha`; nada se borra de `tareas.yaml`; se quita de `vistos` lo que tenga fecha anterior a hoy.
- Ids nuevos `t-AAAAMMDD-n` con la fecha de Madrid de hoy, sin repetir, con la misma función que la app.
- Solo se escriben los archivos si su contenido serializado cambia (sin novedades, no hay commit).
- Trabajo en la rama `uni-calendario` (se crea en la Tarea 2). Nunca `git push` en ninguno de los dos repositorios sin que Diego lo sepa. El workflow usa la rama `main` publicada de la app: el código tiene que estar en `main` y subido antes de encender el workflow (Tarea 9).
- Cada tarea deja su línea en `.superpowers/sdd/2026-09-30-uni-calendario/progress.md`. Lo que se aparte del plan se apunta como `Ruling:`.

## Review Focus

- El enlace del calendario caduca y Moodle contesta `200` con una página HTML de inicio de sesión en vez del calendario → error claro («¿ha caducado el enlace?»), no se escribe nada y el mensaje no contiene la URL. Pruebas en las Tareas 4 y 8.
- Diego escribe sus propias notas en un examen importado y la URJC no cambia nada → la sincronización siguiente no le borra las notas. Si la URJC cambia el aula, sí se actualizan. Prueba en la Tarea 7.
- La URJC devuelve el mismo examen dos veces (dos filas iguales) → una sola tarea. Prueba en la Tarea 7.
- Diego ha creado hoy en la app `t-20260930-1` y `t-20260930-2` y la sincronización crea dos tareas ese mismo día → reciben `t-20260930-3` y `t-20260930-4`. Prueba en la Tarea 7.
- Un examen o entrega a medianoche en invierno (`23:00Z`) o que cruza de año → día anterior a las `23:59` en la fecha correcta. Y títulos o aulas con entidades HTML (`&amp;`) → se ven bien. Pruebas en las Tareas 3, 5 y 6.

---

### Task 1: Prueba de acceso desde GitHub (con Diego, la hace el controlador)

Comprueba lo antes posible que los servidores de GitHub pueden abrir las dos webs de la URJC. Si no pueden, se para el plan y se habla con Diego del plan B (spec, sección 5).

**Files (en `C:\Users\Diego\Desktop\my-context`):**
- Create: `.github/workflows/uni-prueba.yml` (provisional; se borra en la Tarea 9)

- [ ] **Step 1: Diego guarda el secret**

Explícale a Diego, paso a paso:
1. Abrir https://github.com/Dino768/my-context/settings/secrets/actions
2. «New repository secret». Name: `URJC_CALENDARIO`. Secret: abrir `C:\Users\Diego\.segundo-cerebro\urjc-calendario.txt` con el Bloc de notas, copiar la línea y pegarla ahí. «Add secret».
3. No pegarla nunca en el chat.

Espera a que diga que está hecho. Comprueba que existe (sin ver el valor):

```bash
gh secret list -R Dino768/my-context
```
Expected: una línea `URJC_CALENDARIO`.

- [ ] **Step 2: Escribir el workflow de prueba**

`C:\Users\Diego\Desktop\my-context\.github\workflows\uni-prueba.yml`:

```yaml
name: Uni (prueba de acceso)
on: workflow_dispatch
jobs:
  probar:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: Exámenes (web pública de la URJC)
        run: >
          curl -sS -o examenes.json -w "Exámenes: HTTP %{http_code}, %{size_download} bytes\n"
          -X POST -d "titulacion=2327&convocatoria=T"
          -H "X-Requested-With: XMLHttpRequest"
          https://servicios.urjc.es/examenes/informacion
          && head -c 12 examenes.json && echo
      - name: Calendario del aula virtual
        env:
          URJC_CALENDARIO: ${{ secrets.URJC_CALENDARIO }}
        run: >
          curl -sS -o calendario.ics -w "Calendario: HTTP %{http_code}, %{size_download} bytes\n" "$URJC_CALENDARIO"
          && head -c 15 calendario.ics && echo
```

- [ ] **Step 3: Subir (avisando a Diego) y lanzarlo**

Dile a Diego que vas a subir este archivo a `my-context`. Después:

```bash
cd /c/Users/Diego/Desktop/my-context
git pull -q
git add .github/workflows/uni-prueba.yml
git commit -m "Uni: prueba de acceso desde GitHub"
git push
gh workflow run uni-prueba.yml -R Dino768/my-context
sleep 5
gh run watch -R Dino768/my-context $(gh run list -R Dino768/my-context --workflow uni-prueba.yml -L 1 --json databaseId -q '.[0].databaseId')
gh run view -R Dino768/my-context --log $(gh run list -R Dino768/my-context --workflow uni-prueba.yml -L 1 --json databaseId -q '.[0].databaseId') | grep -E "Exámenes:|Calendario:|CONSULTA|BEGIN:VCALENDAR"
```

Expected: `Exámenes: HTTP 200, …` seguido de `{"CONSULTA":` y `Calendario: HTTP 200, …` seguido de `BEGIN:VCALENDAR`.

- [ ] **Step 4: Decidir**

- Si las dos dan `200` con ese contenido: apunta en el registro `Task 1: acceso desde GitHub OK (exámenes y calendario)` y sigue.
- Si alguna falla (código distinto de 200, tiempo agotado o contenido HTML): **para**. Cuéntaselo a Diego y proponle el plan B (spec, sección 5). No sigas con la Tarea 9 tal cual sin su decisión; las Tareas 2 a 8 sirven igual para el plan B.

- [ ] **Step 5: Crear el registro**

```bash
mkdir -p /c/Users/Diego/Desktop/segundo-cerebro-app/.superpowers/sdd/2026-09-30-uni-calendario
echo "# SDD ledger — plan: docs/superpowers/plans/2026-09-30-uni-calendario.md" > /c/Users/Diego/Desktop/segundo-cerebro-app/.superpowers/sdd/2026-09-30-uni-calendario/progress.md
echo "Task 1: <resultado del Step 4>" >> /c/Users/Diego/Desktop/segundo-cerebro-app/.superpowers/sdd/2026-09-30-uni-calendario/progress.md
```

---

### Task 2: Datos: `origen` en tareas, `codigo` en asignaturas e id compartido

**Files:**
- Modify: `src/datos/tareas.ts` (imports con `.ts`, campo `origen`, `siguienteIdTarea`)
- Modify: `src/datos/asignaturas.ts` (imports con `.ts`, campo `codigo`)
- Modify: `src/datos/rutas.ts` (`RUTA_UNI_SINCRONIZACION`)
- Modify: `src/agenda/tareas.ts:80-89` (`nuevoIdTarea` usa `siguienteIdTarea`)
- Test: `src/datos/tareas.test.ts`, `src/datos/asignaturas.test.ts`, `src/agenda/tareas.test.ts`

**Interfaces:**
- Produces:
  - `Tarea.origen?: string`
  - `export function siguienteIdTarea(dia: ISODate, existentes: { id: string }[]): string` en `src/datos/tareas.ts`
  - `Asignatura.codigo?: string` (7 cifras)
  - `export const RUTA_UNI_SINCRONIZACION = 'estudios/uni-sincronizacion.yaml'`

- [ ] **Step 1: Crear la rama**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout -b uni-calendario
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Añade al final de `src/datos/tareas.test.ts` (y añade `siguienteIdTarea` al import de `./tareas`):

```ts
describe('origen', () => {
  it('se lee y se vuelve a escribir', () => {
    const texto = '- id: t-1\n  titulo: Entrega\n  area: uni\n  origen: moodle:123@aula\n';
    const ts = parseTareas(texto);
    expect(ts[0].origen).toBe('moodle:123@aula');
    expect(serializarTareas(ts)).toContain('origen: moodle:123@aula');
  });
  it('tiene que ser texto', () => {
    expect(() => parseTareas('- id: t-1\n  titulo: X\n  area: uni\n  origen: 5\n')).toThrow('origen debe ser texto');
  });
});

describe('siguienteIdTarea', () => {
  it('sigue la numeración del día sin repetir', () => {
    expect(siguienteIdTarea('2026-09-30', [])).toBe('t-20260930-1');
    expect(siguienteIdTarea('2026-09-30', [{ id: 't-20260930-1' }, { id: 't-20260930-7' }, { id: 't-20260929-9' }])).toBe('t-20260930-8');
  });
});
```

Añade al final de `src/datos/asignaturas.test.ts`, dentro de un `describe` nuevo:

```ts
describe('codigo de la URJC', () => {
  it('se lee y se conserva al guardar', () => {
    const texto = 'asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n';
    const l = parseAsignaturas(texto);
    expect(l).toEqual([{ id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }]);
    expect(parseAsignaturas(serializarAsignaturas(l))).toEqual(l);
  });
  it('sin comillas (número) también vale', () => {
    expect(parseAsignaturas('asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: 2327007\n')[0].codigo).toBe('2327007');
  });
  it('sin codigo no aparece el campo', () => {
    const l = parseAsignaturas('asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n');
    expect('codigo' in l[0]).toBe(false);
    expect(serializarAsignaturas(l)).not.toContain('codigo');
  });
  it('un codigo que no son 7 cifras es un error', () => {
    expect(() => parseAsignaturas('asignaturas:\n  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "23A"\n')).toThrow('codigo');
  });
});
```

Añade en `src/agenda/tareas.test.ts`, dentro del `describe` que contiene `aplicarEdicion`:

```ts
  it('aplicarEdicion conserva origen al editar (la app no lo enseña)', () => {
    const original = t({ id: 'a', titulo: 'Entrega: P1', origen: 'moodle:1@aula' });
    const r = aplicarEdicion([original], original, { ...original, titulo: 'Entregar P1' }, ahora);
    expect(r[0]).toEqual({ id: 'a', titulo: 'Entregar P1', area: 'uni', origen: 'moodle:1@aula' });
  });
```

- [ ] **Step 3: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/datos src/agenda/tareas.test.ts`
Expected: FAIL (`siguienteIdTarea` no existe, `origen debe ser texto` no se lanza, `codigo` desaparece).

- [ ] **Step 4: Implementar**

`src/datos/rutas.ts`, añade al final:

```ts
export const RUTA_UNI_SINCRONIZACION = 'estudios/uni-sincronizacion.yaml';
```

`src/datos/tareas.ts`:
- Cambia los imports a:
  ```ts
  import { stringify } from 'yaml';
  import { DIAS, isHora, isISODate, type Dia, type ISODate } from '../fechas.ts';
  import { RUTA_TAREAS } from './rutas.ts';
  import { ErrorDatos, leerYaml, quitarNulos } from './yaml.ts';
  ```
- En `interface Tarea`, después de `hechas?: ISODate[];`, añade:
  ```ts
    // De dónde viene una tarea importada (p. ej. `moodle:<UID>`). La app no lo enseña, solo lo conserva.
    origen?: string;
  ```
- En `problema`, antes de `return null;`, añade:
  ```ts
    if (t.origen !== undefined && typeof t.origen !== 'string') return 'origen debe ser texto';
  ```
- Al final del archivo, añade:
  ```ts
  // Id nuevo `t-AAAAMMDD-n` para el día indicado, sin repetir ninguno existente.
  export function siguienteIdTarea(dia: ISODate, existentes: { id: string }[]): string {
    const prefijo = `t-${dia.replace(/-/g, '')}-`;
    let max = 0;
    for (const t of existentes) {
      if (!t.id.startsWith(prefijo)) continue;
      const n = Number(t.id.slice(prefijo.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
    return `${prefijo}${max + 1}`;
  }
  ```

`src/agenda/tareas.ts`: sustituye el cuerpo de `nuevoIdTarea` por una llamada, y añade `siguienteIdTarea` al import de `../datos/tareas` (ese import pasa de `import type` a import normal con `type` en los tipos):

```ts
import { siguienteIdTarea, type Prioridad, type Tarea } from '../datos/tareas';
```

```ts
export function nuevoIdTarea(ahora: Date, existentes: Tarea[]): string {
  return siguienteIdTarea(toISO(ahora), existentes);
}
```

`src/datos/asignaturas.ts`:
- Imports:
  ```ts
  import { stringify } from 'yaml';
  import { RUTA_ASIGNATURAS } from './rutas.ts';
  import { ErrorDatos, leerYaml } from './yaml.ts';
  ```
- `interface Asignatura`: añade `codigo?: string; // código de la asignatura en la URJC (7 cifras), para la sincronización de la uni`
- En `parseAsignaturas`, sustituye la última línea del `map` (`return { id: a.id, nombre: a.nombre, color: a.color };`) por:
  ```ts
      const codigo = typeof a.codigo === 'number' ? String(a.codigo) : a.codigo;
      if (codigo !== undefined && codigo !== null && (typeof codigo !== 'string' || !/^\d{7}$/.test(codigo)))
        throw new ErrorDatos(RUTA_ASIGNATURAS, `asignatura ${i + 1} (${a.id}): codigo debe ser el número de 7 cifras de la URJC entre comillas, como "2327007"`);
      return { id: a.id, nombre: a.nombre, color: a.color, ...(typeof codigo === 'string' ? { codigo } : {}) };
  ```
- `serializarAsignaturas`:
  ```ts
  export function serializarAsignaturas(lista: Asignatura[]): string {
    return stringify({
      asignaturas: lista.map(({ id, nombre, color, codigo }) => ({ id, nombre, color, ...(codigo ? { codigo } : {}) })),
    });
  }
  ```
  Comprueba que `stringify` escribe el código entre comillas (`codigo: "2327007"`): la prueba de ida y vuelta ya lo cubre (sin comillas volvería como número y seguiría pasando por el `String`), así que añade también `expect(serializarAsignaturas(l)).toContain('codigo: "2327007"')` a la primera prueba de `codigo de la URJC`. Si `yaml` no lo pone entre comillas, pásale la opción `{ defaultStringType: 'QUOTE_DOUBLE' }` solo si eso no cambia el resto del archivo; si lo cambia, deja el número sin comillas y apúntalo como `Ruling:` (se lee igual gracias al `String`).

- [ ] **Step 5: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde y compilación sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/datos src/agenda/tareas.ts src/agenda/tareas.test.ts
git commit -m "Uni: campo origen en tareas, codigo en asignaturas e id compartido"
```

---

### Task 3: Hora de Madrid y tipos comunes (`src/uni/hora.ts`, `src/uni/tipos.ts`)

**Files:**
- Create: `src/uni/hora.ts`
- Create: `src/uni/tipos.ts`
- Test: `src/uni/hora.test.ts`

**Interfaces:**
- Consumes: `ISODate` de `src/fechas.ts`; `Prioridad` de `src/datos/tareas.ts`; `Asignatura` de `src/datos/asignaturas.ts`.
- Produces:
  - `export interface FechaHora { fecha: ISODate; hora: string }`
  - `export function enMadrid(instante: Date): FechaHora`
  - `export function hoyEnMadrid(ahora: Date): ISODate`
  - `export function plazoEnMadrid(instante: Date): FechaHora` (regla de las 00:00)
  - `export interface Propuesta { origen: string; titulo: string; area: string; prioridad: Prioridad; fecha: ISODate; hora?: string; notas?: string; icono?: string; notasDeLaFuente: boolean }`
  - `export class ErrorFormato extends Error`
  - `export function porCodigo(asignaturas: Asignatura[]): Map<string, Asignatura>`

- [ ] **Step 1: Escribir la prueba que falla**

`src/uni/hora.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { enMadrid, hoyEnMadrid, plazoEnMadrid } from './hora.ts';
import { porCodigo } from './tipos.ts';

describe('hora de Madrid', () => {
  it('verano (UTC+2)', () => {
    expect(enMadrid(new Date('2026-09-30T21:59:00Z'))).toEqual({ fecha: '2026-09-30', hora: '23:59' });
    expect(enMadrid(new Date('2026-10-05T22:00:00Z'))).toEqual({ fecha: '2026-10-06', hora: '00:00' });
  });
  it('invierno (UTC+1)', () => {
    expect(enMadrid(new Date('2027-01-21T08:00:00Z'))).toEqual({ fecha: '2027-01-21', hora: '09:00' });
  });
  it('hoy es la fecha de Madrid, no la del servidor', () => {
    expect(hoyEnMadrid(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01');
  });
});

describe('plazoEnMadrid', () => {
  it('las 00:00 pasan al día anterior a las 23:59', () => {
    expect(plazoEnMadrid(new Date('2026-10-05T22:00:00Z'))).toEqual({ fecha: '2026-10-05', hora: '23:59' });
  });
  it('en invierno y cruzando de año también', () => {
    expect(plazoEnMadrid(new Date('2026-12-31T23:00:00Z'))).toEqual({ fecha: '2026-12-31', hora: '23:59' });
    expect(plazoEnMadrid(new Date('2027-03-01T23:00:00Z'))).toEqual({ fecha: '2027-03-01', hora: '23:59' });
  });
  it('cualquier otra hora se queda igual', () => {
    expect(plazoEnMadrid(new Date('2026-09-30T21:59:00Z'))).toEqual({ fecha: '2026-09-30', hora: '23:59' });
    expect(plazoEnMadrid(new Date('2026-10-06T08:30:00Z'))).toEqual({ fecha: '2026-10-06', hora: '10:30' });
  });
});

describe('porCodigo', () => {
  it('solo las asignaturas con codigo', () => {
    const m = porCodigo([
      { id: 'calculo', nombre: 'Cálculo', color: '#000000', codigo: '2327007' },
      { id: 'fisica', nombre: 'Física', color: '#000000' },
    ]);
    expect([...m.keys()]).toEqual(['2327007']);
    expect(m.get('2327007')?.id).toBe('calculo');
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni`
Expected: FAIL (no existen los archivos).

- [ ] **Step 3: Implementar**

`src/uni/hora.ts`:

```ts
import type { ISODate } from '../fechas.ts';

export interface FechaHora {
  fecha: ISODate;
  hora: string;
}

const FORMATO = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Fecha y hora de Madrid de un instante, sea cual sea la zona horaria del ordenador (los servidores de GitHub van en UTC).
export function enMadrid(instante: Date): FechaHora {
  const p = Object.fromEntries(FORMATO.formatToParts(instante).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export function hoyEnMadrid(ahora: Date): ISODate {
  return enMadrid(ahora).fecha;
}

// Moodle escribe «a las 00:00 del día 6» cuando quiere decir «hasta el final del día 5».
export function plazoEnMadrid(instante: Date): FechaHora {
  const r = enMadrid(instante);
  return r.hora === '00:00' ? { fecha: diaAnterior(r.fecha), hora: '23:59' } : r;
}

function diaAnterior(iso: ISODate): ISODate {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
```

`src/uni/tipos.ts`:

```ts
import type { Asignatura } from '../datos/asignaturas.ts';
import type { Prioridad } from '../datos/tareas.ts';
import type { ISODate } from '../fechas.ts';

// Lo que una fuente (exámenes de la URJC o aula virtual) propone meter en tareas.yaml.
export interface Propuesta {
  origen: string;
  titulo: string;
  area: string;
  prioridad: Prioridad;
  fecha: ISODate;
  hora?: string;
  notas?: string;
  icono?: string;
  // true: las notas vienen de la fuente (aulas de un examen) y se actualizan si la fuente las cambia.
  notasDeLaFuente: boolean;
}

// Una fuente ha devuelto algo que no tiene el formato esperado: no se escribe nada.
export class ErrorFormato extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFormato';
  }
}

// Asignaturas por su código de la URJC. Las que no tienen código no se sincronizan.
export function porCodigo(asignaturas: Asignatura[]): Map<string, Asignatura> {
  return new Map(asignaturas.filter((a) => a.codigo).map((a) => [a.codigo as string, a]));
}
```

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/uni
git commit -m "Uni: hora de Madrid (regla de las 00:00) y tipos comunes"
```

---

### Task 4: Leer el calendario (`src/uni/ics.ts`)

**Files:**
- Create: `src/uni/ics.ts`
- Test: `src/uni/ics.test.ts`

**Interfaces:**
- Consumes: `ErrorFormato` de `src/uni/tipos.ts`.
- Produces:
  - `export interface EventoIcs { uid: string; titulo: string; descripcion: string; inicio: Date; soloDia: boolean; categorias: string[] }`
  - `export interface ResultadoIcs { eventos: EventoIcs[]; saltados: number }`
  - `export function leerIcs(texto: string): ResultadoIcs` (lanza `ErrorFormato` si no es un iCalendar)

- [ ] **Step 1: Escribir la prueba que falla**

`src/uni/ics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { leerIcs } from './ics.ts';

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:111@aula.ejemplo/moodle',
  'SUMMARY:Práctica 1 se cierra',
  'DESCRIPTION:Sube el código\\, y la memoria.\\nFecha: 3/12\\; aula 2',
  'DTSTART:20261005T220000Z',
  'CATEGORIES:2026-27_2327004_1_2',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:222@aula.ejemplo/moodle',
  'SUMMARY:Un título muy largo que Moodle',
  '  parte en dos líneas',
  'DESCRIPTION:',
  'DTSTART;VALUE=DATE:20261112',
  'CATEGORIES:A\\,B,OTRO',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('leerIcs', () => {
  it('lee los eventos, quita escapes y junta líneas partidas', () => {
    const { eventos, saltados } = leerIcs(ICS);
    expect(saltados).toBe(0);
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toEqual({
      uid: '111@aula.ejemplo/moodle',
      titulo: 'Práctica 1 se cierra',
      descripcion: 'Sube el código, y la memoria.\nFecha: 3/12; aula 2',
      inicio: new Date('2026-10-05T22:00:00Z'),
      soloDia: false,
      categorias: ['2026-27_2327004_1_2'],
    });
    expect(eventos[1].titulo).toBe('Un título muy largo que Moodle parte en dos líneas');
    expect(eventos[1].soloDia).toBe(true);
    expect(eventos[1].inicio.toISOString().slice(0, 10)).toBe('2026-11-12');
    expect(eventos[1].categorias).toEqual(['A,B', 'OTRO']);
  });
  it('funciona con saltos de línea \\n y con BOM', () => {
    expect(leerIcs('\uFEFF' + ICS.replace(/\r\n/g, '\n')).eventos).toHaveLength(2);
  });
  it('salta los eventos sin UID o sin fecha legible y los cuenta', () => {
    const raro = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Sin uid\nDTSTART:20261005T220000Z\nEND:VEVENT\n'
      + 'BEGIN:VEVENT\nUID:3\nSUMMARY:Hora local\nDTSTART;TZID=Europe/Madrid:20261005T100000\nEND:VEVENT\nEND:VCALENDAR';
    expect(leerIcs(raro)).toEqual({ eventos: [], saltados: 2 });
  });
  it('un calendario vacío no es un error', () => {
    expect(leerIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')).toEqual({ eventos: [], saltados: 0 });
  });
  it('una página HTML (enlace caducado) es un error de formato', () => {
    expect(() => leerIcs('<!DOCTYPE html><html><body>Acceder</body></html>')).toThrow(/caducado/);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni/ics.test.ts`
Expected: FAIL (no existe `./ics.ts`).

- [ ] **Step 3: Implementar**

`src/uni/ics.ts`:

```ts
import { ErrorFormato } from './tipos.ts';

export interface EventoIcs {
  uid: string;
  titulo: string;
  descripcion: string;
  inicio: Date;
  // DTSTART;VALUE=DATE: evento de todo el día (sin hora).
  soloDia: boolean;
  categorias: string[];
}

export interface ResultadoIcs {
  eventos: EventoIcs[];
  saltados: number;
}

interface Propiedad {
  params: string;
  valor: string;
}

// Lee un calendario iCalendar (lo que exporta Moodle). Los eventos sin UID o sin fecha legible se saltan y se cuentan.
export function leerIcs(texto: string): ResultadoIcs {
  const lineas = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  if (lineas[0]?.trim() !== 'BEGIN:VCALENDAR')
    throw new ErrorFormato('el aula virtual no ha devuelto un calendario (¿ha caducado el enlace?)');
  const eventos: EventoIcs[] = [];
  let saltados = 0;
  let actual: Map<string, Propiedad> | null = null;
  for (const linea of lineas) {
    if (linea === 'BEGIN:VEVENT') {
      actual = new Map();
    } else if (linea === 'END:VEVENT') {
      const e = actual && aEvento(actual);
      if (e) eventos.push(e);
      else saltados++;
      actual = null;
    } else if (actual) {
      const dosPuntos = linea.indexOf(':');
      if (dosPuntos < 0) continue;
      const [nombre, ...params] = linea.slice(0, dosPuntos).split(';');
      actual.set(nombre.toUpperCase(), { params: params.join(';'), valor: linea.slice(dosPuntos + 1) });
    }
  }
  return { eventos, saltados };
}

function aEvento(p: Map<string, Propiedad>): EventoIcs | null {
  const uid = p.get('UID')?.valor.trim();
  const inicio = leerFecha(p.get('DTSTART')?.valor.trim() ?? '');
  if (!uid || !inicio) return null;
  return {
    uid,
    titulo: desescapar(p.get('SUMMARY')?.valor ?? '').trim(),
    descripcion: desescapar(p.get('DESCRIPTION')?.valor ?? ''),
    inicio: inicio.instante,
    soloDia: inicio.soloDia,
    categorias: (p.get('CATEGORIES')?.valor ?? '')
      .split(/(?<!\\),/)
      .map((c) => desescapar(c).trim())
      .filter(Boolean),
  };
}

// Moodle exporta en UTC (terminado en Z) o, para eventos de todo el día, solo la fecha.
function leerFecha(v: string): { instante: Date; soloDia: boolean } | null {
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v);
  if (m) return { instante: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])), soloDia: false };
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  // A mediodía UTC para que en Madrid siga siendo el mismo día.
  if (m) return { instante: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)), soloDia: true };
  return null;
}

function desescapar(v: string): string {
  return v.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}
```

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/uni/ics.ts src/uni/ics.test.ts
git commit -m "Uni: leer el calendario iCalendar del aula virtual"
```

---

### Task 5: Exámenes de la URJC → propuestas (`src/uni/examenes.ts`)

**Files:**
- Create: `src/uni/examenes.ts`
- Test: `src/uni/examenes.test.ts`

**Interfaces:**
- Consumes: `Propuesta`, `ErrorFormato` de `src/uni/tipos.ts`; `Asignatura` de `src/datos/asignaturas.ts`; `isISODate`, `isHora`, `ISODate` de `src/fechas.ts`.
- Produces:
  - `export type ExamenUrjc = Record<string, unknown>`
  - `export function leerExamenes(json: unknown): ExamenUrjc[]` (lanza `ErrorFormato` si no hay lista `CONSULTA`)
  - `export function propuestasDeExamenes(examenes: ExamenUrjc[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[]`
  - `export function decodificarEntidades(s: string): string` (la usa también `moodle.ts`)

- [ ] **Step 1: Escribir la prueba que falla**

`src/uni/examenes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import { leerExamenes, propuestasDeExamenes } from './examenes.ts';

const ASIG = new Map<string, Asignatura>([
  ['2327007', { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }],
  ['2327002', { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' }],
]);

const examen = (x: Record<string, unknown>) => ({
  COD_ASIGNATURA: '2327007', ASIGNATURA: 'CALCULO', FECHA: '21-01-2027', HORA: '09:00 - 12:00',
  AULAS: 'Aulario II - Aula 204', CONVOCATORIA: 'E', CURSO_ACADEMICO: '2026-27', GRUPO: 'AM', ...x,
});

describe('leerExamenes', () => {
  it('devuelve la lista CONSULTA', () => {
    expect(leerExamenes({ CONSULTA: [examen({})], 0: { AULAS_ENERO: 'off' } })).toHaveLength(1);
  });
  it('sin lista CONSULTA es un error de formato', () => {
    expect(() => leerExamenes({ error: 'x' })).toThrow('CONSULTA');
    expect(() => leerExamenes(null)).toThrow('CONSULTA');
  });
});

describe('propuestasDeExamenes', () => {
  it('convierte un examen con el nombre bonito de la asignatura', () => {
    expect(propuestasDeExamenes([examen({})], ASIG, '2026-09-30')).toEqual([{
      origen: 'urjc-examen:2026-27:2327007:E:AM',
      titulo: 'Examen: Cálculo (enero)',
      area: 'calculo',
      prioridad: 'alta',
      icono: 'school',
      fecha: '2027-01-21',
      hora: '09:00',
      notas: '09:00 - 12:00 · Aulario II - Aula 204',
      notasDeLaFuente: true,
    }]);
  });
  it('varias aulas separadas por <br/> y entidades HTML', () => {
    const [p] = propuestasDeExamenes([examen({ AULAS: 'Aulario I - Aula 003<br/>Aulario I &amp; Lab<br>' })], ASIG, '2026-09-30');
    expect(p.notas).toBe('09:00 - 12:00 · Aulario I - Aula 003 · Aulario I & Lab');
  });
  it('convocatorias', () => {
    const titulos = ['E', 'M', 'J', 'S', 'X'].map((c) => propuestasDeExamenes([examen({ CONVOCATORIA: c })], ASIG, '2026-09-30')[0].titulo);
    expect(titulos).toEqual([
      'Examen: Cálculo (enero)', 'Examen: Cálculo (mayo)', 'Examen: Cálculo (junio)', 'Examen: Cálculo (septiembre)', 'Examen: Cálculo (convocatoria X)',
    ]);
  });
  it('se salta lo pasado, lo de otras asignaturas y las fechas raras; hoy sí entra', () => {
    const r = propuestasDeExamenes([
      examen({ FECHA: '23-09-2026' }),
      examen({ FECHA: '30-09-2026', CONVOCATORIA: 'S' }),
      examen({ COD_ASIGNATURA: '2327099' }),
      examen({ FECHA: '2027-01-21' }),
      examen({ FECHA: '31-02-2027' }),
    ], ASIG, '2026-09-30');
    expect(r.map((p) => p.fecha)).toEqual(['2026-09-30']);
  });
  it('sin hora legible ni aulas: sin hora y sin notas', () => {
    const [p] = propuestasDeExamenes([examen({ HORA: '', AULAS: null })], ASIG, '2026-09-30');
    expect(p.hora).toBeUndefined();
    expect(p.notas).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni/examenes.test.ts`
Expected: FAIL (no existe `./examenes.ts`).

- [ ] **Step 3: Implementar**

`src/uni/examenes.ts`:

```ts
import type { Asignatura } from '../datos/asignaturas.ts';
import { isHora, isISODate, type ISODate } from '../fechas.ts';
import { ErrorFormato, type Propuesta } from './tipos.ts';

export type ExamenUrjc = Record<string, unknown>;

const CONVOCATORIAS: Record<string, string> = { E: 'enero', M: 'mayo', J: 'junio', S: 'septiembre' };

// La web de exámenes contesta {"CONSULTA": [ … ]}.
export function leerExamenes(json: unknown): ExamenUrjc[] {
  const lista = typeof json === 'object' && json !== null ? (json as { CONSULTA?: unknown }).CONSULTA : undefined;
  if (!Array.isArray(lista)) throw new ErrorFormato('la web de exámenes de la URJC no ha devuelto la lista CONSULTA');
  return lista.filter((x): x is ExamenUrjc => typeof x === 'object' && x !== null);
}

export function propuestasDeExamenes(examenes: ExamenUrjc[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[] {
  const r: Propuesta[] = [];
  for (const e of examenes) {
    const codigo = texto(e.COD_ASIGNATURA);
    const asignatura = asignaturas.get(codigo);
    const fecha = fechaUrjc(texto(e.FECHA));
    if (!asignatura || !fecha || fecha < hoy) continue;
    const convocatoria = texto(e.CONVOCATORIA);
    const franja = texto(e.HORA).replace(/\s+/g, ' ');
    const inicio = /^\d{2}:\d{2}/.exec(franja)?.[0];
    const aulas = texto(e.AULAS).split(/<br\s*\/?>/i).map((a) => decodificarEntidades(a).trim()).filter(Boolean);
    const notas = [franja, ...aulas].filter(Boolean).join(' · ');
    r.push({
      origen: `urjc-examen:${texto(e.CURSO_ACADEMICO)}:${codigo}:${convocatoria}:${texto(e.GRUPO)}`,
      titulo: `Examen: ${asignatura.nombre} (${CONVOCATORIAS[convocatoria] ?? `convocatoria ${convocatoria}`})`,
      area: asignatura.id,
      prioridad: 'alta',
      icono: 'school',
      fecha,
      ...(inicio && isHora(inicio) ? { hora: inicio } : {}),
      ...(notas ? { notas } : {}),
      notasDeLaFuente: true,
    });
  }
  return r;
}

export function decodificarEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

function texto(x: unknown): string {
  if (typeof x === 'string') return x.trim();
  if (typeof x === 'number') return String(x);
  return '';
}

// DD-MM-AAAA → AAAA-MM-DD (null si no es una fecha real).
function fechaUrjc(s: string): ISODate | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isISODate(iso) ? iso : null;
}
```

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/uni/examenes.ts src/uni/examenes.test.ts
git commit -m "Uni: exámenes oficiales de la URJC a propuestas de tarea"
```

---

### Task 6: Aula virtual → propuestas (`src/uni/moodle.ts`)

**Files:**
- Create: `src/uni/moodle.ts`
- Test: `src/uni/moodle.test.ts`

**Interfaces:**
- Consumes: `EventoIcs` de `src/uni/ics.ts`; `enMadrid`, `plazoEnMadrid` de `src/uni/hora.ts`; `decodificarEntidades` de `src/uni/examenes.ts`; `Propuesta` de `src/uni/tipos.ts`; `Asignatura`.
- Produces:
  - `export function propuestasDeMoodle(eventos: EventoIcs[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[]`
  - `export function textoPlano(s: string): string`

- [ ] **Step 1: Escribir la prueba que falla**

`src/uni/moodle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import type { EventoIcs } from './ics.ts';
import { propuestasDeMoodle, textoPlano } from './moodle.ts';

const ASIG = new Map<string, Asignatura>([
  ['2327004', { id: 'fundamentos-programacion', nombre: 'Fundamentos de la Programación', color: '#2f9e6e', codigo: '2327004' }],
]);

const ev = (x: Partial<EventoIcs>): EventoIcs => ({
  uid: '1@aula', titulo: 'Práctica 1 se cierra', descripcion: '', inicio: new Date('2026-10-05T22:00:00Z'),
  soloDia: false, categorias: ['2026-27_2327004_159508_186565'], ...x,
});

const HOY = '2026-09-30';

describe('propuestasDeMoodle', () => {
  it('una entrega que vence a las 00:00 pasa al día anterior a las 23:59', () => {
    expect(propuestasDeMoodle([ev({})], ASIG, HOY)).toEqual([{
      origen: 'moodle:1@aula',
      titulo: 'Entrega: Práctica 1',
      area: 'fundamentos-programacion',
      prioridad: 'media',
      icono: 'file-upload',
      fecha: '2026-10-05',
      hora: '23:59',
      notasDeLaFuente: false,
    }]);
  });
  it('«vence» también es una entrega; «se abre» no se importa', () => {
    const r = propuestasDeMoodle([
      ev({ uid: 'a', titulo: 'Tarea 2 vence' }),
      ev({ uid: 'b', titulo: 'Test Tema 1 se abre' }),
    ], ASIG, HOY);
    expect(r.map((p) => p.titulo)).toEqual(['Entrega: Tarea 2']);
  });
  it('un evento del profesor va con su título, sin icono', () => {
    const [p] = propuestasDeMoodle([ev({ titulo: 'Parcial tema 1-3', inicio: new Date('2026-11-12T09:00:00Z') })], ASIG, HOY);
    expect(p).toMatchObject({ titulo: 'Parcial tema 1-3', fecha: '2026-11-12', hora: '10:00' });
    expect(p.icono).toBeUndefined();
  });
  it('un evento de todo el día va sin hora', () => {
    const [p] = propuestasDeMoodle([ev({ titulo: 'Día sin clase', soloDia: true, inicio: new Date('2026-11-12T12:00:00Z') })], ASIG, HOY);
    expect(p.fecha).toBe('2026-11-12');
    expect(p.hora).toBeUndefined();
  });
  it('se salta lo de cursos que no son asignaturas con codigo, lo pasado y lo que no tiene título', () => {
    const r = propuestasDeMoodle([
      ev({ uid: 'a', categorias: ['RAC_EMP_FUENLABRADA'] }),
      ev({ uid: 'b', categorias: ['2026-27_2327099_1_2'] }),
      ev({ uid: 'c', categorias: [] }),
      ev({ uid: 'd', inicio: new Date('2026-09-29T10:00:00Z') }),
      ev({ uid: 'e', titulo: '' }),
      ev({ uid: 'f', inicio: new Date('2026-09-30T21:59:00Z') }),
    ], ASIG, HOY);
    expect(r.map((p) => p.origen)).toEqual(['moodle:f']);
  });
  it('la descripción va a las notas como texto plano, y el título sin entidades', () => {
    const [p] = propuestasDeMoodle([ev({
      titulo: 'Memoria &amp; código se cierra',
      descripcion: '<p>Instrucciones:&nbsp;</p>\n\n\n\t\tGrupo 5\n\t\t14/12/2026<br>Fin',
    })], ASIG, HOY);
    expect(p.titulo).toBe('Entrega: Memoria & código');
    expect(p.notas).toBe('Instrucciones:\n\nGrupo 5\n14/12/2026\nFin');
  });
});

describe('textoPlano', () => {
  it('quita etiquetas, entidades y espacios de sobra', () => {
    expect(textoPlano('  <b>Hola</b>&nbsp;&lt;3  \n\n\n\n  adiós ')).toBe('Hola <3\n\nadiós');
    expect(textoPlano('   ')).toBe('');
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni/moodle.test.ts`
Expected: FAIL (no existe `./moodle.ts`).

- [ ] **Step 3: Implementar**

`src/uni/moodle.ts`:

```ts
import type { Asignatura } from '../datos/asignaturas.ts';
import type { ISODate } from '../fechas.ts';
import { decodificarEntidades } from './examenes.ts';
import { enMadrid, plazoEnMadrid } from './hora.ts';
import type { EventoIcs } from './ics.ts';
import type { Propuesta } from './tipos.ts';

export function propuestasDeMoodle(eventos: EventoIcs[], asignaturas: Map<string, Asignatura>, hoy: ISODate): Propuesta[] {
  const r: Propuesta[] = [];
  for (const e of eventos) {
    const asignatura = asignaturaDelEvento(e.categorias, asignaturas);
    const titulo = textoPlano(e.titulo).replace(/\s+/g, ' ');
    // «X se abre» es cuando empieza un cuestionario: no hay nada que hacer.
    if (!asignatura || !titulo || / se abre$/i.test(titulo)) continue;
    const cuando = e.soloDia ? { fecha: enMadrid(e.inicio).fecha } : plazoEnMadrid(e.inicio);
    if (cuando.fecha < hoy) continue;
    const entrega = /^(.*\S)\s+(se cierra|vence)$/i.exec(titulo);
    const notas = textoPlano(e.descripcion);
    r.push({
      origen: `moodle:${e.uid}`,
      titulo: entrega ? `Entrega: ${entrega[1]}` : titulo,
      area: asignatura.id,
      prioridad: 'media',
      ...(entrega ? { icono: 'file-upload' } : {}),
      ...cuando,
      ...(notas ? { notas } : {}),
      notasDeLaFuente: false,
    });
  }
  return r;
}

// El curso va en CATEGORIES como «2026-27_2327004_159508_186565»: se busca un trozo que sea el código de una asignatura.
function asignaturaDelEvento(categorias: string[], asignaturas: Map<string, Asignatura>): Asignatura | undefined {
  for (const c of categorias)
    for (const trozo of c.split(/\D+/)) {
      const a = asignaturas.get(trozo);
      if (a) return a;
    }
  return undefined;
}

export function textoPlano(s: string): string {
  return decodificarEntidades(
    s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/uni/moodle.ts src/uni/moodle.test.ts
git commit -m "Uni: eventos del aula virtual a propuestas de tarea"
```

---

### Task 7: Fusionar con las tareas y lista de vistos (`src/uni/fusionar.ts`, `src/uni/vistos.ts`)

**Files:**
- Create: `src/uni/vistos.ts`
- Create: `src/uni/fusionar.ts`
- Test: `src/uni/vistos.test.ts`, `src/uni/fusionar.test.ts`

**Interfaces:**
- Consumes: `Tarea`, `siguienteIdTarea` de `src/datos/tareas.ts`; `RUTA_UNI_SINCRONIZACION` de `src/datos/rutas.ts`; `ErrorDatos`, `leerYaml` de `src/datos/yaml.ts`; `isISODate`, `isHora`, `ISODate` de `src/fechas.ts`; `Propuesta` de `src/uni/tipos.ts`.
- Produces:
  - `export interface Visto { fecha: ISODate; hora?: string; notas?: string }`
  - `export type Vistos = Record<string, Visto>`
  - `export function parseVistos(texto: string | null): Vistos`
  - `export function serializarVistos(v: Vistos): string`
  - `export interface ResultadoFusion { tareas: Tarea[]; vistos: Vistos; creadas: number; actualizadas: number }`
  - `export function fusionar(tareas: Tarea[], vistos: Vistos, propuestas: Propuesta[], hoy: ISODate): ResultadoFusion`

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/uni/vistos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseVistos, serializarVistos } from './vistos.ts';

describe('uni-sincronizacion.yaml', () => {
  it('sin archivo o vacío → nada visto', () => {
    expect(parseVistos(null)).toEqual({});
    expect(parseVistos('')).toEqual({});
    expect(parseVistos('vistos:\n')).toEqual({});
  });
  it('ida y vuelta', () => {
    const v = {
      'urjc-examen:2026-27:2327007:E:AM': { fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204' },
      'moodle:1@aula': { fecha: '2026-10-05', hora: '23:59' },
    };
    // La hora tiene que volver como texto '09:00', no como número.
    expect(parseVistos(serializarVistos(v))).toEqual(v);
  });
  it('un archivo mal hecho es un error (no se sincroniza a ciegas)', () => {
    expect(() => parseVistos('- a\n- b\n')).toThrow('vistos');
    expect(() => parseVistos('vistos:\n  x:\n    fecha: mañana\n')).toThrow('fecha');
  });
});
```

`src/uni/fusionar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas.ts';
import { fusionar } from './fusionar.ts';
import type { Propuesta } from './tipos.ts';

const HOY = '2026-09-30';

const examen = (x: Partial<Propuesta> = {}): Propuesta => ({
  origen: 'urjc-examen:2026-27:2327007:E:AM', titulo: 'Examen: Cálculo (enero)', area: 'calculo', prioridad: 'alta',
  icono: 'school', fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204', notasDeLaFuente: true, ...x,
});
const entrega = (x: Partial<Propuesta> = {}): Propuesta => ({
  origen: 'moodle:1@aula', titulo: 'Entrega: Práctica 1', area: 'fundamentos-programacion', prioridad: 'media',
  icono: 'file-upload', fecha: '2026-10-05', hora: '23:59', notas: 'Sube el código', notasDeLaFuente: false, ...x,
});
const mia: Tarea = { id: 't-20260930-1', titulo: 'Ir a entrenar', area: 'salud' };

describe('fusionar', () => {
  it('crea lo nuevo con id del día, sin repetir, y lo apunta en vistos', () => {
    const r = fusionar([mia, { ...mia, id: 't-20260930-2' }], {}, [examen(), entrega()], HOY);
    expect(r.creadas).toBe(2);
    expect(r.actualizadas).toBe(0);
    expect(r.tareas.slice(2)).toEqual([
      { id: 't-20260930-3', titulo: 'Examen: Cálculo (enero)', icono: 'school', area: 'calculo', prioridad: 'alta',
        fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204', origen: 'urjc-examen:2026-27:2327007:E:AM' },
      { id: 't-20260930-4', titulo: 'Entrega: Práctica 1', icono: 'file-upload', area: 'fundamentos-programacion',
        fecha: '2026-10-05', hora: '23:59', notas: 'Sube el código', origen: 'moodle:1@aula' },
    ]);
    expect(r.vistos).toEqual({
      'urjc-examen:2026-27:2327007:E:AM': { fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204' },
      'moodle:1@aula': { fecha: '2026-10-05', hora: '23:59' },
    });
  });
  it('la segunda vez no cambia nada', () => {
    const a = fusionar([mia], {}, [examen(), entrega()], HOY);
    const b = fusionar(a.tareas, a.vistos, [examen(), entrega()], HOY);
    expect(b).toEqual({ ...a, creadas: 0, actualizadas: 0 });
  });
  it('lo que Diego borró no vuelve', () => {
    const a = fusionar([], {}, [entrega()], HOY);
    const b = fusionar([], a.vistos, [entrega()], HOY);
    expect(b.tareas).toEqual([]);
    expect(b.creadas).toBe(0);
  });
  it('si la URJC mueve el examen, cambian fecha, hora y aula; lo de Diego se queda', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const editada = { ...a.tareas[0], titulo: 'EXAMEN CÁLCULO', prioridad: 'baja' as const, hecha: true, proyecto: 'uni' };
    const b = fusionar([editada], a.vistos, [examen({ fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' })], HOY);
    expect(b.actualizadas).toBe(1);
    expect(b.tareas[0]).toEqual({ ...editada, fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' });
    expect(b.vistos['urjc-examen:2026-27:2327007:E:AM']).toEqual({ fecha: '2027-01-22', hora: '12:00', notas: '12:00 - 15:00 · Aula 1' });
  });
  it('las notas y la hora que escribe Diego se respetan mientras la URJC no las cambie', () => {
    const a = fusionar([], {}, [examen(), entrega()], HOY);
    const tareas = [{ ...a.tareas[0], notas: 'Repasar tema 3' }, { ...a.tareas[1], hora: '20:00', notas: 'Mis notas' }];
    const b = fusionar(tareas, a.vistos, [examen(), entrega({ notas: 'Descripción nueva del profe' })], HOY);
    expect(b.actualizadas).toBe(0);
    expect(b.tareas).toEqual(tareas);
  });
  it('si la fuente quita la hora, se quita el campo', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, a.vistos, [examen({ hora: undefined })], HOY);
    expect('hora' in b.tareas[0]).toBe(false);
  });
  it('lo que desaparece de la fuente no se borra', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, a.vistos, [], HOY);
    expect(b.tareas).toEqual(a.tareas);
  });
  it('la misma cosa dos veces en la fuente → una sola tarea', () => {
    const r = fusionar([], {}, [examen(), examen()], HOY);
    expect(r.tareas).toHaveLength(1);
    expect(r.creadas).toBe(1);
  });
  it('si se perdió la lista de vistos, no duplica lo que ya está en tareas', () => {
    const a = fusionar([], {}, [examen()], HOY);
    const b = fusionar(a.tareas, {}, [examen()], HOY);
    expect(b.tareas).toEqual(a.tareas);
    expect(b.creadas).toBe(0);
    expect(b.vistos).toEqual(a.vistos);
  });
  it('quita de vistos lo que ya ha pasado', () => {
    const r = fusionar([], { 'moodle:viejo': { fecha: '2026-09-29' }, 'moodle:hoy': { fecha: HOY } }, [], HOY);
    expect(Object.keys(r.vistos)).toEqual(['moodle:hoy']);
  });
  it('no cambia los arrays ni las tareas que recibe', () => {
    const tareas = [mia];
    const vistos = {};
    fusionar(tareas, vistos, [examen()], HOY);
    expect(tareas).toEqual([mia]);
    expect(vistos).toEqual({});
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni/vistos.test.ts src/uni/fusionar.test.ts`
Expected: FAIL (no existen los archivos).

- [ ] **Step 3: Implementar**

`src/uni/vistos.ts`:

```ts
import { stringify } from 'yaml';
import { RUTA_UNI_SINCRONIZACION } from '../datos/rutas.ts';
import { ErrorDatos, leerYaml } from '../datos/yaml.ts';
import { isHora, isISODate, type ISODate } from '../fechas.ts';

// Lo último que dijo la fuente de cada cosa importada (por su `origen`).
export interface Visto {
  fecha: ISODate;
  hora?: string;
  notas?: string;
}

export type Vistos = Record<string, Visto>;

export function parseVistos(texto: string | null): Vistos {
  if (texto === null) return {};
  const datos = leerYaml(texto, RUTA_UNI_SINCRONIZACION);
  if (datos === null || datos === undefined) return {};
  if (typeof datos !== 'object' || Array.isArray(datos))
    throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, 'el archivo debe empezar por «vistos:»');
  const mapa = (datos as { vistos?: unknown }).vistos;
  if (mapa === undefined || mapa === null) return {};
  if (typeof mapa !== 'object' || Array.isArray(mapa))
    throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, 'vistos debe ser una lista de origen: { fecha, hora, notas }');
  const r: Vistos = {};
  for (const [origen, bruto] of Object.entries(mapa as Record<string, unknown>)) {
    const v = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
    if (!isISODate(v.fecha)) throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: fecha debe tener el formato AAAA-MM-DD`);
    if (v.hora !== undefined && !isHora(v.hora)) throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: hora debe tener el formato "HH:MM"`);
    if (v.notas !== undefined && typeof v.notas !== 'string') throw new ErrorDatos(RUTA_UNI_SINCRONIZACION, `${origen}: notas debe ser texto`);
    r[origen] = { fecha: v.fecha, ...(v.hora !== undefined ? { hora: v.hora as string } : {}), ...(v.notas !== undefined ? { notas: v.notas as string } : {}) };
  }
  return r;
}

export function serializarVistos(v: Vistos): string {
  return stringify({ vistos: v }, { lineWidth: 0 });
}
```


`src/uni/fusionar.ts`:

```ts
import { siguienteIdTarea, type Tarea } from '../datos/tareas.ts';
import type { ISODate } from '../fechas.ts';
import type { Propuesta } from './tipos.ts';
import type { Visto, Vistos } from './vistos.ts';

export interface ResultadoFusion {
  tareas: Tarea[];
  vistos: Vistos;
  creadas: number;
  actualizadas: number;
}

const CAMPOS_DE_LA_FUENTE = ['fecha', 'hora', 'notas'] as const;

// Junta lo que proponen las fuentes con las tareas, sin pisar nada de Diego (spec, sección 3):
// solo crea lo que nunca se ha visto, solo cambia un campo si cambió en la fuente y nunca borra.
export function fusionar(tareas: Tarea[], vistos: Vistos, propuestas: Propuesta[], hoy: ISODate): ResultadoFusion {
  const resultado = [...tareas];
  const nuevosVistos: Vistos = { ...vistos };
  let creadas = 0;
  let actualizadas = 0;
  for (const p of propuestas) {
    const antes = nuevosVistos[p.origen];
    const ahora = vistoDe(p);
    nuevosVistos[p.origen] = ahora;
    const i = resultado.findIndex((t) => t.origen === p.origen);
    if (!antes) {
      // Si ya está en tareas (se perdió la lista de vistos), se deja como está.
      if (i < 0) {
        resultado.push(crear(p, siguienteIdTarea(hoy, resultado)));
        creadas++;
      }
      continue;
    }
    if (i < 0) continue; // Diego la borró: no vuelve.
    const cambiada = aplicarCambiosDeLaFuente(resultado[i], antes, ahora);
    if (cambiada !== resultado[i]) {
      resultado[i] = cambiada;
      actualizadas++;
    }
  }
  for (const [origen, v] of Object.entries(nuevosVistos)) if (v.fecha < hoy) delete nuevosVistos[origen];
  return { tareas: resultado, vistos: nuevosVistos, creadas, actualizadas };
}

function vistoDe(p: Propuesta): Visto {
  return {
    fecha: p.fecha,
    ...(p.hora ? { hora: p.hora } : {}),
    ...(p.notasDeLaFuente && p.notas ? { notas: p.notas } : {}),
  };
}

function aplicarCambiosDeLaFuente(t: Tarea, antes: Visto, ahora: Visto): Tarea {
  let r: Tarea = t;
  for (const k of CAMPOS_DE_LA_FUENTE) {
    if (antes[k] === ahora[k]) continue;
    const copia = { ...r } as Record<string, unknown>;
    if (ahora[k] === undefined) delete copia[k];
    else copia[k] = ahora[k];
    r = copia as unknown as Tarea;
  }
  return r;
}

function crear(p: Propuesta, id: string): Tarea {
  return {
    id,
    titulo: p.titulo,
    ...(p.icono ? { icono: p.icono } : {}),
    area: p.area,
    ...(p.prioridad !== 'media' ? { prioridad: p.prioridad } : {}),
    fecha: p.fecha,
    ...(p.hora ? { hora: p.hora } : {}),
    ...(p.notas ? { notas: p.notas } : {}),
    origen: p.origen,
  };
}
```

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/uni/vistos.ts src/uni/vistos.test.ts src/uni/fusionar.ts src/uni/fusionar.test.ts
git commit -m "Uni: fusionar con las tareas sin pisar nada y lista de vistos"
```

---

### Task 8: El programa `sincronizar/uni.ts`

**Files:**
- Create: `sincronizar/uni.ts`
- Test: `sincronizar/uni.test.ts`
- Modify: `tsconfig.json` (`include` añade `"sincronizar"`)

**Interfaces:**
- Consumes: `parseTareas`, `serializarTareas` (`src/datos/tareas.ts`); `parseAsignaturas` (`src/datos/asignaturas.ts`); `RUTA_TAREAS`, `RUTA_ASIGNATURAS`, `RUTA_UNI_SINCRONIZACION` (`src/datos/rutas.ts`); `leerIcs`; `leerExamenes`, `propuestasDeExamenes`; `propuestasDeMoodle`; `fusionar`; `parseVistos`, `serializarVistos`; `hoyEnMadrid`; `porCodigo`, `ErrorFormato`.
- Produces:
  - `export interface Opciones { carpeta: string; urlCalendario: string; ahora: Date; prueba: boolean; descargar: typeof fetch }`
  - `export interface Resumen { creadas: number; actualizadas: number; saltados: number; escrito: boolean }`
  - `export async function sincronizarUni(o: Opciones): Promise<Resumen>`
  - `export function textoResumen(r: Resumen): string` → `Uni: N nuevas, M actualizadas`
  - Línea de órdenes: `URJC_CALENDARIO=<enlace> node sincronizar/uni.ts <carpeta de my-context> [--prueba]`. La última línea de la salida estándar es `textoResumen(...)` (el workflow la usa como mensaje de commit). Avisos y errores por la salida de error. Código de salida 1 si falla, 2 si faltan datos.

- [ ] **Step 1: Escribir la prueba que falla**

`sincronizar/uni.test.ts`:

```ts
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTareas } from '../src/datos/tareas.ts';
import { sincronizarUni, textoResumen, type Opciones } from './uni.ts';

const URL_SECRETA = 'https://aula.ejemplo/moodle/calendar/export_execute.php?userid=1&authtoken=SECRETO123';

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT', 'UID:1@aula', 'SUMMARY:Práctica 1 se cierra', 'DTSTART:20261005T220000Z', 'CATEGORIES:2026-27_2327004_1_2', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:2@aula', 'SUMMARY:Test se cierra', 'DTSTART:20261001T215900Z', 'CATEGORIES:RAC_EMP_FUENLABRADA', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const EXAMENES = { CONSULTA: [{
  COD_ASIGNATURA: '2327007', FECHA: '21-01-2027', HORA: '09:00 - 12:00', AULAS: 'Aulario II - Aula 204',
  CONVOCATORIA: 'E', CURSO_ACADEMICO: '2026-27', GRUPO: 'AM',
}] };

const ASIGNATURAS = 'asignaturas:\n'
  + '  - id: calculo\n    nombre: Cálculo\n    color: "#36ace7"\n    codigo: "2327007"\n'
  + '  - id: fundamentos-programacion\n    nombre: Fundamentos de la Programación\n    color: "#2f9e6e"\n    codigo: "2327004"\n';

const TAREAS = '- id: t-20260930-1\n  titulo: Ir a entrenar\n  area: salud\n';

function carpeta(archivos: Record<string, string> = {}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'uni-'));
  mkdirSync(path.join(dir, 'agenda'));
  mkdirSync(path.join(dir, 'estudios'));
  const todos = { 'agenda/tareas.yaml': TAREAS, 'estudios/asignaturas.yaml': ASIGNATURAS, ...archivos };
  for (const [ruta, texto] of Object.entries(todos)) writeFileSync(path.join(dir, ruta), texto);
  return dir;
}

function descargarFalso(ics: () => Response, examenes: () => Response): typeof fetch {
  return (async (url: string | URL | Request) => (String(url) === URL_SECRETA ? ics() : examenes())) as typeof fetch;
}

const opciones = (dir: string, x: Partial<Opciones> = {}): Opciones => ({
  carpeta: dir,
  urlCalendario: URL_SECRETA,
  ahora: new Date('2026-09-30T10:00:00Z'),
  prueba: false,
  descargar: descargarFalso(() => new Response(ICS), () => Response.json(EXAMENES)),
  ...x,
});

const leer = (dir: string, ruta: string) => readFileSync(path.join(dir, ruta), 'utf8');

describe('sincronizarUni', () => {
  it('mete las novedades y apunta lo visto', async () => {
    const dir = carpeta();
    const r = await sincronizarUni(opciones(dir));
    expect(r).toEqual({ creadas: 2, actualizadas: 0, saltados: 0, escrito: true });
    expect(textoResumen(r)).toBe('Uni: 2 nuevas, 0 actualizadas');
    const tareas = parseTareas(leer(dir, 'agenda/tareas.yaml'));
    expect(tareas.map((t) => [t.id, t.titulo])).toEqual([
      ['t-20260930-1', 'Ir a entrenar'],
      ['t-20260930-2', 'Examen: Cálculo (enero)'],
      ['t-20260930-3', 'Entrega: Práctica 1'],
    ]);
    expect(leer(dir, 'estudios/uni-sincronizacion.yaml')).toContain('moodle:1@aula');
  });
  it('sin novedades no escribe nada', async () => {
    const dir = carpeta();
    await sincronizarUni(opciones(dir));
    const antes = leer(dir, 'agenda/tareas.yaml');
    const r = await sincronizarUni(opciones(dir));
    expect(r).toEqual({ creadas: 0, actualizadas: 0, saltados: 0, escrito: false });
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(antes);
  });
  it('con --prueba no guarda', async () => {
    const dir = carpeta();
    const r = await sincronizarUni(opciones(dir, { prueba: true }));
    expect(r.creadas).toBe(2);
    expect(r.escrito).toBe(false);
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(TAREAS);
    expect(existsSync(path.join(dir, 'estudios/uni-sincronizacion.yaml'))).toBe(false);
  });
  it('sin tareas.yaml empieza con la lista vacía', async () => {
    const dir = carpeta();
    writeFileSync(path.join(dir, 'agenda/tareas.yaml'), '');
    expect((await sincronizarUni(opciones(dir))).creadas).toBe(2);
  });

  async function fallaSinEscribir(dir: string, o: Opciones, mensaje: RegExp) {
    const antes = leer(dir, 'agenda/tareas.yaml');
    const error = await sincronizarUni(o).then(() => null, (e: Error) => e);
    expect(error?.message).toMatch(mensaje);
    expect(error?.message).not.toContain('SECRETO123');
    expect(leer(dir, 'agenda/tareas.yaml')).toBe(antes);
    expect(existsSync(path.join(dir, 'estudios/uni-sincronizacion.yaml'))).toBe(false);
  }

  it('enlace caducado (403) → error sin la URL y sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response('no', { status: 403 }), () => Response.json(EXAMENES)),
    }), /403/);
  });
  it('enlace caducado que devuelve una página de inicio de sesión → error sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response('<html>Acceder</html>'), () => Response.json(EXAMENES)),
    }), /caducado/);
  });
  it('la web de exámenes devuelve otra cosa → error sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: descargarFalso(() => new Response(ICS), () => new Response('<html>mantenimiento</html>')),
    }), /exámenes/);
  });
  it('sin red → error sin la URL y sin escribir', async () => {
    const dir = carpeta();
    await fallaSinEscribir(dir, opciones(dir, {
      descargar: (async () => { throw new TypeError(`fetch failed ${URL_SECRETA}`); }) as typeof fetch,
    }), /no se ha podido conectar/);
  });
  it('ninguna asignatura con codigo → error', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': 'asignaturas:\n  - id: fisica\n    nombre: Física\n    color: "#3d7bb8"\n' });
    await fallaSinEscribir(dir, opciones(dir), /codigo/);
  });
  it('tareas.yaml mal escrito → error sin escribir', async () => {
    const dir = carpeta({ 'agenda/tareas.yaml': '- id: t-1\n  titulo: X\n' });
    await fallaSinEscribir(dir, opciones(dir), /area/);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run sincronizar`
Expected: FAIL (no existe `./uni.ts`).

- [ ] **Step 3: Implementar**

`tsconfig.json`: `"include": ["src", "local", "sincronizar", "vite.config.ts"]`.

`sincronizar/uni.ts`:

```ts
// Sincronización de la uni: exámenes oficiales de la URJC y calendario del aula virtual → agenda/tareas.yaml.
// La ejecuta cada 3 horas el workflow de my-context (.github/workflows/uni.yml). Node sin compilar: imports con .ts.
// La URL del calendario es una llave: nunca se escribe en la consola ni en los errores.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseAsignaturas } from '../src/datos/asignaturas.ts';
import { RUTA_ASIGNATURAS, RUTA_TAREAS, RUTA_UNI_SINCRONIZACION } from '../src/datos/rutas.ts';
import { parseTareas, serializarTareas } from '../src/datos/tareas.ts';
import { leerExamenes, propuestasDeExamenes } from '../src/uni/examenes.ts';
import { fusionar } from '../src/uni/fusionar.ts';
import { hoyEnMadrid } from '../src/uni/hora.ts';
import { leerIcs, type ResultadoIcs } from '../src/uni/ics.ts';
import { propuestasDeMoodle } from '../src/uni/moodle.ts';
import { ErrorFormato, porCodigo } from '../src/uni/tipos.ts';
import { parseVistos, serializarVistos } from '../src/uni/vistos.ts';

const URL_EXAMENES = 'https://servicios.urjc.es/examenes/informacion';
const TITULACION = '2327'; // Grado en Ingeniería de Robótica Software (Fuenlabrada)
const ESPERA_MAXIMA = 30_000;

export interface Opciones {
  carpeta: string; // la carpeta de my-context
  urlCalendario: string;
  ahora: Date;
  prueba: boolean; // true: calcula y resume, pero no guarda
  descargar: typeof fetch;
}

export interface Resumen {
  creadas: number;
  actualizadas: number;
  saltados: number;
  escrito: boolean;
}

export async function sincronizarUni(o: Opciones): Promise<Resumen> {
  const [textoTareas, textoAsignaturas, textoVistos] = await Promise.all(
    [RUTA_TAREAS, RUTA_ASIGNATURAS, RUTA_UNI_SINCRONIZACION].map((ruta) => leerSiExiste(path.join(o.carpeta, ruta))),
  );
  const tareas = textoTareas === null ? [] : parseTareas(textoTareas);
  const asignaturas = porCodigo(textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas));
  if (asignaturas.size === 0) throw new Error(`ninguna asignatura de ${RUTA_ASIGNATURAS} tiene codigo: no hay nada que sincronizar`);
  const vistos = parseVistos(textoVistos);

  const [calendario, examenes] = await Promise.all([descargarCalendario(o), descargarExamenes(o)]);
  const hoy = hoyEnMadrid(o.ahora);
  const propuestas = [
    ...propuestasDeExamenes(examenes, asignaturas, hoy),
    ...propuestasDeMoodle(calendario.eventos, asignaturas, hoy),
  ];
  const r = fusionar(tareas, vistos, propuestas, hoy);

  const tareasNuevas = serializarTareas(r.tareas);
  const vistosNuevos = serializarVistos(r.vistos);
  const cambianTareas = tareasNuevas !== serializarTareas(tareas);
  const cambianVistos = vistosNuevos !== serializarVistos(vistos);
  if (!o.prueba) {
    if (cambianTareas) await writeFile(path.join(o.carpeta, RUTA_TAREAS), tareasNuevas);
    if (cambianVistos) await writeFile(path.join(o.carpeta, RUTA_UNI_SINCRONIZACION), vistosNuevos);
  }
  return {
    creadas: r.creadas,
    actualizadas: r.actualizadas,
    saltados: calendario.saltados,
    escrito: !o.prueba && (cambianTareas || cambianVistos),
  };
}

export function textoResumen(r: Resumen): string {
  return `Uni: ${r.creadas} nuevas, ${r.actualizadas} actualizadas`;
}

async function leerSiExiste(ruta: string): Promise<string | null> {
  try {
    return await readFile(ruta, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

// Los errores de red de fetch pueden llevar la URL dentro: se sustituyen por un mensaje sin ella.
async function pedir(o: Opciones, que: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await o.descargar(url, { ...init, signal: AbortSignal.timeout(ESPERA_MAXIMA) });
  } catch {
    throw new Error(`no se ha podido conectar con ${que} (sin internet, web caída o tarda demasiado)`);
  }
}

async function descargarCalendario(o: Opciones): Promise<ResultadoIcs> {
  const res = await pedir(o, 'el aula virtual', o.urlCalendario);
  if (!res.ok) throw new Error(`el aula virtual contestó ${res.status} al pedir el calendario (¿ha caducado el enlace?)`);
  return leerIcs(await res.text());
}

async function descargarExamenes(o: Opciones) {
  const res = await pedir(o, 'la web de exámenes de la URJC', URL_EXAMENES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: `titulacion=${TITULACION}&convocatoria=T`,
  });
  if (!res.ok) throw new Error(`la web de exámenes de la URJC contestó ${res.status}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ErrorFormato('la web de exámenes de la URJC no ha devuelto datos (¿está en mantenimiento?)');
  }
  return leerExamenes(json);
}

async function principal(): Promise<void> {
  const args = process.argv.slice(2);
  const carpeta = args.find((a) => !a.startsWith('--'));
  const urlCalendario = process.env.URJC_CALENDARIO?.trim();
  if (!carpeta || !urlCalendario) {
    console.error('Uso: URJC_CALENDARIO=<enlace del calendario> node sincronizar/uni.ts <carpeta de my-context> [--prueba]');
    process.exit(2);
  }
  try {
    const prueba = args.includes('--prueba');
    const r = await sincronizarUni({ carpeta, urlCalendario, ahora: new Date(), prueba, descargar: fetch });
    if (r.saltados) console.error(`Aviso: se han saltado ${r.saltados} eventos del calendario sin UID o sin fecha.`);
    if (prueba) console.error('Modo prueba: no se ha guardado nada.');
    console.log(textoResumen(r));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) await principal();
```

Nota: la prueba «tareas.yaml mal escrito» espera un mensaje con «area» (el de `parseTareas`: «el campo area es obligatorio»). La de «sin red» espera «no se ha podido conectar».

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde y compilación sin errores.

- [ ] **Step 5: Probar el programa de verdad, sin guardar**

Solo lectura, contra las webs reales, con la URL leída del archivo de Diego (nunca impresa):

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
export PATH="$PATH:/c/Program Files/nodejs"
URJC_CALENDARIO="$(tr -d '\r\n\357\273\277' < /c/Users/Diego/.segundo-cerebro/urjc-calendario.txt)" node sincronizar/uni.ts ../my-context --prueba
```

Expected: con el `asignaturas.yaml` actual (sin `codigo`) sale `Error: ninguna asignatura de estudios/asignaturas.yaml tiene codigo…` y código 1. Es lo correcto: los códigos se añaden en la Tarea 9. Comprueba también que la salida no contiene `authtoken`.

- [ ] **Step 6: Commit**

```bash
git add sincronizar tsconfig.json
git commit -m "Uni: programa de sincronización (descargar, fusionar y guardar solo si cambia)"
```

---

### Task 9: Puesta en marcha (con Diego, la hace el controlador)

**Files:**
- Modify (app): `docs/diseno.md` (sección 3: `origen`, `codigo`, `uni-sincronizacion.yaml`), `AGENTS.md` (Estructura del código y Estado actual)
- Modify (`my-context`): `estudios/asignaturas.yaml`, `agenda/areas.yaml`, `AGENTS.md`
- Create (`my-context`): `.github/workflows/uni.yml`
- Delete (`my-context`): `.github/workflows/uni-prueba.yml`

- [ ] **Step 1: Documentación de la app**

`docs/diseno.md`, sección 3:
- En la tabla de `agenda/tareas.yaml`, añade la fila: `| \`origen\` | no | de dónde viene una tarea importada: \`urjc-examen:…\` o \`moodle:<UID>\`. Lo escribe la sincronización de la uni; la app lo conserva y no lo enseña |`
- En «Estudio: `estudios/asignaturas.yaml`», añade: `codigo` opcional, el código de 7 cifras de la asignatura en la URJC entre comillas (`"2327007"`); solo las asignaturas con `codigo` se sincronizan.
- Nueva subsección «Uni: `estudios/uni-sincronizacion.yaml`» con el ejemplo y las reglas de la sección 3 y 4 del spec (resumidas en 4 líneas) y un enlace al spec.

`AGENTS.md` de la app, «Estructura del código»: añade
`- \`src/uni/\` y \`sincronizar/uni.ts\`: sincronización de la uni (exámenes de la URJC y calendario del aula virtual → \`tareas.yaml\`). Node sin compilar: imports con \`.ts\`. La ejecuta el workflow \`my-context/.github/workflows/uni.yml\` cada 3 horas. Prueba local sin guardar: \`URJC_CALENDARIO="$(cat ~/.segundo-cerebro/urjc-calendario.txt)" node sincronizar/uni.ts ../my-context --prueba\`.`

```bash
git add docs/diseno.md AGENTS.md
git commit -m "Uni: documentación del formato y de la sincronización"
```

- [ ] **Step 2: Revisión final y publicar la app (avisando a Diego)**

Antes: revisión de toda la rama con un revisor nuevo (`superpowers:requesting-code-review`), arreglos y `npm test && npm run build` en verde.
Explícale a Diego que hay que subir la app antes de encender el workflow, porque el robot de GitHub usa el código publicado. Con su visto bueno:

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout main
git merge --no-ff uni-calendario -m "Uni: calendario automático (parte A)"
export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build
git push
```

Pídele a Diego que abra la app una vez en cada dispositivo (PC, portátil, iPhone, iPad) para que se actualice. Así ninguna versión antigua borra el `codigo` de las asignaturas al guardarlas.

- [ ] **Step 3: Asignaturas y subáreas en `my-context`**

```bash
cd /c/Users/Diego/Desktop/my-context && git pull -q
```

`estudios/asignaturas.yaml` (conserva Cálculo y Álgebra con sus colores y añade el `codigo`; si Diego ha cambiado algo desde el 2026-09-30, respétalo):

```yaml
asignaturas:
  - id: calculo
    nombre: Cálculo
    color: "#36ace7"
    codigo: "2327007"
  - id: algebra
    nombre: Álgebra
    color: "#db5629"
    codigo: "2327002"
  - id: fundamentos-programacion
    nombre: Fundamentos de la Programación
    color: "#2f9e6e"
    codigo: "2327004"
  - id: emprendimiento
    nombre: Emprendimiento e Innovación en Robótica
    color: "#e0a526"
    codigo: "2327003"
  - id: electronica-digital
    nombre: Electrónica Digital
    color: "#d9782b"
    codigo: "2327008"
  - id: arquitectura-computadores
    nombre: Arquitectura de Computadores
    color: "#7c5cd6"
    codigo: "2327001"
  - id: evolucion-robotica
    nombre: Evolución y Futuro de la Robótica
    color: "#8a9a2b"
    codigo: "2327009"
  - id: laboratorio-sistemas
    nombre: Laboratorio de Sistemas
    color: "#5a8f99"
    codigo: "2327010"
  - id: fundamentos-fisicos
    nombre: Fundamentos Físicos de la Robótica
    color: "#c2477a"
    codigo: "2327005"
  - id: algoritmos
    nombre: Algoritmos y Estructuras de Datos
    color: "#3a6fd8"
    codigo: "2327006"
```

`agenda/areas.yaml`: al área `uni` (conserva su `nombre` y `color`) añade `subareas` con los mismos 10 `id`, `nombre` y `color` (sin `codigo`). Comprueba que ningún id choca con otro área o subárea del archivo.

Prueba sin guardar contra las webs reales:

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
export PATH="$PATH:/c/Program Files/nodejs"
URJC_CALENDARIO="$(tr -d '\r\n\357\273\277' < /c/Users/Diego/.segundo-cerebro/urjc-calendario.txt)" node sincronizar/uni.ts ../my-context --prueba
```

Expected: `Uni: N nuevas, 0 actualizadas` con N ≈ 11 exámenes de 1º desde hoy + las entregas de las asignaturas (la del curso `RAC_EMP_FUENLABRADA` no cuenta). Si el número no cuadra, investiga antes de seguir.

- [ ] **Step 4: Instrucciones en `my-context/AGENTS.md`**

En la sección «Agenda», añade:
- `- Uni: cada 3 horas, el workflow \`.github/workflows/uni.yml\` mete en \`tareas.yaml\` los exámenes oficiales de la URJC y las entregas y eventos del aula virtual de las asignaturas con \`codigo\` en \`estudios/asignaturas.yaml\`. Esas tareas llevan \`origen\`: no lo quites ni lo cambies. \`estudios/uni-sincronizacion.yaml\` lo escribe solo el workflow: no lo toques.`
- `- Al empezar 2º curso (septiembre de 2027), recuérdale a Diego añadir sus asignaturas nuevas con su \`codigo\` (el \`COD_ASIGNATURA\` de https://servicios.urjc.es/examenes/consulta-grado, titulación 2327) y como subáreas de \`uni\`.`
- `- Si el workflow falla (GitHub avisa a Diego por correo) porque el enlace del calendario ha caducado: Diego saca uno nuevo en el aula virtual (Calendario → Exportar → Obtener URL) y lo cambia en GitHub → my-context → Settings → Secrets → \`URJC_CALENDARIO\`. Nunca en el chat.`

- [ ] **Step 5: El workflow de verdad**

Borra `.github/workflows/uni-prueba.yml` y crea `.github/workflows/uni.yml`:

```yaml
name: Uni (calendario de la URJC)
on:
  schedule:
    - cron: '17 */3 * * *'
  workflow_dispatch:
concurrency:
  group: uni
  cancel-in-progress: false
permissions:
  contents: write
jobs:
  sincronizar:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          path: datos
      - uses: actions/checkout@v4
        with:
          repository: Dino768/segundo-cerebro-app
          path: app
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: app/package-lock.json
      - name: Instalar (solo lo necesario)
        working-directory: app
        run: npm ci --omit=dev --ignore-scripts --no-audit --no-fund
      - name: Sincronizar y subir
        working-directory: datos
        env:
          URJC_CALENDARIO: ${{ secrets.URJC_CALENDARIO }}
        run: |
          git config user.name "Sincronización uni"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          for intento in 1 2 3; do
            node ../app/sincronizar/uni.ts . > "$RUNNER_TEMP/resumen.txt"
            cat "$RUNNER_TEMP/resumen.txt"
            if [ -z "$(git status --porcelain)" ]; then echo "Sin novedades"; exit 0; fi
            git add -A
            git commit -q -m "$(tail -n 1 "$RUNNER_TEMP/resumen.txt")"
            if git push -q; then exit 0; fi
            echo "Alguien ha subido cambios a la vez: reintento con lo nuevo"
            git reset -q --hard HEAD~1
            git pull -q --ff-only
          done
          echo "No se ha podido subir tras 3 intentos"
          exit 1
```

- [ ] **Step 6: Subir `my-context` (avisando a Diego) y primera sincronización**

```bash
cd /c/Users/Diego/Desktop/my-context
git add -A
git commit -m "Uni: asignaturas con código, subáreas y sincronización automática"
git push
gh workflow run uni.yml -R Dino768/my-context
sleep 5
ID=$(gh run list -R Dino768/my-context --workflow uni.yml -L 1 --json databaseId -q '.[0].databaseId')
gh run watch -R Dino768/my-context "$ID" --exit-status
gh run view -R Dino768/my-context --log "$ID" | grep -E "Uni:|Sin novedades|Error|Aviso"
git pull -q
git log --oneline -3
```

Expected: el run termina bien, el log muestra `Uni: N nuevas, 0 actualizadas` (el mismo N que el Step 3) y aparece un commit con ese mensaje. Lánzalo otra vez: debe decir `Sin novedades` y no hacer commit.

- [ ] **Step 7: Registro**

Apunta en el registro `Task 9: publicada la app, asignaturas con codigo, workflow encendido (primer run: N nuevas; segundo: sin novedades)` y cualquier `Ruling:`.

---

### Task 10: Revisión de Diego y cierre (con Diego, la hace el controlador)

- [ ] **Step 1: Diego lo mira en la app**

Pídele que abra el Calendario y la lista de Tareas en el PC y en el iPhone y compruebe: exámenes de enero con hora y aula en las notas, la entrega de la Práctica 1 el 5 de octubre a las 23:59, colores de las asignaturas y filtro por subárea de Uni. Pregúntale si le gustan los títulos («Examen: …», «Entrega: …») y los colores. Si quiere cambiar el formato de los títulos, cámbialo en `src/uni/examenes.ts` o `src/uni/moodle.ts` con su prueba primero, publica (avisando) y corrige a mano los títulos ya creados en `tareas.yaml` (la sincronización no toca títulos existentes). Los colores se cambian desde la app.

- [ ] **Step 2: Borrar el archivo con el enlace**

Si no se usa el plan B:

```bash
rm /c/Users/Diego/.segundo-cerebro/urjc-calendario.txt
rmdir /c/Users/Diego/.segundo-cerebro 2>/dev/null || true
```

Explícale a Diego que el enlace ya solo está en la caja fuerte de GitHub.

- [ ] **Step 3: Estado y «Dónde lo dejamos»**

- `AGENTS.md` de la app, «Estado actual»: línea nueva con la parte A publicada (fecha, qué hace, spec, plan, registro) y **Siguiente:** diseño de la parte C (contenidos del aula virtual).
- `my-context/proyectos/segundo-cerebro.md`: **sustituye** el párrafo de «Dónde lo dejamos» por el punto actual (fecha, uni conectada: exámenes y entregas solos cada 3 horas; siguiente: parte C).
- `my-context/agenda/tareas.yaml`: marca `hecha: true` en la tarea «Implementar acceso a la web de URJC en la app» solo si Diego está de acuerdo (la parte C sigue pendiente; puede preferir dejarla abierta).
- Commit y push de los dos repositorios, avisando a Diego.
