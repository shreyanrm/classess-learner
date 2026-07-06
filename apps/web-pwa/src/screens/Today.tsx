'use client';

/**
 * Today — the ritual home, reimagined as an editorial page, not a dashboard of cards. Structure comes
 * from type, whitespace, and hairline rules; colour is earned (the mastered concept keeps its hue) and
 * molten carries the one action. Vidya's hand appears in the margin. Depth is light (a soft aura), never
 * a shadow. This is "the unlit page": stark ink on paper until understanding lights it.
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
import { Underline, useReducedMotion } from '@classess/motion';
import { Button } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Constellation } from '../components/Constellation';
import {
  learner,
  masteredCount,
  meter,
  nextBestNodeId,
  nodeById,
  subject,
  todaysWin,
  totalCount,
} from '../mock/appData';
import { useRouter } from '../shell/router';
import { useShell } from '../shell/shell-context';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EARNED = accent[subject.accent]; // cobalt — the subject's earned hue

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function today(): string {
  return new Date()
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    .toUpperCase();
}

/** A thin rule — the app's structural line, replacing most card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** A tiny sentence-case section label (never an all-caps eyebrow on every block). */
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

export function Today() {
  const { publishPage, dispatch } = useVidyaBus();
  const router = useRouter();
  const { openMeter } = useShell();
  const reduced = useReducedMotion();

  const heroRef = useRegisterTarget<HTMLDivElement>('today-next', {
    kind: 'concept',
    label: 'your next concept to learn',
  });
  const meterRef = useRegisterTarget<HTMLDivElement>('today-meter', {
    kind: 'control',
    label: "today's concept budget",
  });
  const mapRef = useRegisterTarget<HTMLButtonElement>('today-map', {
    kind: 'region',
    label: 'your learning map so far',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: publishPage/dispatch are stable; run once on mount.
  useEffect(() => {
    publishPage({
      route: 'today',
      state: { nextBestNodeId, used: meter.used, total: meter.total },
    });
    if (todaysWin) dispatch([{ type: 'setMood', mood: 'celebrate' }]);
  }, []);

  const next = nodeById(nextBestNodeId);
  const remaining = meter.total - meter.used;
  const pct = Math.round((meter.used / meter.total) * 100);

  const rise = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE },
        };

  function begin() {
    dispatch([{ type: 'setMood', mood: 'thinking' }]);
    router.navigate({ name: 'learn', nodeId: nextBestNodeId });
  }

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
      {/* Masthead — one deliberate tracked date, then a confident display greeting. */}
      <motion.header
        {...rise(0)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
      >
        <span
          style={{ fontSize: typeScale.caption.size, letterSpacing: '0.14em', color: ink[500] }}
        >
          {today()}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: typeScale.display.size,
            lineHeight: 1.02,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: ink[900],
            maxWidth: '14ch',
          }}
        >
          {greeting()}, {learner.name}.
        </h1>
      </motion.header>

      {/* Hero: the one next step, type-led, with a soft molten aura (light, not a box). */}
      <motion.section ref={heroRef} {...rise(1)} style={{ position: 'relative' }}>
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
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: space[2] }}
        >
          <span style={labelStyle}>Your next concept</span>
          <h2
            style={{
              margin: 0,
              fontSize: typeScale.h1.size,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: ink[900],
              maxWidth: '18ch',
            }}
          >
            {next?.name ?? 'Your next concept'}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: typeScale.bodyLg.size,
              lineHeight: typeScale.bodyLg.lineHeight,
              color: ink[700],
              maxWidth: '46ch',
            }}
          >
            {next?.blurb ?? 'A fresh idea, ready when you are.'}
          </p>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: space[3], marginTop: space[2] }}
          >
            <Button variant="primary" size="lg" onClick={begin}>
              Begin
            </Button>
            <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
              about 15 minutes
            </span>
            <span
              aria-hidden
              style={{
                fontFamily: fontFamily.handwritten,
                fontSize: '1.4rem',
                lineHeight: 1,
                color: molten.base,
                transform: 'rotate(-5deg)',
                marginLeft: space.half,
              }}
            >
              you've got this
            </span>
          </div>
        </div>
      </motion.section>

      <Rule />

      {/* Meter as a thin line — calm, never a boxed widget. */}
      <motion.section
        ref={meterRef}
        {...rise(2)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: space[2],
          }}
        >
          <span style={{ fontSize: typeScale.body.size, color: ink[900], fontWeight: 500 }}>
            Today's practice
          </span>
          <button
            type="button"
            onClick={openMeter}
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: typeScale.caption.size,
              color: ink[500],
            }}
          >
            {remaining} of {meter.total} left
          </button>
        </div>
        <div
          style={{
            position: 'relative',
            height: 3,
            background: ink[100],
            borderRadius: radius.jelly,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              transformOrigin: 'left',
              width: `${pct}%`,
              background: ink[900],
            }}
          />
        </div>
      </motion.section>

      <Rule />

      {/* Earned light: today's win (in its colour, with Vidya's hand) beside the constellation peek. */}
      <motion.section
        {...rise(3)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: space[6],
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          <span style={labelStyle}>{todaysWin ? "Today's win" : 'No win yet'}</span>
          {todaysWin ? (
            <>
              <h3
                style={{
                  margin: 0,
                  fontSize: typeScale.h2.size,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: EARNED,
                }}
              >
                {todaysWin.nodeName}
              </h3>
              <Underline width={190} height={12} color={EARNED} strokeWidth={2} />
              <p
                style={{
                  margin: 0,
                  fontSize: typeScale.body.size,
                  color: ink[700],
                  maxWidth: '38ch',
                }}
              >
                That one's yours now — it earned its colour.
              </p>
              <span
                style={{
                  marginTop: space[1],
                  fontFamily: fontFamily.handwritten,
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  color: molten.base,
                }}
              >
                so proud of you — Vidya
              </span>
            </>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: typeScale.body.size,
                color: ink[700],
                maxWidth: '38ch',
              }}
            >
              Take one concept all the way today, and watch it light up.
            </p>
          )}
        </div>

        <button
          type="button"
          ref={mapRef}
          onClick={() => router.navigate({ name: 'progress' })}
          style={{
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: space[1],
          }}
        >
          <span style={labelStyle}>Your mind, lighting up</span>
          <Constellation variant="peek" currentId={nextBestNodeId} />
          <span style={{ fontSize: typeScale.caption.size, color: ink[700] }}>
            {masteredCount()} mastered · {totalCount() - masteredCount()} to go →
          </span>
        </button>
      </motion.section>

      <Rule />

      <motion.p
        {...rise(4)}
        style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}
      >
        You've shown up {learner.streakDays} days this week. That's the whole game.
      </motion.p>
    </main>
  );
}
