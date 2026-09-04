import { describe, expect, it } from 'bun:test';
import { buildAbout, buildHelp } from '../../../scripts/site-content';
import { ABOUT, aboutField, aboutFields, aboutLine } from './content';
import { HELP } from './help-content';
import { blocksText, inlineText } from './markdown';

/** Every word the two pages will render, as one string. */
function everyWord(): string {
  const about = ABOUT.sections.flatMap((section) => [
    section.heading,
    ...section.fields.flatMap((field) => [field.label, blocksText(field.blocks)]),
  ]);
  const help = HELP.groups.flatMap((group) => [
    group.title,
    group.blurb,
    ...group.articles.flatMap((article) => [
      article.title,
      inlineText(article.lead),
      blocksText(article.blocks),
    ]),
  ]);
  return [HELP.title, ...about, ...help].join('\n');
}

/**
 * The compiled files are checked in so a clone type-checks and tests without running the build,
 * and rebuilt by the build so they cannot drift. This is the check that says so: if someone edits
 * `docs/copy/**` and does not rebuild, or hand-edits the JSON, the suite fails here rather than a
 * reader finding the stale sentence.
 */
describe('the shipped copy is the reviewed copy', () => {
  it('about.json is what about.md compiles to today', () => {
    expect(ABOUT).toEqual(JSON.parse(JSON.stringify(buildAbout().doc)));
  });

  it('help.json is what help-centre/** compiles to today', () => {
    expect(HELP).toEqual(JSON.parse(JSON.stringify(buildHelp().doc)));
  });
});

describe('the laws hold over every word the site renders', () => {
  const words = everyWord();

  // DESIGN.md: no emoji anywhere in product copy.
  it('carries no emoji', () => {
    expect(words).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  // DESIGN.md: calm and certain. An exclamation mark is neither.
  it('carries no exclamation mark', () => {
    expect(words).not.toContain('!');
  });

  // WOBO-PLAN §17: no provider, model or vendor name reaches a reader.
  it('names no vendor', () => {
    expect(words.toLowerCase()).not.toMatch(
      /\b(openai|anthropic|gemini|chatgpt|claude|gpt-4|llama|supabase|vercel|railway)\b/,
    );
  });

  // The notes in `docs/copy/**` are addressed to us and are not page copy.
  it('leaks no editorial note', () => {
    expect(words).not.toContain('[Owner:');
    expect(words.toLowerCase()).not.toContain('placeholder');
    expect(words.toLowerCase()).not.toContain('do not ship');
  });
});

describe('the help centre', () => {
  it('publishes three groups, each with articles', () => {
    expect(HELP.groups).toHaveLength(3);
    for (const group of HELP.groups) {
      expect(group.articles.length).toBeGreaterThan(0);
      expect(group.title).not.toBe('');
      expect(group.blurb).not.toBe('');
    }
  });

  it('gives every article a distinct address and a title', () => {
    const addresses = HELP.groups.flatMap((g) => g.articles.map((a) => `${g.slug}/${a.slug}`));
    expect(new Set(addresses).size).toBe(addresses.length);
    for (const group of HELP.groups) {
      for (const article of group.articles) {
        expect(article.title.trim()).not.toBe('');
        expect(article.slug).toMatch(/^[a-z0-9-]+$/);
        expect(article.group).toBe(group.slug);
      }
    }
  });

  it('opens every article with a complete answer, as the help-centre rules require', () => {
    for (const group of HELP.groups) {
      for (const article of group.articles) {
        expect(inlineText(article.lead).trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('resolves every "next" pointer to an article that exists', () => {
    const addresses = new Set(
      HELP.groups.flatMap((g) => g.articles.map((a) => `${g.slug}/${a.slug}`)),
    );
    const pointers = HELP.groups.flatMap((g) =>
      g.articles.flatMap((a) => (a.next ? [`${a.next.group}/${a.next.slug}`] : [])),
    );
    expect(pointers.length).toBeGreaterThan(0);
    for (const pointer of pointers) expect(addresses.has(pointer)).toBe(true);
  });

  /**
   * A reviewer's hold is absolute: an article marked "do not ship" is not published, and neither
   * is the notice explaining why.
   *
   * There is nothing on hold today. `07-your-account-and-signing-in.md` was, waiting on whether
   * §17's white-label law forbids naming the provider on a sign-in button; it does not — §17 is
   * about the vendors UNDERNEATH, and §6 specifies the button by name — so the article publishes
   * and the help centre is complete. The machinery stays and is still tested, because the next
   * hold will come.
   */
  it('publishes nothing an article is on hold for, and nothing is on hold today', () => {
    for (const held of HELP.withheld) {
      expect(
        HELP.groups.find((g) => g.slug === held.group)?.articles.some((a) => a.slug === held.slug),
      ).toBe(false);
    }
    expect(HELP.withheld).toEqual([]);
  });

  it('documents the way in that the sign-in screen actually offers', () => {
    const article = HELP.groups
      .flatMap((g) => g.articles)
      .find((a) => a.slug === 'your-account-and-signing-in');
    expect(article).toBeDefined();
    // A learner who taps the button on /sign-in has a page to read about it (WOBO-PLAN §6).
    // `text` is the search index, lowercased; `plain` is the cased body a snippet is quoted from.
    expect(article?.plain).toContain('Google');
    expect(article?.text).toContain('phone number');
  });

  /**
   * The reviewed articles write a sub-heading as a bold line with no full stop after it. Quoting a
   * snippet across one produces two fragments read as one broken sentence, so the cased body a
   * snippet is quoted from leaves the sub-headings out. They stay in `text`, so recall is unchanged.
   */
  it('quotes prose only — a sub-heading never runs into the sentence under it', () => {
    const settings = HELP.groups.flatMap((g) => g.articles).find((a) => a.slug === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.text).toContain('the parent link');
    expect(settings?.plain).not.toContain('The parent link Create');
  });

  it('gives every article searchable text and a cased body to quote from', () => {
    for (const group of HELP.groups) {
      for (const article of group.articles) {
        expect(article.text).toBe(article.text.toLowerCase());
        expect(article.text.length).toBeGreaterThan(60);
        // The snippet is quoted from `plain`, so it must read as the copy reads — not lower-cased,
        // and not with the title stapled to the front of it.
        expect(article.plain).not.toBe(article.plain.toLowerCase());
        // It starts where the article starts — its opening line — not with the title stapled on.
        expect(article.plain.startsWith(inlineText(article.lead))).toBe(true);
        expect(article.text).toContain(article.plain.toLowerCase().slice(0, 60));
      }
    }
  });
});

describe('the about page finds every field it lays out', () => {
  const REQUIRED: [string, string][] = [
    ['Hero', 'Eyebrow'],
    ['Hero', 'Headline'],
    ['Hero', 'Subhead'],
    ['Mission', 'Section heading'],
    ['Mission', 'Body'],
    ['Mission', 'Pull line'],
    ['How Wobo teaches', 'Section heading'],
    ['How Wobo teaches', 'Body'],
    ['How Wobo teaches', 'Five points'],
    ['How Wobo teaches', 'Closing line'],
    ['What we cover', 'Section heading'],
    ['What we cover', 'Body'],
    ['What we cover', 'Honesty line'],
    ['What we cover', 'Subjects'],
    ['Our promises', 'Section heading'],
    ['Wobo, the character', 'Section heading'],
    ['Wobo, the character', 'Body'],
    ['Team', 'Section heading'],
    ['Team', 'Body'],
    ['Team', 'Careers line'],
    ['Footer block for this page', 'Contact'],
    ['Footer block for this page', 'Links'],
  ];

  it('has every field the layout names, so a rename in the copy fails here and not in silence', () => {
    for (const [heading, label] of REQUIRED) {
      expect(aboutField(heading, label), `${heading} / ${label}`).not.toBeNull();
    }
  });

  it('has five promises, each with a name of its own', () => {
    const promises = aboutFields('Our promises', 'Promise');
    expect(promises).toHaveLength(5);
    for (const promise of promises) {
      expect(promise.label).toMatch(/—/);
      expect(blocksText(promise.blocks).length).toBeGreaterThan(40);
    }
  });

  it('has the numbered points as one list of five', () => {
    const blocks = aboutField('How Wobo teaches', 'Five points') ?? [];
    const list = blocks.find((block) => block.k === 'ol');
    expect(list?.k).toBe('ol');
    expect(list?.k === 'ol' && list.items).toHaveLength(5);
  });

  it('reads a single-line field as a single line', () => {
    expect(aboutLine('Hero', 'Headline')).toBe('A tutor that draws, films and listens.');
    expect(aboutLine('Hero', 'Eyebrow')).toBe('About Wobo');
  });

  it('shows every name in the footer line that the page has a target for', () => {
    const links = aboutLine('Footer block for this page', 'Links')
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(links).toContain('Help centre');
    expect(links.length).toBeGreaterThan(3);
  });
});
