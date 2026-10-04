# Horario de clases y avisos que caducan: plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El horario de clases de la URJC llega solo a la app (cuadrícula, «Ahora / Siguiente», calendario oculto por defecto, cambios a mano) y los avisos se pueden desleer y caducan a los 30 días de leerlos.

**Architecture:** El workflow de la uni (`sincronizar/uni.ts`) descarga la página pública de horarios, `src/uni/horario.ts` la convierte en clases y se guardan en `estudios/horario.yaml`. Diego (o la app, o Claude) escribe `estudios/horario-ajustes.yaml` (grupo, desdoble, clases quitadas y sueltas). La app lee los dos con un hook propio (`useHorario`), y la lógica sin pantalla (`src/agenda/horario.ts`) junta clases y ajustes por día. Los avisos ganan `leidoEl`.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (`renderToString` para pantallas), `yaml`, Node 24 sin compilar (imports con `.ts`) para `sincronizar/` y `local/`.

**Spec:** `docs/superpowers/specs/2026-10-04-horario-clases-design.md`

## Global Constraints

- Todo en español: textos, nombres de funciones y variables, mensajes de commit.
- Archivos que usa Node sin compilar (`src/datos/*`, `src/uni/*`, `src/fechas.ts`, `sincronizar/`, `local/`): imports con `.ts`.
- Antes de cada comando de Node en la terminal Bash: `export PATH="$PATH:/c/Program Files/nodejs";`.
- Pruebas: `npm test` (todas) o `npx vitest run <archivo>`; tipos: `npm run build`.
- Sin comentarios `#` en los YAML de datos. Sin datos personales ni tokens en este repositorio.
- Desdoble de Diego: `G2`. Grupo: `G_ROBOT_1A(F)`, curso `1`. Titulación `2327`.
- Avisos: caducan a los **30** días de `leidoEl` (a los 30 se ven, a los 31 no).
- La pastilla «🎓 Clases» del calendario empieza **apagada**.
- `VERSION_PROGRAMA` no cambia.
- No hacer `git push` en ninguno de los dos repositorios sin que Diego lo sepa.
- Cada tarea termina con una línea en `.superpowers/sdd/2026-10-04-horario-clases/progress.md` (crear la carpeta en la Tarea 1). Las decisiones que se aparten del plan van como `Ruling:`.

## Review Focus

1. La web de la URJC devuelve el horario vacío (entre cuatrimestres o en mantenimiento) → no se borra el `horario.yaml` que había; cuenta como fallo del horario (Tarea 3).
2. Justo a la hora en que acaba una clase (11:00) → «Ahora» es la clase que empieza a las 11:00, no la que acaba (Tarea 5).
3. Viernes después de la última clase o víspera de festivo → no sale nada en el Inicio (mañana no hay clase) (Tarea 5).
4. Una clase con una asignatura que ya no está en `asignaturas.yaml` → se ve con su id y color gris, sin romper (Tarea 7).
5. Un aviso sin leer que trae un `leidoEl` viejo (lo dejó otra versión) → nunca se oculta ni se borra (Tarea 4).

---

### Task 1: Formato de `horario.yaml` y `horario-ajustes.yaml`

**Files:**
- Modify: `src/datos/rutas.ts`
- Create: `src/datos/horario.ts`
- Test: `src/datos/horario.test.ts`

**Interfaces:**
- Produces:
  - `RUTA_HORARIO = 'estudios/horario.yaml'`, `RUTA_HORARIO_AJUSTES = 'estudios/horario-ajustes.yaml'`
  - `interface Clase { fecha: ISODate; inicio: string; fin: string; asignatura: string; aula?: string; profesor?: string; desdoble?: string }`
  - `interface Quitada { fecha: ISODate; inicio: string; asignatura: string }`
  - `interface Suelta { fecha: ISODate; inicio: string; fin: string; asignatura: string; aula?: string; nota?: string }`
  - `interface AjustesHorario { grupo?: string; curso?: number; desdoble?: string; quitadas: Quitada[]; sueltas: Suelta[] }`
  - `AJUSTES_VACIOS: AjustesHorario`
  - `parseHorario(texto: string | null): Clase[]`, `serializarHorario(clases: Clase[]): string`
  - `parseAjustesHorario(texto: string | null): AjustesHorario`, `serializarAjustesHorario(a: AjustesHorario): string`

- [ ] **Step 1: Crear el registro**

Crear `.superpowers/sdd/2026-10-04-horario-clases/progress.md` con:

```markdown
# Registro: horario de clases y avisos que caducan
Plan: docs/superpowers/plans/2026-10-04-horario-clases.md
```

- [ ] **Step 2: Escribir la prueba (que falle)**

`src/datos/horario.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AJUSTES_VACIOS, parseAjustesHorario, parseHorario, serializarAjustesHorario, serializarHorario, type AjustesHorario, type Clase } from './horario.ts';

const c1: Clase = { fecha: '2026-09-16', inicio: '09:00', fin: '11:00', asignatura: 'algebra', aula: 'Aula 3S2 · Aulario III', profesor: 'David Gonzalez de la Aleja Gallego' };
const c2: Clase = { fecha: '2026-09-23', inicio: '11:00', fin: '13:00', asignatura: 'algebra', desdoble: 'G2' };

describe('horario.yaml', () => {
  it('ida y vuelta', () => {
    expect(parseHorario(serializarHorario([c1, c2]))).toEqual([c1, c2]);
    expect(parseHorario(null)).toEqual([]);
    expect(parseHorario('')).toEqual([]);
  });
  it('acepta horas sin comillas', () => {
    expect(parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: 09:00\n    fin: 11:00\n    asignatura: algebra\n')[0].inicio).toBe('09:00');
  });
  it('errores claros', () => {
    expect(() => parseHorario('clases: 3')).toThrow(/lista/);
    expect(() => parseHorario('clases:\n  - fecha: ayer\n    inicio: "09:00"\n    fin: "11:00"\n    asignatura: a\n')).toThrow(/clase 1.*fecha/);
    expect(() => parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: "9h"\n    fin: "11:00"\n    asignatura: a\n')).toThrow(/clase 1.*inicio/);
    expect(() => parseHorario('clases:\n  - fecha: 2026-09-16\n    inicio: "09:00"\n    fin: "11:00"\n')).toThrow(/clase 1.*asignatura/);
  });
});

describe('horario-ajustes.yaml', () => {
  const a: AjustesHorario = {
    grupo: 'G_ROBOT_1A(F)', curso: 1, desdoble: 'G2',
    quitadas: [{ fecha: '2026-09-24', inicio: '09:00', asignatura: 'electronica-digital' }],
    sueltas: [{ fecha: '2026-10-15', inicio: '11:00', fin: '13:00', asignatura: 'electronica-digital', aula: 'Aula 3S2', nota: 'Recuperación' }],
  };
  it('ida y vuelta', () => {
    expect(parseAjustesHorario(serializarAjustesHorario(a))).toEqual(a);
    expect(parseAjustesHorario(null)).toEqual(AJUSTES_VACIOS);
    expect(parseAjustesHorario('grupo: "X"\n')).toEqual({ grupo: 'X', quitadas: [], sueltas: [] });
  });
  it('errores claros', () => {
    expect(() => parseAjustesHorario('desdoble: grupo2\n')).toThrow(/desdoble/);
    expect(() => parseAjustesHorario('curso: primero\n')).toThrow(/curso/);
    expect(() => parseAjustesHorario('quitadas:\n  - fecha: 2026-09-24\n    asignatura: x\n')).toThrow(/quitada 1.*inicio/);
    expect(() => parseAjustesHorario('sueltas:\n  - fecha: 2026-09-24\n    inicio: "11:00"\n    asignatura: x\n')).toThrow(/suelta 1.*fin/);
  });
});
```

- [ ] **Step 3: Comprobar que falla**

Run: `npx vitest run src/datos/horario.test.ts`
Expected: FAIL (no existe `./horario.ts`).

- [ ] **Step 4: Escribir el código**

Añadir a `src/datos/rutas.ts`:

```ts
export const RUTA_HORARIO = 'estudios/horario.yaml';
export const RUTA_HORARIO_AJUSTES = 'estudios/horario-ajustes.yaml';
```

`src/datos/horario.ts`:

```ts
import { stringify } from 'yaml';
import { isHora, isISODate, type ISODate } from '../fechas.ts';
import { RUTA_HORARIO, RUTA_HORARIO_AJUSTES } from './rutas.ts';
import { ErrorDatos, leerYaml } from './yaml.ts';

// Una clase del horario de la URJC (estudios/horario.yaml, lo escribe solo el workflow de la uni).
export interface Clase {
  fecha: ISODate;
  inicio: string; // HH:MM
  fin: string;
  asignatura: string; // id de estudios/asignaturas.yaml
  aula?: string;
  profesor?: string;
  desdoble?: string; // G1, G2… (las clases de un desdoble)
}

// Cambios a mano (estudios/horario-ajustes.yaml): una clase que no hay y clases añadidas.
export interface Quitada {
  fecha: ISODate;
  inicio: string;
  asignatura: string;
}

export interface Suelta {
  fecha: ISODate;
  inicio: string;
  fin: string;
  asignatura: string;
  aula?: string;
  nota?: string;
}

export interface AjustesHorario {
  grupo?: string; // agrupación de la URJC, p. ej. G_ROBOT_1A(F)
  curso?: number;
  desdoble?: string; // de los grupos G1/G2… solo se queda este
  quitadas: Quitada[];
  sueltas: Suelta[];
}

export const AJUSTES_VACIOS: AjustesHorario = { quitadas: [], sueltas: [] };

type Objeto = Record<string, unknown>;

function raiz(texto: string | null, ruta: string): Objeto {
  if (texto === null) return {};
  const datos = leerYaml(texto, ruta);
  if (datos === null || datos === undefined) return {};
  if (typeof datos !== 'object' || Array.isArray(datos)) throw new ErrorDatos(ruta, 'el archivo tiene un formato desconocido');
  return datos as Objeto;
}

function lista(datos: Objeto, clave: string, ruta: string): Objeto[] {
  const l = datos[clave];
  if (l === undefined || l === null) return [];
  if (!Array.isArray(l)) throw new ErrorDatos(ruta, `${clave} debe ser una lista`);
  return l.map((x) => (typeof x === 'object' && x !== null ? x : {}) as Objeto);
}

function texto(o: Objeto, campo: string, ruta: string, donde: string): string | undefined {
  const v = o[campo];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ErrorDatos(ruta, `${donde}: ${campo} debe ser texto`);
  return v;
}

function comun(o: Objeto, ruta: string, donde: string, conFin: boolean): { fecha: ISODate; inicio: string; fin: string; asignatura: string } {
  if (!isISODate(o.fecha)) throw new ErrorDatos(ruta, `${donde}: fecha debe tener el formato AAAA-MM-DD`);
  if (!isHora(o.inicio)) throw new ErrorDatos(ruta, `${donde}: inicio debe ser una hora HH:MM, como "09:00"`);
  if (conFin && !isHora(o.fin)) throw new ErrorDatos(ruta, `${donde}: fin debe ser una hora HH:MM, como "11:00"`);
  if (typeof o.asignatura !== 'string' || !o.asignatura) throw new ErrorDatos(ruta, `${donde}: falta asignatura`);
  return { fecha: o.fecha, inicio: o.inicio, fin: conFin ? (o.fin as string) : '', asignatura: o.asignatura };
}

const opcional = <T>(clave: string, v: T | undefined) => (v === undefined ? {} : { [clave]: v });

export function parseHorario(t: string | null): Clase[] {
  return lista(raiz(t, RUTA_HORARIO), 'clases', RUTA_HORARIO).map((o, i) => {
    const donde = `clase ${i + 1}`;
    return {
      ...comun(o, RUTA_HORARIO, donde, true),
      ...opcional('aula', texto(o, 'aula', RUTA_HORARIO, donde)),
      ...opcional('profesor', texto(o, 'profesor', RUTA_HORARIO, donde)),
      ...opcional('desdoble', texto(o, 'desdoble', RUTA_HORARIO, donde)),
    };
  });
}

export function serializarHorario(clases: Clase[]): string {
  return stringify({ clases }, { lineWidth: 0 });
}

export function parseAjustesHorario(t: string | null): AjustesHorario {
  const r = RUTA_HORARIO_AJUSTES;
  const datos = raiz(t, r);
  const grupo = texto(datos, 'grupo', r, 'ajustes');
  const desdoble = texto(datos, 'desdoble', r, 'ajustes');
  if (desdoble !== undefined && !/^G\d+$/.test(desdoble)) throw new ErrorDatos(r, 'desdoble debe ser como "G2"');
  const curso = datos.curso;
  if (curso !== undefined && curso !== null && (typeof curso !== 'number' || !Number.isInteger(curso) || curso < 1))
    throw new ErrorDatos(r, 'curso debe ser un número, como 1');
  const quitadas = lista(datos, 'quitadas', r).map((o, i) => {
    const { fecha, inicio, asignatura } = comun(o, r, `quitada ${i + 1}`, false);
    return { fecha, inicio, asignatura };
  });
  const sueltas = lista(datos, 'sueltas', r).map((o, i) => {
    const donde = `suelta ${i + 1}`;
    return { ...comun(o, r, donde, true), ...opcional('aula', texto(o, 'aula', r, donde)), ...opcional('nota', texto(o, 'nota', r, donde)) };
  });
  return {
    ...opcional('grupo', grupo),
    ...(typeof curso === 'number' ? { curso } : {}),
    ...opcional('desdoble', desdoble),
    quitadas,
    sueltas,
  };
}

export function serializarAjustesHorario(a: AjustesHorario): string {
  return stringify({
    ...opcional('grupo', a.grupo),
    ...opcional('curso', a.curso),
    ...opcional('desdoble', a.desdoble),
    ...(a.quitadas.length ? { quitadas: a.quitadas } : {}),
    ...(a.sueltas.length ? { sueltas: a.sueltas } : {}),
  }, { lineWidth: 0 });
}
```

- [ ] **Step 5: Comprobar que pasa**

Run: `npx vitest run src/datos/horario.test.ts`
Expected: PASS. Si `serializarAjustesHorario` de un objeto vacío da `{}\n` y la ida y vuelta falla, `parseAjustesHorario('{}\n')` ya devuelve `AJUSTES_VACIOS` (raíz objeto vacío): no hace falta cambiar nada.

- [ ] **Step 6: Commit**

```bash
git add src/datos/rutas.ts src/datos/horario.ts src/datos/horario.test.ts
git commit -m "Horario: formato de horario.yaml y horario-ajustes.yaml"
```

Añadir al registro: `Task 1: formatos del horario hechos (commit <sha>).`

---

### Task 2: Leer el horario de la web de la URJC

**Files:**
- Create: `src/uni/horario.ts`
- Create: `src/uni/pruebas/horario-urjc.html`
- Test: `src/uni/horario.test.ts`

**Interfaces:**
- Consumes: `Clase` (Task 1), `Asignatura` (`src/datos/asignaturas.ts`), `ErrorFormato` (`src/uni/tipos.ts`).
- Produces:
  - `interface GrupoUrjc { ASIGNATURA_CODIGO: string; GRUPO: string; PROFESORADO?: { NOMBRE?: string; APELLIDO1?: string | null; APELLIDO2?: string | null }[]; CLASES: { TIMESTAMP_INICIO: string; TIMESTAMP_FIN: string; AULAS?: { AULA?: string; EDIFICIO?: string }[] }[] }`
  - `leerPaginaHorario(html: string): GrupoUrjc[]` (lanza `ErrorFormato`)
  - `clasesDeUrjc(grupos: GrupoUrjc[], asignaturas: Map<string, Asignatura>, desdoble?: string): Clase[]`
  - `nombrePropio(s: string): string`

- [ ] **Step 1: Guardar la copia real recortada**

Crear `src/uni/pruebas/horario-urjc.html` con este contenido exacto (recorte de la respuesta real del 2026-10-04: Álgebra normal con 2 clases, Álgebra G1 y G2, Electrónica `G UNICO P4` con 4 profesores y una asignatura `2327099` que no está en la lista):

```html
<html><body><div id="calendar"></div>
<script>
        const infoHorario = {"GRUPOS":{"100":{"PLAN_CODIGO":"2327","ASIGNATURA_CODIGO":"2327002","ASIGNATURA_NOMBRE":"ALGEBRA","GRUPO":"MAÑANA A","CURSO":"1","SEMESTRE":"1Q","ES_GRUPO_PRACTICO":"N","PROFESORADO":[{"NOMBRE":"DAVID","APELLIDO1":"GONZALEZ DE LA ALEJA","APELLIDO2":"GALLEGO","ID_USULDAP":"david.aleja"}],"CLASES":[{"TIMESTAMP_INICIO":"2026-09-16T09:00:00","TIMESTAMP_FIN":"2026-09-16T11:00:00","AULAS":[{"AULA":"Aula 3S2","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false},{"TIMESTAMP_INICIO":"2026-09-21T09:00:00","TIMESTAMP_FIN":"2026-09-21T11:00:00","AULAS":[{"AULA":"Aula 3S2","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false}],"COLOR":"E68281"},"101":{"PLAN_CODIGO":"2327","ASIGNATURA_CODIGO":"2327002","ASIGNATURA_NOMBRE":"ALGEBRA","GRUPO":"MAÑANA A G1 P2","CURSO":"1","SEMESTRE":"1Q","ES_GRUPO_PRACTICO":"N","PROFESORADO":[{"NOMBRE":"DAVID","APELLIDO1":"GONZALEZ DE LA ALEJA","APELLIDO2":"GALLEGO","ID_USULDAP":"david.aleja"}],"CLASES":[{"TIMESTAMP_INICIO":"2026-09-23T09:00:00","TIMESTAMP_FIN":"2026-09-23T11:00:00","AULAS":[{"AULA":"Aula 3S2","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false}],"COLOR":"D0DAF3"},"102":{"PLAN_CODIGO":"2327","ASIGNATURA_CODIGO":"2327002","ASIGNATURA_NOMBRE":"ALGEBRA","GRUPO":"MAÑANA A G2 P2","CURSO":"1","SEMESTRE":"1Q","ES_GRUPO_PRACTICO":"N","PROFESORADO":[{"NOMBRE":"DAVID","APELLIDO1":"GONZALEZ DE LA ALEJA","APELLIDO2":"GALLEGO","ID_USULDAP":"david.aleja"}],"CLASES":[{"TIMESTAMP_INICIO":"2026-09-23T11:00:00","TIMESTAMP_FIN":"2026-09-23T13:00:00","AULAS":[{"AULA":"Aula 3S4","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false}],"COLOR":"FBECEC"},"103":{"PLAN_CODIGO":"2327","ASIGNATURA_CODIGO":"2327008","ASIGNATURA_NOMBRE":"ELECTRONICA DIGITAL","GRUPO":"MAÑANA A G UNICO P4","CURSO":"1","SEMESTRE":"1Q","ES_GRUPO_PRACTICO":"N","PROFESORADO":[{"NOMBRE":"ANTONIO ROSARIO","APELLIDO1":"CONSOLI","APELLIDO2":"BARONE","ID_USULDAP":"antonio.consoli"},{"NOMBRE":"ANGEL LUIS","APELLIDO1":"ALVAREZ","APELLIDO2":"CASTILLO","ID_USULDAP":"angelluis.alvarez"},{"NOMBRE":"MARIA","APELLIDO1":"VILA","APELLIDO2":"SANTOS","ID_USULDAP":"maria.vila"},{"NOMBRE":"JAVIER","APELLIDO1":"BARTOLOME","APELLIDO2":"VILCHEZ","ID_USULDAP":"javier.bartolome"}],"CLASES":[{"TIMESTAMP_INICIO":"2026-12-03T10:00:00","TIMESTAMP_FIN":"2026-12-03T11:00:00","AULAS":[{"AULA":"Aula 3S2","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false}],"COLOR":"D8F79A"},"104":{"PLAN_CODIGO":"2327","ASIGNATURA_CODIGO":"2327099","ASIGNATURA_NOMBRE":"OTRA","GRUPO":"MAÑANA A","CURSO":"1","SEMESTRE":"1Q","ES_GRUPO_PRACTICO":"N","PROFESORADO":[{"NOMBRE":"DAVID","APELLIDO1":"GONZALEZ DE LA ALEJA","APELLIDO2":"GALLEGO","ID_USULDAP":"david.aleja"}],"CLASES":[{"TIMESTAMP_INICIO":"2026-09-16T09:00:00","TIMESTAMP_FIN":"2026-09-16T11:00:00","AULAS":[{"AULA":"Aula 3S2","EDIFICIO":"Aulario III"}],"ACTIVIDAD_EVALUABLE":false}],"COLOR":"E68281"}},"FESTIVOS":["2026-11-02"]};
        const otraCosa = 1;
</script></body></html>
```

- [ ] **Step 2: Escribir la prueba (que falle)**

`src/uni/horario.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Asignatura } from '../datos/asignaturas.ts';
import { clasesDeUrjc, leerPaginaHorario, nombrePropio } from './horario.ts';

const PAGINA = readFileSync(path.join(import.meta.dirname, 'pruebas/horario-urjc.html'), 'utf8');
const asignaturas = new Map<string, Asignatura>([
  ['2327002', { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' }],
  ['2327008', { id: 'electronica-digital', nombre: 'Electrónica Digital', color: '#d9782b', codigo: '2327008' }],
]);

describe('horario de la URJC', () => {
  it('lee la página real y se queda con el desdoble G2', () => {
    const clases = clasesDeUrjc(leerPaginaHorario(PAGINA), asignaturas, 'G2');
    expect(clases.map((c) => [c.fecha, c.inicio, c.fin, c.asignatura, c.desdoble])).toEqual([
      ['2026-09-16', '09:00', '11:00', 'algebra', undefined],
      ['2026-09-21', '09:00', '11:00', 'algebra', undefined],
      ['2026-09-23', '11:00', '13:00', 'algebra', 'G2'],
      ['2026-12-03', '10:00', '11:00', 'electronica-digital', undefined],
    ]);
    expect(clases[2].aula).toBe('Aula 3S4 · Aulario III');
    expect(clases[0].profesor).toBe('David Gonzalez de la Aleja Gallego');
    expect(clases[3].profesor).toBe('Antonio Rosario Consoli Barone, Angel Luis Alvarez Castillo, Maria Vila Santos, Javier Bartolome Vilchez');
  });
  it('sin desdoble elegido se queda con todos', () => {
    expect(clasesDeUrjc(leerPaginaHorario(PAGINA), asignaturas)).toHaveLength(5);
  });
  it('varias aulas se juntan y sin aulas no hay campo', () => {
    const [c] = clasesDeUrjc([{ ASIGNATURA_CODIGO: '2327002', GRUPO: 'MAÑANA A', CLASES: [
      { TIMESTAMP_INICIO: '2026-10-21T09:00:00', TIMESTAMP_FIN: '2026-10-21T11:00:00', AULAS: [{ AULA: 'Aula Informática L2104', EDIFICIO: 'Laboratorio II' }, { AULA: 'Aula 3S2', EDIFICIO: 'Aulario III' }] },
    ] }], asignaturas);
    expect(c.aula).toBe('Aula Informática L2104 · Laboratorio II + Aula 3S2 · Aulario III');
    const [d] = clasesDeUrjc([{ ASIGNATURA_CODIGO: '2327002', GRUPO: 'MAÑANA A', CLASES: [{ TIMESTAMP_INICIO: '2026-10-21T09:00:00', TIMESTAMP_FIN: '2026-10-21T11:00:00', AULAS: [] }] }], asignaturas);
    expect(d).not.toHaveProperty('aula');
    expect(d).not.toHaveProperty('profesor');
  });
  it('la misma clase en dos grupos sale una vez', () => {
    const clase = { TIMESTAMP_INICIO: '2026-12-03T09:00:00', TIMESTAMP_FIN: '2026-12-03T10:00:00' };
    expect(clasesDeUrjc([
      { ASIGNATURA_CODIGO: '2327008', GRUPO: 'MAÑANA A G UNICO P2', CLASES: [clase] },
      { ASIGNATURA_CODIGO: '2327008', GRUPO: 'MAÑANA A G UNICO P4', CLASES: [clase] },
    ], asignaturas)).toHaveLength(1);
  });
  it('horario vacío es una lista vacía', () => {
    expect(leerPaginaHorario('<script>const infoHorario = {"GRUPOS":[],"FESTIVOS":[]};</script>')).toEqual([]);
  });
  it('página sin horario o con formato raro → error de formato', () => {
    expect(() => leerPaginaHorario('<html>mantenimiento</html>')).toThrow(/no ha devuelto el horario/);
    expect(() => leerPaginaHorario('<script>const infoHorario = {"GRUPOS":{"1":{"GRUPO":"X"}}};</script>')).toThrow(/formato/);
    expect(() => leerPaginaHorario('<script>const infoHorario = {roto};</script>')).toThrow(/formato/);
  });
  it('nombres propios', () => {
    expect(nombrePropio('DE LA FUENTE  GARCIA')).toBe('De la Fuente Garcia');
    expect(nombrePropio('MARÍA DEL MAR')).toBe('María del Mar');
  });
});
```

- [ ] **Step 3: Comprobar que falla**

Run: `npx vitest run src/uni/horario.test.ts`
Expected: FAIL (no existe `./horario.ts`).

- [ ] **Step 4: Escribir el código**

`src/uni/horario.ts`:

```ts
// Horario de clases de la web pública de la URJC (servicios.urjc.es/horarios/calendario-grado).
// La página trae el horario dentro de un <script>: `const infoHorario = {...};`. Sin red: recibe el HTML.
import type { Asignatura } from '../datos/asignaturas.ts';
import type { Clase } from '../datos/horario.ts';
import { ErrorFormato } from './tipos.ts';

export interface GrupoUrjc {
  ASIGNATURA_CODIGO: string;
  GRUPO: string;
  PROFESORADO?: { NOMBRE?: string; APELLIDO1?: string | null; APELLIDO2?: string | null }[];
  CLASES: { TIMESTAMP_INICIO: string; TIMESTAMP_FIN: string; AULAS?: { AULA?: string; EDIFICIO?: string }[] }[];
}

const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const RARO = 'la web de horarios de la URJC ha devuelto un horario con un formato desconocido';

function esGrupo(g: unknown): g is GrupoUrjc {
  if (typeof g !== 'object' || g === null) return false;
  const o = g as Record<string, unknown>;
  return typeof o.ASIGNATURA_CODIGO === 'string' && typeof o.GRUPO === 'string' && Array.isArray(o.CLASES)
    && o.CLASES.every((c) => typeof c === 'object' && c !== null
      && FECHA_HORA.test(String((c as Record<string, unknown>).TIMESTAMP_INICIO))
      && FECHA_HORA.test(String((c as Record<string, unknown>).TIMESTAMP_FIN)));
}

export function leerPaginaHorario(html: string): GrupoUrjc[] {
  const m = html.match(/const infoHorario = (\{.*\});/);
  if (!m) throw new ErrorFormato('la web de horarios de la URJC no ha devuelto el horario (¿está en mantenimiento?)');
  let datos: unknown;
  try {
    datos = JSON.parse(m[1]);
  } catch {
    throw new ErrorFormato(RARO);
  }
  const grupos = (datos as { GRUPOS?: unknown }).GRUPOS;
  // Sin clases, PHP manda una lista vacía en vez de un objeto.
  if (Array.isArray(grupos) && grupos.length === 0) return [];
  if (typeof grupos !== 'object' || grupos === null) throw new ErrorFormato(RARO);
  const lista = Object.values(grupos);
  if (!lista.every(esGrupo)) throw new ErrorFormato(RARO);
  return lista;
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

// «GONZALEZ DE LA ALEJA» → «Gonzalez de la Aleja».
export function nombrePropio(s: string): string {
  return s.toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

export function clasesDeUrjc(grupos: GrupoUrjc[], asignaturas: Map<string, Asignatura>, desdoble?: string): Clase[] {
  const vistas = new Set<string>();
  const clases: Clase[] = [];
  for (const g of grupos) {
    const asignatura = asignaturas.get(g.ASIGNATURA_CODIGO);
    if (!asignatura) continue;
    const suyo = g.GRUPO.match(/\bG(\d+)\b/);
    const grupoDesdoble = suyo ? `G${suyo[1]}` : undefined;
    if (desdoble && grupoDesdoble && grupoDesdoble !== desdoble) continue;
    const profesor = (g.PROFESORADO ?? [])
      .map((p) => nombrePropio([p.NOMBRE, p.APELLIDO1, p.APELLIDO2].filter(Boolean).join(' ')))
      .filter(Boolean)
      .join(', ');
    for (const c of g.CLASES) {
      const fecha = c.TIMESTAMP_INICIO.slice(0, 10);
      const inicio = c.TIMESTAMP_INICIO.slice(11, 16);
      const clave = `${fecha} ${inicio} ${asignatura.id}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      const aula = (c.AULAS ?? []).map((a) => [a.AULA, a.EDIFICIO].filter(Boolean).join(' · ')).filter(Boolean).join(' + ');
      clases.push({
        fecha, inicio, fin: c.TIMESTAMP_FIN.slice(11, 16), asignatura: asignatura.id,
        ...(aula ? { aula } : {}),
        ...(profesor ? { profesor } : {}),
        ...(grupoDesdoble ? { desdoble: grupoDesdoble } : {}),
      });
    }
  }
  return clases.sort((a, b) => (a.fecha + a.inicio + a.asignatura).localeCompare(b.fecha + b.inicio + b.asignatura));
}
```

- [ ] **Step 5: Comprobar que pasa**

Run: `npx vitest run src/uni/horario.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/uni/horario.ts src/uni/horario.test.ts src/uni/pruebas/horario-urjc.html
git commit -m "Horario: leer el horario de la web de la URJC"
```

Registro: `Task 2: lectura del horario de la URJC hecha (commit <sha>).`

---

### Task 3: El workflow de la uni guarda el horario

**Files:**
- Modify: `sincronizar/uni.ts`
- Test: `sincronizar/uni.test.ts`

**Interfaces:**
- Consumes: `parseAjustesHorario`, `parseHorario`, `serializarHorario`, `RUTA_HORARIO`, `RUTA_HORARIO_AJUSTES` (Task 1); `leerPaginaHorario`, `clasesDeUrjc` (Task 2).
- Produces: `Resumen` gana `clases?: number` (solo si hay `grupo` en los ajustes) y `errorHorario?: string`. `textoResumen` añade ` · horario: N clases` cuando hay `clases`. El script sale con código **3** si solo ha fallado el horario (lo demás se ha guardado).

- [ ] **Step 1: Escribir la prueba (que falle)**

Añadir al final de `sincronizar/uni.test.ts` (reutiliza `carpeta`, `opciones`, `leer`, `ICS`, `EXAMENES`, `URL_SECRETA` que ya hay arriba):

```ts
describe('sincronizarUni: horario', () => {
  const PAGINA = readFileSync(path.join(import.meta.dirname, '../src/uni/pruebas/horario-urjc.html'), 'utf8');
  const AJUSTES = 'grupo: "G_ROBOT_1A(F)"\ncurso: 1\ndesdoble: G2\n';
  const ASIG = ASIGNATURAS + '  - id: algebra\n    nombre: Álgebra\n    color: "#db5629"\n    codigo: "2327002"\n';
  const pedidas: { url: string; cuerpo: string }[] = [];
  const conHorario = (horario: () => Response): typeof fetch => (async (url: string | URL | Request, init?: RequestInit) => {
    pedidas.push({ url: String(url), cuerpo: String(init?.body ?? '') });
    if (String(url) === URL_SECRETA) return new Response(ICS);
    if (String(url).includes('/horarios/')) return horario();
    return Response.json(EXAMENES);
  }) as typeof fetch;

  it('descarga el horario de su grupo y lo guarda', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES });
    pedidas.length = 0;
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.clases).toBe(3);
    expect(r.errorHorario).toBeUndefined();
    expect(textoResumen(r)).toBe('Uni: 2 nuevas, 0 actualizadas · horario: 3 clases');
    const pedida = pedidas.find((p) => p.url.includes('/horarios/'))!;
    expect(pedida.url).toBe('https://servicios.urjc.es/horarios/calendario-grado');
    expect(new URLSearchParams(pedida.cuerpo).get('grupo')).toBe('G_ROBOT_1A(F)');
    expect(new URLSearchParams(pedida.cuerpo).get('semestre')).toBe('*');
    expect(leer(dir, 'estudios/horario.yaml')).toContain('desdoble: G2');
  });
  it('sin cambios no reescribe el horario', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES });
    const o = opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) });
    await sincronizarUni(o);
    const r = await sincronizarUni(o);
    expect(r.escrito).toBe(false);
  });
  it('sin ajustes no pide el horario', async () => {
    const dir = carpeta();
    pedidas.length = 0;
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.clases).toBeUndefined();
    expect(pedidas.some((p) => p.url.includes('/horarios/'))).toBe(false);
    expect(existsSync(path.join(dir, 'estudios/horario.yaml'))).toBe(false);
  });
  it('si falla el horario, guarda lo demás y deja el horario que había', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES, 'estudios/horario.yaml': 'clases: []\n' });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response('<html>mantenimiento</html>')) }));
    expect(r.errorHorario).toMatch(/horario/);
    expect(r.creadas).toBe(2);
    expect(r.escrito).toBe(true);
    expect(leer(dir, 'estudios/horario.yaml')).toBe('clases: []\n');
  });
  it('un horario vacío no borra el que había', async () => {
    const antes = 'clases:\n  - fecha: 2026-09-16\n    inicio: "09:00"\n    fin: "11:00"\n    asignatura: algebra\n';
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': AJUSTES, 'estudios/horario.yaml': antes });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response('<script>const infoHorario = {"GRUPOS":[]};</script>')) }));
    expect(r.errorHorario).toMatch(/ninguna clase/);
    expect(leer(dir, 'estudios/horario.yaml')).toBe(antes);
  });
  it('ajustes mal escritos: error del horario, lo demás se guarda', async () => {
    const dir = carpeta({ 'estudios/asignaturas.yaml': ASIG, 'estudios/horario-ajustes.yaml': 'desdoble: dos\n' });
    const r = await sincronizarUni(opciones(dir, { descargar: conHorario(() => new Response(PAGINA)) }));
    expect(r.errorHorario).toMatch(/desdoble/);
    expect(r.creadas).toBe(2);
  });
});
```

Y añadir `readFileSync` ya está importado arriba; comprobar que el import de `node:fs` incluye `readFileSync` y `existsSync` (sí lo incluye).

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run sincronizar/uni.test.ts`
Expected: FAIL (`r.clases` es `undefined` en la primera prueba).

- [ ] **Step 3: Escribir el código**

En `sincronizar/uni.ts`:

1. Imports nuevos:

```ts
import { parseAjustesHorario, parseHorario, serializarHorario, type Clase } from '../src/datos/horario.ts';
import { RUTA_ASIGNATURAS, RUTA_HORARIO, RUTA_HORARIO_AJUSTES, RUTA_TAREAS, RUTA_UNI_SINCRONIZACION } from '../src/datos/rutas.ts';
import { clasesDeUrjc, leerPaginaHorario } from '../src/uni/horario.ts';
```

(sustituye el import de rutas que ya existe) y la constante:

```ts
const URL_HORARIO = 'https://servicios.urjc.es/horarios/calendario-grado';
```

2. `Resumen`:

```ts
export interface Resumen {
  creadas: number;
  actualizadas: number;
  saltados: number;
  escrito: boolean;
  clases?: number; // solo si hay grupo en horario-ajustes.yaml y el horario se ha leído bien
  errorHorario?: string; // el horario ha fallado (lo demás se ha guardado igual)
}
```

3. En `sincronizarUni`, leer también los dos archivos del horario y descargar el horario a la vez que lo demás, sin que su fallo pare el resto:

```ts
export async function sincronizarUni(o: Opciones): Promise<Resumen> {
  const [textoTareas, textoAsignaturas, textoVistos, textoAjustes, textoHorario] = await Promise.all(
    [RUTA_TAREAS, RUTA_ASIGNATURAS, RUTA_UNI_SINCRONIZACION, RUTA_HORARIO_AJUSTES, RUTA_HORARIO]
      .map((ruta) => leerSiExiste(path.join(o.carpeta, ruta))),
  );
  const tareas = textoTareas === null ? [] : parseTareas(textoTareas);
  const asignaturas = porCodigo(textoAsignaturas === null ? [] : parseAsignaturas(textoAsignaturas));
  if (asignaturas.size === 0) throw new Error(`ninguna asignatura de ${RUTA_ASIGNATURAS} tiene codigo: no hay nada que sincronizar`);
  const vistos = parseVistos(textoVistos);

  const [calendario, examenes, horario] = await Promise.all([
    descargarCalendario(o), descargarExamenes(o), horarioNuevo(o, textoAjustes, textoHorario, asignaturas),
  ]);
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
  const horarioTexto = 'clases' in horario ? serializarHorario(horario.clases) : null;
  const cambiaHorario = horarioTexto !== null && horarioTexto !== textoHorario;
  if (!o.prueba) {
    if (cambianTareas) await writeFile(path.join(o.carpeta, RUTA_TAREAS), tareasNuevas);
    if (cambianVistos) await writeFile(path.join(o.carpeta, RUTA_UNI_SINCRONIZACION), vistosNuevos);
    if (cambiaHorario) await writeFile(path.join(o.carpeta, RUTA_HORARIO), horarioTexto);
  }
  return {
    creadas: r.creadas,
    actualizadas: r.actualizadas,
    saltados: calendario.saltados,
    escrito: !o.prueba && (cambianTareas || cambianVistos || cambiaHorario),
    ...('clases' in horario ? { clases: horario.clases.length } : {}),
    ...('error' in horario ? { errorHorario: horario.error } : {}),
  };
}

// El horario nunca hace fallar lo demás: devuelve las clases, un error o nada (sin grupo en los ajustes).
async function horarioNuevo(
  o: Opciones, textoAjustes: string | null, textoHorario: string | null, asignaturas: Map<string, Asignatura>,
): Promise<{ clases: Clase[] } | { error: string } | Record<string, never>> {
  try {
    const ajustes = parseAjustesHorario(textoAjustes);
    if (!ajustes.grupo) return {};
    const res = await pedir(o, 'la web de horarios de la URJC', URL_HORARIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ cod_plan: TITULACION, curso: String(ajustes.curso ?? 1), grupo: ajustes.grupo, semestre: '*' }).toString(),
    });
    if (!res.ok) throw new Error(`la web de horarios de la URJC contestó ${res.status}`);
    const clases = clasesDeUrjc(leerPaginaHorario(await res.text()), asignaturas, ajustes.desdoble);
    if (clases.length === 0 && parseHorario(textoHorario).length > 0)
      throw new Error('la web de horarios de la URJC no ha devuelto ninguna clase: se deja el horario que había');
    return { clases };
  } catch (e) {
    return { error: `Horario: ${e instanceof Error ? e.message : String(e)}` };
  }
}
```

Añadir `import type { Asignatura } from '../src/datos/asignaturas.ts';` (junto al import de `parseAsignaturas`: `import { parseAsignaturas, type Asignatura } from '../src/datos/asignaturas.ts';`).

4. `textoResumen`:

```ts
export function textoResumen(r: Resumen): string {
  return `Uni: ${r.creadas} nuevas, ${r.actualizadas} actualizadas${r.clases !== undefined ? ` · horario: ${r.clases} clases` : ''}`;
}
```

5. En `principal`, después de `console.log(textoResumen(r));`:

```ts
    if (r.errorHorario) {
      console.error(`Error: ${r.errorHorario}`);
      process.exit(3); // lo demás se ha guardado: el workflow sube y luego avisa del fallo
    }
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run sincronizar/uni.test.ts`
Expected: PASS (las pruebas antiguas también: sin `horario-ajustes.yaml` no hay campos nuevos y `toEqual` ignora los que faltan).

- [ ] **Step 5: Prueba real sin guardar**

Comprobar con la web de verdad que la lectura funciona (desde la carpeta de la app, en Bash con el PATH de Node):


```bash
node -e "import('./src/uni/horario.ts').then(async (h) => { const r = await fetch('https://servicios.urjc.es/horarios/calendario-grado', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'cod_plan=2327&curso=1&grupo=G_ROBOT_1A(F)&semestre=*' }); const g = h.leerPaginaHorario(await r.text()); console.log(g.length, 'grupos'); })"
```

Expected: un número de grupos mayor que 0 (el 2026-10-04 eran 12 en el primer semestre).

- [ ] **Step 6: Commit**

```bash
git add sincronizar/uni.ts sincronizar/uni.test.ts
git commit -m "Uni: el workflow descarga y guarda el horario de clases"
```

Registro: `Task 3: workflow con horario hecho (commit <sha>). Pendiente en la Tarea 10: el workflow de my-context debe aceptar el código 3.`

---

### Task 4: Avisos: desleer y caducar a los 30 días

**Files:**
- Modify: `src/datos/avisos.ts`, `src/datos/avisos.test.ts`
- Modify: `src/uni/aula/avisos.ts`, `src/uni/aula/avisos.test.ts`
- Modify: `src/repositorio.ts`, `src/repositorio.test.ts`
- Modify: `src/estado/aula.ts`
- Modify: `src/componentes/estudio/AulaVirtual.tsx`, `src/componentes/estudio/AulaVirtual.test.tsx`

**Interfaces:**
- Produces:
  - `Aviso` gana `leidoEl?: ISODate`
  - `DIAS_LEIDOS = 30` (se mueve a `src/datos/avisos.ts`; `src/uni/aula/avisos.ts` lo reexporta si alguien lo importa)
  - `marcarLeidos(avisos: Aviso[], ids: string[], hoy: ISODate): Aviso[]`
  - `marcarNoLeido(avisos: Aviso[], id: string): Aviso[]`
  - `avisosVisibles(avisos: Aviso[], hoy: ISODate): Aviso[]`
  - `leerAvisos(cfg, ids, hoy)`, `desleerAviso(cfg, id): Promise<Aviso[]>` en `src/repositorio.ts`
  - `useAvisos()` devuelve además `marcarNoLeido(id: string): Promise<void>`
  - `ListaAvisos` recibe además `desmarcar(id: string): void`

- [ ] **Step 1: Escribir las pruebas (que fallen)**

En `src/datos/avisos.test.ts`, cambiar el import a:

```ts
import { avisosVisibles, importantesSinLeer, marcarLeidos, marcarNoLeido, parseAvisos, serializarAvisos, type Aviso } from './avisos.ts';
```

sustituir la prueba «marcar leídos y contar importantes sin leer» por:

```ts
  it('marcar leídos guarda el día y contar importantes sin leer', () => {
    expect(importantesSinLeer([a, b, { ...a, id: 'z', importante: false }])).toHaveLength(2);
    const r = marcarLeidos([a, { ...b, leido: true, leidoEl: '2026-09-01' }], ['moodle-hilo-555', 'programa-entrar', 'no-existe'], '2026-10-04');
    expect(r.map((x) => [x.leido, x.leidoEl])).toEqual([[true, '2026-10-04'], [true, '2026-09-01']]);
  });
  it('leidoEl: ida y vuelta y error claro', () => {
    const leido = { ...a, leido: true, leidoEl: '2026-10-04' };
    expect(parseAvisos(serializarAvisos([leido]))).toEqual([leido]);
    expect(() => parseAvisos('avisos:\n  - id: x\n    fecha: 2026-10-01\n    titulo: t\n    texto: t\n    leidoEl: ayer\n')).toThrow(/leidoEl/);
  });
  it('desleer quita la fecha de lectura', () => {
    const [x] = marcarNoLeido([{ ...a, leido: true, leidoEl: '2026-10-04' }], a.id);
    expect(x.leido).toBe(false);
    expect(x).not.toHaveProperty('leidoEl');
  });
  it('los leídos se ven 30 días; los no leídos siempre', () => {
    const lista = [
      { ...a, id: 'hace30', leido: true, leidoEl: '2026-09-04' },
      { ...a, id: 'hace31', leido: true, leidoEl: '2026-09-03' },
      { ...a, id: 'sin-fecha', leido: true },
      { ...a, id: 'sin-leer-con-fecha-vieja', leido: false, leidoEl: '2026-01-01' },
    ];
    expect(avisosVisibles(lista, '2026-10-04').map((x) => x.id)).toEqual(['hace30', 'sin-fecha', 'sin-leer-con-fecha-vieja']);
  });
```

En `src/uni/aula/avisos.test.ts`, sustituir la prueba «quita los leídos de hace más de 60 días…» por:

```ts
  it('borra los leídos hace más de 30 días, pone fecha a los leídos sin ella y nunca toca los no leídos', () => {
    const r = limpiarAvisos([
      av('viejo', { leido: true, leidoEl: '2026-09-08' }),
      av('justo', { leido: true, leidoEl: '2026-09-09' }),
      av('sin-fecha', { fecha: '2026-01-01', leido: true }),
      av('sin-leer', { fecha: '2026-01-01', leidoEl: '2026-01-01' }),
    ], '2026-10-09');
    expect(r.map((x) => [x.id, x.leidoEl])).toEqual([['justo', '2026-09-09'], ['sin-fecha', '2026-10-09'], ['sin-leer', '2026-01-01']]);
  });
```

En `src/repositorio.test.ts`, cambiar en el import `leerAvisos` por `leerAvisos, desleerAviso`, y sustituir la prueba `leerAvisos marca leído…` por:

```ts
  it('leerAvisos marca leído con el día y respeta un aviso nuevo del programa', async () => {
    const nuevo = `${AVISOS}  - id: c\n    fecha: 2026-10-04\n    titulo: C\n    texto: t\n    importante: true\n`;
    const escrito = simularRemoto(nuevo);
    const r = await leerAvisos(cfg, ['a'], '2026-10-05');
    expect(r.map((a) => [a.id, a.leido])).toEqual([['a', true], ['b', false], ['c', false]]);
    expect(escrito()).toContain('leidoEl: 2026-10-05');
    expect(escrito()).toContain('id: c');
    expect(actualizar.mock.calls[0][1]).toBe('estudios/avisos.yaml');
  });

  it('desleerAviso lo vuelve a dejar sin leer', async () => {
    const escrito = simularRemoto(AVISOS.replace('leido: false', 'leido: true\n    leidoEl: 2026-10-04'));
    const r = await desleerAviso(cfg, 'a');
    expect(r.find((x) => x.id === 'a')?.leido).toBe(false);
    expect(escrito()).not.toContain('leidoEl');
  });
```

Antes de escribir esta última, mirar la constante `AVISOS` de `src/repositorio.test.ts`: si el aviso `a` no tiene `leido: false` escrito, cambiar el `replace` para que el texto remoto tenga `a` leído (por ejemplo, añadiendo `    leido: true\n    leidoEl: 2026-10-04\n` detrás de la línea `texto` de `a`).

En `src/componentes/estudio/AulaVirtual.test.tsx`, añadir `desmarcar={() => undefined}` a las dos llamadas a `<ListaAvisos …>` y añadir:

```ts
  it('los leídos se pueden desleer', () => {
    const html = renderToString(<ListaAvisos avisos={[av('a', { leido: true })]} asignaturas={asignaturas} marcar={() => undefined} desmarcar={() => undefined} />);
    expect(html).toContain('Marcar como no leído');
    expect(html).not.toContain('Marcar todos como leídos');
  });
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run src/datos/avisos.test.ts src/uni/aula/avisos.test.ts src/repositorio.test.ts src/componentes/estudio/AulaVirtual.test.tsx`
Expected: FAIL (no existen `avisosVisibles`, `marcarNoLeido`, `desleerAviso`; `leidoEl` no se guarda).

- [ ] **Step 3: Escribir el código**

`src/datos/avisos.ts`:
- Import: `import { addDays, isISODate, type ISODate } from '../fechas.ts';`
- En la interfaz, detrás de `leido: boolean;`: `leidoEl?: ISODate; // el día en que se marcó como leído (caduca a los DIAS_LEIDOS)`
- En `parseAvisos`, junto a las otras comprobaciones: `if (a.leidoEl !== undefined && !isISODate(a.leidoEl)) throw new ErrorDatos(RUTA_AVISOS, \`${donde}: leidoEl debe tener el formato AAAA-MM-DD\`);` y en el objeto devuelto, detrás de `leido: a.leido === true,`: `...(a.leidoEl ? { leidoEl: a.leidoEl as string } : {}),`
- Sustituir `marcarLeidos` y añadir lo nuevo:

```ts
// Un aviso leído se ve DIAS_LEIDOS días desde que se leyó; después la app lo oculta y el programa del PC lo borra.
export const DIAS_LEIDOS = 30;

export function marcarLeidos(avisos: Aviso[], ids: string[], hoy: ISODate): Aviso[] {
  const set = new Set(ids);
  return avisos.map((a) => (set.has(a.id) && !a.leido ? { ...a, leido: true, leidoEl: hoy } : a));
}

export function marcarNoLeido(avisos: Aviso[], id: string): Aviso[] {
  return avisos.map((a) => {
    if (a.id !== id) return a;
    const { leidoEl: _, ...resto } = a;
    return { ...resto, leido: false };
  });
}

export function caducado(a: Aviso, hoy: ISODate): boolean {
  return a.leido && a.leidoEl !== undefined && a.leidoEl < addDays(hoy, -DIAS_LEIDOS);
}

export function avisosVisibles(avisos: Aviso[], hoy: ISODate): Aviso[] {
  return avisos.filter((a) => !caducado(a, hoy));
}
```

`src/uni/aula/avisos.ts`: quitar `export const DIAS_LEIDOS = 60;` y el import de `addDays` si deja de usarse; importar `caducado` y sustituir `limpiarAvisos`:

```ts
import { caducado, type Aviso } from '../../datos/avisos.ts';

// Los leídos sin fecha de lectura (de antes o de una versión antigua de la app) empiezan a contar hoy.
export function limpiarAvisos(avisos: Aviso[], hoy: ISODate): Aviso[] {
  return avisos
    .map((a) => (a.leido && !a.leidoEl ? { ...a, leidoEl: hoy } : a))
    .filter((a) => !caducado(a, hoy));
}
```

(`addDays` se sigue importando de `../../fechas.ts` solo si otra función del archivo lo usa; si no, importar solo `type ISODate`.) Buscar otros usos: `grep -rn "DIAS_LEIDOS" src local` y cambiarlos al import de `src/datos/avisos.ts`.

`src/repositorio.ts`: importar `marcarNoLeido` y `type ISODate` (`import type { ISODate } from './fechas';`), y:

```ts
// Solo cambia `leido`/`leidoEl`: lo demás lo escribe el programa del PC y se respeta lo que haya añadido mientras tanto.
export async function leerAvisos(cfg: Config, ids: string[], hoy: ISODate): Promise<Aviso[]> {
  let r: Aviso[] = [];
  await actualizarArchivo(cfg, RUTA_AVISOS, (texto) => {
    r = marcarLeidos(parseAvisos(texto), ids, hoy);
    return serializarAvisos(r);
  }, ids.length === 1 ? 'Aviso leído' : `${ids.length} avisos leídos`);
  return r;
}

export async function desleerAviso(cfg: Config, id: string): Promise<Aviso[]> {
  let r: Aviso[] = [];
  await actualizarArchivo(cfg, RUTA_AVISOS, (texto) => {
    r = marcarNoLeido(parseAvisos(texto), id);
    return serializarAvisos(r);
  }, 'Aviso sin leer');
  return r;
}
```

`src/estado/aula.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { avisosVisibles, marcarNoLeido as quitarLeido, type Aviso } from '../datos/avisos';
import { toISO } from '../fechas';
import { cargarAvisos, desleerAviso, leerAvisos } from '../repositorio';
import { useDatos } from './datos';
import { useHoy } from './hoy';

// Avisos de la uni: se leen al abrir la pantalla y al volver a la app. Si fallan, no molestan (la línea no sale).
// Los leídos hace más de 30 días no se enseñan (spec horario §7).
export function useAvisos(): {
  avisos: Aviso[]; cargando: boolean; marcarLeidos(ids: string[]): Promise<void>; marcarNoLeido(id: string): Promise<void>;
} {
  const { config, estado } = useDatos();
  const hoy = useHoy();
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
    const dia = toISO(new Date());
    setAvisos((as) => as.map((a) => (ids.includes(a.id) && !a.leido ? { ...a, leido: true, leidoEl: dia } : a)));
    try {
      setAvisos(await leerAvisos(config, ids, dia));
    } catch {
      await traer();
    }
  }, [config, traer]);

  const marcarNoLeido = useCallback(async (id: string) => {
    if (!config) return;
    setAvisos((as) => quitarLeido(as, id));
    try {
      setAvisos(await desleerAviso(config, id));
    } catch {
      await traer();
    }
  }, [config, traer]);

  return { avisos: avisosVisibles(avisos, hoy), cargando, marcarLeidos, marcarNoLeido };
}
```

`src/componentes/estudio/AulaVirtual.tsx`:
- Firma: `export function ListaAvisos({ avisos, asignaturas, marcar, desmarcar }: { avisos: Aviso[]; asignaturas: Asignatura[]; marcar(ids: string[]): void; desmarcar(id: string): void })`
- Detrás del botón «Marcar como leído»: `{a.leido && <button className="enlace" onClick={() => desmarcar(a.id)}>Marcar como no leído</button>}`
- En `AulaVirtual`: `const { avisos, marcarLeidos, marcarNoLeido } = useAvisos();` y `<ListaAvisos … marcar={(ids) => void marcarLeidos(ids)} desmarcar={(id) => void marcarNoLeido(id)} />`

- [ ] **Step 4: Comprobar que pasa**

Run: `npm test`
Expected: PASS (todas). Si `local/aula/revision.test.ts` esperaba la regla de 60 días, adaptarlo a 30 y apuntarlo en el registro.

- [ ] **Step 5: Commit**

```bash
git add src/datos/avisos.ts src/datos/avisos.test.ts src/uni/aula/avisos.ts src/uni/aula/avisos.test.ts src/repositorio.ts src/repositorio.test.ts src/estado/aula.ts src/componentes/estudio/AulaVirtual.tsx src/componentes/estudio/AulaVirtual.test.tsx
git commit -m "Avisos: desleer y caducar a los 30 días de leerlos"
```

Registro: `Task 4: avisos que se desleen y caducan hecho (commit <sha>).`

---

### Task 5: Lógica del horario (clases del día, «Ahora / Siguiente», cambios)

**Files:**
- Create: `src/agenda/horario.ts`
- Test: `src/agenda/horario.test.ts`

**Interfaces:**
- Consumes: `Clase`, `AjustesHorario`, `Quitada`, `Suelta` (Task 1); `addDays`, `toISO`, `ISODate` (`src/fechas.ts`).
- Produces:
  - `interface ClaseDelDia extends Clase { suelta?: boolean; nota?: string; quitada?: boolean }`
  - `clasesDelDia(clases: Clase[], ajustes: AjustesHorario, dia: ISODate): ClaseDelDia[]`
  - `clasesActivas(clases, ajustes, dia): ClaseDelDia[]` (sin las quitadas)
  - `interface AhoraYSiguiente { enCurso: ClaseDelDia | null; siguiente: ClaseDelDia | null; esManana: boolean }`
  - `ahoraYSiguiente(clases, ajustes, ahora: Date): AhoraYSiguiente`
  - `quitarClase(a, q: Quitada)`, `volverAPoner(a, q: Quitada)`, `anadirSuelta(a, s: Suelta)`, `borrarSuelta(a, s: Quitada)`: todas `(AjustesHorario, …) => AjustesHorario`
  - `horasCuadricula(clases: ClaseDelDia[]): { desde: number; hasta: number }`
  - `horaBonita(h: string): string` («09:00» → «9:00»)
  - `minutos(h: string): number`

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/agenda/horario.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { AjustesHorario, Clase } from '../datos/horario';
import {
  ahoraYSiguiente, anadirSuelta, borrarSuelta, clasesActivas, clasesDelDia, horaBonita, horasCuadricula, quitarClase, volverAPoner,
} from './horario';

const cl = (fecha: string, inicio: string, fin: string, asignatura: string): Clase => ({ fecha, inicio, fin, asignatura });
// Lunes 5 y martes 6 de octubre de 2026; viernes 9.
const clases = [
  cl('2026-10-05', '09:00', '11:00', 'algebra'),
  cl('2026-10-05', '11:00', '13:00', 'emprendimiento'),
  cl('2026-10-06', '09:00', '11:00', 'electronica-digital'),
  cl('2026-10-09', '11:00', '13:00', 'fundamentos-programacion'),
];
const sin: AjustesHorario = { quitadas: [], sueltas: [] };
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00`);

describe('clases del día', () => {
  it('ordenadas, con las sueltas y las quitadas marcadas', () => {
    const ajustes: AjustesHorario = {
      quitadas: [{ fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' }],
      sueltas: [{ fecha: '2026-10-05', inicio: '15:00', fin: '16:00', asignatura: 'calculo', nota: 'Recuperación' }],
    };
    const r = clasesDelDia(clases, ajustes, '2026-10-05');
    expect(r.map((c) => [c.inicio, c.asignatura, c.quitada ?? false, c.suelta ?? false])).toEqual([
      ['09:00', 'algebra', true, false], ['11:00', 'emprendimiento', false, false], ['15:00', 'calculo', false, true],
    ]);
    expect(r[2].nota).toBe('Recuperación');
    expect(clasesActivas(clases, ajustes, '2026-10-05').map((c) => c.asignatura)).toEqual(['emprendimiento', 'calculo']);
  });
});

describe('ahora y siguiente', () => {
  it('antes de la primera clase', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '08:30'))).toMatchObject({ enCurso: null, siguiente: { asignatura: 'algebra' }, esManana: false });
  });
  it('en clase, con la siguiente', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '10:15'))).toMatchObject({ enCurso: { asignatura: 'algebra' }, siguiente: { asignatura: 'emprendimiento' } });
  });
  it('justo cuando acaba una clase y empieza otra, manda la que empieza', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '11:00'))).toMatchObject({ enCurso: { asignatura: 'emprendimiento' }, siguiente: null, esManana: false });
  });
  it('después de la última: la primera de mañana', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-05', '13:00'))).toMatchObject({ enCurso: null, siguiente: { asignatura: 'electronica-digital' }, esManana: true });
  });
  it('viernes por la tarde (mañana no hay clase): nada', () => {
    expect(ahoraYSiguiente(clases, sin, a('2026-10-09', '14:00'))).toEqual({ enCurso: null, siguiente: null, esManana: false });
  });
  it('una clase quitada no cuenta', () => {
    const ajustes = quitarClase(sin, { fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' });
    expect(ahoraYSiguiente(clases, ajustes, a('2026-10-05', '08:30'))).toMatchObject({ siguiente: { asignatura: 'emprendimiento' } });
  });
});

describe('cambios a mano', () => {
  const q = { fecha: '2026-10-05', inicio: '09:00', asignatura: 'algebra' };
  it('quitar no duplica y volver a poner la quita de la lista', () => {
    const quitada = quitarClase(quitarClase(sin, q), q);
    expect(quitada.quitadas).toEqual([q]);
    expect(volverAPoner(quitada, q).quitadas).toEqual([]);
  });
  it('añadir y borrar una suelta sin tocar lo demás', () => {
    const base: AjustesHorario = { grupo: 'G', desdoble: 'G2', quitadas: [q], sueltas: [] };
    const s = { fecha: '2026-10-15', inicio: '11:00', fin: '13:00', asignatura: 'electronica-digital' };
    const con = anadirSuelta(base, s);
    expect(con).toEqual({ ...base, sueltas: [s] });
    expect(borrarSuelta(con, { fecha: s.fecha, inicio: s.inicio, asignatura: s.asignatura })).toEqual(base);
  });
});

describe('cuadrícula', () => {
  it('como mínimo de 9 a 15, y se estira si hace falta', () => {
    expect(horasCuadricula([])).toEqual({ desde: 9, hasta: 15 });
    expect(horasCuadricula([{ ...cl('2026-10-05', '08:30', '10:00', 'a') }, { ...cl('2026-10-05', '16:00', '17:30', 'b') }])).toEqual({ desde: 8, hasta: 18 });
  });
  it('horas bonitas', () => {
    expect(horaBonita('09:00')).toBe('9:00');
    expect(horaBonita('11:30')).toBe('11:30');
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run src/agenda/horario.test.ts`
Expected: FAIL (no existe `./horario`).

- [ ] **Step 3: Escribir el código**

`src/agenda/horario.ts`:

```ts
import type { AjustesHorario, Clase, Quitada, Suelta } from '../datos/horario';
import { addDays, toISO, type ISODate } from '../fechas';

// Una clase tal y como se enseña: las del horario de la URJC más las sueltas, con las quitadas marcadas.
export interface ClaseDelDia extends Clase {
  suelta?: boolean;
  nota?: string;
  quitada?: boolean;
}

const mismaClase = (a: Quitada, b: Quitada) => a.fecha === b.fecha && a.inicio === b.inicio && a.asignatura === b.asignatura;

export function clasesDelDia(clases: Clase[], ajustes: AjustesHorario, dia: ISODate): ClaseDelDia[] {
  const delHorario: ClaseDelDia[] = clases
    .filter((c) => c.fecha === dia)
    .map((c) => (ajustes.quitadas.some((q) => mismaClase(q, c)) ? { ...c, quitada: true } : c));
  const sueltas: ClaseDelDia[] = ajustes.sueltas.filter((s) => s.fecha === dia).map((s) => ({ ...s, suelta: true }));
  return [...delHorario, ...sueltas].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.asignatura.localeCompare(b.asignatura));
}

export function clasesActivas(clases: Clase[], ajustes: AjustesHorario, dia: ISODate): ClaseDelDia[] {
  return clasesDelDia(clases, ajustes, dia).filter((c) => !c.quitada);
}

export interface AhoraYSiguiente {
  enCurso: ClaseDelDia | null;
  siguiente: ClaseDelDia | null;
  esManana: boolean;
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

export function ahoraYSiguiente(clases: Clase[], ajustes: AjustesHorario, ahora: Date): AhoraYSiguiente {
  const hoy = toISO(ahora);
  const hm = `${dosCifras(ahora.getHours())}:${dosCifras(ahora.getMinutes())}`;
  const deHoy = clasesActivas(clases, ajustes, hoy);
  // Si una acaba justo cuando empieza otra, manda la que empieza (fin no incluido).
  const enCurso = deHoy.find((c) => c.inicio <= hm && hm < c.fin) ?? null;
  const siguiente = deHoy.find((c) => c.inicio > hm && c !== enCurso) ?? null;
  if (enCurso || siguiente) return { enCurso, siguiente, esManana: false };
  const manana = clasesActivas(clases, ajustes, addDays(hoy, 1))[0] ?? null;
  return { enCurso: null, siguiente: manana, esManana: manana !== null };
}

export function quitarClase(a: AjustesHorario, q: Quitada): AjustesHorario {
  if (a.quitadas.some((x) => mismaClase(x, q))) return a;
  return { ...a, quitadas: [...a.quitadas, { fecha: q.fecha, inicio: q.inicio, asignatura: q.asignatura }] };
}

export function volverAPoner(a: AjustesHorario, q: Quitada): AjustesHorario {
  return { ...a, quitadas: a.quitadas.filter((x) => !mismaClase(x, q)) };
}

export function anadirSuelta(a: AjustesHorario, s: Suelta): AjustesHorario {
  return { ...a, sueltas: [...a.sueltas, s] };
}

export function borrarSuelta(a: AjustesHorario, s: Quitada): AjustesHorario {
  return { ...a, sueltas: a.sueltas.filter((x) => !mismaClase(x, s)) };
}

export function minutos(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

// Horas que enseña la cuadrícula: como mínimo de 9 a 15.
export function horasCuadricula(clases: ClaseDelDia[]): { desde: number; hasta: number } {
  let desde = 9;
  let hasta = 15;
  for (const c of clases) {
    desde = Math.min(desde, Math.floor(minutos(c.inicio) / 60));
    hasta = Math.max(hasta, Math.ceil(minutos(c.fin) / 60));
  }
  return { desde, hasta };
}

export function horaBonita(h: string): string {
  return h.replace(/^0(\d)/, '$1');
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run src/agenda/horario.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/agenda/horario.ts src/agenda/horario.test.ts
git commit -m "Horario: clases del día, ahora y siguiente, cambios a mano"
```

Registro: `Task 5: lógica del horario hecha (commit <sha>).`

---

### Task 6: Leer y guardar el horario desde la app (`useHorario`)

**Files:**
- Modify: `src/repositorio.ts`, `src/repositorio.test.ts`
- Create: `src/estado/horario.ts`

**Interfaces:**
- Consumes: Task 1 (`parseHorario`, `parseAjustesHorario`, `serializarAjustesHorario`, rutas).
- Produces:
  - `interface Horario { clases: Clase[]; ajustes: AjustesHorario }` y `HORARIO_VACIO` en `src/repositorio.ts`
  - `cargarHorario(cfg: Config): Promise<Horario>`
  - `modificarAjustesHorario(cfg: Config, cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string): Promise<AjustesHorario>`
  - `useHorario(): { horario: Horario; cambiarAjustes(cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string): Promise<boolean> }` en `src/estado/horario.ts`

- [ ] **Step 1: Escribir la prueba (que falle)**

En `src/repositorio.test.ts`, añadir `cargarHorario, modificarAjustesHorario` al import de `./repositorio` y al final del archivo:

```ts
describe('horario', () => {
  it('cargarHorario: sin archivos, vacío; con archivos, clases y ajustes', async () => {
    leer.mockRejectedValue(new cliente.ErrorGitHub('no-existe', 'no', 404));
    expect(await cargarHorario(cfg)).toEqual({ clases: [], ajustes: { quitadas: [], sueltas: [] } });
    leer.mockImplementation(async (_cfg, ruta) => {
      if (ruta === 'estudios/horario.yaml') return { texto: 'clases:\n  - fecha: 2026-10-05\n    inicio: "09:00"\n    fin: "11:00"\n    asignatura: algebra\n', sha: 'h' };
      if (ruta === 'estudios/horario-ajustes.yaml') return { texto: 'grupo: "G"\ndesdoble: G2\n', sha: 'a' };
      throw new Error(`ruta inesperada ${ruta}`);
    });
    const h = await cargarHorario(cfg);
    expect(h.clases).toHaveLength(1);
    expect(h.ajustes.desdoble).toBe('G2');
  });

  it('modificarAjustesHorario respeta lo que haya cambiado otro', async () => {
    const escrito = simularRemoto('grupo: "G"\ndesdoble: G2\nsueltas:\n  - fecha: 2026-10-15\n    inicio: "11:00"\n    fin: "13:00"\n    asignatura: e\n');
    const r = await modificarAjustesHorario(cfg, (a) => ({ ...a, quitadas: [{ fecha: '2026-09-24', inicio: '09:00', asignatura: 'e' }] }), 'Quitar clase');
    expect(r.sueltas).toHaveLength(1);
    expect(escrito()).toContain('grupo: G');
    expect(escrito()).toContain('2026-09-24');
    expect(actualizar.mock.calls[0][1]).toBe('estudios/horario-ajustes.yaml');
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run src/repositorio.test.ts`
Expected: FAIL (no existen `cargarHorario` ni `modificarAjustesHorario`).

- [ ] **Step 3: Escribir el código**

En `src/repositorio.ts`, imports:

```ts
import { AJUSTES_VACIOS, parseAjustesHorario, parseHorario, serializarAjustesHorario, type AjustesHorario, type Clase } from './datos/horario';
```

y añadir `RUTA_HORARIO, RUTA_HORARIO_AJUSTES` al import de `./datos/rutas`. Al final:

```ts
export interface Horario {
  clases: Clase[];
  ajustes: AjustesHorario;
}

export const HORARIO_VACIO: Horario = { clases: [], ajustes: AJUSTES_VACIOS };

export async function cargarHorario(cfg: Config): Promise<Horario> {
  const [clases, ajustes] = await Promise.all([leerOpcional(cfg, RUTA_HORARIO), leerOpcional(cfg, RUTA_HORARIO_AJUSTES)]);
  return { clases: parseHorario(clases), ajustes: parseAjustesHorario(ajustes) };
}

// Solo cambia lo que toca `cambio` (normalmente quitadas o sueltas) sobre lo que haya en GitHub en ese momento.
export async function modificarAjustesHorario(
  cfg: Config, cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string,
): Promise<AjustesHorario> {
  let r: AjustesHorario = AJUSTES_VACIOS;
  await actualizarArchivo(cfg, RUTA_HORARIO_AJUSTES, (texto) => {
    r = cambio(parseAjustesHorario(texto));
    return serializarAjustesHorario(r);
  }, mensaje);
  return r;
}
```

`src/estado/horario.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import type { AjustesHorario } from '../datos/horario';
import { cargarHorario, HORARIO_VACIO, modificarAjustesHorario, type Horario } from '../repositorio';
import { useDatos } from './datos';

// El horario se guarda también en este dispositivo para verlo sin internet (por los pasillos de la uni).
const CLAVE = 'sc-horario';

function leerCache(): Horario {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Horario | null;
    if (v && Array.isArray(v.clases) && v.ajustes && Array.isArray(v.ajustes.quitadas) && Array.isArray(v.ajustes.sueltas)) return v;
  } catch {
    // sin almacenamiento o roto
  }
  return HORARIO_VACIO;
}

function guardarCache(h: Horario): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(h));
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

// Horario de clases: se lee al abrir la pantalla y al volver a la app. Si falla, se queda el último que se vio.
export function useHorario(): {
  horario: Horario;
  cambiarAjustes(cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string): Promise<boolean>;
} {
  const { config, estado } = useDatos();
  const [horario, setHorario] = useState<Horario>(leerCache);

  const traer = useCallback(async () => {
    if (!config || estado !== 'listo') return;
    try {
      const h = await cargarHorario(config);
      setHorario(h);
      guardarCache(h);
    } catch {
      // sin conexión o archivo roto: se queda lo que había
    }
  }, [config, estado]);

  useEffect(() => {
    void traer();
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [traer]);

  const cambiarAjustes = useCallback(async (cambio: (a: AjustesHorario) => AjustesHorario, mensaje: string) => {
    if (!config) return false;
    setHorario((h) => ({ ...h, ajustes: cambio(h.ajustes) }));
    try {
      const ajustes = await modificarAjustesHorario(config, cambio, mensaje);
      setHorario((h) => {
        const nuevo = { ...h, ajustes };
        guardarCache(nuevo);
        return nuevo;
      });
      return true;
    } catch {
      await traer();
      return false;
    }
  }, [config, traer]);

  return { horario, cambiarAjustes };
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run src/repositorio.test.ts` y `npm run build`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/repositorio.ts src/repositorio.test.ts src/estado/horario.ts
git commit -m "Horario: leer y guardar los archivos del horario desde la app"
```

Registro: `Task 6: useHorario hecho (commit <sha>).`

---

### Task 7: Piezas de pantalla del horario

**Files:**
- Create: `src/componentes/horario/colores.ts`
- Create: `src/componentes/horario/CuadriculaHorario.tsx`
- Create: `src/componentes/horario/VentanaClase.tsx`
- Create: `src/componentes/horario/FormClaseSuelta.tsx`
- Create: `src/componentes/horario/FilaClase.tsx`
- Modify: `src/estilos.css`
- Test: `src/componentes/horario/horario.test.tsx`

**Interfaces:**
- Consumes: `ClaseDelDia`, `horasCuadricula`, `horaBonita`, `minutos` (Task 5); `Asignatura`; `Suelta`; `formatoLargo`, `diaDeSemana`, `fromISO`, `ISODate` (`src/fechas.ts`).
- Produces:
  - `datosAsignatura(asignaturas: Asignatura[], id: string): { nombre: string; color: string }` (desconocida → `{ nombre: id, color: '#9ca3af' }`)
  - `<CuadriculaHorario dias={ISODate[]} clases={ClaseDelDia[][]} asignaturas={Asignatura[]} hoy={ISODate} alElegir={(c: ClaseDelDia) => void} />`
  - `<VentanaClase clase={ClaseDelDia} asignaturas={Asignatura[]} bloqueado={boolean} alAbrir={() => void} alQuitar={() => void} alPoner={() => void} alBorrar={() => void} cerrar={() => void} />`
  - `<FormClaseSuelta asignaturas={Asignatura[]} dia={ISODate} guardar={(s: Suelta) => void} cerrar={() => void} />`
  - `<FilaClase clase={ClaseDelDia} asignaturas={Asignatura[]} alElegir={(c: ClaseDelDia) => void} />` (un `<li>` para la lista del día)

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/componentes/horario/horario.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ClaseDelDia } from '../../agenda/horario';
import { datosAsignatura } from './colores';
import { CuadriculaHorario } from './CuadriculaHorario';
import { FilaClase } from './FilaClase';
import { FormClaseSuelta } from './FormClaseSuelta';
import { VentanaClase } from './VentanaClase';

const asignaturas = [
  { id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' },
  { id: 'algebra', nombre: 'Álgebra', color: '#db5629', codigo: '2327002' },
];
const calculo: ClaseDelDia = { fecha: '2026-10-07', inicio: '09:00', fin: '11:00', asignatura: 'calculo', aula: 'Aula 3S2 · Aulario III', profesor: 'Ana Pérez', desdoble: 'G2' };
const nada = () => undefined;
const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];

describe('horario en pantalla', () => {
  it('asignatura desconocida: su id y gris', () => {
    expect(datosAsignatura(asignaturas, 'vieja')).toEqual({ nombre: 'vieja', color: '#9ca3af' });
    expect(datosAsignatura(asignaturas, 'calculo')).toEqual({ nombre: 'Cálculo', color: '#36ace7' });
  });
  it('cuadrícula: días, horas y bloques con nombre, aula y desdoble; las quitadas tachadas', () => {
    const html = renderToString(<CuadriculaHorario dias={semana} clases={[[], [], [calculo, { ...calculo, inicio: '11:00', fin: '13:00', asignatura: 'algebra', quitada: true }], [], []]} asignaturas={asignaturas} hoy="2026-10-07" alElegir={nada} />);
    expect(html).toContain('mie 7');
    expect(html).toContain('9:00');
    expect(html).toContain('Cálculo');
    expect(html).toContain('Aula 3S2');
    expect(html).toContain('G2');
    expect(html).toContain('clase-bloque quitada');
  });
  it('cuadrícula con una asignatura que ya no existe no se rompe', () => {
    const html = renderToString(<CuadriculaHorario dias={semana} clases={[[{ ...calculo, asignatura: 'vieja' }], [], [], [], []]} asignaturas={asignaturas} hoy="2026-10-07" alElegir={nada} />);
    expect(html).toContain('vieja');
  });
  it('ventana de una clase normal', () => {
    const html = renderToString(<VentanaClase clase={calculo} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />);
    expect(html).toContain('Cálculo');
    expect(html).toContain('9:00 – 11:00');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('Desdoble G2');
    expect(html).toContain('Abrir asignatura');
    expect(html).toContain('No hay clase este día');
  });
  it('ventana de una clase quitada y de una suelta', () => {
    expect(renderToString(<VentanaClase clase={{ ...calculo, quitada: true }} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />)).toContain('Sí hay clase');
    const suelta = renderToString(<VentanaClase clase={{ ...calculo, suelta: true, nota: 'Recuperación' }} asignaturas={asignaturas} bloqueado={false} alAbrir={nada} alQuitar={nada} alPoner={nada} alBorrar={nada} cerrar={nada} />);
    expect(suelta).toContain('Recuperación');
    expect(suelta).toContain('Borrar clase suelta');
  });
  it('formulario de clase suelta con las asignaturas', () => {
    const html = renderToString(<FormClaseSuelta asignaturas={asignaturas} dia="2026-10-15" guardar={nada} cerrar={nada} />);
    expect(html).toContain('Clase suelta');
    expect(html).toContain('value="2026-10-15"');
    expect(html).toContain('Álgebra');
  });
  it('fila de la lista del día', () => {
    const html = renderToString(<ul><FilaClase clase={calculo} asignaturas={asignaturas} alElegir={nada} /></ul>);
    expect(html).toContain('9:00');
    expect(html).toContain('Cálculo');
    expect(html).toContain('Aula 3S2');
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run src/componentes/horario/horario.test.tsx`
Expected: FAIL (no existen los componentes).

- [ ] **Step 3: Escribir el código**

`src/componentes/horario/colores.ts`:

```ts
import type { Asignatura } from '../../datos/asignaturas';

// Una clase puede traer una asignatura que ya no está en asignaturas.yaml: se enseña con su id y en gris.
export function datosAsignatura(asignaturas: Asignatura[], id: string): { nombre: string; color: string } {
  const a = asignaturas.find((x) => x.id === id);
  return a ? { nombre: a.nombre, color: a.color } : { nombre: id, color: '#9ca3af' };
}

export const fondoSuave = (color: string) => `color-mix(in srgb, ${color} 25%, var(--superficie))`;
```

`src/componentes/horario/CuadriculaHorario.tsx`:

```tsx
import { horaBonita, horasCuadricula, minutos, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { diaDeSemana, fromISO, type ISODate } from '../../fechas';
import { datosAsignatura, fondoSuave } from './colores';

interface Props {
  dias: ISODate[]; // de lunes a viernes
  clases: ClaseDelDia[][]; // las de cada día, en el mismo orden
  asignaturas: Asignatura[];
  hoy: ISODate;
  alElegir(c: ClaseDelDia): void;
}

// Cuadrícula semanal: las horas a la izquierda y un bloque por clase, colocado según su hora.
export function CuadriculaHorario({ dias, clases, asignaturas, hoy, alElegir }: Props) {
  const { desde, hasta } = horasCuadricula(clases.flat());
  const total = (hasta - desde) * 60;
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
  const pos = (h: string) => `${((minutos(h) - desde * 60) / total) * 100}%`;
  return (
    <div className="horario" style={{ ['--filas' as string]: hasta - desde }}>
      <div className="horario-horas">
        <span className="horario-cabecera" />
        <div className="horario-columna">
          {horas.map((h) => (
            <span key={h} className="horario-hora" style={{ top: `${((h - desde) / (hasta - desde)) * 100}%` }}>{`${h}:00`}</span>
          ))}
        </div>
      </div>
      {dias.map((dia, i) => (
        <div key={dia} className={`horario-dia${dia === hoy ? ' hoy' : ''}`}>
          <span className="horario-cabecera">{`${diaDeSemana(dia)} ${fromISO(dia).getDate()}`}</span>
          <div className="horario-columna">
            {clases[i].map((c) => {
              const { nombre, color } = datosAsignatura(asignaturas, c.asignatura);
              const alto = `calc(${pos(c.fin)} - ${pos(c.inicio)})`;
              return (
                <button
                  key={`${c.inicio}-${c.asignatura}`}
                  className={`clase-bloque${c.quitada ? ' quitada' : ''}${c.suelta ? ' suelta' : ''}`}
                  style={{ top: pos(c.inicio), height: alto, background: fondoSuave(color), borderLeftColor: color }}
                  onClick={() => alElegir(c)}
                  title={`${nombre} · ${horaBonita(c.inicio)}–${horaBonita(c.fin)}${c.aula ? ` · ${c.aula}` : ''}`}
                >
                  <strong>{nombre}</strong>
                  {c.desdoble && <span className="clase-marca">{c.desdoble}</span>}
                  {c.aula && <span className="clase-aula">{c.aula.split(' · ')[0]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

`src/componentes/horario/VentanaClase.tsx`:

```tsx
import { horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { formatoLargo } from '../../fechas';
import { datosAsignatura } from './colores';

interface Props {
  clase: ClaseDelDia;
  asignaturas: Asignatura[];
  bloqueado: boolean; // sin conexión o sin token: no se puede cambiar nada
  alAbrir(): void;
  alQuitar(): void;
  alPoner(): void;
  alBorrar(): void;
  cerrar(): void;
}

export function VentanaClase({ clase, asignaturas, bloqueado, alAbrir, alQuitar, alPoner, alBorrar, cerrar }: Props) {
  const { nombre, color } = datosAsignatura(asignaturas, clase.asignatura);
  return (
    <div className="fondo-modal" onClick={cerrar}>
      <div className="modal" role="dialog" aria-label={nombre} onClick={(e) => e.stopPropagation()}>
        <h2><span className="punto" style={{ background: color }} /> {nombre}</h2>
        <p>
          {`${formatoLargo(clase.fecha)} · ${horaBonita(clase.inicio)} – ${horaBonita(clase.fin)}`}
          {clase.quitada && <strong> · No hay clase</strong>}
        </p>
        {clase.aula && <p>📍 {clase.aula}</p>}
        {clase.profesor && <p>👤 {clase.profesor}</p>}
        {clase.desdoble && <p>{`Desdoble ${clase.desdoble}`}</p>}
        {clase.nota && <p>📝 {clase.nota}</p>}
        <div className="botones">
          <button className="activa" onClick={alAbrir}>Abrir asignatura</button>
          {clase.suelta ? (
            <button className="peligro" disabled={bloqueado} onClick={alBorrar}>Borrar clase suelta</button>
          ) : clase.quitada ? (
            <button disabled={bloqueado} onClick={alPoner}>Sí hay clase</button>
          ) : (
            <button disabled={bloqueado} onClick={alQuitar}>No hay clase este día</button>
          )}
          <button onClick={cerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
```

`src/componentes/horario/FormClaseSuelta.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import type { Asignatura } from '../../datos/asignaturas';
import type { Suelta } from '../../datos/horario';
import type { ISODate } from '../../fechas';

interface Props {
  asignaturas: Asignatura[];
  dia: ISODate;
  guardar(s: Suelta): void;
  cerrar(): void;
}

// Una clase que no está en el horario de la URJC (p. ej. una recuperación que avisa el profe).
export function FormClaseSuelta({ asignaturas, dia, guardar, cerrar }: Props) {
  const [asignatura, setAsignatura] = useState(asignaturas[0]?.id ?? '');
  const [fecha, setFecha] = useState(dia);
  const [inicio, setInicio] = useState('09:00');
  const [fin, setFin] = useState('11:00');
  const [aula, setAula] = useState('');
  const [nota, setNota] = useState('');
  const valido = asignatura && fecha && inicio && fin && inicio < fin;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    guardar({ fecha, inicio, fin, asignatura, ...(aula.trim() ? { aula: aula.trim() } : {}), ...(nota.trim() ? { nota: nota.trim() } : {}) });
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={enviar}>
        <h2>Clase suelta</h2>
        <label>
          Asignatura
          <select value={asignatura} onChange={(e) => setAsignatura(e.target.value)} required>
            {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label>Día <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></label>
        <label>Empieza <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label>
        <label>Acaba <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} required /></label>
        <label>Aula (opcional) <input value={aula} onChange={(e) => setAula(e.target.value)} maxLength={80} /></label>
        <label>Nota (opcional) <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Recuperación" /></label>
        <div className="botones">
          <button type="submit" className="activa" disabled={!valido}>Guardar</button>
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
```

`src/componentes/horario/FilaClase.tsx`:

```tsx
import { horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import { datosAsignatura } from './colores';

// Una clase en la lista del día del calendario: sin casilla, se toca para ver los detalles.
export function FilaClase({ clase, asignaturas, alElegir }: { clase: ClaseDelDia; asignaturas: Asignatura[]; alElegir(c: ClaseDelDia): void }) {
  const { nombre, color } = datosAsignatura(asignaturas, clase.asignatura);
  return (
    <li className="fila-tarea fila-clase">
      <span className="sin-casilla" aria-hidden="true" />
      <span className="punto" style={{ background: color }} />
      <button className="titulo-tarea" onClick={() => alElegir(clase)}>
        🎓 {horaBonita(clase.inicio)} {nombre}
      </button>
      {clase.aula && <span className="detalle">{clase.aula.split(' · ')[0]}</span>}
    </li>
  );
}
```

Estilos al final de `src/estilos.css`:

```css
/* Horario de clases */
.horario { display: grid; grid-template-columns: 44px repeat(5, minmax(0, 1fr)); gap: 4px; margin: 12px 0; }
.horario-cabecera { display: block; height: 22px; text-align: center; font-size: 12px; color: var(--suave); }
.horario-dia.hoy .horario-cabecera { color: var(--acento); font-weight: 700; }
.horario-columna { position: relative; height: calc(var(--filas) * 56px); border-top: 1px solid var(--borde-suave); background: repeating-linear-gradient(to bottom, transparent 0 55px, var(--borde-suave) 55px 56px); }
.horario-hora { position: absolute; right: 4px; transform: translateY(-50%); font-size: 11px; color: var(--suave); }
.clase-bloque { position: absolute; left: 2px; right: 2px; display: flex; flex-direction: column; gap: 1px; padding: 4px 6px; border-radius: 6px; border: none; border-left: 3px solid; text-align: left; font-size: 12px; overflow: hidden; color: var(--texto); }
.clase-bloque strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.clase-bloque.quitada { text-decoration: line-through; opacity: 0.5; }
.clase-bloque.suelta { border-left-style: dashed; }
.clase-marca { align-self: flex-start; font-size: 10px; padding: 0 4px; border-radius: 4px; background: var(--superficie); }
.clase-aula { font-size: 11px; color: var(--suave); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea-clases { display: block; width: 100%; text-align: left; margin: 0 0 16px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--borde); background: var(--superficie); }
@media (max-width: 600px) {
  .horario { grid-template-columns: 30px repeat(5, minmax(0, 1fr)); gap: 2px; }
  .clase-bloque { padding: 2px 3px; font-size: 10px; }
  .clase-aula, .clase-marca { display: none; }
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run src/componentes/horario/horario.test.tsx`
Expected: PASS. (Ojo: `renderToString` mete `<!-- -->` entre trozos de texto de JSX como `{a} {b}`; por eso los textos que las pruebas buscan enteros van en una sola plantilla `{`${a} ${b}`}`.)

- [ ] **Step 5: Commit**

```bash
git add src/componentes/horario src/estilos.css
git commit -m "Horario: cuadrícula, ventana de una clase y clase suelta"
```

Registro: `Task 7: piezas de pantalla del horario hechas (commit <sha>).`

---

### Task 8: El horario en el Calendario y abrir la asignatura en Estudio

**Files:**
- Modify: `src/componentes/navegacion.ts`
- Modify: `src/App.tsx`
- Modify: `src/pantallas/Estudio.tsx`
- Modify: `src/pantallas/Calendario.tsx`
- Create: `src/estado/clasesVisibles.ts`
- Test: `src/estado/clasesVisibles.test.ts`

**Interfaces:**
- Consumes: `useHorario` (Task 6); `clasesDelDia`, `clasesActivas`, `quitarClase`, `volverAPoner`, `anadirSuelta`, `borrarSuelta` (Task 5); componentes de la Task 7.
- Produces:
  - `Destino` gana `asignatura?: string` (Estudio → Aula virtual de esa asignatura) y `vista?: 'horario'` (Calendario).
  - `leerClasesVisibles(): boolean` y `guardarClasesVisibles(v: boolean): void` en `src/estado/clasesVisibles.ts` (clave `sc-calendario-clases`; sin almacenamiento → `false`).
  - `Calendario` recibe `ir(d: Destino): void` y `vistaInicial?: 'horario'`.
  - `Estudio` recibe `asignaturaInicial?: string`.

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/estado/clasesVisibles.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarClasesVisibles, leerClasesVisibles } from './clasesVisibles';

afterEach(() => vi.unstubAllGlobals());

describe('pastilla de clases del calendario', () => {
  it('empieza apagada (sin nada guardado o sin almacenamiento)', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    expect(leerClasesVisibles()).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } });
    expect(leerClasesVisibles()).toBe(false);
    expect(() => guardarClasesVisibles(true)).not.toThrow();
  });
  it('se recuerda en el dispositivo', () => {
    const guardado = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => guardado.get(k) ?? null, setItem: (k: string, v: string) => guardado.set(k, v) });
    guardarClasesVisibles(true);
    expect(leerClasesVisibles()).toBe(true);
    guardarClasesVisibles(false);
    expect(leerClasesVisibles()).toBe(false);
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run src/estado/clasesVisibles.test.ts`
Expected: FAIL (no existe `./clasesVisibles`).

- [ ] **Step 3: Escribir el código**

`src/estado/clasesVisibles.ts`:

```ts
// La pastilla «🎓 Clases» del calendario: apagada por defecto y recordada en cada dispositivo (spec horario §6).
const CLAVE = 'sc-calendario-clases';

export function leerClasesVisibles(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function guardarClasesVisibles(v: boolean): void {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0');
  } catch {
    // sin almacenamiento: no se recuerda
  }
}
```

`src/componentes/navegacion.ts`, en `Destino`, detrás de `aula?: boolean;`:

```ts
  asignatura?: string; // Estudio: abrir el Aula virtual de esa asignatura
  vista?: 'horario'; // Calendario: abrir la vista Horario
```

`src/pantallas/Estudio.tsx`:

```tsx
export function Estudio({ aulaInicial = false, asignaturaInicial }: { aulaInicial?: boolean; asignaturaInicial?: string }) {
  const { datos, soloLectura } = useDatos();
  const local = useLocal();
  const asignaturas = [GENERAL, ...datos.asignaturas];
  const [elegida, setElegida] = useState(() => asignaturaInicial ?? (aulaInicial ? GENERAL.id : (leerPreferencia(CLAVE) ?? GENERAL.id)));
  const [vista, setVista] = useState<'chat' | 'aula'>(aulaInicial || asignaturaInicial ? 'aula' : 'chat');
```

(el resto igual).

`src/App.tsx`:

```tsx
        {actual === 'calendario' && <Calendario key={visita} editar={editar} ir={ir} diaInicial={destino.dia} vistaInicial={destino.vista} />}
```

```tsx
        {actual === 'estudio' && <Estudio key={visita} aulaInicial={destino.aula === true} asignaturaInicial={destino.asignatura} />}
```

`src/pantallas/Calendario.tsx`:

1. Imports nuevos:

```tsx
import { anadirSuelta, borrarSuelta, clasesActivas, clasesDelDia, quitarClase, volverAPoner, type ClaseDelDia } from '../agenda/horario';
import { CuadriculaHorario } from '../componentes/horario/CuadriculaHorario';
import { FilaClase } from '../componentes/horario/FilaClase';
import { FormClaseSuelta } from '../componentes/horario/FormClaseSuelta';
import { VentanaClase } from '../componentes/horario/VentanaClase';
import type { Destino } from '../componentes/navegacion';
import { guardarClasesVisibles, leerClasesVisibles } from '../estado/clasesVisibles';
import { useHorario } from '../estado/horario';
```

2. `type Vista = 'mes' | 'semana' | 'horario';` y la firma:

```tsx
export function Calendario({ editar, ir, diaInicial, vistaInicial }: { editar(e: Edicion): void; ir(d: Destino): void; diaInicial?: ISODate; vistaInicial?: 'horario' }) {
```

3. Estado nuevo, junto al resto:

```tsx
  const [vista, setVista] = useState<Vista>(vistaInicial ?? 'mes');
  const { horario, cambiarAjustes } = useHorario();
  const [conClases, setConClases] = useState(leerClasesVisibles);
  const [claseAbierta, setClaseAbierta] = useState<ClaseDelDia | null>(null);
  const [nuevaSuelta, setNuevaSuelta] = useState(false);
  const alternarClases = () => {
    setConClases((v) => {
      guardarClasesVisibles(!v);
      return !v;
    });
  };
  const clasesDe = (dia: ISODate) => (conClases ? clasesActivas(horario.clases, horario.ajustes, dia) : []);
  const cambiarClase = async (cambio: Parameters<typeof cambiarAjustes>[0], mensaje: string) => {
    if (await cambiarAjustes(cambio, mensaje)) setClaseAbierta(null);
  };
```

(sustituye la línea `const [vista, setVista] = useState<Vista>('mes');` que ya existe).

4. Semanas y título: la vista Horario usa la semana de lunes a viernes y se mueve de semana en semana:

```tsx
  const semanas = vista === 'mes' ? cuadriculaMes(fecha.getFullYear(), fecha.getMonth() + 1) : [diasSemana(seleccionado)];
  const titulo = vista === 'mes' ? nombreMes(fecha.getFullYear(), fecha.getMonth() + 1) : `Semana del ${formatoCorto(semanas[0][0])}`;
  const maximo = vista === 'mes' ? 3 : 8;
  const mover = (n: number) => setSeleccionado((s) => (vista === 'mes' ? sumarMeses(s, n) : addDays(s, 7 * n)));
```

5. En la barra de arriba, sustituir el botón «Ver semana / Ver mes» por tres:

```tsx
        <div className="pestanas" role="tablist">
          {(['mes', 'semana', 'horario'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : '🎓 Horario'}
            </button>
          ))}
        </div>
```

6. En `filtros-areas`, justo detrás del botón «Todo»:

```tsx
        <button className={`pastilla${conClases ? ' encendida' : ''}`} aria-pressed={conClases} onClick={alternarClases}>
          🎓 Clases
        </button>
```

7. Cuando `vista === 'horario'`, en lugar de la cabecera `cal-cabecera`, las semanas, la barra del día y la lista del día, se pinta:

```tsx
      {vista === 'horario' ? (
        <>
          <CuadriculaHorario
            dias={semanas[0].slice(0, 5)}
            clases={semanas[0].slice(0, 5).map((d) => clasesDelDia(horario.clases, horario.ajustes, d))}
            asignaturas={datos.asignaturas}
            hoy={hoy}
            alElegir={setClaseAbierta}
          />
          {horario.clases.length === 0 && <p className="vacio">Todavía no hay horario: aparece después de la próxima sincronización de la uni.</p>}
          <button disabled={soloLectura} onClick={() => setNuevaSuelta(true)}>+ Clase suelta</button>
        </>
      ) : (
        <>
          {/* aquí va, sin cambios, todo lo que había: cal-cabecera, semanas, barra del día y lista */}
        </>
      )}
```

Envolver en el segundo fragmento el bloque existente (desde `<div className={\`cal-cabecera ${vista}\`}>` hasta el `</ul>` final), con estos dos añadidos:

- Dentro de cada `cal-dia`, antes de las etiquetas de tareas:

```tsx
                {clasesDe(dia).length > 0 && (
                  <span className="etiqueta-tarea" style={{ borderLeftColor: 'var(--suave)' }}>
                    🎓 {vista === 'mes' ? clasesDe(dia).length : clasesDe(dia).map((c) => c.inicio.replace(/^0/, '')).join(' · ')}
                  </span>
                )}
```

- En la lista del día, antes de las tareas:

```tsx
        {clasesDe(seleccionado).map((c) => (
          <FilaClase key={`${c.inicio}-${c.asignatura}`} clase={c} asignaturas={datos.asignaturas} alElegir={setClaseAbierta} />
        ))}
```

8. Ventanas, al final del `<section>` (junto a `VentanaArea`):

```tsx
      {claseAbierta && (
        <VentanaClase
          clase={claseAbierta}
          asignaturas={datos.asignaturas}
          bloqueado={soloLectura}
          cerrar={() => setClaseAbierta(null)}
          alAbrir={() => ir({ pantalla: 'estudio', asignatura: claseAbierta.asignatura })}
          alQuitar={() => void cambiarClase((a) => quitarClase(a, claseAbierta), 'Quitar una clase del horario')}
          alPoner={() => void cambiarClase((a) => volverAPoner(a, claseAbierta), 'Volver a poner una clase del horario')}
          alBorrar={() => void cambiarClase((a) => borrarSuelta(a, claseAbierta), 'Borrar una clase suelta')}
        />
      )}
      {nuevaSuelta && (
        <FormClaseSuelta
          asignaturas={datos.asignaturas}
          dia={seleccionado}
          cerrar={() => setNuevaSuelta(false)}
          guardar={(s) => {
            setNuevaSuelta(false);
            void cambiarAjustes((a) => anadirSuelta(a, s), 'Añadir una clase suelta');
          }}
        />
      )}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run src/estado/clasesVisibles.test.ts` y después `npm test` y `npm run build`
Expected: todo PASS y sin errores de tipos.

- [ ] **Step 5: Mirarlo en el navegador**

Run: `npm run dev` y abrir http://localhost:5173/segundo-cerebro-app/ → Calendario. Comprobar: la pastilla «🎓 Clases» sale apagada; la pestaña «🎓 Horario» enseña la cuadrícula (vacía con el aviso si aún no hay `horario.yaml`). Si en `my-context` aún no hay `horario.yaml` en GitHub, la cuadrícula se prueba después de la Tarea 10.

- [ ] **Step 6: Commit**

```bash
git add src/componentes/navegacion.ts src/App.tsx src/pantallas/Estudio.tsx src/pantallas/Calendario.tsx src/estado/clasesVisibles.ts src/estado/clasesVisibles.test.ts
git commit -m "Calendario: vista Horario, pastilla de clases y abrir la asignatura"
```

Registro: `Task 8: horario en el calendario hecho (commit <sha>).`

---

### Task 9: «Ahora / Siguiente» en el Inicio

**Files:**
- Create: `src/componentes/horario/LineaClases.tsx`
- Modify: `src/pantallas/Inicio.tsx`
- Test: `src/componentes/horario/LineaClases.test.tsx`

**Interfaces:**
- Consumes: `ahoraYSiguiente`, `horaBonita` (Task 5); `datosAsignatura` (Task 7); `Horario` (Task 6); `Destino` con `vista` (Task 8).
- Produces: `<LineaClases horario={Horario} asignaturas={Asignatura[]} ahora={Date} ir={(d: Destino) => void} />`

- [ ] **Step 1: Escribir la prueba (que falle)**

`src/componentes/horario/LineaClases.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LineaClases } from './LineaClases';

const asignaturas = [
  { id: 'calculo', nombre: 'Cálculo', color: '#36ace7' },
  { id: 'algebra', nombre: 'Álgebra', color: '#db5629' },
];
const horario = {
  clases: [
    { fecha: '2026-10-07', inicio: '09:00', fin: '11:00', asignatura: 'calculo', aula: 'Aula 3S2 · Aulario III' },
    { fecha: '2026-10-07', inicio: '11:00', fin: '13:00', asignatura: 'algebra', aula: 'Aula 3S4 · Aulario III' },
    { fecha: '2026-10-08', inicio: '09:00', fin: '11:00', asignatura: 'algebra' },
  ],
  ajustes: { quitadas: [], sueltas: [] },
};
const linea = (cuando: string) => renderToString(<LineaClases horario={horario} asignaturas={asignaturas} ahora={new Date(cuando)} ir={() => undefined} />);

describe('línea de clases del Inicio', () => {
  it('en clase: ahora y siguiente', () => {
    const html = linea('2026-10-07T10:00:00');
    expect(html).toContain('Ahora: Cálculo · Aula 3S2 · hasta las 11:00');
    expect(html).toContain('Siguiente: Álgebra · 11:00');
  });
  it('antes de empezar: solo la siguiente, con su aula', () => {
    expect(linea('2026-10-07T08:00:00')).toContain('Siguiente: Cálculo · 9:00 · Aula 3S2');
  });
  it('después de la última: la primera de mañana', () => {
    expect(linea('2026-10-07T14:00:00')).toContain('Mañana: Álgebra · 9:00');
  });
  it('sin clases hoy ni mañana: nada', () => {
    expect(linea('2026-10-10T10:00:00')).toBe('');
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run src/componentes/horario/LineaClases.test.tsx`
Expected: FAIL (no existe `./LineaClases`).

- [ ] **Step 3: Escribir el código**

`src/componentes/horario/LineaClases.tsx`:

```tsx
import { ahoraYSiguiente, horaBonita, type ClaseDelDia } from '../../agenda/horario';
import type { Asignatura } from '../../datos/asignaturas';
import type { Horario } from '../../repositorio';
import type { Destino } from '../navegacion';
import { datosAsignatura } from './colores';

const aulaCorta = (c: ClaseDelDia) => (c.aula ? ` · ${c.aula.split(' · ')[0]}` : '');

// Una línea en el Inicio: la clase en curso y la siguiente (o la primera de mañana). Sin clases, no sale.
export function LineaClases({ horario, asignaturas, ahora, ir }: { horario: Horario; asignaturas: Asignatura[]; ahora: Date; ir(d: Destino): void }) {
  const { enCurso, siguiente, esManana } = ahoraYSiguiente(horario.clases, horario.ajustes, ahora);
  if (!enCurso && !siguiente) return null;
  const nombre = (c: ClaseDelDia) => datosAsignatura(asignaturas, c.asignatura).nombre;
  const partes: string[] = [];
  if (enCurso) partes.push(`Ahora: ${nombre(enCurso)}${aulaCorta(enCurso)} · hasta las ${horaBonita(enCurso.fin)}`);
  if (siguiente) {
    const texto = `${esManana ? 'Mañana' : 'Siguiente'}: ${nombre(siguiente)} · ${horaBonita(siguiente.inicio)}`;
    partes.push(enCurso ? texto : `${texto}${aulaCorta(siguiente)}`);
  }
  return (
    <button className="linea-clases" onClick={() => ir({ pantalla: 'calendario', vista: 'horario' })}>
      {`🎓 ${partes.join(' — ')}`}
    </button>
  );
}
```

`src/pantallas/Inicio.tsx`:
- Imports: `import { LineaClases } from '../componentes/horario/LineaClases';` y `import { useHorario } from '../estado/horario';`
- Dentro de `Inicio`, junto a `useAvisos`: `const { horario } = useHorario();`
- Detrás de `<LineaAvisos avisos={avisos} ir={ir} />`: `<LineaClases horario={horario} asignaturas={datos.asignaturas} ahora={ahora} ir={ir} />`

(`ahora` ya viene de `useAhora()`, que avanza cada minuto.)

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run src/componentes/horario/LineaClases.test.tsx`, `npm test` y `npm run build`
Expected: todo PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/componentes/horario/LineaClases.tsx src/componentes/horario/LineaClases.test.tsx src/pantallas/Inicio.tsx
git commit -m "Inicio: línea de la clase actual y la siguiente"
```

Registro: `Task 9: línea de clases en el Inicio hecha (commit <sha>).`

---

### Task 10: Datos de Diego, workflow, documentación y comprobación final

**Files:**
- Create: `../my-context/estudios/horario-ajustes.yaml`
- Modify: `../my-context/.github/workflows/uni.yml`
- Modify: `../my-context/AGENTS.md`
- Modify: `docs/diseno.md` (sección 3)
- Modify: `AGENTS.md` (Estructura del código y Estado actual)

- [ ] **Step 1: `horario-ajustes.yaml` de Diego**

En `../my-context` hacer `git pull` y crear `estudios/horario-ajustes.yaml`:

```yaml
grupo: "G_ROBOT_1A(F)"
curso: 1
desdoble: G2
quitadas:
  - fecha: 2026-09-24
    inicio: "09:00"
    asignatura: electronica-digital
sueltas:
  - fecha: 2026-10-15
    inicio: "11:00"
    fin: "13:00"
    asignatura: electronica-digital
    nota: Recuperación
```

Comprobar que se lee: `node -e "import('./src/datos/horario.ts').then((h) => console.log(h.parseAjustesHorario(require('fs').readFileSync('../my-context/estudios/horario-ajustes.yaml','utf8'))))"` (desde la carpeta de la app).

- [ ] **Step 2: El workflow acepta el código 3**

En `../my-context/.github/workflows/uni.yml`, dentro del `run:` de «Sincronizar y subir», sustituir el bucle por:

```bash
          estado=0
          for intento in 1 2 3; do
            node ../app/sincronizar/uni.ts . > "$RUNNER_TEMP/resumen.txt" || estado=$?
            # 3 = solo ha fallado el horario: se sube lo demás y al final se avisa del fallo
            if [ "$estado" -ne 0 ] && [ "$estado" -ne 3 ]; then exit "$estado"; fi
            cat "$RUNNER_TEMP/resumen.txt"
            if [ -z "$(git status --porcelain)" ]; then echo "Sin novedades"; exit "$estado"; fi
            git add -A
            git commit -q -m "$(tail -n 1 "$RUNNER_TEMP/resumen.txt")"
            if git push -q; then exit "$estado"; fi
            echo "Alguien ha subido cambios a la vez: reintento con lo nuevo"
            git reset -q --hard HEAD~1
            git pull -q --ff-only
            estado=0
          done
          echo "No se ha podido subir tras 3 intentos"
          exit 1
```

(Antes de sustituir, leer el bloque actual completo: las líneas `git config` del principio se quedan igual.)

- [ ] **Step 3: Documentación**

`docs/diseno.md`, sección 3:
- En «Aula virtual (parte C)» → `estudios/avisos.yaml`: añadir `leidoEl: 2026-10-04   # el día en que se marcó como leído (solo si leido: true)` al ejemplo, y cambiar «Se quitan los avisos leídos de hace más de 60 días» por «La app solo cambia `leido` y `leidoEl`. Un aviso leído se ve 30 días desde `leidoEl`; después la app lo oculta y el programa del PC lo borra (a los leídos sin `leidoEl` les pone la fecha del día)». Cambiar también «El programa añade avisos y nunca cambia `leido`» por «El programa añade avisos, nunca cambia `leido` y solo rellena `leidoEl` si falta».
- Nueva subsección `### Horario de clases` detrás de «Uni: `estudios/uni-sincronizacion.yaml`», con los dos ejemplos de la spec §3.1 y §3.2 y estas reglas: `horario.yaml` lo escribe solo el workflow de la uni (no tocar); `horario-ajustes.yaml` lo escriben Diego, la app o Claude (la app solo cambia `quitadas` y `sueltas`); una quitada se reconoce por `fecha` + `inicio` + `asignatura`; las horas van entre comillas.

`../my-context/AGENTS.md`, sección «Agenda», detrás del párrafo «Uni: cada 3 horas…»:

```markdown
- Horario de clases: el mismo workflow guarda el horario de la URJC en `estudios/horario.yaml` (no lo toques). Mi grupo y mis cambios van en `estudios/horario-ajustes.yaml`: `grupo`, `curso`, `desdoble` (soy del G2), `quitadas` (una clase que no hay: `fecha`, `inicio`, `asignatura`) y `sueltas` (clases añadidas: `fecha`, `inicio`, `fin`, `asignatura`, y opcionales `aula` y `nota`). Si un profe avisa de que no hay clase o de una recuperación, apúntalo ahí. Horas entre comillas, como `"09:00"`.
- Avisos: al marcarlos como leídos la app guarda `leidoEl` (el día). Duran 30 días desde ese día.
```

Y en el recordatorio de 2º curso (septiembre de 2027), añadir: «y cambiar `grupo` y `curso` en `estudios/horario-ajustes.yaml` (grupos en https://servicios.urjc.es/horarios/calendario-grado)».

`AGENTS.md` (este repositorio), en «Estructura del código», detrás de la línea de `src/uni/` y `sincronizar/uni.ts`:

```markdown
- Horario de clases: `src/uni/horario.ts` (leer la web de horarios de la URJC; lo usa `sincronizar/uni.ts`, que sale con código 3 si solo falla el horario), `src/datos/horario.ts` (formato de `estudios/horario.yaml` y `horario-ajustes.yaml`), `src/agenda/horario.ts` (clases del día, «Ahora / Siguiente», cambios a mano), `src/estado/horario.ts` (`useHorario`, con copia en el dispositivo) y `src/componentes/horario/` (cuadrícula, ventana de una clase, clase suelta, línea del Inicio).
```

- [ ] **Step 4: Comprobación final**

Run: `npm test` y `npm run build`
Expected: todo PASS. Apuntar en el registro cuántas pruebas hay.

- [ ] **Step 5: Commits (sin subir)**

```bash
git add docs/diseno.md AGENTS.md
git commit -m "Docs: horario de clases y avisos que caducan"
cd ../my-context && git pull && git add estudios/horario-ajustes.yaml .github/workflows/uni.yml AGENTS.md && git commit -m "Horario de clases: mi grupo, cambios a mano y workflow"
```

**No hacer `git push`.** Decirle a Diego que está todo listo para publicar y pedirle permiso. Al publicar (con su permiso): `git push` en los dos repositorios, lanzar el workflow a mano (`gh workflow run uni.yml -R Dino768/my-context`), comprobar que termina bien y que aparece `estudios/horario.yaml`, y después actualizar «Estado actual» en `AGENTS.md` y el párrafo «Dónde lo dejamos» de `my-context/proyectos/segundo-cerebro.md`.

Registro: `Task 10: datos, workflow y documentación hechos (commits <sha app>, <sha my-context>).`
