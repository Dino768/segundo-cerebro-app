import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const { servidor, ocupado } = crearServidor({
  puerto,
  estudios,
  dist: path.join(raiz, 'dist'),
  home: os.homedir(),
  comando: { bin: process.env.CLAUDE_BIN ?? 'claude', previos: [] },
  instrucciones: path.join(aqui, 'instrucciones-estudio.md'),
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
