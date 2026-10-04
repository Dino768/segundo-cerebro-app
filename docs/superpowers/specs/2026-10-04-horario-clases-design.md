# Diseño: horario de clases y avisos que caducan

Fecha: 2026-10-04. Aprobado por Diego en conversación.

## 1. Objetivo

- Ver el horario de clases de la uni en la app (cuadrícula semanal, «Ahora / Siguiente» en el Inicio, y en el calendario si se enciende), sin escribirlo a mano.
- Avisos del aula virtual: poder «desleer» un aviso marcado sin querer, y que un aviso leído desaparezca a los 30 días de leerlo.

Lo que dijo Diego:
- Turno de mañana, grupo de desdoble **G2** (comprobado: el desdoble de Álgebra del 7 de octubre le toca de 11 a 13).
- El calendario de clases empieza **oculto** salvo que lo encienda.
- Todo en una sola versión, sin dividir en partes.
- Los avisos leídos no necesitan durar más de un mes.

Es la parte «horario de clases» de "conectar la uni" (después de A y C).

## 2. Qué se ha comprobado (2026-10-04)

- La web pública `https://servicios.urjc.es/horarios/calendario-grado` (sin entrar con usuario) da el horario:
  - `GET /horarios/2327/cursos` y `GET /horarios/2327/cursos/1/grupos` (con `X-Requested-With: XMLHttpRequest`) devuelven JSON. Para 1º solo hay un grupo: `G_ROBOT_1A(F)` («Mañana - Grupo A»).
  - `POST /horarios/calendario-grado` con `cod_plan=2327&curso=1&grupo=G_ROBOT_1A(F)&semestre=*` devuelve una página HTML con `const infoHorario = {...};` dentro: `GRUPOS` (por grupo de asignatura: `ASIGNATURA_CODIGO`, `GRUPO`, `ES_GRUPO_PRACTICO`, `PROFESORADO`, `CLASES` con `TIMESTAMP_INICIO`, `TIMESTAMP_FIN` y `AULAS`) y `FESTIVOS`.
- Cada clase viene con su **fecha real**: los festivos y vacaciones ya no tienen clase, el aula cambia según la semana (Electrónica pasa a la L3007 en noviembre) y los desdobles alternos vienen como grupos `MAÑANA G1 P2` / `MAÑANA G2 P2` (Cálculo y Álgebra, miércoles alternos). Los grupos `G UNICO` son para todos.
- No trae los cambios que avisan los profes: el 24 de septiembre (Electrónica sin clase) sigue saliendo y la recuperación del 15 de octubre no está.

## 3. Datos

### 3.1 `estudios/horario-ajustes.yaml` (lo escribe Diego, la app o Claude; el workflow solo lo lee)

```yaml
grupo: "G_ROBOT_1A(F)"
curso: 1
desdoble: G2
quitadas:
  - fecha: 2026-09-24
    inicio: "09:00"
    asignatura: electronica-digital
sueltas:
  - fecha: 2026-10-15
    inicio: "11:00"
    fin: "13:00"
    asignatura: electronica-digital
    aula: Aula 3S2
    nota: Recuperación
```

- `grupo` y `curso`: qué horario descargar. `desdoble`: de los grupos con `G1`/`G2`/… en el nombre solo se queda ese; sin `desdoble`, se quedan todos.
- `quitadas`: una clase concreta que no hay (fecha + hora de inicio + asignatura). `sueltas`: clases añadidas (`aula` y `nota` opcionales).
- Va en archivo propio (y no en `asignaturas.yaml`) porque la app reescribe `asignaturas.yaml` con solo la lista y lo borraría.

### 3.2 `estudios/horario.yaml` (solo lo escribe el workflow)

```yaml
clases:
  - fecha: 2026-09-16
    inicio: "09:00"
    fin: "11:00"
    asignatura: algebra
    aula: Aula 3S2 · Aulario III
    profesor: David González de la Aleja Gallego
  - fecha: 2026-09-23
    inicio: "11:00"
    fin: "13:00"
    asignatura: algebra
    aula: Aula 3S2 · Aulario III
    desdoble: G2
```

- Solo asignaturas con `codigo` en `asignaturas.yaml` (el código lleva al `id`). Las demás se saltan.
- Ordenadas por fecha y hora. Varias aulas se juntan con « + ». Profesores en formato nombre normal («David González…» a partir de las mayúsculas de la URJC: primera letra de cada palabra en mayúscula, partículas como «de», «la» en minúscula).
- Sin fecha de «actualizado»: el archivo solo cambia (y solo se sube) si cambian las clases.

### 3.3 Avisos: `leidoEl`

- `estudios/avisos.yaml` gana `leidoEl: AAAA-MM-DD` (opcional) en cada aviso: el día en que se marcó como leído.
- Marcar como leído pone `leido: true` y `leidoEl: hoy`. **Marcar como no leído** pone `leido: false` y quita `leidoEl`.

## 4. Sincronización (workflow de la uni)

- `sincronizar/uni.ts` descarga además el horario (lógica en `src/uni/horario.ts`, sin red: recibe el HTML y devuelve las clases).
- Si no existe `horario-ajustes.yaml` o no tiene `grupo`, no descarga horario (no es un error).
- Si la web de horarios falla o cambia de formato: se mantiene el `horario.yaml` que había, el resto (exámenes, aula virtual) se sincroniza y guarda igual, y al final el script termina con error para que GitHub avise a Diego por correo.
- El resumen dice cuántas clases hay («Horario: 160 clases»).

## 5. Lógica (sin pantalla, `src/agenda/horario.ts`)

- `clasesDelDia(horario, ajustes, dia)`: las clases del archivo + las sueltas de ese día, ordenadas por hora; las quitadas salen marcadas `quitada: true` (la cuadrícula las tacha; el calendario y «Ahora» las ignoran).
- `ahoraYSiguiente(…, ahora)`: la clase en curso (si hay) y la siguiente de hoy; si ya no quedan hoy, la primera de mañana; si mañana tampoco hay, nada.
- `quitarClase`, `volverAPoner`, `anadirSuelta`, `borrarSuelta`: cambian `horario-ajustes.yaml` (solo `quitadas`/`sueltas`, sin pisar lo demás).

## 6. Pantallas

- **Calendario → vista «Horario»** (botones Mes / Semana / Horario): cuadrícula lunes-viernes, filas por horas (de la primera a la última clase de la semana, mínimo 9:00-15:00), bloques del color de la asignatura con nombre y aula. Desdoble con marca «G2». Quitadas tachadas. Flechas = semana anterior/siguiente; «Hoy». En el móvil, las mismas 5 columnas con nombres cortados.
- **«+ Clase suelta»** en la vista Horario: ventana con asignatura, fecha, inicio, fin, aula y nota.
- **Pastilla «🎓 Clases»** en el filtro del calendario, **apagada por defecto**, recordada en cada dispositivo (`localStorage`, clave propia). Encendida: las clases salen en Mes, Semana y la lista del día (hora, asignatura, aula), con el color de la asignatura, sin casilla.
- **Ventana de una clase** (al tocarla en cualquier sitio): asignatura, día y hora, aula, profesor, desdoble, nota. Botones «Abrir asignatura» (Estudio → Aula virtual de esa asignatura) y «No hay clase este día» / «Sí hay clase» (o «Borrar clase suelta»).
- **Inicio**: línea «Ahora: Cálculo · Aula 3S2 · hasta las 11:00 — Siguiente: Álgebra · 11:00» (o «Mañana: Álgebra · 9:00»). Sale aunque la pastilla esté apagada; si no hay nada, no sale. Se actualiza cada minuto.
- **Avisos** (Estudio → Aula virtual → Avisos): en los leídos, botón «Marcar como no leído».

## 7. Avisos que caducan

- La app oculta los avisos con `leido` y `leidoEl` de hace más de 30 días.
- El programa del PC (limpieza diaria, `src/uni/aula/avisos.ts`): a los leídos sin `leidoEl` les pone `leidoEl: hoy` (así los ya leídos no desaparecen de golpe) y borra los leídos con `leidoEl` de hace más de 30 días. Sustituye la regla actual de 60 días desde la fecha del aviso.

## 8. Compatibilidad

- Una versión antigua de la app no conoce `leidoEl`: si marca un aviso como leído reescribe el archivo sin las fechas, y el programa vuelve a ponerlas con la fecha del día (el aviso dura algo más). No se pierde nada. Hay que abrir la app en cada dispositivo tras publicar.
- Los archivos de horario son nuevos: una versión antigua los ignora.
- No cambia nada entre la app y el programa local de la zona de estudio: `VERSION_PROGRAMA` se queda igual.
- `docs/diseno.md` (sección 3) y `my-context/AGENTS.md` explican los dos archivos nuevos y `leidoEl`; el recordatorio de 2º curso añade «cambiar `grupo` y `curso` en `horario-ajustes.yaml`».

## 9. Pruebas

- Horario URJC: leer una copia real recortada (guardada en `src/uni/pruebas/`), filtro G2, `G UNICO` se queda, asignaturas sin código se saltan, aulas juntas, nombres de profesor, página sin `infoHorario` → error de formato.
- Sincronización: horario nuevo se escribe; igual → no se escribe; fallo del horario → exámenes guardados, horario intacto, error al final; sin ajustes → sin horario.
- Formato de `horario.yaml` y `horario-ajustes.yaml` (errores claros).
- Lógica: clases del día con quitadas y sueltas, «Ahora / Siguiente» (en curso, entre clases, después de la última, fin de semana), cambios de ajustes sin pisar.
- Pantallas (`renderToString`): cuadrícula, pastilla apagada por defecto, ventana de una clase, línea del Inicio.
- Avisos: desleer quita `leidoEl`, la app oculta a los 30 días, limpieza del programa (rellena `leidoEl`, borra a los 31 días, no a los 30).

## 10. Fuera de esta versión

- Detectar solo, a partir de los avisos de los profes, clases canceladas o recuperadas (de momento: a mano o pidiéndoselo a Claude).
- Exportar el horario a otro calendario (Google, iPhone).
