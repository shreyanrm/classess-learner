/**
 * plan.ts — the pure, Remotion-free core of the render worker.
 *
 * Takes a cached scene-plan artifact JSON (engine.video) verbatim and derives a RenderPlan:
 * one beat per scene, each beat's length set by its MEASURED narration-audio duration (beat-sync
 * law, MOTION.md §5) — never a fixed timer, never a length cap. This mirrors, exactly, the app's
 * `motionSceneFromVideo` bridge in apps/web-pwa/src/screens/course/Composing.tsx so the rendered
 * MP4 and the live MotionPlayer agree frame-for-frame on where each beat ends.
 */

import { createHash } from 'node:crypto';

export const FPS = 30;
export const WIDTH = 1280; // 2× the 640×360 storyboard grid (VIDEO-QUALITY.md §2) — clean scale
export const HEIGHT = 720;
const DEFAULT_BEAT_MS = 6000; // authored fallback used by the app when a scene has neither measure

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const asNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export interface AudioTrack {
  mime: string;
  b64: string;
}
export interface SfxCue extends AudioTrack {
  /** offset (ms) from the start of the scene's beat where the cue fires */
  atMs: number;
}
export interface PlanScene {
  id: string;
  svg: string;
  /** measured audio ms when present, else authored durationMs, else the default beat */
  beatMs: number;
  frames: number;
  audio: AudioTrack | null;
  sfx: SfxCue[];
}
export interface RenderPlan {
  scenes: PlanScene[];
  /** artifact-level continuous narration track (older single-track artifacts) */
  bed: AudioTrack | null;
  /** optional low-gain music bed under everything (audio law) */
  bgm: (AudioTrack & { gain: number }) | null;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  totalMs: number;
  /** content hash of everything that affects the render — drives reuse economy + version suffix */
  sceneSpecHash: string;
  model: string;
}

export const msToFrames = (ms: number): number => Math.max(1, Math.round((ms / 1000) * FPS));

function readAudio(v: unknown): AudioTrack | null {
  if (!isRecord(v)) return null;
  const mime = asStr(v.mime);
  const b64 = asStr(v.b64);
  return mime && b64 ? { mime, b64 } : null;
}

function readSfx(v: unknown): SfxCue[] {
  const list = Array.isArray(v) ? v : v == null ? [] : [v];
  const out: SfxCue[] = [];
  for (const item of list) {
    const track = readAudio(item);
    if (!track) continue;
    const atMs = isRecord(item) ? (asNum(item.atMs) ?? 0) : 0;
    out.push({ ...track, atMs: Math.max(0, atMs) });
  }
  return out;
}

/**
 * Parse the artifact into a RenderPlan. Scenes whose visual is not a watchable SVG string are
 * dropped (same rule as the app). Throws if nothing renderable survives.
 */
export function buildPlan(raw: unknown): RenderPlan {
  const root = isRecord(raw) ? raw : {};
  const artifact = isRecord(root.artifact) ? root.artifact : root;
  const rawScenes = Array.isArray(artifact.scenes) ? artifact.scenes : [];

  const scenes: PlanScene[] = [];
  rawScenes.forEach((s, i) => {
    if (!isRecord(s)) return;
    const visual = isRecord(s.visual) ? s.visual : null;
    const payload = visual ? asStr(visual.payload) : null;
    const kind = visual ? asStr(visual.kind) : null;
    // svg/diagram payloads are watchable SVG strings; a `sim` payload is interactive, not video
    if (!payload || (kind !== 'svg' && kind !== 'diagram')) return;

    const audio = readAudio(s.audio);
    const measured = isRecord(s.audio)
      ? asNum((s.audio as Record<string, unknown>).durationMs)
      : null;
    const authored = asNum(s.durationMs);
    const beatMs = measured ?? authored ?? DEFAULT_BEAT_MS; // measured wins (beat-sync law)

    scenes.push({
      id: asStr(s.id) ?? `s${i + 1}`,
      svg: payload,
      beatMs,
      frames: msToFrames(beatMs),
      audio,
      sfx: readSfx(s.sfx),
    });
  });

  if (scenes.length === 0) throw new Error('render plan: no renderable SVG scenes in artifact');

  const bed = readAudio(artifact.narrationAudio);
  const rawBgm = readAudio(artifact.bgm);
  const bgm = rawBgm
    ? { ...rawBgm, gain: asNum((artifact.bgm as Record<string, unknown>).gain) ?? 0.14 }
    : null;

  const totalFrames = scenes.reduce((a, s) => a + s.frames, 0);
  const totalMs = scenes.reduce((a, s) => a + s.beatMs, 0);
  const provenance = isRecord(root.provenance) ? root.provenance : {};
  const model = asStr(provenance.model) ?? 'unknown';

  return {
    scenes,
    bed,
    bgm,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    totalFrames,
    totalMs,
    sceneSpecHash: sceneSpecHash(scenes, bed, bgm),
    model,
  };
}

/** Hash of every input that changes the pixels/audio — same spec ⇒ same hash ⇒ reuse the MP4. */
function sceneSpecHash(
  scenes: PlanScene[],
  bed: AudioTrack | null,
  bgm: (AudioTrack & { gain: number }) | null,
): string {
  const spec = {
    v: 1,
    fps: FPS,
    w: WIDTH,
    h: HEIGHT,
    scenes: scenes.map((s) => ({
      id: s.id,
      svg: s.svg,
      frames: s.frames,
      audio: s.audio?.b64 ?? null,
      sfx: s.sfx.map((c) => ({ b64: c.b64, atMs: c.atMs })),
    })),
    bed: bed?.b64 ?? null,
    bgm: bgm ? { b64: bgm.b64, gain: bgm.gain } : null,
  };
  return createHash('sha256').update(JSON.stringify(spec)).digest('hex').slice(0, 16);
}
