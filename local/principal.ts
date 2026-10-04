import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUTA_AULA_SINCRONIZACION } from '../src/datos/rutas.ts';
import { parseSincronizacionAula } from '../src/uni/aula/estado.ts';
import { preguntarClaude } from './aula/claude.ts';
import { crearGit } from './aula/git.ts';
import { abrirNavegador, entrar } from './aula/navegador.ts';
import { crearAula } from './aula/programador.ts';
import { revisarAula } from './aula/revision.ts';
import { textoDe } from './aula/texto.ts';
import { debeReiniciar, leerCommit, SALIDA_REINICIAR } from './reinicio.ts';
import { crearServidor } from './servidor.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const puerto = Number(process.env.PUERTO ?? 5174);
const myContext = path.resolve(process.env.MY_CONTEXT ?? path.join(raiz, '..', 'my-context'));

if (!existsSync(myContext)) {
  console.error(`No encuentro my-context en ${myContext}.`);
  console.error('Descárgalo al lado de segundo-cerebro-app o indica dónde está con la variable MY_CONTEXT.');
  process.exit(1);
}

const estudios = path.join(myContext, 'estudios');
const carpetaPrograma = path.join(os.homedir(), '.segundo-cerebro');
const perfilAula = path.join(carpetaPrograma, 'navegador-aula');
const comando = { bin: process.env.CLAUDE_BIN ?? 'claude', previos: [] };
const instruccionesFechas = path.join(aqui, 'aula', 'instrucciones-fechas.md');
const aula = crearAula({
  config: path.join(carpetaPrograma, 'aula-virtual.json'),
  ahora: () => new Date(),
  leerEstado: async () => parseSincronizacionAula(await readFile(path.join(myContext, ...RUTA_AULA_SINCRONIZACION.split('/')), 'utf8').catch(() => null)).estado,
  entrar: () => entrar(perfilAula),
  revisar: async () => {
    const r = await revisarAula({
      carpeta: myContext, ahora: new Date(), navegador: () => abrirNavegador(perfilAula),
      preguntar: (modelo, texto) => preguntarClaude(comando, modelo, instruccionesFechas, texto, os.tmpdir()),
      textoDe, git: crearGit(myContext),
    });
    console.log(`Aula virtual: ${r.mensaje}`);
    return r;
  },
});
const { servidor, ocupado } = crearServidor({
  puerto,
  estudios,
  dist: path.join(raiz, 'dist'),
  home: os.homedir(),
  comando,
  instrucciones: path.join(aqui, 'instrucciones-estudio.md'),
  aula,
});

servidor.on('error', (e: NodeJS.ErrnoException) => {
  console.error(
    e.code === 'EADDRINUSE' ? `El puerto ${puerto} ya está en uso: ¿tienes otra ventana con la zona de estudio abierta?` : e.message,
  );
  process.exit(1);
});
servidor.listen(puerto, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${puerto}/segundo-cerebro-app/`;
  console.log(`\nZona de estudio lista: ${url}`);
  // Con el acceso directo del escritorio se abre sola en el navegador.
  if (process.env.ABRIR_NAVEGADOR === '1' && process.platform === 'win32') spawn('explorer.exe', [url], { detached: true, stdio: 'ignore' }).unref();
  console.log(`Apuntes y pizarras en: ${estudios}`);
  console.log('Para cerrarla, pulsa Ctrl+C en esta ventana.\n');
});

// Cada 30 segundos se mira si el código se ha actualizado. Arrancado desde scripts/zona-de-estudio.bat
// (al encender Windows o con el acceso directo), el programa sale para que el .bat lo vuelva a arrancar con lo nuevo.
const gitDir = path.join(raiz, '.git');
const commitInicial = leerCommit(gitDir);
let avisado = false;
setInterval(() => {
  if (!debeReiniciar(commitInicial, leerCommit(gitDir), ocupado())) return;
  if (process.env.ZONA_AUTOMATICA === '1') {
    console.log('Hay una versión nueva de la app: reiniciando la zona de estudio…');
    process.exit(SALIDA_REINICIAR);
  }
  if (!avisado) console.log('Hay una versión nueva de la app: cierra esta ventana (Ctrl+C) y vuelve a abrir la zona de estudio.');
  avisado = true;
}, 30_000).unref();

// Aula virtual: al arrancar (tras un minuto, para no frenar el arranque de Windows) y luego cada hora.
setTimeout(() => void aula.comprobar(), 60_000).unref();
setInterval(() => void aula.comprobar(), 60 * 60_000).unref();
