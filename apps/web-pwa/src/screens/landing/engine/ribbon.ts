/**
 * The ribbon — the highlighter trace the pen leaves behind it.
 *
 * Not a polyline with a fading stroke: ONE continuous filled shape. Each frame the eased head
 * position is pushed onto a short trail, every point's tangent gives a normal, and the trail is
 * expanded into two offset edges whose separation falls with the point's age. The two edges are
 * smoothed with quadratic midpoints, closed into a single path, and filled once — which is why the
 * mark reads as a marker laid down in one pass rather than as N overlapping segments with N seams.
 *
 * The pigment is the page's: marigold multiplied onto paper, Wobo blue screened onto night. The
 * trail is bounded by TIME, not by length — anything older than one life is shifted off the front
 * every frame, so the array cannot grow however fast the pointer moves.
 */

import { type Disposer, finePointer, isDark, lerp, prefersReducedMotion, safeWindow } from './env';
import type { PointerState } from './pointer';

/** How long a point of the ribbon lives, in ms. */
export const RIBBON_LIFE = 650;

/** How fast the ribbon's head closes on the pointer — slower than the nib, so it trails it. */
export const RIBBON_EASE = 0.45;

/** The round cap drawn at the head, so the ribbon never looks cut off. */
export const RIBBON_HEAD_RADIUS = 10;

/** Below four points there is no tangent worth trusting, and nothing is drawn. */
export const RIBBON_MIN_POINTS = 4;

/** A point of the trail. */
export interface Mark {
  x: number;
  y: number;
  /** `performance.now()` when the head was here. */
  t: number;
}

/**
 * Half the ribbon's width at a given normalised age: 20 px across at the head, 2 px at the tail,
 * on a 1.4 power so the taper holds its body and then lets go quickly.
 */
export function ribbonHalfWidth(age: number): number {
  const k = (1 - Math.min(1, Math.max(0, age))) ** 1.4;
  return (2 + 18 * k) / 2;
}

/**
 * How many points the trail holds at a frame rate. The density formula: the trail is a time
 * window, so its length is bounded by life × fps regardless of pointer speed.
 */
export function markCapacity(life = RIBBON_LIFE, fps = 60): number {
  return Math.ceil((life / 1000) * fps) + 1;
}

/** Drop everything older than one life, in place, from the front. Returns how many went. */
export function pruneMarks(marks: Mark[], now: number, life = RIBBON_LIFE): number {
  let dropped = 0;
  while (marks.length) {
    const head = marks[0];
    if (!head || now - head.t <= life) break;
    marks.shift();
    dropped++;
  }
  return dropped;
}

/** The two offset edges of the ribbon, in order. Pure: this is the whole geometry of the mark. */
export function ribbonEdges(
  marks: readonly Mark[],
  now: number,
  life = RIBBON_LIFE,
): { left: [number, number][]; right: [number, number][] } {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const n = marks.length;
  for (let i = 0; i < n; i++) {
    const p0 = marks[Math.max(0, i - 1)];
    const p1 = marks[i];
    const p2 = marks[Math.min(n - 1, i + 1)];
    if (!p0 || !p1 || !p2) continue;
    let tx = p2.x - p0.x;
    let ty = p2.y - p0.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = ribbonHalfWidth((now - p1.t) / life);
    left.push([p1.x - ty * w, p1.y + tx * w]);
    right.push([p1.x + ty * w, p1.y - tx * w]);
  }
  return { left, right };
}

/** The pigment and the blend mode, per theme. Marigold on paper, Wobo blue on night. */
export function ribbonInk(dark: boolean): { fill: string; blend: 'multiply' | 'screen' } {
  return dark
    ? { fill: 'rgba(124,140,255,0.5)', blend: 'screen' }
    : { fill: 'rgba(255,182,41,0.4)', blend: 'multiply' };
}

export interface PaintSize {
  width: number;
  height: number;
}

/** Paint one frame of the ribbon: clear, build the closed outline, fill once, cap the head. */
export function paintRibbon(
  ctx: CanvasRenderingContext2D,
  marks: readonly Mark[],
  now: number,
  size: PaintSize,
  dark = false,
  life = RIBBON_LIFE,
): void {
  ctx.clearRect(0, 0, size.width, size.height);
  const n = marks.length;
  if (n < RIBBON_MIN_POINTS) return;
  const { left, right } = ribbonEdges(marks, now, life);
  const a = left[0];
  const tail = right[n - 1];
  const head = marks[n - 1];
  if (!a || !tail || !head) return;

  ctx.fillStyle = ribbonInk(dark).fill;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  for (let i = 1; i < n - 1; i++) {
    const p = left[i];
    const q = left[i + 1];
    if (!p || !q) continue;
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.lineTo(tail[0], tail[1]);
  for (let i = n - 2; i > 0; i--) {
    const p = right[i];
    const q = right[i - 1];
    if (!p || !q) continue;
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(head.x, head.y, RIBBON_HEAD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

export interface RibbonOptions {
  pointer: PointerState;
  win?: Window;
  doc?: Document;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
  now?: () => number;
  manual?: boolean;
}

export interface RibbonHandle {
  frame(): void;
  resize(): void;
  /** The live trail. Exposed so a test can watch it stay bounded. */
  marks: Mark[];
  dispose: Disposer;
}

/**
 * Attach the ribbon to its canvas. Coarse pointers and reduced motion get an inert handle and no
 * listeners at all — the canvas simply stays empty.
 */
export function mountRibbon(
  canvas: HTMLCanvasElement | null,
  options: RibbonOptions,
): RibbonHandle {
  const marks: Mark[] = [];
  const inert: RibbonHandle = { frame() {}, resize() {}, marks, dispose: () => {} };
  const win = options.win ?? safeWindow();
  if (!canvas || !win) return inert;
  if (!finePointer(win) || prefersReducedMotion(win)) return inert;
  const ctx = canvas.getContext('2d');
  if (!ctx) return inert;

  const pointer = options.pointer;
  const now = options.now ?? (() => performance.now());
  const raf = options.raf ?? win.requestAnimationFrame.bind(win);
  const caf = options.caf ?? win.cancelAnimationFrame.bind(win);

  let mx = pointer.x;
  let my = pointer.y;
  let handle = 0;
  let live = true;

  const resize = () => {
    const d = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = win.innerWidth * d;
    canvas.height = win.innerHeight * d;
    canvas.style.width = `${win.innerWidth}px`;
    canvas.style.height = `${win.innerHeight}px`;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  resize();

  const frame = () => {
    const t = now();
    mx = lerp(mx, pointer.x, RIBBON_EASE);
    my = lerp(my, pointer.y, RIBBON_EASE);
    if (pointer.has) marks.push({ x: mx, y: my, t });
    pruneMarks(marks, t);
    paintRibbon(
      ctx,
      marks,
      t,
      { width: win.innerWidth, height: win.innerHeight },
      isDark(options.doc ?? canvas.ownerDocument),
    );
  };

  win.addEventListener('resize', resize);
  if (!options.manual) {
    const loop = () => {
      if (!live) return;
      frame();
      handle = raf(loop);
    };
    handle = raf(loop);
  }

  return {
    frame,
    resize,
    marks,
    dispose() {
      live = false;
      if (handle) caf(handle);
      handle = 0;
      win.removeEventListener('resize', resize);
      marks.length = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
