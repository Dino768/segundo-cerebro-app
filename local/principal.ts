import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const { servidor } = crearServidor({
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
  console.log(`\nZona de estudio lista: http://127.0.0.1:${puerto}/segundo-cerebro-app/`);
  console.log(`Apuntes y pizarras en: ${estudios}`);
  console.log('Para cerrarla, pulsa Ctrl+C en esta ventana.\n');
});
