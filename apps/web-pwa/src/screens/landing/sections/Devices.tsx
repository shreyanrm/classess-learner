'use client';

/**
 * "The same tutor on every screen in the house."
 *
 * The browser is live; the three native apps are marked "soon" and say so on the chip itself rather
 * than in a footnote. All four point at the early-access form, because that is the only honest
 * destination for any of them until the product opens.
 */

import { DevicesArt } from '../art';
import { earlyAccessHandler } from '../link';
import { DEVICES } from '../page-copy';

export function Devices() {
  const onEarly = earlyAccessHandler();
  return (
    <section id="devices">
      <div className="wrap">
        <div className="row">
          <div>
            <div className="eyebrow reveal">{DEVICES.eyebrow}</div>
            <h2 className="t reveal">
              {DEVICES.title.lead}
              <span className="hl">{DEVICES.title.mark}</span>
            </h2>
            <p className="lede reveal">{DEVICES.lede}</p>
            <div className="devices reveal">
              {DEVICES.items.map((item) => (
                /* biome-ignore lint/a11y/useValidAnchor: `#early` is a real in-page anchor;
                   the handler only eases the scroll and focuses the field. */
                <a
                  key={item.label}
                  className={item.soon ? undefined : 'live'}
                  href="#early"
                  onClick={onEarly}
                >
                  <span>{item.label}</span>
                  {item.soon ? <small>{DEVICES.soon}</small> : null}
                </a>
              ))}
            </div>
          </div>
          <div className="art">
            <DevicesArt label="The same lesson on a laptop, a tablet and a phone" />
          </div>
        </div>
      </div>
    </section>
  );
}
