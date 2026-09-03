'use client';

/**
 * /about — who Wobo is and what we will not do.
 *
 * Every word is `docs/copy/about.md`, compiled at build time. This file chooses the ORDER and the
 * SHAPE and nothing else: no sentence here is written in this file, and a heading that changes in
 * the copy changes on the page with no code edit. What the copy deck calls a field, the page turns
 * into the right kind of block — a pull line becomes a pull line, four points become four points,
 * the honesty line gets the border it is asking for.
 *
 * Three things the copy asks for that are not prose:
 *
 *  · the drawn underline under the headline. `about.md` names it as the page's live element — Wobo
 *    performing the product's core move on the first screen. It is one path drawn by dash offset,
 *    already drawn under reduced motion, and it is the page's only decoration.
 *  · a real board, drawing. The section is called "drawn live, not looked up", and the honest way
 *    to say that is to draw. It plays a SHIPPING golden through the shipping store and the shipping
 *    renderer (`landing/board-play.ts`), read-only — the same bytes the hand's regression suite
 *    reads, so what a visitor watches is the product drawing rather than a recording of it.
 *  · the unfilled slots. `about.md` still says `[Company legal name]` and `[support email]`, and the
 *    page says so too. Inventing an address on the page that asks to be trusted would be the one
 *    unforgivable thing to do here.
 */

import { BoardFrame } from '../landing/BoardFrame';
import { landingGolden } from '../landing/board-play';
import { DEMO } from '../landing/copy';
import { Reveal } from '../landing/Reveal';
import { aboutField, aboutFields, aboutLine } from './content';
import { Prose, Runs } from './Doc';
import type { Block } from './markdown';
import { SiteShell } from './SiteShell';

// The section headings of the copy deck. Named once, so a rename in `about.md` is one edit here
// and the page's own test says which name went missing.
const HERO = 'Hero';
const MISSION = 'Mission';
const TEACHES = 'How Wobo teaches';
const COVER = 'What we cover';
const PROMISES = 'Our promises';
const CHARACTER = 'Wobo, the character';
const TEAM = 'Team';
const CONTACT = 'Footer block for this page';

/** The board that plays inside "drawn live, not looked up" — a derivation, drawn line by line. */
const BOARD = 'pythagoras';

/** Where each name in the copy's own footer line actually goes. */
const LINK_TARGETS: Record<string, string> = {
  'Help centre': '/help',
  Privacy: '/legal/privacy',
  Terms: '/legal/terms',
  Cookies: '/legal/cookies',
  'Parental consent': '/legal/parental-consent',
  'Delete your data': '/you',
  Plans: '/#plans',
};

/** A promise's own name: the copy labels them `Promise 1 — Your data is yours`. */
function promiseTitle(label: string): string {
  const parts = label.split(/\s+[—-]\s+/);
  return parts.length > 1 ? (parts[1] ?? label) : label;
}

function Section({
  id,
  tonal,
  children,
}: {
  id: string;
  tonal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={tonal ? 'lp-section lp-section--tonal' : 'lp-section'} id={id}>
      <div className="lp-wrap">
        <Reveal>{children}</Reveal>
      </div>
    </section>
  );
}

/** The four numbered points, which the copy writes as one ordered list of bold-led items. */
function Points({ blocks }: { blocks: Block[] | null }) {
  const list = blocks?.find((block) => block.k === 'ol');
  if (list?.k !== 'ol') return null;
  return (
    <ol className="st-points">
      {list.items.map((item) => (
        <li
          key={item
            .map((run) => run.v)
            .join('')
            .slice(0, 40)}
        >
          <p>
            <Runs runs={item} />
          </p>
        </li>
      ))}
    </ol>
  );
}

export function About() {
  const golden = landingGolden(BOARD);
  const promises = aboutFields(PROMISES, 'Promise');
  const links = aboutLine(CONTACT, 'Links')
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <SiteShell
      current="about"
      title="About Wobo"
      label={aboutLine(HERO, 'Headline') || 'About Wobo'}
    >
      <div className="lp-wrap st-hero">
        <Reveal>
          <p className="lp-eyebrow">{aboutLine(HERO, 'Eyebrow')}</p>
          <h1 className="lp-h1">{aboutLine(HERO, 'Headline')}</h1>
          {/* Wobo underlines the headline as the page settles. Decorative: the sentence above it
              already says everything, so there is nothing here for a screen reader to miss. */}
          <svg className="st-underline" viewBox="0 0 320 14" preserveAspectRatio="none" aria-hidden>
            <title>a stroke of ink under the headline</title>
            <path d="M4 9 C 78 3, 158 12, 316 5" />
          </svg>
          <p className="lp-lead">{aboutLine(HERO, 'Subhead')}</p>
        </Reveal>
      </div>

      <Section id="mission" tonal>
        <h2 className="lp-h2">{aboutLine(MISSION, 'Section heading')}</h2>
        <Prose blocks={aboutField(MISSION, 'Body') ?? []} />
        <p className="st-pull">{aboutLine(MISSION, 'Pull line')}</p>
      </Section>

      <Section id="teaching">
        <h2 className="lp-h2">{aboutLine(TEACHES, 'Section heading')}</h2>
        <Prose blocks={aboutField(TEACHES, 'Body') ?? []} />
        <Points blocks={aboutField(TEACHES, 'Four points')} />
        <p className="lp-hand" style={{ marginTop: 30 }}>
          {aboutLine(TEACHES, 'Closing line')}
        </p>
        {golden ? (
          <div className="st-board">
            <BoardFrame golden={golden} frameLabel={DEMO.frame} hint={golden.subject} />
            {/* The one place this page DEMONSTRATES rather than describes, so it says what it is
                showing. Without the caption the section reads as a drawing in a box: the frame bar
                names the board, but nothing tells a reader that the thing moving in front of them
                is the product, running. The sentence is the landing page's own. */}
            <p className="st-board-cap">
              {`${golden.title} — a real board, played here exactly as it plays inside a lesson: same plan, same hand, same order. This is not a picture of a board.`}
            </p>
          </div>
        ) : null}
      </Section>

      <Section id="cover" tonal>
        <h2 className="lp-h2">{aboutLine(COVER, 'Section heading')}</h2>
        <Prose blocks={aboutField(COVER, 'Body') ?? []} />
        <p className="st-honesty">{aboutLine(COVER, 'Honesty line')}</p>
        <Prose blocks={aboutField(COVER, 'Subjects') ?? []} />
      </Section>

      <Section id="promises">
        <h2 className="lp-h2">{aboutLine(PROMISES, 'Section heading')}</h2>
        <div className="lp-cards">
          {promises.map((promise) => (
            <div className="lp-card" key={promise.label}>
              <h3>{promiseTitle(promise.label)}</h3>
              <Prose blocks={promise.blocks} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="character" tonal>
        <h2 className="lp-h2">{aboutLine(CHARACTER, 'Section heading')}</h2>
        <Prose blocks={aboutField(CHARACTER, 'Body') ?? []} />
      </Section>

      <Section id="team">
        <h2 className="lp-h2">{aboutLine(TEAM, 'Section heading')}</h2>
        <Prose blocks={aboutField(TEAM, 'Body') ?? []} />
        <Prose blocks={aboutField(TEAM, 'Careers line') ?? []} />
      </Section>

      <Section id="contact">
        <div className="st-contact">
          <Prose blocks={aboutField(CONTACT, 'Contact') ?? []} />
          <div className="st-contact-links">
            {links.map((label) => {
              const href = LINK_TARGETS[label];
              return href ? (
                <a key={label} href={href}>
                  {label}
                </a>
              ) : (
                <span key={label}>{label}</span>
              );
            })}
          </div>
        </div>
      </Section>
    </SiteShell>
  );
}
