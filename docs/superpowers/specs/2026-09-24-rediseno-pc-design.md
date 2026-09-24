# Diseño: rediseño del PC (versión 1.1)

Fecha: 2026-09-24. Aprobado por Diego en conversación, parte por parte. Boceto de referencia: `.superpowers/brainstorm/387-1790245911/content/inicio-pc.html` (local, no se sube).

## 1. Objetivo

Que al abrir la app en el PC apetezca usarla: clara pero sin deslumbrar, ordenada y con el menú a la izquierda. Al abrirla, un **Inicio** tipo "segundo cerebro de Notion" que enseña de un vistazo qué toca hoy, esta semana, este mes y en qué proyectos está Diego. Lo que exige más lectura (el detalle de un proyecto, las notas) se abre desde la barra lateral.

Lo que dijo Diego:
- Solo el PC en esta ronda. El móvil va después.
- Tema claro pero no blanco puro. Nada de morado.
- Navegación a la izquierda en el PC, bastante más bonita que ahora.
- Inicio con Hoy + atrasadas, Esta semana, Proyectos activos, Captura rápida y, bajando con la rueda, el mes entero.
- Calendario con "varios calendarios" (uni, personal…).
- Una sección de Ideas con la que vincular ideas a proyectos, pasarlas a tarea o convertirlas en proyecto.

Supuestos confirmados:
- La app es siempre clara, aunque Windows esté en modo oscuro.
- El formato de `tareas.yaml`, `areas.yaml` y `proyectos/*.md` no cambia. Se amplía el de `ideas/bandeja.md` (sección 6).

## 2. Alcance

### Incluido
- Tema "papel cálido" en toda la app.
- Barra lateral en el PC y menú de abajo mínimo en el móvil.
- Pantalla **Inicio**, que sustituye a la pestaña Hoy.
- Filtro por áreas en **Calendario**.
- Pantalla **Ideas** y bloque «Ideas de este proyecto».
- Barra de progreso de los proyectos.
- Enlace **Uso de Claude**.
- Estilo nuevo en Tareas, Proyectos, página de proyecto, Ajustes y formulario de tarea.

### No incluido
- Diseño del móvil: siguiente ronda, cuando Diego cuente sus fallos.
- Contador de tokens dentro de la app: no hay forma pública de leer el uso de la suscripción desde una web sin servidor. Solo habrá el enlace.
- Sección de estudio con chat: apuntada en `ideas/bandeja.md`. Necesitaría la API de Claude, que se paga aparte.
- Modo oscuro.

## 3. Tema

Colores como variables CSS en `:root`. Se quita el bloque `prefers-color-scheme: dark` y se pone `color-scheme: light`.

| Variable | Valor | Uso |
|---|---|---|
| `--fondo` | `#f6f1e7` | fondo de la página |
| `--lateral` | `#efe7d8` | barra lateral |
| `--superficie` | `#fbf8f2` | tarjetas, campos |
| `--texto` | `#3b3027` | texto |
| `--suave` | `#8b7b6a` | texto secundario |
| `--borde` | `#e6dccb` | bordes |
| `--acento` | `#b8603d` | terracota: botón principal, casillas, hoy |
| `--acento-suave` | `#f1dccf` | fondos resaltados |
| `--peligro` | `#b3412e` | atrasadas, borrar, prioridad alta |
| `--aviso` / `--error` | `#fbecc4` / `#f6ddd6` | banners |

- **Tipografía:** Segoe UI / system-ui para el texto. El saludo del Inicio va en Georgia (serif), como en el boceto.
- **Colores de área:** siguen saliendo de `areas.yaml`. Los puntos se pintan con el color tal cual. Las etiquetas del calendario usan ese color mezclado con el fondo (unos 25 % de color, con `color-mix`), para que se lean con texto oscuro.
- **Piezas comunes:**
  - tarjeta: `--superficie`, borde de 1 px, radio de 14 px;
  - título de sección: 13 px, en mayúsculas y color `--suave`;
  - casilla: cuadrado redondeado que, marcado, se rellena de `--acento`;
  - prioridad alta: pastilla con fondo `--error` y texto `--peligro`.

## 4. Estructura y navegación

- `App.tsx` pasa a ser un diseño de dos columnas: `<Lateral>` y `<main>`.
- La pantalla por defecto es `inicio`. Pantallas: `inicio | calendario | tareas | proyectos | ideas | ajustes`.
- Se quita la pestaña `hoy`: `Hoy.tsx` se convierte en el bloque "Hoy" del Inicio.
- **Navegación con contexto:** además de la pantalla, el estado de `App` guarda:
  - el día con el que se abre el Calendario (`diaCalendario?: ISODate`);
  - el proyecto abierto (`proyectoAbierto?: string`).
  
  Así, el Inicio y la barra lateral pueden abrir el Calendario en un día o un proyecto concreto. `Proyectos` ya abre `PaginaProyecto` por dentro: se le pasa el id inicial.
- **Barra lateral** (`src/componentes/Lateral.tsx`), visible con `min-width: 900px`:
  - Marca: logo ✦ en un cuadrado terracota y «Segundo cerebro».
  - Inicio 🏠 · Calendario 📅 · Tareas ✅ (con el número de tareas pendientes) · Proyectos 📁 (con los activos debajo, cada uno con su punto de color, que abren su página) · Ideas 💡 (con el número de ideas).
  - Un hueco flexible y, abajo: **Uso de Claude** (enlace a `https://claude.ai/settings/usage`, en una pestaña nueva) y Ajustes ⚙️.
  - Es fija (`position: sticky; height: 100vh`) y resalta la sección activa.
  - Mientras falte la configuración o la llave falle, solo se puede usar Ajustes, como ahora.
- **Tareas pendientes** del contador: las tareas normales sin marcar (atrasadas, con fecha futura y sin fecha). No cuenta las repetidas.
- **Por debajo de 900 px:** se oculta la barra lateral y se ve el menú de abajo actual con Inicio, Calendario, Tareas, Proyectos, Ideas y Ajustes, con los estilos nuevos. «Uso de Claude» va en Ajustes.
- Los banners (sin conexión, errores) se muestran arriba dentro de `<main>`.

## 5. Inicio (`src/pantallas/Inicio.tsx`)

Contenido máximo de unos 1180 px, con este orden:

1. **Saludo:** `saludo(hora)` da «Buenos días» de 6:00 a 13:59, «Buenas tardes» de 14:00 a 20:59 y «Buenas noches» de 21:00 a 5:59, seguido de «, Diego». Debajo, `formatoLargo(hoy)`. La hora se lee al renderizar; como `useHoy` refresca al volver a la app, el saludo se actualiza entonces.
2. **Captura rápida** (`src/componentes/Captura.tsx`): un campo de texto, el botón **+ Tarea** (principal; también con Enter) y el botón **💡 Idea**.
   - «+ Tarea» crea `{ titulo, area: primera área de areas.yaml o 'personal' }`, sin fecha, con `aplicarEdicion(ts, null, …)`.
   - «Idea» añade una idea con la fecha de hoy (sección 6).
   - Al terminar bien, el campo se vacía. Si hay texto vacío o la app está en solo lectura, los botones se desactivan.
3. **Rejilla de dos columnas** (1.4fr / 1fr):
   - **Hoy**: atrasadas (título en `--peligro`), «Para hoy» y «Sin fecha: lo más importante» (las 3 primeras), con `FilaTarea`. Si una lista está vacía, sale un texto suave. Enlace «Ver todas las tareas →».
   - **Proyectos activos**: una tarjeta por proyecto con `estado: activo`, ordenados con `ordenarProyectos`. Cada tarjeta lleva:
     - el punto de color del área y el título;
     - «Dónde lo dejamos:» con la última línea no vacía de esa sección (`dondeLoDejamos(cuerpo)`), o nada si no hay;
     - la barra de progreso y «N de M tareas» (`progresoProyecto`), o «Sin tareas todavía».
     
     Al pulsar la tarjeta se abre el proyecto. Debajo: «N de 2 proyectos activos» y, si hay más de 2, el aviso en `--peligro`. Si no hay activos: «No tienes proyectos activos» y un enlace a Proyectos. Enlace «Todos →».
4. **Esta semana** (a lo ancho): 7 columnas, de lunes a domingo de la semana de hoy (`diasSemana(hoy)`).
   - Cada día muestra «lun 21», con hoy resaltado con borde `--acento` y «· hoy».
   - Etiquetas de `tareasDelDia` filtradas: la hora delante si la tiene, y tachadas si están hechas ese día.
   - Si un día tiene más de 5, se ven 5 y «+N más».
   - Al pulsar un día se abre el Calendario en ese día.
5. **Este mes** (a lo ancho): `cuadriculaMes` del mes de hoy, en compacto. Hasta 3 etiquetas por día y «+N más». Los días de fuera del mes van atenuados y hoy resaltado. Al pulsar un día se abre el Calendario en ese día.

Las etiquetas de semana y mes son el mismo componente: `src/componentes/EtiquetaTarea.tsx`.

## 6. Ideas

### Formato de `ideas/bandeja.md`
- Una idea es una línea que cumple `^- (\d{4}-\d{2}-\d{2})(?: \[([a-z0-9-]+)\])?: (.+)$`:
  - sin vincular: `- 2026-09-24: texto`;
  - vinculada: `- 2026-09-24 [juego-nave]: texto`, donde `juego-nave` es el id del proyecto (el nombre de su archivo sin `.md`).
- Las demás líneas (título, explicación, líneas raras) se conservan tal cual y en su sitio.
- Si el archivo no existe, se lee como bandeja vacía. Al escribir la primera idea, se crea con la cabecera actual (`# Bandeja de ideas` + la frase de explicación).
- Si un proyecto vinculado no existe (lo borró alguien), la idea se muestra con el id tal cual y se puede volver a vincular.

### Código
- `src/datos/ideas.ts`:
  - `Idea { fecha, proyecto?, texto }`;
  - `parseBandeja(texto): Linea[]`, con `Linea = { tipo: 'idea', idea } | { tipo: 'otra', texto }`;
  - `serializarBandeja(lineas)`;
  - `ideasDe(lineas)`: las ideas, de la más nueva a la más antigua, y a igual fecha, la última del archivo primero.
  - La identidad de una idea es su contenido exacto (fecha + proyecto + texto), porque no hay ids.
- Operaciones puras en `src/agenda/ideas.ts`. Si la idea no está, cada una lanza `ErrorIdeaCambiada`:
  - `anadirIdea(lineas, idea)`: la añade al final;
  - `vincularIdea(lineas, idea, proyecto | undefined)`;
  - `quitarIdea(lineas, idea)`.
- `RUTA_BANDEJA = 'ideas/bandeja.md'` en `rutas.ts`.
- En `repositorio.ts`, `cargarAgenda` también lee la bandeja (`Agenda` gana `ideas: Linea[]`; `Datos` también).
- `modificarBandeja(cfg, cambio, mensaje)`, igual que `modificarTareas`: el cambio se aplica sobre la versión remota más reciente y se reintenta si hay conflicto.
- En `datos.tsx`, `cambiarIdeas(cambio, mensaje)` va por la misma cola que `cambiarTareas`. El refresco al volver a la app también trae la bandeja. Si salta `ErrorIdeaCambiada`, aviso: «Esta idea ha cambiado mientras tanto (quizá la movió Claude). Se han recargado las ideas.», y se recarga la agenda.

### Pantalla `src/pantallas/Ideas.tsx`
- Arriba, un campo y un botón «Apuntar idea», que la añade con la fecha de hoy y sin proyecto.
- Lista de `ideasDe`. Cada fila lleva:
  - la fecha corta y el texto;
  - **Proyecto ▾**: un `select` con «(ningún proyecto)» y todos los proyectos. Muestra el proyecto vinculado, así que no hace falta otra etiqueta. Al cambiarlo se llama a `vincularIdea`;
  - **→ Tarea**: abre `FormTarea` con `nueva: { titulo: texto, proyecto }` y un aviso «al guardar, la idea sale de la bandeja». Si la tarea se guarda bien, se llama a `quitarIdea`. Si esto último falla, la idea se queda y sale el aviso de error; se puede borrar a mano;
  - **→ Proyecto**: abre `FormProyectoDesdeIdea` (sección 6.1);
  - **Borrar**: pide confirmación y llama a `quitarIdea`.
- Si no hay ideas: «La bandeja está vacía. Apunta aquí lo que se te ocurra para no desviarte de lo que estás haciendo.»

### 6.1 Convertir una idea en proyecto
- Una ventana pide el nombre (por defecto, el texto de la idea recortado a 60 caracteres) y el área (lista de áreas y «(ninguna)»).
- Id: `idProyectoDesdeTitulo(nombre, existentes)`, que ya existe.
- Contenido: `proyectoDesdeIdea(idea, nombre, area)` da un `Proyecto` con `estado: 'idea'`, `area` y este cuerpo:
  `# <nombre>\n\n## Qué es\n<texto de la idea>\n\n## Dónde lo dejamos\n<fecha de hoy>: creado desde la bandeja de ideas.\n`
- Se guarda con `guardarProyecto(p, null)`, que no pisa un archivo existente. Después se llama a `quitarIdea`. Por último se abre la página del proyecto nuevo.

### Ideas de este proyecto
- En `PaginaProyecto`, un bloque «Ideas de este proyecto» (solo si hay alguna) con las ideas vinculadas a ese id: fecha y texto.
- Al pulsar el bloque se abre la pantalla Ideas.

`FormTarea` acepta `nueva.titulo` además de `fecha` y `proyecto`. El tipo `Edicion` gana dos campos opcionales:
- `nota?: string`: un aviso que se muestra en el formulario;
- `alGuardar?(): Promise<unknown>`: se llama solo si la tarea se guardó bien, antes de cerrar. La pantalla Ideas la usa para quitar la idea.

Van dentro de `Edicion` porque es `App` quien abre `FormTarea`.

## 7. Calendario

- Se mantiene lo actual: vista de mes y de semana, flechas, «Hoy» y la lista del día seleccionado.
- Acepta `diaInicial` para abrirse en un día concreto.
- **Filtro por áreas:** una fila de botones con «Todo», una pastilla por área de `areas.yaml` (con su color) y «Otras» si hay tareas con un área que no está en `areas.yaml`.
  - Estado: el conjunto de áreas encendidas; vacío significa todas.
  - Pulsar un área la enciende o la apaga. «Todo» vacía el conjunto. Si al apagar se quedarían todas apagadas, se vuelve a «todas».
  - Función pura `filtrarPorAreas(ts, encendidas, idsConocidos)` en `src/agenda/tareas.ts`, donde `'otras'` representa las áreas desconocidas.
  - El filtro se aplica a la cuadrícula y a la lista del día.
  - Se recuerda en `localStorage` (clave `sc-calendario-areas`), dentro de try/catch; si falla, se empieza con todas.

## 8. Proyectos

- `progresoProyecto(ts, id) → { hechas, total }`: cuenta las tareas no repetidas con `proyecto === id`. Va en `src/agenda/proyectos.ts`.
- `dondeLoDejamos(cuerpo)`: la última línea no vacía bajo `## Dónde lo dejamos`, hasta el siguiente `## ` o el final; `undefined` si no hay. Va en `src/datos/proyectos.ts`.
- La lista de Proyectos muestra la barra de progreso en cada fila. La página del proyecto la muestra bajo el título.

## 9. Resto de pantallas

Tareas, Proyectos, PaginaProyecto, Ajustes y FormTarea mantienen lo que hacen y se visten con las piezas de la sección 3. El formulario de tarea es una ventana centrada, con radio de 16 px y fondo `--fondo`. Ajustes gana, en el móvil, el enlace «Uso de Claude».

## 10. Errores

- Todo lo de la versión 1 se mantiene: sin conexión es solo lectura, la llave inválida lleva a Ajustes, y un archivo roto bloquea solo su edición.
- La bandeja no puede "romperse": lo que no se entiende como idea se guarda como línea normal. Por eso no bloquea nada.
- Casos de dos pasos (idea → tarea, idea → proyecto): primero se crea lo nuevo y después se quita la idea. Si falla lo segundo, se ve la idea duplicada, pero no se pierde nada.

## 11. Pruebas

- **TDD (Vitest)** para toda la lógica pura:
  - `parseBandeja` / `serializarBandeja`: conservan las otras líneas y su orden, y leen ideas con y sin proyecto;
  - `ideasDe`: orden;
  - `anadirIdea`, `vincularIdea` y `quitarIdea`, incluido el caso de idea que ya no está;
  - `proyectoDesdeIdea`, `progresoProyecto`, `dondeLoDejamos`, `saludo`, `filtrarPorAreas`;
  - `modificarBandeja` y la lectura de la bandeja en `cargarAgenda`, con el cliente simulado como en `repositorio.test.ts`.
- **Tipos y compilación:** `npm run build`.
- **A mano:** `npm run dev` y Diego pega su llave en esa ventana local (nunca en el chat). Se comprueba:
  - Inicio con sus datos, captura de tarea e idea;
  - Ideas: vincular, → Tarea, → Proyecto y borrar;
  - filtro del Calendario;
  - ventana estrecha (menú de abajo).
- **Publicación:** no hay `git push` hasta que Diego lo apruebe.

## 12. Documentación que se actualiza
- `docs/diseno.md`, sección 3: el formato de `ideas/bandeja.md` con corchetes.
- `../my-context/AGENTS.md`: cómo apuntar una idea vinculada a un proyecto.
- `AGENTS.md` de este repositorio: estructura del código y "Estado actual".
