'use client';

/**
 * Parent — a letter home, not a settings panel. The pride-first digest is the hero: a warm note lit by
 * a soft molten aura, mastered concepts wearing their earned cobalt, Vidya's hand in the margin. Below,
 * a quiet invite: pick a way, type a contact, send. Structure is type + whitespace + hairline rules —
 * no cards, no deficits, only the part worth being proud of.
 */

import {
  accent,
  fontFamily,
  hairline,
  ink,
  molten,
  radius,
  space,
  typeScale,
} from '@classess/config';
import type { Sdk } from '@classess/sdk';
import { Button, Input, Tabs } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { learner, parentDigest } from '../mock/appData';

type LinkMethod = 'whatsapp' | 'email' | 'copy';

const METHODS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'copy', label: 'Copy link' },
];

const INVITE_LINK = `https://classess.app/join/${learner.name.toLowerCase()}-8f2a`;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EARNED = accent.cobalt; // the subject's earned hue — mastered work wears it
const fallbackNote = `This week ${learner.name} did beautifully. Here's the part worth being proud of.`;

/** A thin rule — the app's structural line, in place of card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** A tiny sentence-case label (never an all-caps eyebrow on every block). */
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

export function Parent({ sdk }: { sdk: Sdk }) {
  const bus = useVidyaBus();
  const inviteRef = useRegisterTarget<HTMLDivElement>('parent-invite', {
    kind: 'region',
    label: 'the invite-a-parent section',
  });
  const sendRef = useRegisterTarget<HTMLDivElement>('parent-send', {
    kind: 'control',
    label: 'the send link button',
  });
  const digestRef = useRegisterTarget<HTMLDivElement>('parent-digest', {
    kind: 'region',
    label: "this week's note home preview",
  });

  const reduce = useReducedMotion();
  const [method, setMethod] = useState<LinkMethod>('whatsapp');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(fallbackNote);
  const [refreshing, setRefreshing] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    bus.publishPage({ route: 'parent', state: { parentLinked: learner.parentLinked } });
  }, [bus]);

  // ponytail: clear the copied-confirmation timer on unmount; no library needed.
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
        };

  const changeMethod = (next: string) => {
    setMethod(next as LinkMethod);
    setContact('');
    setSent(false);
    setCopied(false);
  };

  const canSend = method !== 'copy' && contact.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    setSent(true);
    // Vidya waits alongside you — reaction from a user event, never an effect.
    bus.dispatch([{ type: 'setMood', mood: 'waiting' }]);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(INVITE_LINK);
    } catch {
      // ponytail: clipboard can be blocked; the link stays visible to copy by hand.
    }
    setCopied(true);
    bus.dispatch([{ type: 'setMood', mood: 'correct' }]);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const refreshPreview = async () => {
    setRefreshing(true);
    bus.dispatch([{ type: 'setMood', mood: 'thinking' }]);
    try {
      const result = await sdk.llm.invoke(
        'generate.digest',
        {
          learner: learner.name,
          mastered: parentDigest.masteredThisWeek,
          spotlight: parentDigest.strengthSpotlight,
          focus: parentDigest.currentFocus,
        },
        { consentTier: 'un_elevated' },
      );
      const out = result.output as { message?: string };
      setNote(out.message ?? fallbackNote);
    } catch {
      setNote(fallbackNote);
    } finally {
      setRefreshing(false);
      bus.dispatch([{ type: 'setMood', mood: 'celebrate' }]);
    }
  };

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
      {/* Masthead — a confident title, then the promise: pride first, never the working. */}
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
            maxWidth: '12ch',
          }}
        >
          Invite a parent.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: typeScale.bodyLg.size,
            lineHeight: typeScale.bodyLg.lineHeight,
            color: ink[700],
            maxWidth: '48ch',
          }}
        >
          They see the big picture — your wins — never your working. Pride first.
        </p>
      </motion.header>

      {/* Hero: the note home, lit. One soft molten aura (light, not a box) behind the letter. */}
      <motion.section ref={digestRef} {...rise(1)} style={{ position: 'relative' }}>
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
        <div
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[4] }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
            <span
              style={{ fontSize: typeScale.caption.size, letterSpacing: '0.14em', color: ink[500] }}
            >
              THIS WEEK'S NOTE HOME
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: typeScale.h1.size,
                lineHeight: 1.08,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: ink[900],
                maxWidth: '24ch',
              }}
            >
              {note}
            </h2>
          </div>

          {/* Mastered this week — each concept wearing its earned cobalt. No chips, no boxes. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
            <span style={labelStyle}>This week {learner.name} mastered</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${space[1]}px ${space[3]}px` }}>
              {parentDigest.masteredThisWeek.map((concept, i) => (
                <motion.span
                  key={concept}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: space.half,
                    color: EARNED,
                    fontSize: typeScale.body.size,
                    fontWeight: 600,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 6, height: 6, borderRadius: radius.jelly, background: EARNED }}
                  />
                  {concept}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Two-up: strength + what's next, side by side without a breakpoint. */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: space[6],
            }}
          >
            <Row label="Strength spotlight">{parentDigest.strengthSpotlight}</Row>
            <Row label="Now building">{parentDigest.currentFocus}</Row>
          </div>

          {/* Headline win — molten emphasis carried by tone, not a side-stripe or box. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.jelly,
                background: molten.base,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: typeScale.bodyLg.size, fontWeight: 600, color: molten.base }}>
              {parentDigest.headlineWin}
            </span>
          </div>

          {/* Vidya's hand — her voice on the page. */}
          <p
            style={{
              margin: 0,
              fontFamily: fontFamily.handwritten,
              fontSize: '1.5rem',
              lineHeight: 1.2,
              color: molten.base,
              transform: 'rotate(-2deg)',
              maxWidth: '30ch',
            }}
          >
            They only ever see this — never the struggle. — Vidya
          </p>

          <div style={{ display: 'flex' }}>
            <Button variant="ghost" onClick={refreshPreview} loading={refreshing}>
              Refresh preview
            </Button>
          </div>
        </div>
      </motion.section>

      <Rule />

      {/* Send it home — quiet, type-led. One primary molten action carries the send. */}
      <motion.section
        ref={inviteRef}
        {...rise(2)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          <h2
            style={{
              margin: 0,
              fontSize: typeScale.h3.size,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: ink[900],
            }}
          >
            Share it home
          </h2>
          <span style={labelStyle}>Pick a way to send the link.</span>
        </div>

        <Tabs
          items={METHODS}
          value={method}
          onChange={changeMethod}
          aria-label="How to send the link"
        />

        {sent ? (
          <WaitingState
            reduce={!!reduce}
            contact={contact}
            onChange={() => {
              setSent(false);
              bus.dispatch([{ type: 'setMood', mood: 'idle' }]);
            }}
          />
        ) : (
          <>
            {method === 'copy' ? (
              <Input
                label="Shareable link"
                value={INVITE_LINK}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            ) : (
              <Input
                label={method === 'whatsapp' ? "Parent's WhatsApp number" : "Parent's email"}
                type={method === 'whatsapp' ? 'tel' : 'email'}
                inputMode={method === 'whatsapp' ? 'tel' : 'email'}
                placeholder={method === 'whatsapp' ? '+91 98765 43210' : 'parent@example.com'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete={method === 'whatsapp' ? 'tel' : 'email'}
              />
            )}

            <div ref={sendRef} style={{ display: 'flex' }}>
              <Button
                variant="primary"
                size="lg"
                disabled={method !== 'copy' && !canSend}
                onClick={method === 'copy' ? copyLink : submit}
              >
                {method === 'copy' ? (copied ? 'Copied' : 'Copy link') : 'Send link'}
              </Button>
            </div>
          </>
        )}
      </motion.section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.half }}>
      <p style={{ margin: 0, ...labelStyle }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontSize: typeScale.body.size,
          lineHeight: typeScale.body.lineHeight,
          color: ink[700],
        }}
      >
        {children}
      </p>
    </div>
  );
}

function WaitingState({
  reduce,
  contact,
  onChange,
}: {
  reduce: boolean;
  contact: string;
  onChange: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space[2],
        padding: `${space[2]}px`,
        borderRadius: radius.md,
        background: molten.soft,
      }}
    >
      <motion.span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: radius.jelly,
          background: molten.base,
          flexShrink: 0,
        }}
        animate={reduce ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
        transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: typeScale.body.size, fontWeight: 600, color: ink[900] }}>
          Waiting for your parent to join
        </p>
        <p
          style={{
            margin: `2px 0 0`,
            fontSize: typeScale.caption.size,
            color: ink[500],
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Sent to {contact || 'your parent'}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange}>
        Change
      </Button>
    </div>
  );
}
