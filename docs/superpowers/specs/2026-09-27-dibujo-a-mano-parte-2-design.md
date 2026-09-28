# Versión 1.4, parte 2: Claude ve, Claude escribe a mano, cuadros de texto y pantalla completa

Fecha: 2026-09-27. Estado: aprobado por Diego en la conversación, pendiente de revisar este documento.

Sustituye a la sección 6 de `2026-09-26-dibujo-a-mano-design.md` (la parte 1 de ese documento ya está publicada). Lo que no se diga aquí sigue como en ese documento; si hay que decidir algo de la pizarra que no esté escrito, se hace como en Procreate.

## 1. Qué queremos

Diego ha estudiado cálculo con la pizarra de la parte 1 y le ha gustado. Ahora quiere:
- que **Claude vea** lo que Diego dibuja y escribe a mano (un ejercicio, un término rodeado, una pregunta) y lo entienda;
- que **Claude dibuje y escriba a mano**, con trazos de verdad que aparecen con animación;
- **cuadros de texto mejores**: borrarlos fácilmente, sin fondo o con fondo del color que quiera, color y tamaño de la letra, y cambiar su ancho y alto;
- un botón de **pantalla completa** para tomar notas con toda la pantalla (PC, móvil, iPad).

Condiciones de siempre: gastar poco (la imagen para Claude solo cuando hay algo nuevo), funcionar sin conexión en el historial, y no romper las pizarras que ya existen.

Se hace en **dos entregas**, que Diego prueba por separado:
1. **Cuadros de texto, pantalla completa y Claude ve** (secciones 2, 3 y 4).
2. **Claude dibuja y escribe a mano con animación** (sección 5).

## 2. Cuadros de texto (entrega 1)

### Cómo se ven
Los cuadros de texto de Diego (piezas `nota`) ganan estos campos opcionales:
- `fondo`: `"ninguno"` o `#rrggbb`. Si falta, amarillo como hasta ahora (`#fff4c2` con borde `#ecd98a`), para que las notas que ya existen no cambien.
- `colorTexto`: `#rrggbb`. Si falta, el color de texto normal de la app.
- `tamanoLetra`: `"pequena"`, `"normal"`, `"grande"` o `"enorme"` (13, 15, 22 y 32 px; `normal` es el tamaño de ahora). Si falta, `normal`.
- `alto`: alto mínimo del cuadro, de 30 a 4000. Si falta, el alto que pida el texto. Si el texto necesita más, el cuadro crece (nunca se corta el texto).
- `ancho` ya existía (40 a 2000); ahora se puede cambiar.

Los colores de fondo son los 8 de la paleta en versión suave (mezclados con el blanco del papel para que se lea bien), más «+» con el selector de color del navegador. Los de la letra, los 8 de la paleta tal cual, más «+».

Sin fondo, el cuadro no tiene borde ni sombra; solo enseña un borde de puntos cuando está seleccionado o mientras se edita.

Los cuadros nuevos usan el último fondo, color y tamaño que eligió Diego (se recuerdan por dispositivo en `src/estudio/preferencias.ts`). El primero: sin fondo, color normal, letra normal.

### La barrita
Al seleccionar un cuadro de Diego (con Mover, con el lazo si es lo único seleccionado, o al terminar de escribirlo con Texto) aparece encima una barrita flotante:

```
[🗑] [Fondo ▾] [Letra ●▾] [A−] [A+]
```

- **🗑** borra el cuadro.
- **Fondo** abre los colores de fondo con «Sin fondo» el primero.
- **Letra** abre los colores de la letra.
- **A− / A+** bajan o suben un paso el tamaño.
- Un **tirador** en la esquina de abajo a la derecha cambia ancho y alto a la vez (arrastrando). Con Mayús, solo el ancho.
- Tocar dos veces el cuadro (o tocarlo con la herramienta Texto) sigue editando lo escrito, como ahora.

En el móvil la barrita es igual, con botones del tamaño de un dedo. Si no cabe encima (cuadro pegado arriba), sale debajo.

**Piezas de Claude** (textos, fórmulas, gráficas, imágenes, dibujos): al seleccionarlas sale la barrita solo con 🗑 (lo mismo que ya permite el botón «🗑 Borrar» de abajo). No se les cambia el estilo.

Todo lo de la barrita se puede deshacer y rehacer.

### Operación nueva
`estilo`: `{ tipo: "estilo", id, fondo?, colorTexto?, tamanoLetra?, ancho?, alto? }`. Cambia solo los campos que trae; `null` en `fondo`, `colorTexto`, `tamanoLetra` o `alto` quita el campo (vuelve al valor por defecto). Solo vale para piezas `nota`, salvo `ancho`, que vale para cualquier pieza (de momento la app solo lo usa en notas). Su contraria (para deshacer) son los valores que había antes. Va por el mismo camino que las demás: al momento al programa local en el PC, y a la cola de 3 segundos en el historial.

Una pizarra con alguno de estos campos se escribe como `version: 2`.

## 3. Pantalla completa (entrega 1)

Botón **⛶** en la barra de herramientas, en la zona de estudio y en las pizarras del historial.

- La pizarra ocupa toda la ventana: se ocultan la barra lateral, el menú de abajo del móvil, las pestañas de asignaturas y pizarras, y el chat. Quedan la pizarra, su barra de herramientas y el panel de capas.
- Además, si el navegador lo permite (`requestFullscreen`: PC e iPad), se ocultan las barras del navegador. En el iPhone no lo permite: la pizarra tapa toda la app, y si la app está instalada en la pantalla de inicio ya no hay barras del navegador.
- En la zona de estudio del PC, un botón flotante **💬** abre el chat como panel a la derecha, encima de la pizarra, y lo vuelve a cerrar.
- Se sale con el mismo botón o con **Esc** (y, si el navegador sale solo de su pantalla completa, la app también sale de la suya).
- No se recuerda: al abrir la app se empieza sin pantalla completa.

## 4. Claude ve (entrega 1)

Solo en la zona de estudio del PC (el chat está allí).

### La foto de la pizarra
`src/estudio/foto.ts` saca una imagen PNG de **lo que Diego ve en la pizarra en ese momento**: la parte visible, con su zoom, con las piezas (textos, fórmulas, gráficas, imágenes), las flechas y los trazos de las capas visibles, y el fondo de papel. Encima, en una esquina de cada pieza, una etiqueta pequeña con su id («f1», «t2», «nota-3») para que Claude sepa de qué pieza se habla. Las etiquetas solo salen en la foto, no en la pantalla.

- Se hace con la librería **`html-to-image`** (licencia MIT): copia el trozo de página, mete dentro las fuentes (KaTeX) y las imágenes, y lo dibuja en un lienzo. Funciona sin internet.
- Tamaño: 1280 px de ancho como mucho (se reduce si la pantalla es más grande), en PNG.
- Si la foto falla (por ejemplo, una imagen que no carga), el mensaje se manda sin foto y encima de la pizarra sale el aviso «No he podido mandar la foto de la pizarra».

### Cuándo se manda
- **Automático:** si Diego ha hecho alguna operación en la pizarra abierta desde su último mensaje (trazos, borrados, textos, estilos, mover, capas, pegar, deshacer), la foto se adjunta a ese mensaje. Se sube como las capturas (`subirImagen`, a `imagenes/` de la conversación, con el mismo tipo de nombre).
- **Botón «👁 Enseñar la pizarra»** junto al botón de adjuntar del chat: manda solo la foto, con el texto «Mira lo que he hecho en la pizarra».
- Sin pizarra abierta, no hay foto y el botón está desactivado.
- En la conversación, la foto se ve como una captura más (miniatura en el mensaje de Diego).

### Qué le decimos a Claude
- La cabecera de cada mensaje (`src/estudio/contexto.ts`) gana una línea `Foto de la pizarra: <ruta>` cuando va la foto, separada de las capturas, para que Claude sepa cuál es cuál. `sinContexto` la trata como una imagen más al enseñar la conversación.
- `local/instrucciones-estudio.md` explica qué es la foto: lo que Diego ve ahora; sus trazos son lo que él ha hecho (un ejercicio para revisar, una marca, una pregunta sobre algo rodeado); las etiquetas son los ids de las piezas del JSON. Que la mire antes de contestar y que no la describa si no hace falta.

## 5. Claude dibuja y escribe a mano (entrega 2)

### Dibujos
Claude escribe trazos en el formato de la parte 1 (`lapiz`, `linea`, `flecha`, `rectangulo`, `elipse`) con `autor: "claude"`; van a su capa. Sus instrucciones le dicen:
- por defecto, textos, fórmulas y gráficas;
- a mano, cuando se explica mejor: diagramas y esquemas, rodear o subrayar una parte, flechas entre ideas, y corregir encima del ejercicio de Diego (en la foto ve dónde está cada cosa; las coordenadas de la foto se corresponden con las de la pizarra gracias a la cabecera, ver abajo);
- si el dibujo tiene varios pasos, escribirlos en varios `Edit` seguidos, para que se vean aparecer por orden.

Para que Claude sepa dónde dibujar encima de lo que ve, la cabecera del mensaje con foto incluye también **qué parte de la pizarra sale en la foto**: `Zona de la foto: x <x1>–<x2>, y <y1>–<y2> (coordenadas de la pizarra)`.

### Letra a mano
Un trazo nuevo con `herramienta: "letra"`:

```json
{ "id": "c7", "herramienta": "letra", "texto": "dy/dx = 2x", "x": 300, "y": 180,
  "tamano": 28, "color": "#b8603d", "autor": "claude" }
```

- `texto`: una línea, de 1 a 200 caracteres. `x`, `y`: donde empieza la línea base del texto (abajo a la izquierda de la primera letra). `tamano`: alto de las mayúsculas, de 8 a 200. `color` y `grosor` (opcional, por defecto 3) como en los demás trazos. No lleva `puntos`.
- La app lo convierte en trazos con una **letra de un solo trazo** manuscrita (`src/estudio/letraMano.ts`). Cada letra lleva un pequeño temblor, siempre el mismo para el mismo id (para que no cambie al volver a abrir la pizarra).
- Letras: la A a la Z en mayúsculas y minúsculas, á é í ó ú ü ñ (y sus mayúsculas), ¿ ¡, números, espacio y . , ; : ' " ( ) [ ] + − - = × · ÷ / ^ _ < > ² ³ ± %. Además, dibujados para esta app: ∫ √ π ∞ ≤ ≥ ≠ → Δ θ α β λ ∑. Un carácter que no está se dibuja como «?» y el validador avisa.
- La letra sale de una fuente de un solo trazo con licencia libre (se elige en el primer paso del plan; candidata: **EMS Allure**, licencia OFL, del paquete `hersheytext`). Un script (como `scripts/iconos.ts`) la convierte una vez a un archivo de la app (`src/estudio/letraMano.datos.ts`), sin descargar nada al compilar. Si la fuente no tiene tildes o ñ, se componen con la letra base más el acento.
- Para las fórmulas complicadas (fracciones grandes, matrices, integrales con límites) Claude sigue usando piezas `formula`.
- Se comporta como una forma de la parte 1: el lazo la selecciona como los demás trazos, por sus puntos (más de la mitad de los puntos de sus letras dentro del lazo), y la mueve (cambian `x` e `y`), el borrador de trazos la quita entera y la **goma la convierte en trazos `lapiz` normales** y los corta. Copiar y pegar la copia tal cual.
- En el formato, `puntos` pasa a ser obligatorio en todas las herramientas menos `letra`. La foto de Claude la enseña ya convertida.

### Animación
`src/estudio/animacion.ts` (sin pantalla, con pruebas) decide qué se anima y cuándo; la capa de tinta lo dibuja.
- Se animan los trazos de Claude que llegan con la pizarra abierta y que la app no había visto. Al abrir una pizarra, o al cambiar de pizarra, todo sale dibujado sin animar.
- Cada trazo se dibuja desde su primer punto hasta el último, como si lo hiciera un lápiz; las formas, como un trazo de 0,4 s; el lápiz, a su ritmo, 0,6 s como mucho.
- La letra, letra a letra, a unas 12 letras por segundo (cada letra, trazo a trazo).
- Lo que llega junto se dibuja uno detrás de otro, en el orden del archivo. Si en total pasa de **8 segundos**, todo se acelera para caber en 8.
- Si llega algo nuevo mientras se anima lo anterior, se pone a la cola.
- Si Diego toca la pizarra durante la animación, no pasa nada: la animación sigue y él puede dibujar a la vez.
- Las piezas de Claude (textos, fórmulas…) aparecen como ahora, sin animación.
- Con la opción del sistema «reducir movimiento» activada, no se anima.

### Qué deja de hacerse
La idea antigua de `letra: "mano"` en piezas `texto` y `nota` (fuente Caveat) no se hace. El validador la sigue aceptando para no romper nada, pero la app no cambia de letra y las instrucciones de Claude no la mencionan.

## 6. Piezas

### Entrega 1
Lógica sin pantalla, con pruebas:
- `src/estudio/pizarra.ts`: campos `fondo`, `colorTexto`, `tamanoLetra` y `alto`, operación `estilo`, versión 2.
- `src/estudio/deshacer.ts`: contraria de `estilo`.
- `src/estudio/estiloNota.ts`: colores suaves de fondo, tamaños y el paso de A−/A+, estilo CSS de una nota.
- `src/estudio/contexto.ts`: líneas `Foto de la pizarra` y `Zona de la foto`.
- `src/estudio/foto.ts`: la zona visible en coordenadas de la pizarra, el tamaño final y el nombre del archivo (la parte que usa `html-to-image` queda en una función pequeña aparte).
- `src/estudio/preferencias.ts`: último estilo de nota.
- `local/pizarras.ts` y `local/servidor.ts`: aceptar `estilo`.

Pantalla:
- `src/componentes/estudio/BarritaPieza.tsx`: la barrita flotante y el tirador.
- `src/componentes/estudio/PiezaPizarra.tsx`: estilo de las notas.
- `src/componentes/estudio/Pizarra.tsx`: selección con barrita, tirador, pantalla completa.
- `src/componentes/estudio/BarraHerramientas.tsx`: botón ⛶.
- `src/componentes/estudio/Chat.tsx` y `EstudioLocal.tsx`: botón «👁 Enseñar la pizarra», foto automática, chat flotante en pantalla completa.
- `local/instrucciones-estudio.md`: la foto y los cuadros con estilo (Claude también puede escribir notas con fondo, pero sus textos siguen siendo piezas `texto`).

Dependencia nueva: `html-to-image` (MIT).

### Entrega 2
Lógica sin pantalla, con pruebas:
- `src/estudio/letraMano.ts` y `letraMano.datos.ts` (generado): texto → trazos, temblor fijo por id, caja.
- `scripts/letraMano.ts`: convierte la fuente al archivo de datos.
- `src/estudio/tinta.ts`: herramienta `letra` (validar, caja, mover, lazo, goma → `lapiz`).
- `src/estudio/animacion.ts`: qué es nuevo, orden, duraciones y aceleración.
- `src/estudio/contexto.ts`: nada nuevo (la zona de la foto ya está en la entrega 1).

Pantalla:
- `src/componentes/estudio/CapaTinta.tsx`: dibujar la letra y la animación.
- `local/instrucciones-estudio.md`: cómo y cuándo dibujar, la letra a mano y un ejemplo.

## 7. Pruebas
- Vitest para todo lo de `src/estudio/` de la sección 6, el validador (campos nuevos y `letra`), la operación `estilo` en el programa local, y deshacer.
- Pruebas de pantalla sencillas con `renderToString`: la barrita, una nota sin fondo y con fondo, el botón ⛶ y el botón «👁».
- Diego prueba a mano. Entrega 1: estilos y tirador con ratón, dedo y Apple Pencil; pantalla completa en el PC, el iPhone y el iPad; preguntar a Claude por algo que ha dibujado o rodeado. Entrega 2: pedirle a Claude que corrija un ejercicio encima y que escriba a mano.

## 8. Documentación
- `docs/diseno.md`: campos nuevos de las notas, operación `estilo` y herramienta `letra`.
- `AGENTS.md` de la app: estado y estructura.
- Al terminar cada entrega, «Dónde lo dejamos» en `my-context/proyectos/segundo-cerebro.md`.
