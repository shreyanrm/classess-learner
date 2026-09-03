'use client';

/**
 * SimRunner — interprets a verified sim-spec JSON artifact (engine.simulate) into a live,
 * draggable simulation: scrubber params, live computed outputs, and breakpoint annotations —
 * "bend it until it breaks" (DESIGN.md §9). Publishes its working state to the Wobo bus so she
 * reasons about the sim at code level, and registers its surfaces as annotatable targets.
 * Expressions are evaluated by a tiny arithmetic parser — never eval, never Function.
 */

import type { SimSpec as WireSimSpec } from '@classess/contracts/plexus';
import { useRegisterTarget, useWoboBus } from '@classess/wobo';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { equationType, lead, Scrubber, whisper } from '../screens/course/shared';

// --- The sim-spec ---------------------------------------------------------------------------------

/**
 * The RENDER model, which is not the wire model.
 *
 * `SimSpec` in `@classess/contracts/plexus` is the one definition of what engine.simulate sends:
 * `{params:[{name,min,max,default,unit}], formula, outputs: string[], breakpoints:[{param,at,why}],
 * layout}`. What this component runs is a different thing — solved expressions, ids and labels,
 * comparison operators — so it carries its own names. Two shapes with the same name in two files
 * was the drift; `SimSpec` now means the contract, everywhere, and `simSpecFromGateway` is the one
 * adapter between them (type-checked against the contract, so a wire change breaks it here).
 */
export interface SimSceneParam {
  id: string;
  label: string;
  min: number;
  max: number;
  initial: number;
  unit?: string;
}

export interface SimSceneOutput {
  id: string;
  label: string;
  /** Arithmetic over the param ids, e.g. "V / R" — evaluated by the safe parser below. */
  expr: string;
  unit?: string;
}

export interface SimSceneBreakpoint {
  param: string;
  op: '<' | '<=' | '==' | '>=' | '>';
  value: number;
  /** The "why not in reality?" note that surfaces when the law is pushed past this point. */
  note: string;
}

export interface SimScene {
  id: string;
  nodeId?: string;
  title: string;
  /** The law on display, e.g. "V = I·R". */
  law?: string;
  caption?: string;
  params: SimSceneParam[];
  outputs: SimSceneOutput[];
  breakpoints?: SimSceneBreakpoint[];
}

// --- Safe expression evaluation (no eval — a small recursive-descent parser) -----------------------

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log,
  min: Math.min,
  max: Math.max,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI };

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'id'; name: string }
  | { kind: 'op'; op: string };

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  const re = /(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),·×÷])|(\s+)|(.)/g;
  for (const m of src.matchAll(re)) {
    if (m[1] !== undefined) tokens.push({ kind: 'num', value: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ kind: 'id', name: m[2] });
    else if (m[3] !== undefined) {
      const op = m[3] === '·' || m[3] === '×' ? '*' : m[3] === '÷' ? '/' : m[3];
      tokens.push({ kind: 'op', op });
    } else if (m[4] !== undefined) {
      // whitespace
    } else return null; // an unknown character — refuse to evaluate rather than guess
  }
  return tokens;
}

/**
 * Evaluates an arithmetic expression against named variables. Returns null when the expression is
 * malformed — a bad generated spec must never throw at render time.
 */
export function evaluateExpr(src: string, vars: Record<string, number>): number | null {
  const tokens = tokenize(src);
  if (!tokens || tokens.length === 0) return null;
  let pos = 0;

  const takeOp = (...ops: string[]): string | null => {
    const t = tokens[pos];
    if (t?.kind === 'op' && ops.includes(t.op)) {
      pos += 1;
      return t.op;
    }
    return null;
  };

  function parseExpr(): number {
    let left = parseTerm();
    for (;;) {
      const op = takeOp('+', '-');
      if (!op) return left;
      left = op === '+' ? left + parseTerm() : left - parseTerm();
    }
  }

  function parseTerm(): number {
    let left = parseFactor();
    for (;;) {
      const op = takeOp('*', '/');
      if (!op) return left;
      left = op === '*' ? left * parseFactor() : left / parseFactor();
    }
  }

  function parseFactor(): number {
    if (takeOp('-')) return -parseFactor();
    takeOp('+');
    const base = parsePrimary();
    if (takeOp('^')) return base ** parseFactor(); // right-associative
    return base;
  }

  function parsePrimary(): number {
    const t = tokens?.[pos];
    if (!t) throw new Error('unexpected end');
    if (t.kind === 'num') {
      pos += 1;
      return t.value;
    }
    if (t.kind === 'id') {
      pos += 1;
      // own-property lookups only — inherited names (__proto__, constructor…) are unknown
      const fn = Object.hasOwn(FUNCTIONS, t.name) ? FUNCTIONS[t.name] : undefined;
      if (fn && takeOp('(')) {
        const args = [parseExpr()];
        while (takeOp(',')) args.push(parseExpr());
        if (!takeOp(')')) throw new Error('missing )');
        return fn(...args);
      }
      const bound = Object.hasOwn(vars, t.name)
        ? vars[t.name]
        : Object.hasOwn(CONSTANTS, t.name)
          ? CONSTANTS[t.name]
          : undefined;
      if (typeof bound !== 'number') throw new Error(`unknown name ${t.name}`);
      return bound;
    }
    if (takeOp('(')) {
      const value = parseExpr();
      if (!takeOp(')')) throw new Error('missing )');
      return value;
    }
    throw new Error('unexpected token');
  }

  try {
    const value = parseExpr();
    return pos === tokens.length ? value : null;
  } catch {
    return null;
  }
}

/** Formats a computed value; a diverging output reads as ∞ — that IS the breakpoint lesson. */
export function formatSimNumber(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (Number.isInteger(v)) return String(v);
  const rendered =
    Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(3);
  return String(Number(rendered));
}

// --- Spec validation (verified before serving — a spec that cannot run is refused) -----------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Param ids must be plain identifiers (they appear in expressions) — nothing exotic gets through. */
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseParam(raw: unknown): SimSceneParam | null {
  if (!isRecord(raw)) return null;
  const { id, label, min, max, initial, unit } = raw;
  if (typeof id !== 'string' || !IDENT_RE.test(id) || typeof label !== 'string') return null;
  if (typeof min !== 'number' || typeof max !== 'number' || min >= max) return null;
  const start = typeof initial === 'number' ? Math.max(min, Math.min(max, initial)) : min;
  return {
    id,
    label,
    min: Math.round(min),
    max: Math.round(max),
    initial: Math.round(start),
    unit: typeof unit === 'string' ? unit : undefined,
  };
}

/**
 * Validates a generated sim-spec. Every output must actually evaluate against the initial params —
 * an expression the parser cannot prove runnable never reaches the learner (refusal is invisible;
 * the caller falls back to the seed journey).
 */
export function parseSimSpec(raw: unknown): SimScene | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.spec) ? raw.spec : raw;
  if (src.verified === false) return null;
  const params = (Array.isArray(src.params) ? src.params : [])
    .map(parseParam)
    .filter((p): p is SimSceneParam => p !== null);
  if (params.length === 0 || params.length > 5) return null;
  const vars = Object.fromEntries(params.map((p) => [p.id, p.initial]));
  const outputs = (Array.isArray(src.outputs) ? src.outputs : []).flatMap((o): SimSceneOutput[] => {
    if (!isRecord(o)) return [];
    const { id, label, expr, unit } = o;
    if (typeof id !== 'string' || typeof label !== 'string' || typeof expr !== 'string') return [];
    if (evaluateExpr(expr, vars) === null) return [];
    return [{ id, label, expr, unit: typeof unit === 'string' ? unit : undefined }];
  });
  if (outputs.length === 0) return null;
  const breakpoints = (Array.isArray(src.breakpoints) ? src.breakpoints : []).flatMap(
    (b): SimSceneBreakpoint[] => {
      if (!isRecord(b)) return [];
      const { param, op, value, note } = b;
      if (typeof param !== 'string' || !params.some((p) => p.id === param)) return [];
      if (typeof note !== 'string' || typeof value !== 'number') return [];
      if (op !== '<' && op !== '<=' && op !== '==' && op !== '>=' && op !== '>') return [];
      return [{ param, op, value, note }];
    },
  );
  return {
    id: typeof src.id === 'string' ? src.id : 'sim',
    nodeId: typeof src.node_id === 'string' ? src.node_id : undefined,
    title: typeof src.title === 'string' ? src.title : 'simulation',
    law: typeof src.law === 'string' ? src.law : undefined,
    caption: typeof src.caption === 'string' ? src.caption : undefined,
    params,
    outputs,
    breakpoints,
  };
}

/**
 * Adapts the gateway engine.simulate artifact (CAS-verified server-side:
 * `{params:[{name,min,max,default,unit}], formula:"V = I*R", outputs:["V"],
 * breakpoints:[{param,at,why}], layout}`) into a runnable SimScene. The formula must be in
 * solved form `OUT = expr(params)` — anything else is refused and the caller falls back.
 */
export function simSpecFromGateway(raw: unknown, title: string): SimScene | null {
  if (!isRecord(raw)) return null;
  // The envelope the plexus serve path wraps an artifact in; `raw` may be either.
  const src = (isRecord(raw.artifact) ? raw.artifact : raw) as Partial<WireSimSpec> &
    Record<string, unknown>;
  const formula = typeof src.formula === 'string' ? src.formula : '';
  const sides = formula.split('=');
  if (sides.length !== 2) return null;
  const [lhs, rhs] = sides.map((s) => (s ?? '').trim());
  const outNames = (Array.isArray(src.outputs) ? src.outputs : []).filter(
    (o): o is string => typeof o === 'string',
  );
  const out = outNames[0];
  if (!out || !lhs || !rhs) return null;
  const expr = lhs === out ? rhs : rhs === out ? lhs : null;
  if (!expr) return null;
  const params = (Array.isArray(src.params) ? src.params : []).flatMap((p: unknown) => {
    if (!isRecord(p) || typeof p.name !== 'string') return [];
    return [
      {
        id: p.name,
        label: p.name,
        min: p.min,
        max: p.max,
        initial: p.default,
        unit: typeof p.unit === 'string' && p.unit !== 'dimensionless' ? p.unit : undefined,
      },
    ];
  });
  const breakpoints = (Array.isArray(src.breakpoints) ? src.breakpoints : []).flatMap(
    (b: unknown) => {
      if (!isRecord(b) || typeof b.param !== 'string' || typeof b.at !== 'number') return [];
      const start = params.find((p) => p.id === b.param);
      const initial = typeof start?.initial === 'number' ? start.initial : 0;
      return [
        {
          param: b.param,
          // the note surfaces when the learner pushes the param past the named edge
          op: b.at <= initial ? '<=' : '>=',
          value: b.at,
          note: String(b.why ?? ''),
        },
      ];
    },
  );
  return parseSimSpec({
    id: typeof src.id === 'string' ? src.id : 'gateway-sim',
    title,
    law: formula,
    params,
    outputs: [{ id: out, label: out, expr }],
    breakpoints,
  });
}

function holds(bp: SimSceneBreakpoint, values: Record<string, number>): boolean {
  const v = values[bp.param];
  if (v === undefined) return false;
  switch (bp.op) {
    case '<':
      return v < bp.value;
    case '<=':
      return v <= bp.value;
    case '==':
      return v === bp.value;
    case '>=':
      return v >= bp.value;
    case '>':
      return v > bp.value;
  }
}

// --- The runner -----------------------------------------------------------------------------------

/** A number that fades and rises when its value changes. */
function LiveNumber({ children }: { children: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={children}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
        style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

export function SimRunner({ spec }: { spec: SimScene }) {
  const bus = useWoboBus();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.params.map((p) => [p.id, p.initial])),
  );

  const paramsRef = useRegisterTarget<HTMLDivElement>(`sim-${spec.id}-params`, {
    kind: 'controls',
    label: `the draggable parameters of the ${spec.title} simulation`,
  });
  const outputsRef = useRegisterTarget<HTMLDivElement>(`sim-${spec.id}-outputs`, {
    kind: 'readout',
    label: `the live computed outputs of the ${spec.title} simulation`,
  });

  const results = spec.outputs.map((o) => ({ ...o, value: evaluateExpr(o.expr, values) }));
  const tripped = (spec.breakpoints ?? []).filter((b) => holds(b, values));

  // she reads the sim at code level: params, outputs, and any tripped breakpoint
  useEffect(() => {
    bus.publishCanvas({
      nodeId: spec.nodeId ?? `sim-${spec.id}`,
      equation: spec.law,
      steps: [
        ...spec.params.map(
          (p) => `${p.label} = ${values[p.id] ?? p.initial}${p.unit ? ` ${p.unit}` : ''}`,
        ),
        ...spec.outputs.map(
          (o) =>
            `${o.label} = ${formatSimNumber(evaluateExpr(o.expr, values))}${o.unit ? ` ${o.unit}` : ''}`,
        ),
        ...(spec.breakpoints ?? [])
          .filter((b) => holds(b, values))
          .map((b) => `breakpoint tripped: ${b.note}`),
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, values]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {spec.law && (
        <div style={{ ...equationType, textAlign: 'center', padding: '12px 0 2px' }}>
          {spec.law}
        </div>
      )}
      {spec.caption && <div style={lead}>{spec.caption}</div>}

      {/* the params — every number is yours to drag */}
      <div
        ref={paramsRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px 30px',
          justifyContent: 'center',
          padding: '8px 0',
        }}
      >
        {spec.params.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>{p.label}</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 550 }}>
              <Scrubber
                value={values[p.id] ?? p.initial}
                min={p.min}
                max={p.max}
                onChange={(v) => setValues((prev) => ({ ...prev, [p.id]: v }))}
                label={p.label}
              />
            </span>
            {p.unit && <span style={whisper}>{p.unit}</span>}
          </div>
        ))}
      </div>

      {/* the outputs, always live */}
      <div
        ref={outputsRef}
        style={{
          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
          borderRadius: 'var(--clss-radius-md)',
          padding: '6px 20px',
          background: 'var(--clss-paper)',
        }}
      >
        {results.map((o, i) => (
          <div key={o.id}>
            {i > 0 && (
              <div
                style={{
                  height: 1,
                  transform: 'scaleY(0.5)',
                  background: 'var(--clss-hairline-on-paper)',
                }}
              />
            )}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '4px 18px',
                padding: '12px 0',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>{o.label}</div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 550,
                  color: 'var(--clss-ink-900)',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <LiveNumber>{formatSimNumber(o.value)}</LiveNumber>
                {o.unit && <span style={whisper}>{o.unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* where the law stops working — the perturbation notes */}
      <AnimatePresence initial={false}>
        {tripped.map((bp) => (
          <motion.div
            key={`${bp.param}-${bp.op}-${bp.value}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              padding: '12px 14px',
              background: 'var(--clss-canvas)',
              border: '0.5px solid var(--clss-hairline-on-paper)',
              borderRadius: 'var(--clss-radius-sm)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--clss-ink-700)',
            }}
          >
            <span style={{ ...whisper, display: 'block', marginBottom: 4 }}>Where it breaks</span>
            {bp.note}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
