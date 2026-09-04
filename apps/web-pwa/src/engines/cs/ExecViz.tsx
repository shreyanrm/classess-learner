'use client';

/**
 * ExecViz — the crown jewel of the CS ramp (SUBJECTS.md §5-CS). Python on the left (a real
 * CodeMirror editor), the machine's mind on the right: the current line glowing, variables as
 * labelled boxes whose values animate on change, the call stack growing and shrinking. Step
 * forward / back and scrub the whole timeline.
 *
 * Determinism: we run the code ONCE under sys.settrace (see ./pyodide) to collect a full step log,
 * then scrub the log. Nothing re-executes as you step, so back is as cheap as forward and the view
 * can never disagree with what actually ran. Validation is the real thing — run the code and check
 * the output.
 */

import { python } from '@codemirror/lang-python';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type ViewUpdate } from '@codemirror/view';
import { useRegisterTarget, useWoboBus } from '@wobo/wobo';
import { basicSetup } from 'codemirror';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BarState } from '../../screens/course/shared';
import { rgba, whisper } from '../../screens/course/shared';
import { sfx } from '../../ui/sound';
import { runTraced, type TraceStep } from './pyodide';

// --- Spec -----------------------------------------------------------------------------------------

export interface ExecVizSpec {
  id: string;
  nodeId?: string;
  title?: string;
  prompt?: string;
  /** The starting Python source (the learner may edit it). */
  code: string;
  /** When set, a run is "correct" only if stdout matches this — the output validator. */
  expectedOutput?: string;
}

// --- CodeMirror: current-line highlight -----------------------------------------------------------

const setHighlight = StateEffect.define<number | null>(); // 1-based line, or null to clear
const execLine = Decoration.line({ attributes: { class: 'cm-exec-line' } });

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setHighlight)) {
        if (e.value == null || e.value < 1 || e.value > tr.state.doc.lines) deco = Decoration.none;
        else deco = Decoration.set([execLine.range(tr.state.doc.line(e.value).from)]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--wobo-ink-900)', fontSize: '0.86rem' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '6px 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--wobo-ink-500)',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-exec-line': { backgroundColor: 'var(--exec-hi)' },
  '.cm-cursor': { borderLeftColor: 'var(--wobo-ink-900)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--wobo-ink-100)' },
});

/** Imperative CodeMirror bound into React: an editable Python doc that can be told which line glows. */
function useCodeMirror(
  initial: string,
  onEdit: () => void,
): {
  ref: (el: HTMLDivElement | null) => void;
  getCode: () => string;
  highlight: (line: number | null) => void;
} {
  const viewRef = useRef<EditorView | null>(null);
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) {
        viewRef.current?.destroy();
        viewRef.current = null;
        return;
      }
      if (viewRef.current) return;
      viewRef.current = new EditorView({
        parent: el,
        state: EditorState.create({
          doc: initial,
          extensions: [
            basicSetup,
            python(),
            highlightField,
            editorTheme,
            EditorView.updateListener.of((u: ViewUpdate) => {
              if (u.docChanged) onEditRef.current();
            }),
          ],
        }),
      });
    },
    [initial],
  );

  // A STABLE api object — it is a dependency of run()/effects below, so a fresh identity each render
  // would cascade into an endless setState loop. ref/viewRef are stable, so this memo never changes.
  return useMemo(
    () => ({
      ref,
      getCode: () => viewRef.current?.state.doc.toString() ?? initial,
      highlight: (line: number | null) =>
        viewRef.current?.dispatch({ effects: setHighlight.of(line) }),
    }),
    [ref, initial],
  );
}

// --- The mind: variable boxes ---------------------------------------------------------------------

function VarBox({
  name,
  value,
  changed,
  reduce,
}: {
  name: string;
  value: string;
  changed: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      layout={!reduce}
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 28 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '8px 10px',
        borderRadius: 'var(--wobo-radius-sm)',
        border: `0.5px solid ${changed ? 'var(--exec-accent)' : 'var(--wobo-hairline-on-paper-strong)'}`,
        background: changed ? 'var(--exec-hi)' : 'var(--wobo-card)',
        minWidth: 64,
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--wobo-ink-500)',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontSize: '1.05rem',
          fontWeight: 550,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--wobo-ink-900)',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 30 }}
            style={{ display: 'inline-block' }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>
  );
}

// --- Engine ---------------------------------------------------------------------------------------

const EMPTY_STEP: TraceStep = { line: 0, locals: {}, stack: [], out: 0 };

export function ExecViz({
  spec,
  hue = '#6C63FF',
  nodeId,
  setBar,
  onDone,
}: {
  spec: ExecVizSpec;
  hue?: string;
  nodeId?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const bus = useWoboBus();
  const reduce = Boolean(useReducedMotion());

  const [steps, setSteps] = useState<TraceStep[] | null>(null);
  const [stdout, setStdout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pass, setPass] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<number | null>(null);

  const invalidate = useCallback(() => {
    // the code changed under us — the old trace no longer describes it
    setSteps(null);
    setStdout('');
    setError(null);
    setCursor(0);
    setPass(null);
    setPlaying(false);
  }, []);

  const cm = useCodeMirror(spec.code, invalidate);

  const total = steps?.length ?? 0;
  const step = (steps && total > 0 ? steps[Math.min(cursor, total - 1)] : undefined) ?? EMPTY_STEP;
  const prevStep = (steps && cursor > 0 ? steps[cursor - 1] : undefined) ?? EMPTY_STEP;

  // keep the editor's glowing line in sync with the scrub position
  useEffect(() => {
    cm.highlight(steps && total > 0 ? step.line : null);
  }, [cm, steps, total, step.line]);

  // --- run ---
  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setPlaying(false);
    try {
      const res = await runTraced(cm.getCode());
      setSteps(res.steps);
      setStdout(res.stdout);
      setError(res.error);
      setCursor(0);
      if (spec.expectedOutput !== undefined) {
        const ok = !res.error && res.stdout.trim() === spec.expectedOutput.trim();
        setPass(ok);
        (ok ? sfx.reward : sfx.wrong)();
        if (ok) onDone();
      } else {
        setPass(null);
        sfx.reveal();
      }
    } catch {
      setSteps([]);
      setError('could not reach the Python runtime — check your connection and try again.');
      setPass(false);
    } finally {
      setLoading(false);
    }
  }, [loading, cm, spec.expectedOutput, onDone]);

  // the bar calls run through a ref so its effect can key on primitives only (loading/steps) — a
  // callback dep here would re-fire setBar every render whenever the parent passes an inline onDone.
  const runRef = useRef(run);
  runRef.current = run;

  // --- stepping ---
  const stepTo = useCallback(
    (i: number) => {
      if (!steps || total === 0) return;
      const clamped = Math.max(0, Math.min(total - 1, i));
      setCursor(clamped);
      sfx.tap();
    },
    [steps, total],
  );

  const stopPlay = useCallback(() => {
    if (playTimer.current !== null) {
      window.clearInterval(playTimer.current);
      playTimer.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!steps || total === 0) return;
    if (cursor >= total - 1) setCursor(0);
    setPlaying(true);
  }, [steps, total, cursor]);

  // the autoplay loop — advances the scrub head; stops at the end
  useEffect(() => {
    if (!playing) return;
    playTimer.current = window.setInterval(
      () => {
        setCursor((c) => {
          if (c >= total - 1) {
            stopPlay();
            return c;
          }
          sfx.tap();
          return c + 1;
        });
      },
      reduce ? 260 : 620,
    );
    return () => {
      if (playTimer.current !== null) window.clearInterval(playTimer.current);
    };
  }, [playing, total, reduce, stopPlay]);

  useEffect(() => stopPlay, [stopPlay]);

  // --- action bar ---
  useEffect(() => {
    setBar({
      primary: {
        label: loading ? 'waking python…' : steps === null ? 'run' : 'run again',
        onClick: () => void runRef.current(),
        disabled: loading,
      },
    });
    return () => setBar(null);
  }, [setBar, loading, steps]);

  // --- Wobo seams ---
  const applyTutorAction = (patch: Record<string, unknown>) => {
    if (patch.run === true) void run();
    if (patch.step === 'forward') stepTo(cursor + 1);
    if (patch.step === 'back') stepTo(cursor - 1);
    if (typeof patch.cursor === 'number') stepTo(patch.cursor);
    if (patch.play === true) play();
    if (patch.pause === true) stopPlay();
  };

  const stageRef = useRegisterTarget<HTMLDivElement>(`execviz-${spec.id}`, {
    kind: 'exec-visualizer',
    label: `the Python execution visualizer for "${spec.title ?? spec.id}"`,
    getSceneState: () => ({
      ran: steps !== null,
      step: steps ? `${cursor + 1} of ${total}` : 'not run',
      currentLine: steps && total > 0 ? step.line : null,
      variables: step.locals,
      callStack: step.stack,
      output: stdout.slice(0, step.out) || '(none yet)',
      error,
    }),
    getValidActions: () =>
      steps === null
        ? ['run the code to trace it']
        : ['step forward', 'step back', 'scrub the timeline to any line', 'run again'],
    applyTutorAction,
  });

  // publish the machine's state so Wobo reasons at code level, never on pixels
  useEffect(() => {
    bus.publishCanvas({
      nodeId: nodeId ?? spec.nodeId ?? `execviz-${spec.id}`,
      steps: steps
        ? [
            `line ${step.line} (step ${cursor + 1}/${total})`,
            ...Object.entries(step.locals).map(([k, v]) => `${k} = ${v}`),
            step.stack.length > 1 ? `call stack: ${step.stack.join(' › ')}` : 'at module level',
          ]
        : ['not run yet'],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, nodeId, steps, cursor, total, step]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  const vars = useMemo(
    () =>
      Object.entries(step.locals).map(([name, value]) => ({
        name,
        value,
        changed: prevStep.locals[name] !== value,
      })),
    [step, prevStep],
  );

  // reveal stdout as each line's print lands; at the final step execution has completed, so show it
  // all (the last line event — e.g. print() — is recorded just BEFORE it runs, so its output would
  // otherwise never appear while scrubbing)
  const shownOutput = steps ? (cursor >= total - 1 ? stdout : stdout.slice(0, step.out)) : '';
  const accent = hue;

  return (
    <div
      ref={stageRef}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '20px 20px 28px',
          maxWidth: 940,
          margin: '0 auto',
          width: '100%',
          '--exec-hi': rgba(hue, 0.16),
          '--exec-accent': hue,
        } as React.CSSProperties
      }
    >
      {spec.title && <div style={whisper}>{spec.title}</div>}
      {spec.prompt && (
        <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--wobo-ink-700)' }}>
          {spec.prompt}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {/* left: the code */}
        <div
          style={{
            border: '0.5px solid var(--wobo-hairline-on-paper-strong)',
            borderRadius: 'var(--wobo-radius-md)',
            background: 'var(--wobo-card)',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ ...whisper, padding: '10px 12px 4px' }}>code</div>
          <div ref={cm.ref} style={{ padding: '0 6px 10px', overflowX: 'auto' }} />
        </div>

        {/* right: the machine's mind */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* variables */}
          <Panel label="variables">
            {vars.length === 0 ? (
              <Empty>press run, then step — variables appear as they are bound</Empty>
            ) : (
              <motion.div layout={!reduce} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <AnimatePresence mode="popLayout">
                  {vars.map((v) => (
                    <VarBox
                      key={v.name}
                      name={v.name}
                      value={v.value}
                      changed={v.changed}
                      reduce={reduce}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </Panel>

          {/* call stack */}
          <Panel label="call stack">
            {step.stack.length === 0 ? (
              <Empty>the running functions stack up here</Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <AnimatePresence initial={false}>
                  {[...step.stack].reverse().map((fn, i) => (
                    <motion.div
                      // biome-ignore lint/suspicious/noArrayIndexKey: call-stack depth IS the frame's identity
                      key={`${fn}-${step.stack.length - i}`}
                      layout={!reduce}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={
                        reduce ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 28 }
                      }
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        background: i === 0 ? rgba(accent, 0.14) : 'var(--wobo-canvas)',
                        border: `0.5px solid ${i === 0 ? accent : 'var(--wobo-hairline-on-paper)'}`,
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontSize: '0.82rem',
                        color: 'var(--wobo-ink-900)',
                      }}
                    >
                      {fn === '<module>' ? 'module' : `${fn}()`}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Panel>

          {/* output */}
          <Panel label="output">
            <pre
              style={{
                margin: 0,
                minHeight: 22,
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '0.84rem',
                color: error ? 'var(--wobo-feedback-wrong)' : 'var(--wobo-ink-900)',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
              }}
            >
              {error ?? shownOutput ?? ''}
              {!error && steps && shownOutput === '' && (
                <span style={{ color: 'var(--wobo-ink-500)' }}>(no output yet)</span>
              )}
            </pre>
          </Panel>
        </div>
      </div>

      {/* transport: step back / play / forward + timeline scrub */}
      {steps && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TransportBtn
              label="step back"
              glyph="‹"
              onClick={() => stepTo(cursor - 1)}
              disabled={cursor === 0}
            />
            <TransportBtn
              label={playing ? 'pause' : 'play'}
              glyph={playing ? '❙❙' : '▶'}
              onClick={() => (playing ? stopPlay() : play())}
              disabled={total <= 1}
            />
            <TransportBtn
              label="step forward"
              glyph="›"
              onClick={() => stepTo(cursor + 1)}
              disabled={cursor >= total - 1}
            />
          </div>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={cursor}
            aria-label="scrub the execution timeline"
            onChange={(e) => {
              stopPlay();
              setCursor(Number(e.target.value));
            }}
            style={{ flex: 1, minWidth: 140, accentColor: accent }}
          />
          <span
            style={{
              ...whisper,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 84,
              textAlign: 'right',
            }}
          >
            step {cursor + 1}/{total} · line {step.line}
          </span>
        </div>
      )}

      {pass !== null && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--wobo-radius-sm)',
            background: 'var(--wobo-canvas)',
            border: `0.5px solid ${pass ? 'var(--wobo-feedback-correct)' : 'var(--wobo-hairline-on-paper-strong)'}`,
            color: 'var(--wobo-ink-700)',
            fontSize: '0.92rem',
          }}
        >
          {pass
            ? 'output matches — the program is correct. step through to see why.'
            : `output does not match yet. expected: ${JSON.stringify(spec.expectedOutput)}.`}
        </div>
      )}
    </div>
  );
}

// --- small pieces ---------------------------------------------------------------------------------

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--wobo-hairline-on-paper)',
        borderRadius: 'var(--wobo-radius-md)',
        background: 'var(--wobo-canvas)',
        padding: '10px 12px 12px',
      }}
    >
      <div style={{ ...whisper, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.82rem', color: 'var(--wobo-ink-500)' }}>{children}</div>;
}

function TransportBtn({
  label,
  glyph,
  onClick,
  disabled,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 38,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: '0.5px solid var(--wobo-hairline-on-paper-strong)',
        background: 'var(--wobo-card)',
        color: disabled ? 'var(--wobo-ink-500)' : 'var(--wobo-ink-900)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.9rem',
      }}
    >
      {glyph}
    </motion.button>
  );
}

// --- Gallery demo ---------------------------------------------------------------------------------

export const EXECVIZ_DEMO: ExecVizSpec = {
  id: 'demo-forloop',
  title: 'a for-loop, stepping',
  prompt: 'run it, then step forward. watch total and i change on each pass of the loop.',
  code: `total = 0
for i in range(5):
    total = total + i
print(total)`,
  expectedOutput: '10',
};
