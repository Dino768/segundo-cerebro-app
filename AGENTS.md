# Segundo cerebro: la app

## Qué es este proyecto
Es la app web del "segundo cerebro" de Diego: tareas, calendario y proyectos, desde el PC, el portátil y el móvil.

El segundo cerebro son dos repositorios que trabajan juntos:
- **`my-context`** (privado, `Desktop/my-context`, GitHub `Dino768/my-context`): los datos y el contexto de Diego. Quién es, sus proyectos, sus ideas y la agenda (`agenda/tareas.yaml`, `agenda/areas.yaml`, `proyectos/*.md`).
- **`segundo-cerebro-app`** (este repositorio, público, GitHub `Dino768/segundo-cerebro-app`): el código de la app. Aquí no hay datos personales.

La app no tiene servidor. Lee y escribe los archivos de `my-context` con la API de GitHub y un token que Diego pega en cada dispositivo. Claude (con la suscripción de Diego) es el "cerebro": edita los mismos archivos desde la terminal. Coste extra: 0 €.

## Antes de nada
1. Lee el contexto de Diego: `../my-context/AGENTS.md` (y `../my-context/contexto/sobre-mi.md` si hace falta). Ahí está cómo quiere que trabajes con él.
2. Lee el estado del trabajo: sección "Estado actual" de este archivo y el registro `.superpowers/sdd/plan-v1/progress.md`.
3. Si vas a tocar código, lee `docs/diseno.md` (qué hace la app y el formato de los datos) y `docs/plan-v1.md` (el plan paso a paso).

## Cómo trabajar aquí
- Habla con Diego en español, con palabras sencillas. Es principiante: explícale qué haces y por qué.
- El plan se ejecuta tarea a tarea con el método de `superpowers:executing-plans`. Primero la prueba (que falle) y luego el código. Cada tarea deja su línea en el registro `.superpowers/sdd/plan-v1/progress.md`.
- Cualquier decisión que se aparte del plan se apunta en el registro como `Ruling:`.
- Nunca subas (`git push`) sin que Diego lo sepa. Nunca pongas tokens ni datos personales en este repositorio. La carpeta `.superpowers/` está en `.gitignore` y no se sube.
- Diego nunca debe pegar su token en el chat, solo en la app.

## Comandos
Node está en `C:\Program Files\nodejs`. En la terminal Bash de Claude Code puede no estar en el PATH: añade `export PATH="$PATH:/c/Program Files/nodejs";` delante de los comandos.
- `npm run dev`: app en local, en http://localhost:5173/segundo-cerebro-app/
- `npm test`: pruebas automáticas (Vitest)
- `npm run build`: compila y revisa los tipos

## Estructura del código
- `src/fechas.ts`: fechas locales, días de la semana, cuadrícula del calendario.
- `src/datos/`: leer, validar y escribir `tareas.yaml`, `areas.yaml` y los `proyectos/*.md`.
- `src/agenda/`: lógica sin pantalla (qué toca cada día, atrasadas, prioridades, aviso de más de 2 proyectos activos).
- `src/github/cliente.ts`: única pieza que habla con GitHub (leer, escribir, reintentar si hay conflicto).
- `src/repositorio.ts`: carga todo y guarda cambios sin pisar lo que haya cambiado otro.
- `src/estado/`: estado de la app en React (conexión, llave, caché para cuando no hay internet).
- `src/pantallas/` y `src/componentes/`: Hoy, Calendario, Tareas, Proyectos y Ajustes.

## Seguridad del token
El token se guarda en el `localStorage` del navegador, y ese almacenamiento es compartido por todo el dominio `https://dino768.github.io`. Cualquier otra web que Diego publique con GitHub Pages en su cuenta (un juego, un portfolio…) podría leerlo. Recuérdaselo si va a publicar otra web y recomiéndale tokens con caducidad corta (90 días o menos). La alternativa gratuita es mover la app a una organización de GitHub propia, con su propio dominio: está pendiente de proponérselo.

## Estado actual
Última actualización: 2026-09-23.
- **Versión 1 terminada y publicada** en https://dino768.github.io/segundo-cerebro-app/. Diego la tiene instalada en el PC, el portátil y el iPhone, con un token por dispositivo. Tasks 0 a 15 del plan hechas.
- **Revisión final hecha. FALTA el arreglo** de sus 4 puntos importantes. Es lo primero que hay que hacer, con TDD (prueba que falla → arreglo → `npm test`), y después `git push` para que se vuelva a publicar sola:
  1. **Casilla de "hecha"**: pasar de "alternar" a "fijar" (`fijarHecha(t, dia, valor)` / `fijarEnLista`, con `valor = !hecha` según lo que se ve en pantalla). Así, tocar dos veces no desmarca. Mostrar el cambio al instante y desactivar la casilla mientras se guarda (en `FilaTarea`). Poner en cola las llamadas a `cambiarTareas` para que vayan de una en una (`crearCola` en `src/estado/`).
  2. **Editar una tarea no debe pisar cambios de otros**: `aplicarEdicion(ts, original, editada, ahora)` aplica solo los campos que el usuario cambió sobre la versión remota, en lugar de sustituir la tarea entera (sustituye a `guardarEnLista` en `FormTarea`). Si la tarea se borró mientras tanto, se vuelve a añadir. Además, refrescar tareas y áreas (no proyectos) al volver a la app (`visibilitychange`), a través de la misma cola.
  3. **"Hoy" al pasar la medianoche**: hook `useHoy()` que se actualiza al volver a la app y con un temporizador a la medianoche local (función pura `msHastaMedianoche` con test). Lo usan Hoy, Tareas, Calendario y PaginaProyecto.
  4. **Token**: añadir en la ayuda de Ajustes el aviso de la sección "Seguridad del token".
- Detalles, decisiones y los arreglos menores aplazados: `.superpowers/sdd/plan-v1/progress.md` (líneas `Final:`).
- Después de los arreglos: Diego cuenta lo que no le convence tras usar la app → versión 1.1.

Mantén esta sección al día cuando avances.
