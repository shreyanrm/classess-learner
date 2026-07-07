'use client';

/**
 * BlockAssembly — the entry primitive of the CS ramp (SUBJECTS.md §5-CS). Snap labelled blocks
 * (forward · turn left · turn right · repeat N) into a program, press Run, and a robot walks a tile
 * grid one instruction at a time. Zero syntax, pure structure: the child feels a loop before they
 * ever type one. The validator is the world — did the robot reach the goal? — so "correct" is a
 * deterministic simulation, never a guess.
 *
 * Vidya-drivable: she reads the program and the robot's position at code level, and can add blocks
 * or run the program to demonstrate (getSceneState / getValidActions / applyTutorAction).
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BarState } from '../../screens/course/shared';
import { CardBody, lead, whisper } from '../../screens/course/shared';
import { sfx } from '../../ui/sound';

// --- Spec -----------------------------------------------------------------------------------------

type Dir = 'up' | 'down' | 'left' | 'right';
type SimpleOp = 'forward' | 'left' | 'right';

export interface BlockAssemblySpec {
  id: string;
  nodeId?: string;
  title?: string;
  prompt?: string;
  grid: { cols: number; rows: number };
  start: { x: number; y: number; dir: Dir };
  goal: { x: number; y: number };
  walls?: { x: number; y: number }[];
}

// --- Program model (one level of nesting: repeat wraps simple blocks) ------------------------------

interface SimpleBlock {
  id: string;
  op: SimpleOp;
}
interface RepeatBlock {
  id: string;
  op: 'repeat';
  times: number;
  body: SimpleBlock[];
}
type Block = SimpleBlock | RepeatBlock;

let uid = 0;
const nextId = () => `b${uid++}`;

const OP_LABEL: Record<SimpleOp, string> = {
  forward: 'move forward',
  left: 'turn left',
  right: 'turn right',
};
const OP_GLYPH: Record<SimpleOp, string> = { forward: '↑', left: '↺', right: '↻' };

// --- Turtle simulation (the validator) ------------------------------------------------------------

const VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const LEFT_OF: Record<Dir, Dir> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const RIGHT_OF: Record<Dir, Dir> = { up: 'right', right: 'down', down: 'left', left: 'up' };

interface Pose {
  x: number;
  y: number;
  dir: Dir;
}

/** Flattens repeats into a flat op list — the loop, unrolled. */
function flatten(program: Block[]): SimpleOp[] {
  const ops: SimpleOp[] = [];
  for (const b of program) {
    if (b.op === 'repeat') {
      for (let i = 0; i < b.times; i++) for (const s of b.body) ops.push(s.op);
    } else ops.push(b.op);
  }
  return ops;
}

/** Runs the program, returning every pose the robot passes through (for animation) and whether it
 * reached the goal without walking off the grid or into a wall. */
function simulate(program: Block[], spec: BlockAssemblySpec): { frames: Pose[]; reached: boolean } {
  const wall = new Set((spec.walls ?? []).map((w) => `${w.x},${w.y}`));
  let pose: Pose = { ...spec.start };
  const frames: Pose[] = [pose];
  let crashed = false;
  for (const op of flatten(program)) {
    if (op === 'left') pose = { ...pose, dir: LEFT_OF[pose.dir] };
    else if (op === 'right') pose = { ...pose, dir: RIGHT_OF[pose.dir] };
    else {
      const v = VEC[pose.dir];
      const nx = pose.x + v.x;
      const ny = pose.y + v.y;
      const off = nx < 0 || ny < 0 || nx >= spec.grid.cols || ny >= spec.grid.rows;
      if (off || wall.has(`${nx},${ny}`)) {
        crashed = true; // bumped an edge or a wall — the robot stays put and the run fails
      } else pose = { ...pose, x: nx, y: ny };
    }
    frames.push(pose);
  }
  const reached = !crashed && pose.x === spec.goal.x && pose.y === spec.goal.y;
  return { frames, reached };
}

// --- Block chips ----------------------------------------------------------------------------------

function chipStyle(hue: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 'var(--clss-radius-sm)',
    border: '0.5px solid var(--clss-hairline-on-paper-strong)',
    background: 'var(--clss-card)',
    color: 'var(--clss-ink-900)',
    fontSize: '0.92rem',
    fontWeight: 500,
    boxShadow: `inset 3px 0 0 ${hue}`,
    userSelect: 'none',
  };
}

function PaletteButton({
  label,
  glyph,
  onAdd,
}: {
  label: string;
  glyph: string;
  onAdd: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      onClick={() => {
        sfx.tap();
        onAdd();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 12px',
        borderRadius: 'var(--clss-radius-sm)',
        border: '0.5px dashed var(--clss-hairline-on-paper-strong)',
        background: 'transparent',
        color: 'var(--clss-ink-700)',
        fontSize: '0.88rem',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ fontSize: '1rem' }}>
        {glyph}
      </span>
      {label}
    </motion.button>
  );
}

// --- The grid world -------------------------------------------------------------------------------

function GridWorld({
  spec,
  pose,
  reached,
  instant,
  hue,
}: {
  spec: BlockAssemblySpec;
  pose: Pose;
  reached: boolean | null;
  instant: boolean;
  hue: string;
}) {
  const cell = 40;
  const w = spec.grid.cols * cell;
  const h = spec.grid.rows * cell;
  const wall = new Set((spec.walls ?? []).map((wl) => `${wl.x},${wl.y}`));
  const rot: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`grid world, robot ${reached ? 'reached the goal' : `at row ${pose.y + 1}, column ${pose.x + 1}`}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <title>the robot's world</title>
        {Array.from({ length: spec.grid.rows }, (_, y) =>
          Array.from({ length: spec.grid.cols }, (_, x) => {
            const isWall = wall.has(`${x},${y}`);
            return (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: x-y IS the grid cell's identity
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell}
                height={cell}
                fill={isWall ? 'var(--clss-ink-900)' : 'var(--clss-paper)'}
                stroke="var(--clss-hairline-on-paper)"
                strokeWidth={0.5}
                opacity={isWall ? 0.85 : 1}
              />
            );
          }),
        )}
        {/* the goal — a soft target */}
        <g
          transform={`translate(${spec.goal.x * cell + cell / 2}, ${spec.goal.y * cell + cell / 2})`}
        >
          <circle r={cell * 0.3} fill="none" stroke={hue} strokeWidth={2} opacity={0.9} />
          <circle r={cell * 0.12} fill={hue} />
        </g>
        {/* the robot — position on the outer group, heading on the inner (pivots in place: SVG
            transform-origin defaults to the group's local 0,0, which sits at the tile centre) */}
        <motion.g
          animate={{ x: pose.x * cell + cell / 2, y: pose.y * cell + cell / 2 }}
          transition={instant ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 26 }}
        >
          <motion.g
            animate={{ rotate: rot[pose.dir] }}
            transition={instant ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 26 }}
          >
            <motion.g
              animate={reached ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <circle r={cell * 0.32} fill={reached ? hue : 'var(--clss-ink-900)'} />
              <path
                d={`M0 ${-cell * 0.22} L ${cell * 0.16} ${cell * 0.1} L ${-cell * 0.16} ${cell * 0.1} Z`}
                fill="var(--clss-paper)"
              />
            </motion.g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// --- Engine ---------------------------------------------------------------------------------------

export function BlockAssembly({
  spec,
  hue = '#6C63FF',
  nodeId,
  setBar,
  onDone,
}: {
  spec: BlockAssemblySpec;
  hue?: string;
  nodeId?: string;
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const bus = useVidyaBus();
  const reduce = useReducedMotion();
  const [program, setProgram] = useState<Block[]>([]);
  const [playIndex, setPlayIndex] = useState<number | null>(null); // null = editing
  const [reached, setReached] = useState<boolean | null>(null);
  const timer = useRef<number | null>(null);

  const sim = useMemo(() => simulate(program, spec), [program, spec]);
  const pose = (playIndex === null
    ? undefined
    : sim.frames[Math.min(playIndex, sim.frames.length - 1)]) ?? { ...spec.start };
  const running = playIndex !== null && playIndex < sim.frames.length - 1;

  // any edit to the program (add, remove, retime, or drag-reorder) invalidates the last run
  // biome-ignore lint/correctness/useExhaustiveDependencies: program IS the trigger, not a body dep
  useEffect(() => {
    setPlayIndex(null);
    setReached(null);
  }, [program]);

  // --- program editing ---
  const addSimple = useCallback((op: SimpleOp) => {
    setReached(null);
    setPlayIndex(null);
    setProgram((p) => [...p, { id: nextId(), op }]);
  }, []);
  const addRepeat = useCallback(() => {
    setReached(null);
    setPlayIndex(null);
    setProgram((p) => [...p, { id: nextId(), op: 'repeat', times: 2, body: [] }]);
  }, []);
  const removeBlock = (id: string) => setProgram((p) => p.filter((b) => b.id !== id));
  const setTimes = (id: string, times: number) =>
    setProgram((p) => p.map((b) => (b.id === id && b.op === 'repeat' ? { ...b, times } : b)));
  const addToRepeat = (id: string, op: SimpleOp) =>
    setProgram((p) =>
      p.map((b) =>
        b.id === id && b.op === 'repeat' ? { ...b, body: [...b.body, { id: nextId(), op }] } : b,
      ),
    );
  const removeFromRepeat = (id: string, sid: string) =>
    setProgram((p) =>
      p.map((b) =>
        b.id === id && b.op === 'repeat' ? { ...b, body: b.body.filter((s) => s.id !== sid) } : b,
      ),
    );

  // --- run the world ---
  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const run = useCallback(() => {
    stop();
    const { frames, reached: ok } = simulate(program, spec);
    if (frames.length <= 1) return; // empty program — nothing to run
    setReached(null);
    setPlayIndex(0);
    if (reduce) {
      // reduced-motion: skip the walk, land the result
      setPlayIndex(frames.length - 1);
      setReached(ok);
      (ok ? sfx.reward : sfx.wrong)();
      if (ok) onDone();
      return;
    }
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setPlayIndex(i);
      sfx.tap();
      if (i >= frames.length - 1) {
        stop();
        setReached(ok);
        (ok ? sfx.reward : sfx.wrong)();
        if (ok) onDone();
      }
    }, 420);
  }, [program, spec, reduce, stop, onDone]);

  const reset = useCallback(() => {
    stop();
    setPlayIndex(null);
    setReached(null);
  }, [stop]);

  useEffect(() => stop, [stop]);

  // run through a ref so the bar effect keys on primitives only — a callback dep would re-fire
  // setBar every render when the parent passes an inline onDone, spinning an update loop.
  const runRef = useRef(run);
  runRef.current = run;

  // --- the action bar ---
  useEffect(() => {
    setBar({
      primary: {
        label: running ? 'walking…' : reached === null ? 'run' : 'run again',
        onClick: () => runRef.current(),
        disabled: program.length === 0 || running,
      },
      secondary: playIndex !== null ? { label: 'reset', onClick: reset } : undefined,
    });
    return () => setBar(null);
  }, [setBar, reset, running, reached, program.length, playIndex]);

  // --- Vidya seams ---
  const humanProgram = () =>
    program.length === 0
      ? 'empty'
      : program
          .map((b) =>
            b.op === 'repeat'
              ? `repeat ${b.times}× [${b.body.map((s) => OP_LABEL[s.op]).join(', ') || 'empty'}]`
              : OP_LABEL[b.op],
          )
          .join(' → ');

  const applyTutorAction = (patch: Record<string, unknown>) => {
    const add = patch.add;
    if (add === 'forward' || add === 'left' || add === 'right') addSimple(add);
    else if (add === 'repeat') addRepeat();
    if (patch.run === true) run();
    if (patch.reset === true) reset();
  };

  const stageRef = useRegisterTarget<HTMLDivElement>(`block-${spec.id}`, {
    kind: 'block-program',
    label: `the block program and robot world for "${spec.title ?? spec.id}"`,
    getSceneState: () => ({
      program: humanProgram(),
      robot: `row ${pose.y + 1}, column ${pose.x + 1}, facing ${pose.dir}`,
      goal: `row ${spec.goal.y + 1}, column ${spec.goal.x + 1}`,
      reached: reached === null ? 'not run yet' : reached ? 'reached the goal' : 'missed',
    }),
    getValidActions: () => [
      'add a forward, turn-left, turn-right or repeat block',
      'run the program to walk the robot',
      ...(program.length ? ['reset the run'] : []),
    ],
    applyTutorAction,
  });

  // publish to the bus so she reasons over the program at code level
  // biome-ignore lint/correctness/useExhaustiveDependencies: humanProgram derives from program+state
  useEffect(() => {
    bus.publishCanvas({
      nodeId: nodeId ?? spec.nodeId ?? `block-${spec.id}`,
      steps: [
        `program: ${humanProgram()}`,
        `robot at row ${pose.y + 1}, col ${pose.x + 1}, facing ${pose.dir}`,
        reached === null ? 'not run' : reached ? 'reached the goal ✓' : 'missed the goal',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, nodeId, program, pose.x, pose.y, pose.dir, reached]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  return (
    <CardBody center={false} maxWidth={680}>
      <div ref={stageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {spec.title && <div style={whisper}>{spec.title}</div>}
        {spec.prompt && <div style={lead}>{spec.prompt}</div>}

        <GridWorld spec={spec} pose={pose} reached={reached} instant={Boolean(reduce)} hue={hue} />

        {/* the program — draggable to reorder */}
        <div
          style={{
            border: '0.5px solid var(--clss-hairline-on-paper)',
            borderRadius: 'var(--clss-radius-md)',
            padding: 12,
            background: 'var(--clss-canvas)',
            minHeight: 64,
          }}
        >
          {program.length === 0 ? (
            <div style={{ ...whisper, textAlign: 'center', padding: '18px 0' }}>
              tap a block below to start building
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={program}
              onReorder={setProgram}
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {program.map((b) => (
                <Reorder.Item key={b.id} value={b} style={{ listStyle: 'none' }}>
                  {b.op === 'repeat' ? (
                    <div
                      style={{
                        ...chipStyle(hue),
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: 10,
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span aria-hidden>⟳</span>
                        <span>repeat</span>
                        <button
                          type="button"
                          onClick={() => setTimes(b.id, Math.max(1, b.times - 1))}
                          style={stepBtn}
                          aria-label="fewer repeats"
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: 18,
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {b.times}×
                        </span>
                        <button
                          type="button"
                          onClick={() => setTimes(b.id, Math.min(20, b.times + 1))}
                          style={stepBtn}
                          aria-label="more repeats"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(b.id)}
                          style={{ ...stepBtn, marginLeft: 'auto' }}
                          aria-label="remove block"
                        >
                          ×
                        </button>
                      </div>
                      <div
                        style={{
                          paddingLeft: 14,
                          borderLeft: `2px solid ${hue}`,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        {b.body.map((s) => (
                          <span
                            key={s.id}
                            style={{ ...chipStyle(hue), padding: '5px 9px', fontSize: '0.82rem' }}
                          >
                            <span aria-hidden>{OP_GLYPH[s.op]}</span>
                            {OP_LABEL[s.op]}
                            <button
                              type="button"
                              onClick={() => removeFromRepeat(b.id, s.id)}
                              style={{ ...stepBtn, width: 18, height: 18 }}
                              aria-label="remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(['forward', 'left', 'right'] as SimpleOp[]).map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => {
                              sfx.tap();
                              addToRepeat(b.id, op);
                            }}
                            style={miniAdd}
                            aria-label={`add ${OP_LABEL[op]} inside repeat`}
                          >
                            + {OP_GLYPH[op]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ ...chipStyle(hue), cursor: 'grab', justifyContent: 'space-between' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span aria-hidden style={{ fontSize: '1rem' }}>
                          {OP_GLYPH[b.op]}
                        </span>
                        {OP_LABEL[b.op]}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(b.id)}
                        style={stepBtn}
                        aria-label="remove block"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>

        {/* palette */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PaletteButton label="move forward" glyph="↑" onAdd={() => addSimple('forward')} />
          <PaletteButton label="turn left" glyph="↺" onAdd={() => addSimple('left')} />
          <PaletteButton label="turn right" glyph="↻" onAdd={() => addSimple('right')} />
          <PaletteButton label="repeat" glyph="⟳" onAdd={addRepeat} />
        </div>

        <AnimatePresence>
          {reached !== null && !running && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--clss-radius-sm)',
                background: 'var(--clss-canvas)',
                border: `0.5px solid ${reached ? hue : 'var(--clss-hairline-on-paper-strong)'}`,
                color: 'var(--clss-ink-700)',
                fontSize: '0.92rem',
              }}
            >
              {reached
                ? 'the robot reached the goal — nice loop.'
                : 'not quite — the robot missed the goal. tweak the blocks and run again.'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardBody>
  );
}

const stepBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
  background: 'var(--clss-paper)',
  color: 'var(--clss-ink-700)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  lineHeight: 1,
};

const miniAdd: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '0.5px dashed var(--clss-hairline-on-paper-strong)',
  background: 'transparent',
  color: 'var(--clss-ink-500)',
  cursor: 'pointer',
  fontSize: '0.82rem',
};

// --- Gallery demo ---------------------------------------------------------------------------------

export const BLOCK_DEMO: BlockAssemblySpec = {
  id: 'demo-garden',
  title: 'walk the robot home',
  prompt: 'build a program so the robot reaches the marker. try a repeat.',
  grid: { cols: 5, rows: 5 },
  start: { x: 0, y: 4, dir: 'up' },
  goal: { x: 4, y: 0 },
  walls: [{ x: 2, y: 2 }],
};
