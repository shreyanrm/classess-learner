'use client';

/**
 * Plans (Superstar) — recomposed as "the unlit page". No pricing card: the price itself is the hero,
 * set in display type with a soft molten aura (light, not a shadow). Structure comes from a confident
 * masthead, hairline rules and whitespace; the segmented cycle toggle, savings emphasis, benefits
 * checklist, referral note and disabled Subscribe are all preserved — only the layout is new.
 */

import { fontFamily, hairline, ink, molten, radius, space, typeScale } from '@classess/config';
import { Button } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useState } from 'react';
import { plans, superstarBenefits } from '../mock/appData';
import { useRouter } from '../shell/router';

// ease-out per the brand motion law; framer wants a mutable 4-tuple.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Cycle = 'monthly' | 'annual';
const CYCLES: { key: Cycle; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'annual', label: 'Annual' },
];

// Annual price / 12, so the yearly plan can advertise a concrete per-month figure that stays honest
// if the seed price ever changes. ponytail: parse-from-string is fine for one static price.
const annualPerMonth = Math.round(
  Number(plans.annual.price.replace(/\D/g, '')) / 12,
).toLocaleString('en-IN');

/** A thin rule — the app's structural line, replacing card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** A tiny sentence-case section label. */
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5 8 14l7.5-8"
        stroke={molten.base}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Plans() {
  const bus = useVidyaBus();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [cycle, setCycle] = useState<Cycle>('annual');
  const hintId = useId();

  const priceRef = useRegisterTarget<HTMLDivElement>('plans-pricing', {
    kind: 'region',
    label: 'the Superstar price and billing choice',
  });
  const subscribeRef = useRegisterTarget<HTMLDivElement>('plans-subscribe', {
    kind: 'control',
    label: 'the Subscribe button',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: publish the entry cycle once on mount; toggling re-runs would fight the mount rule.
  useEffect(() => {
    bus.publishPage({ route: 'plans', state: { cycle } });
  }, [bus]);

  const pick = (next: Cycle) => {
    if (next === cycle) return;
    setCycle(next);
    // Vidya's one moment: finding the saving is a little win, so she celebrates the annual choice.
    bus.dispatch([{ type: 'setMood', mood: next === 'annual' ? 'celebrate' : 'waiting' }]);
  };

  const [amount, per] = plans[cycle].price.split('/');
  const savings = plans.annual.note ?? 'Save ₹1,000 a year';

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
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
      {/* Masthead — one tracked label, then a confident headline and the aspiration. */}
      <motion.header
        {...rise(0)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
      >
        <span
          style={{ fontSize: typeScale.caption.size, letterSpacing: '0.14em', color: ink[500] }}
        >
          CLASSESS SUPERSTAR
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: typeScale.h1.size,
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: ink[900],
            maxWidth: '16ch',
          }}
        >
          Learn without a ceiling.
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
          No daily limit on what you master. Go as deep as your curiosity takes you — the whole map,
          in full colour.
        </p>
      </motion.header>

      <Rule />

      {/* Hero: the price, in display type, lit by a soft molten aura (light, not a box). */}
      <motion.section {...rise(1)} style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -70,
            top: 20,
            width: 400,
            height: 280,
            background: `radial-gradient(closest-side, ${molten.soft}, transparent 70%)`,
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
        <div
          ref={priceRef}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[3] }}
        >
          {/* Segmented cycle toggle — a compact pill, not a bar. */}
          <fieldset
            aria-label="Billing cycle"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              gap: space.half,
              margin: 0,
              minInlineSize: 0,
              padding: space.half,
              borderRadius: radius.jelly,
              border: `1px solid ${hairline.onPaper}`,
              background: ink[100],
            }}
          >
            {CYCLES.map(({ key, label }) => {
              const active = key === cycle;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(key)}
                  style={{
                    appearance: 'none',
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: radius.jelly,
                    padding: `${space[1]}px ${space[3]}px`,
                    fontSize: typeScale.body.size,
                    fontWeight: 600,
                    color: active ? '#FFFFFF' : ink[700],
                    background: active ? molten.base : 'transparent',
                    transition: reduce
                      ? undefined
                      : 'background 180ms cubic-bezier(0.16,1,0.3,1), color 180ms',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </fieldset>

          {/* Price — re-animates as the cycle changes. */}
          <motion.div
            key={cycle}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}
          >
            <span style={labelStyle}>Your price</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: space.half }}>
              <span
                style={{
                  fontSize: typeScale.display.size,
                  lineHeight: 1,
                  fontWeight: 600,
                  color: ink[900],
                  letterSpacing: '-0.03em',
                }}
              >
                {amount ?? plans[cycle].price}
              </span>
              {per && (
                <span style={{ fontSize: typeScale.h3.size, fontWeight: 500, color: ink[500] }}>
                  /{per}
                </span>
              )}
            </div>

            {cycle === 'annual' ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  gap: space.half,
                  marginTop: space.half,
                }}
              >
                <span
                  style={{
                    fontSize: typeScale.body.size,
                    fontWeight: 600,
                    color: molten.base,
                  }}
                >
                  {savings}
                </span>
                <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
                  · about ₹{annualPerMonth} a month, billed yearly.
                </span>
              </div>
            ) : (
              <p
                style={{
                  margin: `${space.half}px 0 0`,
                  fontSize: typeScale.caption.size,
                  color: ink[500],
                }}
              >
                Billed monthly. Go annual to{' '}
                <span style={{ color: molten.base, fontWeight: 600 }}>{savings.toLowerCase()}</span>
                .
              </p>
            )}
          </motion.div>
        </div>
      </motion.section>

      <Rule />

      {/* Benefits — a clean two-up checklist with molten ticks (no side-stripe cards). */}
      <motion.section
        {...rise(2)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <span style={labelStyle}>What you get</span>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: space[2],
          }}
        >
          {superstarBenefits.map((benefit) => (
            <li key={benefit} style={{ display: 'flex', alignItems: 'flex-start', gap: space[1] }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>
                <Check />
              </span>
              <span
                style={{
                  fontSize: typeScale.body.size,
                  lineHeight: typeScale.body.lineHeight,
                  color: ink[900],
                }}
              >
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Vidya's hand — her voice in the margin. */}
      <motion.p
        {...rise(3)}
        aria-hidden
        style={{
          margin: 0,
          alignSelf: 'flex-end',
          fontFamily: fontFamily.handwritten,
          fontSize: '1.6rem',
          lineHeight: 1.1,
          color: molten.base,
          transform: 'rotate(-3deg)',
        }}
      >
        imagine the whole map, lit. — Vidya
      </motion.p>

      <Rule />

      {/* Founding member + referral (no free trials). */}
      <motion.section
        {...rise(4)}
        style={{ display: 'flex', flexDirection: 'column', gap: space.half }}
      >
        <p style={{ margin: 0, fontSize: typeScale.body.size, fontWeight: 600, color: ink[900] }}>
          Founding member
        </p>
        <p
          style={{
            margin: 0,
            fontSize: typeScale.body.size,
            lineHeight: typeScale.body.lineHeight,
            color: ink[700],
            maxWidth: '52ch',
          }}
        >
          You're early. Your price is locked for as long as you stay. Refer a friend and{' '}
          <span style={{ color: molten.base, fontWeight: 600 }}>get a month free</span>.
        </p>
      </motion.section>

      {/* Actions — the one molten action (Subscribe, not yet live) and a quiet way back. */}
      <motion.section
        {...rise(5)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}
      >
        <div ref={subscribeRef} style={{ display: 'flex' }}>
          <Button variant="primary" size="lg" disabled aria-describedby={hintId}>
            Subscribe
          </Button>
        </div>
        <span id={hintId} style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
          Coming soon — payments open in a later phase.
        </span>
        <div style={{ marginTop: space.half }}>
          <Button variant="ghost" onClick={() => router.back()}>
            Maybe later
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
