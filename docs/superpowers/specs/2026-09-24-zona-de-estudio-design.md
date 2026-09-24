# Diseño: zona de estudio (versión 1.2)

Fecha: 2026-09-24. Aprobado por Diego en conversación, parte por parte.

## 1. Objetivo

Una pestaña **Estudio** para las asignaturas de la uni. En el PC, Diego estudia en la app hablando con Claude en un chat y viendo cómo Claude explica en una **pizarra** amplia (texto, fórmulas, gráficas, dibujos repartidos por el lienzo). Las pizarras que Diego quiera conservar van a un **historial** que se ve en todos los dispositivos. Coste extra: 0 €.

Lo que dijo Diego:
- Nada de API de pago. En el PC el chat es **de verdad**: Diego escribe en la app y contesta **Claude Code** con su suscripción.
- El chat muestra las conversaciones de Claude Code guardadas en el ordenador. **Solo existe en el PC o el portátil**, donde está Claude Code. No aparece en el móvil ni en la web publicada.
- Las conversaciones se organizan **por asignatura**, más una **«General»** para lo que no sea de ninguna.
- La pizarra se usa **solo cuando hace falta**: si Diego pide que le explique algo o pide un esquema. Si la duda es simple, Claude contesta solo en el chat. Nunca hace un resumen automático al final.
- Cada conversación puede tener **tantas pizarras como hagan falta** («pizarra nueva» cuando se cambia de tema).
- En la pizarra, Diego puede **mover, borrar y añadir notas de texto**. El **dibujo a mano** va en una fase siguiente (es esencial para Diego). El formato ya le deja sitio.
- Diego puede pasar **capturas de pantalla** (de un ejercicio, por ejemplo). Claude las ve y las lee, y puede ponerlas en la pizarra.
- Una pizarra va al historial cuando Diego pulsa «Guardar» o se lo pide a Claude en el chat.

Supuestos confirmados:
- Se sincroniza todo (asignaturas, historial, tareas…) **menos** las conversaciones y las pizarras en curso, que se quedan en el ordenador donde se crearon.
- El portátil todavía no tiene nada. Diego descargará allí `my-context` y la app (hay una guía en el plan).

## 2. Alcance

### Incluido
1. **Programa local** y **chat** con Claude Code.
2. **Pizarra**: piezas, lo que puede tocar Diego y capturas.
3. **Asignaturas**, **historial** de pizarras y vista en el **móvil** o la web.
4. **Pulidos pendientes** de la v1.1 (sección 10).

Cada etapa funciona por sí sola y Diego la puede probar antes de pasar a la siguiente.

### No incluido
- Dibujo a mano en la pizarra: fase siguiente.
- Chat en el móvil o en la web publicada: necesitaría la API de pago.
- Ver en un dispositivo las conversaciones o pizarras en curso de otro.
- Cambiar el nombre de una conversación: el título es la primera pregunta.

## 3. Piezas

```
   EN EL PC / PORTÁTIL                          EN TODAS PARTES
 ┌──────────────────────────┐
 │ Programa local           │   GitHub (my-context)
 │ (npm run local)          │◄───── historial, asignaturas,
 │  · sirve la app          │       tareas… (API de GitHub)
 │  · habla con Claude Code │           ▲
 │  · lee chats y pizarras  │           │
 └──────────┬───────────────┘      Web publicada / móvil
            │                      (solo historial)
     Claude Code (claude -p)
```

- **La app es la misma.** Al abrir Estudio, pide `api/local/estado` a su propio origen. Si responde el programa local, enseña el chat y la pizarra. Si no (en GitHub Pages da 404), enseña solo el historial.
- **Programa local** (`local/`, TypeScript que Node 24 ejecuta directamente). `npm run local` compila la app y arranca el programa. Además:
  - sirve la app compilada en `http://127.0.0.1:5174/segundo-cerebro-app/`;
  - ofrece la API local en `/segundo-cerebro-app/api/local/…`;
  - lanza Claude Code, le pasa los mensajes y devuelve la respuesta poco a poco (Server-Sent Events);
  - vigila los archivos de las pizarras en curso y avisa a la app cuando cambian.
- **Service worker (PWA):** la ruta `api/` va a `navigateFallbackDenylist` y no se guarda en caché, para que el service worker nunca responda por el programa local.
- **Ruta de `my-context`:** `../my-context` por defecto. Se puede cambiar con la variable `MY_CONTEXT`.
- **El token de GitHub en local:** `127.0.0.1:5174` es otro origen, con su propio `localStorage`, así que Diego pega un token la primera vez que abre la app en local. Tareas, calendario, etc. funcionan igual que en la web.
- **Seguridad:**
  - el programa escucha solo en `127.0.0.1`;
  - rechaza toda petición cuyo `Host` no sea `127.0.0.1:5174` o `localhost:5174`, y toda petición con un `Origin` distinto del suyo (así otra web no puede usar el chat ni leer archivos);
  - la API local solo lee y escribe dentro de `my-context/estudios/` y de la carpeta de conversaciones de Claude Code, y comprueba cada ruta para que no pueda salirse;
  - Claude Code se lanza sin permiso para ejecutar comandos: solo puede leer y escribir archivos (sección 5).

## 4. Datos

| Qué | Dónde | ¿Se sincroniza? |
|---|---|---|
| Asignaturas | `my-context/estudios/asignaturas.yaml` | Sí (API de GitHub) |
| «General» | Fija en el código, id `general` | — |
| Apuntes de Diego | `estudios/<asignatura>/…`: Claude los puede leer | Sí (git) |
| Conversaciones | Las que guarda Claude Code: `~/.claude/projects/<carpeta>/<id>.jsonl` | No |
| Pizarras en curso | `estudios/<asignatura>/.en-curso/<id-conversación>/pizarra-<n>.json` | No (git las ignora) |
| Capturas de una conversación | `estudios/<asignatura>/.en-curso/<id-conversación>/imagenes/<nombre>.png` | No |
| Historial | `estudios/<asignatura>/pizarras/AAAA-MM-DD-<titulo>.json` | Sí (API de GitHub) |
| Imágenes del historial | `estudios/<asignatura>/pizarras/imagenes/<nombre>.png` | Sí |

### `estudios/asignaturas.yaml`
```yaml
asignaturas:
  - id: fisica
    nombre: Física
    color: "#3d7bb8"
```
- `id` en minúsculas, sin espacios ni tildes, y único; `general` no se puede usar.
- Las edita la app desde Estudio (añadir, cambiar nombre o color, quitar), con el mismo guardado sin pisar cambios de otros que ya usan tareas y áreas.
- Quitar una asignatura solo la quita de la lista. Su carpeta y su historial no se borran.

### Conversaciones
- Claude Code se lanza con la carpeta de la asignatura como directorio de trabajo (`estudios/<id>/`). Claude Code guarda las conversaciones separadas por carpeta, así que cada asignatura tiene las suyas, incluidas las que Diego empiece en la terminal desde esa carpeta.
- La carpeta de conversaciones se calcula como hace Claude Code: la ruta absoluta con cada carácter que no sea letra o número cambiado por `-`, dentro de `~/.claude/projects/`. Si Claude Code cambia esa regla, el programa busca la carpeta cuyo nombre coincida mejor con la de la asignatura y avisa si no la encuentra.
- El programa lee los `.jsonl` y saca solo los mensajes de texto de Diego y de Claude. El uso de herramientas se resume en una línea gris (por ejemplo, «✏️ ha dibujado en la pizarra 2»).
- Título: la primera pregunta de Diego, recortada a 60 caracteres. Orden: de la más reciente a la más antigua.

### Git en `my-context`
- Se crea `my-context/.gitignore` con la línea `estudios/**/.en-curso/`.
- El historial se sube con la API de GitHub desde la app (el mismo cliente de siempre), **no** con git local. Así nunca queda en el disco un archivo sin seguimiento que choque con el siguiente `git pull`. El `my-context` del ordenador recibe el historial en su próximo `git pull`.

## 5. Claude Code desde el programa local

Cada mensaje de Diego lanza un proceso:
```
claude -p "<mensaje>" --output-format stream-json --include-partial-messages
       (--session-id <uuid nuevo> | --resume <id>)
       --append-system-prompt-file local/instrucciones-estudio.md
       --allowedTools Read Write Edit Glob Grep
       --disallowedTools Bash
```
con el directorio de trabajo `estudios/<asignatura>/`. Los permisos exactos se comprueban en la primera tarea del plan (flags de la versión 2.1.281 de Claude Code). Lo que debe cumplirse:
- no puede ejecutar comandos;
- no pide permisos por pantalla, porque nadie los vería;
- solo escribe dentro de `estudios/`.

Si los flags no bastan para eso último, se usa un archivo de ajustes con reglas de permisos para ese directorio.

- **Instrucciones de estudio** (`local/instrucciones-estudio.md`, en español), que se añaden a las de siempre:
  - quién es Diego y cómo explicarle (sencillo, con ejemplos);
  - cuándo usar la pizarra (sección 1) y cuándo no;
  - dónde está y cómo se escribe cada pizarra (sección 6);
  - cómo pedir que se guarde («guardarComo»);
  - que en la zona de estudio **no** haga la rutina de git de `my-context`.
- **El mensaje que recibe Claude** lleva delante una línea de contexto:
  - la asignatura;
  - la carpeta de pizarras de esa conversación y cuál es la pizarra abierta;
  - las rutas de las capturas adjuntas (Claude Code las mira con su herramienta de leer archivos).
- **Respuesta poco a poco:** el programa traduce la salida `stream-json` a eventos para la app: texto que llega, uso de herramienta, final y error.
- **Parar:** el botón «Parar» cierra el proceso.
- **Pizarra mal escrita:** al terminar cada respuesta, el programa valida las pizarras que han cambiado. Si alguna no es válida, lanza **un solo** mensaje automático en la misma conversación («La pizarra 2 no es válida: <error>. Arréglala.»). La app sigue mostrando la última versión buena y un aviso pequeño.
- **Una respuesta a la vez** por conversación. El botón de enviar se desactiva mientras Claude contesta.

## 6. La pizarra

Un lienzo sin bordes. Se mueve arrastrando el fondo y se hace zoom con la rueda del ratón (o pellizcando). Hay un botón **«Ver todo»**.

### Formato (`pizarra-<n>.json`)
```json
{
  "version": 1,
  "titulo": "Leyes de Newton",
  "piezas": [
    { "id": "t1", "tipo": "texto", "x": 0, "y": 0, "ancho": 320,
      "contenido": "## Segunda ley\nLa fuerza es $F = m·a$…" },
    { "id": "f1", "tipo": "formula", "x": 400, "y": 20, "ancho": 300,
      "contenido": "\\vec{F} = m \\cdot \\vec{a}" },
    { "id": "g1", "tipo": "grafica", "x": 0, "y": 300, "ancho": 360,
      "contenido": { "x": [-3, 3], "y": [-1, 9],
                     "curvas": [{ "expr": "x^2", "etiqueta": "y = x²" }],
                     "puntos": [{ "x": 2, "y": 4, "etiqueta": "(2, 4)" }] } },
    { "id": "d1", "tipo": "dibujo", "x": 420, "y": 300, "ancho": 300,
      "contenido": "<svg viewBox=\"0 0 300 200\">…</svg>" },
    { "id": "i1", "tipo": "imagen", "x": 800, "y": 0, "ancho": 400,
      "contenido": "imagenes/ejercicio-3.png" },
    { "id": "n1", "tipo": "nota", "x": 800, "y": 300, "ancho": 240,
      "contenido": "¿Y si el plano tiene rozamiento?" }
  ],
  "flechas": [{ "id": "a1", "de": "t1", "a": "f1", "etiqueta": "en fórmula" }],
  "guardarComo": null,
  "guardadaEn": null
}
```
- **Piezas:**
  - `texto`: Markdown (el mismo `marked` y `DOMPurify` de la app) con fórmulas `$…$` y `$$…$$`, dibujadas con **KaTeX**.
  - `formula`: LaTeX, dibujada con KaTeX en grande.
  - `grafica`: la dibuja la app en SVG. Las expresiones las evalúa un **intérprete propio pequeño** (nunca `eval`) con `+ - * / ^`, paréntesis, `x`, `pi`, `e` y `sin cos tan asin acos atan sqrt abs ln log exp`. Si una expresión no se entiende, la pieza muestra el error.
  - `dibujo`: SVG libre de Claude, limpiado con DOMPurify (perfil SVG, sin scripts ni enlaces externos).
  - `imagen`: ruta relativa a la carpeta de la pizarra.
  - `nota`: texto de Diego, en otro color.
  - Fase siguiente: `trazo` (dibujo a mano). El validador ignora con un aviso los tipos que no conoce, en vez de romperse.
- La altura de cada pieza la da su contenido. Las flechas van de borde a borde de las piezas que unen.
- **Validación** (`src/estudio/pizarra.ts`, sin pantalla y con pruebas):
  - `version` es 1;
  - los ids son únicos;
  - los números son finitos;
  - `ancho` está entre 40 y 2000;
  - las flechas apuntan a piezas que existen;
  - las rutas de imagen no salen de la carpeta.

### Lo que puede hacer Diego
- **Mover** cualquier pieza (arrastrándola), **borrar** cualquier pieza (seleccionar y pulsar Supr o la papelera) y **crear o editar notas** (doble clic en un hueco o en una nota).
- Cada acción se manda al programa local como una **operación** (`mover`, `borrar`, `nota`). El programa la aplica sobre la versión **más nueva** del archivo y lo escribe de una vez (a un archivo temporal que luego se renombra). Así, si Claude acaba de cambiar la pizarra, no se pierde ni lo de Claude ni lo de Diego.
- Si Claude y Diego escriben la misma pizarra casi a la vez, el `Edit` de Claude puede fallar. Claude Code entonces vuelve a leer el archivo y reintenta, que es su comportamiento normal.

### Varias pizarras
- Pestañas «Pizarra 1 · Pizarra 2 · + nueva». «+ nueva» (o «pizarra nueva» en el chat) crea `pizarra-<n+1>.json` vacía y la abre.
- Una conversación sin pizarras enseña el chat a todo el ancho. Cuando aparece la primera pizarra, la pantalla se divide.

### Guardar en el historial
- **Botón «Guardar en el historial»:** pide un título (propone el `titulo` de la pizarra) y sube el archivo a `pizarras/AAAA-MM-DD-<titulo-en-minúsculas-con-guiones>.json` con la API de GitHub, más las imágenes que use a `pizarras/imagenes/`. Si ya existe un archivo con ese nombre, añade `-2`, `-3`…
- **Pidiéndoselo a Claude:** Claude escribe el título en `guardarComo`. La app lo detecta al recibir el aviso de cambio, sube la pizarra igual y deja `guardarComo: null`.
- **Al terminar**, en los dos casos, la app escribe la ruta en `guardadaEn`. Si la pizarra se vuelve a guardar después, se **actualiza** ese mismo archivo del historial en vez de crear otro.
- **Si no hay internet:** «Pendiente de subir», y se reintenta cuando vuelve la conexión o al abrir la pizarra.

## 7. Pantalla Estudio

Nueva sección `estudio` («Estudio», icono 📚) en la barra lateral y el menú del móvil, entre Ideas y Ajustes.

### En el PC con el programa local
```
┌────────┬──────────────────────────────────────────────────────────────┐
│ barra  │ Estudio   [ General ] [ Física ] [ Cálculo ]  [+ asignatura] │
│ lateral├──────────────────────┬───────────────────────────────────────┤
│        │ ◂ Conversaciones  +  │  Pizarra 1 · Pizarra 2 · [+ nueva]    │
│        │ Tú: ¿cómo descompongo│   (lienzo con piezas y flechas)       │
│        │ Claude: Mira la      │                                       │
│        │ pizarra 👉 …         │                                       │
│        │ [📎] Escribe…    [➤] │  [Ver todo] [−][+]  [Guardar ⤓]       │
└────────┴──────────────────────┴───────────────────────────────────────┘
```
- **Pestañas de asignaturas**, con «General» la primera y «+ asignatura» al final.
- **Chat (izquierda, un tercio del ancho):**
  - «◂ Conversaciones» abre una lista con dos apartados: **Conversaciones** e **Historial** (las pizarras guardadas de esa asignatura). «+» empieza una conversación nueva.
  - Los mensajes de Claude se ven con Markdown y KaTeX y se van escribiendo poco a poco.
  - 📎, Ctrl+V o arrastrar sirven para adjuntar capturas, que se ven en miniatura antes de enviar.
  - Enter envía y Mayús+Enter hace un salto de línea.
- **Pizarra (derecha).** La separación con el chat se puede arrastrar.
- Al abrir Estudio se abre la última conversación usada en esa asignatura. Se recuerda en `localStorage`, envuelto en try/catch.

### En el móvil o la web (sin programa local)
- Aviso arriba: «El chat solo está disponible en tu PC».
- Pestañas de asignaturas y, en cada una, la lista del historial (título y fecha). Al tocar una se abre la pizarra en **solo lectura**: se puede arrastrar y hacer zoom, pero no editar.
- Las asignaturas se pueden añadir y editar también aquí.
- Las pizarras del historial se leen con la API de GitHub y se guardan en la caché de la app, así que se pueden ver sin internet si ya se abrieron antes.

## 8. Errores

| Situación | Qué ve Diego |
|---|---|
| Claude Code no está instalado o no está en el PATH | «No encuentro Claude Code en este ordenador», con qué hacer |
| Sesión caducada o límite de uso de la suscripción | El mensaje de Claude Code explicado, más el enlace «Uso de Claude» (`URL_USO_CLAUDE`) |
| El programa local se cierra con la app abierta | El chat se oculta: «El programa local se ha cerrado». El historial sigue funcionando |
| Respuesta cortada | Se queda lo que llegó y un botón «Reintentar» |
| «Parar» | Se corta la respuesta y se queda lo que llegó |
| Pizarra no válida | La última versión buena, un aviso pequeño y un mensaje automático a Claude para que la arregle (sección 5) |
| Sin internet al guardar | «Pendiente de subir» y reintento |
| No aparece la carpeta de conversaciones de una asignatura | Lista vacía y «Aún no hay conversaciones»; si la regla de nombres falla, aviso en la consola del programa |

## 9. Pruebas

Primero la prueba (que falle) y luego el código, como en el resto de la app.
- **Sin pantalla, con Vitest:**
  - validación de pizarras;
  - operaciones `mover`, `borrar` y `nota`;
  - intérprete de expresiones de las gráficas;
  - lectura de `.jsonl` de Claude Code a mensajes (con ejemplos reales recortados, sin datos personales);
  - cálculo de la carpeta de conversaciones;
  - traducción de `stream-json` a eventos;
  - lectura y escritura de `asignaturas.yaml`;
  - nombres de archivo del historial (fecha, título y `-2`);
  - comprobación de rutas y de `Host`/`Origin` del programa local.
- **El programa local, con un «Claude de mentira»:** un script que imita la salida `stream-json` de Claude Code (texto, uso de herramientas, error y corte). Las pruebas no gastan la suscripción.
- **A mano con Diego, al final de cada etapa:**
  - etapa 1: una conversación corta de verdad;
  - etapa 2: una explicación en la pizarra, moviendo cosas, con una nota y una captura;
  - etapa 3: guardar en el historial y verlo en el móvil.

## 10. Pulidos pendientes de la v1.1 (etapa 4)

1. **Casillas instantáneas:** al marcar una tarea, la lista local cambia al momento (optimista). Se guarda en segundo plano sin desactivar la casilla, y si falla se deshace con un aviso. Se mantiene la cola actual (`src/estado/cola.ts`) para el orden de los guardados.
2. **Contenido pegado a la izquierda** en el PC, en vez de centrado (`main { max-width: 1180px; margin: 0 auto }`). A prueba: se le enseña a Diego en local y elige. Si no le gusta, se deja como está.
3. **Hora actual** junto a la fecha, bajo el saludo del Inicio, actualizándose cada minuto. También a prueba.
4. **Arreglos menores aplazados** (líneas `Final: minor (deferred)` de `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`):
   - Ideas: Enter dos veces rápido apunta la idea dos veces (falta el candado «guardando»).
   - Ideas: tocar la misma fila mientras se guarda da el aviso engañoso «quizá la movió Claude».
   - `bandeja.md`: conservar CRLF si el archivo lo usa y tolerar un BOM al principio.
   - Idea → Tarea con un proyecto vinculado ya borrado: no guardar el id viejo.
   - Idea → Proyecto que choca con un proyecto nuevo de Claude sin refrescar: refrescar antes de comprobar.
   - `docs/diseno.md`: mover el bloque de Ideas a su sitio.
   - La barra lateral resalta el subproyecto abierto.

## 11. Documentación que se actualiza

- `docs/diseno.md`: formato de `estudios/asignaturas.yaml` y de las pizarras (sección 3) y la pantalla Estudio.
- `AGENTS.md` de la app: comandos (`npm run local`), estructura (`local/`, `src/estudio/`) y estado.
- `my-context/AGENTS.md`: qué hay en `estudios/` y que `.en-curso/` no se sube.
- Guía para poner en marcha el portátil: `docs/portatil.md` (instalar Node y Claude Code, descargar los dos repositorios, `npm install` y `npm run local`).
