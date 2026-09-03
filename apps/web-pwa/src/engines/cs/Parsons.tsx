'use client';

/**
 * Parsons — the middle rung of the CS ramp (SUBJECTS.md §5-CS). The correct lines of a program are
 * given, shuffled; the learner drags them into order. All of the logic, none of the typing. A
 * distractor line (a plausible-but-wrong line) turns it into a debugging exercise. Verify runs the
 * assembled program (when an expected output is given) or checks the order — deterministic either way.
 *
 * Wobo-drivable: Wobo reads the tray, the assembled order, and correctness, and can arrange the
 * solution or verify it to demonstrate.
 */

import { useRegisterTarget, useWoboBus } from '@wobo/wobo';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BarState } from '../../screens/course/shared';
import { CardBody, lead, whisper } from '../../screens/course/shared';
import { sfx } from '../../ui/sound';
import { runOutput } from './pyodide';

// --- Spec -----------------------------------------------------------------------------------------

export interface ParsonsLine {
  text: string;
  /** Indent depth (each level = 4 spaces) — applied for display and when the code is run. */
  indent?: number;
}

export interface ParsonsSpec {
  id: string;
  nodeId?: string;
  title?: string;
  prompt?: string;
  /** The correct program, in order. */
  solution: ParsonsLine[];
  /** Plausible wrong lines that must NOT end up in the answer. */
  distractors?: string[];
  /** When set, verify by running the assembled Python and matching this stdout (strongest check). */
  expectedOutput?: string;
}

// --- Line model -----------------------------------------------------------------------------------

interface Line {
  id: string;
  text: string;
  indent: number;
  /** True for distractor lines — any that reach the solution make it wrong. */
  bad: boolean;
}

/** Deterministic shuffle (seeded by the spec id) so the tray order is stable across renders. */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j] as T, a[i] as T]; // in-bounds: 0 <= j <= i < length
  }
  return a;
}

function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function assemble(lines: Line[]): string {
  return lines.map((l) => '    '.repeat(l.indent) + l.text).join('\n');
}

// --- Line chip ------------------------------------------------------------------------------------

function LineChip({
  line,
  hue,
  side,
  onMove,
  verdict,
}: {
  line: Line;
  hue: string;
  side: 'tray' | 'solution';
  onMove: () => void;
  verdict: 'none' | 'ok' | 'bad';
}) {
  const accent =
    verdict === 'ok'
      ? 'var(--wobo-feedback-correct)'
      : verdict === 'bad'
        ? 'var(--wobo-feedback-wrong)'
        : hue;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--wobo-radius-sm)',
        border: `0.5px solid ${verdict === 'none' ? 'var(--wobo-hairline-on-paper-strong)' : accent}`,
        background: 'var(--wobo-card)',
        boxShadow: `inset 3px 0 0 ${accent}`,
        cursor: side === 'solution' ? 'grab' : 'default',
      }}
    >
      <span style={{ width: line.indent * 16, flexShrink: 0 }} aria-hidden />
      <code
        style={{
          flex: 1,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.86rem',
          color: 'var(--wobo-ink-900)',
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      >
        {line.text}
      </code>
      <button
        type="button"
        onClick={() => {
          sfx.tap();
          onMove();
        }}
        aria-label={side === 'tray' ? 'add line to program' : 'return line to tray'}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: '0.5px solid var(--wobo-hairline-on-paper-strong)',
          background: 'var(--wobo-paper)',
          color: 'var(--wobo-ink-700)',
          cursor: 'pointer',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {side === 'tray' ? '↑' : '↓'}
      </button>
    </div>
  );
}

// --- Engine ---------------------------------------------------------------------------------------

export function Parsons({
  spec,
  hue = '#6C63FF',
  nodeId,
  setBar,
  onDone,
}: {
  spec: ParsonsSpec;
  hue?: string;
  nodeId?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const bus = useWoboBus();
  const reduce = useReducedMotion();

  const { canonical, initialTray } = useMemo(() => {
    const sol: Line[] = spec.solution.map((l, i) => ({
      id: `s${i}`,
      text: l.text,
      indent: l.indent ?? 0,
      bad: false,
    }));
    const dist: Line[] = (spec.distractors ?? []).map((t, i) => ({
      id: `d${i}`,
      text: t,
      indent: 0,
      bad: true,
    }));
    return {
      canonical: sol.map((l) => l.id),
      initialTray: shuffle([...sol, ...dist], seedFrom(spec.id)),
    };
  }, [spec]);

  const [tray, setTray] = useState<Line[]>(initialTray);
  const [solution, setSolution] = useState<Line[]>([]);
  const [result, setResult] = useState<'none' | 'right' | 'wrong'>('none');
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toSolution = (id: string) => {
    setResult('none');
    setOutput(null);
    const line = tray.find((l) => l.id === id);
    if (!line) return;
    // solution lines carry their canonical indent (this variant tests order, not indentation)
    const sol = spec.solution.find((_, i) => `s${i}` === id);
    setTray((t) => t.filter((l) => l.id !== id));
    setSolution((s) => [...s, { ...line, indent: sol?.indent ?? line.indent }]);
  };
  const toTray = (id: string) => {
    setResult('none');
    setOutput(null);
    const line = solution.find((l) => l.id === id);
    if (!line) return;
    setSolution((s) => s.filter((l) => l.id !== id));
    setTray((t) => [...t, { ...line, indent: line.bad ? 0 : line.indent }]);
  };

  const orderMatches = useCallback(
    () => solution.length === canonical.length && solution.every((l, i) => l.id === canonical[i]),
    [solution, canonical],
  );

  const verify = useCallback(async () => {
    if (busy) return;
    // If an expected output is given, run the assembled Python — the strongest validator.
    if (spec.expectedOutput !== undefined) {
      setBusy(true);
      try {
        const { stdout, error } = await runOutput(assemble(solution));
        setOutput(error ?? stdout);
        const ok = !error && stdout.trim() === spec.expectedOutput.trim();
        setResult(ok ? 'right' : 'wrong');
        (ok ? sfx.reward : sfx.wrong)();
        if (ok) onDone();
      } catch {
        setResult('wrong');
        setOutput('could not reach the Python runtime — check your connection and try again.');
        sfx.wrong();
      } finally {
        setBusy(false);
      }
      return;
    }
    const ok = orderMatches();
    setResult(ok ? 'right' : 'wrong');
    (ok ? sfx.reward : sfx.wrong)();
    if (ok) onDone();
  }, [busy, spec.expectedOutput, solution, orderMatches, onDone]);

  // verify through a ref so the bar effect keys on primitives only — a callback dep would re-fire
  // setBar every render when the parent passes an inline onDone, spinning an update loop.
  const verifyRef = useRef(verify);
  verifyRef.current = verify;

  // --- action bar ---
  useEffect(() => {
    setBar({
      primary: {
        label: busy ? 'running…' : 'run to check',
        onClick: () => void verifyRef.current(),
        disabled: solution.length === 0 || busy,
      },
    });
    return () => setBar(null);
  }, [setBar, solution.length, busy]);

  // --- Wobo seams ---
  const applyTutorAction = (patch: Record<string, unknown>) => {
    if (patch.solve === true) {
      // arrange the canonical solution, drop distractors back to the tray
      const sol: Line[] = spec.solution.map((l, i) => ({
        id: `s${i}`,
        text: l.text,
        indent: l.indent ?? 0,
        bad: false,
      }));
      setSolution(sol);
      setTray(
        (spec.distractors ?? []).map((t, i) => ({ id: `d${i}`, text: t, indent: 0, bad: true })),
      );
      setResult('none');
      setOutput(null);
    }
    if (patch.verify === true) void verify();
    if (patch.reset === true) {
      setSolution([]);
      setTray(initialTray);
      setResult('none');
      setOutput(null);
    }
  };

  const stageRef = useRegisterTarget<HTMLDivElement>(`parsons-${spec.id}`, {
    kind: 'parsons',
    label: `the Parsons problem "${spec.title ?? spec.id}"`,
    getSceneState: () => ({
      prompt: spec.prompt,
      assembled: solution.map((l) => '  '.repeat(l.indent) + l.text),
      tray: tray.map((l) => l.text),
      result: result === 'none' ? 'not checked' : result,
    }),
    getValidActions: () => [
      'drag a line from the tray into the program',
      'reorder the lines in the program',
      'run to check the program',
    ],
    applyTutorAction,
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId: nodeId ?? spec.nodeId ?? `parsons-${spec.id}`,
      steps: [
        spec.prompt ?? 'arrange the program',
        ...solution.map((l) => '  '.repeat(l.indent) + l.text),
        result === 'none'
          ? 'not checked yet'
          : result === 'right'
            ? 'correct ✓'
            : 'not correct yet',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, nodeId, solution, result]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const spring = reduce
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 30 };

  return (
    <CardBody center={false} maxWidth={680}>
      <div ref={stageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {spec.title && <div style={whisper}>{spec.title}</div>}
        {spec.prompt && <div style={lead}>{spec.prompt}</div>}

        {/* the program under construction — drag to reorder */}
        <div>
          <div style={{ ...whisper, marginBottom: 6 }}>your program</div>
          <div
            style={{
              border: `0.5px solid ${result === 'right' ? 'var(--wobo-feedback-correct)' : result === 'wrong' ? 'var(--wobo-feedback-wrong)' : 'var(--wobo-hairline-on-paper)'}`,
              borderRadius: 'var(--wobo-radius-md)',
              padding: 10,
              minHeight: 56,
              background: 'var(--wobo-canvas)',
            }}
          >
            {solution.length === 0 ? (
              <div style={{ ...whisper, textAlign: 'center', padding: '14px 0' }}>
                add lines from the tray, then drag to order them
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={solution}
                onReorder={(v) => {
                  setResult('none');
                  setOutput(null);
                  setSolution(v);
                }}
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {solution.map((l) => (
                  <Reorder.Item
                    key={l.id}
                    value={l}
                    style={{ listStyle: 'none' }}
                    transition={spring}
                  >
                    <LineChip
                      line={l}
                      hue={hue}
                      side="solution"
                      onMove={() => toTray(l.id)}
                      verdict={
                        result === 'wrong' && l.bad ? 'bad' : result === 'right' ? 'ok' : 'none'
                      }
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* the tray */}
        {tray.length > 0 && (
          <div>
            <div style={{ ...whisper, marginBottom: 6 }}>tray</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tray.map((l) => (
                <LineChip
                  key={l.id}
                  line={l}
                  hue={hue}
                  side="tray"
                  onMove={() => toSolution(l.id)}
                  verdict="none"
                />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {result !== 'none' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--wobo-radius-sm)',
                background: 'var(--wobo-canvas)',
                border: `0.5px solid ${result === 'right' ? 'var(--wobo-feedback-correct)' : 'var(--wobo-hairline-on-paper-strong)'}`,
                color: 'var(--wobo-ink-700)',
                fontSize: '0.92rem',
              }}
            >
              <div>
                {result === 'right'
                  ? 'correct — the lines are in the right order.'
                  : 'not yet — check the order and watch for a line that does not belong.'}
              </div>
              {output !== null && (
                <pre
                  style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    background: 'var(--wobo-paper)',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    color: 'var(--wobo-ink-900)',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto',
                  }}
                >
                  {output || '(no output)'}
                </pre>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardBody>
  );
}

// --- Gallery demo ---------------------------------------------------------------------------------

export const PARSONS_DEMO: ParsonsSpec = {
  id: 'demo-sum',
  title: 'sum the first five numbers',
  prompt: 'drag the lines into order so the program prints 10. one line does not belong.',
  solution: [
    { text: 'total = 0', indent: 0 },
    { text: 'for i in range(5):', indent: 0 },
    { text: 'total = total + i', indent: 1 },
    { text: 'print(total)', indent: 0 },
  ],
  distractors: ['total = total * i'],
  expectedOutput: '10',
};
