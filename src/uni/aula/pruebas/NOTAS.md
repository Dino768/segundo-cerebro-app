# Páginas de ejemplo del aula virtual (Tarea 1, 2026-10-04)

Sacadas del aula virtual real (Moodle 4.5 de la URJC) y anonimizadas: títulos, nombres y textos inventados; se conserva la estructura que lee `paginas.ts`.

- **Entrada:** `ENTRADA` → `identifica.urjc.es/CAS/login`, botón «Credenciales» (`#saml2_module-Acceso_AzureAD`) → Microsoft Entra → Moodle. Las galletas de `identifica` y de Moodle son de sesión (se pierden al cerrar Chrome); Microsoft deja `ESTSAUTHPERSISTENT` (~90 días). Por eso `sesionValida()` vuelve a entrar sola pulsando ese botón sin ventana.
- **AJAX:** funcionan `core_course_get_enrolled_courses_by_timeline_classification` y `core_courseformat_get_state` (devuelve el JSON como texto). En `cm[]`: `id, name, module, modname, sectionid, url…`; en `section[]`: `id, section, number, title, cmlist…`.
- **Foro de avisos:** se llama «Novedades» en las 10 asignaturas (el otro es «Foro general»). Lista: `tr.discussion[data-discussionid]` con `a[href*="discuss.php?d="][title]`. Hilo: `article[data-post-id]`, `[data-region-content="forum-post-core-subject"]`, `time[datetime]`, `.post-content-container`.
- **Guía docente:** en las 10 asignaturas es una **etiqueta** (`label`) llamada «Guía docente» con un enlace a un PDF (`pluginfile.php/…/mod_label/intro/GuiaDocente_<ASIGNATURA>.pdf`) en la página del curso (`course/view.php?id=<curso>`, dentro de `#module-<id>`). Algunas tienen además un `resource` con «guía» en el nombre.
- **Carpetas:** `a[href*="pluginfile.php"]` con `span.fp-filename`.
- **Tipos de módulo vistos:** forum, label, resource, folder, url, page, assign, feedback, urjcteams.
- **Sesión:** con la re-entrada automática, la sesión dura lo que la galleta de Microsoft (~90 días).
