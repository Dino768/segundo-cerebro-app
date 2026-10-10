# Diseño: chats de estudio compartidos (PC ↔ portátil, lectura en el móvil)

Fecha: 2026-10-10. Aprobado por Diego en conversación.

## 1. Objetivo

- Usar la zona de estudio en el portátil (por ejemplo en clase) y poder seguir en el PC un chat empezado en el portátil, y al revés.
- Leer esos chats en el móvil y en la web, sin poder escribir.
- Coste: 0 €. Sin instalar nada raro: todo va por `my-context` en GitHub.

Lo que dijo Diego:
- Solo se comparte un chat cuando él lo pide, con un botón. Así no se llena el repositorio de chats que no le hacen falta.
- Desde ese momento, el chat se va subiendo solo según escribe.
- 🗑 en un chat compartido lo borra en todos los dispositivos. «Dejar de compartir» lo deja solo en el ordenador donde está.
- En el móvil, solo leer.

Es el punto 1 de la hoja de ruta del 10 de octubre (`my-context/proyectos/segundo-cerebro.md`). Incluye dejar el portátil funcionando con `docs/portatil.md`.

## 2. Cómo es un chat hoy (comprobado en el código)

- Los mensajes los guarda Claude Code en `~/.claude/projects/<cwd con guiones>/<id>.jsonl` (y a veces en una carpeta hermana `<id>/`). `cwd` es `my-context/estudios/<asignatura>` (`local/conversaciones.ts`, `local/servidor.ts`).
- Para seguir un chat, el programa llama a `claude -p --resume <id>` (`local/claude.ts`). Claude Code busca el `.jsonl` en la carpeta de arriba, que depende de la ruta absoluta de `my-context` en ese ordenador.
- Cada mensaje de Diego empieza con un bloque `<contexto-estudio>` con rutas absolutas (asignatura, pizarra, capturas, foto). Las llamadas a herramientas de Claude también llevan rutas absolutas.
- Lo de alrededor está en `my-context/estudios/<asignatura>/.en-curso/` (no se sube):
  - `<id>/pizarra-N.json` y `<id>/pizarra-N.subida.json`: la pizarra.
  - `<id>/imagenes/`: capturas y fotos de la pizarra, de hasta 10 MB cada una.
  - `nombres.json`: los nombres que Diego pone a sus chats.
- Hoy, todos los chats juntos ocupan unos 5 MB.

## 3. Datos

### 3.1 En `my-context` (se sube): `estudios/<asignatura>/chats/<id>/`

- `chat.json`: `{ "nombre"?: string, "compartidoEl": "AAAA-MM-DD", "actualizado": ISO, "dispositivo": string }`. `dispositivo` es el nombre del ordenador que lo subió por última vez (`os.hostname()`). Sirve para el aviso de «usado a la vez».
- `conversacion.jsonl`: el `.jsonl` de Claude Code, con las rutas cambiadas (ver 3.3).
- `sesion/`: la carpeta hermana `<id>/` de Claude Code, si existe (mismo cambio de rutas en los archivos de texto).
- `pizarra-N.json` y `pizarra-N.subida.json`: las pizarras del chat.
- `imagenes/`: capturas y fotos, tal cual.

Que exista `chats/<id>/` en GitHub es lo que significa «este chat está compartido». No hace falta otra lista.

### 3.2 En cada ordenador (no se sube): `estudios/<asignatura>/.en-curso/compartidos.json`

`{ "<id>": { "version": "<sha de chat.json en GitHub tras la última subida o bajada>", "pendiente": boolean } }`

- `version` permite saber si otro dispositivo ha subido algo desde la última vez.
- `pendiente: true` indica que hay mensajes nuevos aquí que aún no se han subido (por ejemplo, si se cerró el navegador justo después de una respuesta).

### 3.3 Rutas portables

- Al subir, cada aparición de la ruta absoluta de `my-context` de este ordenador (en sus dos formas, `C:\\Users\\...` escapada en JSON y `C:/Users/...`) se cambia por `{{MY_CONTEXT}}`.
- Al bajar, `{{MY_CONTEXT}}` se cambia por la ruta de `my-context` del ordenador que lo baja.
- Así funciona aunque el portátil tenga otro usuario de Windows o `my-context` en otro sitio.

## 4. Quién hace qué

- **Programa local** (`local/`, Node): solo maneja archivos del propio ordenador. Nunca usa Git ni GitHub para los chats.
  - Preparar el paquete de un chat: leer los archivos de 3.1, cambiar rutas y devolverlos a la app.
  - Instalar un paquete bajado: escribir el `.jsonl` (y `sesion/`) en la carpeta de Claude Code y lo demás en `.en-curso/<id>/`, con escritura atómica.
  - Bifurcar un chat en una copia: un id nuevo con su `sessionId` cambiado (ver 6).
  - Leer y escribir `compartidos.json`.
  - Endpoints nuevos y `VERSION_PROGRAMA` +1.
- **App en el navegador** (`src/`): habla con GitHub con el token, como ya hace el historial de pizarras (`src/github/cliente.ts`).
  - Subir el paquete: un solo commit por subida con la API de árboles de Git (blobs, árbol y commit), para que una subida no sean decenas de commits.
  - Bajar paquetes y listar `chats/`.
  - Leer los chats en el móvil y la web.
- La lectura de un `.jsonl` (`leerConversacion` y `tituloConversacion`, hoy en `local/conversaciones.ts`) se mueve a `src/estudio/` para usarla en los dos lados. `local/` la importa con `.ts`.

## 5. Funcionamiento

### 5.1 Compartir
1. En un chat del PC o del portátil, Diego toca **«☁ Compartir»**.
2. La app pide el paquete al programa local, lo sube en un commit (`Chat compartido: <asignatura> · <nombre>`) y guarda `version` en `compartidos.json`.
3. Desde ahí el chat lleva un ☁ en la lista y el botón pasa a un menú con «Dejar de compartir».

### 5.2 Cada respuesta
- Cuando Claude termina de contestar en un chat compartido, la app marca `pendiente: true`, sube el paquete y, si sale bien, guarda la nueva `version` y `pendiente: false`.
- Si la subida falla por falta de conexión, se queda pendiente y se reintenta al abrir la lista de chats o al terminar la siguiente respuesta.
- Mientras se sube se ve un «☁ Subiendo…» discreto. Si queda pendiente se ve un «☁ Sin subir».

### 5.3 Ver los chats del otro ordenador
Al abrir la lista de chats de una asignatura, la app lista `chats/` en GitHub y, para cada chat:
- **No existe aquí:** lo baja, lo instala y aparece con ☁.
- **Existe y la `version` de GitHub es otra:**
  - Si aquí no hay nada pendiente, lo baja y reemplaza la copia local.
  - Si aquí hay algo pendiente, es un conflicto (ver 6).
- **Existe aquí como compartido pero ya no está en GitHub** (se borró o se dejó de compartir en otro dispositivo):
  - Si aquí no hay nada pendiente, se borra aquí también.
  - Si aquí hay algo pendiente, se queda como chat no compartido, para no perder nada.

### 5.4 Antes de mandar un mensaje
En un chat compartido, la app comprueba primero la `version` de GitHub. Si es otra, baja e instala el chat antes de enviar. Así Claude sigue desde lo último escrito en cualquier ordenador.

### 5.5 Dejar de compartir y borrar
- **Dejar de compartir:** borra `chats/<id>/` en GitHub (un commit) y su entrada de `compartidos.json`. El chat se queda en este ordenador como uno normal.
- **🗑 en un chat compartido:** una ventana de la app (`src/estado/dialogos.ts`) avisa: «Se borrará en todos tus dispositivos». Si Diego acepta, borra en GitHub y luego en local, igual que hoy (`borrarConversacion`).
- **✏️ Cambiar el nombre** de un chat compartido también lo cambia en `chat.json`.

### 5.6 En el móvil y la web
- En Estudio, en cada asignatura, aparece un apartado **«Chats compartidos»**: una lista con nombre y fecha.
- Al tocar uno, se lee la conversación (mensajes de Diego y de Claude, capturas e indicaciones de herramientas como hoy), sin caja para escribir.
- Las imágenes se piden a GitHub cuando hacen falta.
- La pizarra del chat no se enseña aquí: las pizarras se ven en el historial, como ahora.

## 6. Errores y casos raros

- **Usado en los dos ordenadores a la vez** (al subir, la `version` de GitHub ya no es la nuestra y aquí hay algo pendiente): no se pisa nada.
  - Lo de GitHub se baja como el chat bueno.
  - Lo de aquí se guarda como un chat nuevo, no compartido, llamado «<nombre> (copia de <dispositivo>)».
  - Una ventana lo explica.
- **Sin token o sin internet:** el botón ☁ explica qué falta. Todo lo demás de la zona de estudio funciona igual que hoy.
- **Archivos grandes:** un `.jsonl` puede pasar de 1 MB (las imágenes que Claude lee van dentro). Para bajarlo se usa la API de blobs, que admite hasta 100 MB. Si un chat supera 50 MB en total, el botón avisa y no lo sube.
- **Paquete roto o a medio bajar:** se instala en una carpeta temporal y solo se mueve al final. Si algo falla, la copia local no se toca.
- **Claude contestando mientras llega una bajada:** no se instala nada sobre un chat que está contestando. Se reintenta al terminar.

## 7. Pruebas

- Cambio de rutas: ida y vuelta con rutas de Windows, escapadas en JSON y con `/`. Una ruta que no es la de `my-context` no se toca.
- Preparar e instalar paquete, en carpetas temporales.
- Bifurcar: el id nuevo aparece en todas las líneas y en el nombre de archivo.
- La lógica de 5.3 como función pura: (local, `compartidos.json`, lista de GitHub) → acciones (bajar, reemplazar, borrar, conflicto, dejar como no compartido). Un caso por rama.
- Cliente de GitHub: subir un paquete en un commit, borrar una carpeta y leer un blob grande, con `fetch` falso.
- Pantalla: botón ☁ y sus estados, ventana de borrar, apartado «Chats compartidos» de solo lectura.
- Prueba manual con Diego: compartir un chat en el PC, seguirlo en el portátil, verlo en el iPhone, dejar de compartir y borrar.

## 8. Fuera de esta versión

- Escribir en un chat desde el móvil (necesita Claude Code; va con el punto 3 de la hoja de ruta, el asistente de voz).
- Compartir todos los chats automáticamente.
- Borrar del historial de Git lo que se dejó de compartir. Sigue en el historial del repositorio privado, pero no ocupa sitio en los dispositivos.
