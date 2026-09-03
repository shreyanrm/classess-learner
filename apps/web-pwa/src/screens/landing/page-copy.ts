/**
 * Every word on the landing page, in one file.
 *
 * The words are NOT ours to edit. They are the owner's own rewrite, carried over verbatim from the
 * approved prototype (`scratchpad/design/landing-v7.html`, the v7 content rework). A word changed
 * here is a word changed against the owner's deliberate call, so `copy.test.ts` asserts the page's
 * copy laws over this module rather than a reviewer having to catch a drift in JSX.
 *
 * The laws that still hold, and the one that had to be restated:
 *
 *  · DESIGN.md — sentence case, no emoji, no exclamation marks, calm and certain.
 *  · WOBO-PLAN §19 — Wobo has no gender. WOBO IS NEVER "he" OR "she". The Tuesday-night chapter
 *    does use "she", and that is correct: it is about Aanya, a named learner, and the owner wrote
 *    it that way on purpose. So the test asserts the real rule — Wobo is always "it", and a
 *    feminine pronoun appears only in the two narrative chapters that name Aanya — instead of the
 *    blanket ban the earlier scaffold carried, which this copy would fail for the wrong reason.
 *  · WOBO-PLAN §16 — the curriculum mechanism is a secret. Nothing on this page names a board, a
 *    framework or a count of them. "Tell Wobo the board and the class once" is as far as it goes.
 *  · No prices. The landing page does not sell; `/plans` does.
 */

export interface NavLink {
  label: string;
  href: string;
}

/** The pill nav. Four of the five are anchors on this page; Plans is a real route. */
export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Why Wobo', href: '#why' },
  { label: 'For students', href: '#students' },
  { label: 'For parents', href: '#parents-note' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'Plans', href: '/plans' },
];

export const AUTH = {
  signIn: 'Sign in',
  getStarted: 'Get started',
} as const;

export const HERO = {
  chapter: 'Classes 4 to 12 · free every day',
  /** The headline, in three pieces: the hand-written wake, the ask, and the written-on equation. */
  wake: 'Hey Wobo,',
  askBefore: 'why does ',
  equation: 'a² + b² = c²',
  askAfter: '?',
  sub: 'Ask anything from your school syllabus and watch the answer take shape, line by line, at 10 pm or 6 am. A tutor that draws, never judges, and is always there.',
  primary: 'Start learning for free',
  secondary: "I'm a parent",
  /** The two mint-dot notes under the buttons. Fragments on purpose. */
  notes: ['Free every single day', 'No card, no trial that ends'] as const,
  sticker: 'drawn live',
} as const;

/** The demo card's chrome, and the question Aanya typed into it. */
export const DEMO = {
  who: 'Wobo',
  withWhom: ' · with Aanya',
  live: 'drawing',
  askedBy: 'Aanya',
  question: 'why is a² + b² = c²? where do the squares come from',
  label: 'Wobo drawing the proof of Pythagoras',
} as const;

/** The cinematic chapter: four captions that hold and hand over. */
export const NIGHT = {
  chapter: 'One Tuesday night',
  label: 'A Tuesday night with Wobo',
  captions: [
    {
      id: 'c1',
      big: '9:40 pm. Test on Friday. Question 7 makes no sense.',
      small: 'Nobody at home remembers this chapter. The video about it is forty minutes long.',
    },
    {
      id: 'c2',
      big: "She asks Wobo the way she'd ask a friend.",
      small: 'Typed, or out loud. No queue, no judgement, no "we did this in class".',
    },
    {
      id: 'c3',
      big: 'Wobo draws it out, line by line.',
      small: 'Every line lands with the words. Every number is checked before the pen moves.',
    },
    {
      id: 'c4',
      big: '9:46 pm. It clicked.',
      small: 'Six minutes. She saw it, not just heard it. That is the whole point of Wobo.',
    },
  ] as const,
} as const;

export const WHY = {
  chapter: 'Why it clicks',
  title: 'Three things a great tutor does. Wobo does all three, every time.',
  promises: [
    {
      title: "It draws, it doesn't dictate",
      body: 'The answer is built in front of you, stroke by stroke, so you see why, not just what. Things you see, you keep.',
    },
    {
      title: "It teaches your school's chapter, this week",
      body: 'Not a course for everyone. The lesson your class is actually on, in the order your school teaches it, for classes 4 to 12.',
    },
    {
      title: 'It never makes you feel small',
      body: "No red crosses, no sighing. When you're close, Wobo rings the gap and waits. When you get it, it makes a small fuss.",
    },
  ] as const,
} as const;

export const STUDENTS = {
  chapter: 'For students',
  titleBefore: "Ask the question you'd ",
  titleHighlight: 'never ask in class',
  titleAfter: '.',
  lead: "Pause a video and circle the part. Type it at midnight. Say it out loud. Wobo doesn't sigh, doesn't judge, and doesn't tell anyone.",
  claims: [
    "It draws on whatever you're looking at",
    'It knows what your class did this week',
    'It notices when you nail it',
  ] as const,
  film: {
    title: 'Photosynthesis',
    time: '0:07 / 0:19',
    lasso: 'start here',
    chip: 'Ask Wobo about this',
  },
} as const;

export const PRACTICE = {
  chapter: 'Practice that plays fair',
  titleBefore: 'Try one. Wobo ',
  titleHighlight: 'never says wrong',
  titleAfter: '.',
  lead: "Shade it, drag it, draw it. When you're close, Wobo draws the difference right on your answer. Get it, and it makes a small fuss. Go on, colour half.",
  puzzle: {
    label: 'Try one',
    askBefore: 'Colour ',
    fraction: '½',
    askAfter: ' of the shape.',
    check: 'Check',
    reset: 'Start over',
    cells: ['top left', 'top right', 'bottom left', 'bottom right'] as const,
  },
} as const;

/**
 * What Wobo writes back on the puzzle. These are Wobo's own hand, so they are lowercase and
 * unpunctuated on purpose — the same register as "oh. that's why." on the board.
 */
export const PUZZLE_REPLIES = {
  none: 'shade a part first',
  quarter: "that's a quarter. one more",
  half: 'there we go',
  threeQuarters: "that's three quarters",
  whole: "that's the whole thing",
} as const;

export const PARENTS = {
  chapter: 'For parents',
  label: 'Sunday evening, the note',
  title: "You'll know how it's going, without asking twice.",
  body: "Every Sunday, one honest note: what she learned, where she asked for help, and what's next. Written by the tutor who was there. No dashboard to decode, no streak to police.",
  letter: {
    to: "To Aanya's parents",
    /** The note itself, in four runs: plain, coral, plain, Wobo blue. */
    run1: 'This week Aanya did three lessons and fourteen problems. She asked for help twice after a miss, ',
    accent: 'which is exactly how learning looks.',
    run2: "Friday's test is on triangles, and she's ready for the first half. Next week we do the rest, ",
    strong: 'ten minutes a day.',
    signature: '— Wobo',
  },
} as const;

export const SUBJECTS = {
  chapter: 'Every subject',
  titleBefore: 'Maths to English, class 4 to 12, ',
  titleHighlight: "your school's way",
  titleAfter: '.',
  lead: 'Tell Wobo the board and the class once. From then on it teaches what your school teaches, chapter by chapter, test by test.',
  tiles: [
    { name: 'Mathematics', span: 'numbers to calculus', href: '#maths' },
    { name: 'Science', span: 'physics, chemistry, biology', href: '#science' },
    { name: 'Social science', span: 'history, geography, civics', href: '#social' },
    { name: 'English', span: 'reading, writing, grammar', href: '#english' },
  ] as const,
} as const;

export const SAFE = {
  chapter: 'Safe by design',
  title: "Built the way we'd build it for our own kids.",
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
      title: 'Every lesson is yours to see',
      body: 'Progress, practice and the Sunday note, any time. Questions word for word, if your child allows.',
    },
  ] as const,
} as const;

export const ASK = {
  chapter: 'Still wondering?',
  title: 'Ask Wobo. It answers for itself.',
  placeholder: 'Is Wobo good for a Class 6 kid who hates maths?',
  inputLabel: 'Ask Wobo a question about Wobo',
  submit: 'Ask',
  chipsLabel: 'Try one of these',
  chips: [
    "Does it follow my school's syllabus?",
    'What happens when my child gets stuck?',
    'Is it safe to use alone?',
    'What does free include?',
  ] as const,
} as const;

export const FAQ = {
  chapter: 'Questions',
  title: 'What families ask before they start',
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
      a: 'Every lesson, the progress and the Sunday note, any time. Questions word for word only if your child allows. We think a good tutor would do the same.',
    },
  ] as const,
} as const;

export const DEVICES = {
  chapter: 'Everywhere you are',
  title: 'Phone at the table, tablet in the car, laptop at night.',
  lead: 'Start on one, carry on from another. Wobo remembers where you were, what you asked, and what you got right. Apps are on the way; the browser works today.',
  stores: [
    { name: 'App Store', note: 'iPhone and iPad · soon', href: '#ios', live: false },
    { name: 'Google Play', note: 'Android · soon', href: '#android', live: false },
    { name: 'Mac', note: 'soon', href: '#mac', live: false },
    { name: 'Windows', note: 'soon', href: '#windows', live: false },
    { name: 'Use it in the browser', note: 'today, on anything', href: '#start', live: true },
  ] as const,
} as const;

export const CLOSING = {
  say: 'Begin tonight.',
  title: 'The first question is on us.',
  body: 'Set up in a minute. Free every day, no card. Wobo waits in the corner of every screen, pen ready.',
  cta: 'Start learning for free',
} as const;

export interface FooterColumn {
  heading: string;
  links: readonly NavLink[];
}

export const FOOTER: {
  tagline: string;
  columns: readonly FooterColumn[];
  small: readonly string[];
} = {
  tagline: 'Say "Hey Wobo", or hold space, anywhere in the app.',
  columns: [
    {
      heading: 'Wobo',
      links: [
        { label: 'Meet Wobo', href: '#why' },
        { label: 'How it works', href: '#night' },
        { label: 'Subjects', href: '#subjects' },
        { label: 'Plans', href: '/plans' },
        { label: 'Gift Wobo', href: '/gift' },
      ],
    },
    {
      heading: 'For',
      links: [
        { label: 'Parents', href: '#parents-note' },
        { label: 'Students', href: '#students' },
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
        // Wave 7b's page (docs/SITE.md §3). Written at the address it will live at rather than as
        // a dead anchor, which is how the legal set was carried before it existed either.
        { label: 'Security and trust', href: '/security' },
        { label: 'Terms', href: '/legal/terms' },
        { label: 'Privacy', href: '/legal/privacy' },
        { label: "Children's privacy", href: '/legal/children' },
      ],
    },
  ],
  small: ['© 2026 Wobo', 'heywobo.com', 'For learners in classes 4 to 12'],
};
