'use client';

/**
 * `/gift` — Plus, bought for someone else.
 *
 * Every word of the page proper is `docs/copy/growth/gift-page.md`, rendered: the heading, the sub,
 * the three steps, what it is, what it is not, and the honest footnote. The page adds structure,
 * not claims.
 *
 * The two rules that shape it, both from that file:
 *
 *  · nothing renews. A gift that quietly becomes a subscription is the exact dark pattern this
 *    product exists to avoid, so the words "paid once, renews never" sit on the cards themselves.
 *  · no testimonial we did not receive. §16 keeps the reference product's testimonial section, and
 *    ours renders as an empty state until real, consented quotes exist.
 *
 * The board chips are the registry's own, generated at build time for the landing page and imported
 * from it, so this page cannot claim a board the registry does not carry.
 */

import { useMemo } from 'react';
import source from '../../../../../docs/copy/growth/gift-page.md?raw';
import { useRouter } from '../../shell/router';
import boards from '../landing/boards.json';
import { BOARDS } from '../landing/copy';
import { Reveal } from '../landing/Reveal';
import { countLine } from '../landing/sections/Boards';
import { legalPath } from '../legal/catalog';
import { parseBlocks } from '../legal/markdown';
import { Markdown } from '../legal/Prose';
import { BENEFITS } from '../plans/copy';
import { cadenceLabel, GIFT_OPTIONS, giftPriceLabel, giftTier, readMarket } from '../plans/prices';
import { ensurePlansStyles } from '../plans/styles';
import { SiteLink } from '../site/nav';
import { SiteShell } from '../site/SiteShell';
import { fillTemplate, giftSections, isButtonLine, sectionText } from './content';
import { GIFT_FOR, GIFT_PAGE } from './copy';

ensurePlansStyles();

const SECTIONS = giftSections(parseBlocks(fillTemplate(source)));

/** The steps, minus the copy's own button line, which the page draws as a real control. */
const STEPS = (SECTIONS['How it works'] ?? []).filter((block) => !isButtonLine(block));

export function Gift() {
  const router = useRouter();
  const give = () => router.navigate({ name: 'plans', checkout: true });
  // Read once per mount: the market is the device's, and a price must not change under a reader.
  const market = useMemo(() => readMarket(), []);

  return (
    <SiteShell current="gift" title="Gift — Wobo">
      <section className="lp-wrap lp-head">
        <p className="lp-eyebrow">{GIFT_PAGE.eyebrow}</p>
        <h1 className="lp-h1x">{sectionText(SECTIONS.Heading)}</h1>
        <p className="lp-lead">{sectionText(SECTIONS.Sub)}</p>
        <div className="lp-cta" style={{ marginTop: 26 }}>
          <button type="button" className="lp-btn lp-btn--pigment" onClick={give}>
            {GIFT_PAGE.cta}
          </button>
          <small>{GIFT_PAGE.ctaNote}</small>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.cardsTitle}</h2>
            <p className="lp-lead">{GIFT_PAGE.cardsNote}</p>
            <div className="lp-gifts">
              {GIFT_OPTIONS.map((option) => {
                const tier = giftTier(option);
                return (
                  <article className="lp-tier" key={option.id}>
                    <h3>{option.name}</h3>
                    <p className="lp-price">{giftPriceLabel(option, market)}</p>
                    {/* §14: a gift costs what the same plan costs, and it is paid once. */}
                    <p className="lp-tier-cadence">
                      {cadenceLabel(tier).replace('billed monthly, cancel any time', 'paid once')} ·
                      renews never
                    </p>
                    <ul>
                      {option.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                      <li>They choose their own board and subjects</li>
                      <li>You never see their work unless they show you</li>
                    </ul>
                    <button type="button" className="lp-btn lp-btn--ghost" onClick={give}>
                      {GIFT_PAGE.cta}
                    </button>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-section--tonal">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.stepsTitle}</h2>
            <div className="lp-prose" style={{ marginTop: 20 }}>
              <Markdown blocks={STEPS} known={[]} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.forTitle}</h2>
            <div className="lp-cards">
              {GIFT_FOR.map((card) => (
                <article className="lp-card" key={card.label}>
                  <h3>{card.label}</h3>
                  <p>{card.quote}</p>
                </article>
              ))}
            </div>
            <div className="lp-gifts" style={{ marginTop: 34 }}>
              <article className="lp-panel">
                <h3>What it is</h3>
                <div className="lp-prose" style={{ fontSize: 14.5 }}>
                  <Markdown blocks={SECTIONS['What it is'] ?? []} known={[]} />
                </div>
              </article>
              <article className="lp-panel">
                <h3>What it is not</h3>
                <div className="lp-prose" style={{ fontSize: 14.5 }}>
                  <Markdown blocks={SECTIONS['What it is not'] ?? []} known={[]} />
                </div>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-section--tonal">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.benefitsTitle}</h2>
            <p className="lp-lead">{GIFT_PAGE.benefitsNote}</p>
            <ul className="lp-lines">
              {BENEFITS.filter((row) => row.pro !== false).map((row) => (
                <li key={row.label}>
                  {row.label}
                  {typeof row.pro === 'string' ? ` — ${row.pro}` : ''}
                </li>
              ))}
            </ul>
            <p className="lp-note">
              <SiteLink href="/plans">Free, Pro and Max, side by side</SiteLink>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.boardsTitle}</h2>
            <p className="lp-lead">{GIFT_PAGE.boardsNote}</p>
            <div className="lp-chips">
              {boards.shown.map((board) => (
                <span className="lp-chip" key={board.id} title={board.name}>
                  {board.short}
                </span>
              ))}
              <span className="lp-chip lp-chip--more">{BOARDS.more}</span>
            </div>
            <p className="lp-note">
              {countLine(BOARDS.countTemplate, {
                shown: boards.shown.length,
                total: boards.total,
                countries: boards.countries,
              })}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.testimonialsTitle}</h2>
            <p className="lp-quiet">{GIFT_PAGE.testimonialsEmpty}</p>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-closing">
        <div className="lp-wrap">
          <Reveal>
            <h2 className="lp-h2">{GIFT_PAGE.closingTitle}</h2>
            <div className="lp-cta">
              <button type="button" className="lp-btn lp-btn--pigment" onClick={give}>
                {GIFT_PAGE.cta}
              </button>
            </div>
            <div className="lp-prose" style={{ margin: '26px auto 0', fontSize: 14 }}>
              <Markdown blocks={SECTIONS['The honest footnote'] ?? []} known={[]} />
            </div>
            <p className="lp-note" style={{ marginInline: 'auto' }}>
              <SiteLink href={legalPath('refund-and-cancellation')}>
                Refunds and cancellation, in full
              </SiteLink>
            </p>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
