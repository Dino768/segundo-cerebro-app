export type Tramo = { x: number; y: number }[];

// Calcula los puntos de una curva. Se parte en tramos donde no existe o da un salto (como 1/x en 0).
export function muestrear(f: (x: number) => number, [x0, x1]: [number, number], [y0, y1]: [number, number], n = 240): Tramo[] {
  const alto = y1 - y0;
  const tramos: Tramo[] = [];
  let actual: Tramo = [];
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const y = f(x);
    const dentro = Number.isFinite(y) && y > y0 - alto * 4 && y < y1 + alto * 4;
    const salto = dentro && actual.length > 0 && Math.abs(y - actual[actual.length - 1].y) > alto * 2;
    if (!dentro || salto) {
      if (actual.length > 1) tramos.push(actual);
      actual = dentro ? [{ x, y }] : [];
      continue;
    }
    actual.push({ x, y });
  }
  if (actual.length > 1) tramos.push(actual);
  return tramos;
}

// Números redondos (1, 2, 5, 10…) para las marcas de un eje.
export function marcas(a: number, b: number, objetivo = 6): number[] {
  const bruto = (b - a) / objetivo;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((k) => k * potencia).find((p) => p >= bruto * 0.999) ?? 10 * potencia;
  const res: number[] = [];
  for (let k = Math.ceil(a / paso - 1e-9); k * paso <= b + paso * 1e-9; k++) res.push(Number((k * paso).toPrecision(12)));
  return res;
}
