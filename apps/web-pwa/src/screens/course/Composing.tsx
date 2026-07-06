'use client';

/**
 * The composing journey — an honest, beautiful state for topics whose verified course is not
 * built yet. Vidya writes the course outline in ink, then runs a small structural mini-course:
 * a pose, an act-to-reveal, and a door to the atom. No fact is presented here that has not
 * passed verification (CONTEXT.md) — every prompt is structural, drawn from the learner.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from '../../shell/router';
import { useVidyaChat } from '../../vidya/chat';
import type { BarState } from './shared';
import { CardBody, cardTitle, Deck, lead, whisper } from './shared';

const ATOM_TOPIC_ID = 'm2-1';

/** Structural outline — a plan, never an unverified fact. */
function outlineFor(name: string): string[] {
  const n = name.toLowerCase();
  return [
    `what ${n} is really asking`,
    `${n}, made visible`,
    'bend it until it breaks',
    `where ${n} shows up around you`,
    'the boss — prove it is yours',
  ];
}

function revealsFor(name: string): { seal: string; text: string }[] {
  const n = name.toLowerCase();
  return [
    {
      seal: 'first',
      text: `${n} gets made visible — something you can drag and push, never a paragraph to sit through.`,
    },
    {
      seal: 'then',
      text: 'you bend it until it breaks — the fastest way to trust a rule is to find where it stops working.',
    },
    {
      seal: 'last',
      text: 'the boss — you prove it is yours, the greeting lands, and the map lights up.',
    },
  ];
}

export function Composing({
  topicId,
  title,
  setBar,
  setProgress,
  onExit,
}: {
  topicId: string;
  title: string;
  setBar: (b: BarState | null) => void;
  setProgress: (p: { f: number; segments: number }) => void;
  onExit: () => void;
}) {
  const router = useRouter();
  const bus = useVidyaBus();
  const { setMood } = useVidyaChat();

  const [stage, setStage] = useState(0);
  const [inkDone, setInkDone] = useState(false);
  const [reflection, setReflection] = useState('');
  const [shared, setShared] = useState(false);
  const [opened, setOpened] = useState<boolean[]>([false, false, false]);

  const outline = outlineFor(title);
  const reveals = revealsFor(title);
  const allOpen = opened.every(Boolean);

  const reflectionRef = useRegisterTarget<HTMLTextAreaElement>('course-reflection', {
    kind: 'input',
    label: `where the learner writes what they already notice about ${title.toLowerCase()}`,
  });

  // endowed progress across the four cards
  useEffect(() => {
    const f = [0.08, 0.38, 0.64, 0.92][stage] ?? 0.92;
    setProgress({ f, segments: 4 });
  }, [setProgress, stage]);

  // she is visibly composing
  useEffect(() => {
    if (stage !== 0) return;
    setMood('thinking');
    const done = window.setTimeout(() => {
      setInkDone(true);
      setMood('idle');
    }, 3300);
    return () => window.clearTimeout(done);
  }, [stage, setMood]);

  useEffect(() => {
    if (!shared || reflection === '') return;
    bus.publishCanvas({
      nodeId: `composing-${topicId}`,
      steps: [`the learner's own noticing about ${title.toLowerCase()}: ${reflection}`],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, topicId, title, shared, reflection]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  // the action bar per card
  useEffect(() => {
    if (stage === 0) {
      setBar({
        primary: { label: 'start the preview', onClick: () => setStage(1), disabled: !inkDone },
      });
    } else if (stage === 1) {
      setBar(
        shared
          ? { primary: { label: 'continue', onClick: () => setStage(2) } }
          : {
              primary: {
                label: 'share it',
                disabled: reflection.trim().length < 3,
                onClick: () => {
                  setShared(true);
                  setMood('correct');
                  window.setTimeout(() => setMood('idle'), 1400);
                },
              },
            },
      );
    } else if (stage === 2) {
      setBar({ primary: { label: 'continue', onClick: () => setStage(3), disabled: !allOpen } });
    } else {
      setBar({
        primary: {
          label: 'open the atom',
          onClick: () => router.replace({ name: 'course', topicId: ATOM_TOPIC_ID }),
        },
        secondary: { label: 'done', onClick: onExit },
      });
    }
  }, [setBar, stage, inkDone, shared, reflection, allOpen, router, onExit, setMood]);

  return (
    <Deck id={`compose-${stage}`}>
      {stage === 0 && (
        <CardBody maxWidth={560}>
          <div style={whisper}>Vidya is writing your course</div>
          <div style={cardTitle}>{title.toLowerCase()}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
            {/* the ink line, drawing itself */}
            <svg
              width="20"
              height={outline.length * 54}
              viewBox={`0 0 20 ${outline.length * 54}`}
              role="presentation"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <motion.path
                d={`M 10 6 C 4 ${outline.length * 9}, 16 ${outline.length * 27}, 10 ${outline.length * 54 - 10}`}
                fill="none"
                stroke="var(--clss-ink-900)"
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.9, ease: [0.3, 0, 0.2, 1] }}
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {outline.map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.55, duration: 0.45, ease: [0.2, 0, 0, 1] }}
                  style={{
                    fontSize: '1.02rem',
                    color: 'var(--clss-ink-900)',
                    lineHeight: 1.45,
                    minHeight: 38,
                  }}
                >
                  <span style={{ ...whisper, marginRight: 10 }}>{i + 1}</span>
                  {line}
                </motion.div>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {inkDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{ ...lead, marginTop: 6 }}
              >
                the full course is in verification — nothing lands here until it passes. a working
                preview is ready now.
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      )}

      {stage === 1 && (
        <CardBody maxWidth={560}>
          <div style={whisper}>before anything</div>
          <div style={cardTitle}>what do you already notice about {title.toLowerCase()}?</div>
          <div style={lead}>there is no wrong answer — your own noticing is the raw material.</div>
          <textarea
            ref={reflectionRef}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={shared}
            rows={4}
            placeholder="write anything you have seen, guessed, or wondered…"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-sm)',
              outline: 'none',
              resize: 'vertical',
              background: 'var(--clss-paper)',
              color: 'var(--clss-ink-900)',
            }}
          />
          <AnimatePresence>
            {shared && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                style={{ ...lead, borderLeft: '2px solid var(--clss-ink-900)', paddingLeft: 14 }}
              >
                held. the finished course will take exactly this and test it against the real thing
                — that is how the good ones start.
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      )}

      {stage === 2 && (
        <CardBody maxWidth={560}>
          <div style={whisper}>act first — tap each seal</div>
          <div style={cardTitle}>how this course will treat you</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
            {reveals.map((r, i) => (
              <motion.button
                key={r.seal}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setOpened((o) => o.map((v, j) => (j === i ? true : v)))}
                aria-expanded={opened[i]}
                style={{
                  textAlign: 'left',
                  padding: '16px 18px',
                  fontFamily: 'inherit',
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-md)',
                  background: opened[i] ? 'var(--clss-paper)' : 'var(--clss-canvas)',
                  cursor: opened[i] ? 'default' : 'pointer',
                }}
              >
                <span style={whisper}>{r.seal}</span>
                <AnimatePresence mode="wait" initial={false}>
                  {opened[i] ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                      style={{
                        marginTop: 6,
                        fontSize: '0.98rem',
                        lineHeight: 1.6,
                        color: 'var(--clss-ink-900)',
                      }}
                    >
                      {r.text}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sealed"
                      exit={{ opacity: 0 }}
                      style={{ marginTop: 6, fontSize: '0.98rem', color: 'var(--clss-ink-500)' }}
                    >
                      tap to open
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </CardBody>
      )}

      {stage === 3 && (
        <CardBody maxWidth={520}>
          <div style={{ textAlign: 'center' }}>
            <div style={whisper}>while this course is verified</div>
            <div style={{ ...cardTitle, marginTop: 12 }}>one door is already open</div>
            <div style={{ ...lead, marginTop: 12 }}>
              the full {title.toLowerCase()} course is being prepared and checked line by line. the
              atom — linear equations — is live today, end to end: the scale, the sandbox, the boss,
              the greeting.
            </div>
          </div>
        </CardBody>
      )}
    </Deck>
  );
}
