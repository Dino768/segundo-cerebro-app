// Intérprete propio de expresiones para las gráficas: nunca se ejecuta código (nada de eval).
// Entiende + - * / ^ (y ** · ×), paréntesis, multiplicación sin signo (2x, 2(x+1)),
// x, pi, e y las funciones de FUNCIONES.
export class ErrorExpresion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorExpresion';
  }
}

type Nodo = (x: number) => number;
type Token = { t: 'num'; v: number; p: number } | { t: 'id'; v: string; p: number } | { t: 'op'; v: string; p: number };

const FUNCIONES: Record<string, (v: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
};
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };

function trocear(texto: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    const resto = texto.slice(i);
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(resto);
    if (num) {
      tokens.push({ t: 'num', v: Number(num[1]), p: i });
      i += num[1].length;
      continue;
    }
    const id = /^[a-zA-Z]+/.exec(resto);
    if (id) {
      tokens.push({ t: 'id', v: id[0].toLowerCase(), p: i });
      i += id[0].length;
      continue;
    }
    if (resto.startsWith('**')) {
      tokens.push({ t: 'op', v: '^', p: i });
      i += 2;
      continue;
    }
    const equivalente: Record<string, Token> = { '·': { t: 'op', v: '*', p: i }, '×': { t: 'op', v: '*', p: i }, '−': { t: 'op', v: '-', p: i }, 'π': { t: 'id', v: 'pi', p: i } };
    if ('+-*/^()'.includes(c)) tokens.push({ t: 'op', v: c, p: i });
    else if (Object.hasOwn(equivalente, c)) tokens.push(equivalente[c]);
    else throw new ErrorExpresion(`No entiendo «${c}» (posición ${i + 1})`);
    i++;
  }
  return tokens;
}

export function compilarExpresion(texto: string): (x: number) => number {
  const tokens = trocear(texto);
  let i = 0;
  const fallo = (m: string): never => {
    throw new ErrorExpresion(m);
  };
  const esOp = (v: string) => {
    const t = tokens[i];
    return t?.t === 'op' && t.v === v;
  };
  const empiezaFactor = () => {
    const t = tokens[i];
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  };
  const cerrar = () => {
    if (!esOp(')')) fallo('Falta cerrar un paréntesis');
    i++;
  };

  function suma(): Nodo {
    let izq = producto();
    while (esOp('+') || esOp('-')) {
      const op = tokens[i++].v;
      const der = producto();
      const a = izq;
      izq = op === '+' ? (x) => a(x) + der(x) : (x) => a(x) - der(x);
    }
    return izq;
  }
  function producto(): Nodo {
    let izq = unario();
    for (;;) {
      if (esOp('*') || esOp('/')) {
        const op = tokens[i++].v;
        const der = unario();
        const a = izq;
        izq = op === '*' ? (x) => a(x) * der(x) : (x) => a(x) / der(x);
      } else if (empiezaFactor()) {
        const der = potencia(); // 2x, 2(x+1), (x+1)(x-1)
        const a = izq;
        izq = (x) => a(x) * der(x);
      } else return izq;
    }
  }
  function unario(): Nodo {
    if (esOp('-')) {
      i++;
      const v = unario();
      return (x) => -v(x);
    }
    if (esOp('+')) {
      i++;
      return unario();
    }
    return potencia();
  }
  function potencia(): Nodo {
    const base = atomo();
    if (esOp('^')) {
      i++;
      const exponente = unario(); // 2^3^2 = 2^(3^2) y 2^-1
      return (x) => Math.pow(base(x), exponente(x));
    }
    return base;
  }
  function atomo(): Nodo {
    const t = tokens[i++];
    if (!t) return fallo('La expresión está incompleta');
    if (t.t === 'num') {
      const v = t.v;
      return () => v;
    }
    if (t.t === 'op' && t.v === '(') {
      const dentro = suma();
      cerrar();
      return dentro;
    }
    if (t.t === 'id') {
      if (t.v === 'x') return (x) => x;
      if (Object.hasOwn(CONSTANTES, t.v)) {
        const v = CONSTANTES[t.v];
        return () => v;
      }
      if (Object.hasOwn(FUNCIONES, t.v)) {
        const f = FUNCIONES[t.v];
        if (!esOp('(')) fallo(`Después de ${t.v} va un paréntesis, como ${t.v}(x)`);
        i++;
        const arg = suma();
        cerrar();
        return (x) => f(arg(x));
      }
      return fallo(`No conozco «${t.v}»`);
    }
    return fallo(`No esperaba «${t.v}» (posición ${t.p + 1})`);
  }

  if (!tokens.length) fallo('La expresión está vacía');
  const raiz = suma();
  if (i < tokens.length) fallo(`No esperaba «${String(tokens[i].v)}» (posición ${tokens[i].p + 1})`);
  return raiz;
}
