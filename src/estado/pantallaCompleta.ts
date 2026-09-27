import { useCallback, useEffect, useRef, useState } from 'react';

// Esc sale de la pantalla completa, salvo si se está escribiendo (ahí Esc cancela lo escrito).
export const escSale = (tecla: string, etiqueta?: string) => tecla === 'Escape' && etiqueta !== 'TEXTAREA' && etiqueta !== 'INPUT';

// La pizarra ocupa toda la ventana. Donde el navegador deja (PC, iPad), también se ocultan sus barras.
// En el iPhone no hay requestFullscreen: solo se tapa la app, que es lo que se puede.
export function usePantallaCompleta() {
  const [activa, setActiva] = useState(false);
  const nativa = useRef(false); // el navegador está en su pantalla completa porque la pedimos

  const salir = useCallback(() => {
    setActiva(false);
    if (nativa.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    nativa.current = false;
  }, []);

  const entrar = useCallback(() => {
    setActiva(true);
    const raiz = document.documentElement;
    if (typeof raiz.requestFullscreen === 'function')
      raiz.requestFullscreen().then(
        () => {
          nativa.current = true;
        },
        () => undefined,
      );
  }, []);

  useEffect(() => {
    if (!activa) return;
    // Si el navegador sale solo de su pantalla completa (Esc, gesto), la app también sale.
    const alCambiar = () => {
      if (nativa.current && !document.fullscreenElement) {
        nativa.current = false;
        setActiva(false);
      }
    };
    const alTecla = (e: KeyboardEvent) => {
      if (escSale(e.key, (e.target as HTMLElement | null)?.tagName)) salir();
    };
    document.addEventListener('fullscreenchange', alCambiar);
    window.addEventListener('keydown', alTecla);
    document.body.classList.add('con-pantalla-completa');
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar);
      window.removeEventListener('keydown', alTecla);
      document.body.classList.remove('con-pantalla-completa');
    };
  }, [activa, salir]);

  // Al irse de la pantalla (otra pestaña de la app), se sale del todo.
  useEffect(
    () => () => {
      if (nativa.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  return { activa, alternar: activa ? salir : entrar, salir };
}
