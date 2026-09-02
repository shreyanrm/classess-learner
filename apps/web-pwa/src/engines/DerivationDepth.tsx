'use client';

/**
 * DerivationDepth — the info-button pattern (DESIGN.md §9, "derivation depth"). Any formula renders
 * with a quiet ⓘ; nobody is lectured on the derivation up front. Tap it and "how we got here"
 * unfolds step by step, each line drawing in on its own beat. Collapsible, and nestable exactly one
 * level: a step may carry its own sub-derivation with its own ⓘ (the curious go deeper; everyone
 * else moves on). Most learners never open it — that is the point.
 *
 * Registers as a Wobo scene target so she can expand it to walk the derivation herself
 * (applyTutorAction: { expand } / { collapse }). Reduced-motion + mute aware; both themes; no deps.
 */

import { useRegisterTarget, useWoboBus } from '@classess/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { BarState } from '../screens/course/shared';
import { CardBody, cardTitle, equationType, lead, rgba, whisper } from '../screens/course/shared';
import { hueForTopic } from '../ui/hues';
import { sfx } from '../ui/sound';

// --- The spec ------------------------------------------------------------------------------------

export interface DerivationStep {
  /** The line of the derivation, e.g. "a² + 2ab + b²". */
  expr: string;
  /** The reason this line follows from the last — the teaching, kept to one clause. */
  note?: string;
  /** One level of nesting: a sub-derivation for THIS step, with its own ⓘ. */
  sub?: DerivationSpec;
}

export interface DerivationSpec {
  id: string;
  /** The formula shown at rest, before anything is expanded. */
  formula: string;
  /** Optional label above the formula, e.g. "the identity". */
  label?: string;
  steps: DerivationStep[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function parseSteps(raw: unknown, allowSub: boolean): DerivationStep[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((s): s is Record<string, unknown> => isRecord(s) && str(s.expr))
    .map((s) => ({
      expr: s.expr as string,
      note: str(s.note) ? (s.note as string) : undefined,
      sub: allowSub ? (parseDerivation(s.sub, false) ?? undefined) : undefined,
    }));
}

/** `allowSub` caps nesting at one level (top call true, sub call false). */
export function parseDerivation(raw: unknown, allowSub = true): DerivationSpec | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  if (!str(src.formula)) return null;
  const steps = parseSteps(src.steps, allowSub);
  if (steps.length === 0) return null;
  return {
    id: str(src.id) ? src.id : 'derivation',
    formula: src.formula,
    label: str(src.label) ? src.label : undefined,
    steps,
  };
}

// --- The info button ------------------------------------------------------------------------------

function InfoButton({ open, hue, onClick }: { open: boolean; hue: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? 'hide the derivation' : 'how we got here'}
      title={open ? 'hide the derivation' : 'how we got here'}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: 22,
        height: 22,
        borderRadius: 999,
        border: `1px solid ${open ? hue : 'var(--clss-hairline-on-paper-strong)'}`,
        background: open ? rgba(hue, 0.12) : 'transparent',
        color: open ? hue : 'var(--clss-ink-500)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.78rem',
        fontStyle: 'italic',
        fontWeight: 600,
        lineHeight: 1,
        padding: 0,
      }}
    >
      i
    </button>
  );
}

// --- One derivation node (recursive, capped at depth 1) -------------------------------------------

function DerivationNode({
  spec,
  hue,
  depth,
  onToggle,
}: {
  spec: DerivationSpec;
  hue: string;
  depth: number;
  onToggle?: (open: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    sfx.tap();
    onToggle?.(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* the formula at rest, with its quiet ⓘ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {spec.label && depth === 0 && <span style={whisper}>{spec.label}</span>}
        <span
          style={
            depth === 0 ? equationType : { ...lead, fontWeight: 560, color: 'var(--clss-ink-900)' }
          }
        >
          {spec.formula}
        </span>
        <InfoButton open={open} hue={hue} onClick={toggle} />
      </div>

      {/* how we got here — each step draws in on its own beat */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                borderLeft: `2px solid ${rgba(hue, 0.5)}`,
                paddingLeft: 16,
                marginLeft: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <div style={{ ...whisper, color: hue }}>how we got here</div>
              {spec.steps.map((step, i) => (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: derivation steps are positional
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: reduced ? 0 : i * 0.12,
                    type: 'spring',
                    stiffness: 300,
                    damping: 28,
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span
                      style={{
                        minWidth: 18,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: hue,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 520,
                        color: 'var(--clss-ink-900)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {step.expr}
                    </span>
                  </div>
                  {step.note && (
                    <div
                      style={{
                        marginLeft: 28,
                        fontSize: '0.9rem',
                        color: 'var(--clss-ink-700)',
                        lineHeight: 1.55,
                      }}
                    >
                      {step.note}
                    </div>
                  )}
                  {/* one level of nesting — the sub-derivation carries its own ⓘ */}
                  {step.sub && depth === 0 && (
                    <div style={{ marginLeft: 28, marginTop: 4 }}>
                      <DerivationNode spec={step.sub} hue={hue} depth={1} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The inline component — drop it anywhere a formula appears. */
export function DerivationDepth({
  spec,
  hue = hueForTopic(''),
}: {
  spec: DerivationSpec;
  hue?: string;
}) {
  const bus = useWoboBus();
  const [open, setOpen] = useState(false);

  useRegisterTarget<HTMLDivElement>(`derivation-${spec.id}`, {
    kind: 'derivation',
    label: `the derivation of ${spec.formula}`,
    getSceneState: () => ({ formula: spec.formula, steps: spec.steps.length, expanded: open }),
    getValidActions: () => (open ? ['collapse the derivation'] : ['expand the derivation']),
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId: `derivation-${spec.id}`,
      equation: spec.formula,
      steps: open
        ? spec.steps.map((s, i) => `${i + 1}. ${s.expr}`)
        : [spec.formula, 'derivation collapsed'],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, open]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  return <DerivationNode spec={spec} hue={hue} depth={0} onToggle={setOpen} />;
}

/** The course-card wrapper — a full beat that shows the formula and invites the depth. */
export function DerivationCard({
  spec,
  hue = hueForTopic(''),
  setBar,
  onDone,
}: {
  spec: DerivationSpec;
  hue?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  useEffect(() => {
    setBar({ primary: { label: 'continue', onClick: onDone } });
  }, [setBar, onDone]);

  return (
    <CardBody maxWidth={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={whisper}>the formula — depth on request</div>
          <div style={{ ...cardTitle, marginTop: 8 }}>you only need the result</div>
        </div>
        <div style={lead}>
          this is the formula. it stands on its own — but if you ever wonder where it comes from,
          the ⓘ opens the whole path.
        </div>
        <div
          style={{
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            borderRadius: 3,
            padding: '22px 20px',
            background: rgba(hue, 0.04),
          }}
        >
          <DerivationDepth spec={spec} hue={hue} />
        </div>
      </div>
    </CardBody>
  );
}

// --- A hand-authored demo (the classic (a+b)² identity, with one nested sub-derivation) -----------

export const DERIVATION_DEMO: DerivationSpec = {
  id: 'demo-derivation',
  label: 'the identity',
  formula: '(a + b)² = a² + 2ab + b²',
  steps: [
    { expr: '(a + b)(a + b)', note: 'a square is just the thing times itself.' },
    {
      expr: 'a·a + a·b + b·a + b·b',
      note: 'expand every pair — each term of the first bracket meets each of the second.',
      sub: {
        id: 'demo-derivation-foil',
        formula: 'why four terms?',
        steps: [
          { expr: 'a → (a + b)', note: 'the a distributes over both b and a.' },
          { expr: 'b → (a + b)', note: 'so does the b — two terms each, four in all.' },
        ],
      },
    },
    { expr: 'a² + ab + ab + b²', note: 'a·b and b·a are the same — they collect.' },
    {
      expr: 'a² + 2ab + b²',
      note: 'two copies of ab become 2ab. that is the middle term everyone forgets.',
    },
  ],
};
