// Genera los iconos de Tabler que usa la app:
// - public/iconos/tabler.json: la colección completa (no se sube; se genera antes de dev y build).
// - src/iconos/basicos.ts: solo los del diccionario, que van dentro de la app (sí se sube).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DICCIONARIO } from '../src/iconos/diccionario.ts';

const base = new URL('../node_modules/@tabler/icons/', import.meta.url);
const nodos = JSON.parse(readFileSync(new URL('tabler-nodes-outline.json', base), 'utf8')) as Record<string, [string, Record<string, string>][]>;
const info = JSON.parse(readFileSync(new URL('icons.json', base), 'utf8')) as Record<string, { tags?: unknown[]; styles?: { outline?: unknown } }>;

// Solo lo que hace falta para dibujar: se quitan atributos como "key".
const limpio = (ns: [string, Record<string, string>][]) =>
  ns.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key'))]);

const coleccion: Record<string, { n: unknown; t: string[] }> = {};
for (const [nombre, ns] of Object.entries(nodos)) {
  coleccion[nombre] = { n: limpio(ns), t: (info[nombre]?.tags ?? []).map(String) };
}
mkdirSync(new URL('../public/iconos/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/iconos/tabler.json', import.meta.url), JSON.stringify(coleccion));

const usados = [...new Set(DICCIONARIO.map((e) => e.icono))].sort();
const faltan = usados.filter((n) => !nodos[n]);
if (faltan.length) throw new Error(`Estos iconos del diccionario no existen en Tabler: ${faltan.join(', ')}`);
const basicos = Object.fromEntries(usados.map((n) => [n, limpio(nodos[n])]));
writeFileSync(
  new URL('../src/iconos/basicos.ts', import.meta.url),
  `// Generado por scripts/iconos.ts: no lo edites a mano.\nimport type { Nodo } from './diccionario';\n\nexport const BASICOS: Record<string, Nodo[]> = ${JSON.stringify(basicos, null, 1)};\n`,
);
console.log(`Iconos: ${Object.keys(coleccion).length} en la colección, ${usados.length} básicos.`);
