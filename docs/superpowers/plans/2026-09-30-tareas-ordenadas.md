# v1.5 Tareas ordenadas. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tipos de tarea (tarea, entrega, examen, recado, evento), exámenes y entregas que solo llegan a las listas principales cuando se acercan (con prioridad automática), repeticiones mensuales/anuales con fecha de fin, pantalla de Tareas con tarjetas «Ahora» y «Por áreas», tarjeta «Próximos exámenes» en el Inicio y la sincronización de la uni creando exámenes y entregas con su tipo.

**Architecture:** Lógica sin pantalla en `src/agenda/` (tipos, cuándo ocurre, plazos, grupos, formulario) con pruebas unitarias; las pantallas (`FilaTarea`, `FormTarea`, `Tareas`, `Inicio`) solo pintan lo que devuelve esa lógica. El formato gana tres campos opcionales (`tipo`, `hasta` y `repetir: mes|año`). La sincronización de la uni (`src/uni/`) pasa a escribir `tipo` y deja de escribir prioridad e icono.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (entorno `node`, pantallas con `renderToString`), paquete `yaml`. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-30-tareas-ordenadas-design.md`

## Global Constraints

- Habla con Diego en español sencillo. Textos de la app y comentarios en español.
- Node está en `C:\Program Files\nodejs`. En Bash: `export PATH="$PATH:/c/Program Files/nodejs";` delante de cada comando.
- Pruebas: `npm test`. Tipos y compilación: `npm run build`.
- **Los archivos con barras invertidas (`\`) se escriben con la herramienta Write/Edit, nunca con heredocs de Bash** (Bash se come las dobles, ver registro de la parte A).
- Importan con extensión `.ts` (los ejecuta Node sin compilar): `src/datos/tareas.ts`, `src/datos/asignaturas.ts`, `src/uni/*`, `sincronizar/*`, y el nuevo `src/agenda/tipos.ts` (lo importa `scripts/iconos.ts`). El resto de la app, sin extensión.
- Tipos (spec §2): `TIPOS = ['tarea', 'entrega', 'examen', 'recado', 'evento']`; `tarea` es el valor por defecto y no se escribe en el archivo.
- Iconos de tipo (spec §4): tarea `checkbox`, entrega `file-upload`, examen `school`, recado `shopping-cart`, evento `calendar-event`. Van en los iconos básicos (se ven sin conexión).
- Plazos (spec §3): examen aparece a ≤ 21 días (media) y alta a ≤ 7; entrega aparece a ≤ 14 (media) y alta a ≤ 3. Fuera de plazo, prioridad calculada `baja`. La `prioridad` escrita a mano siempre manda.
- `repetir`: lista de días, `mes` o `año`. `mes`/`año` necesitan `fecha`. `hasta` solo con `repetir` y no anterior a `fecha`. «Durante N» → `hasta` = el día antes de cumplirse (1 oct + 1 mes = 31 oct).
- Grupos de «Ahora» (spec §4), en orden: Atrasadas, Hoy, Se acerca, Próximas, Recados, Se repiten (plegado), Sin fecha (plegado). **Los grupos vacíos no se devuelven ni se pintan.**
- Eventos: sin casilla, nunca atrasados, `hechaEl` siempre `false`.
- Examen pasado: nunca atrasado. Entrega pasada sin hacer: atrasada.
- Ruling (del plan): el área por defecto de **cualquier** tarea nueva (no solo recados) es la última usada en ese dispositivo (si existe), luego la primera área. Coste si Diego no lo quiere: una línea.
- Trabajo en la rama `v1.5-tareas-ordenadas` (se crea en la Tarea 1). Nunca `git push` sin que Diego lo sepa.
- Cada tarea deja su línea en `.superpowers/sdd/2026-09-30-tareas-ordenadas/progress.md`. Lo que se aparte del plan se apunta como `Ruling:`.

## Review Focus

- Una tarea de Diego guardada por la app antigua (sin `tipo`, `repetir` como lista) → se sigue viendo igual (tipo tarea, misma repetición). Prueba en la Tarea 2.
- Un evento que se repite «cada mes» el día 31, en febrero y en abril → sale el último día del mes, y no después de `hasta`. Prueba en la Tarea 2.
- El formulario con `hasta` anterior a la fecha de inicio → no guarda (la app escribiría un archivo que luego no sabría leer) y avisa. Prueba en la Tarea 6.
- Cambiar una tarea de «Tarea» a «Evento» en el formulario → se quitan prioridad y proyecto (no aplican) y no se queda con casilla. Prueba en la Tarea 6.
- La sincronización de la uni y la app escriben el mismo `tareas.yaml`: una tarea importada editada en la app conserva `origen` y `tipo`. Prueba en la Tarea 6 (`tareaDelFormulario` parte de `...original`).

---

### Task 1: Formato: `tipo`, `repetir: mes|año` y `hasta`; tipos e iconos

**Files:**
- Modify: `src/datos/tareas.ts`
- Create: `src/agenda/tipos.ts`
- Modify: `scripts/iconos.ts` (y regenerar `src/iconos/basicos.ts`)
- Test: `src/datos/tareas.test.ts`, `src/agenda/tipos.test.ts`

**Interfaces:**
- Produces:
  - `export const TIPOS = ['tarea', 'entrega', 'examen', 'recado', 'evento'] as const; export type TipoTarea = (typeof TIPOS)[number];` en `src/datos/tareas.ts`
  - `export type Repeticion = Dia[] | 'mes' | 'año';` y en `Tarea`: `tipo?: TipoTarea; repetir?: Repeticion; hasta?: ISODate;`
  - `src/agenda/tipos.ts`: `ICONO_TIPO`, `NOMBRE_TIPO`, `PLURAL_TIPO` (`Record<TipoTarea, string>`), `CAMPOS_TIPO: Record<TipoTarea, { prioridad: boolean; hora: boolean; repetir: boolean; proyecto: boolean; notas: boolean }>`, `tipoDe(t: { tipo?: TipoTarea }): TipoTarea`

- [ ] **Step 1: Crear la rama y el registro**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout -b v1.5-tareas-ordenadas
mkdir -p .superpowers/sdd/2026-09-30-tareas-ordenadas
echo "# SDD ledger — plan: docs/superpowers/plans/2026-09-30-tareas-ordenadas.md" > .superpowers/sdd/2026-09-30-tareas-ordenadas/progress.md
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Añade al final de `src/datos/tareas.test.ts`:

```ts
describe('tipo, repetir mes/año y hasta', () => {
  const una = (extra: string) => parseTareas(`- id: t-1\n  titulo: X\n  area: uni\n${extra}`)[0];
  it('se leen', () => {
    expect(una('  tipo: evento\n  fecha: 2026-10-01\n  repetir: [lun, mie]\n  hasta: 2026-10-31\n')).toMatchObject({ tipo: 'evento', repetir: ['lun', 'mie'], hasta: '2026-10-31' });
    expect(una('  fecha: 2026-10-05\n  repetir: mes\n').repetir).toBe('mes');
    expect(una('  fecha: 2027-03-14\n  repetir: año\n').repetir).toBe('año');
  });
  it('una tarea antigua sin tipo sigue igual', () => {
    const t = una('  repetir: [vie]\n');
    expect(t.tipo).toBeUndefined();
    expect(t.repetir).toEqual(['vie']);
  });
  it('errores', () => {
    expect(() => una('  tipo: cita\n')).toThrow('tipo debe ser');
    expect(() => una('  repetir: semana\n')).toThrow('repetir debe ser');
    expect(() => una('  repetir: mes\n')).toThrow('necesita fecha');
    expect(() => una('  hasta: 2026-10-31\n')).toThrow('hasta solo vale');
    expect(() => una('  fecha: 2026-10-10\n  repetir: [lun]\n  hasta: 2026-10-01\n')).toThrow('anterior a fecha');
    expect(() => una('  repetir: [lun]\n  hasta: mañana\n')).toThrow('hasta debe tener');
  });
});
```

Crea `src/agenda/tipos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TIPOS } from '../datos/tareas';
import { BASICOS } from '../iconos/basicos';
import { CAMPOS_TIPO, ICONO_TIPO, NOMBRE_TIPO, PLURAL_TIPO, tipoDe } from './tipos';

describe('tipos de tarea', () => {
  it('sin tipo es una tarea', () => {
    expect(tipoDe({})).toBe('tarea');
    expect(tipoDe({ tipo: 'examen' })).toBe('examen');
  });
  it('cada tipo tiene nombre, plural, campos e icono básico (se ve sin conexión)', () => {
    for (const t of TIPOS) {
      expect(NOMBRE_TIPO[t]).toBeTruthy();
      expect(PLURAL_TIPO[t]).toBeTruthy();
      expect(CAMPOS_TIPO[t]).toBeDefined();
      expect(BASICOS[ICONO_TIPO[t]]).toBeDefined();
    }
  });
  it('recados y eventos no tienen prioridad; exámenes y entregas no se repiten', () => {
    expect(CAMPOS_TIPO.recado).toEqual({ prioridad: false, hora: false, repetir: false, proyecto: false, notas: false });
    expect(CAMPOS_TIPO.evento.prioridad).toBe(false);
    expect(CAMPOS_TIPO.evento.repetir).toBe(true);
    expect(CAMPOS_TIPO.examen.repetir).toBe(false);
    expect(CAMPOS_TIPO.entrega.repetir).toBe(false);
  });
});
```

- [ ] **Step 3: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/datos/tareas.test.ts src/agenda/tipos.test.ts`
Expected: FAIL (no existe `./tipos`; `tipo debe ser`, `necesita fecha`… no se lanzan; `repetir: mes` da el error viejo).

- [ ] **Step 4: Implementar**

`src/datos/tareas.ts`:
- Después de `PRIORIDADES`, añade:
  ```ts
  export const TIPOS = ['tarea', 'entrega', 'examen', 'recado', 'evento'] as const;
  export type TipoTarea = (typeof TIPOS)[number];
  // Días de la semana, o cada mes / cada año el mismo día que `fecha`.
  export type Repeticion = Dia[] | 'mes' | 'año';
  ```
- En `interface Tarea`: `repetir?: Dia[];` pasa a `repetir?: Repeticion;`, y añade después de `titulo`/`icono` (el orden de la interfaz no importa) `tipo?: TipoTarea; // sin tipo = tarea` y después de `repetir` `hasta?: ISODate; // último día de una repetición`.
- En `problema`, sustituye la línea de `repetir` por:
  ```ts
    if (t.tipo !== undefined && !(TIPOS as readonly unknown[]).includes(t.tipo))
      return 'tipo debe ser tarea, entrega, examen, recado o evento';
    const cadaMesOAno = t.repetir === 'mes' || t.repetir === 'año';
    if (t.repetir !== undefined && !cadaMesOAno && (!Array.isArray(t.repetir) || !t.repetir.every((d) => (DIAS as readonly unknown[]).includes(d))))
      return 'repetir debe ser una lista de días (lun, mar, mie, jue, vie, sab, dom), «mes» o «año»';
    if (cadaMesOAno && t.fecha === undefined) return `repetir: ${t.repetir as string} necesita fecha (el día que se repite)`;
    if (t.hasta !== undefined) {
      if (!isISODate(t.hasta)) return 'hasta debe tener el formato AAAA-MM-DD';
      if (t.repetir === undefined) return 'hasta solo vale en una tarea que se repite';
      if (typeof t.fecha === 'string' && t.hasta < t.fecha) return 'hasta no puede ser anterior a fecha';
    }
  ```
  (La comprobación de `fecha` ya está antes, así que aquí `t.fecha` es una fecha válida o no existe.)

`src/agenda/tipos.ts` (con import `.ts`, porque lo importa `scripts/iconos.ts`):

```ts
import type { TipoTarea } from '../datos/tareas.ts';

export const ICONO_TIPO: Record<TipoTarea, string> = {
  tarea: 'checkbox', entrega: 'file-upload', examen: 'school', recado: 'shopping-cart', evento: 'calendar-event',
};
export const NOMBRE_TIPO: Record<TipoTarea, string> = {
  tarea: 'Tarea', entrega: 'Entrega', examen: 'Examen', recado: 'Recado', evento: 'Evento',
};
export const PLURAL_TIPO: Record<TipoTarea, string> = {
  tarea: 'Tareas', entrega: 'Entregas', examen: 'Exámenes', recado: 'Recados', evento: 'Eventos',
};

// Qué campos del formulario tiene cada tipo (spec §4).
export const CAMPOS_TIPO: Record<TipoTarea, { prioridad: boolean; hora: boolean; repetir: boolean; proyecto: boolean; notas: boolean }> = {
  tarea: { prioridad: true, hora: true, repetir: true, proyecto: true, notas: true },
  entrega: { prioridad: true, hora: true, repetir: false, proyecto: true, notas: true },
  examen: { prioridad: true, hora: true, repetir: false, proyecto: true, notas: true },
  recado: { prioridad: false, hora: false, repetir: false, proyecto: false, notas: false },
  evento: { prioridad: false, hora: true, repetir: true, proyecto: false, notas: false },
};

export function tipoDe(t: { tipo?: TipoTarea }): TipoTarea {
  return t.tipo ?? 'tarea';
}
```

`scripts/iconos.ts`:
- Añade `import { ICONO_TIPO } from '../src/agenda/tipos.ts';` debajo del import de `DICCIONARIO`.
- Sustituye `const usados = [...new Set(DICCIONARIO.map((e) => e.icono))].sort();` por:
  ```ts
  const usados = [...new Set([...DICCIONARIO.map((e) => e.icono), ...Object.values(ICONO_TIPO)])].sort();
  ```
- En el comentario de arriba: «solo los del diccionario y los de los tipos de tarea».

Regenera: `export PATH="$PATH:/c/Program Files/nodejs"; npm run iconos` (debe decir «… 52 básicos» o similar: 49 + los 3 que faltaban: `checkbox`, `file-upload`, `calendar-event`).

- [ ] **Step 5: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde. Si alguna prueba antigua de `src/datos/tareas.test.ts` comprueba el texto exacto «repetir debe ser una lista de días (lun, …)» con `toThrow` y un texto que ya no es prefijo, ajústala al mensaje nuevo (apúntalo como `Ruling:`). `FilaTarea.tsx` hace `tarea.repetir!.join(', ')`: si `tsc` se queja porque `repetir` ya puede ser texto, cámbialo provisionalmente por `(Array.isArray(tarea.repetir) ? tarea.repetir.join(', ') : tarea.repetir)` (la Tarea 5 lo sustituye por `describirRepeticion`). Lo mismo en `FormTarea.tsx`: `useState<Dia[]>(Array.isArray(original?.repetir) ? original.repetir : [])` (la Tarea 6 lo rehace).

- [ ] **Step 6: Commit**

```bash
git add src/datos/tareas.ts src/datos/tareas.test.ts src/agenda/tipos.ts src/agenda/tipos.test.ts scripts/iconos.ts src/iconos/basicos.ts src/componentes/FilaTarea.tsx src/componentes/FormTarea.tsx
git commit -m "v1.5: tipos de tarea, repetir cada mes/año y hasta en el formato"
```

---

### Task 2: Cuándo ocurre una tarea (mes, año, hasta) y eventos sin casilla

**Files:**
- Modify: `src/agenda/tareas.ts`
- Test: `src/agenda/tareas.test.ts`

**Interfaces:**
- Consumes: `Repeticion`, `TipoTarea` (Tarea 1), `tipoDe` (Tarea 1).
- Produces (en `src/agenda/tareas.ts`):
  - `esRepetida(t)` cierto para una lista no vacía, `'mes'` o `'año'`.
  - `ocurreEl(t, dia)` respeta `mes`, `año`, `fecha` (inicio) y `hasta`.
  - `hechaEl(t, dia)` es `false` para los eventos.
  - `repetidas(ts: Tarea[], hoy: ISODate): Tarea[]` (sin las que tienen `hasta` pasado). **Cambia la firma.**
  - `atrasadas` sin exámenes ni eventos; `sinFecha` sin recados.
  - `describirRepeticion(t: Tarea): string | undefined` → `cada lun, mie, vie`, `cada mes`, `cada año`, más ` hasta 31 oct` si tiene `hasta`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/agenda/tareas.test.ts`, añade `describirRepeticion` al import de `./tareas` y, en la prueba existente de `repetidas`, cambia `repetidas(ts)` por `repetidas(ts, hoy)`. Añade al final:

```ts
describe('repeticiones con mes, año y hasta', () => {
  it('días de la semana, no después de hasta', () => {
    const boxeo = t({ id: 'b', repetir: ['lun', 'mie', 'vie'], fecha: '2026-10-01', hasta: '2026-10-31' });
    expect(ocurreEl(boxeo, '2026-10-30')).toBe(true); // viernes
    expect(ocurreEl(boxeo, '2026-11-02')).toBe(false); // lunes, ya pasado hasta
    expect(ocurreEl(boxeo, '2026-09-28')).toBe(false); // lunes, antes de empezar
  });
  it('cada mes: el mismo día o el último del mes si no existe', () => {
    const m = t({ id: 'm', repetir: 'mes', fecha: '2026-10-31' });
    expect(ocurreEl(m, '2026-10-31')).toBe(true);
    expect(ocurreEl(m, '2026-11-30')).toBe(true);
    expect(ocurreEl(m, '2026-11-29')).toBe(false);
    expect(ocurreEl(m, '2027-02-28')).toBe(true);
    expect(ocurreEl(m, '2026-09-30')).toBe(false); // antes de empezar
    const conFin = t({ id: 'm2', repetir: 'mes', fecha: '2026-10-05', hasta: '2026-12-31' });
    expect(ocurreEl(conFin, '2026-12-05')).toBe(true);
    expect(ocurreEl(conFin, '2027-01-05')).toBe(false);
  });
  it('cada año: el mismo día; el 29 de febrero, el 28 en años no bisiestos', () => {
    const cumple = t({ id: 'c', repetir: 'año', fecha: '2027-03-14' });
    expect(ocurreEl(cumple, '2028-03-14')).toBe(true);
    expect(ocurreEl(cumple, '2028-03-15')).toBe(false);
    expect(ocurreEl(cumple, '2026-03-14')).toBe(false);
    const bisiesto = t({ id: 'f', repetir: 'año', fecha: '2028-02-29' });
    expect(ocurreEl(bisiesto, '2029-02-28')).toBe(true);
    expect(ocurreEl(bisiesto, '2032-02-29')).toBe(true);
    expect(ocurreEl(bisiesto, '2032-02-28')).toBe(false);
  });
  it('esRepetida con mes y año; una lista vacía no se repite', () => {
    expect(ocurreEl(t({ id: 'v', repetir: [], fecha: '2026-10-01' }), '2026-10-01')).toBe(true);
    expect(repetidas([t({ id: 'm', repetir: 'mes', fecha: '2026-10-05' })], '2026-10-01')).toHaveLength(1);
  });
  it('«Se repiten» no enseña las que ya terminaron', () => {
    const ts = [t({ id: 'fin', repetir: ['lun'], hasta: '2026-09-30' }), t({ id: 'sigue', repetir: ['lun'], hasta: '2026-10-31' })];
    expect(ids(repetidas(ts, '2026-10-01'))).toEqual(['sigue']);
  });
  it('describirRepeticion', () => {
    expect(describirRepeticion(t({ id: 'a', repetir: ['lun', 'vie'] }))).toBe('cada lun, vie');
    expect(describirRepeticion(t({ id: 'a', repetir: 'mes', fecha: '2026-10-05' }))).toBe('cada mes');
    expect(describirRepeticion(t({ id: 'a', repetir: 'año', fecha: '2026-10-05', hasta: '2030-10-05' }))).toMatch(/^cada año hasta 5 oct/);
    expect(describirRepeticion(t({ id: 'a' }))).toBeUndefined();
  });
});

describe('tipos en las listas', () => {
  const hoy = '2026-10-10';
  it('los eventos nunca están hechos ni atrasados', () => {
    const ev = t({ id: 'e', tipo: 'evento', fecha: '2026-10-01', hecha: true });
    expect(hechaEl(ev, '2026-10-01')).toBe(false);
    expect(atrasadas([ev], hoy)).toEqual([]);
  });
  it('un examen pasado no está atrasado; una entrega pasada sí', () => {
    const ts = [t({ id: 'ex', tipo: 'examen', fecha: '2026-10-01' }), t({ id: 'en', tipo: 'entrega', fecha: '2026-10-01' })];
    expect(ids(atrasadas(ts, hoy))).toEqual(['en']);
  });
  it('los recados sin fecha no van a «Sin fecha»', () => {
    expect(sinFecha([t({ id: 'r', tipo: 'recado' }), t({ id: 's' })]).map((x) => x.id)).toEqual(['s']);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/agenda/tareas.test.ts`
Expected: FAIL (`describirRepeticion` no existe; `mes`, `año` y `hasta` no se respetan; eventos y exámenes salen atrasados).

- [ ] **Step 3: Implementar**

`src/agenda/tareas.ts`:
- Imports: `import { siguienteIdTarea, type Prioridad, type Tarea } from '../datos/tareas';` se queda; cambia el de fechas a `import { diaDeSemana, formatoCorto, toISO, type Dia, type ISODate } from '../fechas';` y añade `import { tipoDe } from './tipos';`.
- Sustituye `esRepetida`, `ocurreEl` y `hechaEl` por:

```ts
export function esRepetida(t: Tarea): boolean {
  return t.repetir === 'mes' || t.repetir === 'año' || (Array.isArray(t.repetir) && t.repetir.length > 0);
}

const diasDelMes = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

// Cada mes el mismo día que `inicio`; si ese mes no lo tiene (31 en abril…), el último día del mes.
function mismoDiaDelMes(inicio: ISODate, dia: ISODate): boolean {
  const [y, m, d] = dia.split('-').map(Number);
  return d === Math.min(Number(inicio.slice(8, 10)), diasDelMes(y, m));
}

// Cada año el mismo día y mes; el 29 de febrero, el 28 en los años no bisiestos.
function mismoDiaDelAno(inicio: ISODate, dia: ISODate): boolean {
  const [y, m] = dia.split('-').map(Number);
  return Number(inicio.slice(5, 7)) === m && mismoDiaDelMes(inicio, dia);
}

export function ocurreEl(t: Tarea, dia: ISODate): boolean {
  if (!esRepetida(t)) return t.fecha === dia;
  if ((t.fecha && dia < t.fecha) || (t.hasta && dia > t.hasta)) return false;
  if (t.repetir === 'mes') return mismoDiaDelMes(t.fecha!, dia);
  if (t.repetir === 'año') return mismoDiaDelAno(t.fecha!, dia);
  return (t.repetir as Dia[]).includes(diaDeSemana(dia));
}

export function hechaEl(t: Tarea, dia: ISODate): boolean {
  if (tipoDe(t) === 'evento') return false; // los eventos no se marcan
  return esRepetida(t) ? (t.hechas ?? []).includes(dia) : t.hecha === true;
}

export function describirRepeticion(t: Tarea): string | undefined {
  if (!esRepetida(t)) return undefined;
  const cada = t.repetir === 'mes' ? 'cada mes' : t.repetir === 'año' ? 'cada año' : `cada ${(t.repetir as Dia[]).join(', ')}`;
  return t.hasta ? `${cada} hasta ${formatoCorto(t.hasta)}` : cada;
}
```

  Nota: `mismoDiaDelAno` con `inicio` 29 de febrero y `dia` 28 de febrero de un año no bisiesto: `Math.min(29, 28) = 28` → cierto. En bisiesto, `Math.min(29, 29) = 29` → el 28 no.

- `atrasadas`: en el `filter`, añade `&& tipoDe(t) !== 'examen' && tipoDe(t) !== 'evento'`.
- `repetidas`:
  ```ts
  export function repetidas(ts: Tarea[], hoy: ISODate): Tarea[] {
    return ts.filter((t) => esRepetida(t) && !(t.hasta && t.hasta < hoy)).sort((a, b) => compararHora(a, b) || compararPrioridad(a, b));
  }
  ```
- `sinFecha`: en el `filter`, añade `&& tipoDe(t) !== 'recado'`.
- `src/pantallas/Tareas.tsx`: `repetidas(datos.tareas)` → `repetidas(datos.tareas, hoy)` (la Tarea 7 rehace la pantalla).

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/agenda/tareas.ts src/agenda/tareas.test.ts src/pantallas/Tareas.tsx
git commit -m "v1.5: repetir cada mes/año con fecha de fin; eventos sin casilla; exámenes nunca atrasados"
```

---

### Task 3: Plazos y prioridad automática (`src/agenda/plazos.ts`)

**Files:**
- Create: `src/agenda/plazos.ts`
- Test: `src/agenda/plazos.test.ts`

**Interfaces:**
- Consumes: `tipoDe` (Tarea 1).
- Produces:
  - `export function faltan(fecha: ISODate, hoy: ISODate): number` (días; negativo si ya pasó)
  - `export function enPlazo(t: Tarea, hoy: ISODate): boolean` (examen/entrega con fecha, 0 ≤ faltan ≤ plazo de aparición)
  - `export function prioridadEfectiva(t: Tarea, hoy: ISODate): Prioridad`
  - `export function textoFaltan(n: number): string` → `hoy`, `mañana`, `faltan N días`

- [ ] **Step 1: Escribir la prueba que falla**

`src/agenda/plazos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import { addDays } from '../fechas';
import { enPlazo, faltan, prioridadEfectiva, textoFaltan } from './plazos';

const HOY = '2026-10-01';
const en = (dias: number, x: Partial<Tarea>): Tarea => ({ id: 'a', titulo: 'A', area: 'uni', fecha: addDays(HOY, dias), ...x });

describe('plazos', () => {
  it('faltan cuenta días naturales, también con cambio de hora', () => {
    expect(faltan('2026-10-01', HOY)).toBe(0);
    expect(faltan('2026-10-26', HOY)).toBe(25); // el 25 de octubre cambia la hora
    expect(faltan('2026-09-30', HOY)).toBe(-1);
  });
  it('exámenes: fuera a 22 días, media de 21 a 8, alta a 7 o menos', () => {
    const ex = (d: number) => en(d, { tipo: 'examen' });
    expect([enPlazo(ex(22), HOY), prioridadEfectiva(ex(22), HOY)]).toEqual([false, 'baja']);
    expect([enPlazo(ex(21), HOY), prioridadEfectiva(ex(21), HOY)]).toEqual([true, 'media']);
    expect(prioridadEfectiva(ex(8), HOY)).toBe('media');
    expect(prioridadEfectiva(ex(7), HOY)).toBe('alta');
    expect([enPlazo(ex(0), HOY), prioridadEfectiva(ex(0), HOY)]).toEqual([true, 'alta']);
  });
  it('entregas: fuera a 15 días, media de 14 a 4, alta a 3 o menos', () => {
    const e = (d: number) => en(d, { tipo: 'entrega' });
    expect([enPlazo(e(15), HOY), prioridadEfectiva(e(15), HOY)]).toEqual([false, 'baja']);
    expect([enPlazo(e(14), HOY), prioridadEfectiva(e(14), HOY)]).toEqual([true, 'media']);
    expect(prioridadEfectiva(e(4), HOY)).toBe('media');
    expect(prioridadEfectiva(e(3), HOY)).toBe('alta');
  });
  it('la prioridad escrita a mano manda', () => {
    expect(prioridadEfectiva(en(100, { tipo: 'examen', prioridad: 'alta' }), HOY)).toBe('alta');
    expect(prioridadEfectiva(en(1, { tipo: 'examen', prioridad: 'baja' }), HOY)).toBe('baja');
  });
  it('las tareas normales, sin fecha o pasadas no están en plazo', () => {
    expect(enPlazo(en(3, {}), HOY)).toBe(false);
    expect(prioridadEfectiva(en(3, {}), HOY)).toBe('media');
    expect(enPlazo({ id: 'a', titulo: 'A', area: 'uni', tipo: 'examen' }, HOY)).toBe(false);
    expect(enPlazo(en(-1, { tipo: 'entrega' }), HOY)).toBe(false);
  });
  it('textoFaltan', () => {
    expect(textoFaltan(0)).toBe('hoy');
    expect(textoFaltan(1)).toBe('mañana');
    expect(textoFaltan(5)).toBe('faltan 5 días');
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/agenda/plazos.test.ts`
Expected: FAIL (no existe `./plazos`).

- [ ] **Step 3: Implementar**

`src/agenda/plazos.ts`:

```ts
import type { Prioridad, Tarea } from '../datos/tareas';
import { fromISO, type ISODate } from '../fechas';
import { tipoDe } from './tipos';

// Días antes de la fecha en que un examen o una entrega llega a las listas principales (prioridad media)
// y en que pasa a prioridad alta (spec §3).
const PLAZOS = {
  examen: { aparece: 21, alta: 7 },
  entrega: { aparece: 14, alta: 3 },
} as const;

// Días naturales de `hoy` a `fecha` (redondeado: los días con cambio de hora duran 23 o 25 horas).
export function faltan(fecha: ISODate, hoy: ISODate): number {
  return Math.round((fromISO(fecha).getTime() - fromISO(hoy).getTime()) / 86_400_000);
}

function plazoDe(t: Tarea) {
  const tipo = tipoDe(t);
  return (tipo === 'examen' || tipo === 'entrega') && t.fecha ? PLAZOS[tipo] : undefined;
}

export function enPlazo(t: Tarea, hoy: ISODate): boolean {
  const p = plazoDe(t);
  if (!p) return false;
  const f = faltan(t.fecha!, hoy);
  return f >= 0 && f <= p.aparece;
}

// La prioridad escrita manda; si no hay, exámenes y entregas la calculan según lo cerca que estén.
export function prioridadEfectiva(t: Tarea, hoy: ISODate): Prioridad {
  if (t.prioridad) return t.prioridad;
  const p = plazoDe(t);
  if (!p) return 'media';
  const f = faltan(t.fecha!, hoy);
  if (f <= p.alta) return 'alta';
  return f <= p.aparece ? 'media' : 'baja';
}

export function textoFaltan(n: number): string {
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `faltan ${n} días`;
}
```

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/agenda && npm run build`
Expected: PASS y compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/agenda/plazos.ts src/agenda/plazos.test.ts
git commit -m "v1.5: plazos y prioridad automática de exámenes y entregas"
```

---

### Task 4: Grupos de «Ahora», árbol «Por áreas» y próximos exámenes (`src/agenda/grupos.ts`)

**Files:**
- Create: `src/agenda/grupos.ts`
- Modify: `src/agenda/tareas.ts` (quitar `proximas`, que deja de usarse) y `src/agenda/tareas.test.ts` (quitar su prueba)
- Test: `src/agenda/grupos.test.ts`

**Interfaces:**
- Consumes: `atrasadas`, `tareasDelDia`, `repetidas(ts, hoy)`, `sinFecha`, `esRepetida` (Tarea 2); `enPlazo`, `prioridadEfectiva` (Tarea 3); `tipoDe`, `TIPOS`; `agruparPorArea` (`src/agenda/agrupar.ts`).
- Produces:
  - `export type ClaveGrupo = 'atrasadas' | 'hoy' | 'seAcerca' | 'proximas' | 'recados' | 'repiten' | 'sinFecha'`
  - `export interface GrupoAhora { clave: ClaveGrupo; titulo: string; tareas: Tarea[]; plegado: boolean; mostrarFecha: boolean }`
  - `export function gruposAhora(ts: Tarea[], hoy: ISODate): GrupoAhora[]` (solo los no vacíos, en el orden del spec)
  - `export interface RamaTipo { tipo: TipoTarea; tareas: Tarea[] }`
  - `export interface NodoSubarea { id: string; nombre: string; color: string; total: number; tipos: RamaTipo[] }`
  - `export interface NodoArea extends NodoSubarea { subareas: NodoSubarea[] }`
  - `export function arbolPorAreas(ts: Tarea[], areas: Area[], hoy: ISODate): NodoArea[]`
  - `export function proximosExamenes(ts: Tarea[], hoy: ISODate, n = 3): Tarea[]`
  - `export function urgentes(ts: Tarea[], hoy: ISODate): Tarea[]` (exámenes y entregas sin hacer, fecha posterior a hoy y prioridad efectiva alta)

- [ ] **Step 1: Escribir la prueba que falla**

`src/agenda/grupos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import type { Tarea } from '../datos/tareas';
import { arbolPorAreas, gruposAhora, proximosExamenes, urgentes } from './grupos';

const HOY = '2026-10-01'; // jueves
const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'personal', ...x });
const ids = (ts: Tarea[]) => ts.map((x) => x.id);

const AREAS = parseAreas(
  '- id: uni\n  nombre: Uni\n  color: "#a855f7"\n  subareas:\n    - id: calculo\n      nombre: Cálculo\n      color: "#36ace7"\n'
  + '- id: personal\n  nombre: Personal\n  color: "#3b82f6"\n',
);

describe('gruposAhora', () => {
  const ts = [
    t({ id: 'atrasada', fecha: '2026-09-28' }),
    t({ id: 'hoy', fecha: HOY }),
    t({ id: 'boxeo', tipo: 'evento', repetir: ['jue'], hora: '19:00' }),
    t({ id: 'examen-cerca', tipo: 'examen', area: 'calculo', fecha: '2026-10-15' }),
    t({ id: 'examen-junio', tipo: 'examen', area: 'calculo', fecha: '2027-06-09' }),
    t({ id: 'entrega-cerca', tipo: 'entrega', area: 'calculo', fecha: '2026-10-05' }),
    t({ id: 'futura', fecha: '2026-11-20' }),
    t({ id: 'recado' , tipo: 'recado' }),
    t({ id: 'recado-hoy', tipo: 'recado', fecha: HOY }),
    t({ id: 'sin-fecha' }),
    t({ id: 'hecha', fecha: '2026-11-01', hecha: true }),
  ];
  const g = gruposAhora(ts, HOY);
  const de = (clave: string) => ids(g.find((x) => x.clave === clave)?.tareas ?? []);

  it('reparte cada cosa en su grupo, en orden', () => {
    expect(g.map((x) => x.clave)).toEqual(['atrasadas', 'hoy', 'seAcerca', 'proximas', 'recados', 'repiten', 'sinFecha']);
    expect(de('atrasadas')).toEqual(['atrasada']);
    expect(de('hoy')).toEqual(['boxeo', 'hoy', 'recado-hoy']);
    expect(de('seAcerca')).toEqual(['entrega-cerca', 'examen-cerca']);
    expect(de('proximas')).toEqual(['futura']);
    expect(de('recados')).toEqual(['recado']);
    expect(de('repiten')).toEqual(['boxeo']);
    expect(de('sinFecha')).toEqual(['sin-fecha']);
  });
  it('el examen de junio no está en ningún grupo de Ahora', () => {
    expect(g.flatMap((x) => ids(x.tareas))).not.toContain('examen-junio');
  });
  it('los grupos vacíos no salen', () => {
    expect(gruposAhora([t({ id: 'solo', fecha: HOY })], HOY).map((x) => x.clave)).toEqual(['hoy']);
    expect(gruposAhora([], HOY)).toEqual([]);
  });
  it('«Se repiten» y «Sin fecha» empiezan plegados', () => {
    expect(g.filter((x) => x.plegado).map((x) => x.clave)).toEqual(['repiten', 'sinFecha']);
  });
});

describe('arbolPorAreas', () => {
  it('área → subárea → tipo, con recuentos y solo lo pendiente', () => {
    const ts = [
      t({ id: 'ex-junio', tipo: 'examen', area: 'calculo', fecha: '2027-06-09' }),
      t({ id: 'ex-enero', tipo: 'examen', area: 'calculo', fecha: '2027-01-21' }),
      t({ id: 'ejercicios', area: 'calculo' }),
      t({ id: 'uni-general', area: 'uni' }),
      t({ id: 'hecha', area: 'calculo', hecha: true }),
      t({ id: 'evento-pasado', tipo: 'evento', fecha: '2026-09-01' }),
      t({ id: 'repe-terminada', repetir: ['lun'], hasta: '2026-09-30' }),
      t({ id: 'huevos', tipo: 'recado' }),
    ];
    const arbol = arbolPorAreas(ts, AREAS, HOY);
    expect(arbol.map((a) => [a.id, a.total])).toEqual([['uni', 4], ['personal', 1]]);
    const uni = arbol[0];
    expect(uni.tipos.map((r) => [r.tipo, ids(r.tareas)])).toEqual([['tarea', ['uni-general']]]);
    expect(uni.subareas.map((s) => [s.id, s.nombre, s.total])).toEqual([['calculo', 'Cálculo', 3]]);
    expect(uni.subareas[0].tipos.map((r) => [r.tipo, ids(r.tareas)])).toEqual([
      ['tarea', ['ejercicios']],
      ['examen', ['ex-enero', 'ex-junio']],
    ]);
    expect(arbol[1].tipos.map((r) => r.tipo)).toEqual(['recado']);
  });
  it('sin nada pendiente, árbol vacío', () => {
    expect(arbolPorAreas([t({ id: 'h', hecha: true })], AREAS, HOY)).toEqual([]);
  });
});

describe('proximosExamenes y urgentes', () => {
  const ts = [
    t({ id: 'e3', tipo: 'examen', fecha: '2027-01-21' }),
    t({ id: 'e1', tipo: 'examen', fecha: '2026-10-05' }),
    t({ id: 'e2', tipo: 'examen', fecha: '2026-11-10' }),
    t({ id: 'e4', tipo: 'examen', fecha: '2027-05-12' }),
    t({ id: 'pasado', tipo: 'examen', fecha: '2026-09-20' }),
    t({ id: 'hecho', tipo: 'examen', fecha: '2026-10-02', hecha: true }),
    t({ id: 'entrega', tipo: 'entrega', fecha: '2026-10-03' }),
  ];
  it('los 3 exámenes pendientes más cercanos desde hoy', () => {
    expect(ids(proximosExamenes(ts, HOY))).toEqual(['e1', 'e2', 'e3']);
  });
  it('urgentes: exámenes y entregas en prioridad alta, después de hoy', () => {
    expect(ids(urgentes(ts, HOY))).toEqual(['entrega', 'e1']);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/agenda/grupos.test.ts`
Expected: FAIL (no existe `./grupos`).

- [ ] **Step 3: Implementar**

`src/agenda/grupos.ts`:

```ts
import type { Area } from '../datos/areas';
import { TIPOS, type Tarea, type TipoTarea } from '../datos/tareas';
import type { ISODate } from '../fechas';
import { agruparPorArea } from './agrupar';
import { enPlazo, prioridadEfectiva } from './plazos';
import { atrasadas, esRepetida, repetidas, sinFecha, tareasDelDia } from './tareas';
import { tipoDe } from './tipos';

export type ClaveGrupo = 'atrasadas' | 'hoy' | 'seAcerca' | 'proximas' | 'recados' | 'repiten' | 'sinFecha';

export interface GrupoAhora {
  clave: ClaveGrupo;
  titulo: string;
  tareas: Tarea[];
  plegado: boolean;
  mostrarFecha: boolean;
}

const RANGO = { alta: 0, media: 1, baja: 2 } as const;
const pendiente = (t: Tarea) => !esRepetida(t) && !t.hecha;
const despuesDeHoy = (t: Tarea, hoy: ISODate) => !!t.fecha && t.fecha > hoy;

// Por fecha (sin fecha al final) y luego por prioridad efectiva.
function ordenar(hoy: ISODate) {
  return (a: Tarea, b: Tarea) =>
    (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999') ||
    (a.hora ?? '99').localeCompare(b.hora ?? '99') ||
    RANGO[prioridadEfectiva(a, hoy)] - RANGO[prioridadEfectiva(b, hoy)];
}

// Tarjeta «Ahora» de la pantalla Tareas (spec §4). Solo los grupos con algo.
export function gruposAhora(ts: Tarea[], hoy: ISODate): GrupoAhora[] {
  const orden = ordenar(hoy);
  const grupos: GrupoAhora[] = [
    { clave: 'atrasadas', titulo: 'Atrasadas', tareas: atrasadas(ts, hoy), plegado: false, mostrarFecha: true },
    { clave: 'hoy', titulo: 'Hoy', tareas: tareasDelDia(ts, hoy), plegado: false, mostrarFecha: false },
    {
      clave: 'seAcerca', titulo: 'Se acerca', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && despuesDeHoy(t, hoy) && enPlazo(t, hoy)).sort(orden),
    },
    {
      clave: 'proximas', titulo: 'Próximas', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && tipoDe(t) === 'tarea' && despuesDeHoy(t, hoy)).sort(orden),
    },
    {
      clave: 'recados', titulo: 'Recados', plegado: false, mostrarFecha: true,
      tareas: ts.filter((t) => pendiente(t) && tipoDe(t) === 'recado' && (!t.fecha || t.fecha > hoy)).sort(orden),
    },
    { clave: 'repiten', titulo: 'Se repiten', tareas: repetidas(ts, hoy), plegado: true, mostrarFecha: false },
    { clave: 'sinFecha', titulo: 'Sin fecha', tareas: sinFecha(ts), plegado: true, mostrarFecha: false },
  ];
  return grupos.filter((g) => g.tareas.length > 0);
}

export interface RamaTipo {
  tipo: TipoTarea;
  tareas: Tarea[];
}

export interface NodoSubarea {
  id: string;
  nombre: string;
  color: string;
  total: number;
  tipos: RamaTipo[];
}

export interface NodoArea extends NodoSubarea {
  subareas: NodoSubarea[];
}

// Lo pendiente: sin hacer; los eventos, mientras no hayan pasado; lo que se repite, mientras no haya terminado.
function pendienteEnArbol(t: Tarea, hoy: ISODate): boolean {
  if (esRepetida(t)) return !(t.hasta && t.hasta < hoy);
  if (tipoDe(t) === 'evento') return !t.fecha || t.fecha >= hoy;
  return !t.hecha;
}

function porTipo(ts: Tarea[], hoy: ISODate): RamaTipo[] {
  const orden = ordenar(hoy);
  return TIPOS.map((tipo) => ({ tipo, tareas: ts.filter((t) => tipoDe(t) === tipo).sort(orden) })).filter((r) => r.tareas.length > 0);
}

// Tarjeta «Por áreas»: área → subárea → tipo (spec §4).
export function arbolPorAreas(ts: Tarea[], areas: Area[], hoy: ISODate): NodoArea[] {
  const pendientes = ts.filter((t) => pendienteEnArbol(t, hoy));
  return agruparPorArea(pendientes, areas).map((g) => {
    const subareas = g.subgrupos.map((s) => ({
      id: s.subarea.id, nombre: s.subarea.nombre, color: s.subarea.color, total: s.items.length, tipos: porTipo(s.items, hoy),
    }));
    return {
      id: g.area?.id ?? 'sin-area',
      nombre: g.area?.nombre ?? 'Sin área',
      color: g.area?.color ?? '#8b7b6a',
      total: g.items.length + subareas.reduce((n, s) => n + s.total, 0),
      tipos: porTipo(g.items, hoy),
      subareas,
    };
  });
}

export function proximosExamenes(ts: Tarea[], hoy: ISODate, n = 3): Tarea[] {
  return ts
    .filter((t) => tipoDe(t) === 'examen' && pendiente(t) && !!t.fecha && t.fecha >= hoy)
    .sort(ordenar(hoy))
    .slice(0, n);
}

// Para la tarjeta Hoy del Inicio: exámenes y entregas de los próximos días en prioridad alta.
export function urgentes(ts: Tarea[], hoy: ISODate): Tarea[] {
  return ts
    .filter((t) => (tipoDe(t) === 'examen' || tipoDe(t) === 'entrega') && pendiente(t) && despuesDeHoy(t, hoy) && prioridadEfectiva(t, hoy) === 'alta')
    .sort(ordenar(hoy));
}
```

Comprueba el orden esperado de «hoy» en la prueba (`['boxeo', 'hoy', 'recado-hoy']`): `tareasDelDia` pone primero las que tienen hora y luego por prioridad; `hoy` y `recado-hoy` empatan y conservan su orden original. Si sale distinto, corrige la prueba al orden real de `tareasDelDia` y apúntalo como `Ruling:` (el orden de «Hoy» no lo cambia esta versión).

En `src/agenda/tareas.ts` borra la función `proximas` (ya no la usa nadie) y en `src/agenda/tareas.test.ts` quita `proximas` del import y su prueba («proximas: de hoy en adelante y sin hacer»). `src/pantallas/Tareas.tsx` todavía la importa: cámbiala provisionalmente por `gruposAhora` o deja la pantalla compilando con lo mínimo (la Tarea 7 la rehace); lo más simple es sustituir la línea de «Próximas» por `{seccion('Próximas', gruposAhora(datos.tareas, hoy).find((g) => g.clave === 'proximas')?.tareas ?? [], 'No hay tareas con fecha pendientes.', true)}` con su import.

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/agenda src/pantallas/Tareas.tsx
git commit -m "v1.5: grupos de «Ahora», árbol «Por áreas», próximos exámenes y urgentes"
```

---

### Task 5: Fila y etiqueta de tarea con su tipo

**Files:**
- Modify: `src/componentes/FilaTarea.tsx`, `src/componentes/EtiquetaTarea.tsx`, `src/estilos.css`
- Test: `src/componentes/FilaTarea.test.tsx`

**Interfaces:**
- Consumes: `tipoDe`, `ICONO_TIPO`, `NOMBRE_TIPO` (Tarea 1); `describirRepeticion` (Tarea 2); `prioridadEfectiva`, `faltan`, `textoFaltan` (Tarea 3); `useHoy` (`src/estado/hoy.ts`).
- Produces: `FilaTarea` pinta el icono del tipo (menos en `tarea`), sin casilla en eventos, «faltan N días» en exámenes y entregas futuros sin hacer, y la prioridad efectiva. `EtiquetaTarea` pinta el icono del tipo.

- [ ] **Step 1: Escribir la prueba que falla**

En `src/componentes/FilaTarea.test.tsx`, debajo del `vi.mock` existente, añade:

```ts
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));
```

y, dentro del `describe`, estas pruebas:

```ts
  it('un evento no tiene casilla y lleva su icono de tipo', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Boxeo', area: 'v', tipo: 'evento', hora: '19:00', repetir: ['lun'] }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).not.toContain('type="checkbox"');
    expect(html).toContain('title="Evento"');
    expect(html).toContain('cada lun');
  });
  it('un examen cercano: icono, cuánto falta y prioridad alta calculada', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Cálculo (enero)', area: 'v', tipo: 'examen', fecha: '2026-10-05' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('title="Examen"');
    expect(html).toContain('faltan 4 días');
    expect(html).toContain('prioridad alta');
  });
  it('un examen lejano sale en prioridad baja', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'Cálculo (junio)', area: 'v', tipo: 'examen', fecha: '2027-06-09' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).toContain('prioridad baja');
  });
  it('una tarea normal no lleva icono de tipo', () => {
    const html = renderToString(<FilaTarea tarea={{ id: 'a', titulo: 'X', area: 'v' }} dia="2026-10-01" alEditar={() => undefined} />);
    expect(html).not.toContain('icono-tipo');
  });
```

(La prueba existente «sin icono, como siempre» sigue valiendo: una tarea sin tipo no dibuja ningún `<svg>`.)

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/FilaTarea.test.tsx`
Expected: FAIL (los eventos tienen casilla, no hay icono de tipo ni «faltan»).

- [ ] **Step 3: Implementar**

`src/componentes/FilaTarea.tsx` completo:

```tsx
import { colorDeArea, nombreDeArea } from '../agenda/areas';
import { faltan, prioridadEfectiva, textoFaltan } from '../agenda/plazos';
import { describirRepeticion, fijarEnLista, hechaEl } from '../agenda/tareas';
import { ICONO_TIPO, NOMBRE_TIPO, tipoDe } from '../agenda/tipos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useHoy } from '../estado/hoy';
import type { ISODate } from '../fechas';
import { Icono } from './Icono';

interface Props {
  tarea: Tarea;
  dia: ISODate;
  mostrarFecha?: boolean;
  alEditar(t: Tarea): void;
}

export function FilaTarea({ tarea, dia, mostrarFecha = false, alEditar }: Props) {
  const { datos, cambiarTareasAlInstante, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const tipo = tipoDe(tarea);
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
  const prioridad = prioridadEfectiva(tarea, hoy);
  const cuentaAtras = (tipo === 'examen' || tipo === 'entrega') && tarea.fecha && tarea.fecha >= hoy && !hecha
    ? textoFaltan(faltan(tarea.fecha, hoy))
    : undefined;
  const detalle = [mostrarFecha ? tarea.fecha : undefined, tarea.hora, describirRepeticion(tarea), cuentaAtras]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`fila-tarea${hecha ? ' hecha' : ''}`}>
      {tipo === 'evento' ? (
        <span className="sin-casilla" aria-hidden="true" />
      ) : (
        <input type="checkbox" checked={hecha} disabled={bloqueado} aria-label={`Marcar «${tarea.titulo}»`} onChange={marcar} />
      )}
      <span className="punto" style={{ background: colorDeArea(datos.areas, tarea.area) }} title={nombreDeArea(datos.areas, tarea.area) ?? 'Área desconocida'} />
      <button className="titulo-tarea" onClick={() => alEditar(tarea)} disabled={bloqueado}>
        {tipo !== 'tarea' && (
          <span className="icono-tipo" title={NOMBRE_TIPO[tipo]}>
            <Icono nombre={ICONO_TIPO[tipo]} tamano={16} />
          </span>
        )}
        <Icono nombre={tarea.icono} />
        {tarea.titulo}
      </button>
      {detalle && <span className="detalle">{detalle}</span>}
      {prioridad !== 'media' && <span className={`prioridad ${prioridad}`}>{prioridad}</span>}
    </li>
  );
}
```

`src/componentes/EtiquetaTarea.tsx`: añade `import { ICONO_TIPO, tipoDe } from '../agenda/tipos';` y, justo antes de `<Icono nombre={tarea.icono} tamano={13} />`:

```tsx
      {tipoDe(tarea) !== 'tarea' && <Icono nombre={ICONO_TIPO[tipoDe(tarea)]} tamano={13} />}
```

`src/estilos.css`, debajo de la regla `.punto { … }`:

```css
.sin-casilla { width: 13px; flex-shrink: 0; }
.icono-tipo { display: inline-flex; color: var(--suave); margin-right: 2px; }
```

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/componentes/FilaTarea.tsx src/componentes/FilaTarea.test.tsx src/componentes/EtiquetaTarea.tsx src/estilos.css
git commit -m "v1.5: filas con icono de tipo, eventos sin casilla y cuenta atrás de exámenes y entregas"
```

---

### Task 6: Formulario por tipos con repetición y final (`src/agenda/formTarea.ts`, `FormTarea.tsx`)

**Files:**
- Create: `src/agenda/repeticion.ts`, `src/agenda/formTarea.ts`, `src/estado/ultimaArea.ts`
- Modify: `src/componentes/FormTarea.tsx`, `src/estilos.css`
- Test: `src/agenda/repeticion.test.ts`, `src/agenda/formTarea.test.ts`, `src/componentes/FormTarea.test.tsx`

**Interfaces:**
- Consumes: `CAMPOS_TIPO`, `tipoDe`, `ICONO_TIPO`, `NOMBRE_TIPO` (Tarea 1); `TIPOS`, `Prioridad`, `Tarea`, `TipoTarea` (Tarea 1); `TareaSinId`, `aplicarEdicion`, `borrarDeLista` (`src/agenda/tareas.ts`).
- Produces:
  - `export type Unidad = 'semanas' | 'meses' | 'años'`; `export function hastaDurante(inicio: ISODate, n: number, unidad: Unidad): ISODate`
  - `export type ModoRepetir = 'no' | 'semana' | 'mes' | 'año'`; `export type ModoFin = 'sin' | 'fecha' | 'durante'`
  - `export interface EstadoForm { tipo: TipoTarea; titulo: string; area: string; icono?: string; prioridad: Prioridad | ''; fecha: string; hora: string; modoRepetir: ModoRepetir; dias: Dia[]; modoFin: ModoFin; hastaFecha: string; durante: number; unidad: Unidad; proyecto: string; notas: string }`
  - `export function estadoInicial(original: Tarea | null, nueva: { fecha?: string; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string }, area: string, icono: string | undefined): EstadoForm`
  - `export function tareaDelFormulario(f: EstadoForm, original: Tarea | null, hoy: ISODate): { tarea: TareaSinId } | { error: string }`
  - `src/estado/ultimaArea.ts`: `leerUltimaArea(): string | null`, `guardarUltimaArea(id: string): void`

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/agenda/repeticion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hastaDurante } from './repeticion';

describe('hastaDurante', () => {
  it('el día antes de cumplirse', () => {
    expect(hastaDurante('2026-10-01', 1, 'meses')).toBe('2026-10-31');
    expect(hastaDurante('2026-10-01', 1, 'semanas')).toBe('2026-10-07');
    expect(hastaDurante('2026-10-01', 3, 'semanas')).toBe('2026-10-21');
    expect(hastaDurante('2026-10-01', 1, 'años')).toBe('2027-09-30');
    expect(hastaDurante('2026-10-15', 2, 'meses')).toBe('2026-12-14');
  });
  it('un día que no existe en el mes de destino usa el último', () => {
    expect(hastaDurante('2027-01-31', 1, 'meses')).toBe('2027-02-27');
  });
  it('un número raro cuenta como 1', () => {
    expect(hastaDurante('2026-10-01', 0, 'meses')).toBe('2026-10-31');
    expect(hastaDurante('2026-10-01', Number.NaN, 'semanas')).toBe('2026-10-07');
  });
});
```

`src/agenda/formTarea.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../datos/tareas';
import { estadoInicial, tareaDelFormulario, type EstadoForm } from './formTarea';

const HOY = '2026-10-01';
const base = (x: Partial<EstadoForm> = {}): EstadoForm => ({ ...estadoInicial(null, {}, 'personal', undefined), titulo: 'Boxeo', ...x });
const tarea = (r: ReturnType<typeof tareaDelFormulario>) => {
  if ('error' in r) throw new Error(r.error);
  return r.tarea;
};

describe('estadoInicial', () => {
  it('lee una tarea existente con repetición y final', () => {
    const t: Tarea = { id: 'a', titulo: 'Boxeo', area: 'salud', tipo: 'evento', fecha: '2026-10-01', hora: '19:00', repetir: ['lun', 'vie'], hasta: '2026-10-31' };
    expect(estadoInicial(t, {}, 'personal', undefined)).toMatchObject({
      tipo: 'evento', area: 'salud', modoRepetir: 'semana', dias: ['lun', 'vie'], modoFin: 'fecha', hastaFecha: '2026-10-31', prioridad: '',
    });
    expect(estadoInicial({ ...t, repetir: 'mes', hasta: undefined }, {}, 'x', undefined)).toMatchObject({ modoRepetir: 'mes', modoFin: 'sin' });
  });
  it('una nueva es una tarea sin repetir', () => {
    expect(estadoInicial(null, { fecha: HOY }, 'uni', 'books')).toMatchObject({ tipo: 'tarea', area: 'uni', icono: 'books', fecha: HOY, modoRepetir: 'no' });
  });
});

describe('tareaDelFormulario', () => {
  it('evento semanal «durante 1 mes» → hasta calculado y sin prioridad ni proyecto', () => {
    const t = tarea(tareaDelFormulario(base({
      tipo: 'evento', fecha: HOY, hora: '19:00', modoRepetir: 'semana', dias: ['vie', 'lun'], modoFin: 'durante', durante: 1, unidad: 'meses',
      prioridad: 'alta', proyecto: 'x', notas: 'n',
    }), null, HOY));
    expect(t).toMatchObject({ tipo: 'evento', fecha: HOY, hora: '19:00', repetir: ['lun', 'vie'], hasta: '2026-10-31' });
    expect(t.prioridad).toBeUndefined();
    expect(t.proyecto).toBeUndefined();
    expect(t.notas).toBeUndefined();
  });
  it('cada mes sin fecha empieza hoy', () => {
    expect(tarea(tareaDelFormulario(base({ modoRepetir: 'mes' }), null, HOY))).toMatchObject({ repetir: 'mes', fecha: HOY });
  });
  it('«hasta» anterior al inicio no se guarda', () => {
    const r = tareaDelFormulario(base({ fecha: '2026-10-10', modoRepetir: 'semana', dias: ['lun'], modoFin: 'fecha', hastaFecha: '2026-10-01' }), null, HOY);
    expect(r).toEqual({ error: 'El último día no puede ser anterior a la fecha de inicio.' });
  });
  it('días de la semana sin ningún día marcado → no se repite', () => {
    const t = tarea(tareaDelFormulario(base({ modoRepetir: 'semana', dias: [], modoFin: 'durante' }), null, HOY));
    expect(t.repetir).toBeUndefined();
    expect(t.hasta).toBeUndefined();
  });
  it('prioridad: en una tarea «media» no se escribe; en un examen vacío = automática', () => {
    expect(tarea(tareaDelFormulario(base({ prioridad: 'media' }), null, HOY)).prioridad).toBeUndefined();
    expect(tarea(tareaDelFormulario(base({ tipo: 'examen', prioridad: '' }), null, HOY)).prioridad).toBeUndefined();
    expect(tarea(tareaDelFormulario(base({ tipo: 'examen', prioridad: 'media' }), null, HOY)).prioridad).toBe('media');
  });
  it('un recado solo guarda título, área y fecha; el tipo tarea no se escribe', () => {
    const r = tarea(tareaDelFormulario(base({ tipo: 'recado', hora: '10:00', notas: 'x', modoRepetir: 'semana', dias: ['lun'] }), null, HOY));
    expect(r).toMatchObject({ tipo: 'recado', titulo: 'Boxeo', area: 'personal' });
    expect([r.hora, r.notas, r.repetir]).toEqual([undefined, undefined, undefined]);
    expect(tarea(tareaDelFormulario(base(), null, HOY)).tipo).toBeUndefined();
  });
  it('al editar conserva lo que el formulario no enseña (origen, hechas…)', () => {
    const original: Tarea = { id: 'a', titulo: 'Práctica 1', area: 'calculo', tipo: 'entrega', fecha: '2026-10-05', origen: 'moodle:1@aula', hecha: false };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), titulo: 'Práctica 1 (grupo)' }, original, HOY));
    expect(t).toMatchObject({ id: 'a', origen: 'moodle:1@aula', tipo: 'entrega', titulo: 'Práctica 1 (grupo)' });
  });
  it('pasar de tarea a evento quita prioridad y proyecto', () => {
    const original: Tarea = { id: 'a', titulo: 'Boxeo', area: 'salud', prioridad: 'alta', proyecto: 'p', repetir: ['lun'] };
    const t = tarea(tareaDelFormulario({ ...estadoInicial(original, {}, 'x', undefined), tipo: 'evento' }, original, HOY));
    expect(t).toMatchObject({ tipo: 'evento', repetir: ['lun'] });
    expect([t.prioridad, t.proyecto]).toEqual([undefined, undefined]);
  });
  it('sin título, error', () => {
    expect(tareaDelFormulario(base({ titulo: '  ' }), null, HOY)).toEqual({ error: 'Escribe un título.' });
  });
});
```

En `src/componentes/FormTarea.test.tsx`, añade `vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));` debajo del mock existente y, dentro del `describe`:

```ts
  it('arriba, los cinco tipos; por defecto Tarea', () => {
    const html = renderToString(<FormTarea edicion={{ nueva: {} }} cerrar={() => undefined} />);
    for (const n of ['Tarea', 'Entrega', 'Examen', 'Recado', 'Evento']) expect(html).toContain(n);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Tarea/);
  });
  it('un examen: prioridad «Automática» y sin repetición', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Cálculo', area: 'fisica', tipo: 'examen', fecha: '2027-01-21' } }} cerrar={() => undefined} />);
    expect(html).toContain('Automática');
    expect(html).not.toContain('Se repite');
  });
  it('un recado: sin prioridad, hora, proyecto ni notas', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Huevos', area: 'fisica', tipo: 'recado' } }} cerrar={() => undefined} />);
    for (const n of ['Prioridad', 'Hora', 'Proyecto', 'Notas', 'Se repite']) expect(html).not.toContain(n);
  });
  it('un evento que se repite hasta una fecha', () => {
    const html = renderToString(<FormTarea edicion={{ tarea: { id: 'a', titulo: 'Boxeo', area: 'fisica', tipo: 'evento', fecha: '2026-10-01', repetir: ['lun'], hasta: '2026-10-31' } }} cerrar={() => undefined} />);
    expect(html).toContain('Se repite');
    expect(html).toContain('value="2026-10-31"');
    expect(html).not.toContain('Prioridad');
  });
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/agenda/repeticion.test.ts src/agenda/formTarea.test.ts src/componentes/FormTarea.test.tsx`
Expected: FAIL (no existen los módulos; el formulario no tiene tipos).

- [ ] **Step 3: Implementar**

`src/agenda/repeticion.ts`:

```ts
import { addDays, toISO, type ISODate } from '../fechas';

export type Unidad = 'semanas' | 'meses' | 'años';

// «Durante 1 mes» desde el 1 de octubre = hasta el 31 de octubre: el día antes de cumplirse.
// Si el día no existe en el mes de destino (31 de enero + 1 mes), se usa el último día de ese mes.
export function hastaDurante(inicio: ISODate, n: number, unidad: Unidad): ISODate {
  const veces = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  if (unidad === 'semanas') return addDays(inicio, 7 * veces - 1);
  const [y, m, d] = inicio.split('-').map(Number);
  const mesDestino = m - 1 + (unidad === 'meses' ? veces : 12 * veces);
  const ultimoDia = new Date(y, mesDestino + 1, 0).getDate();
  return addDays(toISO(new Date(y, mesDestino, Math.min(d, ultimoDia))), -1);
}
```

`src/agenda/formTarea.ts`:

```ts
import type { Prioridad, Tarea, TipoTarea } from '../datos/tareas';
import { DIAS, type Dia, type ISODate } from '../fechas';
import { hastaDurante, type Unidad } from './repeticion';
import type { TareaSinId } from './tareas';
import { CAMPOS_TIPO, tipoDe } from './tipos';

export type ModoRepetir = 'no' | 'semana' | 'mes' | 'año';
export type ModoFin = 'sin' | 'fecha' | 'durante';

export interface EstadoForm {
  tipo: TipoTarea;
  titulo: string;
  area: string;
  icono?: string;
  prioridad: Prioridad | ''; // '' = por defecto (media en tareas; automática en exámenes y entregas)
  fecha: string;
  hora: string;
  modoRepetir: ModoRepetir;
  dias: Dia[];
  modoFin: ModoFin;
  hastaFecha: string;
  durante: number;
  unidad: Unidad;
  proyecto: string;
  notas: string;
}

export function estadoInicial(
  original: Tarea | null,
  nueva: { fecha?: string; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string },
  area: string,
  icono: string | undefined,
): EstadoForm {
  const rep = original?.repetir;
  return {
    tipo: original ? tipoDe(original) : 'tarea',
    titulo: original?.titulo ?? nueva.titulo ?? '',
    area: original?.area ?? area,
    icono,
    prioridad: original?.prioridad ?? '',
    fecha: original?.fecha ?? nueva.fecha ?? '',
    hora: original?.hora ?? '',
    modoRepetir: rep === 'mes' || rep === 'año' ? rep : Array.isArray(rep) && rep.length ? 'semana' : 'no',
    dias: Array.isArray(rep) ? rep : [],
    modoFin: original?.hasta ? 'fecha' : 'sin',
    hastaFecha: original?.hasta ?? '',
    durante: 1,
    unidad: 'meses',
    proyecto: original?.proyecto ?? nueva.proyecto ?? '',
    notas: original?.notas ?? nueva.notas ?? '',
  };
}

// Convierte lo escrito en el formulario en la tarea que se guarda. Los campos que el tipo no tiene se quitan
// (así, pasar de Tarea a Evento borra la prioridad). Lo que el formulario no enseña (origen, hechas…) se conserva.
export function tareaDelFormulario(f: EstadoForm, original: Tarea | null, hoy: ISODate): { tarea: TareaSinId } | { error: string } {
  const titulo = f.titulo.trim();
  if (!titulo) return { error: 'Escribe un título.' };
  const c = CAMPOS_TIPO[f.tipo];
  const repetir = !c.repetir || f.modoRepetir === 'no'
    ? undefined
    : f.modoRepetir === 'semana'
      ? (f.dias.length ? DIAS.filter((d) => f.dias.includes(d)) : undefined)
      : f.modoRepetir;
  // Cada mes / cada año necesitan un día de referencia: si no hay fecha, hoy.
  const fecha = f.fecha || (repetir === 'mes' || repetir === 'año' ? hoy : undefined);
  const hasta = !repetir || f.modoFin === 'sin'
    ? undefined
    : f.modoFin === 'fecha'
      ? f.hastaFecha || undefined
      : hastaDurante(fecha ?? hoy, f.durante, f.unidad);
  if (hasta && fecha && hasta < fecha) return { error: 'El último día no puede ser anterior a la fecha de inicio.' };
  const prioridad = !c.prioridad || !f.prioridad || (f.tipo === 'tarea' && f.prioridad === 'media') ? undefined : f.prioridad;
  return {
    tarea: {
      ...original,
      titulo,
      area: f.area,
      icono: f.icono,
      tipo: f.tipo === 'tarea' ? undefined : f.tipo,
      prioridad,
      fecha,
      hora: c.hora ? f.hora || undefined : undefined,
      repetir,
      hasta,
      proyecto: c.proyecto ? f.proyecto || undefined : undefined,
      notas: c.notas ? f.notas.trim() || undefined : undefined,
    },
  };
}
```

`src/estado/ultimaArea.ts`:

```ts
// Área de la última tarea creada en este dispositivo, para proponerla en la siguiente (spec §4, recados).
const CLAVE = 'ultima-area';

export function leerUltimaArea(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function guardarUltimaArea(id: string): void {
  try {
    localStorage.setItem(CLAVE, id);
  } catch {
    /* sin almacenamiento */
  }
}
```

`src/componentes/FormTarea.tsx` completo:

```tsx
import { useState, type FormEvent } from 'react';
import { buscarArea } from '../agenda/areas';
import { estadoInicial, tareaDelFormulario, type EstadoForm, type ModoFin, type ModoRepetir } from '../agenda/formTarea';
import { hastaDurante, type Unidad } from '../agenda/repeticion';
import { aplicarEdicion, borrarDeLista } from '../agenda/tareas';
import { CAMPOS_TIPO, ICONO_TIPO, NOMBRE_TIPO } from '../agenda/tipos';
import { PRIORIDADES, TIPOS, type Prioridad, type Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { useHoy } from '../estado/hoy';
import { guardarUltimaArea, leerUltimaArea } from '../estado/ultimaArea';
import { DIAS, formatoCorto, type Dia, type ISODate } from '../fechas';
import { iconoAlEscribir, iconoPara } from '../iconos/diccionario';
import { Icono } from './Icono';
import { SelectorArea } from './SelectorArea';
import { SelectorIcono } from './SelectorIcono';

export type Edicion = ({ tarea: Tarea } | { nueva: { fecha?: ISODate; proyecto?: string; titulo?: string; area?: string; icono?: string; notas?: string } }) & {
  // Aviso que se muestra en el formulario y acción extra tras guardar bien (p. ej. quitar la idea de ideas.yaml).
  nota?: string;
  alGuardar?(): Promise<unknown>;
};

interface Props {
  edicion: Edicion;
  cerrar(): void;
}

export function FormTarea({ edicion, cerrar }: Props) {
  const { datos, cambiarTareas } = useDatos();
  const hoy = useHoy();
  const original = 'tarea' in edicion ? edicion.tarea : null;
  const nueva = 'nueva' in edicion ? edicion.nueva : {};
  // Una idea vinculada a un proyecto que ya no existe no debe guardar ese id viejo en la tarea.
  const nuevaSinProyectoViejo = nueva.proyecto && !datos.proyectos.some((p) => p.id === nueva.proyecto) ? { ...nueva, proyecto: undefined } : nueva;
  const ultima = leerUltimaArea();
  const areaPorDefecto = nueva.area ?? (ultima && buscarArea(datos.areas, ultima) ? ultima : datos.areas[0]?.id ?? 'personal');
  const [f, setF] = useState<EstadoForm>(() =>
    estadoInicial(original, nuevaSinProyectoViejo, areaPorDefecto, original?.icono ?? nueva.icono ?? iconoPara(original?.titulo ?? nueva.titulo ?? '')),
  );
  // Solo el icono guardado cuenta como fijado: una tarea sin icono todavía sigue la sugerencia del título.
  const [fijado, setFijado] = useState(Boolean(original?.icono ?? nueva.icono));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiar = (x: Partial<EstadoForm>) => setF((v) => ({ ...v, ...x }));
  const c = CAMPOS_TIPO[f.tipo];
  const automatica = f.tipo === 'examen' || f.tipo === 'entrega';

  function cambiarTitulo(v: string) {
    setF((x) => ({ ...x, titulo: v, icono: iconoAlEscribir(v, x.icono, fijado) }));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = tareaDelFormulario(f, original, hoy);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setError('');
    setGuardando(true);
    const ok = await cambiarTareas(
      (ts) => aplicarEdicion(ts, original, r.tarea, new Date()),
      `${original ? 'Editar' : 'Crear'} tarea: ${r.tarea.titulo}`,
    );
    if (ok && !original) guardarUltimaArea(f.area);
    if (ok) await edicion.alGuardar?.();
    setGuardando(false);
    if (ok) cerrar();
  }

  async function borrar() {
    if (!original || !(await confirmar(`¿Borrar «${original.titulo}»?`, { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await cambiarTareas((ts) => borrarDeLista(ts, original.id), `Borrar tarea: ${original.titulo}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  const alternarDia = (d: Dia) => cambiar({ dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d] });
  const necesitaFecha = c.repetir && (f.modoRepetir === 'mes' || f.modoRepetir === 'año');

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={guardar}>
        <h2>{original ? 'Editar' : 'Nueva'}: {NOMBRE_TIPO[f.tipo].toLowerCase()}</h2>
        {edicion.nota && <p className="nota-form">{edicion.nota}</p>}
        <div className="tipos-tarea" role="group" aria-label="Tipo">
          {TIPOS.map((t) => (
            <button key={t} type="button" className={`pastilla${f.tipo === t ? ' encendida' : ''}`} aria-pressed={f.tipo === t} onClick={() => cambiar({ tipo: t })}>
              <Icono nombre={ICONO_TIPO[t]} tamano={16} />
              {NOMBRE_TIPO[t]}
            </button>
          ))}
        </div>
        <div className="campo-titulo">
          <SelectorIcono icono={f.icono} elegir={(i) => { cambiar({ icono: i }); setFijado(true); }} />
          <label>
            Título
            <input value={f.titulo} onChange={(e) => cambiarTitulo(e.target.value)} required autoFocus />
          </label>
        </div>
        <div className="fila-campos">
          <SelectorArea areas={datos.areas} valor={f.area} cambiar={(a) => cambiar({ area: a })} />
          {c.prioridad && (
            <label>
              Prioridad
              <select value={automatica ? f.prioridad : f.prioridad || 'media'} onChange={(e) => cambiar({ prioridad: e.target.value as Prioridad | '' })}>
                {automatica && <option value="">Automática</option>}
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="fila-campos">
          <label>
            {necesitaFecha ? 'Empieza el' : 'Fecha (opcional)'}
            <input type="date" value={f.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} />
          </label>
          {c.hora && (
            <label>
              Hora (opcional)
              <input type="time" value={f.hora} onChange={(e) => cambiar({ hora: e.target.value })} />
            </label>
          )}
        </div>
        {c.repetir && (
          <fieldset>
            <legend>Se repite</legend>
            <select aria-label="Cómo se repite" value={f.modoRepetir} onChange={(e) => cambiar({ modoRepetir: e.target.value as ModoRepetir })}>
              <option value="no">No se repite</option>
              <option value="semana">Días de la semana</option>
              <option value="mes">Cada mes</option>
              <option value="año">Cada año</option>
            </select>
            {f.modoRepetir === 'semana' && (
              <div>
                {DIAS.map((d) => (
                  <label key={d} className="dia">
                    <input type="checkbox" checked={f.dias.includes(d)} onChange={() => alternarDia(d)} />
                    {d}
                  </label>
                ))}
              </div>
            )}
            {f.modoRepetir !== 'no' && (
              <div className="fila-campos">
                <label>
                  Hasta
                  <select value={f.modoFin} onChange={(e) => cambiar({ modoFin: e.target.value as ModoFin })}>
                    <option value="sin">Sin final</option>
                    <option value="fecha">Una fecha</option>
                    <option value="durante">Durante…</option>
                  </select>
                </label>
                {f.modoFin === 'fecha' && (
                  <label>
                    Último día
                    <input type="date" value={f.hastaFecha} min={f.fecha || undefined} onChange={(e) => cambiar({ hastaFecha: e.target.value })} required />
                  </label>
                )}
                {f.modoFin === 'durante' && (
                  <label>
                    Durante
                    <span className="durante">
                      <input type="number" min={1} max={99} value={f.durante} onChange={(e) => cambiar({ durante: Number(e.target.value) })} />
                      <select value={f.unidad} onChange={(e) => cambiar({ unidad: e.target.value as Unidad })}>
                        <option value="semanas">semanas</option>
                        <option value="meses">meses</option>
                        <option value="años">años</option>
                      </select>
                    </span>
                  </label>
                )}
              </div>
            )}
            {f.modoRepetir !== 'no' && f.modoFin === 'durante' && (
              <p className="detalle">Hasta el {formatoCorto(hastaDurante(f.fecha || hoy, f.durante, f.unidad))}</p>
            )}
          </fieldset>
        )}
        {c.proyecto && (
          <label>
            Proyecto
            <select
              value={f.proyecto}
              onChange={(e) => {
                const v = e.target.value;
                const a = datos.proyectos.find((p) => p.id === v)?.area;
                cambiar(a ? { proyecto: v, area: a } : { proyecto: v });
              }}
            >
              <option value="">(ninguno)</option>
              {datos.proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
              {f.proyecto && !datos.proyectos.some((p) => p.id === f.proyecto) && <option value={f.proyecto}>{f.proyecto}</option>}
            </select>
          </label>
        )}
        {c.notas && (
          <label>
            Notas
            <textarea value={f.notas} onChange={(e) => cambiar({ notas: e.target.value })} rows={3} />
          </label>
        )}
        {error && <p className="error-form">{error}</p>}
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

Notas para el implementador:
- `buscarArea` existe en `src/agenda/areas.ts` (la usa `agrupar.ts`); si su firma es otra, usa la equivalente para comprobar que el id existe.
- `iconoAlEscribir(v, iconoActual, fijado)` se usa igual que antes; si su segundo parámetro no admite `undefined`, pásale `x.icono ?? ''` y apúntalo.
- Comprueba que existe una clase CSS para mensajes de error de formulario (`grep -n "error" src/estilos.css`). Si no hay ninguna parecida a `.error-form`, añade `.error-form { color: var(--peligro); font-size: 14px; margin: 8px 0 0; }`.
- La primera prueba de pantalla existente («una tarea nueva con título ya trae su icono sugerido») debe seguir pasando: el icono sugerido sigue entrando por `estadoInicial`.

`src/estilos.css`, al final:

```css
.tipos-tarea { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.tipos-tarea .pastilla { border: 1px solid var(--borde); }
.durante { display: flex; gap: 6px; }
.durante input { width: 4.5em; }
```

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/agenda/repeticion.ts src/agenda/repeticion.test.ts src/agenda/formTarea.ts src/agenda/formTarea.test.ts src/estado/ultimaArea.ts src/componentes/FormTarea.tsx src/componentes/FormTarea.test.tsx src/estilos.css
git commit -m "v1.5: formulario por tipos con repetición mensual/anual y final"
```

---

### Task 7: Pantalla Tareas con «Ahora» y «Por áreas»

**Files:**
- Create: `src/estado/desplegables.ts`
- Modify: `src/pantallas/Tareas.tsx`, `src/estilos.css`
- Test: `src/pantallas/Tareas.test.tsx`

**Interfaces:**
- Consumes: `gruposAhora`, `arbolPorAreas` (Tarea 4); `PLURAL_TIPO`, `ICONO_TIPO` (Tarea 1); `FilaTarea` (Tarea 5).
- Produces: `useDesplegables(clave: string): [Set<string>, (id: string, abierto: boolean) => void]` en `src/estado/desplegables.ts` (guarda en `localStorage` la lista de desplegables abiertos).

- [ ] **Step 1: Escribir la prueba que falla**

`src/pantallas/Tareas.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import type { Tarea } from '../datos/tareas';
import { Tareas } from './Tareas';

const TAREAS: Tarea[] = [
  { id: 'hoy', titulo: 'Ejercicios tema 2', area: 'calculo', fecha: '2026-10-01' },
  { id: 'cerca', titulo: 'Práctica 1', area: 'calculo', tipo: 'entrega', fecha: '2026-10-05' },
  { id: 'junio', titulo: 'Cálculo (junio)', area: 'calculo', tipo: 'examen', fecha: '2027-06-09' },
];

vi.mock('../estado/datos', () => ({
  useDatos: () => ({
    datos: {
      areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#a855f7"\n  subareas:\n    - id: calculo\n      nombre: Cálculo\n      color: "#36ace7"\n'),
      tareas: TAREAS, proyectos: [], ideas: [],
    },
    cambiarTareasAlInstante: vi.fn(), soloLectura: false, tareasBloqueadas: false,
  }),
}));
vi.mock('../estado/hoy', () => ({ useHoy: () => '2026-10-01' }));

describe('pantalla Tareas', () => {
  const html = renderToString(<Tareas editar={() => undefined} />);
  it('dos tarjetas: Ahora y Por áreas', () => {
    expect(html).toContain('Ahora');
    expect(html).toContain('Por áreas');
  });
  it('en Ahora solo los grupos con algo', () => {
    expect(html).toContain('>Hoy<');
    expect(html).toContain('Se acerca');
    expect(html).not.toContain('Recados');
    expect(html).not.toContain('Atrasadas');
  });
  it('el examen de junio no está en Ahora pero sí en Por áreas (Uni › Cálculo › Exámenes)', () => {
    const [ahora, porAreas] = html.split('Por áreas');
    expect(ahora).not.toContain('Cálculo (junio)');
    expect(porAreas).toContain('Uni');
    expect(porAreas).toContain('Cálculo');
    expect(porAreas).toContain('Exámenes');
    expect(porAreas).toContain('Cálculo (junio)');
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/pantallas/Tareas.test.tsx`
Expected: FAIL (no hay «Ahora» ni «Por áreas»).

- [ ] **Step 3: Implementar**

`src/estado/desplegables.ts`:

```ts
import { useState } from 'react';

// Qué desplegables dejó abiertos Diego en este dispositivo (spec §4, «Por áreas»).
export function useDesplegables(clave: string): [Set<string>, (id: string, abierto: boolean) => void] {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave) ?? '[]') as unknown;
      return new Set(Array.isArray(guardado) ? guardado.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  });
  const fijar = (id: string, abierto: boolean) =>
    setAbiertos((prev) => {
      if (prev.has(id) === abierto) return prev;
      const nuevo = new Set(prev);
      if (abierto) nuevo.add(id);
      else nuevo.delete(id);
      try {
        localStorage.setItem(clave, JSON.stringify([...nuevo]));
      } catch {
        /* sin almacenamiento */
      }
      return nuevo;
    });
  return [abiertos, fijar];
}
```

`src/pantallas/Tareas.tsx` completo:

```tsx
import { Fragment, type ReactNode } from 'react';
import { arbolPorAreas, gruposAhora, type RamaTipo } from '../agenda/grupos';
import { ICONO_TIPO, PLURAL_TIPO } from '../agenda/tipos';
import { FilaTarea } from '../componentes/FilaTarea';
import type { Edicion } from '../componentes/FormTarea';
import { Icono } from '../componentes/Icono';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { useDesplegables } from '../estado/desplegables';
import { useHoy } from '../estado/hoy';

export function Tareas({ editar }: { editar(e: Edicion): void }) {
  const { datos, soloLectura, tareasBloqueadas } = useDatos();
  const hoy = useHoy();
  const [abiertos, fijar] = useDesplegables('tareas-por-areas');
  const grupos = gruposAhora(datos.tareas, hoy);
  const arbol = arbolPorAreas(datos.tareas, datos.areas, hoy);

  const lista = (ts: Tarea[], mostrarFecha: boolean) => (
    <ul className="lista">
      {ts.map((t) => (
        <FilaTarea key={t.id} tarea={t} dia={hoy} mostrarFecha={mostrarFecha} alEditar={(x) => editar({ tarea: x })} />
      ))}
    </ul>
  );

  const desplegable = (id: string, titulo: ReactNode, total: number, hijos: ReactNode) => (
    <details key={id} className="desplegable" open={abiertos.has(id)} onToggle={(e) => fijar(id, e.currentTarget.open)}>
      <summary>
        {titulo}
        <span className="total">{total}</span>
      </summary>
      {hijos}
    </details>
  );

  const ramas = (dueno: string, tipos: RamaTipo[]) =>
    tipos.map((r) =>
      desplegable(
        `${dueno}:${r.tipo}`,
        <>
          <Icono nombre={ICONO_TIPO[r.tipo]} tamano={16} />
          {PLURAL_TIPO[r.tipo]}
        </>,
        r.tareas.length,
        lista(r.tareas, true),
      ),
    );

  return (
    <section>
      <div className="barra">
        <h2>Tareas</h2>
        <button className="principal" disabled={soloLectura || tareasBloqueadas} onClick={() => editar({ nueva: {} })}>
          + Nueva tarea
        </button>
      </div>
      <div className="rejilla-tareas">
        <section className="tarjeta">
          <h2 className="titulo-seccion">Ahora</h2>
          {grupos.length === 0 && <p className="vacio">Nada pendiente por ahora.</p>}
          {grupos.map((g) =>
            g.plegado ? (
              <details key={g.clave} className="grupo-plegable">
                <summary className="grupo">{g.titulo} ({g.tareas.length})</summary>
                {lista(g.tareas, g.mostrarFecha)}
              </details>
            ) : (
              <Fragment key={g.clave}>
                <h3 className={`grupo${g.clave === 'atrasadas' ? ' atrasadas' : ''}`}>{g.titulo}</h3>
                {lista(g.tareas, g.mostrarFecha)}
              </Fragment>
            ),
          )}
        </section>
        <section className="tarjeta">
          <h2 className="titulo-seccion">Por áreas</h2>
          {arbol.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
          {arbol.map((a) =>
            desplegable(
              `area:${a.id}`,
              <>
                <span className="punto" style={{ background: a.color }} />
                {a.nombre}
              </>,
              a.total,
              <>
                {ramas(`area:${a.id}`, a.tipos)}
                {a.subareas.map((s) =>
                  desplegable(
                    `sub:${s.id}`,
                    <>
                      <span className="punto" style={{ background: s.color }} />
                      {s.nombre}
                    </>,
                    s.total,
                    ramas(`sub:${s.id}`, s.tipos),
                  ),
                )}
              </>,
            ),
          )}
        </section>
      </div>
    </section>
  );
}
```

`src/estilos.css`, al final:

```css
.rejilla-tareas { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 20px; align-items: start; }
@media (min-width: 900px) {
  .rejilla-tareas { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
.desplegable > summary { display: flex; align-items: center; gap: 8px; padding: 6px 0; list-style: none; }
.desplegable > summary::-webkit-details-marker { display: none; }
.desplegable > summary::before { content: '▸'; color: var(--suave); width: 1em; }
.desplegable[open] > summary::before { content: '▾'; }
.desplegable .desplegable { margin-left: 18px; }
.desplegable .total { margin-left: auto; color: var(--suave); font-size: 13px; font-weight: 400; }
.grupo-plegable > summary.grupo { margin-top: 14px; }
```

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Mirarlo en el navegador**

`npm run dev` y abrir http://localhost:5173/segundo-cerebro-app/ en la pantalla Tareas (con el token de Diego ya guardado en ese navegador, o comprobando solo que no hay errores en la consola si no lo hay). En el móvil (ventana estrecha) las dos tarjetas van una debajo de otra. Si algo se ve mal, arréglalo en `estilos.css` y apúntalo.

- [ ] **Step 6: Commit**

```bash
git add src/estado/desplegables.ts src/pantallas/Tareas.tsx src/pantallas/Tareas.test.tsx src/estilos.css
git commit -m "v1.5: pantalla Tareas con tarjetas «Ahora» y «Por áreas»"
```

---

### Task 8: Inicio: urgentes en «Hoy» y tarjeta «Próximos exámenes»

**Files:**
- Create: `src/componentes/ProximosExamenes.tsx`
- Modify: `src/pantallas/Inicio.tsx`, `src/estilos.css`
- Test: `src/componentes/ProximosExamenes.test.tsx`

**Interfaces:**
- Consumes: `proximosExamenes`, `urgentes` (Tarea 4); `faltan`, `textoFaltan` (Tarea 3); `formatoCorto`; `colorDeArea`.
- Produces: `ProximosExamenes({ tareas, hoy, ir }: { tareas: Tarea[]; hoy: ISODate; ir(d: Destino): void })` → `null` si no hay exámenes.

- [ ] **Step 1: Escribir la prueba que falla**

`src/componentes/ProximosExamenes.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parseAreas } from '../datos/areas';
import { ProximosExamenes } from './ProximosExamenes';

vi.mock('../estado/datos', () => ({
  useDatos: () => ({ datos: { areas: parseAreas('- id: uni\n  nombre: Uni\n  color: "#a855f7"\n'), tareas: [], proyectos: [], ideas: [] } }),
}));

describe('ProximosExamenes', () => {
  it('los 3 más cercanos con cuánto falta', () => {
    const tareas = [
      { id: 'a', titulo: 'Cálculo (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-21' },
      { id: 'b', titulo: 'Álgebra (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-18' },
      { id: 'c', titulo: 'FP (enero)', area: 'uni', tipo: 'examen' as const, fecha: '2027-01-08' },
      { id: 'd', titulo: 'Arquitectura (mayo)', area: 'uni', tipo: 'examen' as const, fecha: '2027-05-12' },
    ];
    const html = renderToString(<ProximosExamenes tareas={tareas} hoy="2026-10-01" ir={() => undefined} />);
    expect(html).toContain('Próximos exámenes');
    expect(html.indexOf('FP (enero)')).toBeLessThan(html.indexOf('Álgebra (enero)'));
    expect(html).toContain('faltan 99 días');
    expect(html).not.toContain('Arquitectura');
  });
  it('sin exámenes no pinta nada', () => {
    expect(renderToString(<ProximosExamenes tareas={[]} hoy="2026-10-01" ir={() => undefined} />)).toBe('');
  });
});
```

(Del 1 de octubre de 2026 al 8 de enero de 2027 hay 99 días.)

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/ProximosExamenes.test.tsx`
Expected: FAIL (no existe el componente).

- [ ] **Step 3: Implementar**

`src/componentes/ProximosExamenes.tsx`:

```tsx
import { colorDeArea } from '../agenda/areas';
import { proximosExamenes } from '../agenda/grupos';
import { faltan, textoFaltan } from '../agenda/plazos';
import type { Tarea } from '../datos/tareas';
import { useDatos } from '../estado/datos';
import { formatoCorto, type ISODate } from '../fechas';
import type { Destino } from './navegacion';

// Tarjetita del Inicio con los exámenes más cercanos (spec §4). Si no hay ninguno, no aparece.
export function ProximosExamenes({ tareas, hoy, ir }: { tareas: Tarea[]; hoy: ISODate; ir(d: Destino): void }) {
  const { datos } = useDatos();
  const examenes = proximosExamenes(tareas, hoy);
  if (examenes.length === 0) return null;
  return (
    <section className="tarjeta">
      <h2 className="titulo-seccion">Próximos exámenes</h2>
      <ul className="lista">
        {examenes.map((t) => (
          <li key={t.id}>
            <button className="proximo-examen" onClick={() => ir({ pantalla: 'calendario', dia: t.fecha! })}>
              <span className="proximo-examen-titulo">
                <span className="punto" style={{ background: colorDeArea(datos.areas, t.area) }} />
                {t.titulo}
              </span>
              <span className="detalle">
                {formatoCorto(t.fecha!)} · {textoFaltan(faltan(t.fecha!, hoy))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`src/pantallas/Inicio.tsx`:
- Imports: añade `import { urgentes } from '../agenda/grupos';` y `import { ProximosExamenes } from '../componentes/ProximosExamenes';`.
- Debajo de `const top = topSinFecha(datos.tareas);`: `const muyPronto = urgentes(datos.tareas, hoy);`
- En la tarjeta Hoy, justo después del bloque «Para hoy» (`{deHoy.length ? … }`), añade:
  ```tsx
          {muyPronto.length > 0 && (
            <>
              <h3 className="grupo">Muy pronto: exámenes y entregas</h3>
              {lista(muyPronto, true)}
            </>
          )}
  ```
- Envuelve la tarjeta «Proyectos activos» en una columna con la tarjeta nueva encima:
  ```tsx
        <div>
          <ProximosExamenes tareas={datos.tareas} hoy={hoy} ir={ir} />
          <section className="tarjeta">
            … (la tarjeta de proyectos activos, sin cambios)
          </section>
        </div>
  ```

`src/estilos.css`, al final:

```css
.proximo-examen { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 8px 4px; border: 0; border-bottom: 1px solid var(--borde-suave); border-radius: 0; background: transparent; flex-wrap: wrap; }
.proximo-examen-titulo { display: flex; align-items: center; gap: 8px; font-weight: 600; }
```

- [ ] **Step 4: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/componentes/ProximosExamenes.tsx src/componentes/ProximosExamenes.test.tsx src/pantallas/Inicio.tsx src/estilos.css
git commit -m "v1.5: Inicio con exámenes y entregas urgentes y tarjeta «Próximos exámenes»"
```

---

### Task 9: Sincronización de la uni con tipos

**Files:**
- Modify: `src/uni/tipos.ts`, `src/uni/examenes.ts`, `src/uni/moodle.ts`, `src/uni/fusionar.ts`
- Test: `src/uni/examenes.test.ts`, `src/uni/moodle.test.ts`, `src/uni/fusionar.test.ts`, `sincronizar/uni.test.ts`

**Interfaces:**
- Consumes: `TipoTarea` de `src/datos/tareas.ts`.
- Produces: `Propuesta` pasa a ser `{ origen: string; titulo: string; tipo: TipoTarea; area: string; fecha: ISODate; hora?: string; notas?: string; notasDeLaFuente: boolean }` (**sin** `prioridad` ni `icono`). `fusionar` crea las tareas con `tipo` (si no es `tarea`), sin `prioridad` ni `icono`.

- [ ] **Step 1: Actualizar las pruebas al comportamiento nuevo (y verlas fallar)**

- `src/uni/examenes.test.ts`, prueba «convierte un examen con el nombre bonito de la asignatura»: el objeto esperado pasa a ser
  ```ts
  {
    origen: 'urjc-examen:2026-27:2327007:E:AM',
    titulo: 'Cálculo (enero)',
    tipo: 'examen',
    area: 'calculo',
    fecha: '2027-01-21',
    hora: '09:00',
    notas: '09:00 - 12:00 · Aulario II - Aula 204',
    notasDeLaFuente: true,
  }
  ```
  y en «convocatorias» los títulos esperados pasan a `'Cálculo (enero)', 'Cálculo (mayo)', 'Cálculo (junio)', 'Cálculo (septiembre)', 'Cálculo (convocatoria X)'`.
- `src/uni/moodle.test.ts`:
  - «una entrega que vence a las 00:00…»: esperado `{ origen: 'moodle:1@aula', titulo: 'Práctica 1', tipo: 'entrega', area: 'fundamentos-programacion', fecha: '2026-10-05', hora: '23:59', notasDeLaFuente: false }`.
  - ««vence» también es una entrega…»: esperado `['Tarea 2']`.
  - «un evento del profesor va con su título, sin icono»: cámbiale el nombre a «un evento del profesor va como tarea, con su título» y comprueba `expect(p).toMatchObject({ titulo: 'Parcial tema 1-3', tipo: 'tarea', fecha: '2026-11-12', hora: '10:00' })` (quita la línea de `icono`).
  - «la descripción va a las notas…»: `expect(p.titulo).toBe('Memoria & código')`.
- `src/uni/fusionar.test.ts`:
  - En `examen(...)` y `entrega(...)`: quita `prioridad` e `icono`, añade `tipo: 'examen'` / `tipo: 'entrega'`, y los títulos pasan a `'Cálculo (enero)'` y `'Práctica 1'`.
  - En «crea lo nuevo…», las tareas esperadas pasan a
    ```ts
      { id: 't-20260930-3', titulo: 'Cálculo (enero)', tipo: 'examen', area: 'calculo',
        fecha: '2027-01-21', hora: '09:00', notas: '09:00 - 12:00 · Aula 204', origen: 'urjc-examen:2026-27:2327007:E:AM' },
      { id: 't-20260930-4', titulo: 'Práctica 1', tipo: 'entrega', area: 'fundamentos-programacion',
        fecha: '2026-10-05', hora: '23:59', notas: 'Sube el código', origen: 'moodle:1@aula' },
    ```
  - En «si la URJC mueve el examen…», `editada` sigue igual (`prioridad: 'baja'` a mano se respeta).
  - Añade:
    ```ts
      it('un evento del profesor se crea como tarea (sin campo tipo)', () => {
        const r = fusionar([], {}, [entrega({ origen: 'moodle:9@aula', titulo: 'Parcial', tipo: 'tarea' })], HOY);
        expect('tipo' in r.tareas[0]).toBe(false);
      });
    ```
- `sincronizar/uni.test.ts`, «mete las novedades…»: los títulos esperados pasan a `'Cálculo (enero)'` y `'Práctica 1'`, y añade `expect(tareas.map((t) => t.tipo)).toEqual([undefined, 'examen', 'entrega'])`.

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/uni sincronizar`
Expected: FAIL (títulos con prefijo, sin `tipo`, con `prioridad` e `icono`). Si `tsc`/Vitest se queja del tipo `Propuesta` en las pruebas, es lo esperado hasta el Step 2.

- [ ] **Step 2: Implementar**

`src/uni/tipos.ts`: en `Propuesta`, quita `prioridad` e `icono`, añade `tipo: TipoTarea;` y cambia el import de `Prioridad` por `import type { TipoTarea } from '../datos/tareas.ts';`.

`src/uni/examenes.ts`, en `propuesta(...)` y en `Fila`: el título pasa a `` `${asignatura.nombre} (${CONVOCATORIAS[convocatoria] ?? `convocatoria ${convocatoria}`})` `` y el objeto devuelto sustituye `prioridad: 'alta', icono: 'school',` por `tipo: 'examen',`.

`src/uni/moodle.ts`, en el `r.push`:
```ts
      titulo: entrega ? entrega[1] : titulo,
      tipo: entrega ? 'entrega' : 'tarea',
```
y quita `prioridad: 'media',` y la línea de `icono`.

`src/uni/fusionar.ts`, `crear`:
```ts
function crear(p: Propuesta, id: string): Tarea {
  return {
    id,
    titulo: p.titulo,
    ...(p.tipo !== 'tarea' ? { tipo: p.tipo } : {}),
    area: p.area,
    fecha: p.fecha,
    ...(p.hora ? { hora: p.hora } : {}),
    ...(p.notas ? { notas: p.notas } : {}),
    origen: p.origen,
  };
}
```

- [ ] **Step 3: Ejecutar las pruebas y ver que pasan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 4: Commit**

```bash
git add src/uni sincronizar
git commit -m "v1.5: la sincronización de la uni crea exámenes y entregas con su tipo, sin prioridad fija"
```

---

### Task 10: Documentación, revisión final y publicación (con Diego, la hace el controlador)

**Files:**
- Modify (app): `docs/diseno.md` (sección 3), `AGENTS.md` (Estructura y Estado actual)
- Modify (`my-context`): `AGENTS.md`, `agenda/tareas.yaml` (arreglo único de las tareas de la uni y Boxeo)

- [ ] **Step 1: Documentación**

`docs/diseno.md`, tabla de `agenda/tareas.yaml`:
- Fila nueva `| \`tipo\` | no | \`tarea\` (por defecto, no se escribe), \`entrega\`, \`examen\`, \`recado\` o \`evento\` |`
- Fila `repetir`: «lista de días (`lun` … `dom`), o `mes` (cada mes, el día de `fecha`), o `año` (cada año, el día y mes de `fecha`). `mes`/`año` necesitan `fecha`».
- Fila nueva `| \`hasta\` | no | \`AAAA-MM-DD\`: último día de una tarea que se repite. Sin él, sin final. No anterior a \`fecha\` |`
- En «Reglas»: eventos sin casilla; plazos de exámenes (21/7 días) y entregas (14/3) con prioridad automática si no hay `prioridad`; examen pasado no atrasado; recados en su grupo. Enlace al spec `docs/superpowers/specs/2026-09-30-tareas-ordenadas-design.md`.
- En la sección de la uni: la sincronización crea `tipo: examen|entrega`, sin prioridad ni icono, títulos sin prefijo.

`AGENTS.md` de la app, «Estructura del código», en `src/agenda/`: añadir `tipos.ts` (tipos de tarea, iconos y campos del formulario), `plazos.ts` (plazos y prioridad automática), `grupos.ts` (grupos de «Ahora», árbol «Por áreas», próximos exámenes), `repeticion.ts` y `formTarea.ts` (lógica del formulario).

```bash
git add docs/diseno.md AGENTS.md
git commit -m "v1.5: documentación de tipos, repeticiones y plazos"
```

- [ ] **Step 2: Revisión final y publicar (avisando a Diego)**

Revisión de toda la rama con un revisor nuevo (`superpowers:executing-plans` → Final Review), arreglos con su prueba y `npm test && npm run build` en verde. Con el visto bueno de Diego:

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout main
git merge --no-ff v1.5-tareas-ordenadas -m "v1.5: tareas ordenadas"
export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build
git push
```

Pídele a Diego que abra la app una vez en cada dispositivo.

- [ ] **Step 3: Arreglo único de las tareas de la uni (avisando a Diego)**

Script de un solo uso en el scratchpad (no va al repositorio), escrito con la herramienta Write, que usa los parsers de la app:

```ts
// arreglo-uni.ts: pone tipo a las tareas importadas y les quita prioridad, icono y prefijo del título.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseTareas, serializarTareas } from 'C:/Users/Diego/Desktop/segundo-cerebro-app/src/datos/tareas.ts';

const ruta = 'C:/Users/Diego/Desktop/my-context/agenda/tareas.yaml';
const prueba = process.argv.includes('--prueba');
const tareas = parseTareas(readFileSync(ruta, 'utf8')).map((t) => {
  if (!t.origen) return t;
  const tipo = t.origen.startsWith('urjc-examen:') ? 'examen' : t.titulo.startsWith('Entrega: ') ? 'entrega' : undefined;
  if (!tipo) return t; // eventos del profesor: se quedan como tarea
  const r = { ...t, tipo, titulo: t.titulo.replace(/^(Examen|Entrega): /, '') } as typeof t;
  // Solo se quita lo que puso la sincronización: la prioridad alta de los exámenes y sus iconos.
  if (r.prioridad === 'alta' && tipo === 'examen') delete r.prioridad;
  if (r.icono === 'school' || r.icono === 'file-upload') delete r.icono;
  return r;
});
const texto = serializarTareas(tareas);
parseTareas(texto); // comprobación: la app lo sabrá leer
if (prueba) console.log(tareas.filter((t) => t.origen).map((t) => `${t.id} | ${t.tipo ?? 'tarea'} | ${t.titulo} | ${t.prioridad ?? ''}`).join('\n'));
else writeFileSync(ruta, texto);
```

```bash
cd /c/Users/Diego/Desktop/my-context && git pull -q
export PATH="$PATH:/c/Program Files/nodejs"
node <scratchpad>/arreglo-uni.ts --prueba   # revisar: 20 examen + 2 entrega, sin prefijos ni prioridad
node <scratchpad>/arreglo-uni.ts
```

Pregunta a Diego por Boxeo: ¿Evento? ¿Hasta cuándo? Aplica su respuesta en `agenda/tareas.yaml` (`tipo: evento` y, si dice, `hasta`). **No** pongas `repetir: mes|año` en nada hasta que Diego confirme que ha abierto la app nueva en todos sus dispositivos.

`my-context/AGENTS.md`, sección «Agenda», añade:
- `- Tipo de cada tarea (\`tipo\`): tarea (por defecto, no se escribe), entrega, examen, recado o evento. Un cumpleaños o algo que pasa a una hora sin «hacerlo» (boxeo, una quedada) es \`evento\`; una compra rápida, \`recado\`. Repeticiones: \`repetir\` con días, \`mes\` o \`año\` (los dos últimos necesitan \`fecha\`) y \`hasta\` para el último día. Los exámenes y entregas no llevan prioridad salvo que Diego la pida: la app la calcula según lo cerca que estén.`

```bash
git add -A
git commit -m "v1.5: tareas de la uni con tipo, Boxeo como evento e instrucciones de tipos"
git pull -q && git push
```

- [ ] **Step 4: Diego lo revisa**

Pídele que mire Tareas (Ahora y Por áreas), el Inicio (Hoy y Próximos exámenes), el formulario (tipos, repetir, hasta) y el calendario, en el PC y en el móvil. Ajustes con su prueba primero.

- [ ] **Step 5: Cierre de la parte A y de la v1.5**

- Borrar `C:\Users\Diego\.segundo-cerebro\urjc-calendario.txt` (y la carpeta si queda vacía), explicándoselo a Diego. Apuntarlo en el registro de la parte A (`.superpowers/sdd/2026-09-30-uni-calendario/progress.md`, `Task 10: complete`).
- `AGENTS.md` de la app, «Estado actual»: parte A (uni automática) y v1.5 (tareas ordenadas) publicadas, con spec, plan y registro; **Siguiente:** parte C + horario de clases.
- `my-context/proyectos/segundo-cerebro.md`: **sustituir** «Dónde lo dejamos» por el punto actual.
- Commit y push de los dos repositorios, avisando a Diego.
