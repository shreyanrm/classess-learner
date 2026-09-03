/**
 * Every word on the landing page, in one file.
 *
 * Copy is a law here, not a preference (DESIGN.md, "product copy everywhere: sentence case, no
 * emoji, no exclamation marks, calm and certain"), and WOBO-PLAN §19 adds that Wobo has no gender:
 * the name comes first and no gendered pronoun goes anywhere near it. Keeping the words in one
 * module means `copy.test.ts` can assert all of that over the whole page at once instead of a
 * reviewer having to catch it in JSX.
 *
 * Prices are deliberately NOT numbers. Nothing has been decided, and a made-up price on a public
 * page is a lie the moment someone screenshots it — so the placeholder says so in words.
 */

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'How Wobo teaches', href: '#teaches' },
  { label: 'Try a board', href: '#demo' },
  { label: 'Every board', href: '#boards' },
  { label: 'Plans', href: '#plans' },
];

export const HERO = {
  /** The page's positioning line, above the headline. Sentence case, at reading size. */
  kicker: 'A tutor who thinks on a board.',
  /** The wake phrase, said the way a learner says it. */
  wake: 'Hey Wobo.',
  /** The ask, with `emphasis` carrying the one hit of pigment. */
  ask: 'Draw me',
  emphasis: 'the answer.',
  body: 'Wobo is an AI wobot that teaches the way a great teacher does: listens, then picks up a pen. Every explanation is drawn live, in front of you, on your own syllabus.',
  primary: 'Start free',
  secondary: 'Watch Wobo teach',
  /** Beside the buttons. Every clause of it has to stay true. */
  note: 'Free every day. No card.',
  /** Wobo's handwritten aside on the hero board. */
  aside: 'ask me anything',
} as const;

export interface TeachStep {
  /** Which golden board plays beside this step. */
  board: string;
  index: string;
  title: string;
  body: string;
  /** Wobo's hand, under the paragraph. */
  hand: string;
}

export const TEACHES = {
  title: 'Not a video. A board being drawn, while you watch.',
  lead: 'These three are real boards, played here exactly as they play inside a lesson — same plan, same hand, same order. Nothing on this page is a picture of a board.',
  steps: [
    {
      board: 'pythagoras',
      index: '01',
      title: 'Wobo starts from what you can see',
      body: 'A shape first, named as it is drawn. The law arrives last, once the squares have already shown you why it has to be true.',
      hand: 'a, b, and the long one is c',
    },
    {
      board: 'series-circuit',
      index: '02',
      title: 'Every number is computed before it is drawn',
      body: 'Code works out each quantity and a verifier signs it. A number that does not check out is refused by the hand, so it never reaches you.',
      hand: 'nine numbers, all checked',
    },
    {
      board: 'plant-cell',
      index: '03',
      title: 'Then Wobo hands you the pen',
      body: 'Circle a part, ask why, drag a corner. Wobo reads the board at code level, so the answer is about the thing you pointed at.',
      hand: 'circle anything',
    },
  ] as readonly TeachStep[],
} as const;

export interface DemoBoard {
  /** The golden board's name in `src/wobo/goldens`. */
  board: string;
  /** The learner's words — the golden's own recorded prompt. */
  prompt: string;
}

export const DEMO = {
  title: 'Ask Wobo something.',
  lead: 'Pick a question and watch it get drawn, right here, on the same surface a lesson uses. Two of the twelve boards we regression-test on every build.',
  boards: [
    { board: 'benzene', prompt: 'draw benzene and explain the ring' },
    { board: 'timeline', prompt: 'give me a timeline of the Indian freedom struggle' },
  ] as readonly DemoBoard[],
  /** The plane's own title bar. */
  frame: "Wobo's board",
  replay: 'Draw it again',
  /** Shown under the frame — the honest limit of a demo on a marketing page. */
  note: 'These two are recorded turns. Signed in, Wobo draws the same way for whatever you ask.',
} as const;

export const BOARDS = {
  title: 'Your syllabus, the real one, this year.',
  lead: 'Pick your board and class and Wobo teaches to that. Not listed here is not a problem: name it and Wobo goes and reads the official syllabus. Nothing published at all, and you can show Wobo your own book and get a plan built from it.',
  /** Sits under the chips; the numbers come from the registry, not from this file. */
  countTemplate:
    'Shown here: {shown} of the {total} frameworks in our registry, across {countries} countries.',
  more: 'and yours',
} as const;

export interface Promise_ {
  title: string;
  body: string;
}

export const PROMISES = {
  title: 'The things we will not trade away.',
  cards: [
    {
      title: 'Wobo never just hands over the answer',
      body: 'Hints thin out as you get stronger. The struggle is the part where learning happens, so it is protected on purpose.',
    },
    {
      title: 'Every quantity is checked by code',
      body: 'Before a number is drawn, it is recomputed and signed. A wrong answer given to a child is not a bug we can ship and fix later.',
    },
    {
      title: 'Nothing is lost when you leave',
      body: 'Your place is saved at every step. No streak is held over you, and no page tells you that quitting costs you your progress.',
    },
  ] as readonly Promise_[],
} as const;

export interface Plan {
  name: string;
  /** The price, or the honest absence of one. */
  price: string;
  /** True where `price` is a placeholder rather than a decision. */
  placeholder: boolean;
  cadence?: string;
  lines: readonly string[];
  cta: string;
}

export const PLANS = {
  title: 'Free every day. More when you want more.',
  lead: 'Wobo has to be usable by a learner with no money, so the free tier is a real product and not a trailer.',
  tiers: [
    {
      name: 'Free',
      price: 'No cost',
      placeholder: false,
      lines: [
        'A daily budget of turns with Wobo',
        'Your real board and class',
        'Boards, practice and the sandbox',
        'Everything saved on your device',
      ],
      cta: 'Start free',
    },
    {
      name: 'Plus',
      price: 'Price not set',
      placeholder: true,
      cadence: 'We will publish it here before anyone is charged.',
      lines: [
        'A much larger daily budget',
        'Custom courses on anything you name',
        'A weekly artifact for a parent',
        'Voice, on every board',
      ],
      cta: 'Start free for now',
    },
  ] as readonly Plan[],
  /** The line under the cards. It has to survive a lawyer and a parent. */
  note: 'No price is live yet, so nothing on this page can be bought today. When Plus opens, the price is the same for everyone, it is shown in full before you pay, and it renews only if you say so.',
} as const;

export const CLOSING = {
  title: 'Say it, and Wobo draws it.',
  body: 'Start with one question. It takes a minute, and it costs nothing.',
  cta: 'Start free',
} as const;

export interface LegalLink {
  label: string;
  href: string;
}

/**
 * The legal set. These routes do not exist yet — the content workflow owns `docs/legal/**` and the
 * pages will be wired to it. Until then the hrefs are the addresses they WILL live at, so the
 * footer never ships a dead `#` that looks like a link and does nothing.
 */
export const LEGAL_LINKS: readonly LegalLink[] = [
  // TODO(wave7): route /legal/terms once docs/legal/terms.md ships from the content workflow.
  { label: 'Terms', href: '/legal/terms' },
  // TODO(wave7): route /legal/privacy — the privacy notice, including the child-data section.
  { label: 'Privacy', href: '/legal/privacy' },
  // TODO(wave7): route /legal/safety — what a parent needs to read before a child signs in.
  { label: 'Safety for parents', href: '/legal/safety' },
  // TODO(wave7): route /legal/contact — a real address, not a form that goes nowhere.
  { label: 'Contact', href: '/legal/contact' },
];

export const FOOTER = {
  line: 'Wobo, made for curious minds.',
} as const;

/** Sign-in and sign-up have no routes of their own yet; both open Wobo's onboarding flow. */
export const AUTH = {
  signIn: 'Sign in',
  signUp: 'Start free',
} as const;
