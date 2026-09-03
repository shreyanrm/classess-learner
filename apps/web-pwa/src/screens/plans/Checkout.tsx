'use client';

/**
 * `/plans/checkout` — the honest state.
 *
 * There is no price, so there is no checkout. This page says that in one line rather than showing a
 * disabled payment form, and lists what will be on it when there is something to buy, because those
 * promises are already made in `docs/legal/refund-and-cancellation.md` §2 and a visitor is entitled
 * to read them before they trust us with a card.
 */

import { useRouter } from '../../shell/router';
import { legalPath } from '../legal/catalog';
import { SiteLink } from '../site/nav';
import { SiteShell } from '../site/SiteShell';
import { CHECKOUT_PAGE } from './copy';
import { ensurePlansStyles } from './styles';

ensurePlansStyles();

export function Checkout() {
  const router = useRouter();
  return (
    <SiteShell current="plans" title="Checkout — Wobo">
      <section className="lp-wrap lp-head" style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
        <p className="lp-crumb">
          <SiteLink href="/plans">Plans</SiteLink>
          <span aria-hidden>/</span>Checkout
        </p>
        <h1 className="lp-h1x">{CHECKOUT_PAGE.title}</h1>
        <p className="lp-lead">{CHECKOUT_PAGE.lead}</p>
        <ul className="lp-lines">
          {CHECKOUT_PAGE.promises.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="lp-cta" style={{ marginTop: 30 }}>
          <button
            type="button"
            className="lp-btn lp-btn--pigment"
            onClick={() => router.navigate({ name: 'onboarding' })}
          >
            {CHECKOUT_PAGE.cta}
          </button>
          <SiteLink href="/plans" className="lp-btn lp-btn--ghost">
            {CHECKOUT_PAGE.back}
          </SiteLink>
        </div>
        <p className="lp-note">
          <SiteLink href={legalPath('refund-and-cancellation')}>
            Renewals, cancelling and refunds, in full
          </SiteLink>
        </p>
      </section>
    </SiteShell>
  );
}
