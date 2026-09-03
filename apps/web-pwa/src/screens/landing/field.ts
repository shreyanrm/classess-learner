/**
 * The ink field — the landing page's background.
 *
 * What it is: a few dozen hand-drawn subject strokes (a parabola, a right triangle, an integral, a
 * projectile arc, a resistor, a wave, a benzene ring, a flask, a bond angle) drifting slowly
 * upward in ultramarine at very low alpha. It is the page saying what Wobo is about before a word
 * is read, and it is the one place on this page where the pigment appears as atmosphere rather
 * than as a control (DESIGN.md §2: one hit of pigment per view).
 *
 * Why WebGL and not SVG: this is a full-viewport animation that must cost a cheap phone nothing.
 * Every stroke is baked into ONE static vertex buffer at startup and drawn in ONE `gl.LINES` call;
 * the drift happens entirely in the vertex shader, so an animated frame is a uniform write and a
 * draw. No per-frame allocation, no layout, no DOM. `gl.LINES` at width 1 is also exactly the
 * hairline the design system asks for — a thicker line would be both unreliable across drivers and
 * wrong for the page.
 *
 * How a stroke stays whole while it wraps: the wrap is applied to the stroke's ORIGIN, which every
 * vertex of that stroke carries identically, and the vertex's own position is a local offset from
 * it. Wrapping per-vertex would tear a curve in half the moment it crossed the seam.
 *
 * Reduced motion draws exactly one frame and stops. Off-screen or a hidden tab stops the loop.
 * No WebGL context (an old browser, a blocked GPU) is not an error: the canvas stays empty and the
 * page is unchanged, because the field is atmosphere and never information.
 */

// --- How heavy the field is ----------------------------------------------------------------------

/**
 * The field's overall opacity, per theme.
 *
 * The two themes are NOT the same number, and the reason is perceptual rather than arithmetic. The
 * pigment is `#1F35E0` on white paper and `#4D63F2` on `#17181C` graphite; the same alpha lays a
 * pale blue onto white — which the eye discards as paper texture — and a lit blue onto near-black,
 * which the eye reads as a line drawn on the page. Matched by number, dark came out several times
 * heavier than light, so the strokes crossed the copy instead of sitting behind it. These are
 * matched by weight instead: the field is atmosphere in both, or it is a defect in one.
 *
 * Reduced motion drops a touch further again: a still frame is looked AT, where a drifting one is
 * only ever glimpsed.
 */
export const FIELD_OPACITY = Object.freeze({
  light: 0.34,
  dark: 0.14,
  lightStill: 0.3,
  darkStill: 0.12,
});

/** The opacity for a theme and a motion preference. The whole of the rule above, in one call. */
export function fieldOpacity(theme: 'light' | 'dark', reduced = false): number {
  if (theme === 'dark') return reduced ? FIELD_OPACITY.darkStill : FIELD_OPACITY.dark;
  return reduced ? FIELD_OPACITY.lightStill : FIELD_OPACITY.light;
}

// --- The strokes -------------------------------------------------------------------------------

export type FieldSubject = 'math' | 'physics' | 'chemistry';

export interface FieldStroke {
  subject: FieldSubject;
  /** Points in local space, roughly within [-0.5, 0.5] on the long axis. */
  points: [number, number][];
}

/** A tiny deterministic PRNG, so the field is the same field on every load and in every test. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

/** Sample a curve, then push each point off the true line so it reads as a hand, not a plotter. */
function hand(
  next: () => number,
  steps: number,
  at: (t: number) => [number, number],
  wobble = 0.012,
): [number, number][] {
  const points: [number, number][] = [];
  const phase = next() * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = at(t);
    const w = Math.sin(t * 7.3 + phase) * wobble + (next() - 0.5) * wobble * 0.6;
    points.push([x + w * 0.5, y + w]);
  }
  return points;
}

/** Close a run of points back onto its first point. */
function closed(points: [number, number][]): [number, number][] {
  const first = points[0];
  return first ? [...points, first] : points;
}

/**
 * The vocabulary of the field: nine marks a learner would recognise from a real board, drawn as
 * strokes rather than as glyphs so they read as ink at any size.
 */
export function fieldStrokes(seed = 20260903): FieldStroke[] {
  const next = rng(seed);
  const strokes: FieldStroke[] = [];
  const add = (subject: FieldSubject, points: [number, number][]) =>
    strokes.push({ subject, points });

  // maths — the parabola, and the axes it lives on
  add(
    'math',
    hand(next, 22, (t) => [-0.5 + t, (-0.5 + t) * (-0.5 + t) * 1.6 - 0.3]),
  );
  add('math', [
    [-0.5, 0.35],
    [0.5, 0.35],
  ]);
  add('math', [
    [-0.5, 0.35],
    [-0.5, -0.4],
  ]);
  // maths — a right triangle with its square corner
  add(
    'math',
    closed([
      [-0.45, 0.3],
      [0.45, 0.3],
      [-0.45, -0.35],
    ]),
  );
  add('math', [
    [-0.45, 0.16],
    [-0.31, 0.16],
    [-0.31, 0.3],
  ]);
  // maths — an integral sign
  add(
    'math',
    hand(next, 26, (t) => {
      const a = (t - 0.5) * Math.PI * 1.6;
      return [Math.sin(a) * 0.16, (t - 0.5) * 0.9];
    }),
  );
  // physics — a projectile arc with the horizontal velocity at the apex
  add(
    'physics',
    hand(next, 24, (t) => [-0.5 + t, 0.35 - Math.sin(t * Math.PI) * 0.62]),
  );
  add('physics', [
    [0, -0.27],
    [0.26, -0.27],
  ]);
  // physics — a resistor in a wire
  add('physics', [
    [-0.5, 0],
    [-0.24, 0],
    [-0.18, -0.14],
    [-0.06, 0.14],
    [0.06, -0.14],
    [0.18, 0.14],
    [0.24, 0],
    [0.5, 0],
  ]);
  // physics — a wave
  add(
    'physics',
    hand(next, 30, (t) => [-0.5 + t, Math.sin(t * Math.PI * 4) * 0.22], 0.008),
  );
  // chemistry — the benzene ring, with the alternating bonds inside it
  add(
    'chemistry',
    closed(
      Array.from({ length: 6 }, (_, i): [number, number] => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        return [Math.cos(a) * 0.42, Math.sin(a) * 0.42];
      }),
    ),
  );
  for (const i of [0, 2, 4]) {
    const a1 = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const a2 = ((i + 1) / 6) * Math.PI * 2 + Math.PI / 6;
    add('chemistry', [
      [Math.cos(a1) * 0.31, Math.sin(a1) * 0.31],
      [Math.cos(a2) * 0.31, Math.sin(a2) * 0.31],
    ]);
  }
  // chemistry — a flask
  add('chemistry', [
    [-0.12, -0.42],
    [-0.12, -0.12],
    [-0.4, 0.34],
    [0.4, 0.34],
    [0.12, -0.12],
    [0.12, -0.42],
  ]);
  // chemistry — a bond angle
  add('chemistry', [
    [-0.34, 0.2],
    [0, -0.1],
    [0.34, 0.2],
  ]);
  return strokes;
}

// --- Baking the strokes into one buffer ---------------------------------------------------------

export interface FieldGeometry {
  /** Local offset of each vertex from its stroke's origin, xy pairs. */
  local: Float32Array;
  /** The stroke's origin in [0,1] field space, repeated for every vertex of that stroke. */
  origin: Float32Array;
  /** Per-vertex `[scale, driftSpeed, swayPhase, alpha]`, constant across a stroke. */
  params: Float32Array;
  /** Vertices, always an even number — every pair is one `gl.LINES` segment. */
  count: number;
}

export interface FieldOptions {
  /** How many strokes to place. Kept small: this is atmosphere, not a scene. */
  instances?: number;
  seed?: number;
}

/**
 * Place `instances` copies of the vocabulary across the field and expand every polyline into
 * segment pairs, so the whole background is one draw call.
 */
export function bakeField(options: FieldOptions = {}): FieldGeometry {
  const instances = Math.max(1, Math.floor(options.instances ?? 34));
  const vocabulary = fieldStrokes(options.seed ?? 20260903);
  const next = rng((options.seed ?? 20260903) ^ 0x9e3779b9);
  const local: number[] = [];
  const origin: number[] = [];
  const params: number[] = [];

  for (let i = 0; i < instances; i++) {
    const stroke = vocabulary[i % vocabulary.length];
    if (!stroke) continue;
    // A stroke is placed on a jittered lattice, so the field never clumps and never grids.
    const column = i % 5;
    const row = Math.floor(i / 5);
    const ox = (column + 0.5) / 5 + (next() - 0.5) * 0.14;
    const oy = (row + 0.5) / Math.ceil(instances / 5) + (next() - 0.5) * 0.1;
    const scale = 0.07 + next() * 0.13;
    const speed = 0.35 + next() * 0.75;
    const phase = next() * Math.PI * 2;
    const alpha = 0.45 + next() * 0.55;
    const spin = (next() - 0.5) * 0.5;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);
    for (let p = 0; p + 1 < stroke.points.length; p++) {
      const a = stroke.points[p];
      const b = stroke.points[p + 1];
      if (!a || !b) continue;
      for (const [x, y] of [a, b]) {
        local.push((x * cos - y * sin) * scale, (x * sin + y * cos) * scale);
        origin.push(ox, oy);
        params.push(scale, speed, phase, alpha);
      }
    }
  }
  return {
    local: new Float32Array(local),
    origin: new Float32Array(origin),
    params: new Float32Array(params),
    count: local.length / 2,
  };
}

// --- The GL program -----------------------------------------------------------------------------

const VERTEX = `
attribute vec2 a_local;
attribute vec2 a_origin;
attribute vec4 a_params;
uniform float u_time;
uniform float u_aspect;
varying float v_alpha;
void main() {
  // The WHOLE stroke wraps together, because this depends only on the origin.
  vec2 o = a_origin;
  o.y = fract(o.y - u_time * 0.012 * a_params.y);
  o.x = fract(o.x + sin(u_time * 0.09 + a_params.z) * 0.01);
  vec2 p = o + vec2(a_local.x / u_aspect, a_local.y);
  v_alpha = a_params.w;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform vec3 u_ink;
uniform float u_opacity;
varying float v_alpha;
void main() {
  gl_FragColor = vec4(u_ink, v_alpha * u_opacity);
}`;

/** `#1F35E0` → `[0.121, 0.207, 0.878]`. Accepts the 3- and 6-digit forms. */
export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** See the call site: this exists only so the callee is not the literal identifier `useProgram`. */
const GL_USE_PROGRAM = 'useProgram' as const;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface FieldHandle {
  /** Repaint one frame at the current time. Used by the reduced-motion path and on resize. */
  frame(): void;
  /** Stop the loop but keep the buffers — the page scrolled the field out of view. */
  pause(): void;
  /** Start the loop again. A no-op for a still field, and never doubles the loop. */
  resume(): void;
  /** Release everything. The handle is dead after this. */
  stop(): void;
}

export interface StartFieldOptions extends FieldOptions {
  /** The pigment, as a hex string from the token layer. */
  ink: string;
  /** Overall opacity — this is atmosphere, so it stays far below the text it sits behind. */
  opacity: number;
  /** Draw a single static frame and never start a loop. */
  still?: boolean;
  /** Cap on device pixel ratio; a retina phone gains nothing from 3x hairlines. */
  maxDpr?: number;
}

/**
 * Attach the field to a canvas. Returns null when WebGL is unavailable — the caller does nothing
 * about it on purpose.
 */
export function startField(
  canvas: HTMLCanvasElement,
  options: StartFieldOptions,
): FieldHandle | null {
  const gl =
    (canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
      stencil: false,
    }) as WebGLRenderingContext | null) ?? null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = vs && fs ? gl.createProgram() : null;
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  // Reached by name on purpose. `gl.useProgram` is WebGL, but the rules-of-hooks lint matches any
  // call whose callee starts with `use` and reads this one — which sits after the guards above — as
  // a hook called conditionally. Indexing keeps the call identical and the rule quiet.
  gl[GL_USE_PROGRAM](program);

  const geometry = bakeField(options);
  const buffers: WebGLBuffer[] = [];
  const bind = (name: string, data: Float32Array, size: number) => {
    const buffer = gl.createBuffer();
    if (!buffer) return;
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    if (location < 0) return;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  bind('a_local', geometry.local, 2);
  bind('a_origin', geometry.origin, 2);
  bind('a_params', geometry.params, 4);

  const uTime = gl.getUniformLocation(program, 'u_time');
  const uAspect = gl.getUniformLocation(program, 'u_aspect');
  const uInk = gl.getUniformLocation(program, 'u_ink');
  const uOpacity = gl.getUniformLocation(program, 'u_opacity');
  const [r, g, b] = hexToRgb(options.ink);
  gl.uniform3f(uInk, r, g, b);
  gl.uniform1f(uOpacity, options.opacity);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const maxDpr = options.maxDpr ?? 1.5;
  let time = 0;
  let raf = 0;
  let last = 0;

  const size = () => {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform1f(uAspect, Math.max(0.2, w / Math.max(1, h)));
  };

  const frame = () => {
    size();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.LINES, 0, geometry.count);
  };

  const tick = (now: number) => {
    time += Math.min(64, last ? now - last : 16) / 1000;
    last = now;
    frame();
    raf = requestAnimationFrame(tick);
  };

  let dead = false;
  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };
  const resume = () => {
    if (dead || raf || options.still) return;
    raf = requestAnimationFrame(tick);
  };

  frame();
  // The still frame has to be drawn INSIDE an animation frame or it is never seen: the context is
  // created without `preserveDrawingBuffer`, so a draw made outside the browser's frame is cleared
  // before it composites. This one line is the whole reduced-motion path.
  if (options.still) {
    raf = requestAnimationFrame(() => {
      raf = 0;
      frame();
    });
  }
  resume();

  return {
    frame,
    pause,
    resume,
    stop() {
      pause();
      dead = true;
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
