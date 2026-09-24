import { describe, expect, it } from 'vitest';
import { crearLectorLineas } from './local';

describe('crearLectorLineas', () => {
  it('junta los trozos que llegan partidos y entrega línea a línea', () => {
    const lineas: string[] = [];
    const leer = crearLectorLineas((l) => lineas.push(l));
    leer('{"a":');
    leer('1}\n{"b"');
    leer(':2}\n\n');
    leer('{"c":3}');
    expect(lineas).toEqual(['{"a":1}', '{"b":2}']);
    leer.fin();
    expect(lineas).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });
});
