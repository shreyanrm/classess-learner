/**
 * Values a learner builds by hand: what the number pad's display means, and when two expressions
 * are the same expression.
 *
 * Both halves of this file are pure string work on purpose. The pad's display is the ONLY
 * representation of a typed number — there is no parallel `{numerator, denominator}` in state to
 * fall out of step with it — and the expression comparison the app runs is byte-for-byte the one
 * the brain runs, because it is the same function.
 */

/** What is on the pad: an optional minus, digits, and at most one `.` or one `/`. */
export interface PadValue {
  value: number;
  /** Set when the entry was written as a fraction, so form can be judged as well as value. */
  numerator?: number;
  denominator?: number;
}

const ENTRY_RE = /^(-?)(\d*)(?:(\.)(\d*)|(\/)(\d*))?$/;

/** True when `entry` is something the pad could have produced, complete or half-typed. */
export function isPadEntry(entry: string): boolean {
  return ENTRY_RE.test(entry);
}

/**
 * The number on the pad, or null while it is not yet a number — `-`, `3.`, `1/` and `` are all
 * legal things to have typed and none of them is an answer yet.
 */
export function parsePadEntry(entry: string): PadValue | null {
  const m = ENTRY_RE.exec(entry);
  if (!m) return null;
  const [, sign, whole, dot, frac, bar, den] = m;
  if (!whole) return null;
  const negative = sign === '-';
  if (bar !== undefined) {
    if (!den) return null;
    const numerator = Number(whole) * (negative ? -1 : 1);
    const denominator = Number(den);
    if (denominator === 0) return null;
    return { value: numerator / denominator, numerator, denominator };
  }
  if (dot !== undefined && !frac) return null;
  const value = Number(`${negative ? '-' : ''}${whole}${dot ? `.${frac}` : ''}`);
  return Number.isFinite(value) ? { value } : null;
}

/** The pad's keys, as the control and the keyboard handler both name them. */
export type PadKey = string;

/**
 * One keypress applied to the display. Returns the same string when the press is not allowed —
 * a second minus, a second decimal point, a fraction bar with no numerator in front of it — so a
 * rejected key is a no-op rather than a silently mangled value.
 */
export function pressPadKey(entry: string, key: PadKey): string {
  if (key === 'clear') return '';
  if (key === 'back') return entry.slice(0, -1);
  if (key === '-') return entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
  if (key === '.') {
    if (entry.includes('.') || entry.includes('/')) return entry;
    return /\d$/.test(entry) ? `${entry}.` : entry;
  }
  if (key === '/') {
    if (entry.includes('/') || entry.includes('.')) return entry;
    return /\d$/.test(entry) ? `${entry}/` : entry;
  }
  if (/^\d$/.test(key)) return entry.length >= 32 ? entry : `${entry}${key}`;
  return entry;
}

/** Greatest common divisor, on magnitudes, so a sign never changes the answer. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 1e-9) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** True when this fraction is in its lowest terms. Zero over anything is already lowest. */
export function isSimplified(numerator: number, denominator: number): boolean {
  if (numerator === 0) return true;
  return gcd(numerator, denominator) === 1;
}

// --- Expressions -----------------------------------------------------------------------------------

/**
 * The empty slot a structure key leaves behind. `\square` is not in the board's TeX vocabulary, so
 * the hand already draws it as a small hollow box — which is exactly what an unfilled slot is.
 */
export const EXPRESSION_HOLE = '\\square';

/**
 * True when an expression has no leaves yet — only structure and holes.
 *
 * `\frac{}{}` is blank; `\pi` is not, and neither is `3^{}`. Stripping every command would have
 * called pi blank, and stripping nothing would have called an empty fraction an answer.
 */
export function expressionIsBlank(latex: string): boolean {
  return (
    latex
      .replaceAll(EXPRESSION_HOLE, '')
      .replace(/\\frac|\\sqrt|[\^_]/g, '')
      .replace(/[{}\s]/g, '') === ''
  );
}

/** Read `{...}` starting at `open`, returning its contents and the index just past the closer. */
function readGroup(source: string, open: number): { body: string; next: number } | null {
  if (source[open] !== '{') return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return { body: source.slice(open + 1, i), next: i + 1 };
    }
  }
  return null;
}

function expandCommands(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source.startsWith('\\frac', i)) {
      const a = readGroup(source, i + 5);
      const b = a ? readGroup(source, a.next) : null;
      if (a && b) {
        out += `(${expandCommands(a.body)})/(${expandCommands(b.body)})`;
        i = b.next;
        continue;
      }
    }
    if (source.startsWith('\\sqrt', i)) {
      let j = i + 5;
      let degree = '';
      if (source[j] === '[') {
        const close = source.indexOf(']', j);
        if (close > -1) {
          degree = source.slice(j + 1, close);
          j = close + 1;
        }
      }
      const body = readGroup(source, j);
      if (body) {
        out += degree
          ? `root(${expandCommands(degree)})(${expandCommands(body.body)})`
          : `sqrt(${expandCommands(body.body)})`;
        i = body.next;
        continue;
      }
    }
    out += source[i];
    i += 1;
  }
  return out;
}

/**
 * Drop parentheses that wrap a single bare token — `(x)` and `x` are the same expression.
 *
 * Not after a letter or a closing bracket: `sqrt(2)` and `root(3)(8)` are function applications,
 * and collapsing their brackets would have turned a root into the string `sqrt2`.
 */
function collapseParens(source: string): string {
  let out = source;
  for (let i = 0; i < 8; i++) {
    const next = out.replace(/(^|[^A-Za-z0-9.)])\(([A-Za-z0-9.]+)\)/g, '$1$2');
    if (next === out) return out;
    out = next;
  }
  return out;
}

/**
 * The one normal form. Two expressions are the same answer when their normal forms match — so
 * `\frac{1}{2}`, `\frac{ 1 }{ 2 }` and `(1)/(2)` are one answer, and `2/1` is not.
 *
 * This is deliberately syntactic, not algebraic: `x+1` and `1+x` stay different. A spec that wants
 * both says so in `accept`, which keeps the judgement in the item's author's hands rather than in
 * a simplifier nobody can see.
 */
export function normaliseExpression(latex: string): string {
  let s = latex.replaceAll('\\left', '').replaceAll('\\right', '');
  s = expandCommands(s);
  s = s
    .replaceAll('\\cdot', '*')
    .replaceAll('\\times', '*')
    .replaceAll('\\div', '/')
    .replaceAll('\\pi', 'pi');
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  s = s.replaceAll('{', '(').replaceAll('}', ')');
  s = s.replace(/\s+/g, '');
  return collapseParens(s);
}

/** True when the learner's expression is one of the spellings this item accepts. */
export function expressionMatches(latex: string, want: string, accept: readonly string[]): boolean {
  const got = normaliseExpression(latex);
  if (got === '') return false;
  return [want, ...accept].some((form) => normaliseExpression(form) === got);
}
