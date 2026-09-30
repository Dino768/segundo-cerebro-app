# Diseño: tareas ordenadas (versión 1.5)

Fecha: 2026-09-30. Aprobado por Diego en conversación, parte por parte.

## 1. Objetivo

Que la lista de tareas vuelva a ser tranquila y ordenada ahora que la uni mete sola exámenes y entregas. Para eso:
- **Tipos de tarea:** tarea, entrega, examen, recado y evento.
- Los exámenes y entregas **solo llegan a las listas principales cuando se acercan**, con una prioridad que sube sola.
- **Repeticiones con final** y repeticiones mensuales y anuales.
- Pantalla de Tareas con dos tarjetas: **Ahora** (lo urgente) y **Por áreas** (todo, en desplegables).

Por qué: tras la parte A (calendario de la uni automático), la lista de Tareas se llenó con 22 exámenes y entregas en prioridad alta, muchos para junio. Diego: «la zona de tareas tiene que estar limpia y ordenada para no atosigarme».

Lo que dijo Diego:
- Un examen no es una tarea como "comprar huevos"; los exámenes van en otro sitio.
- Un examen de junio, o un parcial dentro de un mes, no es prioridad alta ahora. Lo será cuando queden pocas semanas, y solo los más próximos.
- Boxeo no es algo que marque como hecho: es un recordatorio a una hora. Y no quiere verlo repetido meses en los que quizá no esté apuntado.
- En la tarjeta Ahora, un grupo sin nada (por ejemplo, sin recados) no se enseña.
- El horario de clases va con la parte C, no en esta versión.

Decisiones tomadas con Diego:
- Cinco tipos: Tarea (por defecto), Entrega, Examen, Recado y Evento.
- Plazos: exámenes, 3 semanas (aparecen, prioridad media) y 1 semana (prioridad alta); entregas, 2 semanas (media) y 3 días (alta).
- Tarjetita «Próximos exámenes» en el Inicio.
- Pantalla de Tareas con dos tarjetas (al lado en el PC, una debajo de otra en el móvil), no con pestañas.
- Repetición: días de la semana, cada mes o cada año. Final: sin final, una fecha o «durante N semanas/meses/años».
- Un solo archivo (`tareas.yaml`) con un campo `tipo`, no archivos separados.

## 2. Formato de datos (`agenda/tareas.yaml`)

Campos nuevos, todos opcionales (las tareas actuales siguen valiendo tal cual):

| Campo | Valores |
|---|---|
| `tipo` | `tarea` (por defecto, no se escribe), `entrega`, `examen`, `recado`, `evento` |
| `repetir` | como antes, una lista de días (`[lun, mie, vie]`), **o** el texto `mes` (cada mes, el mismo día que `fecha`) **o** `año` (cada año, el mismo día y mes que `fecha`) |
| `hasta` | `AAAA-MM-DD`: último día en que ocurre una tarea que se repite. Sin `hasta`, se repite sin final. Solo vale con `repetir` y no puede ser anterior a `fecha` |

Reglas nuevas de validación:
- `repetir: mes` y `repetir: año` necesitan `fecha` (es el día que se repite).
- `hasta` sin `repetir` es un error, igual que `hasta` anterior a `fecha`.
- `tipo` desconocido es un error.
- `area` sigue siendo obligatoria para todos los tipos.

Ejemplo:
```yaml
- id: t-20260930-5
  titulo: Boxeo
  tipo: evento
  area: salud
  hora: "19:00"
  repetir: [lun, mie, vie]
  fecha: 2026-10-01
  hasta: 2026-10-31

- id: t-20260930-6
  titulo: Cumpleaños de mamá
  tipo: evento
  area: personal
  repetir: año
  fecha: 2027-03-14

- id: t-20260930-7
  titulo: Cálculo (enero)
  tipo: examen
  area: calculo
  fecha: 2027-01-21
  hora: "09:00"
  notas: 09:00 - 12:00 · Aulario II - Aula 204
  origen: urjc-examen:2026-27:2327007:E:AM
```

## 3. Reglas de la agenda

### Cuándo ocurre una tarea
- Días de la semana: como ahora (desde `fecha`, si la tiene), y **no después de `hasta`**.
- `mes`: el día del mes de `fecha`, desde `fecha`. En los meses sin ese día (31 en abril, 30 y 31 en febrero…), el último día del mes. No después de `hasta`.
- `año`: el mismo día y mes de `fecha`, desde `fecha`. El 29 de febrero, en años no bisiestos, el 28. No después de `hasta`.
- Una tarea que se repite y cuyo `hasta` ya pasó no aparece en «Se repiten» (queda solo en el historial del calendario).

### Eventos
- No tienen casilla de hecho (ni `hecha` ni `hechas`: si los tuvieran, se ignoran).
- Nunca están atrasados.
- Aparecen en su día en el calendario y en «Hoy» (con su hora), y en «Por áreas» → Eventos mientras sean futuros o se sigan repitiendo.

### Exámenes y entregas: plazo y prioridad automática
`faltan` = días desde hoy hasta `fecha`.

| Tipo | Fuera de las listas principales | Se acerca (prioridad media) | Prioridad alta |
|---|---|---|---|
| examen | `faltan` > 21 | 7 < `faltan` ≤ 21 | `faltan` ≤ 7 |
| entrega | `faltan` > 14 | 3 < `faltan` ≤ 14 | `faltan` ≤ 3 |

- La prioridad calculada solo se usa si la tarea no tiene `prioridad` escrita. Si Diego pone una a mano, manda la suya. Fuera del plazo, la prioridad calculada es `baja`.
- «Listas principales» = la tarjeta Ahora de Tareas y la tarjeta Hoy del Inicio. En el calendario y en «Por áreas» aparecen siempre.
- Un examen sin fecha se trata como una tarea sin fecha (va a «Sin fecha»).
- Atrasadas: un **examen** pasado no aparece como atrasado; una **entrega** pasada sin marcar sí.
- Hechos: los exámenes y entregas marcados como hechos desaparecen de las listas, como las tareas.

### Recados
- Van al grupo «Recados» de la tarjeta Ahora, sin fecha o con fecha futura (no a «Sin fecha» ni a «Próximas»). Un recado con fecha de hoy va a «Hoy» y con fecha pasada, a «Atrasadas» (en esos casos no se repite en «Recados»).

## 4. Pantallas

### Formulario de tarea (`FormTarea`)
- Arriba, cinco botones de tipo: Tarea · Entrega · Examen · Recado · Evento, cada uno con su icono de Tabler (`checkbox`, `file-upload`, `school`, `shopping-cart`, `calendar-event`). Por defecto, Tarea (o el tipo de la tarea que se edita).
- Campos según el tipo:
  - **Tarea:** como ahora.
  - **Recado:** título, área y fecha (opcional). El área viene puesta con la de la última tarea creada en ese dispositivo (o la primera área de la lista).
  - **Evento:** título, área, fecha, hora y repetición. Sin prioridad.
  - **Examen y Entrega:** título, área o asignatura, fecha, hora, notas y proyecto. La prioridad muestra «Automática» por defecto y se puede fijar.
- Repetición: «No se repite» · «Días de la semana» (L M X J V S D) · «Cada mes» · «Cada año». Si se repite: «Hasta» con «Sin final» · «Una fecha» · «Durante N semanas/meses/años». Con «Durante», debajo se ve la fecha de fin calculada («Hasta el 31 oct»), y se guarda como `hasta`. «Durante 1 mes» desde el 1 de octubre = hasta el 31 de octubre (el día antes de cumplirse el mes).
- Al guardar se aplica solo lo que cambió (`aplicarEdicion`), como ahora.

### Fila de tarea (`FilaTarea`)
- Entregas, exámenes, recados y eventos llevan delante el icono de su tipo (además del icono propio de la tarea, si tiene).
- Los eventos no tienen casilla.
- Entregas y exámenes con fecha futura muestran cuánto falta («faltan 5 días», «mañana», «hoy»).

### Pantalla Tareas
Dos tarjetas: al lado una de otra en el PC, una debajo de otra en el móvil.

**Ahora**, en este orden, y **sin mostrar los grupos vacíos**:
1. Atrasadas.
2. Hoy: lo que ocurre hoy, incluidos los eventos (con su hora, sin casilla).
3. Se acerca: exámenes y entregas dentro de su plazo con fecha posterior a hoy, por fecha.
4. Próximas: tareas (tipo `tarea`) con fecha futura, como la lista «Próximas» de ahora.
5. Recados.
6. Se repiten (plegado al abrir).
7. Sin fecha (plegado al abrir).

**Por áreas**: desplegables Área → Subárea → Tipo (Tareas, Entregas, Exámenes, Recados, Eventos), con el número de pendientes en cada nivel. Solo lo pendiente (sin hacer), incluidos los exámenes lejanos, y lo que se repite y no ha terminado. Las áreas sin nada pendiente no se muestran. Lo que está directamente en un área con subáreas va antes que sus subáreas. Todo empieza plegado y la app recuerda, en cada dispositivo (`localStorage`), qué desplegables dejó abiertos Diego.

### Inicio
- **Hoy:** lo que ocurre hoy (eventos con su hora y sin casilla, tareas, recados), las atrasadas y los exámenes y entregas con prioridad alta.
- **Próximos exámenes** (tarjeta nueva, pequeña): los 3 exámenes pendientes más cercanos con fecha de hoy en adelante: título, fecha y «faltan N días». Si no hay ninguno, la tarjeta no aparece.
- El resto, igual.

### Calendario
- Todo aparece en su día con el icono de su tipo: exámenes (también los lejanos), entregas, eventos y tareas.
- Las repeticiones respetan `mes`, `año` y `hasta`.

## 5. Sincronización de la uni (cambios sobre la parte A)

- Las tareas nuevas se crean con `tipo: examen` o `tipo: entrega`, **sin** `prioridad`, **sin** `icono` y con títulos sin prefijo: `<nombre de la asignatura> (<convocatoria>)` para los exámenes (por ejemplo, `Cálculo (enero)`) y el título de Moodle sin « se cierra»/« vence» para las entregas (por ejemplo, `Práctica 1`). Los eventos del profesor en el aula virtual se crean como `tarea` (pueden ser un parcial o una clase; Diego o Claude les cambian el tipo).
- Las 22 tareas ya importadas se arreglan una sola vez, al publicar: `tipo` según su `origen` (`urjc-examen:` → examen; `moodle:` con título «Entrega: …» → entrega) y se quitan `prioridad`, `icono` y el prefijo del título. Lo hace Claude con un script de un solo uso sobre `tareas.yaml` (no forma parte de la app). La sincronización no toca títulos, prioridad ni icono existentes, así que no se deshace.
- Boxeo pasa a `tipo: evento` (y, si Diego quiere, con `hasta`) en ese mismo momento, preguntándole antes.

## 6. Compatibilidad

- Una versión antigua de la app da error de validación al leer `repetir: mes` o `repetir: año`. `hasta` y `tipo` no dan error (los ignora), pero seguiría enseñando la repetición sin final y todo como tareas. No se pierde nada, pero hay que abrir la app en cada dispositivo tras publicar.
- Claude no escribe `repetir: mes`/`año` en los datos de Diego hasta que él confirme que ha abierto la app nueva en sus dispositivos.
- `docs/diseno.md` (sección 3) y `my-context/AGENTS.md` se actualizan con los tipos, `repetir: mes|año`, `hasta` y ejemplos (por ejemplo, un cumpleaños = evento que se repite cada año), para que Claude cree bien lo que Diego le pida.

## 7. Pruebas

- Formato: `tipo`, `repetir: mes|año`, `hasta`, y sus errores (tipo desconocido, `mes` sin fecha, `hasta` sin repetir o anterior a `fecha`).
- Cuándo ocurre: semanal con y sin `hasta`, mensual (incluido el día 31 y febrero), anual (incluido el 29 de febrero).
- Plazo y prioridad: los límites exactos (21/22 y 7/8 días en exámenes; 14/15 y 3/4 en entregas), prioridad a mano que manda, examen pasado no atrasado, entrega pasada atrasada.
- Grupos: qué va a cada grupo de Ahora (y que los vacíos no se devuelven), el árbol de Por áreas con recuentos, recados con y sin fecha, eventos sin casilla, repeticiones terminadas fuera de «Se repiten».
- Pantallas (con `renderToString`, como las pruebas actuales): formulario según el tipo, «Durante N meses» → `hasta`, fila con icono de tipo y «faltan N días», tarjeta Próximos exámenes (y que no sale si no hay).
- Sincronización: tipo, sin prioridad ni icono, títulos sin prefijo.

## 8. Fuera de esta versión

- Horario de clases (calendario de asignaturas oculto por defecto): con la parte C.
- Contenidos, avisos y guías docentes de las asignaturas (parte C).
- Avisos tipo "¿practicamos?".
- Cambiar los plazos desde Ajustes (quedan fijos: 3 semanas/1 semana y 2 semanas/3 días).
