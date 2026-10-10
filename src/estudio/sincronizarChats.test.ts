import { describe, expect, it } from 'vitest';
import { decidir } from './sincronizarChats';

const e = (version: string, pendiente = false) => ({ version, pendiente, compartidoEl: '2026-10-10' });

describe('decidir', () => {
  it('nuevo en GitHub → bajar', () => expect(decidir({}, [{ id: 'a', version: 'v1' }])).toEqual([{ tipo: 'bajar', id: 'a', version: 'v1' }]));
  it('igual y sin pendiente → nada', () => expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v1' }])).toEqual([]));
  it('pendiente y sin cambios en GitHub → subir', () => expect(decidir({ a: e('v1', true) }, [{ id: 'a', version: 'v1' }])).toEqual([{ tipo: 'subir', id: 'a' }]));
  it('cambiado en GitHub y sin pendiente → bajar', () => expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v2' }])).toEqual([{ tipo: 'bajar', id: 'a', version: 'v2' }]));
  it('cambiado en los dos sitios → conflicto', () => expect(decidir({ a: e('v1', true) }, [{ id: 'a', version: 'v2' }])).toEqual([{ tipo: 'conflicto', id: 'a', version: 'v2' }]));
  it('ya no está en GitHub y sin pendiente → borrar-local', () => expect(decidir({ a: e('v1') }, [])).toEqual([{ tipo: 'borrar-local', id: 'a' }]));
  it('ya no está en GitHub y con pendiente → olvidar (queda como no compartido)', () => expect(decidir({ a: e('v1', true) }, [])).toEqual([{ tipo: 'olvidar', id: 'a' }]));
  it('aún no subido nunca (version vacía) → subir, esté o no en GitHub', () => {
    expect(decidir({ a: e('', true) }, [])).toEqual([{ tipo: 'subir', id: 'a' }]);
    expect(decidir({ a: e('', true) }, [{ id: 'a', version: 'v9' }])).toEqual([{ tipo: 'subir', id: 'a' }]);
  });
  it('un chat en el que Claude está contestando no se toca', () => {
    expect(decidir({ a: e('v1') }, [{ id: 'a', version: 'v2' }, { id: 'b', version: 'v1' }], (id) => id === 'a')).toEqual([{ tipo: 'bajar', id: 'b', version: 'v1' }]);
  });
});
