# Diseño: aula virtual en el segundo cerebro (parte C)

Fecha: 2026-10-04. Aprobado por Diego en conversación, parte por parte.

## 1. Objetivo

Que lo que los profes publican en el aula virtual llegue solo al segundo cerebro, sin que Diego copie nada:
- **A) Fechas** que no salen en el calendario (parciales, prácticas, entregas anunciadas en avisos o en la guía) → a la agenda.
- **B) Avisos** de los profes → a la app, sin llenar el Inicio.
- **C) Materiales** (PDFs, presentaciones) → al PC, para que Claude los use en la zona de estudio.
- **D) Guía docente** → texto y resumen de la evaluación, para que Claude la tenga en cuenta.

Lo que dijo Diego:
- Quiere las cuatro, sobre todo la A y la C. Que consuma poco.
- No quiere que el Inicio se llene de avisos.
- **Lo más importante es que no se equivoque con las fechas.** Si Haiku tiene dudas, que pase a Sonnet u Opus solo para ese caso; ante la duda, mejor enterarse antes que tarde.
- Usa Chrome, no Edge.
- En su PC, la URJC no le pide el código del móvil (doble factor): solo elige la cuenta.

Partes de "conectar la uni": A (calendario automático, publicada), **C (este diseño)**, horario de clases (siguiente, con su propio diseño), B «¿practicamos?» y D correo (más adelante).

## 2. Qué se ha comprobado (2026-10-04)

- El aula virtual vive en `https://www.aulavirtual.urjc.es/moodle` (sin `www` redirige). Configuración pública (`tool_mobile_get_public_config`): `enablemobilewebservice: 0` → **la puerta para apps de Moodle está apagada**; no se puede sacar un token de la API.
- Se entra por CAS: `https://identifica.urjc.es/CAS/login?service=…` (formulario `AuthNForm`, campo `adAS_username`). Puede pedir **doble factor** y tiene la opción «No solicitar de nuevo el doble factor en este dispositivo» (cookie de dispositivo de confianza).
- Conclusión: un robot en GitHub no puede entrar (no puede escribir el código del móvil y habría que guardar la contraseña de la uni en la nube). **Lo hace el programa local del PC**, con un navegador propio en el que Diego entra una vez.
- Sin comprobar todavía (se comprueba en la Tarea 1 del plan): cuánto dura la sesión antes de que la URJC pida entrar otra vez, cómo son por dentro la página de un curso, el foro de avisos y la guía docente.

## 3. Cómo funciona

```
PC de Diego (programa local, se enciende con Windows)
  1. Una vez al día (y con «Revisar ahora»): Chrome escondido entra al aula virtual
  2. Por asignatura con codigo: página del curso, foro de avisos, guía docente
  3. Lo nuevo: descarga materiales (solo PC), saca texto de los PDFs que interesan
  4. Claude Code (Haiku; Sonnet/Opus si hay dudas) lee solo lo nuevo → fechas, importancia de avisos, resumen de la guía
  5. Comprobaciones del programa → fusiona con tareas.yaml sin pisar a Diego
  6. git pull, commit y push de my-context (solo textos pequeños)
        │
        ▼
my-context ──► la app (PC, portátil, iPhone, iPad) y Claude en la terminal
```

### Navegador
- `playwright-core` (no descarga navegadores) con `launchPersistentContext` y `channel: 'chrome'`; si Chrome no está instalado, `channel: 'msedge'`.
- Carpeta propia del navegador: `C:\Users\Diego\.segundo-cerebro\navegador-aula\` (fuera de los dos repositorios). No toca el Chrome normal de Diego.
- **Entrar** (primera vez o cuando caduque): el programa abre una ventana visible en la página de entrada. Diego entra como siempre y marca «No solicitar de nuevo el doble factor en este dispositivo». El programa detecta que ya está dentro (la página `/moodle/my/` carga sin redirigir a `identifica.urjc.es`) y cierra la ventana. La contraseña nunca la ve ni la guarda el programa.
- **Revisar**: sin ventana (`headless`). Si alguna página redirige a la entrada, la revisión se para sin escribir nada y queda `necesitaEntrar: true`.
- Las descargas usan las cookies del mismo contexto (`context.request`), sin abrir pestañas.

### Cuándo revisa
- Al arrancar el programa y luego cada hora comprueba si la última revisión completa tiene más de 20 horas; si es así, revisa. Así, "una vez al día cuando el PC esté encendido" y, si estuvo apagado días, revisa al encenderlo.
- Botón «Revisar ahora» en Ajustes.
- **Solo un ordenador revisa:** opción «Este ordenador revisa el aula virtual» en Ajustes, guardada en `C:\Users\Diego\.segundo-cerebro\aula-virtual.json` (`{ "activo": true }`). Apagada por defecto; Diego la enciende en el PC.
- Ritmo suave con la URJC: las páginas se piden una a una (no en paralelo), unas 30 por revisión.

### Qué lee de cada asignatura
Solo las asignaturas con `codigo` en `estudios/asignaturas.yaml`. El curso se reconoce porque su nombre corto contiene el código (`2026-27_2327004_…`), igual que en la parte A; se toman de «Mis cursos».
- **Página del curso:** secciones (temas) y sus recursos (archivos, carpetas, enlaces, tareas).
- **Foro de avisos** (el foro de novedades del curso): los mensajes.
- **Guía docente:** el enlace que haya en el curso o la guía pública de la URJC (se decide en la Tarea 1 según dónde esté).

## 4. Qué se guarda y dónde

| Qué | Dónde (en `my-context`) | ¿Se sube? |
|---|---|---|
| Materiales descargados | `estudios/<asignatura>/aula-virtual/` (por tema) | **No** (`.gitignore`) |
| Lista de materiales | `estudios/<asignatura>/aula-virtual.yaml` | Sí |
| Guía docente: resumen de la evaluación + texto completo | `estudios/<asignatura>/guia-docente.md` | Sí |
| Avisos de los profes y del programa | `estudios/avisos.yaml` | Sí |
| Estado y lo ya visto | `estudios/aula-sincronizacion.yaml` | Sí |
| Fechas encontradas | `agenda/tareas.yaml` (con `origen: aula:…`) | Sí |

- No se descargan vídeos ni archivos de más de 50 MB: se apuntan en la lista con su enlace.
- `estudios/uni-sincronizacion.yaml` sigue siendo solo del workflow de la parte A; la parte C usa su propio archivo para que no se pisen.

### `estudios/<asignatura>/aula-virtual.yaml`
```yaml
actualizado: 2026-10-04
secciones:
  - nombre: Tema 1. Límites
    materiales:
      - id: "123456"             # id del recurso en Moodle
        nombre: Apuntes tema 1
        tipo: pdf                # pdf, presentacion, documento, carpeta, enlace, video, otro
        enlace: https://www.aulavirtual.urjc.es/moodle/mod/resource/view.php?id=123456
        archivo: tema-1/apuntes-tema-1.pdf   # relativo a aula-virtual/; falta si no se descargó
        retirado: true           # solo si el profe lo quitó del aula virtual
```

### `estudios/<asignatura>/guia-docente.md`
Primero `## Evaluación` (resumen corto de Claude: qué partes hay, cuánto cuenta cada una, nota mínima, si hay evaluación continua), luego `## Guía completa` con el texto sacado del documento. Se reescribe solo si la guía cambia.

### `estudios/avisos.yaml`
```yaml
avisos:
  - id: "moodle-post-98765"      # de Moodle; los del programa: "programa-<fecha>-<n>"
    asignatura: calculo          # falta en los del programa que no son de una asignatura
    fecha: 2026-10-03
    titulo: Cambio de aula del parcial
    texto: |
      El parcial del día 13 será en el aula 204.
    importante: true
    leido: false
    enlace: https://www.aulavirtual.urjc.es/moodle/mod/forum/discuss.php?d=…
```
- El programa añade avisos y nunca cambia `leido`. La app solo cambia `leido` (con el mismo método que el resto: aplicar solo lo que cambió, sin pisar).
- Para que no crezca: se quitan los avisos leídos de hace más de 60 días.
- Avisos del programa (siempre `importante: true`): fecha adelantada, fecha ⚠ por confirmar, «Vuelve a entrar en el aula virtual» (este último se quita solo al volver a entrar).

### `estudios/aula-sincronizacion.yaml`
```yaml
estado:
  ultimaRevision: 2026-10-04T09:12   # la última completa
  resultado: ok                      # ok | necesita-entrar | error
  mensaje: 3 avisos nuevos, 2 materiales, 1 fecha
vistos:
  materiales: { "123456": "<huella>" }   # id del recurso → tamaño/fecha de Moodle
  avisos: [ "moodle-post-98765" ]
  guias: { calculo: "<huella del texto>" }
  fechas:                                 # como uni-sincronizacion.yaml, por origen
    aula:calculo:primer-parcial: { fecha: 2026-11-13, hora: "10:00", titulo: "Primer parcial: Cálculo" }
pendientes: []                            # lo que Claude no pudo leer (límite, error); se reintenta
```

## 5. Fechas (A)

### Qué lee Claude
Solo lo nuevo de cada asignatura:
- avisos nuevos;
- la guía docente si es nueva o cambió;
- documentos nuevos cuyo nombre contenga (sin tildes ni mayúsculas) `calendario`, `planificacion`, `cronograma`, `evaluacion`, `parcial`, `examen`, `practica`, `entrega`, `fechas`.

El texto de los PDFs se saca en el PC (librería de JavaScript, sin coste). Si un PDF no tiene texto (escaneado), se apunta y no se manda.

### Cómo se le pregunta
Una llamada por asignatura con novedades: `claude -p --model haiku`, sin herramientas, con salida JSON. Se le da:
- la fecha de hoy y la fecha de publicación de cada aviso (para «el jueves que viene»);
- el curso académico (2026-27: de septiembre de 2026 a julio de 2027);
- las fechas que ya hay de esa asignatura: los exámenes oficiales (parte A) y las de origen `aula:` (con su `clave`);
- el texto nuevo.

Devuelve:
```json
{
  "fechas": [
    { "clave": "primer-parcial", "que": "Primer parcial", "tipo": "examen",
      "fecha": "2026-11-13", "hora": "10:00", "exacta": true,
      "cita": "el primer parcial será el jueves 13 de noviembre a las 10:00",
      "duda": null }
  ],
  "avisos": [ { "id": "moodle-post-98765", "importante": true } ],
  "evaluacion": "…resumen, solo si se le dio la guía…"
}
```
- `clave`: corta y estable. Si la fecha ya existía, la misma clave (así un cambio de fecha mueve la tarea en vez de crear otra).
- `tipo`: `examen`, `entrega` o `evento`.
- `exacta: false` cuando no hay día concreto («a mediados de noviembre»): no va a la agenda; queda en el aviso.
- `duda`: texto si ve algo raro (contradicción, fecha relativa, año poco claro, cambio sobre una existente); `null` si está seguro.
- No incluye los exámenes oficiales que ya están (mismo día y asignatura).

### Escalado a Sonnet y Opus
1. Haiku lee la asignatura.
2. Si alguna fecha trae `duda` o falla alguna comprobación (abajo), **toda esa asignatura** se vuelve a leer con `--model sonnet`, con el mismo texto.
3. Si Sonnet sigue con dudas o fallos, se vuelve a leer con `--model opus`.
4. Lo que siga dudoso tras Opus pasa a la regla «ante la duda, la más temprana».
5. La siguiente asignatura empieza otra vez con Haiku.

### Comprobaciones del programa (sin coste)
Para cada fecha, aunque el modelo diga que está seguro:
- La `cita` aparece de verdad en el texto dado (comparando sin mayúsculas, tildes ni espacios de sobra).
- Si la cita nombra un día de la semana junto a un número («jueves 13»), el día de la semana de `fecha` coincide.
- `fecha` está dentro del curso académico y no es anterior a hoy.
- `hora`, si viene, es `HH:MM` válida.

### Ante la duda, la más temprana
Si tras Opus una fecha sigue con `duda` o con una comprobación fallida, pero hay al menos una fecha candidata válida:
- a la agenda va la **más temprana** de las candidatas, con el título empezando por `⚠ ` y `(por confirmar)` al final;
- en las notas, todas las citas;
- un aviso del programa, importante.

Cuando una lectura posterior la confirma, se quita la marca (el programa puede cambiar el título si Diego no lo ha cambiado; ver abajo).
Si no hay ninguna fecha candidata válida, no va a la agenda y queda un aviso importante con la cita.

### Cómo entran en `tareas.yaml`
Con `fusionar` de la parte A (crear solo lo nunca visto, cambiar solo lo que cambia en la fuente, no recrear lo que Diego borró, nunca borrar), con la lista `vistos.fechas` de `aula-sincronizacion.yaml`:
- `origen`: `aula:<id asignatura>:<clave>`.
- `titulo`: `<que>: <nombre de la asignatura>` (ej. `Primer parcial: Cálculo`), con la marca ⚠ si toca.
- `tipo`: el de Claude. `area`: id de la asignatura. Sin `prioridad` (la calcula la app, v1.5). `icono`: `school` (examen), `file-upload` (entrega), ninguno (evento).
- `fecha`, `hora`; `notas`: la cita (o citas) y el enlace al aviso o documento.
- **Cambio nuevo en `fusionar`:** para los orígenes `aula:`, el `titulo` también es un campo de la fuente (para poner y quitar la marca ⚠). Como con los demás, solo se cambia si cambió en la fuente; si Diego cambió el título, el suyo se queda mientras la fuente no cambie.
- **Fecha adelantada:** si una fecha de una tarea `aula:` pasa a ser anterior a la que tenía, además se crea un aviso importante («El primer parcial de Cálculo se adelanta del 20 al 13 de noviembre»). Si se retrasa, solo se cambia.

## 6. Avisos (B) e importancia
- Claude marca cada aviso nuevo como `importante` si cambia los planes de Diego: cambio de fecha o de aula, clase cancelada o cambiada, entrega o examen nuevo, algo que hay que hacer antes de una fecha. Lo demás (material subido, recordatorios generales), normal.
- Si Claude no pudo leer un aviso (límite de uso), se guarda igualmente como `importante: false` y queda en `pendientes` para leerlo después.

## 7. Guía docente (D)
- Si es nueva o cambió (otra huella del texto), Claude escribe el resumen de evaluación en la misma llamada de la asignatura y se reescribe `guia-docente.md`.
- La guía también se usa para buscar fechas (sección 5).

## 8. En la app

### Inicio
- Una sola línea, solo si hay avisos importantes sin leer: `📣 2 avisos importantes de la uni`. Lleva a la sección Aula virtual de Estudio. Si no hay, no sale nada.

### Estudio → «Aula virtual»
- Un selector de asignatura (las que tienen `codigo`) y tres pestañas:
  - **Avisos:** de esa asignatura, los más nuevos arriba; los importantes destacados; marcar como leído (uno a uno y «todos»). Los avisos del programa sin asignatura salen en todas.
  - **Materiales:** por temas, como en `aula-virtual.yaml`. En la zona de estudio del PC (servida por el programa local), el material descargado se abre desde el PC; en el resto, el enlace lleva al aula virtual. Los retirados salen tachados.
  - **Evaluación:** la sección `## Evaluación` de `guia-docente.md`.
- Funciona en todos los dispositivos (lee los archivos de `my-context` con la API de GitHub, como el resto).

### Ajustes → «Aula virtual» (solo en la zona de estudio del PC)
- «Este ordenador revisa el aula virtual» (interruptor).
- Última revisión y resultado (de `aula-sincronizacion.yaml`): «hoy a las 9:12 · 3 avisos nuevos, 2 materiales, 1 fecha».
- Botones **«Revisar ahora»** y **«Entrar al aula virtual»**.

### Zona de estudio
- Las instrucciones de Claude en el chat de una asignatura dicen que tiene `estudios/<asignatura>/aula-virtual.yaml`, `aula-virtual/` y `guia-docente.md`, y que los lea solo si hacen falta para responder. Se comprueba que el modo `--restricted` le deja leer esa carpeta.

## 9. Errores

| Situación | Qué pasa |
|---|---|
| Sesión caducada | Se para sin escribir nada de esa revisión; `resultado: necesita-entrar` y aviso del programa |
| Aula virtual caída o en mantenimiento | `resultado: error`; se reintenta en la siguiente comprobación horaria |
| Límite de uso de Claude o fallo de Claude | Lo no leído queda en `pendientes`; los materiales y avisos se guardan igual |
| El programa no entiende una página (no encuentra cursos, secciones o el foro) | **Nunca borra ni marca como retirado** por no encontrar; `resultado: error` con el mensaje |
| Un recurso o aviso desaparece del aula virtual (y la página se entendió bien) | Material: `retirado: true`, el archivo se queda. Aviso: se queda |
| `git push` rechazado | `git pull --rebase` y repetir la fusión sobre los archivos nuevos (hasta 3 intentos), como el workflow de la parte A |
| Dos programas a la vez (PC y portátil) | Solo revisa el que tiene el interruptor encendido |

## 10. Consumo
- Red: unas 30 páginas por revisión, una revisión al día; cada material se descarga una vez.
- GitHub: solo textos pequeños; commit solo si algo cambió.
- PC: los materiales del curso (unos cientos de MB en el año).
- Claude: nada los días sin novedades; con novedades, una llamada a Haiku por asignatura. Sonnet y Opus solo en dudas. 0 € (suscripción).

## 11. Arquitectura del código

### Lógica pura con pruebas (`src/uni/`, imports con `.ts`)
- `aula/paginas.ts`: leer el HTML de «Mis cursos», de un curso y del foro de avisos → datos (cursos, secciones y recursos, mensajes). Con páginas reales guardadas y anonimizadas en las pruebas.
- `aula/materiales.ts`: qué descargar, nombres de archivo seguros, lista `aula-virtual.yaml`, retirados.
- `aula/avisos.ts`: leer y escribir `avisos.yaml`, añadir nuevos, limpiar viejos, marcar leído.
- `aula/fechas.ts`: preparar la pregunta para Claude, leer su respuesta, comprobaciones, escalado (qué hacer con cada resultado), regla de la más temprana, propuestas para `fusionar`.
- `aula/estado.ts`: leer y escribir `aula-sincronizacion.yaml`.
- `fusionar.ts`: título como campo de la fuente para `aula:` y detección de fechas adelantadas.

### Programa local (`local/`)
- `aula/navegador.ts`: abrir Chrome/Edge con `playwright-core`, entrar, comprobar sesión, pedir páginas y descargar.
- `aula/revision.ts`: una revisión completa (orquesta lo anterior, llama a Claude, escribe, `git`).
- `aula/claude.ts` o ampliación de `local/claude.ts`: llamada sin herramientas con `--model` y salida JSON.
- `principal.ts` y `servidor.ts`: comprobación horaria y rutas para Ajustes (estado, interruptor, revisar ahora, entrar).
- Sube `VERSION_PROGRAMA` (`src/estudio/tipos.ts`).

### App
- `src/datos/`: leer y validar `avisos.yaml`, `aula-virtual.yaml`, `guia-docente.md` (sección Evaluación) y el `estado` de `aula-sincronizacion.yaml`.
- Pantallas: línea del Inicio, sección Aula virtual en Estudio, apartado en Ajustes.

### `my-context`
- `.gitignore`: `estudios/*/aula-virtual/`.
- `AGENTS.md`: qué son los archivos nuevos y que `aula-sincronizacion.yaml` y las tareas `aula:` las escribe el programa (no quitar `origen`).
- `docs/diseno.md` (en la app), sección 3: formatos nuevos.

## 12. Pruebas
Con datos inventados o páginas reales anonimizadas, nunca con datos personales:
- Páginas: cursos reconocidos por código; secciones y recursos; foro; página de entrada detectada como «sesión caducada»; página rara → error, sin borrar.
- Materiales: nuevos, cambiados, retirados; límite de 50 MB y vídeos; nombres de archivo seguros.
- Avisos: añadir sin duplicar, `leido` intacto, limpieza de 60 días, avisos del programa.
- Fechas: respuesta válida e inválida de Claude; cada comprobación (cita inexistente, día de la semana, fuera de curso, pasada); escalado Haiku → Sonnet → Opus y vuelta a Haiku; la más temprana con ⚠; quitar la ⚠ al confirmarse; no exacta → sin tarea; duplicado de un examen oficial; fecha adelantada → aviso; retrasada → sin aviso.
- `fusionar`: título de `aula:` como campo de la fuente sin pisar el de Diego; la parte A sigue igual.
- Programa: revisión con navegador y Claude simulados (sesión caducada, error, límite de uso → pendientes, push rechazado).
- App: línea del Inicio solo con importantes sin leer; marcar leído; pestañas.

## 13. Puesta en marcha (con Diego)
1. **Tarea 1, prueba de acceso:** abrir la ventana, Diego entra; guardar copias de «Mis cursos», un curso, el foro de avisos y la guía (anonimizadas, para las pruebas); ver dónde está la guía docente. Volver a probar al día siguiente para saber cuánto dura la sesión. Si dura muy poco (menos de un día) se replantea con Diego antes de seguir.
2. Programar el resto.
3. Primera revisión a mano con Diego delante: revisa fechas, avisos y materiales en la app.
4. Encender el interruptor en el PC.

## 14. Fuera de este diseño
- Horario de clases (siguiente diseño).
- Avisos «¿practicamos?» (parte B original) y correo (parte D).
- Leer el texto de presentaciones (`.pptx`) y PDFs escaneados.
- Entregar tareas o escribir en el aula virtual: el programa solo lee.
