// Small, safe arithmetic expression evaluator used by formula rules and
// formula criteria. No `eval`/`new Function` — just a hand-rolled recursive
// descent parser over a flat token list, evaluated directly against a
// variable scope. Supports + - * / ^, unary -, parentheses, numeric
// literals, dotted identifiers (e.g. concentration.glucose), and a small
// function set: min, max, abs, clamp, floor, ceil, round, sign.

type Token =
  | { kind: "num"; value: number }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const value = Number(expr.slice(i, j));
      if (Number.isNaN(value)) {
        throw new Error(`Invalid number in expression at position ${i}`);
      }
      tokens.push({ kind: "num", value });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_.]/.test(expr[j])) j++;
      tokens.push({ kind: "ident", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if ("+-*/^".includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}' in expression at position ${i}`);
  }
  return tokens;
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  abs: (a) => Math.abs(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
  round: (a) => Math.round(a),
  sign: (a) => Math.sign(a),
  clamp: (a, lo, hi) => Math.min(Math.max(a, lo), hi),
  sqrt: (a) => Math.sqrt(a),
  exp: (a) => Math.exp(a),
};

class Parser {
  private pos = 0;
  private tokens: Token[];
  private scope: Record<string, number>;

  constructor(tokens: Token[], scope: Record<string, number>) {
    this.tokens = tokens;
    this.scope = scope;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Unexpected end of expression");
    this.pos++;
    return t;
  }

  parse(): number {
    const value = this.parseAddSub();
    if (this.pos !== this.tokens.length) {
      throw new Error("Unexpected trailing tokens in expression");
    }
    return value;
  }

  private parseAddSub(): number {
    let value = this.parseMulDiv();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value.match(/[+-]/)) {
      const op = (this.next() as { value: string }).value;
      const rhs = this.parseMulDiv();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseMulDiv(): number {
    let value = this.parsePow();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value.match(/[*/]/)) {
      const op = (this.next() as { value: string }).value;
      const rhs = this.parsePow();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  private parsePow(): number {
    const base = this.parseUnary();
    if (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "^") {
      this.next();
      const exp = this.parsePow(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    const t = this.peek();
    if (t?.kind === "op" && t.value === "-") {
      this.next();
      return -this.parseUnary();
    }
    if (t?.kind === "op" && t.value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const t = this.next();
    if (t.kind === "num") return t.value;
    if (t.kind === "lparen") {
      const value = this.parseAddSub();
      const close = this.next();
      if (close.kind !== "rparen") throw new Error("Expected ')' in expression");
      return value;
    }
    if (t.kind === "ident") {
      if (this.peek()?.kind === "lparen") {
        this.next();
        const args: number[] = [];
        if (this.peek()?.kind !== "rparen") {
          args.push(this.parseAddSub());
          while (this.peek()?.kind === "comma") {
            this.next();
            args.push(this.parseAddSub());
          }
        }
        const close = this.next();
        if (close.kind !== "rparen") throw new Error("Expected ')' after function arguments");
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new Error(`Unknown function '${t.value}' in expression`);
        return fn(...args);
      }
      if (!(t.value in this.scope)) {
        throw new Error(`Unknown variable '${t.value}' in expression`);
      }
      return this.scope[t.value];
    }
    throw new Error("Unexpected token in expression");
  }
}

/**
 * Evaluate a formula expression against a flat variable scope.
 * Throws on any unknown identifier, bad syntax, or unsupported function.
 */
export function evaluateExpression(expr: string, scope: Record<string, number>): number {
  const tokens = tokenize(expr);
  return new Parser(tokens, scope).parse();
}

/** Resolve a Rule's numeric-or-formula field against a scope. */
export function resolveNumeric(value: number | string, scope: Record<string, number>): number {
  return typeof value === "number" ? value : evaluateExpression(value, scope);
}
