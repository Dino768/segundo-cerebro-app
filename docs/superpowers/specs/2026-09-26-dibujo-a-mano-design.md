# Versión 1.4: dibujo a mano en la pizarra

Fecha: 2026-09-26. Estado: aprobado por Diego en la conversación, pendiente de revisar este documento.

## 1. Qué queremos

Diego quiere dibujar a mano en la pizarra de la zona de estudio, tanto para **marcar** lo que explica Claude (rodear, subrayar, flechas) como para **resolver ejercicios** que Claude revise. Y quiere que **Claude también dibuje a mano** de vez en cuando, cuando así se explique mejor, viéndolo aparecer trazo a trazo.

Condiciones:
- Gastar poco: nada de mandar capturas a Claude en cada mensaje ni de guardar en GitHub a cada trazo.
- Diego usa sobre todo el **ratón** en el PC, y también un **iPad con Apple Pencil**.
- Se puede dibujar en el **PC** (zona de estudio, `npm run local`) y en las **pizarras del historial** desde el móvil, el iPad y la web (sin chat).
- Fuera de esta versión: el chat de estudio en el iPad o el portátil fuera de casa (idea `i-20260926-1` en `my-context`).

Se hace en **dos partes**, que Diego prueba por separado:
1. **Tus herramientas** (secciones 2 a 5).
2. **Claude dibuja y ve** (sección 6).

## 2. Herramientas (parte 1)

Barra encima de la pizarra (en el móvil, compacta y abajo):

```
[✋ Mover] [✏️ Lápiz] [🖍 Subrayador] [⬜ Formas ▾] [➰ Lazo] [🧽 Borrador ▾] [T Texto] | ● color | ─ grosor | [↶] [↷]
```

- **Mover:** lo de ahora (arrastrar la pizarra, mover y seleccionar piezas, zoom, papelera).
- **Lápiz:** trazo libre. Con presión si el puntero la da (Apple Pencil); con ratón, grosor fijo.
- **Subrayador:** trazo libre semitransparente (opacidad 0,35), con colores. Se dibuja **por debajo** de los trazos de lápiz y formas, y por encima de las piezas.
- **Formas:** línea, flecha, rectángulo y elipse. Con Mayús: ángulos de 45°, cuadrado y círculo.
- **Lazo:** se rodea una zona. Quedan seleccionados los trazos con más de la mitad de sus puntos dentro. Se pueden arrastrar o borrar (Supr o papelera).
- **Borrador**, con dos modos que se cambian desde su desplegable:
  - **de trazos:** borra entero cada trazo que toca;
  - **goma:** borra solo lo que queda dentro del círculo de la goma; un trazo puede partirse en varios. Una forma tocada por la goma se convierte en trazo libre y se corta igual.
  - Los borradores solo afectan a los **trazos** (de Diego o de Claude). Las piezas (textos, fórmulas, gráficas, imágenes, notas) se borran con la papelera, como ahora.
- **Texto:** un toque en un hueco abre un cuadro para escribir (son las notas de siempre, con el estilo de la app). Un toque en una nota la edita. Se mueven con Mover y se borran con la papelera o dejándolas vacías.
- **Color:** 8 colores fijos que combinan con el tema «papel cálido» y un botón «+» con el selector de color del navegador. El color elegido a mano se añade como noveno hueco.
- **Grosor:** fino, medio y grueso (2, 4 y 8 en unidades de la pizarra; el subrayador usa el triple).
- **Deshacer / Rehacer** (Ctrl+Z, Ctrl+Y y Ctrl+Mayús+Z). Solo lo de Diego en esta sesión: trazos, borrados (de trazos y de piezas), lazo, textos y movimientos. Nunca deshace lo de Claude. Si lo que se quiere deshacer ya no existe (lo borró Claude), ese paso se salta.
- Herramienta, color y grosor se recuerdan por dispositivo (`src/estudio/preferencias.ts`).

### Punteros
- **Ratón:** dibuja la herramienta elegida. Rueda = zoom. Barra espaciadora mantenida o botón de la rueda = mover la pizarra.
- **Lápiz (Apple Pencil):** en cuanto la app ve un puntero `pen`, el lápiz dibuja y **el dedo solo mueve y hace zoom** (con dos dedos, pinza), sea cual sea la herramienta.
- **Dedo sin lápiz:** dibuja la herramienta elegida; dos dedos mueven y hacen zoom; con Mover, un dedo mueve.

## 3. Formato

`pizarra-<n>.json` y los archivos del historial ganan una lista `trazos`:

```json
{
  "version": 2,
  "titulo": "Plano inclinado",
  "piezas": [ ... ],
  "flechas": [ ... ],
  "trazos": [
    { "id": "d-kx3f9a", "herramienta": "lapiz", "color": "#b8603d", "grosor": 4,
      "puntos": [120, 80, 124.5, 83, 130, 90], "presion": [0.4, 0.55, 0.6] },
    { "id": "c1", "herramienta": "flecha", "color": "#3b82f6", "grosor": 4,
      "puntos": [300, 200, 420, 200], "autor": "claude" }
  ],
  "guardarComo": null,
  "guardadaEn": null
}
```

- `herramienta`: `lapiz`, `subrayador`, `linea`, `flecha`, `rectangulo` o `elipse`.
- `puntos`: lista plana `x, y, x, y…` en coordenadas de la pizarra, con un decimal como mucho. Las formas usan dos puntos (inicio y fin; en rectángulo y elipse, dos esquinas opuestas).
- `presion` (opcional, solo lápiz): un número de 0 a 1 por punto, con dos decimales.
- `autor` (opcional): `claude` en los trazos de Claude.
- `color`: `#rrggbb`. `grosor`: de 1 a 40.
- Límites: 5000 puntos por trazo y 3000 trazos por pizarra. La app simplifica cada trazo al terminarlo (quita puntos casi alineados, tolerancia 0,5) para que ocupe poco.
- Ids: los de Diego los crea la app (`d-` más letras al azar); Claude usa los que quiera sin repetir.
- Piezas `texto` y `nota`: nuevo campo opcional `letra: "mano"` (fuente Caveat, parte 2).
- **Versiones:** una pizarra con trazos o con `letra` se escribe como `version: 2`; sin ellos, sigue siendo `version: 1`. El validador acepta las dos. Una app antigua rechaza la 2 con su aviso de siempre en vez de perder los trazos sin darse cuenta.
- El validador (`src/estudio/pizarra.ts`) comprueba todo lo anterior. Un trazo roto se ignora con aviso (como los tipos de pieza desconocidos) en lugar de romper la pizarra.

## 4. Operaciones y guardado

Todo lo que hace Diego es una **operación** que se aplica sobre la versión más nueva del archivo, como ya pasa con `mover`, `borrar` y `nota`. Operaciones nuevas:

- `trazos`: `{ quitar: string[], poner: Trazo[] }`. Quita los ids de `quitar` y después añade o sustituye (por id) los de `poner`. Sirve para dibujar (`poner`), borrar trazos (`quitar`), la goma (quitar el original y poner los trozos) y el lazo (poner los mismos ids en su nuevo sitio).
- `restaurar`: `{ pieza, flechas }`. Vuelve a poner una pieza borrada con sus flechas (para deshacer un borrado).
- `nota` acepta un `id` nuevo propuesto por la app, para que deshacer sepa qué nota quitar.

**Deshacer** guarda, por cada operación, la operación contraria calculada en el momento (por ejemplo, la contraria de «poner el trazo d-1» es «quitar d-1»). Deshacer aplica la contraria y rehacer, la original. Todo pasa por el mismo camino de guardado.

### En el PC (zona de estudio)
Cada operación va al programa local al momento (`POST pizarra/operacion`), como ahora.

### En el historial (móvil, iPad, web y también el PC)
- La pizarra del historial pasa a ser editable si hay conexión y token.
- Las operaciones se aplican en pantalla al momento y se juntan en una cola. A los **3 segundos** sin tocar nada, al salir de la pizarra o al pasar la app a segundo plano, se suben todas en **un solo guardado**: se lee el archivo, se le aplican las operaciones en orden y se escribe (`actualizarArchivo`, que reintenta si hubo conflicto). Mensaje del commit: «Pizarra: <título> (dibujo)».
- Mientras hay cola se ve «Guardando…». Sin internet: «Pendiente de subir»; la cola se guarda en el navegador y se reintenta al volver la conexión o al abrir la pizarra.

### PC e historial a la vez
Una pizarra del PC que ya está en el historial se puede haber cambiado en el iPad. Para no pisar nada:
- Cuando el PC sube una pizarra al historial, el programa local guarda una copia de lo subido (`pizarra-<n>.subida.json`, junto a la pizarra en curso). Esa copia es la **base**.
- Al volver a subir, y también al abrir esa pizarra en el PC, la app lee la versión del historial. Si no coincide con la base, hace una **fusión a tres bandas** (`src/estudio/fusion.ts`) de trazos, piezas y flechas, comparando por id:
  - lo que solo cambió un lado se queda con ese cambio;
  - lo que un lado borró y el otro no tocó, se borra;
  - si los dos cambiaron lo mismo, gana el PC.
- El resultado se aplica a la pizarra en curso con una operación `fusionar` (el programa local la aplica sobre su versión más nueva) y después se sube.
- Si falta la base (por ejemplo, una pizarra guardada antes de la v1.4), la fusión junta lo de los dos lados sin borrar nada.

## 5. Piezas de la parte 1

Lógica sin pantalla, con pruebas:
- `src/estudio/tinta.ts`: tipo `Trazo`, validación, redondeo y simplificación, formas a puntos, caja de un trazo, goma (cortar trazos por un círculo), lazo (punto dentro de un polígono), mover trazos.
- `src/estudio/pizarra.ts`: `trazos`, `version` 1 o 2, `letra`, y las operaciones `trazos`, `restaurar` y `fusionar`.
- `src/estudio/deshacer.ts`: pilas de deshacer y rehacer con operaciones contrarias.
- `src/estudio/fusion.ts`: fusión a tres bandas.
- `src/estudio/colaHistorial.ts`: juntar operaciones y subirlas tras 3 segundos, con reintento.

Pantalla:
- `src/componentes/estudio/BarraHerramientas.tsx`: herramientas, colores, grosores, deshacer y rehacer.
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
- Los borradores y el lazo sirven también para los trazos de Claude. Deshacer no los toca.

### Claude ve
- `src/estudio/imagenTinta.ts` (con pruebas) crea un SVG con **solo los trazos** y, encima, el recuadro de cada pieza con su id («f1», «t2»…). La pantalla lo pasa a PNG de 1024 px de ancho como mucho. Así Claude sabe qué ha dibujado Diego y sobre qué pieza, con una imagen pequeña. Sus piezas ya las conoce por el JSON.
- **Automático:** si Diego ha hecho alguna operación de dibujo o de texto desde su último mensaje, la imagen se adjunta a ese mensaje (se sube como las capturas, a `imagenes/` de la conversación).
- **Botón «👁 Enseñar la pizarra»** junto al chat: manda solo la imagen, con el texto «Mira lo que he hecho en la pizarra».
- El contexto que recibe Claude (`src/estudio/contexto.ts`) le dice qué es esa imagen.
- Solo en la zona de estudio del PC (el chat está allí).

## 7. Pruebas
- Pruebas automáticas (Vitest) para todo lo de `src/estudio/` de las secciones 5 y 6, el validador, las operaciones nuevas en el programa local y la cola del historial.
- Pruebas de pantalla sencillas con `renderToString`, como en el resto de la app (la barra y la capa de tinta).
- Diego prueba a mano: ratón en el PC, Apple Pencil en el iPad (historial), dedo en el iPhone, y una pizarra cambiada en el iPad y luego en el PC.

## 8. Documentación
- `docs/diseno.md`: formato de `trazos`, `version` 2 y `letra`.
- `my-context/AGENTS.md`: nada nuevo (las pizarras las escribe Claude desde la zona de estudio, con sus instrucciones).
- `AGENTS.md` de la app: estado y estructura. Al terminar la versión, «Dónde lo dejamos» en `my-context/proyectos/segundo-cerebro.md`.
