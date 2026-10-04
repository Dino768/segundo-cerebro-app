// Chrome (o Edge si no hay Chrome) con un perfil propio, separado del navegador de Diego.
// La contraseña nunca pasa por aquí: Diego entra en la ventana y el perfil guarda las cookies.
import { chromium, type BrowserContext } from 'playwright-core';
import { esPaginaDeEntrada, SesionCaducada } from '../../src/uni/aula/paginas.ts';
import { ErrorFormato } from '../../src/uni/tipos.ts';

export const BASE_AULA = 'https://www.aulavirtual.urjc.es/moodle';
const ENTRADA = `${BASE_AULA}/login/index.php?authCASattras=CASattras`;
const ESPERA = 60_000;
// Botón «Credenciales» de la página de entrada de la URJC: entra con la galleta persistente de Microsoft.
export const BOTON_CREDENCIALES = '#saml2_module-Acceso_AzureAD';

// ¿Estamos ya dentro de Moodle (y no en la entrada ni en Microsoft)?
export function enMoodle(url: string): boolean {
  return url.startsWith(BASE_AULA) && !esPaginaDeEntrada(url) && !url.includes('login.microsoftonline.com');
}

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
  const decodificar = (t: string) => {
    try { return decodeURIComponent(t); } catch { return t; }
  };
  const utf = disposicion && /filename\*=UTF-8''([^;]+)/i.exec(disposicion);
  if (utf) return decodificar(utf[1]);
  const simple = disposicion && /filename="?([^";]+)"?/i.exec(disposicion);
  if (simple) return simple[1];
  let ultimo: string | undefined;
  try { ultimo = new URL(url).pathname.split('/').pop(); } catch { ultimo = url.split(/[?#]/)[0].split('/').pop(); }
  return decodificar(ultimo ?? '') || 'archivo';
}

export const NO_RESPONDE = 'el aula virtual no responde (mantenimiento o sin conexión)';

// ¿Sigue abierta la sesión? false solo si /my/ lleva a la entrada y volver a entrar solo no funciona.
// Sin conexión o con el aula caída (5xx) lanza ErrorFormato: eso no es una sesión caducada.
export async function validarSesion(pedirMy: () => Promise<{ status: number; url: string }>, reentrar: () => Promise<void>): Promise<boolean> {
  const comprobar = async () => {
    let r: { status: number; url: string };
    try {
      r = await pedirMy();
    } catch {
      throw new ErrorFormato(NO_RESPONDE);
    }
    if (esPaginaDeEntrada(r.url) || r.url.includes('login.microsoftonline.com')) return false;
    if (r.status >= 500) throw new ErrorFormato(NO_RESPONDE);
    if (r.status < 200 || r.status >= 300) throw new ErrorFormato(`el aula virtual contestó ${r.status}`);
    return true;
  };
  if (await comprobar()) return true;
  await reentrar().catch(() => undefined); // lo decide la comprobación de después
  return comprobar();
}

export async function abrirNavegador(perfil: string): Promise<Navegador> {
  const ctx = await lanzar(perfil, false);
  const req = ctx.request;
  return {
    // Las galletas de la URJC y de Moodle mueren al cerrar Chrome; la de Microsoft dura meses.
    // Si /my/ no vale, se intenta volver a entrar solo pulsando «Credenciales».
    sesionValida: () => validarSesion(
      async () => {
        const r = await req.get(`${BASE_AULA}/my/`, { timeout: ESPERA });
        return { status: r.status(), url: r.url() };
      },
      async () => {
        const pagina = await ctx.newPage();
        try {
          await pagina.goto(ENTRADA);
          const boton = await pagina.$(BOTON_CREDENCIALES);
          if (boton) await boton.click();
          const limite = Date.now() + 30_000;
          while (Date.now() < limite && !enMoodle(pagina.url())) await pagina.waitForTimeout(1000);
        } finally {
          await pagina.close().catch(() => undefined);
        }
      },
    ),
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
      if (enMoodle(url)) {
        const r = await ctx.request.get(`${BASE_AULA}/my/`).catch(() => null);
        if (!r) return false;
        if (!esPaginaDeEntrada(r.url())) return true;
      }
      await pagina.waitForTimeout(1000).catch(() => undefined);
    }
    return false;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
