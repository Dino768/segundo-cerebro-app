// Tarea 1 del plan del aula virtual: entrar (con ventana), comprobar la sesión y guardar páginas de ejemplo
// para las pruebas. Lo guardado se anonimiza A MANO antes de añadirlo a Git (nombres, correos, textos de avisos).
// Uso: node scripts/aula-prueba.ts <codigo de una asignatura, p. ej. 2327007> [--sin-entrar]
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { abrirNavegador, BASE_AULA, entrar } from '../local/aula/navegador.ts';
import { leerSesskey } from '../src/uni/aula/paginas.ts';

const perfil = path.join(os.homedir(), '.segundo-cerebro', 'navegador-aula');
const salida = path.join(os.tmpdir(), 'aula-prueba');
const codigo = process.argv[2];
if (!codigo) throw new Error('Falta el código de una asignatura');

if (!process.argv.includes('--sin-entrar')) {
  console.log('Se abre una ventana: entra al aula virtual y marca «No solicitar de nuevo el doble factor».');
  console.log(await entrar(perfil) ? 'Dentro.' : 'No se ha podido entrar.');
}
const nav = await abrirNavegador(perfil);
try {
  console.log('¿Sesión válida sin ventana?', await nav.sesionValida());
  const sesskey = leerSesskey(await nav.pedirTexto(`${BASE_AULA}/my/`));
  await mkdir(salida, { recursive: true });
  const cursos = await nav.ajax(sesskey, 'core_course_get_enrolled_courses_by_timeline_classification',
    { offset: 0, limit: 0, classification: 'all', sort: 'fullname' });
  await writeFile(path.join(salida, 'cursos.json'), JSON.stringify(cursos, null, 2));
  const curso = (cursos as { courses: { id: number; shortname: string }[] }).courses.find((c) => c.shortname.includes(codigo));
  if (!curso) throw new Error('No encuentro el curso con ese código');
  const estado = await nav.ajax(sesskey, 'core_courseformat_get_state', { courseid: curso.id });
  await writeFile(path.join(salida, 'estado-curso.json'), typeof estado === 'string' ? estado : JSON.stringify(estado));
  await writeFile(path.join(salida, 'curso.html'), await nav.pedirTexto(`${BASE_AULA}/course/view.php?id=${curso.id}`));
  console.log(`Guardado en ${salida}. Ahora: buscar el foro de avisos, un hilo, una carpeta y la guía docente en estado-curso.json`);
  console.log('y pedirlos con: node scripts/aula-prueba.ts', codigo, '--sin-entrar (o a mano con pedirTexto).');
} finally {
  await nav.cerrar();
}
