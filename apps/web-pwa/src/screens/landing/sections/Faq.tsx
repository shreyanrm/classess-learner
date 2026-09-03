'use client';

/**
 * "What families ask before they start" — six questions, on the native disclosure element.
 *
 * `<details>`/`<summary>` rather than a scripted accordion: it is keyboard-operable, announced
 * correctly, findable by the browser's own in-page search when open, and it works before any
 * JavaScript has run. The only thing the stylesheet adds is the chevron and the tonal card.
 */

import type { CSSProperties } from 'react';
import { FAQ } from '../page-copy';

export function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <span className="chapter reveal">{FAQ.chapter}</span>
        <h2 className="t reveal">{FAQ.title}</h2>
        <div className="faq">
          {FAQ.items.map((item, i) => (
            <details className="rise" key={item.q} style={{ '--i': i + 1 } as CSSProperties}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
