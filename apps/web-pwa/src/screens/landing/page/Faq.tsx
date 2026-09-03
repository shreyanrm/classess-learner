'use client';

/**
 * The questions families actually ask, as a plain `<details>` accordion.
 *
 * Native disclosure rather than a built one: it opens with a keyboard, it is findable by the
 * browser's own in-page search even while closed in browsers that support that, and it needs no
 * JavaScript at all. The only thing added is the chevron, and the only thing removed is the
 * default marker.
 */

import { FAQ } from './copy';

export function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <span className="chapter reveal">{FAQ.chapter}</span>
        <h2 className="t reveal">{FAQ.title}</h2>
        <div className="faq">
          {FAQ.items.map((item) => (
            <details className="rise" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
