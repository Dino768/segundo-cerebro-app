import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { aplicarOperacion, pizarraVacia } from '../src/estudio/pizarra.ts';
import type { EventoPizarra } from '../src/estudio/tipos.ts';
import { borrarPizarra, crearPizarra, interpretarCambio, leerPizarra, listarPizarras, operarPizarra, pizarrasNoValidas, rutaPizarra, vigilarPizarras } from './pizarras.ts';

const ID = 'be5aa0c6-9c71-4e9d-8d54-4930d67f1ff3';
const carpetaNueva = () => mkdtempSync(path.join(os.tmpdir(), 'pizarras-'));

describe('pizarras en el disco', () => {
  it('crear, listar y operar', async () => {
    const c = carpetaNueva();
    expect(await crearPizarra(c)).toBe(1);
    expect(await crearPizarra(c)).toBe(2);
    const lista = await listarPizarras(c);
    expect(lista.map((e) => [e.n, e.pizarra?.titulo, e.error])).toEqual([[1, 'Pizarra 1', null], [2, 'Pizarra 2', null]]);
    const p = await operarPizarra(c, 1, { tipo: 'nota', id: null, x: 10, y: 20, contenido: 'Hola' });
    expect(p.piezas).toHaveLength(1);
    expect((await leerPizarra(c, 1)).pizarra?.piezas[0]).toMatchObject({ tipo: 'nota', contenido: 'Hola' });
  });
  it('dos operaciones a la vez se aplican las dos (van en cola)', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await Promise.all([
      operarPizarra(c, 1, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'A' }),
      operarPizarra(c, 1, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'B' }),
    ]);
    expect((await leerPizarra(c, 1)).pizarra?.piezas.map((x) => x.contenido)).toEqual(['A', 'B']);
  });
  it('archivo roto: se enseña la última versión buena con el error, y no se deja operar encima', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await leerPizarra(c, 1); // la recuerda como buena
    writeFileSync(rutaPizarra(c, 1), '{ "version": 1, "piezas": [');
    const e = await leerPizarra(c, 1);
    expect(e.pizarra?.titulo).toBe('Pizarra 1');
    expect(e.error).toMatch(/JSON/);
    await expect(operarPizarra(c, 1, { tipo: 'borrar', id: 'x' })).rejects.toThrow();
    const antes = Date.now() - 5000;
    expect(await pizarrasNoValidas(c, antes)).toEqual([{ n: 1, error: e.error }]);
    expect(await pizarrasNoValidas(c, Date.now() + 5000)).toEqual([]);
  });
  it('borrar una pizarra quita su archivo y deja las demás con su número', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await crearPizarra(c);
    await crearPizarra(c);
    await borrarPizarra(c, 2);
    expect((await listarPizarras(c)).map((e) => e.n)).toEqual([1, 3]);
    await borrarPizarra(c, 2); // ya no estaba: no pasa nada
    expect(await crearPizarra(c)).toBe(4);
  });
  it('guardar en el historial deja una copia base, y fusionar la cambia por la del historial', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    const subida = pizarraVacia('Newton');
    await operarPizarra(c, 1, { tipo: 'guardada', ruta: 'estudios/fisica/pizarras/a.json', subida });
    expect((await leerPizarra(c, 1)).base?.titulo).toBe('Newton');
    const suya = aplicarOperacion(pizarraVacia('Newton'), { tipo: 'nota', id: null, nuevoId: 'd-ipad', x: 0, y: 0, contenido: 'Del iPad' });
    const p = await operarPizarra(c, 1, { tipo: 'fusionar', base: subida, suya });
    expect(p.piezas.map((x) => x.id)).toEqual(['d-ipad']);
    expect(p.guardadaEn).toBe('estudios/fisica/pizarras/a.json');
    expect((await leerPizarra(c, 1)).base?.piezas).toHaveLength(1);
    await borrarPizarra(c, 1);
    expect(existsSync(path.join(c, 'pizarra-1.subida.json'))).toBe(false);
  });
  it('sin copia base, base es null', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    expect((await leerPizarra(c, 1)).base).toBeNull();
  });
  it('una pizarra borrada no reaparece con su última versión buena', async () => {
    const c = carpetaNueva();
    await crearPizarra(c);
    await operarPizarra(c, 1, { tipo: 'nota', id: null, x: 0, y: 0, contenido: 'Vieja' });
    await borrarPizarra(c, 1);
    expect(await crearPizarra(c)).toBe(1);
    writeFileSync(rutaPizarra(c, 1), '{ roto');
    expect((await leerPizarra(c, 1)).pizarra).toBeNull();
  });
});

describe('interpretarCambio', () => {
  it('reconoce pizarras con barras de Windows y de Linux', () => {
    const esperado: EventoPizarra = { tipo: 'pizarra', asignatura: 'fisica', conversacion: ID, n: 2 };
    expect(interpretarCambio(`fisica\\.en-curso\\${ID}\\pizarra-2.json`)).toEqual(esperado);
    expect(interpretarCambio(`fisica/.en-curso/${ID}/pizarra-2.json`)).toEqual(esperado);
  });
  it('ignora lo demás', () => {
    expect(interpretarCambio(`fisica/.en-curso/${ID}/pizarra-2.json.123.tmp`)).toBeNull();
    expect(interpretarCambio(`fisica/.en-curso/${ID}/imagenes/a.png`)).toBeNull();
    expect(interpretarCambio('asignaturas.yaml')).toBeNull();
  });
});

describe('vigilarPizarras', () => {
  it('avisa cuando cambia una pizarra', async () => {
    const estudios = carpetaNueva();
    const carpeta = path.join(estudios, 'fisica', '.en-curso', ID);
    mkdirSync(carpeta, { recursive: true });
    const eventos: EventoPizarra[] = [];
    const parar = vigilarPizarras(estudios, (e) => eventos.push(e));
    await new Promise((r) => setTimeout(r, 200));
    writeFileSync(path.join(carpeta, 'pizarra-1.json'), '{}');
    await expect.poll(() => eventos.length, { timeout: 3000 }).toBeGreaterThan(0);
    expect(eventos[0]).toEqual({ tipo: 'pizarra', asignatura: 'fisica', conversacion: ID, n: 1 });
    parar();
  });
});
