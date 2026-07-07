/**
 * Root.tsx — Remotion entry. Registers the single "Explainer" composition. Duration is derived
 * from the plan (sum of beat frames) via calculateMetadata; nothing here is hard-coded per video.
 */

import { Composition, registerRoot } from 'remotion';
import { Explainer, type ExplainerProps } from './Explainer.tsx';

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

const DEFAULTS: ExplainerProps = { scenes: [], bedFile: null, bgmFile: null, bgmGain: 0.14 };

function RemotionRoot() {
  return (
    <Composition
      id="Explainer"
      component={Explainer}
      durationInFrames={1}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={DEFAULTS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          1,
          props.scenes.reduce((a, s) => a + s.frames, 0),
        ),
      })}
    />
  );
}

registerRoot(RemotionRoot);
