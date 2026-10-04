// Chrome (o Edge si no hay Chrome) con un perfil propio, separado del navegador de Diego.
// La contraseña nunca pasa por aquí: Diego entra en la ventana y el perfil guarda las cookies.
import { chromium, type BrowserContext } from 'playwright-core';
import { esPaginaDeEntrada, SesionCaducada } from '../../src/uni/aula/paginas.ts';
import { ErrorFormato } from '../../src/uni/tipos.ts';

export const BASE_AULA = 'https://www.aulavirtual.urjc.es/moodle';
const ENTRADA = `${BASE_AULA}/login/index.php?authCASattras=CASattras`;
const ESPERA = 60_000;

export interface Descarga { bytes: Uint8Array; nombre: string; tipo?: string }
export interface Navegador {
  sesionValida(): Promise<boolean>;
  pedirTexto(url: string): Promise<string>;
  ajax(sesskey: string, metodo: string, args: Record<string, unknown>): Promise<unknown>;
  descargar(url: string, limite: number): Promise<Descarga | { demasiadoGrande: true; nombre: string }>;
  cerrar(): Promise<void>;
}

async function lanzar(perfil: string, visible: boolean): Promise<BrowserContext> {
  const opciones = { headless: !visible, acceptDownloads: false };
  try {
    return await chromium.launchPersistentContext(perfil, { ...opciones, channel: 'chrome' });
  } catch {
    return await chromium.launchPersistentContext(perfil, { ...opciones, channel: 'msedge' });
  }
}

// Nombre del archivo: el de Content-Disposition o el final de la URL.
export function nombreDeDescarga(url: string, disposicion: string | undefined): string {
  const utf = disposicion && /filename\*=UTF-8''([^;]+)/i.exec(disposicion);
  if (utf) return decodeURIComponent(utf[1]);
  const simple = disposicion && /filename="?([^";]+)"?/i.exec(disposicion);
  if (simple) return simple[1];
  const ultimo = new URL(url).pathname.split('/').pop() ?? 'archivo';
  return decodeURIComponent(ultimo) || 'archivo';
}

export async function abrirNavegador(perfil: string): Promise<Navegador> {
  const ctx = await lanzar(perfil, false);
  const req = ctx.request;
  return {
    async sesionValida() {
      const r = await req.get(`${BASE_AULA}/my/`, { timeout: ESPERA });
      return r.ok() && !esPaginaDeEntrada(r.url());
    },
    async pedirTexto(url) {
      const r = await req.get(url, { timeout: ESPERA });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      if (!r.ok()) throw new ErrorFormato(`el aula virtual contestó ${r.status()}`);
      return r.text();
    },
    async ajax(sesskey, metodo, args) {
      const r = await req.post(`${BASE_AULA}/lib/ajax/service.php?sesskey=${sesskey}&info=${metodo}`, {
        data: [{ index: 0, methodname: metodo, args }], timeout: ESPERA,
      });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      const j = (await r.json().catch(() => null)) as { error?: boolean | string; errorcode?: string; data?: unknown; exception?: { errorcode?: string; message?: string } }[] | { error?: string; errorcode?: string } | null;
      const uno = Array.isArray(j) ? j[0] : j;
      const codigo = uno?.errorcode ?? (uno as { exception?: { errorcode?: string } })?.exception?.errorcode;
      if (codigo === 'servicerequireslogin' || codigo === 'invalidsesskey') throw new SesionCaducada();
      if (!uno || uno.error) throw new ErrorFormato(`el aula virtual no ha contestado a ${metodo} (${codigo ?? 'sin código'})`);
      return (uno as { data?: unknown }).data;
    },
    async descargar(url, limite) {
      const cabeza = await req.head(url, { timeout: ESPERA }).catch(() => null);
      const nombre = nombreDeDescarga(cabeza?.url() ?? url, cabeza?.headers()['content-disposition']);
      if (cabeza && esPaginaDeEntrada(cabeza.url())) throw new SesionCaducada();
      if (Number(cabeza?.headers()['content-length'] ?? 0) > limite) return { demasiadoGrande: true, nombre };
      const r = await req.get(url, { timeout: 5 * ESPERA });
      if (esPaginaDeEntrada(r.url())) throw new SesionCaducada();
      if (!r.ok()) throw new ErrorFormato(`el aula virtual contestó ${r.status()} al descargar`);
      const bytes = new Uint8Array(await r.body());
      if (bytes.length > limite) return { demasiadoGrande: true, nombre };
      return { bytes, nombre: nombreDeDescarga(r.url(), r.headers()['content-disposition']), tipo: r.headers()['content-type'] };
    },
    cerrar: () => ctx.close(),
  };
}

// Abre una ventana en la página de entrada y espera a que Diego esté dentro (o cierre la ventana).
export async function entrar(perfil: string, esperaMaxima = 10 * 60_000): Promise<boolean> {
  const ctx = await lanzar(perfil, true);
  try {
    const pagina = ctx.pages()[0] ?? (await ctx.newPage());
    await pagina.goto(ENTRADA);
    const limite = Date.now() + esperaMaxima;
    while (Date.now() < limite) {
      if (pagina.isClosed()) return false;
      const url = pagina.url();
      if (url.startsWith(BASE_AULA) && !esPaginaDeEntrada(url)) {
        const r = await ctx.request.get(`${BASE_AULA}/my/`);
        if (!esPaginaDeEntrada(r.url())) return true;
      }
      await pagina.waitForTimeout(1000).catch(() => undefined);
    }
    return false;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
