import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Aviso } from '../../datos/avisos';
import { ListaAvisos, ListaMateriales } from './AulaVirtual';

const asignaturas = [{ id: 'calculo', nombre: 'Cálculo', color: '#36ace7', codigo: '2327007' }];
const av = (id: string, x: Partial<Aviso> = {}): Aviso => ({ id, asignatura: 'calculo', fecha: '2026-10-03', titulo: `Título ${id}`, texto: 'Línea 1\nLínea 2', importante: false, leido: false, ...x });

describe('avisos', () => {
  it('más nuevos arriba, importantes destacados, con su asignatura y enlace', () => {
    const html = renderToString(<ListaAvisos avisos={[av('a', { fecha: '2026-10-01' }), av('b', { importante: true, enlace: 'https://x/b' })]} asignaturas={asignaturas} marcar={() => undefined} desmarcar={() => undefined} />);
    expect(html.indexOf('Título b')).toBeLessThan(html.indexOf('Título a'));
    expect(html).toContain('aviso importante');
    expect(html).toContain('Cálculo');
    expect(html).toContain('href="https://x/b"');
    expect(html).toContain('Marcar todos como leídos');
  });
  it('sin avisos', () => {
    expect(renderToString(<ListaAvisos avisos={[]} asignaturas={asignaturas} marcar={() => undefined} desmarcar={() => undefined} />)).toContain('No hay avisos');
  });
  it('los leídos se pueden desleer', () => {
    const html = renderToString(<ListaAvisos avisos={[av('a', { leido: true })]} asignaturas={asignaturas} marcar={() => undefined} desmarcar={() => undefined} />);
    expect(html).toContain('Marcar como no leído');
    expect(html).not.toContain('Marcar todos como leídos');
  });
});

describe('materiales', () => {
  const aula = { actualizado: '2026-10-04', secciones: [{ nombre: 'Tema 1', materiales: [
    { id: '1', nombre: 'Apuntes', tipo: 'pdf' as const, enlace: 'https://x/1', archivo: 'Tema 1/Apuntes.pdf' },
    { id: '2', nombre: 'Viejo', tipo: 'pdf' as const, enlace: 'https://x/2', retirado: true },
  ] }] };
  it('en el PC abre el archivo descargado; fuera, el aula virtual', () => {
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc />)).toContain('api/local/aula/material?asignatura=calculo&amp;archivo=Tema+1%2FApuntes.pdf');
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc={false} />)).toContain('href="https://x/1"');
  });
  it('los retirados salen tachados', () => {
    expect(renderToString(<ListaMateriales aula={aula} asignatura="calculo" enPc={false} />)).toContain('<s>Viejo</s>');
  });
  it('sin lista todavía', () => {
    expect(renderToString(<ListaMateriales aula={null} asignatura="calculo" enPc={false} />)).toContain('Todavía no hay materiales');
  });
});
