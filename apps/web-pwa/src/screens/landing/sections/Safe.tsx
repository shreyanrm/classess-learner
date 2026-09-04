'use client';

/**
 * "Safe by design" — six decisions, each one visible in the product and each one checkable.
 *
 * The prototype ends each item with a proof link. Here every one of those is a REAL address: the
 * security page, the privacy policy, the children's privacy page. A claim about safety that ends in
 * a link going nowhere is worse than no claim at all.
 */

import { SafeIcon } from '../art';
import { LandingLink } from '../link';
import { SAFE } from '../page-copy';

export function Safe() {
  return (
    <section id="safe">
      <div className="wrap">
        <div className="eyebrow reveal">{SAFE.eyebrow}</div>
        <h2 className="t reveal">
          {SAFE.title.lead}
          <span className="hl">{SAFE.title.mark}</span>
        </h2>
        <p className="lede reveal">{SAFE.lede}</p>
        <div className="safe">
          {SAFE.items.map((item, i) => (
            <div className="item reveal" key={item.title}>
              <SafeIcon index={i} />
              <div>
                <b>{item.title}</b>
                <p>{item.body}</p>
                <LandingLink className="proof" href={item.href}>
                  {item.proof}
                </LandingLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
