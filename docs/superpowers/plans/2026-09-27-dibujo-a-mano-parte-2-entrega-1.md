# v1.4 parte 2, entrega 1: cuadros de texto, pantalla completa y Claude ve. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuadros de texto de Diego con fondo, color y tamaño de letra, ancho y alto, y una barrita para borrarlos y cambiarlos. Un botón de pantalla completa para la pizarra. Y que Claude reciba una foto de la pizarra cuando Diego ha cambiado algo o pulsa «👁 Enseñar la pizarra».

**Architecture:** El formato de la pizarra (`src/estudio/pizarra.ts`) gana cuatro campos opcionales en las notas y una operación `estilo`. Esa operación viaja por el mismo camino que las demás: al momento al programa local, la cola de 3 s en el historial, y deshacer con su contraria. La lógica sin pantalla vive en `src/estudio/estiloNota.ts` y `src/estudio/foto.ts`. La pantalla añade `BarritaPieza.tsx`, un hook de pantalla completa y la foto con `html-to-image`, que se carga solo al hacer la foto. El programa local recibe la foto como una imagen más y añade dos líneas a la cabecera del mensaje.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (entorno `node`, pruebas de pantalla con `renderToString`), programa local en Node sin compilar (imports con `.ts`), `html-to-image` (nuevo, MIT).

**Spec:** `docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md` (secciones 2, 3, 4, 6 «Entrega 1», 7 y 8).

## Global Constraints

- Habla con Diego en español sencillo. Textos de la app en español.
- Node está en `C:\Program Files\nodejs`. En Bash: `export PATH="$PATH:/c/Program Files/nodejs";` delante de cada comando.
- Pruebas: `npm test` (Vitest). Tipos y compilación: `npm run build`.
- Los archivos de `src/estudio/` que usa también `local/` (`pizarra.ts`, `contexto.ts`, `tipos.ts`, `foto.ts`) importan con extensión `.ts`. El resto de la app, sin extensión (como ahora).
- `fondo`: `"ninguno"` o `#rrggbb`. Si falta: amarillo de siempre (`#fff4c2`, borde `#ecd98a`).
- `colorTexto`: `#rrggbb`. `tamanoLetra`: `pequena` | `normal` | `grande` | `enorme` = 13, 15, 22 y 32 px. `alto`: 30 a 4000. `ancho`: 40 a 2000.
- Una pizarra con alguno de esos campos se escribe como `version: 2`.
- Foto: lo que se ve, 1280 px de ancho como mucho, PNG, con etiquetas de los ids solo en la foto.
- Cabecera: `Foto de la pizarra: <ruta>` y `Zona de la foto: x <x1>–<x2>, y <y1>–<y2> (coordenadas de la pizarra)`.
- Botón del chat: «👁 Enseñar la pizarra», que manda el texto «Mira lo que he hecho en la pizarra».
- Aviso si falla la foto: «No he podido mandar la foto de la pizarra».
- Dependencia nueva solo `html-to-image`. Nada de tokens ni datos personales en el repositorio.
- Trabajo en la rama `v1.4-parte-2` (se crea en la Tarea 1). Nunca `git push` sin que Diego lo sepa.
- Cada tarea deja su línea en `.superpowers/sdd/2026-09-27-dibujo-a-mano-parte-2/progress.md`. Lo que se aparte del plan se apunta como `Ruling:`.

## Review Focus

- Tirador arrastrado hacia dentro más allá del mínimo → el cuadro se queda en 40 de ancho y 30 de alto (una operación fuera de rango la rechazaría el programa local y se perdería el cambio). Prueba en la Tarea 2 (`redimensionar`).
- Notas que ya existen, sin campos nuevos → siguen amarillas y la pizarra sigue siendo `version: 1` al guardarla. Pruebas en las Tareas 1 y 3.
- Esc mientras se escribe una nota en pantalla completa → cancela la nota pero no sale de la pantalla completa de la app. Prueba en la Tarea 5 (`escSale`).
- Mensaje solo con foto (botón 👁 sin texto) → el programa local lo acepta y Claude recibe la cabecera con la foto. Prueba en la Tarea 6.
- Programa local antiguo abierto (sin foto) → la app avisa para reiniciarlo en vez de mandar fotos que nadie lee: `VERSION_PROGRAMA` pasa a 3. Prueba en la Tarea 6.

---

### Task 1: Formato: estilo de las notas y operación `estilo`

**Files:**
- Modify: `src/estudio/pizarra.ts`
- Modify: `src/estudio/deshacer.ts`
- Test: `src/estudio/pizarra.test.ts`, `src/estudio/deshacer.test.ts`, `local/pizarras.test.ts`

**Interfaces:**
- Produces (en `src/estudio/pizarra.ts`):
  - `export type TamanoLetra = 'pequena' | 'normal' | 'grande' | 'enorme'`
  - `export const TAMANOS_LETRA: readonly TamanoLetra[]` (en ese orden)
  - `export const SIN_FONDO = 'ninguno'`
  - `BasePieza` gana `fondo?: string; colorTexto?: string; tamanoLetra?: TamanoLetra; alto?: number` (solo se rellenan en piezas `nota`)
  - `Operacion` gana `{ tipo: 'estilo'; id: string; fondo?: string | null; colorTexto?: string | null; tamanoLetra?: TamanoLetra | null; ancho?: number; alto?: number | null }`
  - `export type OpEstilo = Extract<Operacion, { tipo: 'estilo' }>`
- `contraria(p, op)` de `deshacer.ts` acepta `estilo`.

- [ ] **Step 1: Crear la rama y el registro**

```bash
cd /c/Users/Diego/Desktop/segundo-cerebro-app
git checkout -b v1.4-parte-2
mkdir -p .superpowers/sdd/2026-09-27-dibujo-a-mano-parte-2
echo "Setup: rama v1.4-parte-2 (main queda intacta hasta que Diego pruebe)." > .superpowers/sdd/2026-09-27-dibujo-a-mano-parte-2/progress.md
```

- [ ] **Step 2: Escribir las pruebas que fallan (pizarra.test.ts)**

Añade al final de `src/estudio/pizarra.test.ts`:

```ts
describe('estilo de las notas', () => {
  const conNota = (cambios: Record<string, unknown>) => pieza(5, cambios);
  it('una nota acepta fondo, colorTexto, tamanoLetra y alto', () => {
    const { pizarra } = validarPizarra(conNota({ fondo: 'ninguno', colorTexto: '#3B82F6', tamanoLetra: 'grande', alto: 120 }));
    expect(pizarra.piezas[5]).toMatchObject({ fondo: 'ninguno', colorTexto: '#3b82f6', tamanoLetra: 'grande', alto: 120 });
    expect(pizarra.version).toBe(2);
  });
  it('en las demás piezas esos campos se ignoran', () => {
    const { pizarra } = validarPizarra(pieza(0, { fondo: '#ffffff', alto: 50 }));
    expect(pizarra.piezas[0]).not.toHaveProperty('fondo');
    expect(pizarra.piezas[0]).not.toHaveProperty('alto');
  });
  it('valores que no valen', () => {
    expect(() => validarPizarra(conNota({ fondo: 'rojo' }))).toThrow(ErrorPizarra);
    expect(() => validarPizarra(conNota({ colorTexto: 'ninguno' }))).toThrow(ErrorPizarra);
    expect(() => validarPizarra(conNota({ tamanoLetra: 'gigante' }))).toThrow(ErrorPizarra);
    expect(() => validarPizarra(conNota({ alto: 10 }))).toThrow(ErrorPizarra);
  });
  it('una nota antigua, sin estilo, sigue siendo versión 1', () => {
    const { pizarra } = validarPizarra(ejemplo);
    expect(pizarra.version).toBe(1);
    expect(JSON.parse(serializarPizarra(pizarra)).version).toBe(1);
  });
  it('el estilo se conserva al escribir y volver a leer', () => {
    const { pizarra } = validarPizarra(conNota({ fondo: '#f7e3d9', tamanoLetra: 'enorme' }));
    const otra = validarPizarra(JSON.parse(serializarPizarra(pizarra))).pizarra;
    expect(otra.piezas[5]).toMatchObject({ fondo: '#f7e3d9', tamanoLetra: 'enorme' });
  });
});

describe('operación estilo', () => {
  const p = validarPizarra(ejemplo).pizarra;
  it('cambia solo lo que trae, y null quita el campo', () => {
    const a = aplicarOperacion(p, { tipo: 'estilo', id: 'n1', fondo: 'ninguno', tamanoLetra: 'grande', alto: 99.6 });
    expect(a.piezas[5]).toMatchObject({ fondo: 'ninguno', tamanoLetra: 'grande', alto: 100, contenido: '¿Y con rozamiento?' });
    const b = aplicarOperacion(a, { tipo: 'estilo', id: 'n1', fondo: null, alto: null });
    expect(b.piezas[5]).not.toHaveProperty('fondo');
    expect(b.piezas[5]).not.toHaveProperty('alto');
    expect(b.piezas[5]).toMatchObject({ tamanoLetra: 'grande' });
  });
  it('ancho vale en cualquier pieza; el resto, solo en notas', () => {
    const a = aplicarOperacion(p, { tipo: 'estilo', id: 't1', ancho: 400.4, fondo: '#ffffff' });
    expect(a.piezas[0].ancho).toBe(400);
    expect(a.piezas[0]).not.toHaveProperty('fondo');
  });
  it('es idempotente y no hace nada si la pieza no existe', () => {
    const op: Operacion = { tipo: 'estilo', id: 'n1', colorTexto: '#b3412e' };
    expect(aplicarOperacion(aplicarOperacion(p, op), op)).toEqual(aplicarOperacion(p, op));
    expect(aplicarOperacion(p, { tipo: 'estilo', id: 'no-existe', fondo: 'ninguno' })).toEqual(p);
  });
  it('validarOperacion', () => {
    expect(validarOperacion({ tipo: 'estilo', id: 'n1', fondo: null, tamanoLetra: 'pequena', ancho: 300 })).toEqual({
      tipo: 'estilo', id: 'n1', fondo: null, tamanoLetra: 'pequena', ancho: 300,
    });
    expect(() => validarOperacion({ tipo: 'estilo', id: 'n1', ancho: 20 })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'estilo', id: 'n1', alto: 5000 })).toThrow(ErrorPizarra);
    expect(() => validarOperacion({ tipo: 'estilo', id: 'n1', fondo: 'azul' })).toThrow(ErrorPizarra);
    expect(validarOperacion({ tipo: 'lote', ops: [{ tipo: 'estilo', id: 'n1', fondo: 'ninguno' }] })).toEqual({
      tipo: 'lote', ops: [{ tipo: 'estilo', id: 'n1', fondo: 'ninguno' }],
    });
  });
});
```

- [ ] **Step 3: Escribir las pruebas que fallan (deshacer.test.ts y pizarras.test.ts)**

En `src/estudio/deshacer.test.ts`, justo después de la línea `const conTrazo = …`, añade:

```ts
const conEstilo = aplicarOperacion(base, { tipo: 'estilo', id: 'n1', fondo: '#ffffff', alto: 100 });
```

y dentro de la lista `casos` (después de `['editar una nota', …]`) añade:

```ts
    ['estilo de una nota', base, { tipo: 'estilo', id: 'n1', fondo: 'ninguno', tamanoLetra: 'grande', ancho: 300 }],
    ['quitar el estilo de una nota', conEstilo, { tipo: 'estilo', id: 'n1', fondo: null, alto: null }],
    ['nota nueva con su estilo (lote)', base, { tipo: 'lote', ops: [
      { tipo: 'nota', id: null, nuevoId: 'd-n', x: 1, y: 2, contenido: 'Otra', capa: 'capa-1' },
      { tipo: 'estilo', id: 'd-n', fondo: 'ninguno', tamanoLetra: 'normal' },
    ] }],
```

En `local/pizarras.test.ts`, dentro de `describe('pizarras en el disco', …)`, añade (sigue el estilo de la prueba «crear, listar y operar»: mira al principio del archivo cómo crea la carpeta temporal `c` y la pizarra 1, y haz lo mismo):

```ts
  it('acepta la operación estilo y la guarda en el archivo', async () => {
    const c = mkdtempSync(path.join(os.tmpdir(), 'estilo-'));
    await crearPizarra(c);
    await operarPizarra(c, 1, { tipo: 'nota', id: null, nuevoId: 'd-1', x: 0, y: 0, contenido: 'Hola' });
    const p = await operarPizarra(c, 1, { tipo: 'estilo', id: 'd-1', fondo: 'ninguno', tamanoLetra: 'grande' });
    expect(p.piezas[0]).toMatchObject({ fondo: 'ninguno', tamanoLetra: 'grande' });
    const enDisco = JSON.parse(readFileSync(rutaPizarra(c, 1), 'utf8'));
    expect(enDisco.version).toBe(2);
    expect(enDisco.piezas[0]).toMatchObject({ fondo: 'ninguno', tamanoLetra: 'grande' });
  });
```

(Si `crearPizarra`, `mkdtempSync`, `readFileSync`, `os` o `rutaPizarra` tienen otra firma o no están importados en ese archivo, usa lo que usa la primera prueba del archivo y añade los imports que falten.)

- [ ] **Step 4: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/pizarra.test.ts src/estudio/deshacer.test.ts local/pizarras.test.ts`
Expected: FAIL (los campos nuevos no se conservan; `Operación desconocida` en `estilo`).

- [ ] **Step 5: Implementar en `src/estudio/pizarra.ts`**

Tipos, arriba del archivo (sustituye la línea de `BasePieza` y añade lo demás junto a ella):

```ts
export type TamanoLetra = 'pequena' | 'normal' | 'grande' | 'enorme';
export const TAMANOS_LETRA: readonly TamanoLetra[] = ['pequena', 'normal', 'grande', 'enorme'];
export const SIN_FONDO = 'ninguno';
// fondo, colorTexto, tamanoLetra y alto: solo en las notas de Diego (v1.4 parte 2).
interface BasePieza {
  id: string; x: number; y: number; ancho: number; color?: string; capa?: string; letra?: 'mano';
  fondo?: string; colorTexto?: string; tamanoLetra?: TamanoLetra; alto?: number;
}
```

En el tipo `Operacion`, añade al final de la unión:

```ts
  | { tipo: 'estilo'; id: string; fondo?: string | null; colorTexto?: string | null; tamanoLetra?: TamanoLetra | null; ancho?: number; alto?: number | null };
```

y debajo:

```ts
export type OpEstilo = Extract<Operacion, { tipo: 'estilo' }>;
```

Validadores, junto a `sinVacios`:

```ts
const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
function fondoValido(v: unknown, donde: string): string {
  if (v === SIN_FONDO) return SIN_FONDO;
  if (esHex(v)) return v.toLowerCase();
  throw new ErrorPizarra(`${donde} debe ser «ninguno» o un color #rrggbb`);
}
function colorValido(v: unknown, donde: string): string {
  if (esHex(v)) return v.toLowerCase();
  throw new ErrorPizarra(`${donde} debe ser un color #rrggbb`);
}
function tamanoValido(v: unknown, donde: string): TamanoLetra {
  if (TAMANOS_LETRA.includes(v as TamanoLetra)) return v as TamanoLetra;
  throw new ErrorPizarra(`${donde} debe ser pequena, normal, grande o enorme`);
}
function anchoValido(v: unknown, donde: string): number {
  const n = numero(v, donde);
  if (n < 40 || n > 2000) throw new ErrorPizarra(`${donde} debe estar entre 40 y 2000`);
  return n;
}
function altoValido(v: unknown, donde: string): number {
  const n = numero(v, donde);
  if (n < 30 || n > 4000) throw new ErrorPizarra(`${donde} debe estar entre 30 y 4000`);
  return Math.round(n);
}
```

En `validarPieza`, sustituye las dos líneas del ancho:

```ts
  const ancho = numero(o.ancho, `${donde}.ancho`);
  if (ancho < 40 || ancho > 2000) throw new ErrorPizarra(`${donde}.ancho debe estar entre 40 y 2000`);
```

por:

```ts
  const ancho = anchoValido(o.ancho, `${donde}.ancho`);
  const nota = o.tipo === 'nota';
  const deNota = <T,>(v: unknown, f: (v: unknown, d: string) => T, campo: string): T | undefined =>
    nota && v !== undefined && v !== null ? f(v, `${donde}.${campo}`) : undefined;
```

y dentro del `sinVacios({ … })` de `base`, después de `letra: …`, añade:

```ts
    fondo: deNota(o.fondo, fondoValido, 'fondo'),
    colorTexto: deNota(o.colorTexto, colorValido, 'colorTexto'),
    tamanoLetra: deNota(o.tamanoLetra, tamanoValido, 'tamanoLetra'),
    alto: deNota(o.alto, altoValido, 'alto'),
```

En `necesitaVersion2`, cambia el `p.piezas.some(…)` para que también cuente el estilo:

```ts
    p.piezas.some(
      (x) =>
        x.letra !== undefined ||
        x.fondo !== undefined || x.colorTexto !== undefined || x.tamanoLetra !== undefined || x.alto !== undefined ||
        x.capa !== capaPorDefecto(p.capas, esDeClaudePieza(x)),
    )
```

(y actualiza el comentario de encima: «Con algo de la v1.4 (trazos, letra a mano, estilo de notas, capas propias, notas en otra capa)…»).

Antes de `aplicar`, añade:

```ts
const CAMPOS_ESTILO = ['fondo', 'colorTexto', 'tamanoLetra', 'alto'] as const;

// El ancho vale en cualquier pieza; fondo, colorTexto, tamanoLetra y alto, solo en notas. null quita el campo.
function conEstilo(x: Pieza, op: OpEstilo): Pieza {
  const r: Record<string, unknown> = { ...x };
  if (op.ancho !== undefined) r.ancho = Math.round(op.ancho);
  if (x.tipo === 'nota')
    for (const k of CAMPOS_ESTILO) {
      const v = op[k];
      if (v === null) delete r[k];
      else if (v !== undefined) r[k] = k === 'alto' ? Math.round(v as number) : v;
    }
  return r as unknown as Pieza;
}
```

En `aplicar`, añade el caso (antes de `case 'lote'`):

```ts
    case 'estilo':
      return { ...p, piezas: p.piezas.map((x) => (x.id === op.id ? conEstilo(x, op) : x)) };
```

En `validarOperacion`, añade el caso (antes de `case 'lote'`):

```ts
    case 'estilo': {
      const campo = <T,>(v: unknown, f: (v: unknown, d: string) => T, d: string): T | null | undefined =>
        v === undefined ? undefined : v === null ? null : f(v, d);
      return sinVacios({
        tipo: 'estilo' as const,
        id: texto(o.id, 'id'),
        fondo: campo(o.fondo, fondoValido, 'fondo'),
        colorTexto: campo(o.colorTexto, colorValido, 'colorTexto'),
        tamanoLetra: campo(o.tamanoLetra, tamanoValido, 'tamanoLetra'),
        ancho: o.ancho === undefined || o.ancho === null ? undefined : anchoValido(o.ancho, 'ancho'),
        alto: campo(o.alto, altoValido, 'alto'),
      });
    }
```

(`sinVacios` quita solo los `undefined`: los `null` se quedan, que es lo que queremos.)

- [ ] **Step 6: Implementar la contraria en `src/estudio/deshacer.ts`**

Añade el caso en `contraria` (antes de `case 'lote'`):

```ts
    case 'estilo': {
      const x = p.piezas.find((y) => y.id === op.id);
      if (!x) return null;
      // Por cada campo que cambia, el valor de antes (null = no lo tenía).
      const c: OpEstilo = { tipo: 'estilo', id: x.id };
      if (op.ancho !== undefined) c.ancho = x.ancho;
      if (op.fondo !== undefined) c.fondo = x.fondo ?? null;
      if (op.colorTexto !== undefined) c.colorTexto = x.colorTexto ?? null;
      if (op.tamanoLetra !== undefined) c.tamanoLetra = x.tamanoLetra ?? null;
      if (op.alto !== undefined) c.alto = x.alto ?? null;
      return c;
    }
```

(Añade `type OpEstilo` al import de `./pizarra` de ese archivo.)

- [ ] **Step 7: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test`
Expected: PASS (toda la suite).

- [ ] **Step 8: Commit**

```bash
git add src/estudio/pizarra.ts src/estudio/deshacer.ts src/estudio/pizarra.test.ts src/estudio/deshacer.test.ts local/pizarras.test.ts
git commit -m "Pizarra: las notas tienen fondo, color y tamaño de letra, alto y ancho (operación estilo)"
```

---

### Task 2: Lógica del estilo de las notas (`estiloNota.ts`)

**Files:**
- Create: `src/estudio/estiloNota.ts`
- Test: `src/estudio/estiloNota.test.ts`

**Interfaces:**
- Consumes: `SIN_FONDO`, `TAMANOS_LETRA`, `TamanoLetra`, `Pieza`, `Operacion` (Tarea 1); `COLORES` de `src/estudio/herramientas.ts`.
- Produces:
  - `export const PX_LETRA: Record<TamanoLetra, number>` = `{ pequena: 13, normal: 15, grande: 22, enorme: 32 }`
  - `export const AMARILLO = { fondo: '#fff4c2', borde: '#ecd98a' }`
  - `export function mezclar(a: string, b: string, t: number): string`
  - `export const FONDOS: string[]` (los 8 `COLORES` suavizados)
  - `export function pasoLetra(t: TamanoLetra | undefined, delta: 1 | -1): TamanoLetra`
  - `export type AspectoNota = Pick<Pieza, 'fondo' | 'colorTexto' | 'tamanoLetra' | 'alto'>`
  - `export const esSinFondo = (a: AspectoNota) => a.fondo === SIN_FONDO`
  - `export function estiloDeNota(a: AspectoNota): { background: string; borderColor: string; color?: string; fontSize?: number; minHeight?: number }`
  - `export interface UltimoEstilo { fondo: string; colorTexto: string | null; tamanoLetra: TamanoLetra }`
  - `export const ESTILO_INICIAL: UltimoEstilo`, `export const CLAVE_ESTILO_NOTA = 'sc-pizarra-estilo-nota'`
  - `export function leerEstiloNota(texto: string | null): UltimoEstilo`
  - `export type CambioEstilo = { fondo?: string; colorTexto?: string | null; tamanoLetra?: TamanoLetra }`
  - `export function recordarEstilo(u: UltimoEstilo, c: CambioEstilo): UltimoEstilo`
  - `export const aspectoDe = (u: UltimoEstilo): AspectoNota`
  - `export function opEstiloNueva(id: string, u: UltimoEstilo): Operacion`
  - `export function redimensionar(ancho: number, alto: number, dx: number, dy: number, soloAncho: boolean): { ancho: number; alto?: number }`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crea `src/estudio/estiloNota.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  AMARILLO, ESTILO_INICIAL, FONDOS, estiloDeNota, esSinFondo, leerEstiloNota, mezclar, opEstiloNueva, pasoLetra, recordarEstilo, redimensionar,
} from './estiloNota';
import { COLORES } from './herramientas';

describe('estilo de una nota', () => {
  it('sin campos: amarilla como siempre, con la letra de siempre', () => {
    expect(estiloDeNota({})).toEqual({ background: AMARILLO.fondo, borderColor: AMARILLO.borde });
  });
  it('sin fondo: transparente', () => {
    expect(estiloDeNota({ fondo: 'ninguno' })).toEqual({ background: 'transparent', borderColor: 'transparent' });
    expect(esSinFondo({ fondo: 'ninguno' })).toBe(true);
    expect(esSinFondo({})).toBe(false);
  });
  it('con fondo, color, tamaño y alto', () => {
    expect(estiloDeNota({ fondo: '#ffffff', colorTexto: '#3b82f6', tamanoLetra: 'grande', alto: 120 })).toEqual({
      background: '#ffffff', borderColor: mezclar('#ffffff', '#000000', 0.12), color: '#3b82f6', fontSize: 22, minHeight: 120,
    });
  });
  it('mezclar colores', () => {
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mezclar('#b8603d', '#b8603d', 0.3)).toBe('#b8603d');
  });
  it('los fondos son los colores de la paleta, suaves', () => {
    expect(FONDOS).toHaveLength(COLORES.length);
    expect(FONDOS[1]).toBe(mezclar(COLORES[1], '#fdfbf6', 0.8));
  });
  it('A− y A+ van de uno en uno y se paran en los extremos', () => {
    expect(pasoLetra(undefined, 1)).toBe('grande');
    expect(pasoLetra('normal', -1)).toBe('pequena');
    expect(pasoLetra('pequena', -1)).toBe('pequena');
    expect(pasoLetra('enorme', 1)).toBe('enorme');
  });
});

describe('último estilo elegido', () => {
  it('lo que no vale vuelve a lo de por defecto', () => {
    expect(leerEstiloNota(null)).toEqual(ESTILO_INICIAL);
    expect(leerEstiloNota('no es json')).toEqual(ESTILO_INICIAL);
    expect(leerEstiloNota('{"fondo":"rojo","colorTexto":"#B3412E","tamanoLetra":"grande"}')).toEqual({ fondo: 'ninguno', colorTexto: '#b3412e', tamanoLetra: 'grande' });
  });
  it('recuerda lo que se cambia en la barrita', () => {
    const u = recordarEstilo(ESTILO_INICIAL, { fondo: '#f7e3d9' });
    expect(u).toEqual({ ...ESTILO_INICIAL, fondo: '#f7e3d9' });
    expect(recordarEstilo({ ...u, colorTexto: '#3b82f6' }, { colorTexto: null }).colorTexto).toBeNull();
  });
  it('una nota nueva lleva el último estilo', () => {
    expect(opEstiloNueva('d-1', { fondo: 'ninguno', colorTexto: null, tamanoLetra: 'normal' })).toEqual({
      tipo: 'estilo', id: 'd-1', fondo: 'ninguno', colorTexto: null, tamanoLetra: 'normal',
    });
  });
});

describe('tirador', () => {
  it('suma lo arrastrado', () => {
    expect(redimensionar(240, 80, 60.4, 20.6, false)).toEqual({ ancho: 300, alto: 101 });
  });
  it('con Mayús solo cambia el ancho', () => {
    expect(redimensionar(240, 80, 60, 20, true)).toEqual({ ancho: 300 });
  });
  it('no baja de 40 × 30 ni pasa de 2000 × 4000', () => {
    expect(redimensionar(240, 80, -900, -900, false)).toEqual({ ancho: 40, alto: 30 });
    expect(redimensionar(240, 80, 9000, 9000, false)).toEqual({ ancho: 2000, alto: 4000 });
  });
});
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/estiloNota.test.ts`
Expected: FAIL («Failed to resolve import "./estiloNota"»).

- [ ] **Step 3: Implementar `src/estudio/estiloNota.ts`**

```ts
import { COLORES } from './herramientas';
import { SIN_FONDO, TAMANOS_LETRA, type Operacion, type Pieza, type TamanoLetra } from './pizarra';

// Cómo se ve un cuadro de texto de Diego (nota): fondo, color y tamaño de letra, alto.
export const PX_LETRA: Record<TamanoLetra, number> = { pequena: 13, normal: 15, grande: 22, enorme: 32 };
export const AMARILLO = { fondo: '#fff4c2', borde: '#ecd98a' }; // las notas de antes, sin estilo
const PAPEL = '#fdfbf6';

// Mezcla dos colores #rrggbb: t = 0 da `a`, t = 1 da `b`.
export function mezclar(a: string, b: string, t: number): string {
  const canal = (c: string, i: number) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(canal(a, i) * (1 - t) + canal(b, i) * t).toString(16).padStart(2, '0')).join('')}`;
}

// Los colores de la paleta, mezclados con el papel para que el texto se lea bien encima.
export const FONDOS = COLORES.map((c) => mezclar(c, PAPEL, 0.8));

export function pasoLetra(t: TamanoLetra | undefined, delta: 1 | -1): TamanoLetra {
  const i = TAMANOS_LETRA.indexOf(t ?? 'normal') + delta;
  return TAMANOS_LETRA[Math.max(0, Math.min(TAMANOS_LETRA.length - 1, i))];
}

export type AspectoNota = Pick<Pieza, 'fondo' | 'colorTexto' | 'tamanoLetra' | 'alto'>;
export const esSinFondo = (a: AspectoNota) => a.fondo === SIN_FONDO;

// Estilo en línea (React) del cuadro. Lo que falta se queda como en el CSS.
export function estiloDeNota(a: AspectoNota): { background: string; borderColor: string; color?: string; fontSize?: number; minHeight?: number } {
  const [background, borderColor] =
    a.fondo === undefined ? [AMARILLO.fondo, AMARILLO.borde] : a.fondo === SIN_FONDO ? ['transparent', 'transparent'] : [a.fondo, mezclar(a.fondo, '#000000', 0.12)];
  return {
    background,
    borderColor,
    ...(a.colorTexto ? { color: a.colorTexto } : {}),
    ...(a.tamanoLetra ? { fontSize: PX_LETRA[a.tamanoLetra] } : {}),
    ...(a.alto ? { minHeight: a.alto } : {}),
  };
}

// El último estilo que eligió Diego: lo usan las notas nuevas (se recuerda en cada dispositivo).
export interface UltimoEstilo { fondo: string; colorTexto: string | null; tamanoLetra: TamanoLetra }
export const ESTILO_INICIAL: UltimoEstilo = { fondo: SIN_FONDO, colorTexto: null, tamanoLetra: 'normal' };
export const CLAVE_ESTILO_NOTA = 'sc-pizarra-estilo-nota';
const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function leerEstiloNota(texto: string | null): UltimoEstilo {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(texto ?? '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    // se queda con lo de por defecto
  }
  return {
    fondo: o.fondo === SIN_FONDO || esHex(o.fondo) ? (o.fondo as string).toLowerCase() : ESTILO_INICIAL.fondo,
    colorTexto: esHex(o.colorTexto) ? o.colorTexto.toLowerCase() : null,
    tamanoLetra: TAMANOS_LETRA.includes(o.tamanoLetra as TamanoLetra) ? (o.tamanoLetra as TamanoLetra) : ESTILO_INICIAL.tamanoLetra,
  };
}

export type CambioEstilo = { fondo?: string; colorTexto?: string | null; tamanoLetra?: TamanoLetra };

export const recordarEstilo = (u: UltimoEstilo, c: CambioEstilo): UltimoEstilo => ({
  fondo: c.fondo ?? u.fondo,
  colorTexto: c.colorTexto !== undefined ? c.colorTexto : u.colorTexto,
  tamanoLetra: c.tamanoLetra ?? u.tamanoLetra,
});

export const aspectoDe = (u: UltimoEstilo): AspectoNota => ({ fondo: u.fondo, tamanoLetra: u.tamanoLetra, ...(u.colorTexto ? { colorTexto: u.colorTexto } : {}) });

export const opEstiloNueva = (id: string, u: UltimoEstilo): Operacion => ({
  tipo: 'estilo', id, fondo: u.fondo, colorTexto: u.colorTexto, tamanoLetra: u.tamanoLetra,
});

const entre = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

// Tamaño nuevo al arrastrar el tirador (dx y dy en unidades de la pizarra). Nunca sale de los límites del formato.
export function redimensionar(ancho: number, alto: number, dx: number, dy: number, soloAncho: boolean): { ancho: number; alto?: number } {
  const r = { ancho: entre(ancho + dx, 40, 2000) };
  return soloAncho ? r : { ...r, alto: entre(alto + dy, 30, 4000) };
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/estiloNota.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/estudio/estiloNota.ts src/estudio/estiloNota.test.ts
git commit -m "Pizarra: lógica del estilo de las notas (colores suaves, tamaños, último estilo, tirador)"
```

---

### Task 3: Las notas se ven con su estilo (pieza y editor)

**Files:**
- Modify: `src/componentes/estudio/PiezaPizarra.tsx`
- Modify: `src/componentes/estudio/Pizarra.tsx` (solo el editor de notas y crear notas nuevas)
- Modify: `src/estilos.css`
- Test: `src/componentes/estudio/PiezaPizarra.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `estiloDeNota`, `esSinFondo`, `AspectoNota`, `UltimoEstilo`, `leerEstiloNota`, `CLAVE_ESTILO_NOTA`, `aspectoDe`, `opEstiloNueva` (Tarea 2).
- Produces: en `Pizarra.tsx`, el estado `ultimo` / `setUltimo` (último estilo), que usa la Tarea 4. La interfaz `Edicion` pasa a ser `{ id: string | null; nuevoId: string; x: number; y: number; texto: string; ancho: number; aspecto: AspectoNota }`.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `src/componentes/estudio/PiezaPizarra.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Pieza } from '../../estudio/pizarra';
import { PiezaPizarra } from './PiezaPizarra';

const nota = (extra: Partial<Pieza> = {}) => ({ id: 'n1', tipo: 'nota', x: 0, y: 0, ancho: 240, contenido: 'Hola', ...extra }) as Pieza;
const pintar = (p: Pieza, seleccionada = false) =>
  renderToString(<PiezaPizarra pieza={p} x={0} y={0} seleccionada={seleccionada} imagen={async () => ''} alMedir={() => undefined} />);

describe('PiezaPizarra: notas', () => {
  it('una nota de antes sigue amarilla', () => {
    expect(pintar(nota())).toContain('background:#fff4c2');
  });
  it('sin fondo: clase sin-fondo y transparente', () => {
    const html = pintar(nota({ fondo: 'ninguno' }));
    expect(html).toContain('sin-fondo');
    expect(html).toContain('background:transparent');
  });
  it('con fondo, color, tamaño y alto', () => {
    const html = pintar(nota({ fondo: '#ffffff', colorTexto: '#3b82f6', tamanoLetra: 'enorme', alto: 120 }));
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('color:#3b82f6');
    expect(html).toContain('font-size:32px');
    expect(html).toContain('min-height:120px');
  });
  it('las demás piezas no cambian', () => {
    const html = pintar({ id: 't1', tipo: 'texto', x: 0, y: 0, ancho: 200, contenido: 'x', color: '#3b82f6' } as Pieza);
    expect(html).toContain('border-color:#3b82f6');
    expect(html).not.toContain('background:');
  });
});
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/PiezaPizarra.test.tsx`
Expected: FAIL (no sale `background:#fff4c2` en línea ni `sin-fondo`).

- [ ] **Step 3: Implementar en `PiezaPizarra.tsx`**

Añade el import:

```ts
import { estiloDeNota, esSinFondo } from '../../estudio/estiloNota';
```

y sustituye el `<div … >` de fuera por:

```tsx
  const estilo = pieza.tipo === 'nota' ? estiloDeNota(pieza) : pieza.color ? { borderColor: pieza.color } : {};
  const sinFondo = pieza.tipo === 'nota' && esSinFondo(pieza);
  return (
    <div
      ref={ref}
      data-pieza={pieza.id}
      className={`pieza pieza-${pieza.tipo}${sinFondo ? ' sin-fondo' : ''}${seleccionada ? ' seleccionada' : ''}`}
      style={{ left: x, top: y, width: pieza.ancho, ...estilo }}
    >
      <Contenido pieza={pieza} imagen={imagen} />
    </div>
  );
```

- [ ] **Step 4: CSS en `src/estilos.css`**

Junto a `.pieza-nota`, añade:

```css
.pieza.sin-fondo { box-shadow: none; }
.pieza.sin-fondo.seleccionada { outline: 2px dashed var(--acento); }
```

y sustituye la regla `.editor-nota` por:

```css
.editor-nota { position: absolute; min-height: 90px; padding: 10px 14px; border-radius: 12px; border: 2px solid var(--acento); font: inherit; resize: none; }
.editor-nota.sin-fondo { border-style: dashed; }
```

- [ ] **Step 5: El editor y las notas nuevas en `Pizarra.tsx`**

Imports:

```ts
import { aspectoDe, CLAVE_ESTILO_NOTA, esSinFondo, estiloDeNota, leerEstiloNota, opEstiloNueva, type AspectoNota } from '../../estudio/estiloNota';
import { leerPreferencia } from '../../estudio/preferencias';
```

Cambia `Edicion`:

```ts
interface Edicion { id: string | null; nuevoId: string; x: number; y: number; texto: string; ancho: number; aspecto: AspectoNota }
```

Junto a los demás `useState` del componente:

```ts
  // El último estilo de nota que eligió Diego (las nuevas lo usan).
  const [ultimo, setUltimo] = useState(() => leerEstiloNota(leerPreferencia(CLAVE_ESTILO_NOTA)));
```

Añade dos ayudas dentro del componente (antes de `alPulsar`):

```ts
  const editarNota = (n: Pieza) =>
    n.tipo === 'nota' && setEditando({ id: n.id, nuevoId: n.id, x: n.x, y: n.y, texto: n.contenido, ancho: n.ancho, aspecto: n });
  const notaNueva = (m: Punto) => setEditando({ id: null, nuevoId: idNuevo(), x: m.x, y: m.y, texto: '', ancho: 240, aspecto: aspectoDe(ultimo) });
```

Usa esas ayudas en los tres sitios que hoy hacen `setEditando({ … })`:
- en `alPulsar`, caso `'texto'`: `if (nota?.tipo === 'nota') editarNota(nota); else notaNueva(m);`
- en `alDobleClic`: `if (p?.tipo === 'nota') editarNota(p);` y, al final, `notaNueva(m);`

En `terminarNota`, sustituye la última línea (`ed.hacer({ tipo: 'nota', … })`) por:

```ts
    const op: Operacion = { tipo: 'nota', id: nota.id, nuevoId: nota.nuevoId, x: nota.x, y: nota.y, contenido: texto, capa: puedeDibujar ? activa! : undefined };
    // Una nota nueva nace con el último estilo elegido; las dos cosas se deshacen juntas.
    ed.hacer(nota.id ? op : { tipo: 'lote', ops: [op, opEstiloNueva(nota.nuevoId, ultimo)] });
    setSeleccion({ trazos: [], piezas: [nota.id ?? nota.nuevoId] });
```

En el `<textarea className="editor-nota" …>`, cambia `className` y `style`:

```tsx
                className={`editor-nota${esSinFondo(editando.aspecto) ? ' sin-fondo' : ''}`}
                style={{ left: editando.x, top: editando.y, width: editando.ancho, ...estiloDeNota(editando.aspecto), borderColor: undefined }}
```

(El borde del editor es siempre el acento, para saber que se está escribiendo; por eso se quita `borderColor`.)

- [ ] **Step 6: Ejecutar las pruebas y compilar**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/componentes/estudio/PiezaPizarra.tsx src/componentes/estudio/PiezaPizarra.test.tsx src/componentes/estudio/Pizarra.tsx src/estilos.css
git commit -m "Pizarra: las notas se ven con su fondo, color y tamaño, y las nuevas usan el último estilo"
```

---

### Task 4: La barrita y el tirador

**Files:**
- Create: `src/componentes/estudio/BarritaPieza.tsx`
- Modify: `src/componentes/estudio/Pizarra.tsx`
- Modify: `src/estilos.css`
- Test: `src/componentes/estudio/BarritaPieza.test.tsx`

**Interfaces:**
- Consumes: `FONDOS`, `pasoLetra`, `recordarEstilo`, `redimensionar`, `CambioEstilo`, `CLAVE_ESTILO_NOTA` (Tarea 2); `COLORES` (`herramientas.ts`); `SIN_FONDO`, `Pieza` (Tarea 1); `ultimo`/`setUltimo` (Tarea 3); `guardarPreferencia` (`preferencias.ts`).
- Produces: `export function BarritaPieza(p: { x: number; y: number; ancho: number; alto: number; idPieza: string; nota: AspectoNota | null; alBorrar(): void; alEstilo(c: CambioEstilo): void })`. `x`, `y`, `ancho` y `alto` son la caja de la pieza en píxeles del lienzo (ya con el zoom). `nota: null` = solo 🗑. Los elementos que no deben salir en la foto de Claude llevan `data-fuera-de-foto` (lo usa la Tarea 7).

- [ ] **Step 1: Escribir la prueba que falla**

Crea `src/componentes/estudio/BarritaPieza.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarritaPieza } from './BarritaPieza';

const base = { x: 100, y: 200, ancho: 240, alto: 80, idPieza: 'n1', alBorrar: () => undefined, alEstilo: () => undefined };

describe('BarritaPieza', () => {
  it('en una nota: borrar, fondo, letra, A− A+ y el tirador', () => {
    const html = renderToString(<BarritaPieza {...base} nota={{ tamanoLetra: 'normal' }} />);
    for (const t of ['aria-label="Borrar"', '>Fondo', '>Letra', 'aria-label="Letra más pequeña"', 'aria-label="Letra más grande"', 'data-tirador="n1"'])
      expect(html).toContain(t);
    expect(html).toContain('data-fuera-de-foto');
  });
  it('con la letra enorme no se puede agrandar más', () => {
    const html = renderToString(<BarritaPieza {...base} nota={{ tamanoLetra: 'enorme' }} />);
    expect(html).toMatch(/disabled=""[^>]*aria-label="Letra más grande"|aria-label="Letra más grande"[^>]*disabled=""/);
  });
  it('en una pieza de Claude: solo borrar', () => {
    const html = renderToString(<BarritaPieza {...base} nota={null} />);
    expect(html).toContain('aria-label="Borrar"');
    expect(html).not.toContain('>Fondo');
    expect(html).not.toContain('data-tirador');
  });
  it('si la pieza está pegada arriba, la barrita sale debajo', () => {
    expect(renderToString(<BarritaPieza {...base} y={10} nota={null} />)).toContain('barrita-pieza abajo');
  });
});
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/BarritaPieza.test.tsx`
Expected: FAIL («Failed to resolve import "./BarritaPieza"»).

- [ ] **Step 3: Implementar `BarritaPieza.tsx`**

```tsx
import { useState } from 'react';
import { FONDOS, pasoLetra, type AspectoNota, type CambioEstilo } from '../../estudio/estiloNota';
import { COLORES } from '../../estudio/herramientas';
import { SIN_FONDO } from '../../estudio/pizarra';

interface Props {
  x: number; // caja de la pieza en píxeles del lienzo (ya con el zoom)
  y: number;
  ancho: number;
  alto: number;
  idPieza: string;
  nota: AspectoNota | null; // null: pieza de Claude, solo se puede borrar
  alBorrar(): void;
  alEstilo(c: CambioEstilo): void;
}

const HUECO_ARRIBA = 56; // si no cabe encima, sale debajo

// Barrita que sale sobre la pieza seleccionada: borrar y, en las notas, fondo, color y tamaño de letra. Y el tirador de la esquina.
export function BarritaPieza({ x, y, ancho, alto, idPieza, nota, alBorrar, alEstilo }: Props) {
  const [menu, setMenu] = useState<'fondo' | 'letra' | null>(null);
  const abajo = y < HUECO_ARRIBA;
  const elegir = (c: CambioEstilo) => {
    setMenu(null);
    alEstilo(c);
  };
  return (
    <>
      <div
        className={`barrita-pieza${abajo ? ' abajo' : ''}`}
        style={{ left: x, top: abajo ? y + alto : y }}
        data-fuera-de-foto
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button className="peligro" aria-label="Borrar" title="Borrar" onClick={alBorrar}>🗑</button>
        {nota && (
          <>
            <span className="con-menu">
              <button className={menu === 'fondo' ? 'encendida' : ''} aria-expanded={menu === 'fondo'} onClick={() => setMenu(menu === 'fondo' ? null : 'fondo')}>Fondo ▾</button>
              {menu === 'fondo' && (
                <div className="menu-colores" role="menu">
                  <button className={`sin-color${nota.fondo === SIN_FONDO ? ' encendida' : ''}`} onClick={() => elegir({ fondo: SIN_FONDO })}>Sin fondo</button>
                  {FONDOS.map((c) => (
                    <button key={c} className={`color${nota.fondo === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Fondo ${c}`} onClick={() => elegir({ fondo: c })} />
                  ))}
                  <label className="color color-propio" title="Otro color">
                    +
                    <input type="color" aria-label="Elegir otro fondo" onChange={(e) => elegir({ fondo: e.target.value })} />
                  </label>
                </div>
              )}
            </span>
            <span className="con-menu">
              <button className={menu === 'letra' ? 'encendida' : ''} aria-expanded={menu === 'letra'} onClick={() => setMenu(menu === 'letra' ? null : 'letra')}>
                Letra <span className="muestra-color" style={{ background: nota.colorTexto ?? 'var(--texto)' }} /> ▾
              </button>
              {menu === 'letra' && (
                <div className="menu-colores" role="menu">
                  <button className={`sin-color${!nota.colorTexto ? ' encendida' : ''}`} onClick={() => elegir({ colorTexto: null })}>Normal</button>
                  {COLORES.map((c) => (
                    <button key={c} className={`color${nota.colorTexto === c ? ' encendida' : ''}`} style={{ background: c }} aria-label={`Letra ${c}`} onClick={() => elegir({ colorTexto: c })} />
                  ))}
                  <label className="color color-propio" title="Otro color">
                    +
                    <input type="color" aria-label="Elegir otro color de letra" onChange={(e) => elegir({ colorTexto: e.target.value })} />
                  </label>
                </div>
              )}
            </span>
            <button aria-label="Letra más pequeña" title="Letra más pequeña" disabled={nota.tamanoLetra === 'pequena'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, -1) })}>A−</button>
            <button aria-label="Letra más grande" title="Letra más grande" disabled={nota.tamanoLetra === 'enorme'} onClick={() => elegir({ tamanoLetra: pasoLetra(nota.tamanoLetra, 1) })}>A+</button>
          </>
        )}
      </div>
      {nota && <div className="tirador" data-tirador={idPieza} data-fuera-de-foto title="Cambiar el tamaño (Mayús: solo el ancho)" style={{ left: x + ancho, top: y + alto }} />}
    </>
  );
}
```

- [ ] **Step 4: CSS en `src/estilos.css`**

Al final del bloque «Pizarra: herramientas y capas (v1.4)»:

```css
.barrita-pieza { position: absolute; z-index: 3; display: flex; gap: 4px; align-items: center; padding: 4px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; box-shadow: 0 4px 14px rgb(59 48 39 / 0.18); transform: translateY(calc(-100% - 8px)); white-space: nowrap; }
.barrita-pieza.abajo { transform: translateY(8px); }
.barrita-pieza button { padding: 4px 8px; font-size: 14px; }
.barrita-pieza .encendida { border-color: var(--acento); background: var(--acento-suave); }
.con-menu { position: relative; }
.menu-colores { position: absolute; top: calc(100% + 4px); left: 0; z-index: 4; display: flex; flex-wrap: wrap; gap: 6px; width: 212px; padding: 8px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; box-shadow: 0 8px 24px rgb(59 48 39 / 0.18); white-space: normal; }
.menu-colores .sin-color { width: 100%; }
.menu-colores .color { width: 28px; height: 28px; min-width: 0; padding: 0; border-radius: 50%; border: 2px solid var(--borde); }
.menu-colores .color.encendida, .menu-colores .sin-color.encendida { outline: 2px solid var(--acento); outline-offset: 1px; }
.muestra-color { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: middle; border: 1px solid var(--borde); }
.tirador { position: absolute; z-index: 3; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 4px; background: var(--superficie); border: 2px solid var(--acento); cursor: nwse-resize; touch-action: none; }
@media (pointer: coarse) {
  .barrita-pieza button { min-width: 40px; min-height: 40px; }
  .tirador { width: 26px; height: 26px; margin: -13px 0 0 -13px; }
}
```

- [ ] **Step 5: La barrita y el tirador en `Pizarra.tsx`**

Imports (amplía los de la Tarea 3):

```ts
import { CLAVE_ESTILO_NOTA, recordarEstilo, redimensionar, type CambioEstilo } from '../../estudio/estiloNota';
import { guardarPreferencia } from '../../estudio/preferencias';
import { BarritaPieza } from './BarritaPieza';
```

(junta los imports de `estiloNota` y `preferencias` con los que ya hay, sin repetir líneas).

Añade al tipo `Gesto`:

```ts
  | { tipo: 'tirador'; id: string; desde: Punto; ancho: number; alto: number; cambio: { ancho: number; alto?: number } | null }
```

En `alPulsar`, justo después de `const m = aMundo(vista, p);` y **antes** del `if (!editable || e.button === 1 …)`:

```ts
    // El tirador de la esquina de una nota: cambiar ancho y alto.
    const tirador = (e.target as HTMLElement).closest<HTMLElement>('[data-tirador]')?.dataset.tirador;
    const conTirador = editable && tirador ? mostrada.piezas.find((x) => x.id === tirador) : undefined;
    if (conTirador) {
      gesto.current = { tipo: 'tirador', id: conTirador.id, desde: p, ancho: conTirador.ancho, alto: tamanos[conTirador.id]?.h ?? 60, cambio: null };
      return;
    }
```

En `alMover`, dentro del `switch (g.tipo)`:

```ts
      case 'tirador':
        g.cambio = redimensionar(g.ancho, g.alto, (p.x - g.desde.x) / vista.escala, (p.y - g.desde.y) / vista.escala, e.shiftKey);
        setProvisional({ tipo: 'estilo', id: g.id, ...g.cambio });
        return;
```

En `alSoltar`, dentro del `switch (g.tipo)`:

```ts
      case 'tirador':
        setProvisional(null);
        if (g.cambio) ed.hacer({ tipo: 'estilo', id: g.id, ...g.cambio });
        return;
```

Añade la función (junto a `borrarSel`):

```ts
  function cambiarEstilo(id: string, c: CambioEstilo) {
    ed.hacer({ tipo: 'estilo', id, ...c });
    const u = recordarEstilo(ultimo, c);
    setUltimo(u);
    guardarPreferencia(CLAVE_ESTILO_NOTA, JSON.stringify(u));
  }
```

Después de la línea `const vacia = …` (al final, antes del `return`):

```ts
  // Barrita: una sola pieza seleccionada, que se ve, y sin estar escribiendo.
  const unaSola =
    editable && !editando && seleccion.trazos.length === 0 && seleccion.piezas.length === 1 && ['mover', 'lazo', 'texto'].includes(h.herramienta)
      ? vistaPizarra.piezas.find((x) => x.id === seleccion.piezas[0] && visibles.has(x.id))
      : undefined;
  const cajaBarrita = unaSola ? rectDe(unaSola) : null;
```

Y dentro del `<div ref={marco} …>`, justo después del `</div>` que cierra `.mundo`:

```tsx
          {unaSola && cajaBarrita && (
            <BarritaPieza
              x={vista.x + cajaBarrita.x * vista.escala}
              y={vista.y + cajaBarrita.y * vista.escala}
              ancho={cajaBarrita.w * vista.escala}
              alto={cajaBarrita.h * vista.escala}
              idPieza={unaSola.id}
              nota={unaSola.tipo === 'nota' ? unaSola : null}
              alBorrar={borrarSel}
              alEstilo={(c) => cambiarEstilo(unaSola.id, c)}
            />
          )}
```

Marca también el aviso de herramienta para que no salga en la foto: en `<p className="aviso-herramienta" …>` añade el atributo `data-fuera-de-foto`.

- [ ] **Step 6: Pruebas y compilación**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores.

- [ ] **Step 7: Prueba a mano rápida**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm run dev` y abre http://localhost:5173/segundo-cerebro-app/ (Estudio → historial, si hay token; si no, comprueba al menos que compila y que la pizarra de solo lectura se ve). Comprueba: con Texto, escribir una nota (sale sin fondo), la barrita aparece al terminar, cambiar fondo, letra, A−/A+, arrastrar el tirador, borrar con 🗑, deshacer cada cosa con Ctrl+Z. Si no puedes abrirlo con datos, apúntalo como `Ruling:` para que Diego lo pruebe.

- [ ] **Step 8: Commit**

```bash
git add src/componentes/estudio/BarritaPieza.tsx src/componentes/estudio/BarritaPieza.test.tsx src/componentes/estudio/Pizarra.tsx src/estilos.css
git commit -m "Pizarra: barrita para borrar y cambiar las notas, y tirador para su ancho y alto"
```

---

### Task 5: Pantalla completa

**Files:**
- Create: `src/estado/pantallaCompleta.ts`
- Test: `src/estado/pantallaCompleta.test.ts`
- Modify: `src/componentes/estudio/BarraHerramientas.tsx`, `src/componentes/estudio/Pizarra.tsx`, `src/componentes/estudio/EstudioLocal.tsx`, `src/componentes/estudio/Historial.tsx`, `src/estilos.css`
- Test: `src/componentes/estudio/BarraHerramientas.test.tsx`, `src/componentes/estudio/Pizarra.test.tsx`

**Interfaces:**
- Produces:
  - `export const escSale = (tecla: string, etiqueta?: string) => boolean` (Esc, salvo escribiendo en `TEXTAREA` o `INPUT`)
  - `export function usePantallaCompleta(): { activa: boolean; alternar(): void; salir(): void }`
  - `Pizarra` gana las props `maximizada?: boolean` y `alMaximizar?(): void`. Sin `alMaximizar` no sale el botón.
  - `BarraHerramientas` gana las props `maximizada: boolean` y `alMaximizar?(): void`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crea `src/estado/pantallaCompleta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { escSale } from './pantallaCompleta';

describe('escSale', () => {
  it('Esc sale de la pantalla completa', () => {
    expect(escSale('Escape', 'DIV')).toBe(true);
    expect(escSale('Escape')).toBe(true);
  });
  it('pero no mientras se escribe (ahí Esc cancela lo escrito)', () => {
    expect(escSale('Escape', 'TEXTAREA')).toBe(false);
    expect(escSale('Escape', 'INPUT')).toBe(false);
  });
  it('otras teclas no', () => {
    expect(escSale('Enter', 'DIV')).toBe(false);
  });
});
```

En `src/componentes/estudio/BarraHerramientas.test.tsx`, añade `maximizada: false` al objeto `base` y esta prueba:

```tsx
  it('botón de pantalla completa solo si se puede maximizar', () => {
    expect(renderToString(<BarraHerramientas {...base} />)).not.toContain('Pantalla completa');
    expect(renderToString(<BarraHerramientas {...base} alMaximizar={nada} />)).toContain('aria-label="Pantalla completa"');
    expect(renderToString(<BarraHerramientas {...base} maximizada alMaximizar={nada} />)).toContain('aria-label="Salir de pantalla completa"');
  });
```

En `src/componentes/estudio/Pizarra.test.tsx`, añade:

```tsx
  it('de solo lectura también se puede poner en pantalla completa', () => {
    const html = renderToString(<Pizarra pizarra={p} imagen={async () => ''} clave="k" origen="o" alMaximizar={() => undefined} />);
    expect(html).toContain('aria-label="Pantalla completa"');
  });
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estado/pantallaCompleta.test.ts src/componentes/estudio/BarraHerramientas.test.tsx src/componentes/estudio/Pizarra.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `src/estado/pantallaCompleta.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

// Esc sale de la pantalla completa, salvo si se está escribiendo (ahí Esc cancela lo escrito).
export const escSale = (tecla: string, etiqueta?: string) => tecla === 'Escape' && etiqueta !== 'TEXTAREA' && etiqueta !== 'INPUT';

// La pizarra ocupa toda la ventana. Donde el navegador deja (PC, iPad), también se ocultan sus barras.
// En el iPhone no hay requestFullscreen: solo se tapa la app, que es lo que se puede.
export function usePantallaCompleta() {
  const [activa, setActiva] = useState(false);
  const nativa = useRef(false); // el navegador está en su pantalla completa porque la pedimos

  const salir = useCallback(() => {
    setActiva(false);
    if (nativa.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    nativa.current = false;
  }, []);

  const entrar = useCallback(() => {
    setActiva(true);
    const raiz = document.documentElement;
    if (typeof raiz.requestFullscreen === 'function')
      raiz.requestFullscreen().then(
        () => {
          nativa.current = true;
        },
        () => undefined,
      );
  }, []);

  useEffect(() => {
    if (!activa) return;
    // Si el navegador sale solo de su pantalla completa (Esc, gesto), la app también sale.
    const alCambiar = () => {
      if (nativa.current && !document.fullscreenElement) {
        nativa.current = false;
        setActiva(false);
      }
    };
    const alTecla = (e: KeyboardEvent) => {
      if (escSale(e.key, (e.target as HTMLElement | null)?.tagName)) salir();
    };
    document.addEventListener('fullscreenchange', alCambiar);
    window.addEventListener('keydown', alTecla);
    document.body.classList.add('con-pantalla-completa');
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar);
      window.removeEventListener('keydown', alTecla);
      document.body.classList.remove('con-pantalla-completa');
    };
  }, [activa, salir]);

  // Al irse de la pantalla (otra pestaña de la app), se sale del todo.
  useEffect(
    () => () => {
      if (nativa.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  return { activa, alternar: activa ? salir : entrar, salir };
}
```

- [ ] **Step 4: El botón en `BarraHerramientas.tsx` y `Pizarra.tsx`**

En `BarraHerramientas.tsx`, añade a `Props`:

```ts
  maximizada: boolean;
  alMaximizar?(): void;
```

y, dentro de `.grupo-herramientas`, justo después del botón `📚 Capas`:

```tsx
        {p.alMaximizar && (
          <button
            className={p.maximizada ? 'encendida' : ''}
            aria-pressed={p.maximizada}
            aria-label={p.maximizada ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={p.maximizada ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
            onClick={p.alMaximizar}
          >
            ⛶
          </button>
        )}
```

En `Pizarra.tsx`, añade a `Props`:

```ts
  maximizada?: boolean;
  alMaximizar?(): void; // sin esto no sale el botón de pantalla completa
```

(desestructúralas en la firma: `{ pizarra, imagen, alOperar, clave, origen, children, maximizada = false, alMaximizar }`), pásalas a `<BarraHerramientas … maximizada={maximizada} alMaximizar={alMaximizar} />`, y en `.controles-pizarra`, junto al botón `📚 Capas` de solo lectura:

```tsx
        {!editable && alMaximizar && (
          <button aria-label={maximizada ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={alMaximizar}>⛶</button>
        )}
```

- [ ] **Step 5: Usarlo en `EstudioLocal.tsx` (con el chat flotante) y en `Historial.tsx`**

En `EstudioLocal.tsx`:

```ts
import { usePantallaCompleta } from '../../estado/pantallaCompleta';
```

Junto a los demás estados (antes de cualquier `return`, con los otros hooks):

```ts
  const pantalla = usePantallaCompleta();
  const [chatFlotante, setChatFlotante] = useState(false);
```

En el `<div ref={contenedor} className={…}>` del final, añade las clases:

```tsx
      className={`estudio-local ${conPizarra ? 'con-pizarra' : 'sin-pizarra'}${pantalla.activa ? ' pantalla-completa' : ''}${pantalla.activa && chatFlotante ? ' chat-flotante' : ''}`}
```

En el `<Pizarra … >` añade `maximizada={pantalla.activa}` y `alMaximizar={pantalla.alternar}`, y dentro de sus `children`, antes del botón de guardar:

```tsx
                {pantalla.activa && (
                  <button
                    className={chatFlotante ? 'encendida' : ''}
                    aria-pressed={chatFlotante}
                    onClick={() => {
                      setVista('chat');
                      setChatFlotante((c) => !c);
                    }}
                  >
                    💬 Chat
                  </button>
                )}
```

En `Historial.tsx`, en `VisorHistorial`:

```ts
import { usePantallaCompleta } from '../../estado/pantallaCompleta';
```

```ts
  const pantalla = usePantallaCompleta();
```

(con los demás hooks del componente), y cambia `<div className="visor-historial">` por `<div className={`visor-historial${pantalla.activa ? ' pantalla-completa' : ''}`}>`. En su `<Pizarra …>` añade `maximizada={pantalla.activa}` y `alMaximizar={pantalla.alternar}`.

- [ ] **Step 6: CSS en `src/estilos.css`**

Al final del archivo:

```css
/* Pantalla completa (v1.4 parte 2): la pizarra tapa toda la app. Los diálogos (z-index 10 y 20) siguen encima. */
body.con-pantalla-completa { overflow: hidden; }
.pantalla-completa { position: fixed; inset: 0; z-index: 8; height: auto !important; min-height: 0; border: none !important; border-radius: 0 !important; background: var(--superficie); padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
.estudio-local.pantalla-completa { grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: minmax(0, 1fr) !important; }
.estudio-local.pantalla-completa > :not(.zona-pizarra) { display: none; }
.estudio-local.pantalla-completa .zona-pizarra { border-left: none; }
.pantalla-completa .pestanas-pizarra, .visor-historial.pantalla-completa > .chat-cabecera { display: none; }
.estudio-local.pantalla-completa.chat-flotante > .chat { display: flex; position: absolute; top: 0; right: 0; bottom: 0; z-index: 6; width: min(420px, 92vw); background: var(--superficie); border-left: 1px solid var(--borde); box-shadow: -8px 0 24px rgb(59 48 39 / 0.18); }
```

(Si `.chat` no es `display: flex` en su regla normal, usa el `display` que tenga allí.)

- [ ] **Step 7: Pruebas y compilación**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/estado/pantallaCompleta.ts src/estado/pantallaCompleta.test.ts src/componentes/estudio/BarraHerramientas.tsx src/componentes/estudio/BarraHerramientas.test.tsx src/componentes/estudio/Pizarra.tsx src/componentes/estudio/Pizarra.test.tsx src/componentes/estudio/EstudioLocal.tsx src/componentes/estudio/Historial.tsx src/estilos.css
git commit -m "Pizarra: botón de pantalla completa (con el chat flotante en la zona de estudio)"
```

---

### Task 6: La foto llega a Claude (lógica, cabecera y programa local)

**Files:**
- Create: `src/estudio/foto.ts`
- Test: `src/estudio/foto.test.ts`
- Modify: `src/estudio/contexto.ts`, `src/estudio/contexto.test.ts`
- Modify: `local/servidor.ts`, `local/servidor.test.ts`
- Modify: `src/estudio/tipos.ts` (`VERSION_PROGRAMA` 2 → 3)
- Modify: `src/estudio/local.ts` (`Envio` gana `foto`)
- Modify: `local/instrucciones-estudio.md`

**Interfaces:**
- Consumes: `Rect`, `Vista` (`src/estudio/geometria.ts`), `Operacion` (`pizarra.ts`).
- Produces (en `src/estudio/foto.ts`, que también usa `local/`, así que importa con `.ts`):
  - `export interface Zona { x1: number; y1: number; x2: number; y2: number }`
  - `export const ANCHO_FOTO = 1280`
  - `export function zonaVisible(v: Vista, ancho: number, alto: number): Zona`
  - `export const escalaFoto = (ancho: number) => number` (≤ 1)
  - `export interface Etiqueta { texto: string; x: number; y: number }`
  - `export function etiquetasFoto(piezas: { id: string; rect: Rect }[], v: Vista, ancho: number, alto: number, escala: number): Etiqueta[]`
  - `export function esZona(v: unknown): v is Zona`
  - `export const esOperacionDeDiego = (op: Operacion) => boolean` (todas menos `guardada` y `fusionar`)
  - `export interface FotoEnviada { nombre: string; zona: Zona }`
- `Contexto` (en `contexto.ts`) gana `foto?: { ruta: string; zona: Zona } | null`.
- `Envio` (en `local.ts`) gana `foto?: FotoEnviada`.

- [ ] **Step 1: Escribir las pruebas que fallan (foto y contexto)**

Crea `src/estudio/foto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { escalaFoto, esOperacionDeDiego, esZona, etiquetasFoto, zonaVisible } from './foto.ts';

describe('foto de la pizarra', () => {
  it('la zona que se ve, en coordenadas de la pizarra', () => {
    expect(zonaVisible({ x: 40, y: 20, escala: 2 }, 800, 600)).toEqual({ x1: -20, y1: -10, x2: 380, y2: 290 });
  });
  it('como mucho 1280 px de ancho', () => {
    expect(escalaFoto(640)).toBe(1);
    expect(escalaFoto(2560)).toBe(0.5);
    expect(escalaFoto(0)).toBe(1);
  });
  it('una etiqueta por pieza que se ve, arriba a la izquierda, dentro de la foto', () => {
    const piezas = [
      { id: 'f1', rect: { x: 100, y: 50, w: 200, h: 80 } },
      { id: 'fuera', rect: { x: 5000, y: 50, w: 200, h: 80 } },
      { id: 'medio-fuera', rect: { x: -100, y: -40, w: 200, h: 80 } },
    ];
    expect(etiquetasFoto(piezas, { x: 0, y: 0, escala: 1 }, 800, 600, 0.5)).toEqual([
      { texto: 'f1', x: 50, y: 25 },
      { texto: 'medio-fuera', x: 0, y: 0 },
    ]);
  });
  it('esZona', () => {
    expect(esZona({ x1: 0, y1: 0, x2: 10, y2: 10 })).toBe(true);
    expect(esZona({ x1: 0, y1: 0, x2: 0, y2: 10 })).toBe(false);
    expect(esZona({ x1: 'a', y1: 0, x2: 10, y2: 10 })).toBe(false);
    expect(esZona(null)).toBe(false);
  });
  it('guardar y juntar no cuentan como cambios de Diego', () => {
    expect(esOperacionDeDiego({ tipo: 'borrar', id: 'x' })).toBe(true);
    expect(esOperacionDeDiego({ tipo: 'estilo', id: 'x', fondo: 'ninguno' })).toBe(true);
    expect(esOperacionDeDiego({ tipo: 'guardada', ruta: 'estudios/a/pizarras/b.json' })).toBe(false);
  });
});
```

En `src/estudio/contexto.test.ts`, añade dentro del `describe`:

```ts
  it('con foto de la pizarra: su ruta y su zona, y al leer sale como una imagen más', () => {
    const m = conContexto({ ...c, foto: { ruta: 'C:\\e\\fisica\\.en-curso\\id\\imagenes\\captura-2.png', zona: { x1: -20, y1: 0, x2: 780, y2: 450 } } }, 'Mira');
    expect(m).toContain('Foto de la pizarra: C:\\e\\fisica\\.en-curso\\id\\imagenes\\captura-2.png');
    expect(m).toContain('Zona de la foto: x -20–780, y 0–450 (coordenadas de la pizarra)');
    expect(sinContexto(m)).toEqual({ texto: 'Mira', imagenes: ['captura-1.png', 'captura-2.png'] });
  });
```

- [ ] **Step 2: Escribir las pruebas que fallan (programa local)**

En `local/servidor.test.ts`, dentro de `describe('mensaje', …)`:

```ts
  it('con foto de la pizarra (aunque no haya texto): Claude recibe su ruta y su zona', async () => {
    const id = '55555555-5555-4555-8555-555555555555';
    const r = await post('mensaje', {
      asignatura: 'fisica', id, nueva: true, texto: '', imagenes: [], pizarraAbierta: 1,
      foto: { nombre: 'captura-1-2.png', zona: { x1: 0, y1: 0, x2: 800, y2: 600 } },
    });
    expect(r.status).toBe(200);
    await eventos(r);
    const entrada: string = registrado().at(-1).entrada;
    expect(entrada).toMatch(/Foto de la pizarra: .*captura-1-2\.png/);
    expect(entrada).toContain('Zona de la foto: x 0–800, y 0–600');
    expect(entrada).toContain('Mira lo que he hecho en la pizarra.');
  });
  it('una foto con nombre o zona que no valen se ignora', async () => {
    const r = await post('mensaje', {
      asignatura: 'fisica', id: ID, nueva: false, texto: '', imagenes: [], foto: { nombre: '../x.png', zona: { x1: 0, y1: 0, x2: 1, y2: 1 } },
    });
    expect(r.status).toBe(400);
  });
```

Y en `describe('app', …)`, en la prueba `'estado'`, añade al principio:

```ts
    expect(VERSION_PROGRAMA).toBe(3); // la app avisa si el programa local abierto es de antes de la foto
```

- [ ] **Step 3: Ejecutar para ver que fallan**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/estudio/foto.test.ts src/estudio/contexto.test.ts local/servidor.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar `src/estudio/foto.ts`**

```ts
import type { Rect, Vista } from './geometria.ts';
import type { Operacion } from './pizarra.ts';

// La foto de la pizarra que ve Claude: lo que Diego tiene en pantalla, con el id de cada pieza.
export interface Zona { x1: number; y1: number; x2: number; y2: number }
export interface FotoEnviada { nombre: string; zona: Zona }
export const ANCHO_FOTO = 1280;

export function zonaVisible(v: Vista, ancho: number, alto: number): Zona {
  const r = Math.round;
  return { x1: r(-v.x / v.escala), y1: r(-v.y / v.escala), x2: r((ancho - v.x) / v.escala), y2: r((alto - v.y) / v.escala) };
}

export const escalaFoto = (ancho: number) => Math.min(1, ANCHO_FOTO / Math.max(1, ancho));

export interface Etiqueta { texto: string; x: number; y: number }

// Una etiqueta por pieza que se ve (aunque sea en parte), en píxeles de la foto.
export function etiquetasFoto(piezas: { id: string; rect: Rect }[], v: Vista, ancho: number, alto: number, escala: number): Etiqueta[] {
  return piezas.flatMap(({ id, rect }) => {
    const x = v.x + rect.x * v.escala;
    const y = v.y + rect.y * v.escala;
    if (x + rect.w * v.escala < 0 || y + rect.h * v.escala < 0 || x > ancho || y > alto) return [];
    return [{ texto: id, x: Math.max(0, x) * escala, y: Math.max(0, y) * escala }];
  });
}

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function esZona(v: unknown): v is Zona {
  if (!v || typeof v !== 'object') return false;
  const z = v as Record<string, unknown>;
  return finito(z.x1) && finito(z.y1) && finito(z.x2) && finito(z.y2) && z.x1 < z.x2 && z.y1 < z.y2;
}

// Lo que hace Diego en la pizarra (para saber si hay que mandar foto). Guardar y juntar los hace la app.
export const esOperacionDeDiego = (op: Operacion) => op.tipo !== 'guardada' && op.tipo !== 'fusionar';
```

- [ ] **Step 5: Cabecera en `src/estudio/contexto.ts`**

Arriba:

```ts
import type { Zona } from './foto.ts';
```

En `Contexto`, añade `foto?: { ruta: string; zona: Zona } | null;`. En `conContexto`, después de la línea de capturas:

```ts
  if (c.foto) {
    const z = c.foto.zona;
    lineas.push(`Foto de la pizarra: ${c.foto.ruta}`, `Zona de la foto: x ${z.x1}–${z.x2}, y ${z.y1}–${z.y2} (coordenadas de la pizarra)`);
  }
```

En `sinContexto`, cambia el cálculo de `imagenes` para que también saque la foto:

```ts
  const nombre = (r: string) => r.split(/[\\/]/).pop() ?? r;
  const m = /^Capturas adjuntas: (.+)$/m.exec(cabecera);
  const foto = /^Foto de la pizarra: (.+)$/m.exec(cabecera);
  const imagenes = [...(m ? m[1].split(', ').map(nombre) : []), ...(foto ? [nombre(foto[1])] : [])];
```

- [ ] **Step 6: Programa local (`local/servidor.ts`), versión y `Envio`**

En `local/servidor.ts`, añade el import:

```ts
import { esZona, type FotoEnviada } from '../src/estudio/foto.ts';
```

y, junto a `enviarJson`, la función:

```ts
function leerFoto(v: unknown): FotoEnviada | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return typeof o.nombre === 'string' && esNombreImagen(o.nombre) && esZona(o.zona) ? { nombre: o.nombre, zona: o.zona } : null;
}
```

En `'POST mensaje'`:
- después de `const abierta = …`: `const foto = leerFoto(b.foto);`
- el control de vacío pasa a: `if (!texto && !imagenes.length && !foto) throw new ErrorPeticion(400, 'Mensaje vacío');`
- `conCabecera` pasa a:

```ts
      const conCabecera = (t: string) =>
        conContexto(
          {
            asignatura: asig, carpeta, pizarraAbierta: abierta, imagenes: imagenes.map((n) => path.join(carpeta, 'imagenes', n)),
            foto: foto && { ruta: path.join(carpeta, 'imagenes', foto.nombre), zona: foto.zona },
          },
          t,
        );
```

- el texto por defecto pasa a: `conCabecera(texto || (imagenes.length ? 'Mira la captura.' : 'Mira lo que he hecho en la pizarra.'))`.

En `src/estudio/tipos.ts`: `export const VERSION_PROGRAMA = 3;`

En `src/estudio/local.ts`: importa `import type { FotoEnviada } from './foto';` y añade a `Envio` el campo `foto?: FotoEnviada;`.

- [ ] **Step 7: Instrucciones de Claude (`local/instrucciones-estudio.md`)**

En «## Cada mensaje», sustituye la línea «- Si hay capturas adjuntas, míralas…» por:

```md
- Si hay capturas adjuntas, míralas con la herramienta de leer archivos antes de contestar.
- Si hay **foto de la pizarra** («Foto de la pizarra» en la cabecera), mírala antes de contestar: es lo que Diego ve ahora mismo en la pizarra abierta. Sus trazos a mano y sus cuadros de texto son lo que él ha hecho: un ejercicio para que lo revises, algo rodeado o subrayado sobre lo que pregunta, o una duda escrita. Las etiquetas pequeñas («t1», «f2», «d-ab12cd») son los ids de las piezas del JSON. «Zona de la foto» dice qué parte de la pizarra sale en ella (en coordenadas de la pizarra), para que sepas dónde está cada cosa. No describas la foto si no hace falta: contesta a lo que Diego pregunta.
```

En «## La pizarra», en la línea de `nota`, sustituye «- `nota`: son de Diego. No las crees tú, salvo que te lo pida.» por:

```md
  - `nota`: cuadros de texto de Diego. No las crees tú, salvo que te lo pida. Pueden llevar `fondo` («ninguno» o `#rrggbb`), `colorTexto`, `tamanoLetra` (`pequena`, `normal`, `grande`, `enorme`) y `alto`: respétalos.
```

- [ ] **Step 8: Ejecutar las pruebas**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/estudio/foto.ts src/estudio/foto.test.ts src/estudio/contexto.ts src/estudio/contexto.test.ts local/servidor.ts local/servidor.test.ts src/estudio/tipos.ts src/estudio/local.ts local/instrucciones-estudio.md
git commit -m "Zona de estudio: el programa local manda a Claude la foto de la pizarra con su zona"
```

---

### Task 7: Hacer la foto y mandarla (pantalla)

**Files:**
- Create: `src/componentes/estudio/fotoPizarra.ts`
- Modify: `src/componentes/estudio/Pizarra.tsx`, `src/componentes/estudio/Chat.tsx`, `src/componentes/estudio/EstudioLocal.tsx`
- Modify: `package.json`, `package-lock.json` (dependencia `html-to-image`)
- Test: `src/componentes/estudio/Chat.test.tsx`

**Interfaces:**
- Consumes: `zonaVisible`, `etiquetasFoto`, `escalaFoto`, `esOperacionDeDiego`, `Zona`, `FotoEnviada`, `Etiqueta` (Tarea 6); `subirImagen` y `Envio.foto` (`local.ts`); `data-fuera-de-foto` (Tarea 4).
- Produces:
  - `export async function fotografiar(el: HTMLElement, etiquetas: (escala: number) => Etiqueta[]): Promise<Blob>` en `fotoPizarra.ts`
  - `export interface FotoPizarra { blob: Blob; zona: Zona }` y `export type HacerFoto = () => Promise<FotoPizarra>` en `fotoPizarra.ts`
  - `Pizarra` gana la prop `foto?: { current: HacerFoto | null }`
  - `Chat` gana la prop `alEnsenarPizarra?(): void` (sin ella, el botón 👁 sale desactivado)

- [ ] **Step 1: Instalar la dependencia**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm install html-to-image`
Expected: se añade `html-to-image` a `dependencies` en `package.json`. Comprueba su licencia: `cat node_modules/html-to-image/package.json | grep license` → `"license": "MIT"`. Si no es MIT, para y apúntalo como `Ruling:`.

- [ ] **Step 2: Escribir la prueba que falla (Chat)**

En `src/componentes/estudio/Chat.test.tsx`, añade:

```tsx
  it('botón para enseñar la pizarra: desactivado sin pizarra o mientras Claude contesta', () => {
    const boton = /<button[^>]*aria-label="Enseñar la pizarra"[^>]*>/;
    expect(renderToString(<Chat {...props} enviando={false} />).match(boton)?.[0]).toContain('disabled=""');
    expect(renderToString(<Chat {...props} enviando={false} alEnsenarPizarra={() => undefined} />).match(boton)?.[0]).not.toContain('disabled=""');
    expect(renderToString(<Chat {...props} enviando alEnsenarPizarra={() => undefined} />).match(boton)?.[0]).toContain('disabled=""');
  });
```

- [ ] **Step 3: Ejecutar para ver que falla**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npx vitest run src/componentes/estudio/Chat.test.tsx`
Expected: FAIL (no existe el botón).

- [ ] **Step 4: El botón en `Chat.tsx`**

Añade a `Props`:

```ts
  alEnsenarPizarra?(): void; // manda solo la foto de la pizarra abierta
```

y, en `.chat-escribir`, justo después del `<label className="boton-adjuntar" …>…</label>`:

```tsx
        <button
          className="boton-adjuntar"
          aria-label="Enseñar la pizarra"
          title="Enseñar la pizarra a Claude"
          disabled={!p.alEnsenarPizarra || p.enviando}
          onClick={p.alEnsenarPizarra}
        >
          👁
        </button>
```

- [ ] **Step 5: `fotoPizarra.ts`**

```ts
import { escalaFoto, type Etiqueta, type Zona } from '../../estudio/foto';

export interface FotoPizarra { blob: Blob; zona: Zona }
export type HacerFoto = () => Promise<FotoPizarra>;

// Foto de lo que se ve en el lienzo (piezas, flechas, trazos y papel), con el id de cada pieza encima.
// html-to-image se carga solo al hacer la primera foto (no pesa al abrir la app).
export async function fotografiar(el: HTMLElement, etiquetas: (escala: number) => Etiqueta[]): Promise<Blob> {
  const { toCanvas } = await import('html-to-image');
  const escala = escalaFoto(el.clientWidth);
  const lienzo = await toCanvas(el, {
    pixelRatio: escala,
    backgroundColor: '#fdfbf6',
    // La barrita, el tirador y los avisos no salen en la foto.
    filter: (n) => !(n instanceof HTMLElement && n.dataset.fueraDeFoto !== undefined),
  });
  const ctx = lienzo.getContext('2d');
  if (ctx) {
    ctx.font = '600 12px system-ui, sans-serif';
    for (const e of etiquetas(escala)) {
      const w = ctx.measureText(e.texto).width + 8;
      ctx.fillStyle = 'rgba(59, 48, 39, 0.85)';
      ctx.fillRect(e.x, e.y, w, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(e.texto, e.x + 4, e.y + 12);
    }
  }
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se ha podido crear la foto'))), 'image/png'));
}
```

- [ ] **Step 6: `Pizarra.tsx` ofrece la foto**

Imports:

```ts
import { etiquetasFoto, zonaVisible } from '../../estudio/foto';
import { fotografiar, type HacerFoto } from './fotoPizarra';
```

Añade a `Props`: `foto?: { current: HacerFoto | null }; // la zona de estudio la pide al mandar un mensaje` y desestructúrala en la firma.

Después de la línea `const cajaBarrita = …` (antes del `return`):

```ts
  // Cómo hacer la foto de lo que se ve ahora (con las capas visibles). Se renueva en cada pintado.
  const piezasVisibles = grupos.flatMap((g) => g.piezas).map((x) => ({ id: x.id, rect: rectDe(x) }));
  useEffect(() => {
    if (!foto) return;
    foto.current = async () => {
      const m = marco.current;
      if (!m) throw new Error('La pizarra no está abierta');
      const zona = zonaVisible(vista, m.clientWidth, m.clientHeight);
      const blob = await fotografiar(m, (escala) => etiquetasFoto(piezasVisibles, vista, m.clientWidth, m.clientHeight, escala));
      return { blob, zona };
    };
    return () => {
      foto.current = null;
    };
  });
```

(`useEffect` ya está importado. Los hooks deben ir antes de cualquier `return` temprano: en `Pizarra` no hay ninguno, así que va bien ahí.)

- [ ] **Step 7: `EstudioLocal.tsx` manda la foto**

Imports:

```ts
import { esOperacionDeDiego, type FotoEnviada } from '../../estudio/foto';
import { subirImagen } from '../../estudio/local'; // añádelo al import de '../../estudio/local' que ya existe
import type { HacerFoto } from './fotoPizarra';
```

Estados y referencias (con los demás hooks):

```ts
  const hacerFoto = useRef<HacerFoto | null>(null);
  // Pizarras en las que Diego ha hecho algo desde su último mensaje: ese mensaje lleva foto.
  const cambiadas = useRef(new Set<number>());
```

`ultimoEnvio` pasa a guardar la foto: `useState<{ texto: string; imagenes: string[]; foto: FotoEnviada | null } | null>(null)`.

En `operar`, como primera línea dentro del `try`:

```ts
      if (esOperacionDeDiego(op)) cambiadas.current.add(n);
```

Sustituye `enviar` por:

```ts
  async function enviar(texto: string, imagenes: string[], pedirFoto = false, fotoPrevia: FotoEnviada | null = null) {
    if (!conv || enviando) return;
    setError(null);
    setEnviando(true);
    // Si Diego ha cambiado la pizarra abierta (o pulsa 👁), el mensaje lleva una foto de lo que ve.
    let foto = fotoPrevia;
    const n = abiertaAhora?.n ?? null;
    if (!foto && n !== null && hacerFoto.current && (pedirFoto || cambiadas.current.has(n))) {
      try {
        const f = await hacerFoto.current();
        foto = { nombre: await subirImagen(asignatura.id, conv.id, f.blob), zona: f.zona };
        cambiadas.current.delete(n);
      } catch {
        setAvisoPizarra('No he podido mandar la foto de la pizarra');
      }
    }
    if (!texto && !imagenes.length && !foto) {
      setEnviando(false);
      return;
    }
    setUltimoEnvio({ texto, imagenes, foto });
    const vistas = foto ? [...imagenes, foto.nombre] : imagenes;
    setMensajes((ms) => [...ms, vistas.length ? { rol: 'diego', texto, imagenes: vistas } : { rol: 'diego', texto }]);
    await enviarMensaje(
      { asignatura: asignatura.id, id: conv.id, nueva: conv.nueva, texto, imagenes, pizarraAbierta: abierta, ...(foto ? { foto } : {}) },
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
```

(`abiertaAhora` ya existe en el componente: se calcula antes de los `return`. Si `enviar` está definida antes de esa línea, no pasa nada: se usa al llamarla, no al definirla.)

En el `<Chat … />`:

```tsx
          alReintentar={() => ultimoEnvio && void enviar(ultimoEnvio.texto, ultimoEnvio.imagenes, false, ultimoEnvio.foto)}
          alEnsenarPizarra={abiertaAhora?.pizarra ? () => void enviar('Mira lo que he hecho en la pizarra', [], true) : undefined}
```

En el `<Pizarra … >` de la zona de estudio, añade `foto={hacerFoto}`.

Al abrir otra conversación o empezar una nueva, las pizarras cambian de número: en `abrir` y en `nueva`, añade `cambiadas.current.clear();`.

- [ ] **Step 8: Pruebas y compilación**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores. Comprueba en la salida de `vite build` que `html-to-image` va en un trozo aparte (un archivo `.js` propio), no en el principal.

- [ ] **Step 9: Prueba a mano**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm run local` (necesita Claude Code y `my-context` al lado; si la zona de estudio automática está encendida, ciérrala antes o usa esa). En http://127.0.0.1:5174/segundo-cerebro-app/ → Estudio: dibuja algo en una pizarra, pregunta «¿qué he dibujado?» y comprueba que la miniatura de la foto sale en tu mensaje y que Claude contesta sobre el dibujo. Pulsa 👁 sin cambiar nada: manda solo la foto. Mira en `imagenes/` de la conversación que la foto tiene fórmulas (KaTeX) bien dibujadas y las etiquetas de los ids. Si no puedes lanzar Claude, apúntalo como `Ruling:` para que Diego lo pruebe.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/componentes/estudio/fotoPizarra.ts src/componentes/estudio/Pizarra.tsx src/componentes/estudio/Chat.tsx src/componentes/estudio/Chat.test.tsx src/componentes/estudio/EstudioLocal.tsx
git commit -m "Zona de estudio: Claude ve la pizarra (foto automática al cambiarla y botón 👁 Enseñar la pizarra)"
```

---

### Task 8: Documentación y estado

**Files:**
- Modify: `docs/diseno.md`, `AGENTS.md`

- [ ] **Step 1: `docs/diseno.md`**

En la línea del formato de la pizarra (la que empieza por «- Formato: `{ "version": 1, "titulo"…»), añade al final:

```md
 Desde la v1.4 parte 2, las piezas `nota` pueden llevar `fondo` (`"ninguno"` o `#rrggbb`; si falta, amarillo), `colorTexto` (`#rrggbb`), `tamanoLetra` (`pequena`, `normal`, `grande`, `enorme`) y `alto` (30 a 4000); con alguno de ellos la pizarra es `version: 2`. Operación `estilo` (`{ tipo, id, fondo?, colorTexto?, tamanoLetra?, ancho?, alto? }`, `null` quita el campo). Detalle en `docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md`.
```

- [ ] **Step 2: `AGENTS.md`**

En «## Estructura del código», en la línea «Dibujo a mano (v1.4): …», añade al final: `Parte 2: \`estiloNota.ts\` (fondo, color y tamaño de las notas), \`foto.ts\` (foto de la pizarra para Claude), \`src/estado/pantallaCompleta.ts\`; pantalla: \`BarritaPieza.tsx\`, \`fotoPizarra.ts\` (\`html-to-image\`).`

En «## Estado actual», cambia la fecha de «Última actualización» a la de hoy y añade al final de la lista:

```md
- **Versión 1.4, parte 2, entrega 1 hecha** (rama `v1.4-parte-2`, sin publicar): cuadros de texto con fondo (o sin fondo), color y tamaño de letra, tirador de ancho y alto y barrita con 🗑; botón ⛶ de pantalla completa (con 💬 chat flotante en la zona de estudio); Claude ve la pizarra (foto automática si Diego la ha cambiado y botón «👁 Enseñar la pizarra»). Diseño: `docs/superpowers/specs/2026-09-27-dibujo-a-mano-parte-2-design.md`. Plan: `docs/superpowers/plans/2026-09-27-dibujo-a-mano-parte-2-entrega-1.md`. Registro: `.superpowers/sdd/2026-09-27-dibujo-a-mano-parte-2/progress.md`.
  - **Siguiente:** Diego la prueba; después, plan de la entrega 2 (Claude dibuja y escribe a mano con animación).
```

- [ ] **Step 3: Última comprobación**

Run: `export PATH="$PATH:/c/Program Files/nodejs"; npm test && npm run build`
Expected: PASS y build sin errores.

- [ ] **Step 4: Commit**

```bash
git add docs/diseno.md AGENTS.md
git commit -m "v1.4 parte 2, entrega 1: documentación y estado"
```
