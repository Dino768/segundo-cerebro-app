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
- `src/datos/`: leer, validar y escribir `tareas.yaml`, `areas.yaml`, los `proyectos/*.md` e `ideas/bandeja.md` (`ideas.ts`).
- `src/agenda/`: lógica sin pantalla (qué toca cada día, atrasadas, prioridades, aviso de más de 2 proyectos activos).
- `src/github/cliente.ts`: única pieza que habla con GitHub (leer, escribir, reintentar si hay conflicto).
- `src/repositorio.ts`: carga todo y guarda cambios sin pisar lo que haya cambiado otro.
- `src/estado/`: estado de la app en React (conexión, llave, caché para cuando no hay internet).
- `src/agenda/ideas.ts`: operaciones con ideas (añadir, vincular a un proyecto, quitar, convertir en proyecto).
- `src/componentes/navegacion.ts`, `Lateral.tsx`, `MenuMovil.tsx`: navegación (barra lateral en el PC, menú abajo en el móvil).
- `src/pantallas/` y `src/componentes/`: Inicio, Calendario, Tareas, Proyectos, Ideas y Ajustes. Estilos: `src/estilos.css` (tema «papel cálido»).

## Seguridad del token
El token se guarda en el `localStorage` del navegador, y ese almacenamiento es compartido por todo el dominio `https://dino768.github.io`. Cualquier otra web que Diego publique con GitHub Pages en su cuenta (un juego, un portfolio…) podría leerlo. Recuérdaselo si va a publicar otra web y recomiéndale tokens con caducidad corta (90 días o menos). La alternativa gratuita es mover la app a una organización de GitHub propia, con su propio dominio: está pendiente de proponérselo.

## Estado actual
Última actualización: 2026-09-24 (v1.1).
- **Versión 1 terminada y publicada** en https://dino768.github.io/segundo-cerebro-app/. Diego la tiene instalada en el PC, el portátil y el iPhone, con un token por dispositivo. Tasks 0 a 15 del plan hechas.
- **Arreglos de la revisión final hechos** (2026-09-24): casilla que "fija" en vez de alternar, con cola (`src/estado/cola.ts`); editar una tarea solo aplica los campos cambiados (`aplicarEdicion`) y tareas/áreas se refrescan al volver a la app; "hoy" cambia a medianoche (`src/estado/hoy.ts`); aviso del token en Ajustes.
- Detalles, decisiones y los arreglos menores aplazados: `.superpowers/sdd/plan-v1/progress.md` (líneas `Final:`).
- **Versión 1.1 (rediseño del PC) publicada** (2026-09-24), probada por Diego con sus datos: tema «papel cálido», barra lateral, Inicio tipo panel de Notion, calendarios por área, sección Ideas (`ideas/bandeja.md`) y progreso de proyectos. Diseño: `docs/superpowers/specs/2026-09-24-rediseno-pc-design.md`. Plan: `docs/superpowers/plans/2026-09-24-rediseno-pc.md`. Registro: `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`.
- Diego ha revisado la v1.1 en el PC y en el móvil: le gusta, y el móvil no necesita una ronda propia.
- **Siguiente fase: zona de estudio** (sección de estudio con chat; ver `proyectos/zona-de-estudio.md` e `ideas/bandeja.md`). Empieza con brainstorming. **En esa misma actualización, incluir estos pulidos pendientes** para dejar una versión definitiva:
  1. **Casillas más rápidas**: ahora cada cambio espera a GitHub (leer y escribir: 1-3 s) y va en cola, y la casilla se queda desactivada mientras tanto. Propuesta: actualizar la lista local al instante (optimista), guardar en segundo plano sin desactivar la casilla y deshacer con aviso si falla.
  2. **Probar contenido pegado a la izquierda** (más cerca de la barra lateral) en vez de centrado en el PC (`main { max-width: 1180px; margin: 0 auto }`). Diego no sabe si le gustará: enseñárselo para que elija.
  3. **Probar la hora actual** junto a la fecha, bajo el saludo del Inicio. También a prueba.
  4. Los arreglos menores aplazados de la revisión: líneas `Final: minor (deferred)` de `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`.

Mantén esta sección al día cuando avances.
