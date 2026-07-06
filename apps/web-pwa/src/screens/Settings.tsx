'use client';

/**
 * Settings — "your space", recomposed as an editorial page. Type is the structure: a display title,
 * a profile that reads as the hero (lit by a soft molten aura, not a box), and hairline rules instead
 * of stacked cards. Preferences, consent, and parents breathe on generous rhythm; molten carries the
 * one action (Invite a parent) and Vidya's hand appears once, in her own voice. Behaviour is unchanged.
 */

import { fontFamily, hairline, ink, molten, radius, space, typeScale } from '@classess/config';
import { Button, Toggle } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { learner } from '../mock/appData';
import { useRouter } from '../shell/router';

// ease-out per the brand motion law; framer wants a mutable 4-tuple.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PREF_ROWS = [
  { key: 'reducedMotion', title: 'Reduced motion', sub: 'Calm the interface — fewer movements.' },
  {
    key: 'practiceReminders',
    title: 'Practice reminders',
    sub: 'A nudge when retrieval is due today.',
  },
  {
    key: 'weeklyProgress',
    title: 'Weekly progress',
    sub: 'A quiet summary of your week, once a week.',
  },
] as const;

const ACCOUNT_ACTIONS = ['Sign in', 'Subscription', 'Sign out'] as const;

/** A thin rule — the app's structural line, replacing most card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

// Confident section heading — h2 semantics at a tidy size, with tight negative tracking.
const heading = {
  margin: 0,
  fontSize: typeScale.h3.size,
  lineHeight: typeScale.h3.lineHeight,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: ink[900],
} as const;

const bodyText = {
  margin: 0,
  fontSize: typeScale.body.size,
  lineHeight: typeScale.body.lineHeight,
  color: ink[700],
  maxWidth: '46ch',
} as const;

const metaText = {
  margin: 0,
  fontSize: typeScale.caption.size,
  lineHeight: typeScale.caption.lineHeight,
  color: ink[500],
} as const;

const row = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space[3],
} as const;

const rowText = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } as const;
const rowTitle = { fontSize: typeScale.body.size, color: ink[900], fontWeight: 500 } as const;
const rowSub = {
  fontSize: typeScale.caption.size,
  color: ink[500],
  lineHeight: 1.4,
  maxWidth: '40ch',
} as const;

const column = { display: 'flex', flexDirection: 'column', gap: space[2] } as const;

export function Settings() {
  const { publishPage, dispatch } = useVidyaBus();
  const router = useRouter();
  const reduce = useReducedMotion();

  // Visual state only (per spec) — these do not wire into real behaviour yet.
  const [prefs, setPrefs] = useState({
    reducedMotion: false,
    practiceReminders: true,
    weeklyProgress: false,
  });

  const consentRef = useRegisterTarget<HTMLDivElement>('settings-consent', {
    kind: 'region',
    label: 'the explanation of your data and consent tier',
  });
  const inviteRef = useRegisterTarget<HTMLDivElement>('settings-invite-parent', {
    kind: 'control',
    label: 'the Invite a parent button',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: publishPage is stable; run once on mount.
  useEffect(() => {
    publishPage({
      route: 'settings',
      state: { consentTier: learner.consentTier, parentLinked: learner.parentLinked },
    });
  }, []);

  // Vidya's cute moment: a small squish of approval whenever you tune your space.
  const setPref = (key: keyof typeof prefs) => (next: boolean) => {
    setPrefs((p) => ({ ...p, [key]: next }));
    dispatch([{ type: 'setMood', mood: 'correct' }]);
  };

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
        };

  const consentCopy =
    learner.consentTier === 'un_elevated'
      ? 'Basic experience — no behavioural profiling. A parent can unlock more.'
      : 'Full experience — personalised guidance is on. You can dial this back any time.';

  return (
    <main
      style={{
        flex: 1,
        width: '100%',
        maxWidth: 940,
        margin: '0 auto',
        padding: `${space[6]}px ${space[4]}px ${space[12]}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: space[6],
      }}
    >
      {/* Masthead — a confident display title sets the room. */}
      <motion.header
        {...rise(0)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: typeScale.display.size,
            lineHeight: 1.02,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: ink[900],
          }}
        >
          Your space
        </h1>
        <p style={{ ...bodyText, fontSize: typeScale.bodyLg.size, maxWidth: '40ch' }}>
          Tune how learning feels — everything here is yours to change.
        </p>
      </motion.header>

      {/* Hero: the profile, lit by a soft molten aura (light, never a box). */}
      <motion.section {...rise(1)} style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -80,
            top: -60,
            width: 420,
            height: 320,
            background: `radial-gradient(closest-side, ${molten.soft}, transparent 70%)`,
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: space[3] }}>
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 72,
              height: 72,
              borderRadius: radius.jelly,
              border: `1px solid ${hairline.onPaper}`,
              display: 'grid',
              placeItems: 'center',
              fontSize: typeScale.h2.size,
              fontWeight: 600,
              color: ink[900],
            }}
          >
            {learner.name.charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.half }}>
            <h2
              style={{
                margin: 0,
                fontSize: typeScale.h2.size,
                lineHeight: typeScale.h2.lineHeight,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: ink[900],
              }}
            >
              {learner.name}
            </h2>
            <p style={bodyText}>
              {learner.grade} · {learner.board}
            </p>
            <p style={metaText}>Joined {learner.joinedDaysAgo} days ago</p>
          </div>
        </div>
      </motion.section>

      <Rule />

      {/* Preferences */}
      <motion.section
        {...rise(2)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <h2 style={heading}>Preferences</h2>
        {PREF_ROWS.map((r) => (
          <div key={r.key} style={row}>
            <div style={rowText}>
              <span style={rowTitle}>{r.title}</span>
              <span style={rowSub}>{r.sub}</span>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Toggle checked={prefs[r.key]} onChange={setPref(r.key)} aria-label={r.title} />
            </div>
          </div>
        ))}
      </motion.section>

      <Rule />

      {/* Two-up: your data, and the people beside you. Responsive without breakpoints. */}
      <motion.section
        {...rise(3)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: space[6],
          alignItems: 'start',
        }}
      >
        <div style={column}>
          <h2 style={heading}>Your data & consent</h2>
          <div
            ref={consentRef}
            style={{ display: 'flex', flexDirection: 'column', gap: space.half }}
          >
            <p style={bodyText}>{consentCopy}</p>
            <p style={metaText}>We keep what helps you learn, and nothing that profiles you.</p>
          </div>
        </div>

        <div style={column}>
          <h2 style={heading}>Parents</h2>
          <p style={bodyText}>A grown-up sees your highlights and progress — never your working.</p>
          <p
            style={{
              margin: 0,
              fontFamily: fontFamily.handwritten,
              fontSize: '1.5rem',
              lineHeight: 1.2,
              color: molten.base,
              transform: 'rotate(-2deg)',
            }}
          >
            then I can do even more with you.
          </p>
          <div ref={inviteRef} style={{ marginTop: space.half }}>
            <Button variant="primary" onClick={() => router.navigate({ name: 'parent' })}>
              Invite a parent
            </Button>
          </div>
        </div>
      </motion.section>

      <Rule />

      {/* Account */}
      <motion.section
        {...rise(4)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <h2 style={heading}>Account</h2>
        {ACCOUNT_ACTIONS.map((label) => (
          <div key={label} style={row}>
            <Button variant="secondary" disabled>
              {label}
            </Button>
            <span style={metaText}>Coming soon</span>
          </div>
        ))}
      </motion.section>

      <Rule />

      <motion.p {...rise(5)} style={metaText}>
        Classess Learner v0.1.0
      </motion.p>
    </main>
  );
}
