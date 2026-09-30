# Diseño: calendario de la uni automático (parte A)

Fecha: 2026-09-30. Aprobado por Diego en conversación, parte por parte.

## 1. Objetivo

Que los exámenes, entregas y eventos de la URJC aparezcan solos en la agenda de la app (y, por tanto, que Claude los vea en `tareas.yaml`), sin que Diego copie nada a mano y aunque todos sus dispositivos estén apagados.

Es la parte A de "conectar la uni al segundo cerebro". Las otras partes, cada una con su propio diseño:
- **C (siguiente):** contenidos, avisos y guías docentes de las asignaturas del aula virtual (ahí se encontrarán los parciales).
- **B (más adelante):** avisos tipo "tienes examen de Cálculo la semana que viene, ¿practicamos?".
- **D (más adelante):** correo de la URJC.

Lo que dijo Diego:
- Todo tiene que ser automático: si los profes añaden exámenes o tareas cada semana, deben aparecer solos.
- Una subárea por asignatura dentro del área Uni.
- Está matriculado en todas las asignaturas de 1º (2026-27).
- La sincronización tiene que gastar y ocupar casi nada. Cada 3 horas está bien si es así (lo es, ver sección 6).
- Los títulos («Examen:», «Entrega:») los verá cuando estén creados y se cambian si no le gustan.

## 2. Qué se ha comprobado (2026-09-30)

- **Calendario del aula virtual.** `aulavirtual.urjc.es` es Moodle 4.5. Calendario → Exportar → «Obtener URL del calendario» da una URL `…/moodle/calendar/export_execute.php?userid=…&authtoken=…&preset_what=all&preset_time=custom` con formato iCalendar (`.ics`). Es privada: el `authtoken` es una llave. Cada evento trae `UID`, `SUMMARY`, `DESCRIPTION`, `DTSTART` (UTC), `LAST-MODIFIED` y `CATEGORIES` con el nombre corto del curso (`2026-27_2327004_159508_186565`). El título no dice la asignatura.
- **Exámenes oficiales.** `https://servicios.urjc.es/examenes/consulta-grado` es público. Por dentro hace `POST https://servicios.urjc.es/examenes/informacion` con `titulacion=2327&convocatoria=T` (`T` = todas; también `E`, `M`, `J`, `S`) y recibe JSON `{"CONSULTA":[…]}`. Cada examen trae `CURSO`, `ASIGNATURA` (en mayúsculas y sin tildes), `COD_ASIGNATURA` (`2327007`), `FECHA` (`DD-MM-AAAA`), `HORA` (`09:00 - 12:00`), `AULAS` (varias separadas por `<br/>`), `CONVOCATORIA`, `CURSO_ACADEMICO` y `TIPO_EXAMEN`.
- **El código une las dos fuentes:** el `COD_ASIGNATURA` de los exámenes es el mismo número que va en `CATEGORIES` del calendario (`2327004` = Fundamentos de la Programación). Así se sabe de qué asignatura es cada entrega.
- **Los parciales no salen** en ninguna de las dos fuentes. Quedan para la parte C.

## 3. Qué aparece en la app

### Asignaturas
Las 10 asignaturas de 1º se guardan en `estudios/asignaturas.yaml` con un campo nuevo, `codigo` (el `COD_ASIGNATURA` de la URJC), y cada una es una subárea de `uni` en `agenda/areas.yaml` con el **mismo id**. La lista se crea una vez, en la puesta en marcha:

| codigo | id | nombre |
|---|---|---|
| 2327001 | `arquitectura-computadores` | Arquitectura de Computadores |
| 2327002 | `algebra` | Álgebra (ya existe) |
| 2327003 | `emprendimiento` | Emprendimiento e Innovación en Robótica |
| 2327004 | `fundamentos-programacion` | Fundamentos de la Programación |
| 2327005 | `fundamentos-fisicos` | Fundamentos Físicos de la Robótica |
| 2327006 | `algoritmos` | Algoritmos y Estructuras de Datos |
| 2327007 | `calculo` | Cálculo (ya existe) |
| 2327008 | `electronica-digital` | Electrónica Digital |
| 2327009 | `evolucion-robotica` | Evolución y Futuro de la Robótica |
| 2327010 | `laboratorio-sistemas` | Laboratorio de Sistemas |

Cálculo y Álgebra conservan su color. Las demás reciben colores distintos entre sí, y la subárea usa el mismo color que la asignatura. La sincronización **no crea asignaturas**: solo usa las que tienen `codigo`. Lo que llegue de un curso cuyo código no está en la lista se ignora (así se descarta el curso `RAC_EMP_FUENLABRADA`). Para 2º curso habrá que añadir sus asignaturas; se deja un aviso en `my-context/AGENTS.md`.

### Exámenes oficiales
Solo los de las asignaturas con `codigo` y con fecha de hoy en adelante (hora de Madrid).

- `titulo`: `Examen: <nombre de la asignatura> (<convocatoria>)`, con convocatoria `enero`, `mayo`, `junio` o `septiembre` según `E`, `M`, `J`, `S`. Ejemplo: `Examen: Cálculo (enero)`.
- `area`: el id de la asignatura. `prioridad: alta`. `icono: school`.
- `fecha`: la del examen. `hora`: la de inicio (`"09:00"`).
- `notas`: `<HORA> · <aulas separadas por " · ">`. Ejemplo: `09:00 - 12:00 · Aulario II - Aula 204`.
- `origen`: `urjc-examen:<CURSO_ACADEMICO>:<COD_ASIGNATURA>:<CONVOCATORIA>:<GRUPO>`.

### Eventos del aula virtual
Solo los eventos cuyo curso (el número de 7 cifras de `CATEGORIES`) es una asignatura con `codigo`, y con fecha de hoy en adelante.

- Los títulos que terminan en ` se abre` **no se importan** (es cuando empieza un cuestionario; no hay nada que hacer).
- Los que terminan en ` se cierra` o ` vence` son entregas: `titulo` = `Entrega: <título sin ese final>`.
- El resto (eventos que crea el profesor) se importan con su título tal cual.
- `fecha` y `hora`: `DTSTART` pasado a hora de Madrid. Si queda exactamente a las `00:00`, se pone el día anterior a las `"23:59"`: Moodle escribe "a las 00:00 del día 6" cuando quiere decir "hasta el final del día 5".
- `area`: el id de la asignatura. `prioridad: media`. `icono: file-upload` en las entregas y ninguno en el resto.
- `notas`: la descripción del evento como texto plano (sin HTML ni espacios de sobra), si tiene.
- `origen`: `moodle:<UID>`.

### Reglas para no pisar nada
1. **Solo se crea lo que nunca se ha visto.** Cada `origen` importado se apunta en `estudios/uni-sincronizacion.yaml` (lista `vistos`) junto con lo último que dijo la fuente (`fecha`, `hora` y, en los exámenes, `notas`). Si Diego borra una tarea importada, no vuelve. Si la marca como hecha, sigue hecha.
2. **Solo se cambia lo que cambia la URJC.** Si la fuente trae una `fecha`, `hora` o (en los exámenes) `notas` distinta de la que tenía apuntada, ese campo se actualiza en la tarea. Si no ha cambiado en la fuente, no se toca, aunque Diego lo haya editado (por ejemplo, sus notas en un examen). El título, la prioridad, el icono, el proyecto y `hecha` nunca se tocan.
3. **Si algo desaparece de la fuente, no se borra** de la app.
4. Las tareas nuevas usan ids `t-AAAAMMDD-n` (con la fecha del día de la sincronización), sin repetir ninguno existente, igual que la app.

## 4. Formato de datos (cambios)

- `agenda/tareas.yaml`: campo opcional nuevo `origen` (texto). La app lo conserva al editar una tarea y lo valida como texto. No se enseña en pantalla.
- `estudios/asignaturas.yaml`: campo opcional nuevo `codigo` (texto de 7 cifras, entre comillas). La app lo conserva al guardar asignaturas (hoy lo borraría: `serializarAsignaturas` solo escribe `id`, `nombre` y `color`).
- `estudios/uni-sincronizacion.yaml` (nuevo, lo escribe solo la sincronización). Lo ya pasado (fecha anterior a hoy) se quita para que no crezca:
  ```yaml
  vistos:
    urjc-examen:2026-27:2327007:E:AM:
      fecha: 2027-01-21
      hora: "09:00"
      notas: 09:00 - 12:00 · Aulario II - Aula 204
    moodle:46534019@www.aulavirtual.urjc.es/moodle:
      fecha: 2026-10-05
      hora: "23:59"
  ```
- `docs/diseno.md`, sección 3, y `my-context/AGENTS.md` se actualizan con estos campos.

## 5. Arquitectura

```
Servidores de GitHub, cada 3 horas (workflow en my-context)
  1. Descarga el calendario (URL en el secret URJC_CALENDARIO) y los exámenes (POST público)
  2. Lee tareas.yaml, asignaturas.yaml, uni-sincronizacion.yaml
  3. Aplica las reglas de la sección 3
  4. Si algo cambió: commit y push a my-context
        │
        ▼
my-context ──► la app (PC, portátil, iPhone) y Claude en la terminal
```

### En `segundo-cerebro-app` (público, sin datos personales)
Lógica pura, con pruebas, en `src/uni/` (sin `import` de React ni de red; imports con `.ts` para que Node la ejecute sin compilar, como `src/estudio/tipos.ts`):
- `ics.ts`: leer un `.ics` (desplegar líneas partidas, quitar escapes `\n`, `\,`, `\;`) y devolver eventos `{ uid, titulo, descripcion, inicio (Date), categorias }`.
- `hora.ts`: pasar un instante a fecha y hora de Madrid (`Intl.DateTimeFormat` con `timeZone: 'Europe/Madrid'`), incluida la regla de las `00:00` → día anterior a las `23:59`.
- `examenes.ts`: convertir el JSON de la URJC en propuestas de tarea.
- `moodle.ts`: convertir los eventos del `.ics` en propuestas de tarea (filtros y títulos de la sección 3).
- `fusionar.ts`: juntar las propuestas con las tareas y la lista de vistos, aplicando las reglas. Devuelve las tareas nuevas, la lista de vistos nueva y un resumen (`creadas`, `actualizadas`).

Programa: `sincronizar/uni.ts` (Node sin compilar). Recibe la carpeta de `my-context` y la URL del calendario (variable de entorno `URJC_CALENDARIO`), descarga las dos fuentes, lee `asignaturas.yaml` (solo lectura) y lee y escribe `tareas.yaml` (con `parseTareas`/`serializarTareas`) y `uni-sincronizacion.yaml`, y escribe un resumen en la consola. Si alguna descarga falla o la respuesta no tiene el formato esperado, sale con error **sin escribir nada**. Con `--prueba` escribe el resumen pero no guarda. Nunca escribe la URL en la consola.

Cambios en la app: campo `origen` en `Tarea` y su validación; `codigo` en `Asignatura`, conservado por `parseAsignaturas`/`serializarAsignaturas`.

### En `my-context` (privado)
- `.github/workflows/uni.yml`:
  - `schedule: cron: '17 */3 * * *'` (cada 3 horas, en un minuto poco usado) y `workflow_dispatch` (botón «Run workflow»).
  - Pasos: `checkout` de `my-context`, `checkout` de `Dino768/segundo-cerebro-app` (público), `setup-node` con caché de npm, `npm ci` en la app, ejecutar `sincronizar/uni.ts` con el secret `URJC_CALENDARIO` y, si `git status` muestra cambios, `commit` («Uni: N nuevas, M actualizadas») y `push`.
  - Si el `push` es rechazado porque la app o Claude subieron algo mientras tanto: `git pull --rebase` y repetir la sincronización sobre los archivos nuevos (hasta 3 intentos).
  - `concurrency` para que no se ejecuten dos a la vez.
- `estudios/uni-sincronizacion.yaml`.

### Plan B
Si la URJC bloquea los servidores de GitHub, el mismo `sincronizar/uni.ts` lo ejecuta cada 3 horas el programa local de la zona de estudio (`local/principal.ts`), con la URL leída de `C:\Users\Diego\.segundo-cerebro\urjc-calendario.txt`, y sube con Git. No se diseña más a menos que haga falta.

## 6. Consumo

- Cada ejecución dura menos de 1 minuto: unos 240 minutos al mes, de los 2000 gratuitos de GitHub para repositorios privados (un 12 %).
- Solo hay commit cuando cambia algo: sin novedades, `my-context` no crece.
- Unos 40 KB de descarga por ejecución.
- No usa la suscripción de Claude ni ningún dispositivo de Diego.

## 7. Errores

- URJC caída, enlace caducado (por ejemplo, si Diego cambia la contraseña de la uni) o formato inesperado: no se escribe nada, el workflow falla y GitHub manda un correo a Diego. Para un enlace caducado: sacar uno nuevo y cambiar el secret.
- Un evento raro (sin `UID` o sin fecha) se salta y se cuenta en el resumen, sin tumbar el resto.
- Los archivos de `my-context` con errores de formato: la sincronización falla sin escribir nada, igual que haría la app.

## 8. Pruebas

Con datos inventados, nunca con los reales (`src/uni/*.test.ts`):
- `ics`: líneas partidas, escapes, varios eventos, eventos sin `UID`.
- `hora`: invierno (UTC+1) y verano (UTC+2); `22:00Z` en octubre → día anterior a las `23:59`; `21:59Z` → `23:59` del mismo día.
- `examenes`: título con nombre bonito y convocatoria, aulas con `<br/>`, filtro de pasados y de asignaturas sin código.
- `moodle`: `se abre` descartado, `se cierra`/`vence` → «Entrega:», curso desconocido descartado, descripción limpia.
- `fusionar`: crea lo nuevo; no duplica; no recrea lo borrado; actualiza fecha, hora y notas solo si cambian en la fuente, sin tocar título, prioridad, icono ni `hecha`; respeta las notas de Diego mientras la fuente no cambie; no borra lo que desaparece; ids sin repetir; quita de `vistos` lo pasado.
- App: `origen` se conserva al editar una tarea; `codigo` se conserva al guardar asignaturas.

## 9. Puesta en marcha (con Diego)

1. **Prueba de acceso** (lo primero, antes de programar lo demás): un workflow de prueba en `my-context` intenta descargar las dos fuentes (los exámenes, que son públicos, y el calendario con un secret provisional) e informa solo del código HTTP y del tamaño. Si falla, se pasa al plan B.
2. Diego guarda el enlace en `my-context` → Settings → Secrets and variables → Actions → New repository secret, con el nombre `URJC_CALENDARIO`. Lo pega él en GitHub, nunca en el chat.
3. Se añaden las 10 asignaturas con su `codigo` y las subáreas.
4. Primera sincronización lanzada a mano. Diego la revisa en la app y se ajustan títulos o colores.
5. Se borra `C:\Users\Diego\.segundo-cerebro\urjc-calendario.txt` (salvo que se use el plan B).

## 10. Fuera de esta versión

- Contenidos, avisos y guías docentes (parte C), avisos "¿practicamos?" (parte B) y correo (parte D).
- Cambiar de curso automáticamente.
- Etiqueta "del aula virtual" en la app.
- API de Moodle (no hace falta para la parte A; probablemente sí para la C).
