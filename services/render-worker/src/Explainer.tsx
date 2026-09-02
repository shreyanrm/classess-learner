/**
 * Explainer.tsx — the Remotion composition.
 *
 * One <Sequence> per scene, each exactly its beat length in frames. The scene's self-animating SVG
 * is injected as-is and its SMIL timeline is driven off Remotion's frame clock (setCurrentTime), so
 * a headless frame-seek reproduces the same animation the browser plays live. Voiceover, per-beat
 * sfx cues and an optional BGM bed are mixed by Remotion's ffmpeg pass (audio law). Beat lengths and
 * total duration come straight from the plan — no fixed timers, no length cap.
 */

import { useLayoutEffect, useRef } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// NB: `type` (not `interface`) — Remotion's <Composition component> constrains props to
// `Record<string, unknown>`, which object-literal type aliases satisfy but interfaces do not.
export type ExplainerSfx = {
  file: string;
  fromFrame: number;
};
export type ExplainerScene = {
  id: string;
  svg: string;
  frames: number;
  audioFile: string | null;
  sfx: ExplainerSfx[];
};
export type ExplainerProps = {
  scenes: ExplainerScene[];
  bedFile: string | null;
  bgmFile: string | null;
  bgmGain: number;
};

const PAPER = '#FFFFFF'; // VIDEO-QUALITY §4: white paper is the ground

/** Make a bare `<svg viewBox=…>` fill the frame while preserving its aspect ratio. */
function fitSvg(svg: string): string {
  return svg.replace(
    /<svg\b/,
    '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block"',
  );
}

function SvgStage({ svg }: { svg: string }) {
  const frame = useCurrentFrame(); // 0-based within this scene's Sequence
  const { fps } = useVideoConfig();
  const host = useRef<HTMLDivElement>(null);

  // Remotion seeks frame-by-frame; SMIL must follow the frame, not wall-clock. Pin the SVG
  // animation timeline to this frame's time. useLayoutEffect => set before Remotion screenshots.
  useLayoutEffect(() => {
    const el = host.current?.querySelector('svg') as
      | (SVGSVGElement & {
          pauseAnimations?: () => void;
          setCurrentTime?: (t: number) => void;
        })
      | null;
    if (!el) return;
    el.pauseAnimations?.();
    el.setCurrentTime?.(frame / fps);
  }, [frame, fps]);

  return (
    <AbsoluteFill
      style={{ backgroundColor: PAPER, justifyContent: 'center', alignItems: 'center' }}
    >
      <div
        ref={host}
        style={{ width: '100%', height: '100%' }}
        // svg is sanitizer-cleaned upstream (plexus/sanitize.py) before it is ever cached
        // biome-ignore lint/security/noDangerouslySetInnerHtml: cached artifacts are pre-sanitized
        dangerouslySetInnerHTML={{ __html: fitSvg(svg) }}
      />
    </AbsoluteFill>
  );
}

export function Explainer({ scenes, bedFile, bgmFile, bgmGain }: ExplainerProps) {
  const starts: number[] = [];
  let acc = 0;
  for (const s of scenes) {
    starts.push(acc);
    acc += s.frames;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {bgmFile && <Audio loop src={staticFile(bgmFile)} volume={bgmGain} />}
      {bedFile && <Audio src={staticFile(bedFile)} />}
      {scenes.map((s, i) => (
        <Sequence key={s.id} from={starts[i]} durationInFrames={s.frames} name={s.id}>
          <SvgStage svg={s.svg} />
          {s.audioFile && <Audio src={staticFile(s.audioFile)} />}
          {s.sfx.map((cue, j) => (
            <Sequence
              // biome-ignore lint/suspicious/noArrayIndexKey: cues are positional and stable
              key={`sfx-${j}`}
              from={cue.fromFrame}
              durationInFrames={Math.max(1, s.frames - cue.fromFrame)}
            >
              <Audio src={staticFile(cue.file)} />
            </Sequence>
          ))}
        </Sequence>
      ))}
      {/* Wobo watermark — owner law: bottom-right of every video. Above scenes, always on. */}
      <img
        src={staticFile('wobo-logo.png')}
        alt=""
        style={{
          position: 'absolute',
          right: '2.5%',
          bottom: '2.5%',
          height: '3.75%', // ~27px at 720p; scales with the frame
          width: 'auto',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
}
