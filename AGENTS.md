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
- Al terminar una versión, sustituye el párrafo de "Dónde lo dejamos" en `my-context/proyectos/segundo-cerebro.md` (solo el punto actual, sin historial) y súbelo.
- Nunca subas (`git push`) sin que Diego lo sepa. Nunca pongas tokens ni datos personales en este repositorio. La carpeta `.superpowers/` está en `.gitignore` y no se sube.
- Diego nunca debe pegar su token en el chat, solo en la app.

## Comandos
Node está en `C:\Program Files\nodejs`. En la terminal Bash de Claude Code puede no estar en el PATH: añade `export PATH="$PATH:/c/Program Files/nodejs";` delante de los comandos.
`npm run dev`, `npm run build` y `npm run local` generan antes los iconos con `scripts/iconos.ts` (así siempre están al día).
- `npm run dev`: app en local, en http://localhost:5173/segundo-cerebro-app/
- `npm test`: pruebas automáticas (Vitest)
- `npm run build`: compila y revisa los tipos
- `npm run local`: zona de estudio en el PC (compila la app y arranca el programa local en http://127.0.0.1:5174/segundo-cerebro-app/). Necesita Claude Code instalado y `my-context` al lado. Guía para otro ordenador: `docs/portatil.md`.

## Estructura del código
- `src/fechas.ts`: fechas locales, días de la semana, cuadrícula del calendario.
- `src/datos/`: leer, validar y escribir `tareas.yaml`, `areas.yaml` (con subáreas), `ideas/ideas.yaml`, los `proyectos/*.md`. `src/datos/bandeja.ts`: solo para el paso automático de `ideas/bandeja.md` (formato antiguo) a `ideas.yaml`.
- `src/agenda/`: lógica sin pantalla (qué toca cada día, atrasadas, prioridades, aviso de más de 2 proyectos activos). `areas.ts`: buscar un área o subárea, su color, sus ids y crear/editar/borrar áreas. `agrupar.ts`: agrupar tareas, ideas o proyectos por área y subárea. `cambios.ts`: aplicar solo los campos que cambió el usuario sin pisar lo de otro dispositivo.
- `src/github/cliente.ts`: única pieza que habla con GitHub (leer, escribir, reintentar si hay conflicto).
- `src/repositorio.ts`: carga todo y guarda cambios sin pisar lo que haya cambiado otro.
- `src/estado/`: estado de la app en React (conexión, llave, caché para cuando no hay internet).
- `src/agenda/ideas.ts`: operaciones con ideas (añadir, editar, vincular a un proyecto, quitar, convertir en proyecto).
- `src/iconos/`: iconos de Tabler. `diccionario.ts` (palabras → icono, en español), `coleccion.ts` (cargar y buscar en la colección completa), `basicos.ts` (generado, no tocar a mano). `scripts/iconos.ts` genera los iconos antes de `dev`, `build` y `local` a partir de `node_modules/@tabler/icons` (no descarga nada de internet): escribe la colección completa en `public/iconos/tabler.json` y los básicos del diccionario en `src/iconos/basicos.ts`.
- `src/componentes/navegacion.ts`, `Lateral.tsx`, `MenuMovil.tsx`: navegación (barra lateral en el PC, menú abajo en el móvil).
- `src/pantallas/` y `src/componentes/`: Inicio, Calendario, Tareas, Proyectos (con pestañas Proyectos e Ideas), Estudio y Ajustes. Estilos: `src/estilos.css` (tema «papel cálido»).
- `local/`: programa local de la zona de estudio (servidor, Claude Code, conversaciones, pizarras). Node lo ejecuta sin compilar: imports con `.ts`.
- `src/estudio/`: lógica de la zona de estudio (pizarra, expresiones, historial, cliente local). `tipos.ts`, `contexto.ts`, `expresion.ts` y `pizarra.ts` los usa también `local/` (imports con `.ts`). `src/componentes/estudio/`: chat, pizarra e historial.

## Seguridad del token
El token se guarda en el `localStorage` del navegador, y ese almacenamiento es compartido por todo el dominio `https://dino768.github.io`. Cualquier otra web que Diego publique con GitHub Pages en su cuenta (un juego, un portfolio…) podría leerlo. Recuérdaselo si va a publicar otra web y recomiéndale tokens con caducidad corta (90 días o menos). La alternativa gratuita es mover la app a una organización de GitHub propia, con su propio dominio: está pendiente de proponérselo.

## Estado actual
Última actualización: 2026-09-26 (arreglos tras probar la v1.3).
- **Versión 1 terminada y publicada** en https://dino768.github.io/segundo-cerebro-app/. Diego la tiene instalada en el PC, el portátil y el iPhone, con un token por dispositivo. Tasks 0 a 15 del plan hechas.
- **Arreglos de la revisión final hechos** (2026-09-24): casilla que "fija" en vez de alternar, con cola (`src/estado/cola.ts`); editar una tarea solo aplica los campos cambiados (`aplicarEdicion`) y tareas/áreas se refrescan al volver a la app; "hoy" cambia a medianoche (`src/estado/hoy.ts`); aviso del token en Ajustes.
- Detalles, decisiones y los arreglos menores aplazados: `.superpowers/sdd/plan-v1/progress.md` (líneas `Final:`).
- **Versión 1.1 (rediseño del PC) publicada** (2026-09-24), probada por Diego con sus datos: tema «papel cálido», barra lateral, Inicio tipo panel de Notion, calendarios por área, sección Ideas (`ideas/bandeja.md`) y progreso de proyectos. Diseño: `docs/superpowers/specs/2026-09-24-rediseno-pc-design.md`. Plan: `docs/superpowers/plans/2026-09-24-rediseno-pc.md`. Registro: `.superpowers/sdd/2026-09-24-rediseno-pc/progress.md`.
- Diego ha revisado la v1.1 en el PC y en el móvil: le gusta, y el móvil no necesita una ronda propia.
- **Versión 1.2 (zona de estudio + pulidos) publicada** (2026-09-24). Diego la probó en el PC (leyes de Newton) y le encantó. Diseño: `docs/superpowers/specs/2026-09-24-zona-de-estudio-design.md`. Plan: `docs/superpowers/plans/2026-09-24-zona-de-estudio.md` (Tareas 1-18 hechas). Registro con decisiones y arreglos aplazados: `.superpowers/sdd/2026-09-24-zona-de-estudio/progress.md` (líneas `Ruling:` y `Final:`).
  - Qué hay: pestaña Estudio; en el PC, `npm run local` abre la app en http://127.0.0.1:5174/segundo-cerebro-app/ con chat por asignatura (+ «General») que contesta Claude Code con la suscripción (modo `--restricted`), capturas, y pizarra (texto, fórmula, gráfica, dibujo, imagen, notas de Diego; mover/borrar/notas). Historial de pizarras en `my-context/estudios/<asignatura>/pizarras/`, visible en el móvil y la web. Asignaturas en `estudios/asignaturas.yaml`. Pulidos: casillas instantáneas, hora en el Inicio y contenido junto a la barra lateral (Diego se queda con los dos), arreglos menores de la v1.1.
  - Revisión final hecha (revisor nuevo): sin críticos; los 3 importantes arreglados con prueba; 13 menores aplazados en el registro.
  - Tras la prueba de Diego: × en cada pestaña para borrar una pizarra (el historial se queda, los números no cambian) y ventanas propias de la app en vez de `confirm()`/`prompt()` del navegador (`src/estado/dialogos.ts`, `src/componentes/Dialogos.tsx`). 255 pruebas en verde.
  - **Siguiente:** Diego comprueba en el iPhone la pestaña Estudio y el historial de pizarras.
- **Fase siguiente a la v1.2:** dibujo a mano en la pizarra (tipo de pieza `trazo`: el formato ya lo ignora con aviso). Sigue pendiente; no forma parte de la v1.3.
- **Versión 1.3 (organización) publicada** (2026-09-25), probada por Diego con sus datos en el PC. Diseño: `docs/superpowers/specs/2026-09-25-organizacion-design.md`. Plan: `docs/superpowers/plans/2026-09-25-organizacion.md`. Registro: `.superpowers/sdd/2026-09-25-organizacion/progress.md`.
  - Qué hay: áreas con subáreas (un solo nivel), gestionadas con una ventana (crear, editar, borrar moviendo lo de dentro) desde Calendario, Ajustes y Proyectos. Icono opcional (Tabler) en tareas, ideas y proyectos, sugerido solo a partir del título y cambiable con un buscador (`src/iconos/`, componentes `Icono` y `SelectorIcono`). Ideas ahora en `ideas/ideas.yaml` (título opcional, texto de varias líneas, icono, área y proyecto; se pueden editar), con paso automático desde la antigua `ideas/bandeja.md` la primera vez que se carga la app. Pantalla Proyectos con pestañas Proyectos e Ideas, agrupadas por área y subárea; en el móvil la barra de abajo pierde el botón Ideas y en el PC aparece como desplegable bajo Proyectos en la barra lateral.
  - Revisión final hecha (revisor nuevo): sin críticos; 2 importantes y 10 menores arreglados; menores aplazados en el registro. Las ideas de Diego ya están en `ideas/ideas.yaml` (la bandeja se borró sola) y `my-context/AGENTS.md` explica los formatos nuevos. 349 pruebas en verde.
  - Arreglos tras la prueba de Diego (2026-09-26): borrar proyectos (botón en la página del proyecto; sus tareas e ideas se quedan sin proyecto, `borrarProyecto` en `src/repositorio.ts`), selector de área propio que solo enseña áreas y despliega las subáreas al tocar su área (`SelectorArea.tsx`), y lista de ideas legible en el móvil.
  - **Siguiente:** Diego comprueba la v1.3 en el iPhone y el portátil (la primera vez puede tener que tocar una vez el filtro del calendario). Después, la fase de dibujo a mano en la pizarra (v1.4).

Mantén esta sección al día cuando avances.
