import { describe, expect, it } from 'vitest';
import { TIPOS } from '../datos/tareas';
import { BASICOS } from '../iconos/basicos';
import { CAMPOS_TIPO, ICONO_TIPO, NOMBRE_TIPO, PLURAL_TIPO, tipoDe } from './tipos';

describe('tipos de tarea', () => {
  it('sin tipo es una tarea', () => {
    expect(tipoDe({})).toBe('tarea');
    expect(tipoDe({ tipo: 'examen' })).toBe('examen');
  });
  it('cada tipo tiene nombre, plural, campos e icono básico (se ve sin conexión)', () => {
    for (const t of TIPOS) {
      expect(NOMBRE_TIPO[t]).toBeTruthy();
      expect(PLURAL_TIPO[t]).toBeTruthy();
      expect(CAMPOS_TIPO[t]).toBeDefined();
      expect(BASICOS[ICONO_TIPO[t]]).toBeDefined();
    }
  });
  it('recados y eventos no tienen prioridad; exámenes y entregas no se repiten', () => {
    expect(CAMPOS_TIPO.recado).toEqual({ prioridad: false, hora: false, repetir: false, proyecto: false, notas: false });
    expect(CAMPOS_TIPO.evento.prioridad).toBe(false);
    expect(CAMPOS_TIPO.evento.repetir).toBe(true);
    expect(CAMPOS_TIPO.examen.repetir).toBe(false);
    expect(CAMPOS_TIPO.entrega.repetir).toBe(false);
  });
});
