import { describe, expect, it } from 'vitest';
import { parseAreas } from '../datos/areas';
import type { Tarea } from '../datos/tareas';
import { arbolPorAreas, gruposAhora, proximosExamenes, urgentes } from './grupos';

const HOY = '2026-10-01'; // jueves
const t = (x: Partial<Tarea> & { id: string }): Tarea => ({ titulo: x.id, area: 'personal', ...x });
const ids = (ts: Tarea[]) => ts.map((x) => x.id);

const AREAS = parseAreas(
  '- id: uni\n  nombre: Uni\n  color: "#a855f7"\n  subareas:\n    - id: calculo\n      nombre: Cálculo\n      color: "#36ace7"\n'
  + '- id: personal\n  nombre: Personal\n  color: "#3b82f6"\n',
);

describe('gruposAhora', () => {
  const ts = [
    t({ id: 'atrasada', fecha: '2026-09-28' }),
    t({ id: 'hoy', fecha: HOY }),
    t({ id: 'boxeo', tipo: 'evento', repetir: ['jue'], hora: '19:00' }),
    t({ id: 'examen-cerca', tipo: 'examen', area: 'calculo', fecha: '2026-10-15' }),
    t({ id: 'examen-junio', tipo: 'examen', area: 'calculo', fecha: '2027-06-09' }),
    t({ id: 'entrega-cerca', tipo: 'entrega', area: 'calculo', fecha: '2026-10-05' }),
    t({ id: 'futura', fecha: '2026-11-20' }),
    t({ id: 'recado', tipo: 'recado' }),
    t({ id: 'recado-hoy', tipo: 'recado', fecha: HOY }),
    t({ id: 'sin-fecha' }),
    t({ id: 'hecha', fecha: '2026-11-01', hecha: true }),
  ];
  const g = gruposAhora(ts, HOY);
  const de = (clave: string) => ids(g.find((x) => x.clave === clave)?.tareas ?? []);

  it('reparte cada cosa en su grupo, en orden', () => {
    expect(g.map((x) => x.clave)).toEqual(['atrasadas', 'hoy', 'seAcerca', 'proximas', 'recados', 'repiten', 'sinFecha']);
    expect(de('atrasadas')).toEqual(['atrasada']);
    expect(de('hoy')).toEqual(['boxeo', 'hoy', 'recado-hoy']);
    expect(de('seAcerca')).toEqual(['entrega-cerca', 'examen-cerca']);
    expect(de('proximas')).toEqual(['futura']);
    expect(de('recados')).toEqual(['recado']);
    expect(de('repiten')).toEqual(['boxeo']);
    expect(de('sinFecha')).toEqual(['sin-fecha']);
  });
  it('el examen de junio no está en ningún grupo de Ahora', () => {
    expect(g.flatMap((x) => ids(x.tareas))).not.toContain('examen-junio');
  });
  it('los grupos vacíos no salen', () => {
    expect(gruposAhora([t({ id: 'solo', fecha: HOY })], HOY).map((x) => x.clave)).toEqual(['hoy']);
    expect(gruposAhora([], HOY)).toEqual([]);
  });
  it('«Se repiten» y «Sin fecha» empiezan plegados', () => {
    expect(g.filter((x) => x.plegado).map((x) => x.clave)).toEqual(['repiten', 'sinFecha']);
  });
});

describe('arbolPorAreas', () => {
  it('área → subárea → tipo, con recuentos y solo lo pendiente', () => {
    const ts = [
      t({ id: 'ex-junio', tipo: 'examen', area: 'calculo', fecha: '2027-06-09' }),
      t({ id: 'ex-enero', tipo: 'examen', area: 'calculo', fecha: '2027-01-21' }),
      t({ id: 'ejercicios', area: 'calculo' }),
      t({ id: 'uni-general', area: 'uni' }),
      t({ id: 'hecha', area: 'calculo', hecha: true }),
      t({ id: 'evento-pasado', tipo: 'evento', fecha: '2026-09-01' }),
      t({ id: 'repe-terminada', repetir: ['lun'], hasta: '2026-09-30' }),
      t({ id: 'huevos', tipo: 'recado' }),
      t({ id: 'ex-pasado', tipo: 'examen', area: 'calculo', fecha: '2026-09-20' }),
    ];
    const arbol = arbolPorAreas(ts, AREAS, HOY);
    expect(arbol.map((a) => [a.id, a.total])).toEqual([['uni', 4], ['personal', 1]]);
    const uni = arbol[0];
    expect(uni.tipos.map((r) => [r.tipo, ids(r.tareas)])).toEqual([['tarea', ['uni-general']]]);
    expect(uni.subareas.map((s) => [s.id, s.nombre, s.total])).toEqual([['calculo', 'Cálculo', 3]]);
    expect(uni.subareas[0].tipos.map((r) => [r.tipo, ids(r.tareas)])).toEqual([
      ['tarea', ['ejercicios']],
      ['examen', ['ex-enero', 'ex-junio']],
    ]);
    expect(arbol[1].tipos.map((r) => r.tipo)).toEqual(['recado']);
  });
  it('sin nada pendiente, árbol vacío', () => {
    expect(arbolPorAreas([t({ id: 'h', hecha: true })], AREAS, HOY)).toEqual([]);
  });
});

describe('proximosExamenes y urgentes', () => {
  const ts = [
    t({ id: 'e3', tipo: 'examen', fecha: '2027-01-21' }),
    t({ id: 'e1', tipo: 'examen', fecha: '2026-10-05' }),
    t({ id: 'e2', tipo: 'examen', fecha: '2026-11-10' }),
    t({ id: 'e4', tipo: 'examen', fecha: '2027-05-12' }),
    t({ id: 'pasado', tipo: 'examen', fecha: '2026-09-20' }),
    t({ id: 'hecho', tipo: 'examen', fecha: '2026-10-02', hecha: true }),
    t({ id: 'entrega', tipo: 'entrega', fecha: '2026-10-03' }),
  ];
  it('los 3 exámenes pendientes más cercanos desde hoy', () => {
    expect(ids(proximosExamenes(ts, HOY))).toEqual(['e1', 'e2', 'e3']);
  });
  it('urgentes: exámenes y entregas en prioridad alta, después de hoy', () => {
    expect(ids(urgentes(ts, HOY))).toEqual(['entrega', 'e1']);
  });
});
