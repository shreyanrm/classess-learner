'use client';

/**
 * `/plans` — what Wobo costs, and what it does not.
 *
 * WOBO-PLAN §16 sets the shape: the benefits table, three price cards, the honest billing
 * footnote, the two consent checkboxes, the allowance widget, and the FAQ. §14 sets the ethics:
 * the price never varies by who is looking, nothing is engineered to rush a child, and no number
 * appears before it is decided.
 *
 * The prices are the owner's, set in §14 (2026-09-03) and read from one constant file
 * (`prices.ts`), so a change to a number is one edit and every surface says the same thing in the
 * same breath. §16 asked for three cards; §14 is dated after it and bills monthly, so the three
 * are Free, Pro and Max rather than monthly, annual and family.
 *
 * What this page deliberately does not do is take a payment. The primary control leads to
 * `/plans/checkout`, which says plainly that checkout opens with launch. A payment page that
 * looked real but was not, on a product used by children, would be the worst thing on the site.
 *
 * The allowance widget reads the learner's real budget through `sdk.me()`; where there is no
 * answer it says it cannot see one rather than showing a number nobody verified.
 */

import type { Me } from '@wobo/sdk';
import { useEffect, useMemo, useState } from 'react';
import article from '../../../../../docs/copy/help-centre/wobo-basics/09-plans-and-billing.md?raw';
import { useRouter } from '../../shell/router';
import { useSdk } from '../../store/sdk';
import { PLANS } from '../landing/copy';
import { Reveal } from '../landing/Reveal';
import { legalPath } from '../legal/catalog';
import { parseBlocks, stripEditorialNotes } from '../legal/markdown';
import { Markdown } from '../legal/Prose';
import { SiteLink } from '../site/nav';
import { SiteShell } from '../site/SiteShell';
import { allowanceLine, readAllowance } from './allowance';
import { BENEFITS, type Benefit, PLANS_PAGE } from './copy';
import { faqItems } from './faq';
import { cadenceLabel, PLAN_TIERS, priceLabel, readMarket } from './prices';
import { ensurePlansStyles } from './styles';

ensurePlansStyles();

const FAQ = faqItems(parseBlocks(stripEditorialNotes(article).text));

/** A tick, drawn. DESIGN.md forbids emoji, and a screen reader gets the word instead. */
function Tick() {
  return (
    <>
      <span className="lp-yes" aria-hidden>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" role="presentation">
          <path
            d="M3 8l3 3 6-7"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="lp-sr">included</span>
    </>
  );
}

function Cell({ value }: { value: Benefit }) {
  if (value === true) return <Tick />;
  if (value === false)
    return (
      <>
        <span className="lp-no" aria-hidden />
        <span className="lp-sr">not included</span>
      </>
    );
  return <span>{value}</span>;
}

/** What is left of today, read from the brain. */
function Allowance() {
  const sdk = useSdk();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    // A budget the page cannot read is not an error worth showing: the widget says so itself.
    void sdk
      .me()
      .then((answer) => {
        if (live) setMe(answer);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [sdk]);
  const allowance = readAllowance(me);
  const share =
    allowance.known && allowance.remaining !== null && allowance.limit
      ? Math.max(0, Math.min(1, allowance.remaining / allowance.limit))
      : null;
  return (
    <section className="lp-panel" aria-label={PLANS_PAGE.allowanceTitle}>
      <div className="lp-meter">
        <div>
          <p className="lp-mark">{PLANS_PAGE.allowanceTitle}</p>
          <p className="lp-meter-line">{allowanceLine(allowance)}</p>
        </div>
        <p className="lp-row-who" style={{ margin: 0 }}>
          {PLANS_PAGE.allowanceNote}
        </p>
      </div>
      {share !== null ? (
        <div
          className="lp-meter-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={allowance.limit ?? 0}
          aria-valuenow={allowance.remaining ?? 0}
          aria-label={PLANS_PAGE.allowanceTitle}
        >
          <div className="lp-meter-fill" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      ) : null}
    </section>
  );
}

export function Plans() {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [renewal, setRenewal] = useState(false);
  const ready = terms && renewal;
  // Read once per mount: the market is the device's, and a price must not change under a reader.
  const market = useMemo(() => readMarket(), []);

  return (
    <SiteShell current="plans" title="Plans — Wobo">
      <section className="lp-wrap lp-head">
        <p className="lp-eyebrow">{PLANS_PAGE.eyebrow}</p>
        <h1 className="lp-h1x">{PLANS.title}</h1>
        <p className="lp-lead">{PLANS.lead}</p>
        <div style={{ marginTop: 28, maxWidth: 640 }}>
          <Allowance />
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{PLANS_PAGE.benefitsTitle}</h2>
            <div className="lp-scroll" style={{ marginTop: 26 }}>
              <table className="lp-grid lp-grid--plans">
                <thead>
                  <tr>
                    <th scope="col">What you get</th>
                    <th scope="col">Free</th>
                    <th scope="col">Pro</th>
                    <th scope="col">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {BENEFITS.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td data-label="Free">
                        <Cell value={row.free} />
                      </td>
                      <td data-label="Pro">
                        <Cell value={row.pro} />
                      </td>
                      <td data-label="Max">
                        <Cell value={row.max} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-section--tonal">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{PLANS_PAGE.cardsTitle}</h2>
            <p className="lp-lead">{PLANS_PAGE.cardsNote}</p>
            <div className="lp-tiers lp-tiers--three">
              {PLAN_TIERS.map((tier) => (
                <article
                  className={tier.recommended ? 'lp-tier lp-tier--pigment' : 'lp-tier'}
                  key={tier.id}
                >
                  {tier.recommended ? <p className="lp-tier-flag">Best value</p> : null}
                  <h3>{tier.name}</h3>
                  <p className="lp-price">{priceLabel(tier, market)}</p>
                  <p className="lp-tier-cadence">{cadenceLabel(tier)}</p>
                  <ul>
                    {tier.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <h3 className="lp-h2" style={{ fontSize: 22, marginTop: 44 }}>
              {PLANS_PAGE.consentTitle}
            </h3>
            <p className="lp-lead">{PLANS_PAGE.consentLead}</p>
            <div className="lp-consent">
              <label className="lp-check" htmlFor="consent-terms">
                <input
                  id="consent-terms"
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                <span>
                  I accept the{' '}
                  <SiteLink href={legalPath('terms-of-service')}>terms of service</SiteLink> and the{' '}
                  <SiteLink href={legalPath('privacy-policy')}>privacy notice</SiteLink>.
                </span>
              </label>
              <label className="lp-check" htmlFor="consent-renewal">
                <input
                  id="consent-renewal"
                  type="checkbox"
                  checked={renewal}
                  onChange={(e) => setRenewal(e.target.checked)}
                />
                <span>{PLANS_PAGE.renewal}</span>
              </label>
            </div>
            <div className="lp-cta">
              <button
                type="button"
                className="lp-btn lp-btn--pigment"
                disabled={!ready}
                onClick={() => router.navigate({ name: 'plans', checkout: true })}
              >
                {PLANS_PAGE.cta}
              </button>
              <small>{ready ? PLANS_PAGE.billingNote : PLANS_PAGE.ctaBlocked}</small>
            </div>
            <p className="lp-note">{PLANS_PAGE.billingNote}</p>
            <p className="lp-note">
              <SiteLink href={legalPath('refund-and-cancellation')}>
                {PLANS_PAGE.refundsLink}
              </SiteLink>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{PLANS_PAGE.faqTitle}</h2>
            {FAQ.lead ? <p className="lp-lead">{FAQ.lead.map((s) => s.text).join('')}</p> : null}
            <div className="lp-faq">
              {FAQ.items.map((item) => (
                <div className="lp-faq-item" key={item.question}>
                  <h3>{item.question}</h3>
                  <div className="lp-prose">
                    <Markdown blocks={item.answer} known={[]} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
