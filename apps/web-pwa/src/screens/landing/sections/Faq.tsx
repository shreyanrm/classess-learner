'use client';

/**
 * "What families ask first." — five questions, on the native disclosure element.
 *
 * `<details>`/`<summary>` rather than a scripted accordion: keyboard-operable, announced correctly,
 * findable by the browser's own in-page search when open, and it works before any JavaScript has
 * run. The stylesheet adds the tonal card and the plus that turns into a minus, and nothing else.
 */

import { FAQ } from '../page-copy';

export function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <div className="eyebrow reveal">{FAQ.eyebrow}</div>
        <h2 className="t reveal">{FAQ.title}</h2>
        <div className="faq reveal">
          {FAQ.items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
