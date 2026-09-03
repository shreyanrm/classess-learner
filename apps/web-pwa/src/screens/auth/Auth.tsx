'use client';

/**
 * The two doors: `/sign-in` and `/sign-up`.
 *
 * Order, from WOBO-PLAN §7: sign in first, then the aha, then the tour. This screen is that first
 * beat given an address of its own, so a link in an email, a share, or the landing page's own
 * button can land straight on it instead of dropping somebody into the middle of onboarding.
 *
 * The landing page is the visual parent and is IMPORTED, never copied: its stylesheet, its footer
 * and its ink cursor come from `../landing`, so the type scale, the button, the page rhythm and the
 * breakpoints are the same objects, not lookalikes. The one thing NOT reused is the landing nav —
 * its four anchors point at sections of that page, and four dead links at the top of a sign-in form
 * is exactly the "element with no reason to be there" §15 forbids.
 *
 * Honesty is the load-bearing choice here. Every way in is rendered, and the ones the app's single
 * auth client does not expose are rendered DISABLED with one line saying so, rather than hidden or,
 * worse, wired to nothing. `client.ts` decides that by feature detection, so the day the SDK grows
 * a seam the door opens by itself.
 */

import { WoboBody } from '@wobo/wobo';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../../shell/router';
import { useSdk } from '../../store/sdk';
import { WoboLogo } from '../../ui/Logo';
import { InkCursor, inkCursorAllowed, readCursorEnvironment } from '../landing/cursor';
import { Footer } from '../landing/sections/Footer';
import { ensureLandingStyles } from '../landing/styles';
import { failureFromAuthReturn, reportFailure } from '../states/select';
import { ageOn, blockedBy, consentBranch, type SignUpFields } from './age';
import { callSeam, liveSeams, type MethodName, type MethodState, methodStates } from './client';
import {
  ACTIONS,
  CHILD_DOOR,
  CONSENT,
  ERRORS,
  FIELDS,
  METHODS,
  NO_EMAIL_WAY,
  NOT_WIRED,
  PARENT,
  SENT,
  SIGN_IN,
  SIGN_UP,
} from './copy';
import { ensureAuthStyles } from './styles';

ensureLandingStyles();
ensureAuthStyles();

type Mode = 'sign-in' | 'sign-up';
/** What the screen is showing: the form, or what happened after it was sent. */
type Stage = 'form' | 'link-sent' | 'code' | 'parent-sent';

const MIN_PASSWORD = 8;

/** The account the learner already has, drawn rather than fetched — no third-party logo request. */
function ProviderGlyph({ name }: { name: MethodName }) {
  if (name === 'google') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
        <title>Google</title>
        <path
          d="M8 3.4c1.2 0 2.1.5 2.6 1l1.9-1.9C11.4 1.4 9.9.8 8 .8A7.2 7.2 0 0 0 1.6 4.7l2.2 1.7C4.3 4.7 6 3.4 8 3.4Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M15.1 8.2c0-.5 0-.9-.1-1.4H8v2.7h4a3.4 3.4 0 0 1-1.5 2.2l2.2 1.7c1.3-1.2 2.4-3 2.4-5.2Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M3.8 9.6a4.3 4.3 0 0 1 0-2.9L1.6 5A7.2 7.2 0 0 0 .8 8.2c0 1.2.3 2.3.8 3.2l2.2-1.8Z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M8 15.6c1.9 0 3.5-.6 4.7-1.7l-2.2-1.7c-.6.4-1.4.7-2.5.7-2 0-3.7-1.3-4.2-3.1L1.6 11.4A7.2 7.2 0 0 0 8 15.6Z"
          fill="currentColor"
          opacity="0.7"
        />
      </svg>
    );
  }
  if (name === 'apple') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
        <title>Apple</title>
        <path
          d="M11 8.5c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.1-.6c-1.1 0-2.1.6-2.7 1.6-1.1 2-.3 4.9.8 6.5.6.8 1.2 1.7 2 1.6.8 0 1.1-.5 2.1-.5s1.2.5 2.1.5 1.4-.8 1.9-1.6c.6-.9.9-1.8.9-1.8s-1.6-.6-1.5-2.6Zm-1.7-4.8c.4-.5.7-1.3.6-2-.6 0-1.4.4-1.9 1-.4.5-.7 1.3-.6 2 .7.1 1.4-.4 1.9-1Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return null;
}

/**
 * One way in. A door that cannot be used keeps its place and says why in one line, without alarm —
 * hiding it would leave a learner hunting for something they were told existed, and leaving it live
 * would fail in their hands.
 */
function Door({
  state,
  label,
  busy,
  shut,
  onSelect,
}: {
  state: MethodState;
  label: string;
  busy: boolean;
  /** Why this door cannot be used right now. Null when it can. */
  shut: string | null;
  onSelect: () => void;
}) {
  const shutId = `${state.name}-shut`;
  return (
    <div>
      <button
        type="button"
        className="wa-door"
        disabled={shut !== null || busy}
        onClick={onSelect}
        {...(shut === null ? {} : { 'aria-describedby': shutId })}
      >
        <ProviderGlyph name={state.name} />
        {label}
      </button>
      {shut === null ? null : (
        <p className="wa-shut" id={shutId}>
          {shut}
        </p>
      )}
    </div>
  );
}

export function Auth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const sdk = useSdk();
  const words = mode === 'sign-in' ? SIGN_IN : SIGN_UP;

  // The ONE auth client the app already built, read as a bag of seams. No second client is made
  // here and none may ever be — two places minting sessions is two places to get refresh wrong.
  const seams = useMemo(
    () =>
      liveSeams({
        account: sdk.account as unknown as Record<string, unknown> | null,
        identityAuth: sdk.identity.auth as unknown as Record<string, unknown> | null,
        devAuth: sdk.config.devAuth,
      }),
    [sdk],
  );
  const states = useMemo(() => methodStates(seams), [seams]);
  const by = (name: MethodName): MethodState =>
    states.find((s) => s.name === name) ?? { name, seam: null, available: false };

  const [stage, setStage] = useState<Stage>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fields, setFields] = useState<SignUpFields>({ birth: '', parentEmail: '', agreed: false });
  // The pen cursor and the ink it draws in, both read from the live document — the landing page's
  // own two rules, imported rather than re-decided (native cursor on touch and under reduced motion).
  const [pen, setPen] = useState(false);
  const [ink, setInk] = useState('#1F35E0');

  useEffect(() => {
    setPen(inkCursorAllowed(readCursorEnvironment()));
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--wobo-ultramarine')
      .trim();
    if (value) setInk(value);
  }, []);

  // A sign-in link that came back dead. The address is read once and then scrubbed, so the state
  // cannot fire again on a reload and the dead token never sits in the learner's history.
  const readReturn = useRef(false);
  useEffect(() => {
    if (readReturn.current || typeof window === 'undefined') return;
    readReturn.current = true;
    const failure = failureFromAuthReturn(window.location.search, window.location.hash);
    if (!failure) return;
    reportFailure(failure);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const age = fields.birth ? ageOn(fields.birth) : null;
  const branch = age === null ? null : consentBranch(age);
  // Under 13 the account is a parent's, so the provider doors are not this learner's to open: the
  // only way on is the message to a parent, which is the block already open below them.
  const childHolds = mode === 'sign-up' && branch?.parentRequired === true;
  /** Why a provider door cannot be used, or null when it can. */
  const doorShut = (name: MethodName): string | null =>
    childHolds ? CHILD_DOOR : by(name).available ? null : NOT_WIRED;
  // The email half of the form exists only if there is something behind it. A form with no seam is
  // a form that fails on submit, which is the worst way to find out.
  const emailWayIn = by('password').available || by('magicLink').available;
  // A child's account is created by writing to a parent, so that path needs the link seam and
  // nothing else; everybody else needs an email way in.
  const canSubmit = childHolds ? by('magicLink').available : emailWayIn;

  const run = async (job: () => Promise<unknown>, then?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await job();
      then?.();
    } catch (err) {
      // Never a provider's sentence and never a status code — one of Wobo's lines, or the honest
      // catch-all when we genuinely cannot tell what happened.
      setError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? ERRORS.offline
          : ERRORS.unknown,
      );
      console.error('sign-in failed', err);
    } finally {
      setBusy(false);
    }
  };

  /**
   * What is still in the way of creating an account, said out loud. Returns true when the learner
   * cannot go on yet — the SAME gate for every door, so signing in with a provider can never walk
   * past the age question or the consent tick the email form asks for.
   */
  const gated = (): boolean => {
    if (mode !== 'sign-up') return false;
    const blocked = blockedBy(fields);
    if (!blocked) return false;
    setError(
      blocked === 'birth'
        ? ERRORS.birth
        : blocked === 'birth-invalid'
          ? ERRORS.birthInvalid
          : blocked === 'parent-email'
            ? ERRORS.parentEmail
            : ERRORS.agree,
    );
    return true;
  };

  const openProvider = (name: MethodName) => {
    const seam = by(name).seam;
    if (!seam || gated()) return;
    const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/`;
    void run(() => callSeam(seams, seam, redirectTo));
  };

  const sendCode = () => {
    const seam = by('phone').seam;
    if (!seam) return;
    void run(
      () => callSeam(seams, seam, phone.trim()),
      () => setStage('code'),
    );
  };

  const verifyCode = () => {
    const verify = typeof seams.verifyPhoneOtp === 'function' ? 'verifyPhoneOtp' : null;
    if (!verify) return;
    void run(
      () => callSeam(seams, verify, phone.trim(), code.trim()),
      () => router.replace({ name: 'onboarding' }),
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'sign-up') {
      if (gated()) return;
      // Under 13 the account is the parent's, so the next step is a message to the parent's own
      // address — a tick on a child's screen is never parental consent (parental-consent.md §2).
      if (branch?.parentRequired) {
        const seam = by('magicLink').seam;
        if (!seam) {
          setError(ERRORS.unknown);
          return;
        }
        void run(
          () => callSeam(seams, seam, fields.parentEmail.trim()),
          () => setStage('parent-sent'),
        );
        return;
      }
    }
    const passwordSeam = by('password').seam;
    if (passwordSeam) {
      if (!email.includes('@')) {
        setError(ERRORS.email);
        return;
      }
      if (password.length < MIN_PASSWORD) {
        setError(ERRORS.password);
        return;
      }
      void run(
        () => callSeam(seams, passwordSeam, email.trim(), password),
        () => router.replace({ name: mode === 'sign-up' ? 'onboarding' : 'home' }),
      );
      return;
    }
    const linkSeam = by('magicLink').seam;
    if (linkSeam) {
      if (!email.includes('@')) {
        setError(ERRORS.email);
        return;
      }
      void run(
        () => callSeam(seams, linkSeam, email.trim()),
        () => setStage('link-sent'),
      );
      return;
    }
    setError(ERRORS.unknown);
  };

  const other = mode === 'sign-in' ? 'sign-up' : 'sign-in';

  return (
    <div className="lp wa-page">
      {pen ? <InkCursor ink={ink} /> : null}
      {/* Every other public page has one; a door is not an excuse to make a keyboard visitor walk
          the wordmark and the other door before reaching the first field. */}
      <a className="wa-skip" href="#wa-main">
        Skip to signing in
      </a>
      <div className="lp-body">
        <div className="lp-wrap wa-top">
          <button
            type="button"
            className="wa-home"
            onClick={() => router.navigate({ name: 'landing' })}
            aria-label="Wobo, back to the front page"
            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            <WoboLogo height={18} />
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={() => router.navigate({ name: other })}
          >
            {words.switchAction}
          </button>
        </div>

        <div className="lp-wrap">
          <main id="wa-main" className="wa">
            <div className="wa-head">
              {/* Wobo, present but not in the way (DESIGN.md §4): the orb and one line, no more. */}
              <WoboBody size={64} mood="greeting" />
              <p className="wa-hand">{words.hand}</p>
              <h1 className="wa-title">
                {stage === 'link-sent' || stage === 'parent-sent' ? SENT.title : words.title}
              </h1>
              <p className="wa-body">
                {stage === 'parent-sent'
                  ? PARENT.sent
                  : stage === 'link-sent'
                    ? SENT.body
                    : words.body}
              </p>
            </div>

            {stage === 'form' ? (
              <>
                <div className="wa-doors">
                  <Door
                    state={by('google')}
                    label={METHODS.google}
                    busy={busy}
                    shut={doorShut('google')}
                    onSelect={() => openProvider('google')}
                  />
                  <Door
                    state={by('apple')}
                    label={METHODS.apple}
                    busy={busy}
                    shut={doorShut('apple')}
                    onSelect={() => openProvider('apple')}
                  />
                  {by('phone').available ? (
                    <Door
                      state={by('phone')}
                      label={METHODS.phone}
                      busy={busy}
                      shut={doorShut('phone')}
                      onSelect={() => {
                        if (!gated()) setStage('code');
                      }}
                    />
                  ) : null}
                </div>

                <div className="wa-or">{ACTIONS.or}</div>

                <form onSubmit={submit} noValidate>
                  {emailWayIn ? (
                    <>
                      <div className="wa-field">
                        <label className="wa-label" htmlFor="wa-email">
                          {FIELDS.email}
                        </label>
                        <input
                          id="wa-email"
                          className="wa-input"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      {by('password').available ? (
                        <div className="wa-field">
                          <label className="wa-label" htmlFor="wa-password">
                            {FIELDS.password}
                          </label>
                          <input
                            id="wa-password"
                            className="wa-input"
                            type="password"
                            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      ) : (
                        <p className="wa-shut wa-shut--field">
                          {`${METHODS.password}: ${NOT_WIRED}`}
                        </p>
                      )}
                    </>
                  ) : (
                    // No seam behind an email field is a form that fails on submit, which is the
                    // worst possible way for somebody to find out. Say it instead of drawing it.
                    <p className="wa-shut wa-shut--field">{NO_EMAIL_WAY}</p>
                  )}

                  {mode === 'sign-up' ? (
                    <>
                      <div className="wa-field">
                        <label className="wa-label" htmlFor="wa-birth">
                          {FIELDS.birth}
                        </label>
                        <input
                          id="wa-birth"
                          className="wa-input"
                          type="date"
                          autoComplete="bday"
                          value={fields.birth}
                          onChange={(e) => setFields((f) => ({ ...f, birth: e.target.value }))}
                        />
                        <p className="wa-hint">{FIELDS.birthWhy}</p>
                      </div>

                      {branch && branch.band !== 'adult' ? (
                        <div className="wa-parent">
                          <h2>{PARENT.title}</h2>
                          <p>{branch.notice}</p>
                          <p>{PARENT.body}</p>
                          <p>{PARENT.learning}</p>
                          <div className="wa-field" style={{ marginBottom: 0, marginTop: 12 }}>
                            <label className="wa-label" htmlFor="wa-parent-email">
                              {FIELDS.parentEmail}
                            </label>
                            <input
                              id="wa-parent-email"
                              className="wa-input"
                              type="email"
                              inputMode="email"
                              value={fields.parentEmail}
                              onChange={(e) =>
                                setFields((f) => ({ ...f, parentEmail: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="wa-consent">
                        <input
                          id="wa-agree"
                          type="checkbox"
                          checked={fields.agreed}
                          onChange={(e) => setFields((f) => ({ ...f, agreed: e.target.checked }))}
                        />
                        <label htmlFor="wa-agree">
                          {`${CONSENT.lead} `}
                          <a href={CONSENT.termsHref}>{CONSENT.terms}</a>
                          {` ${CONSENT.and} `}
                          <a href={CONSENT.privacyHref}>{CONSENT.privacy}</a>.
                        </label>
                      </div>
                    </>
                  ) : null}

                  {canSubmit ? (
                    <button
                      type="submit"
                      className="lp-btn lp-btn--pigment wa-submit"
                      disabled={busy}
                    >
                      {childHolds
                        ? ACTIONS.askParent
                        : by('password').available
                          ? mode === 'sign-up'
                            ? ACTIONS.signUp
                            : ACTIONS.signIn
                          : ACTIONS.sendLink}
                    </button>
                  ) : (
                    <p className="wa-shut">{childHolds ? PARENT.cannotSend : NO_EMAIL_WAY}</p>
                  )}
                  {emailWayIn && !by('magicLink').available ? (
                    <p className="wa-shut">{`${METHODS.magicLink}: ${NOT_WIRED}`}</p>
                  ) : null}
                </form>
              </>
            ) : null}

            {stage === 'code' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) verifyCode();
                  else sendCode();
                }}
                noValidate
              >
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-phone">
                    {FIELDS.phone}
                  </label>
                  <input
                    id="wa-phone"
                    className="wa-input"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-code">
                    {FIELDS.code}
                  </label>
                  <input
                    id="wa-code"
                    className="wa-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="lp-btn lp-btn--pigment wa-submit" disabled={busy}>
                  {code.trim() ? ACTIONS.verify : ACTIONS.sendCode}
                </button>
              </form>
            ) : null}

            {stage === 'link-sent' ? (
              <button
                type="button"
                className="lp-btn lp-btn--ghost wa-submit"
                disabled={busy}
                onClick={() => setStage('form')}
              >
                {SENT.again}
              </button>
            ) : null}

            {error ? (
              <p className="wa-error" role="alert">
                {error}
              </p>
            ) : null}

            <p className="wa-switch">
              {`${words.switchPrompt} `}
              <button type="button" onClick={() => router.navigate({ name: other })}>
                {words.switchAction}
              </button>
            </p>
          </main>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export function SignIn() {
  return <Auth mode="sign-in" />;
}

export function SignUp() {
  return <Auth mode="sign-up" />;
}
