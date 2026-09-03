/**
 * Every word on the landing page, verbatim from the owner-directed prototype
 * (`scratchpad/design/landing-v6.html`).
 *
 * The prototype is the source of truth for this page, so this file is a TRANSCRIPTION, not a draft.
 * `copy.test.ts` beside it asserts the laws that still bind — no exclamation marks, no emoji, no
 * gendered pronoun anywhere near Wobo (WOBO-PLAN §19), no price written as a number on a page that
 * carries no prices (§16) — and asserts the exact strings the owner signed off on, so a later
 * "improvement" to the words fails the suite instead of shipping.
 *
 * One law it does NOT carry over from `../copy.ts`: that file forbids `she/her` outright. The
 * prototype uses those words about AANYA, the child in the story, never about Wobo. §19 is a law
 * about Wobo's gender, not about whether a nine-year-old in a scene may be a girl, so the test here
 * scopes the rule to sentences that name Wobo.
 *
 * Links: every label below is the prototype's, unchanged. Three of the prototype's hrefs pointed at
 * sections it never had (`#meet`, `#students`, `#plans`), which is fine in a static mock and a dead
 * link in a shipped page — so each is pointed at the beat it names (`#night` is the Meet chapter,
 * `#tries` is the student beat) or at the real route the app already has (`/plans`).
 */

export interface Link {
  readonly label: string;
  readonly href: string;
}

export const NAV: readonly Link[] = [
  { label: 'Meet Wobo', href: '#night' },
  { label: 'How it works', href: '#how' },
  { label: 'For parents', href: '#parents' },
  { label: 'For students', href: '#tries' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'Plans', href: '/plans' },
];

export const HEADER = {
  home: 'Wobo home',
  navLabel: 'Site',
  signIn: 'Sign in',
  start: 'Get started',
} as const;

export const HERO = {
  chapter: 'For classes 4 to 12',
  /** The headline, split at the phrase the marigold highlighter sweeps. */
  headBefore: 'The tutor that ',
  headSwept: 'draws it out',
  headAfter: ' for your child',
  sub: "Patient at 10 pm, on your child's school syllabus, in its own hand. Ask anything, watch the answer appear.",
  learner: "I'm a learner",
  parent: "I'm a parent",
  notes: ['Free every single day', 'No card needed'],
  sticker: 'free every day',
  /** The demo card. */
  demoLabel: 'Wobo drawing the proof of Pythagoras',
  demoBar: 'with Aanya',
  demoLive: 'drawing',
  demoWho: 'Aanya',
  demoAsk: 'why is a² + b² = c²? where do the squares come from',
  woboLabel: 'Wobo, watching your pointer',
} as const;

export const NIGHT = {
  label: 'A Tuesday night with Wobo',
  stamp: 'Tuesday · 9:40 pm',
  boardBar: 'with Aanya',
  captions: [
    {
      big: 'Question 7 makes no sense.',
      small: 'The test is Friday. Nobody at home remembers this chapter.',
    },
    { big: 'So she asks.', small: "Out loud, or typed. It's fine to ask twice." },
    {
      big: 'And Wobo draws it out.',
      small: 'Every line lands with the words. Every number checked first.',
    },
    { big: '9:46 pm. Oh.', small: 'Six minutes. She saw it, not just heard it.' },
  ],
} as const;

export const TRIES = {
  chapter: 'Then she tries one',
  headBefore: 'Wobo never says "wrong". It ',
  headSwept: 'rings the gap',
  headAfter: ', and waits.',
  lead: 'Shade it, drag it, draw it. When the answer is close, Wobo draws the difference on it. When it lands, Wobo makes a small fuss. Try it.',
  puzzleLabel: 'Try one',
  /** The question, split at the handwritten fraction. */
  questionBefore: 'Colour ',
  questionFraction: '½',
  questionAfter: ' of the shape.',
  cells: ['top left', 'top right', 'bottom left', 'bottom right'],
  check: 'Check',
  reset: 'Start over',
} as const;

export const SUNDAY = {
  label: 'Sunday evening, the note',
  chapter: 'Sunday · 6 pm',
  title: 'The week, in one honest note',
  lead: 'What she learned, where she asked for help, and what’s next. Written by the tutor who was there. No dashboard to decode.',
  to: "To Aanya's parents",
  /** The letter, split at the two phrases the prototype colours. */
  bodyOne:
    'This week Aanya did three lessons and fourteen problems. She asked for help twice after a miss, ',
  bodyRose: 'which is exactly how learning looks.',
  bodyTwo:
    " Friday's test is on triangles, and she's ready for the first half. Next week we do the rest, ",
  bodyPig: 'ten minutes a day.',
  sig: '— Wobo',
} as const;

export const FILM = {
  chapter: 'On anything',
  headBefore: 'Pause a video. ',
  headSwept: 'Circle the part.',
  headAfter: ' Ask why.',
  lead: "Wobo can see what's on the screen and draw right on it: a film, a worksheet, a page you're reading. The answer lands where the question was.",
  title: 'Photosynthesis',
  time: '0:07 / 0:19',
  lasso: 'start here',
  chip: 'Ask Wobo about this',
} as const;

export interface Subject {
  readonly label: string;
  readonly note: string;
  readonly href: string;
}

export const SUBJECTS = {
  chapter: 'Classes 4 to 12',
  headBefore: 'Every subject your school teaches, ',
  headSwept: 'the way your school teaches it',
  headAfter: '',
  lead: "Maths, science, social science and languages, matched to your child's board and class the day they join.",
  items: [
    { label: 'Mathematics', note: 'numbers to calculus', href: '#subjects' },
    { label: 'Science', note: 'physics, chemistry, biology', href: '#subjects' },
    { label: 'Social science', note: 'history, geography, civics', href: '#subjects' },
    { label: 'English', note: 'reading, writing, grammar', href: '#subjects' },
  ] as readonly Subject[],
} as const;

export const PARENTS = {
  chapter: 'For parents',
  title: "Built the way we'd want it built for our own children",
  tiles: [
    {
      title: "Nothing is sold on your child's data",
      body: 'No ads, no tracking across the web, no selling of anything.',
    },
    {
      title: 'The price never changes based on behaviour',
      body: 'No countdown timers, no fake scarcity, nothing that preys on a twelve-year-old.',
    },
    {
      title: "Neutral on everything that isn't the syllabus",
      body: 'Wobo teaches what the board teaches, and keeps its opinions to itself.',
    },
    {
      title: 'You can read everything Wobo said',
      body: 'Every lesson is there for a parent to see, any time.',
    },
  ],
} as const;

export const ASK = {
  chapter: 'Ask Wobo about Wobo',
  title: 'Got a question? Ask the tutor itself.',
  placeholder: 'Is Wobo good for a Class 6 kid who hates maths?',
  inputLabel: 'Ask Wobo a question about Wobo',
  submit: 'Ask',
  chipsLabel: 'Try one of these',
  chips: [
    "Does it follow my school's syllabus?",
    'What happens when my child gets stuck?',
    'Is it safe to use alone?',
    'What does free include?',
  ],
} as const;

export const FAQ = {
  chapter: 'What families ask',
  title: 'The questions we get most',
  items: [
    {
      q: "Does Wobo follow my child's school syllabus?",
      a: 'Yes. Tell Wobo the board and the class once, and it teaches the chapters your school teaches, in the order your school teaches them. If your school follows its own plan, you can hand Wobo that instead.',
    },
    {
      q: 'What does the free plan include?',
      a: "Lessons on your child's syllabus every day, Wobo drawing every answer within a daily allowance, practice, and the Sunday note. No card, no trial that ends.",
    },
    {
      q: 'Is it safe for a ten-year-old to use alone?',
      a: 'Wobo stays on the syllabus, keeps opinions to itself, never shows ads, and never sells anything based on how your child behaves. Every lesson is there for a parent to read. If a child ever seems to be in distress, Wobo slows down and points to help.',
    },
    {
      q: 'Does it replace a tutor?',
      a: "For the nightly question, the stuck chapter and steady practice, yes. Wobo is patient at 10 pm and never runs out of time. For a child who needs a person in the room, it makes that person's hour count twice.",
    },
    {
      q: 'Which languages does Wobo speak?',
      a: 'English today, with a voice chosen for your country. More languages are coming, and Wobo already understands questions typed in most Indian languages.',
    },
    {
      q: 'Can I see what my child asked?',
      a: 'Yes. Every lesson, every question and every answer are in the parent view, any time, along with the Sunday note.',
    },
  ],
} as const;

export interface Store extends Link {
  readonly note: string;
  /** The one that is live today; the rest are marked soon. */
  readonly now?: boolean;
}

export const DEVICES = {
  chapter: 'One Wobo, every screen',
  title: 'Phone at the table, tablet in the car, laptop at night',
  lead: 'Start on one, carry on from another. Wobo remembers where you were, what you asked, and what you got right.',
  stores: [
    { label: 'App Store', note: 'iPhone and iPad · soon', href: '#ios' },
    { label: 'Google Play', note: 'Android · soon', href: '#android' },
    { label: 'Mac', note: 'soon', href: '#mac' },
    { label: 'Windows', note: 'soon', href: '#windows' },
    { label: 'Use it in the browser', note: 'today, on anything', href: '#start', now: true },
  ] as readonly Store[],
} as const;

export const CLOSE = {
  say: 'Begin tonight.',
  title: 'The tutor that draws it out is already here',
  lead: 'It takes a minute to set up, and the first question is on us. Wobo will be waiting in the corner of the screen.',
  cta: 'Start learning for free',
} as const;

export const FOOTER = {
  home: 'Wobo',
  line: 'Say "Hey Wobo", or hold space, anywhere in the app.',
  columns: [
    {
      heading: 'Wobo',
      links: [
        { label: 'Meet Wobo', href: '#night' },
        { label: 'How it works', href: '#how' },
        { label: 'Subjects', href: '#subjects' },
        { label: 'Plans', href: '/plans' },
        { label: 'Gift Wobo', href: '/gift' },
      ],
    },
    {
      heading: 'For',
      links: [
        { label: 'Parents', href: '#parents' },
        { label: 'Students', href: '#tries' },
        { label: 'Schools', href: '/contact' },
      ],
    },
    {
      heading: 'Help',
      links: [
        { label: 'Help centre', href: '/help' },
        { label: 'Contact', href: '/contact' },
        { label: 'Questions', href: '#faq' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Security and trust', href: '/legal/safety-and-content' },
        { label: 'Terms', href: '/legal/terms-of-service' },
        { label: 'Privacy', href: '/legal/privacy-policy' },
        { label: "Children's privacy", href: '/legal/childrens-privacy' },
      ],
    },
  ],
  small: ['© 2026 Wobo', 'heywobo.com', 'For learners in classes 4 to 12'],
} as const;
