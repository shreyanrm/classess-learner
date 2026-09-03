'use client';

/**
 * The CS ramp's gallery section — drop-in for EnginesGallery. Each engine drives its primary action
 * through the course ActionBar seam (setBar); this wrapper holds that bar state locally and renders
 * an ActionBar under each bench so the demos are fully operable on the workshop bench.
 *
 * To wire into EnginesGallery.tsx, add two lines:
 *   import { CsRampDemos } from '../../engines/cs/gallery';
 *   …then render <CsRampDemos /> as a new section.
 */

import { type ReactNode, useState } from 'react';
import { ActionBar, type BarState, whisper } from '../../screens/course/shared';
import { BLOCK_DEMO, BlockAssembly } from './BlockAssembly';
import { EXECVIZ_DEMO, ExecViz } from './ExecViz';
import { PARSONS_DEMO, Parsons } from './Parsons';

// a fixed, valid UUID (v7-shaped, all-hex) so demo evidence events validate on the bench
const DEMO_NODE = '00000000-0000-7000-8000-0000000000c5';
const noop = () => {};
// indigo — the CS ramp's colour; the engines default to this too
const CS_HUE = '#6C63FF';

function CsBench({
  id,
  name,
  render,
}: {
  id: string;
  name: string;
  render: (setBar: (b: BarState | null) => void) => ReactNode;
}) {
  const [bar, setBar] = useState<BarState | null>(null);
  return (
    <section
      id={id}
      style={{ borderTop: '0.5px solid var(--wobo-hairline-on-paper)', padding: '18px 0 20px' }}
    >
      <div style={{ ...whisper, padding: '0 24px', marginBottom: 4 }}>{name}</div>
      {render(setBar)}
      <ActionBar bar={bar} />
    </section>
  );
}

export function CsRampDemos() {
  return (
    <>
      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={whisper}>the cs ramp · teach the thinking, typing is a late reward</div>
      </div>
      <CsBench
        id="engine-block"
        name="block assembly — snap blocks, walk the robot, zero syntax"
        render={(setBar) => (
          <BlockAssembly
            spec={BLOCK_DEMO}
            hue={CS_HUE}
            nodeId={DEMO_NODE}
            setBar={setBar}
            onDone={noop}
          />
        )}
      />
      <CsBench
        id="engine-parsons"
        name="parsons — shuffled correct lines + a distractor, drag to order, run to verify"
        render={(setBar) => (
          <Parsons
            spec={PARSONS_DEMO}
            hue={CS_HUE}
            nodeId={DEMO_NODE}
            setBar={setBar}
            onDone={noop}
          />
        )}
      />
      <CsBench
        id="engine-execviz"
        name="execution visualizer (the jewel) — python + pyodide, step/scrub the machine's mind"
        render={(setBar) => (
          <ExecViz
            spec={EXECVIZ_DEMO}
            hue={CS_HUE}
            nodeId={DEMO_NODE}
            setBar={setBar}
            onDone={noop}
          />
        )}
      />
    </>
  );
}
