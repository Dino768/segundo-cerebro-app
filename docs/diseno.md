# Diseño: app del segundo cerebro (versión 1)

Fecha: 2026-09-23
Estado: pendiente de revisión por Diego

## 1. Objetivo

Una app web, hecha por nosotros, para organizar tareas, eventos y proyectos desde el PC, el portátil de la uni y el móvil. La app es la parte visual. Claude (con la suscripción que ya tiene Diego) es el "cerebro". Los dos leen y modifican los mismos archivos de la carpeta `my-context`.

Restricciones:
- 0 € de coste extra. Nada de API de pago ni servidores de pago.
- Los datos son archivos de texto que Claude pueda leer y editar directamente.
- Diego es principiante: todo debe poder explicarse de forma sencilla.

## 2. Alcance de la versión 1

### Incluido
- **Vista "Hoy"**, la pantalla de inicio:
  1. Tareas atrasadas (con fecha anterior a hoy y sin hacer).
  2. Tareas de hoy (con fecha de hoy o que se repiten hoy), ordenadas por hora y después por prioridad.
  3. Las 3 tareas sin fecha más prioritarias.
  Cada tarea se puede marcar como hecha con un clic.
- **Calendario**: vista de mes y de semana. Muestra las tareas con fecha y las repetidas, con el color de su área.
- **Tareas**: crear, editar, borrar y marcar como hechas. Lista "Próximas" (con fecha) y lista "Sin fecha", ordenadas por prioridad (alta > media > baja).
- **Proyectos**: lista con filtros por estado. Cada proyecto tiene una página de notas en Markdown con editor y vista previa. Si Diego intenta tener más de 2 proyectos activos, la app muestra un aviso y le pide confirmación (no lo bloquea).
- **Multidispositivo**: diseño adaptable a móvil e instalable en el móvil como app (PWA).
- **Acceso**: un token de GitHub por dispositivo.

### No incluido (versiones siguientes, en este orden)
1. Notificaciones en el móvil (idea: tarea programada gratuita de GitHub Actions que envía el aviso).
2. Calendario de la uni automático (idea: exportar el calendario del Aula Virtual/Moodle de la URJC).
3. Pizarras para estudiar.
4. Voz, IA dentro de la app y MCP con Blender, Unreal Engine, Roblox Studio, CapCut, Procreate y Notion.
5. Editar sin conexión.

## 3. Datos

Todo vive en `my-context`, que se convierte en repositorio **privado** de GitHub.

```
my-context/
├── AGENTS.md, CLAUDE.md, contexto/, ideas/, estudios/
├── proyectos/<id>.md        # una página por proyecto
└── agenda/
    ├── tareas.yaml          # tareas y eventos
    └── areas.yaml           # áreas y colores
```

### `agenda/tareas.yaml`
Una lista de tareas. Campos:

| Campo | Obligatorio | Valores |
|---|---|---|
| `id` | sí | texto único, generado por la app o por Claude (p. ej. `t-20260923-1`) |
| `titulo` | sí | texto |
| `area` | sí | `id` de un área o de una subárea de `areas.yaml` |
| `prioridad` | no | `alta`, `media`, `baja`. Por defecto `media` |
| `fecha` | no | `AAAA-MM-DD`. Sin fecha, la tarea va a la lista "Sin fecha" |
| `hora` | no | `"HH:MM"`. Se ignora si la tarea no tiene `fecha` ni `repetir` |
| `repetir` | no | lista de días: `lun`, `mar`, `mie`, `jue`, `vie`, `sab`, `dom` |
| `proyecto` | no | `id` de un proyecto (nombre del archivo sin `.md`) |
| `notas` | no | texto |
| `hecha` | no | `true`/`false`, solo para tareas que no se repiten. Por defecto `false` |
| `hechas` | no | lista de fechas `AAAA-MM-DD` en las que se completó una tarea repetida |
| `icono` | no | nombre de un icono de Tabler, en inglés (por ejemplo `cube`); lista en https://tabler.io/icons |

Reglas:
- Una tarea con `repetir` aparece todos los días indicados. Si además tiene `fecha`, empieza ese día.
- Una tarea con `repetir` nunca aparece como atrasada ni en "Sin fecha".
- Una tarea con hora es también un evento del calendario. No hay un tipo "evento" aparte.

Ejemplo:
```yaml
- id: t-20260923-1
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
```

### `agenda/areas.yaml`
```yaml
- id: uni
  nombre: Uni
  color: "#3b82f6"
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#a855f7"
    - id: unreal
      nombre: Unreal
      color: "#a855f7"
- id: personal
  nombre: Personal
  color: "#f59e0b"
- id: salud
  nombre: Salud/Deporte
  color: "#22c55e"
```

Reglas:
- `subareas` es opcional; un área sin ella es tan válida como antes.
- Cada subárea tiene `id`, `nombre` y `color`, con las mismas reglas que un área.
- Una subárea no puede tener a su vez `subareas` (un solo nivel).
- Los `id` son únicos en todo el archivo, tanto entre áreas como entre subáreas: no puede repetirse ninguno.
- El color va siempre entre comillas (sin ellas, YAML lo confunde con un comentario).
- Una tarea, idea o proyecto puede usar en su campo `area` el id de un área grande o el de una de sus subáreas.
- La app escribe este archivo (crear, editar y borrar áreas), así que no conserva comentarios `#` que hubiera puesto Claude.

### Proyectos: `proyectos/<id>.md`
Encabezado YAML (frontmatter) seguido de notas libres en Markdown:
```markdown
---
estado: activo        # activo | parado | idea | terminado
area: videojuegos
prioridad: alta       # opcional, por defecto media
icono: cube            # opcional, nombre de un icono de Tabler en inglés
---
# Título del proyecto
Notas...
```
El título es el primer encabezado `#`. Si no hay ninguno, se usa el `id`. `area` puede ser el id de un área o de una subárea.

### Ideas: `ideas/ideas.yaml`

```yaml
- id: i-20260925-1
  fecha: 2026-09-25
  titulo: Juego de gravedad
  icono: planet
  area: unreal
  proyecto: juego-gravedad
  texto: |
    Cambias la gravedad para resolver puzles.
    - Mecánica: girar el mundo 90º
```

Campos:
- Obligatorios: `id` (`i-AAAAMMDD-n`, con la fecha de la idea y sin repetir ninguno existente), `fecha` (`AAAA-MM-DD`) y `texto` (no puede estar vacío; puede tener varias líneas, con `texto: |`).
- Opcionales: `titulo`, `icono` (nombre de un icono de Tabler en inglés), `area` (id de un área o subárea) y `proyecto` (nombre del archivo en `proyectos/` sin `.md`).
- Se valida al leer como el resto de archivos, se escribe sin campos vacíos y los comentarios `#` no se conservan.
- Las ideas se muestran de la más nueva a la más antigua (por fecha y, si coincide, la última del archivo primero).

Antes las ideas vivían en `ideas/bandeja.md` (una línea Markdown por idea). Si la app encuentra ese archivo antiguo, pasa sus ideas a `ideas.yaml` (sin duplicar nada) y borra la bandeja.

### Estudio: `estudios/asignaturas.yaml`
```yaml
asignaturas:
  - id: fisica          # minúsculas, números y guiones; «general» está reservado
    nombre: Física
    color: "#3d7bb8"    # entre comillas
```
«General» siempre existe y no va en el archivo. Quitar una asignatura no borra su carpeta ni su historial.

### Estudio: pizarras
- En curso (solo en el ordenador, git las ignora): `estudios/<asignatura>/.en-curso/<id-conversación>/pizarra-<n>.json` y sus capturas en `…/imagenes/`.
- Historial (se sincroniza): `estudios/<asignatura>/pizarras/AAAA-MM-DD-<titulo>.json` y `…/pizarras/imagenes/`.
- Formato: `{ "version": 1, "titulo", "piezas": [...], "flechas": [...], "guardarComo": null, "guardadaEn": null }`. Cada pieza lleva `id`, `tipo`, `x`, `y`, `ancho` (entre 40 y 2000), `contenido` y, opcional, `color`. Tipos: `texto` (Markdown con `$…$`), `formula` (LaTeX), `grafica` (`{x:[min,max], y:[min,max], curvas:[{expr, etiqueta?, color?}], puntos:[{x,y,etiqueta?}]}`), `dibujo` (SVG), `imagen` (`imagenes/<nombre>`) y `nota` (de Diego). Las flechas son `{id, de, a, etiqueta?}`. Detalle en `docs/superpowers/specs/2026-09-24-zona-de-estudio-design.md`, sección 6.
- Desde la v1.4, una pizarra puede tener `capas` (de abajo arriba; la de Claude, id `claude`, siempre existe), `trazos` (dibujo a mano: `id`, `herramienta` = `lapiz` | `subrayador` | `linea` | `flecha` | `rectangulo` | `elipse`, `color` `#rrggbb`, `grosor` 1-40, `puntos` `[x, y, x, y…]`, `presion` opcional, `autor: "claude"` opcional, `capa`) y un campo `capa` en las piezas. Con algo de esto se escribe como `version: 2`; si no, sigue siendo `version: 1`. Detalle en `docs/superpowers/specs/2026-09-26-dibujo-a-mano-design.md`, sección 3.
- Junto a cada pizarra en curso ya guardada en el historial está `pizarra-<n>.subida.json`: lo último que subió el PC, para juntarlo con lo que se dibuje en otro dispositivo.

## 4. Arquitectura

- **Repositorio `my-context`** (privado): los datos.
- **Repositorio `segundo-cerebro-app`** (público): el código, sin datos personales. Se aloja gratis en GitHub Pages y sirve como portfolio.
- **Tecnología**: React + TypeScript + Vite. Se convierte en PWA para instalarla en el móvil.
- **Acceso a los datos**: la app usa la API de GitHub (endpoint *contents*) para leer y escribir archivos de `my-context`. Cada cambio se guarda como un *commit*.
- **Acceso**: token *fine-grained* de GitHub con permiso de lectura y escritura solo en `my-context`. Se pega una vez por dispositivo y se guarda en el navegador. Para revocarlo, basta con borrarlo en GitHub.

### Partes de la app
- `github`: leer y escribir archivos. Es lo único que habla con GitHub.
- `datos`: convertir YAML y Markdown en objetos y al revés, y validar los campos.
- `agenda`: lógica sin pantalla, como qué tareas tocan un día, las repeticiones, las atrasadas o el orden por prioridad. Es la parte más probada.
- `pantallas`: Hoy, Calendario, Tareas, Proyectos y Ajustes (token).

### Flujo
1. Al abrir, la app descarga `tareas.yaml`, `areas.yaml` y la lista de `proyectos/`.
2. Al hacer un cambio, modifica el objeto, lo convierte a texto y lo guarda en GitHub.
3. Claude, al empezar cada sesión en `my-context`, ejecuta `git pull` para traer los cambios hechos desde la app, y al terminar sube los suyos (`git commit` + `git push`). Esto se añade como instrucción en `AGENTS.md`.

## 5. Errores

- **Sin conexión**: se muestran los últimos datos guardados en el navegador, con el aviso "sin conexión", en modo solo lectura.
- **Conflicto** (el archivo cambió en GitHub desde que se cargó): la app vuelve a descargarlo, aplica de nuevo el cambio y reintenta una vez. Si falla, avisa a Diego y no pierde el cambio de la pantalla.
- **YAML mal escrito**: la app no sobrescribe el archivo. Muestra el archivo y la línea con el error, y bloquea la edición de ese archivo hasta que se arregle.
- **Token inválido o caducado**: se vuelve a la pantalla de Ajustes para pegar uno nuevo.

## 6. Pruebas

- **Automáticas** (Vitest) sobre `datos` y `agenda`: lectura y escritura sin perder campos, repeticiones por día de la semana, atrasadas, orden por prioridad, top 3 sin fecha y aviso de más de 2 proyectos activos.
- **A mano**: Claude usa la app en el navegador (golden path y casos límite) antes de dar algo por terminado.
- **Aceptación**: Diego la usa unos días en el PC y en el móvil.

## 7. Preparación necesaria

- Cuenta de GitHub de Diego.
- Git instalado y configurado en el PC.
- Convertir `my-context` en repositorio privado y subirlo.
- Crear `agenda/tareas.yaml`, `agenda/areas.yaml` y añadir el encabezado a `proyectos/segundo-cerebro.md`.
- Añadir a `AGENTS.md` la instrucción de `git pull` al empezar y `git push` al terminar.
