'use client';

/**
 * The close: an ink-navy panel, "Begin tonight." in marigold at display size, and Wobo in cream.
 *
 * The panel is ink in light and the night surface in dark, so the last thing on the page is always
 * the darkest thing on it — the page ends the way a lamp-lit desk at 9:40 pm ends. The Wobo beside
 * it is the real rig, wearing the panel's own tones (`#close .big` overrides `--wr-*` in
 * `styles.ts`), because a cream Wobo on a night panel is not the same character as a navy one and
 * the rig should not have to guess.
 */

import { WoboBody } from '@wobo/wobo';
import { useRef } from 'react';
import { useLastInput } from '../attention';
import { useBoxWidth, woboSize } from '../measure';
import { CLOSING } from '../page-copy';

export function Close({ onStart }: { onStart: () => void }) {
  const woboBox = useRef<HTMLDivElement>(null);
  // Reading is attention: without this Wobo dozes off beside the page's last door (attention.ts).
  const idleSince = useLastInput();
  // The prototype's `min(300px, 70%)`, measured off the box the stylesheet made.
  const size = woboSize(useBoxWidth(woboBox), 1, 300, 120);

  return (
    <section id="close">
      <div className="wrap">
        <div className="panel reveal">
          <div>
            <div className="say">{CLOSING.say}</div>
            <h2>{CLOSING.title}</h2>
            <p>{CLOSING.body}</p>
            <button type="button" className="btn" onClick={onStart}>
              {CLOSING.cta}
            </button>
          </div>
          <div className="big" ref={woboBox}>
            {/* Pen up, like every Wobo head in the prototype (see Hero.tsx). */}
            <WoboBody
              size={size}
              mood="drawing"
              gaze="pointer"
              idleSince={idleSince}
              label="Wobo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
