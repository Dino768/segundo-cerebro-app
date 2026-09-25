# Diseño: organización (versión 1.3)

Fecha: 2026-09-25. Aprobado por Diego en conversación, parte por parte.

## 1. Objetivo

Que Diego pueda organizar sus cosas a su manera y reconocerlas de un vistazo:
- **Áreas que él gestiona**: crear, renombrar, cambiar de color, borrar, y con **subáreas** (Videojuegos › Blender, Unreal, Roblox).
- **Iconos** (Tabler Icons) opcionales en tareas, ideas y proyectos, puestos solos a partir del título y cambiables con un buscador.
- **Ideas más completas**: título opcional, texto de varias líneas, icono, área y proyecto, y que se puedan editar.
- **Ideas dentro de Proyectos**: una pantalla con pestañas para que la barra del móvil tenga un botón menos.

Lo que dijo Diego:
- Todo lo nuevo es opcional: se puede seguir sin icono y con ideas sin título.
- Los emojis de la barra lateral se quedan como están.
- Las ideas se siguen añadiendo desde Inicio, pero con más opciones.
- En el PC, "Proyectos" es un desplegable con "Ideas" dentro.
- Los proyectos se ven ordenados por áreas. Un área (el "calendario" de Videojuegos) reúne sus subáreas.
- Las ideas y las tareas se asocian a proyectos, y los proyectos llevan el color de su área.
- La pizarra con dibujo a mano va en la versión siguiente (v1.4).

Decisiones tomadas con Diego:
- Una subárea nace con el color de su área y luego se le puede cambiar el color o el tono.
- Al borrar un área o subárea con cosas dentro, la app pregunta a dónde moverlas. No se pierde nada.
- Las áreas se gestionan desde el Calendario, Ajustes y Proyectos, siempre con la misma ventana.
- El icono se pone solo (diccionario de palabras) y se cambia con un buscador en español e inglés.
- El texto de una idea puede tener varias líneas.
- Al elegir un proyecto en una idea o tarea, el área se rellena con la del proyecto (se puede cambiar).
- Pantalla única con pestañas `Proyectos | Ideas`.
- Las ideas pasan de `ideas/bandeja.md` a `ideas/ideas.yaml`.

## 2. Alcance

### Incluido
- Formato nuevo de `areas.yaml` (subáreas) y `ideas/ideas.yaml`. Campo `icono` en tareas, ideas y proyectos.
- Paso automático de `bandeja.md` a `ideas.yaml`.
- Ventana de área (crear, editar, borrar con traslado) en Calendario, Ajustes y Proyectos.
- Selector de icono con diccionario y buscador.
- Formulario de idea (crear y editar), también desde la captura rápida de Inicio.
- Pantalla Proyectos con pestañas y agrupación por área y subárea.
- Navegación: sin botón Ideas en el móvil; desplegable en la barra lateral del PC.
- Actualizar `docs/diseno.md` y `my-context/AGENTS.md`.

### Fuera
- Pizarra con dibujo a mano (v1.4).
- Iconos para las áreas.
- Casillas para enseñar u ocultar cada subárea en el calendario.
- Reordenar áreas arrastrando.
- Más de un nivel de subáreas.

## 3. Datos

### 3.1 `agenda/areas.yaml`

```yaml
- id: videojuegos
  nombre: Videojuegos
  color: "#a855f7"
  subareas:
    - id: blender
      nombre: Blender
      color: "#a855f7"
```

- `subareas` es opcional. El archivo actual sigue siendo válido.
- Cada subárea tiene `id`, `nombre` y `color` con las mismas reglas que un área. Una subárea no puede tener `subareas` (error al leer).
- Los id son únicos en todo el archivo, entre áreas y subáreas. Un id repetido es un error al leer.
- Tipo en la app: `Area { id, nombre, color, subareas: Subarea[] }` y `Subarea { id, nombre, color }`. Funciones de ayuda: buscar un id (área o subárea), saber el área madre de una subárea y la lista de ids que cubre un área (ella más sus subáreas).
- Al escribir, `subareas` solo aparece si la lista no está vacía.
- Id de un área o subárea nueva: a partir del nombre (minúsculas, sin tildes, espacios → guiones). Si ya existe, se añade `-2`, `-3`… El id no cambia al renombrar.

### 3.2 `agenda/tareas.yaml`

- Campo nuevo opcional `icono`: nombre de un icono de Tabler (por ejemplo `cube`). Debe ser texto; si no lo es, error al leer como con el resto de campos.
- `area` sigue siendo obligatorio y puede ser el id de un área o de una subárea.
- Editar una tarea sigue aplicando solo los campos cambiados (`aplicarEdicion`), ahora también `icono`.

### 3.3 `proyectos/*.md`

- Campo nuevo opcional `icono` en el encabezado. `area` sigue siendo opcional y puede ser área o subárea.

### 3.4 `ideas/ideas.yaml` (nuevo)

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

- Obligatorios: `id` (`i-AAAAMMDD-n`, sin repetir), `fecha` (AAAA-MM-DD) y `texto` (no vacío, puede tener varias líneas).
- Opcionales: `titulo`, `icono`, `area` y `proyecto`.
- Mismas reglas que `tareas.yaml`: se valida al leer, se escribe con `yaml` sin nulos y los comentarios `#` no se conservan.
- Orden al mostrarlas: de la más nueva a la más vieja (por fecha y, a igual fecha, por posición en el archivo, la última primero).
- Las operaciones actuales siguen: añadir, editar (nuevo), vincular a un proyecto, borrar, convertir en proyecto y pasar a tarea. Ahora trabajan por `id` y no por posición o texto.

### 3.5 Paso de `bandeja.md` a `ideas.yaml`

- Al cargar: si existe `ideas/bandeja.md` y no existe `ideas/ideas.yaml`, la app convierte cada línea de idea de la bandeja (`- fecha [proyecto]: texto`) en una idea con id nuevo, la misma fecha, el mismo proyecto y el mismo texto. Las líneas que no son ideas (cabecera, huecos) se descartan.
- Primero se escribe `ideas.yaml` y después se borra `bandeja.md` (el cliente de GitHub necesita una función nueva para borrar un archivo). Si el borrado falla, la regla siguiente lo arregla en la próxima carga sin duplicar nada.
- Si existen los dos archivos (por ejemplo, porque Claude apuntó algo en la bandeja antigua después del paso), se añaden a `ideas.yaml` las ideas de la bandeja que no estén ya (misma fecha, proyecto y texto) y se borra la bandeja. Así nunca se duplica ni se pierde nada.
- Mientras no haya internet no se convierte nada; la app enseña las ideas de la caché.
- La conversión es una función pura con pruebas; `repositorio.ts` decide cuándo aplicarla.

### 3.6 Áreas desconocidas e iconos desconocidos

- Una tarea, idea o proyecto con un `area` que no existe se ve en gris con el aviso "área desconocida", como ahora. En Proyectos e Ideas va al grupo "Sin área".
- Un `icono` con un nombre que no existe en Tabler no se dibuja (hueco vacío), sin errores.

### 3.7 Borrar un área o subárea

- La ventana pide el destino: cualquier otra área o subárea (se propone el área madre cuando se borra una subárea). Si no hay nada dentro, solo pide confirmar.
- Al borrar un área, se borran también sus subáreas y todo lo de dentro va al destino. El destino no puede ser el área que se borra ni una de sus subáreas.
- "Lo de dentro": tareas con ese `area`, ideas con ese `area` y proyectos con ese `area` en el encabezado.
- Orden de escritura: primero se mueven las cosas (`tareas.yaml`, `ideas.yaml` y cada proyecto afectado) y al final se escribe `areas.yaml`. Si algo falla a mitad, el área sigue existiendo y se puede reintentar. No queda nada con un área borrada.
- Es una función pura ("qué cambia en cada archivo") con pruebas; la escritura usa el sistema actual de no pisar cambios ajenos.

### 3.8 Colores y calendario

- Cada cosa se pinta con el color de su área o subárea.
- El filtro del calendario sigue siendo por área grande (se guarda en el dispositivo como ahora). Enseñar u ocultar "Videojuegos" incluye todas sus subáreas.
- Un área nueva sale visible en el calendario.

## 4. Iconos

### 4.1 Librería

- Paquete `@tabler/icons` (licencia MIT), con los iconos de trazo (outline).
- Los iconos que salen en el diccionario (unas decenas) van dentro de la app y se ven siempre, también sin internet.
- La colección completa (unos 5.000) se carga aparte (`import()` dinámico) solo al dibujar un icono que no está en el diccionario o al abrir el buscador. El service worker la guarda para usarla sin conexión después de la primera vez.
- Sin conexión y sin la colección guardada: los iconos que no son del diccionario no se dibujan, y el buscador dice "Conéctate para ver todos los iconos" (sigue ofreciendo los del diccionario).
- Un componente `Icono` dibuja un icono por su nombre con el color del texto que lo rodea.
- La implementación medirá el tamaño de la colección. Si es demasiado grande para el móvil, se cambia la forma de cargarla (por ejemplo, por trozos) sin cambiar el formato de los datos. Se apunta como `Ruling:`.

### 4.2 Diccionario

- `src/iconos/diccionario.ts`: lista de entradas `{ icono, palabras }`, con palabras en español (y alguna en inglés) pensadas para las áreas de Diego: uni (examen, parcial, práctica, clase, física, mates, programación…), videojuegos (juego, nivel, blender, unreal, roblox, 3D, personaje…), arte (dibujo, animación…), música (piano, componer…), deporte y salud (gym, correr…) y vida diaria (compra, médico, cumple, viaje…).
- `iconoPara(titulo)`: compara las palabras del título (en minúsculas y sin tildes) con el diccionario y devuelve el primer icono que encaje, o nada.
- Buscador: filtra por nombre del icono (inglés) y por las palabras del diccionario (español). Los resultados del diccionario salen primero.

### 4.3 Comportamiento en los formularios

- Junto al título, un botón cuadrado con el icono. Si no hay icono, muestra un hueco con "+".
- Mientras Diego escribe el título, el icono se actualiza con `iconoPara`, **salvo** que lo haya elegido a mano (o quitado a mano) en ese formulario.
- Al editar algo que ya tiene icono, el icono guardado cuenta como "elegido": el título no lo cambia.
- Al tocar el botón se abre una ventana con buscador, cuadrícula y "Sin icono".
- El icono sale delante del título en listas de tareas, Inicio, calendario, tarjetas y página de proyecto, ideas y proyectos activos de la barra lateral.

## 5. Pantallas

### 5.1 Formulario de idea

- Ventana con: icono, título (opcional), texto (varias líneas, obligatorio), área o subárea (opcional) y proyecto (opcional). Al elegir un proyecto con área, el campo área se rellena con ella.
- Sirve para crear y para editar. Al editar, se puede borrar la idea desde la misma ventana (con la ventana de confirmar de la app).
- **Captura rápida de Inicio:** el campo sigue igual. Al pulsar "Añadir" se abre el formulario con el texto puesto y el icono sugerido. Guardar sin tocar nada guarda la idea tal cual.
- Cada idea se muestra con icono, título en negrita (o el principio del texto si no tiene título), la etiqueta del área, la fecha y el proyecto. Al tocarla se abre para editar.

### 5.2 Pantalla Proyectos con pestañas

- Pestañas `Proyectos | Ideas` arriba. La pantalla `ideas` pasa a ser la pestaña Ideas de `proyectos`: navegar a `{ pantalla: 'ideas' }` (por ejemplo, "Ver en Ideas →") abre Proyectos con la pestaña Ideas.
- **Pestaña Proyectos:** un grupo por área, en el orden de `areas.yaml`. Dentro, primero los proyectos del área a secas y luego un subgrupo por subárea. Al final, "Sin área". Dentro de cada grupo, el orden actual (`ordenarProyectos`). El aviso de más de 2 proyectos activos se mantiene. Botón "+ Área".
- **Pestaña Ideas:** agrupadas igual. Dentro de cada grupo, de la más nueva a la más vieja. Botón "+ Idea".
- No se muestran grupos vacíos.
- La agrupación es una función pura de `src/agenda/` con pruebas, que sirve para proyectos y para ideas.

### 5.3 Navegación

- **Móvil:** la barra de abajo pierde "Ideas" (6 botones).
- **PC:** "📁 Proyectos" tiene una flecha ▸/▾. Desplegado muestra "💡 Ideas" con su número y, debajo, los proyectos activos (con icono si lo tienen). El estado del desplegable se guarda en el dispositivo (empieza desplegado). Tocar "Proyectos" abre la pantalla; la flecha solo despliega o pliega.

### 5.4 Ventana de área

- Campos: nombre y color (paleta de colores del tema más un selector libre).
- Si es un área grande: lista de sus subáreas (con su color) y "+ Subárea". Cada subárea se edita con la misma ventana, sin lista de subáreas.
- Botón "Borrar" con el flujo de 3.7.
- Dónde se abre:
  - **Calendario:** en la lista de calendarios, un lápiz ✏️ en cada área y "+ Nueva área" al final.
  - **Ajustes:** sección "Áreas" con el árbol de áreas y subáreas, cada una con su lápiz, y "+ Nueva área".
  - **Proyectos:** botón "+ Área" y lápiz en la cabecera de cada grupo.

### 5.5 Etiqueta de área

- Si algo está en una subárea, la etiqueta muestra solo la subárea ("Blender") con su color.
- Los selectores de área (formularios de tarea, idea y proyecto) muestran las subáreas sangradas bajo su área.

## 6. Claude y documentación

- `docs/diseno.md`, sección 3: formatos nuevos (`areas.yaml` con subáreas, `ideas/ideas.yaml`, campo `icono`).
- `my-context/AGENTS.md`: ideas en `ideas/ideas.yaml` (id `i-AAAAMMDD-n`, sin comentarios `#`), subáreas en `areas.yaml`, y que Claude elija un icono de Tabler relacionado al crear tareas, ideas o proyectos. Si Claude encuentra la bandeja antigua, hace él mismo el paso de 3.5.
- `AGENTS.md` de este repositorio: estructura del código y estado actual.

## 7. Pruebas

Primero la prueba (que falle) y luego el código, como siempre. Como mínimo:
- `areas.yaml`: leer y escribir con subáreas; errores de id repetido, color mal escrito y subárea con subáreas; archivo antiguo sin cambios.
- `ideas.yaml`: leer, validar y escribir; varias líneas; campos opcionales.
- Paso desde la bandeja: nada se pierde, se conservan fecha y proyecto, los dos archivos a la vez no duplican y repetirlo no cambia nada.
- Borrar área: mueve tareas, ideas y proyectos (también los de sus subáreas) y rechaza destinos no válidos.
- Id nuevo de área a partir del nombre, sin repetir.
- Diccionario (`iconoPara`) y buscador en español e inglés.
- Agrupar proyectos e ideas por área y subárea, con "Sin área".
- Pantallas: formulario de idea (crear, editar, captura de Inicio), selector de icono (se pone solo, elegir a mano lo fija) y pestañas Proyectos/Ideas.
- Las 255 pruebas actuales siguen en verde.

## 8. Casos raros

- Sin internet: todo como ahora (caché). Los iconos del diccionario se ven; el resto, si la colección está guardada.
- Dos dispositivos cambian el mismo archivo: el sistema actual de no pisar cambios ajenos.
- Id de área desconocido o icono desconocido: se ve en gris o sin icono, sin romper nada.
