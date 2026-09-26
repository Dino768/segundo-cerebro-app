import { useCallback, useMemo, useRef, useState } from 'react';
import { activaInicial, activaVisible } from '../../estudio/capas';
import { deshacer as sacarDeshacer, pilaVacia, registrar, rehacer as sacarRehacer, type Pila } from '../../estudio/deshacer';
import { CLAVE_HERRAMIENTAS, claveOcultas, leerHerramientas, leerOcultas, type EstadoHerramientas } from '../../estudio/herramientas';
import { aplicarOperacion, type Operacion, type Pizarra } from '../../estudio/pizarra';
import { guardarPreferencia, leerPreferencia } from '../../estudio/preferencias';

// Estado de una pizarra que Diego edita: lo que se ve (con lo que aún se está guardando), deshacer, herramientas y capas.
export function usePizarraEditable(pizarra: Pizarra, clave: string, alOperar?: (op: Operacion) => Promise<unknown>) {
  const [pendientes, setPendientes] = useState<{ n: number; op: Operacion }[]>([]);
  const contador = useRef(0);
  // Lo que se ve: la pizarra más las operaciones que aún no han vuelto (se ven al momento).
  const mostrada = useMemo(() => pendientes.reduce((p, x) => aplicarOperacion(p, x.op), pizarra), [pizarra, pendientes]);
  const actual = useRef(mostrada);
  actual.current = mostrada;
  const [pila, setPila] = useState<Pila>(pilaVacia);
  const pilaActual = useRef(pila);
  const [herramientas, setHerramientasEstado] = useState(() => leerHerramientas(leerPreferencia(CLAVE_HERRAMIENTAS)));
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(() => new Set(leerOcultas(leerPreferencia(claveOcultas(clave)))));
  const [elegida, setElegida] = useState(() => activaInicial(pizarra.capas));
  const activa = activaVisible(mostrada.capas, ocultas, elegida);

  const enviar = useCallback(
    (op: Operacion) => {
      if (!alOperar) return;
      const n = ++contador.current;
      setPendientes((ps) => [...ps, { n, op }]);
      void alOperar(op).finally(() => setPendientes((ps) => ps.filter((x) => x.n !== n)));
    },
    [alOperar],
  );

  const cambiarPila = (nueva: Pila) => {
    pilaActual.current = nueva;
    setPila(nueva);
  };

  // Una operación de Diego: se ve al momento, se guarda y se puede deshacer.
  const hacer = useCallback(
    (op: Operacion) => {
      cambiarPila(registrar(pilaActual.current, actual.current, op));
      actual.current = aplicarOperacion(actual.current, op);
      enviar(op);
    },
    [enviar],
  );

  const deshacer = useCallback(() => {
    const r = sacarDeshacer(pilaActual.current);
    if (!r) return;
    cambiarPila(r.pila);
    actual.current = aplicarOperacion(actual.current, r.op);
    enviar(r.op);
  }, [enviar]);

  const rehacer = useCallback(() => {
    const r = sacarRehacer(pilaActual.current, actual.current);
    if (!r) return;
    cambiarPila(r.pila);
    actual.current = aplicarOperacion(actual.current, r.op);
    enviar(r.op);
  }, [enviar]);

  const setHerramientas = useCallback((h: EstadoHerramientas) => {
    setHerramientasEstado(h);
    guardarPreferencia(CLAVE_HERRAMIENTAS, JSON.stringify(h));
  }, []);

  // Mostrar u ocultar lo recuerda este dispositivo (no se guarda en GitHub).
  const alternarOculta = useCallback(
    (id: string) =>
      setOcultas((o) => {
        const n = new Set(o);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        guardarPreferencia(claveOcultas(clave), JSON.stringify([...n]));
        return n;
      }),
    [clave],
  );

  return {
    mostrada, hacer, deshacer, rehacer,
    puedeDeshacer: pila.hechas.length > 0, puedeRehacer: pila.deshechas.length > 0,
    herramientas, setHerramientas, ocultas, alternarOculta, activa, elegir: setElegida,
  };
}
