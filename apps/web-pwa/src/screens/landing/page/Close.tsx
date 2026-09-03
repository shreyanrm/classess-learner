'use client';

/**
 * The closing panel: ink-navy, "Begin tonight." in marigold, and Wobo standing in it.
 *
 * Wobo is the real rig here, not the flat head — this is the last thing the reader looks at, and it
 * should be the character, alive, watching them. The rig reads its tones from `data-theme`, and this
 * panel inverts against the page in light mode (a navy panel on cream paper), so the four `--wr-*`
 * tokens are set on it directly: a cream Wobo carrying a night visor, which is the rig's own dark
 * costume worn in daylight. In dark mode the panel is the tonal step and the rig's own tones are
 * already right, so nothing is overridden.
 */

import { WOBO_TONES, WoboBody } from '@wobo/wobo';
import type { CSSProperties } from 'react';
import { CLOSE } from './copy';

/** Wobo's night costume, worn on the ink panel in daylight. */
const CREAM: CSSProperties = {
  '--wr-body': WOBO_TONES.dark.body,
  '--wr-visor': WOBO_TONES.dark.visor,
  '--wr-eye': WOBO_TONES.dark.eye,
  '--wr-hair': WOBO_TONES.dark.hairline,
  width: '100%',
  height: 'auto',
  aspectRatio: '1 / 1',
} as CSSProperties;

export function Close({ onStart }: { onStart: () => void }) {
  return (
    <section id="close">
      <div className="wrap">
        <div className="panel reveal">
          <div>
            <div className="say">{CLOSE.say}</div>
            <h2>{CLOSE.title}</h2>
            <p>{CLOSE.lead}</p>
            <button type="button" className="btn" onClick={onStart}>
              {CLOSE.cta}
            </button>
          </div>
          <WoboBody size={300} className="big" label="Wobo" style={CREAM} />
        </div>
      </div>
    </section>
  );
}
