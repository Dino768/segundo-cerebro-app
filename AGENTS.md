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

## Estado actual
Última actualización: 2026-09-23.
- Tasks 0 a 8 del plan: terminadas (78 pruebas automáticas pasando).
- Tasks 9 a 13 (pantallas): código hecho y guardado en commits. Falta la **prueba manual en el navegador con Diego**: él crea su token *fine-grained* (solo `my-context`, "Contents: Read and write") y lo pega en Ajustes. Después se recorren los pasos de prueba manual de las Tasks 9 a 13 del plan.
- Pendiente después: Task 14 (PWA y publicación en GitHub Pages; hay que pedir permiso a Diego antes del `git push`), Task 15 (prueba final en sus dispositivos), la revisión final de todo el código y actualizar `../my-context/proyectos/segundo-cerebro.md`.

Mantén esta sección al día cuando avances.
