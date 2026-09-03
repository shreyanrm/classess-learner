/**
 * Every word on the sign-in, sign-up and contact pages, in one file.
 *
 * Copy is law here (`docs/copy/voice.md`): sentence case, no emoji, no exclamation marks, the name
 * before any pronoun, the answer in the first line, and never a vendor named. Keeping it in one
 * module is what lets `copy.test.ts` assert all of that over the whole surface at once instead of a
 * reviewer having to catch it in JSX.
 *
 * Two things are deliberately NOT here. No provider is named beyond the two the buttons are for
 * (Google and Apple are the account a learner already has, not our infrastructure), and no promise
 * is made about a method that is not wired — the honest note for an unwired door is generated from
 * the door itself, so it cannot drift from what the client can actually do.
 */

export const SIGN_IN = {
  eyebrow: 'sign in',
  /** Wobo's own greeting, in Wobo's hand, above the fold. */
  hand: 'good to see you again',
  title: 'Welcome back',
  body: 'Sign in and everything picks up exactly where you left it, on any device.',
  switchPrompt: 'New here?',
  switchAction: 'Create an account',
} as const;

export const SIGN_UP = {
  eyebrow: 'create an account',
  hand: "let's make this yours",
  title: "Lovely. Let's make this yours",
  body: "Sign in so everything we do stays with you, on any device. That's the only reason I'm asking.",
  switchPrompt: 'Already have an account?',
  switchAction: 'Sign in',
} as const;

/** The name on each door, and what it does. */
export const METHODS = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  password: 'Use an email and password',
  magicLink: 'Email me a sign-in link',
  phone: 'Use my phone number',
} as const;

/** Said under a door that is not open yet. One line, and true. */
export const NOT_WIRED = 'This way in is not switched on yet.';

/** Said under the provider doors when the learner is under 13 and the account is a parent's. */
export const CHILD_DOOR = 'A parent or guardian signs in for you. Their email goes below.';

/** Said in place of the email form when no email way in is wired at all. */
export const NO_EMAIL_WAY =
  'Signing in by email is not switched on yet. Use one of the ways above.';

export const FIELDS = {
  email: 'Email',
  password: 'Password',
  birth: 'Date of birth',
  birthWhy: 'I ask once, to know what a grown-up has to say yes to.',
  parentEmail: "A parent or guardian's email",
  code: 'The code Wobo sent',
  phone: 'Phone number',
} as const;

export const ACTIONS = {
  signIn: 'Sign in',
  signUp: 'Create my account',
  sendLink: 'Send the link',
  sendCode: 'Send me a code',
  verify: 'Check the code',
  askParent: 'Ask my parent',
  or: 'or',
} as const;

/** The consent tick. Never pre-ticked, and it links the pages it names. */
export const CONSENT = {
  lead: 'I agree to the',
  terms: 'terms of service',
  and: 'and the',
  privacy: 'privacy policy',
  termsHref: '/legal/terms',
  privacyHref: '/legal/privacy',
} as const;

/** What a parent is told, and what happens next. From `docs/legal/parental-consent.md` §2 and §3. */
export const PARENT = {
  title: "I'll write to your parent",
  body: 'I send one message to that address. A parent or guardian opens it on their own device, reads what each feature does, and ticks only the ones they want. Nothing is ticked already.',
  learning:
    'Your lessons work either way. Consent switches on memory, voice, photographs and sharing, never the teaching.',
  sent: "Sent. I'll let you in the moment a parent says yes, and you can start learning now.",
  /** When there is no way to write to a parent yet. Nothing is claimed that did not happen. */
  cannotSend: 'Writing to a parent is not switched on yet. Nothing has been sent.',
} as const;

/** What happens after a link is sent. */
export const SENT = {
  title: 'Check your inbox',
  body: 'The link is on its way. It works once, and only for a short while, so nobody who finds it later can use it.',
  again: 'Send it again',
} as const;

/**
 * Every error a learner can meet here, in Wobo's voice.
 *
 * The rule from voice.md §6: say what we do not know, own what is ours, and never hand somebody a
 * provider's sentence. The last one is a catch-all — if we cannot name the problem, we say so
 * rather than guessing at it.
 */
export const ERRORS = {
  email: 'That address does not look finished. Check it and try again.',
  password: 'Passwords need at least eight characters. Longer is kinder to you, not to us.',
  credentials: 'That email and password do not match an account. Try again, or ask for a link.',
  birth: 'I need your date of birth to know what a grown-up has to say yes to.',
  birthInvalid: 'That date does not look right. Check it and try again.',
  parentEmail: "I need a parent or guardian's email to ask them.",
  agree: 'I need you to agree to the terms and the privacy policy first.',
  code: 'That code did not check out. Ask for another one.',
  offline: 'I cannot reach the account service from here. Check your connection and try again.',
  unknown: 'I could not finish that. Try once more, and if it keeps happening, write to us.',
} as const;

export const CONTACT = {
  eyebrow: 'contact',
  hand: 'a person reads every one',
  title: 'Write to Wobo',
  body: 'Tell us what happened, or what you wish Wobo did. A person reads every message, and you get an answer.',
  subject: 'What is this about',
  message: 'Your message',
  emailLabel: 'Your email, so we can answer',
  send: 'Send',
  /** Shown when there is no form endpoint: the honest path, not a form that goes nowhere. */
  mailtoNote:
    'This opens your own email app. There is no message form here yet, and a form that quietly went nowhere would be worse than saying so.',
  address: 'support@heywobo.com',
  privacy: 'For anything about your data, or a child’s, write to privacy@heywobo.com.',
  reasons: ['Something is broken', 'Something is wrong in a lesson', 'A question', 'Anything else'],
} as const;
