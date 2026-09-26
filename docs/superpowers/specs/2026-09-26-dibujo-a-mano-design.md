# Versión 1.4: dibujo a mano en la pizarra

Fecha: 2026-09-26. Estado: aprobado por Diego en la conversación, pendiente de revisar este documento.

## 1. Qué queremos

Diego quiere dibujar a mano en la pizarra de la zona de estudio, tanto para **marcar** lo que explica Claude (rodear, subrayar, flechas) como para **resolver ejercicios** que Claude revise. Y quiere que **Claude también dibuje a mano** de vez en cuando, cuando así se explique mejor, viéndolo aparecer trazo a trazo.

Referencia: **Procreate**, que Diego usa mucho. Su pizarra perfecta es «una especie de Procreate en el que Claude y yo podamos interactuar, con esquemas». No es una copia: cuando haya que decidir algo que aquí no esté, se hace como en Procreate.

Condiciones:
- Gastar poco: nada de mandar capturas a Claude en cada mensaje ni de guardar en GitHub a cada trazo.
- Diego usa sobre todo el **ratón** en el PC, y también un **iPad con Apple Pencil**.
- Se puede dibujar en el **PC** (zona de estudio, `npm run local`) y en las **pizarras del historial** desde el móvil, el iPad y la web (sin chat).
- Fuera de esta versión: el chat de estudio en el iPad o el portátil fuera de casa (idea `i-20260926-1` en `my-context`).

Se hace en **dos partes**, que Diego prueba por separado:
1. **Tus herramientas, capas y copiar y pegar** (secciones 2 a 5).
2. **Claude dibuja y ve** (sección 6).

## 2. Herramientas (parte 1)

Barra encima de la pizarra (en el móvil, compacta y abajo):

```
[✋ Mover] [✏️ Lápiz] [🖍 Subrayador] [⬜ Formas ▾] [➰ Lazo] [🧽 Borrador ▾] [T Texto] | ● color | ─ grosor | [↶] [↷] | [📚 Capas]
```

- **Mover:** lo de ahora (arrastrar la pizarra, mover y seleccionar piezas, zoom, papelera).
- **Lápiz:** trazo libre. Con presión si el puntero la da (Apple Pencil); con ratón, grosor fijo.
- **Subrayador:** trazo libre semitransparente (opacidad 0,35), con colores. Se dibuja **por debajo** de los trazos de lápiz y formas, y por encima de las piezas.
- **Formas:** línea, flecha, rectángulo y elipse. Con Mayús: ángulos de 45°, cuadrado y círculo.
- **Lazo:** se rodea una zona de la **capa activa**. Quedan seleccionados los trazos con más de la mitad de sus puntos dentro y las piezas cuyo centro queda dentro. Se pueden arrastrar, borrar (Supr o papelera), copiar y cortar.
- **Borrador**, con dos modos que se cambian desde su desplegable:
  - **de trazos:** borra entero cada trazo que toca;
  - **goma:** borra solo lo que queda dentro del círculo de la goma; un trazo puede partirse en varios. Una forma tocada por la goma se convierte en trazo libre y se corta igual.
  - Los borradores solo afectan a los **trazos de la capa activa** (también la de Claude, si es la activa). Las piezas (textos, fórmulas, gráficas, imágenes, notas) se borran con la papelera, como ahora.
- **Texto:** un toque en un hueco abre un cuadro para escribir (son las notas de siempre, con el estilo de la app). Un toque en una nota la edita. Se mueven con Mover y se borran con la papelera o dejándolas vacías.
- **Color:** 8 colores fijos que combinan con el tema «papel cálido» y un botón «+» con el selector de color del navegador. El color elegido a mano se añade como noveno hueco.
- **Grosor:** fino, medio y grueso (2, 4 y 8 en unidades de la pizarra; el subrayador usa el triple).
- **Deshacer / Rehacer** (Ctrl+Z, Ctrl+Y y Ctrl+Mayús+Z; en pantallas táctiles, como en Procreate: **toque con dos dedos = deshacer, con tres = rehacer**). Solo lo de Diego en esta sesión: trazos, borrados (de trazos y de piezas), lazo, textos, movimientos, pegar y los cambios de capas. Nunca deshace lo de Claude. Si lo que se quiere deshacer ya no existe (lo borró Claude), ese paso se salta.
- Herramienta, color y grosor se recuerdan por dispositivo (`src/estudio/preferencias.ts`).

### Punteros
- **Ratón:** dibuja la herramienta elegida. Rueda = zoom. Barra espaciadora mantenida o botón de la rueda = mover la pizarra.
- **Lápiz (Apple Pencil):** en cuanto la app ve un puntero `pen`, el lápiz dibuja y **el dedo solo mueve y hace zoom** (con dos dedos, pinza), sea cual sea la herramienta.
- **Dedo sin lápiz:** dibuja la herramienta elegida; dos dedos mueven y hacen zoom; con Mover, un dedo mueve.

### Capas
Panel **📚 Capas** (en el PC, a la derecha de la pizarra; en el móvil y el iPad, una ventana que sale de la barra). Lista de capas, **arriba la que se ve por encima**, como en Procreate.
- **Capa de Claude** (id `claude`): existe siempre y tiene **todo lo de Claude**: sus textos, fórmulas, gráficas, dibujos, imágenes, flechas y trazos. Diego no puede dibujar ni escribir en ella, pero sí seleccionarla como activa para **borrar o mover** lo que tiene, **ocultarla**, **duplicarla** y **cambiarla de sitio** en la lista. No se puede borrar ni renombrar. Ocultarla sirve, por ejemplo, para tapar la solución de Claude e intentar el ejercicio.
- **Capas de Diego:** crear (se pone encima de la activa y pasa a ser la activa), borrar (pide confirmación: borra lo que tiene), renombrar (doble toque en el nombre), mostrar u ocultar (el ojo), duplicar y subir o bajar. Siempre hay al menos una; si se borra la última, se crea «Capa 1» vacía.
- **Duplicar** crea una capa de Diego justo encima, llamada «<nombre> (copia)», con copias de todo con ids nuevos. Duplicar la de Claude da una capa normal de Diego: sirve para trabajar encima de un dibujo de Claude sin tocar el original.
- **Capa activa:** se dibuja, se escribe y se pega en ella. El lazo y los borradores solo tocan la capa activa. Una capa oculta no puede ser la activa (al ocultarla, la activa pasa a la de debajo que se vea). Si la activa es la de Claude, las herramientas de dibujar y Texto se desactivan.
- **Mostrar u ocultar** lo recuerda cada dispositivo (por pizarra) y **no se guarda en GitHub**, para no crear guardados. Las capas nuevas empiezan visibles.
- Dentro de cada capa, el orden de dibujo es: piezas, subrayador y, encima, lápiz y formas.

### Copiar y pegar
- Con algo seleccionado (con el lazo, o una pieza con Mover): **Ctrl+C**, **Ctrl+X** y **Ctrl+V**, y los botones **Copiar**, **Cortar** y **Pegar** de la barra (para el móvil y el iPad).
- Lo pegado va a la **capa activa** con ids nuevos, desplazado 24 unidades hacia abajo a la derecha (o, si se pega en otra pizarra, en el centro de lo que se ve), y queda seleccionado para moverlo.
- El portapapeles es de la app y dura mientras esté abierta: se puede copiar en una pizarra y pegar en otra (por ejemplo, del historial a la de hoy). Una imagen copiada solo se pega en pizarras de la misma asignatura y el mismo sitio (historial o PC), porque la imagen vive en su carpeta; si no, avisa.
- Lo que se pega de Claude pasa a ser de Diego (sin `autor`, en su capa). Las flechas se copian solo si se copian las dos piezas que unen.

## 3. Formato

`pizarra-<n>.json` y los archivos del historial ganan una lista `trazos`:

```json
{
  "version": 2,
  "titulo": "Plano inclinado",
  "piezas": [ ... ],
  "flechas": [ ... ],
  "capas": [
    { "id": "claude", "nombre": "Claude" },
    { "id": "capa-1", "nombre": "Capa 1" }
  ],
  "trazos": [
    { "id": "d-kx3f9a", "herramienta": "lapiz", "color": "#b8603d", "grosor": 4,
      "puntos": [120, 80, 124.5, 83, 130, 90], "presion": [0.4, 0.55, 0.6], "capa": "capa-1" },
    { "id": "c1", "herramienta": "flecha", "color": "#3b82f6", "grosor": 4,
      "puntos": [300, 200, 420, 200], "autor": "claude", "capa": "claude" }
  ],
  "guardarComo": null,
  "guardadaEn": null
}
```

- `capas`: lista de capas **de abajo arriba** (la última se ve por encima). La de Claude tiene siempre id `claude`. Si falta la lista o alguna capa, el validador la completa: `claude` abajo del todo y, si no hay ninguna de Diego, «Capa 1» (`capa-1`) encima.
- `capa` (en trazos y piezas): id de su capa. Si falta, o apunta a una capa que no existe: lo de Claude (`autor: claude`, o piezas que no son `nota`) va a `claude`, y lo de Diego (trazos sin autor y notas), a su capa de más abajo. Así las pizarras que ya existen se abren bien. Claude no necesita escribir `capa`.
- Las flechas van con la capa de Claude (se ven si se ven la pieza de origen y la de destino).
- `herramienta`: `lapiz`, `subrayador`, `linea`, `flecha`, `rectangulo` o `elipse`.
- `puntos`: lista plana `x, y, x, y…` en coordenadas de la pizarra, con un decimal como mucho. Las formas usan dos puntos (inicio y fin; en rectángulo y elipse, dos esquinas opuestas).
- `presion` (opcional, solo lápiz): un número de 0 a 1 por punto, con dos decimales.
- `autor` (opcional): `claude` en los trazos de Claude.
- `color`: `#rrggbb`. `grosor`: de 1 a 40.
- Límites: 5000 puntos por trazo y 3000 trazos por pizarra. La app simplifica cada trazo al terminarlo (quita puntos casi alineados, tolerancia 0,5) para que ocupe poco.
- Ids: los de Diego los crea la app (`d-` más letras al azar); Claude usa los que quiera sin repetir.
- Piezas `texto` y `nota`: nuevo campo opcional `letra: "mano"` (fuente Caveat, parte 2).
- **Versiones:** una pizarra con trazos, con `letra` o con capas de Diego distintas de la «Capa 1» de por defecto se escribe como `version: 2`; sin ellos, sigue siendo `version: 1`. El validador acepta las dos. Una app antigua rechaza la 2 con su aviso de siempre en vez de perder los trazos sin darse cuenta.
- El validador (`src/estudio/pizarra.ts`) comprueba todo lo anterior. Un trazo roto se ignora con aviso (como los tipos de pieza desconocidos) en lugar de romper la pizarra.

## 4. Operaciones y guardado

Todo lo que hace Diego es una **operación** que se aplica sobre la versión más nueva del archivo, como ya pasa con `mover`, `borrar` y `nota`. Operaciones nuevas:

- `trazos`: `{ quitar: string[], poner: Trazo[] }`. Quita los ids de `quitar` y después añade o sustituye (por id) los de `poner`. Sirve para dibujar (`poner`), borrar trazos (`quitar`), la goma (quitar el original y poner los trozos) y el lazo (poner los mismos ids en su nuevo sitio).
- `piezas`: `{ quitar: string[], poner: Pieza[], flechas?: Flecha[] }`, igual que `trazos` pero para piezas (pegar, deshacer un borrado con sus flechas, mover piezas con el lazo).
- `capa`: `{ accion: "crear" | "borrar" | "renombrar" | "ordenar", id, nombre?, posicion? }`. Borrar una capa quita también lo que tiene. La capa `claude` solo admite `ordenar`.
- `lote`: `{ ops: Operacion[] }`, varias operaciones que se aplican juntas o ninguna (duplicar una capa = crear la capa y poner sus copias; deshacer el borrado de una capa = volver a crearla con todo lo que tenía).
- `nota` acepta un `id` nuevo propuesto por la app, para que deshacer sepa qué nota quitar.

**Deshacer** guarda, por cada operación, la operación contraria calculada en el momento (por ejemplo, la contraria de «poner el trazo d-1» es «quitar d-1», y la de un `lote` es el lote de las contrarias al revés). Deshacer aplica la contraria y rehacer, la original. Todo pasa por el mismo camino de guardado.

### En el PC (zona de estudio)
Cada operación va al programa local al momento (`POST pizarra/operacion`), como ahora.

### En el historial (móvil, iPad, web y también el PC)
- La pizarra del historial pasa a ser editable si hay conexión y token.
- Las operaciones se aplican en pantalla al momento y se juntan en una cola. A los **3 segundos** sin tocar nada, al salir de la pizarra o al pasar la app a segundo plano, se suben todas en **un solo guardado**: se lee el archivo, se le aplican las operaciones en orden y se escribe (`actualizarArchivo`, que reintenta si hubo conflicto). Mensaje del commit: «Pizarra: <título> (dibujo)».
- Mientras hay cola se ve «Guardando…». Sin internet: «Pendiente de subir»; la cola se guarda en el navegador y se reintenta al volver la conexión o al abrir la pizarra.

### PC e historial a la vez
Una pizarra del PC que ya está en el historial se puede haber cambiado en el iPad. Para no pisar nada:
- Cuando el PC sube una pizarra al historial, el programa local guarda una copia de lo subido (`pizarra-<n>.subida.json`, junto a la pizarra en curso). Esa copia es la **base**.
- Al volver a subir, y también al abrir esa pizarra en el PC, la app lee la versión del historial. Si no coincide con la base, hace una **fusión a tres bandas** (`src/estudio/fusion.ts`) de capas, trazos, piezas y flechas, comparando por id:
  - lo que solo cambió un lado se queda con ese cambio;
  - lo que un lado borró y el otro no tocó, se borra;
  - si los dos cambiaron lo mismo, gana el PC.
- El resultado se aplica a la pizarra en curso con una operación `fusionar` (el programa local la aplica sobre su versión más nueva) y después se sube.
- Si falta la base (por ejemplo, una pizarra guardada antes de la v1.4), la fusión junta lo de los dos lados sin borrar nada.

## 5. Piezas de la parte 1

Lógica sin pantalla, con pruebas:
- `src/estudio/capas.ts`: completar capas al validar, capa de cada trazo y pieza, orden de dibujo, duplicar, capa activa al ocultar, visibilidad por dispositivo.
- `src/estudio/portapapeles.ts`: copiar una selección y pegarla con ids nuevos y desplazada.
- `src/estudio/tinta.ts`: tipo `Trazo`, validación, redondeo y simplificación, formas a puntos, caja de un trazo, goma (cortar trazos por un círculo), lazo (punto dentro de un polígono), mover trazos.
- `src/estudio/pizarra.ts`: `trazos`, `capas`, `version` 1 o 2, `letra`, y las operaciones `trazos`, `piezas`, `capa`, `lote` y `fusionar`.
- `src/estudio/deshacer.ts`: pilas de deshacer y rehacer con operaciones contrarias.
- `src/estudio/fusion.ts`: fusión a tres bandas.
- `src/estudio/colaHistorial.ts`: juntar operaciones y subirlas tras 3 segundos, con reintento.

Pantalla:
- `src/componentes/estudio/BarraHerramientas.tsx`: herramientas, colores, grosores, deshacer, rehacer, copiar, cortar y pegar.
- `src/componentes/estudio/PanelCapas.tsx`: la lista de capas.
- `src/componentes/estudio/CapaTinta.tsx`: dibuja los trazos en SVG (el lápiz con `perfect-freehand` para el grosor variable) y el trazo que se está dibujando.
- `src/componentes/estudio/Pizarra.tsx`: los punteros según la herramienta, el lazo y la goma.
- `src/componentes/estudio/Historial.tsx`: el visor pasa a ser editable con la cola.
- `local/servidor.ts` y `local/pizarras.ts`: aceptar las operaciones nuevas y guardar la base.

Dependencia nueva: `perfect-freehand` (licencia MIT, unos 5 KB).

## 6. Claude dibuja y ve (parte 2)

### Claude dibuja
- Claude escribe trazos con `autor: "claude"` en el mismo formato. Sus instrucciones (`local/instrucciones-estudio.md`) le explican el formato y la regla: **por defecto, texto, fórmulas y gráficas**; trazos a mano solo cuando un esquema o una marca expliquen mejor (diagramas de fuerzas, rodear una parte de una fórmula, flechas entre ideas). Si el dibujo es de varios pasos, que lo escriba en varios `Edit` seguidos.
- **Animación** (`src/estudio/animacion.ts`): los trazos de Claude que llegan con la pizarra abierta y que la app no había visto se dibujan uno detrás de otro, como si se trazaran, en 3 segundos como mucho entre todos (0,6 s como mucho cada uno). Si entre todos pasan de 2000 puntos, salen de golpe. Al abrir una pizarra no se anima nada.
- **Letra a mano:** una pieza `texto` o `nota` con `letra: "mano"` usa la fuente Caveat (paquete `@fontsource/caveat`, licencia OFL, incluida en la app para funcionar sin conexión). Las fórmulas no cambian.
- Todo lo de Claude está en su capa (sección 2). Los borradores y el lazo lo tocan si su capa es la activa. Deshacer no toca lo que hizo Claude.

### Claude ve
- `src/estudio/imagenTinta.ts` (con pruebas) crea un SVG con **solo los trazos de las capas visibles** y, encima, el recuadro de cada pieza con su id («f1», «t2»…). La pantalla lo pasa a PNG de 1024 px de ancho como mucho. Así Claude sabe qué ha dibujado Diego y sobre qué pieza, con una imagen pequeña. Sus piezas ya las conoce por el JSON.
- **Automático:** si Diego ha hecho alguna operación de dibujo o de texto desde su último mensaje, la imagen se adjunta a ese mensaje (se sube como las capturas, a `imagenes/` de la conversación).
- **Botón «👁 Enseñar la pizarra»** junto al chat: manda solo la imagen, con el texto «Mira lo que he hecho en la pizarra».
- El contexto que recibe Claude (`src/estudio/contexto.ts`) le dice qué es esa imagen.
- Solo en la zona de estudio del PC (el chat está allí).

## 7. Pruebas
- Pruebas automáticas (Vitest) para todo lo de `src/estudio/` de las secciones 5 y 6 (también capas y portapapeles), el validador, las operaciones nuevas en el programa local y la cola del historial.
- Pruebas de pantalla sencillas con `renderToString`, como en el resto de la app (la barra y la capa de tinta).
- Diego prueba a mano: ratón en el PC, Apple Pencil en el iPad (historial), dedo en el iPhone, y una pizarra cambiada en el iPad y luego en el PC.

## 8. Documentación
- `docs/diseno.md`: formato de `trazos`, `version` 2 y `letra`.
- `my-context/AGENTS.md`: nada nuevo (las pizarras las escribe Claude desde la zona de estudio, con sus instrucciones).
- `AGENTS.md` de la app: estado y estructura. Al terminar la versión, «Dónde lo dejamos» en `my-context/proyectos/segundo-cerebro.md`.
