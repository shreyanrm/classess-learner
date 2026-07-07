'use client';

/**
 * The atom journey — the complete proven course for linear equations (topic m2-1, the real
 * ontology node). Arrival → balance-scale discovery → what-if sandbox → practice run → boss →
 * the greeting → the mystery tease. One idea per card, act-to-reveal, events on every meaningful
 * action (CONTEXT.md §5).
 */

import type { PracticeItem } from '@classess/sdk';
import { useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chapterById } from '../../data/catalog';
import type { Topic } from '../../data/model';
import { useProgress } from '../../store/progress';
import { useSdk } from '../../store/sdk';
import { BossSigil } from '../../ui/art';
import { CourseIntroScene } from '../../ui/courseIntro';
import { hueForTopic } from '../../ui/hues';
import { announceCard } from '../../vidya/speech';
import { BalanceScale } from './BalanceScale';
import { Boss } from './Boss';
import { Greeting } from './Greeting';
import { MysteryLesson, MysteryTease } from './Mystery';
import { PracticeRun } from './PracticeRun';
import type { BarState } from './shared';
import {
  CardBody,
  Deck,
  lead,
  readCoursePos,
  rgba,
  Stage,
  whisper,
  writeCoursePos,
} from './shared';
import { WhatIf } from './WhatIf';

type CardId =
  | 'arrival'
  | 'scale'
  | 'whatif'
  | 'practice'
  | 'bossdoor'
  | 'boss'
  | 'greeting'
  | 'tease'
  | 'mystery';

const SEGMENTS = 9;
/** Per-card progress: base fill + the span the card's own sub-progress moves through. */
const PROGRESS: Record<CardId, [base: number, span: number]> = {
  arrival: [0.08, 0], // endowed — it never starts empty
  scale: [0.2, 0],
  whatif: [0.36, 0],
  practice: [0.5, 0.22],
  bossdoor: [0.74, 0],
  boss: [0.78, 0.16],
  greeting: [1, 0],
  tease: [1, 0],
  mystery: [1, 0],
};

export function AtomJourney({
  topic,
  nodeId,
  setBar,
  setProgress,
  onExit,
  onResume,
}: {
  topic: Topic;
  nodeId: string;
  setBar: (b: BarState | null) => void;
  setProgress: (p: { f: number; segments: number }) => void;
  onExit: () => void;
  /** Fired once when the player restores a saved mid-course position. */
  onResume?: () => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { award, completed, setReplay } = useProgress();

  // Owner replay law: a completed course can be redone freely, but earns no xp. Captured once at
  // mount (completeTopic flips `completed` at the greeting, so a live read would mislabel the very
  // first run as a replay).
  const replay = useRef(completed.has(topic.id)).current;

  const [card, setCard] = useState<CardId>(() => {
    // Resume where they left off — a course remembers its place (cliffhanger-friendly). A completed
    // course never resumes a stale end state: a replay always begins at the first card.
    const saved = readCoursePos(topic.id);
    if (
      !replay &&
      typeof saved === 'string' &&
      saved !== 'arrival' &&
      saved !== 'greeting' &&
      saved !== 'tease' &&
      saved !== 'mystery'
    ) {
      return saved as CardId;
    }
    return 'arrival';
  });
  const resumedRef = useRef(card !== 'arrival');
  const [sub, setSub] = useState(0);
  const [items, setItems] = useState<PracticeItem[]>([]);
  // how many of the boss's three the learner got right — the greeting's performance-star signal
  const [bossCorrect, setBossCorrect] = useState(3);
  const enteredAt = useRef(Date.now());
  const attempts = useRef(0);
  const enteredFired = useRef(false);

  const chapter = chapterById(topic.chapterId);

  // She reads each card's core line on arrival. Teaching cards gate the advance button (true);
  // celebration + the boss workbook narrate without locking (false). Practice is omitted — the run
  // reads each question itself as the learner moves.
  useEffect(() => {
    const name = topic.name.toLowerCase();
    const lines: Partial<Record<CardId, [text: string, gate: boolean]>> = {
      arrival: [`${name}. one idea — a scale that cannot lie, and a boss at the end.`, true],
      scale: [
        'Here is a scale that cannot lie. Whatever you do to one side, do to the other, and it stays balanced.',
        true,
      ],
      whatif: ['Now play. Change a number, and watch the whole equation answer back.', true],
      bossdoor: [
        'the boss. three questions — everything you just did, once more with weight. two of three closes the topic.',
        true,
      ],
      boss: ['Take your time. Solve it, fill in the missing step, and spot the error.', false],
      greeting: ['You did it. You can move a whole equation now, and keep it true.', false],
      tease: ['One more thing before you go — a small mystery.', false],
      mystery: ['Here is the twist that makes it all click.', false],
    };
    const entry = lines[card];
    if (entry) announceCard(`atom-${topic.id}-${card}`, entry[0], entry[1]);
  }, [card, topic.id, topic.name]);

  // resumed mid-course — let the shell show the quiet "picking up where you left off" beat, once
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only, resumedRef is stable
  useEffect(() => {
    if (resumedRef.current) onResume?.();
  }, []);

  // hold the store's replay guard open for as long as this completed course is on screen — every
  // award and completion inside then no-ops (no xp, no bloom, no level math).
  useEffect(() => {
    setReplay(replay);
    return () => setReplay(false);
  }, [setReplay, replay]);

  // arrival: the entered event, with the band the evidence plane currently holds
  useEffect(() => {
    if (enteredFired.current) return;
    enteredFired.current = true;
    bus.publishCurriculum({ nodeId, nodeName: topic.name });
    void (async () => {
      let band = 'not_started';
      try {
        const bands = await sdk.kgtopg.mastery.getBands(sdk.config.mockSubjectId);
        band = bands.find((b) => b.node_id === nodeId)?.band ?? band;
      } catch {
        // fresh learner — not_started is the honest default
      }
      sdk.events.record(
        'learn.node.entered.v1',
        {
          node_id: nodeId,
          entry: 'map',
          initial_band: band as
            | 'not_started'
            | 'emerging'
            | 'developing'
            | 'secure'
            | 'independent',
        },
        { ontologyNodeId: nodeId },
      );
    })();
  }, [bus, sdk, nodeId, topic.name]);

  useEffect(() => {
    void sdk.content.getPracticeItems(nodeId).then((fetched) => {
      setItems([...fetched].sort((a, b) => a.difficulty - b.difficulty));
    });
  }, [sdk, nodeId]);

  useEffect(() => {
    const entry = PROGRESS[card];
    setProgress({ f: Math.min(1, entry[0] + sub * entry[1]), segments: SEGMENTS });
  }, [setProgress, card, sub]);

  // Every content type pays out on completion — small, once per topic, felt immediately.
  const CARD_XP: Partial<Record<CardId, number>> = useMemo(
    () => ({ scale: 15, whatif: 15, practice: 20 }),
    [],
  );
  const go = useCallback(
    (next: CardId) => {
      writeCoursePos(topic.id, next);
      const earned = CARD_XP[card];
      if (earned) award('bonus', { amount: earned, onceKey: `card-${topic.id}-${card}` });
      setSub(0);
      setCard(next);
    },
    [card, CARD_XP, award, topic.id],
  );

  const onAttempt = useCallback(() => {
    attempts.current += 1;
  }, []);

  const onScaleReveal = useCallback(
    (struggles: number) => {
      sdk.events.record(
        'learn.reveal.shown.v1',
        {
          node_id: nodeId,
          reveal_id: crypto.randomUUID(),
          modality: 'interactive',
          after_attempts: struggles,
          verification_hash: 'seed-balance-scale-x-plus-3-eq-8-v1',
        },
        { ontologyNodeId: nodeId },
      );
    },
    [sdk, nodeId],
  );

  // stable identities — bar-setting effects in the cards depend on these
  const toWhatif = useCallback(() => go('whatif'), [go]);
  const toPractice = useCallback(() => go('practice'), [go]);
  const toBossdoor = useCallback(() => go('bossdoor'), [go]);
  const toGreeting = useCallback(
    (correct: number) => {
      setBossCorrect(correct);
      go('greeting');
    },
    [go],
  );
  const toTease = useCallback(() => go('tease'), [go]);
  const toMystery = useCallback(() => go('mystery'), [go]);
  const finishMystery = useCallback(() => {
    award('mystery', { onceKey: `mystery-${topic.id}` });
    onExit();
  }, [award, topic.id, onExit]);

  const practiceItems = useMemo(() => items.slice(0, 3), [items]);
  const bossItems = useMemo(
    () => (items.length >= 6 ? items.slice(3, 6) : items.slice(0, 3)),
    [items],
  );

  // static cards set their own bar here
  useEffect(() => {
    if (card === 'arrival') {
      setBar({ primary: { label: 'Begin', onClick: () => go('scale') } });
    } else if (card === 'bossdoor') {
      setBar({ primary: { label: 'Step in', onClick: () => go('boss') } });
    }
  }, [card, setBar, go]);

  return (
    <Deck id={card}>
      {card === 'arrival' && (
        <CardBody maxWidth={620}>
          {/* this course's own arrival scene — sigil geometry + subject hue + a small cast */}
          <CourseIntroScene
            topicId={topic.id}
            hue={hueForTopic(topic.id)}
            minHeight={320}
            sigilSize={150}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={whisper}>{(chapter?.name ?? 'mathematics').toLowerCase()}</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.2, 0, 0, 1] }}
              style={{
                marginTop: 12,
                fontSize: 'clamp(1.9rem, 6vw, 2.5rem)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.12,
                color: 'var(--clss-ink-900)',
              }}
            >
              {topic.name.toLowerCase()}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ ...lead, marginTop: 12 }}
            >
              one idea, a scale that cannot lie, and a boss at the end.
            </motion.div>
          </div>
        </CardBody>
      )}

      {card === 'scale' && (
        <BalanceScale nodeId={nodeId} setBar={setBar} onReveal={onScaleReveal} onDone={toWhatif} />
      )}

      {card === 'whatif' && <WhatIf nodeId={nodeId} setBar={setBar} onDone={toPractice} />}

      {card === 'practice' &&
        (practiceItems.length > 0 ? (
          <PracticeRun
            nodeId={nodeId}
            items={practiceItems}
            setBar={setBar}
            setSub={setSub}
            onAttempt={onAttempt}
            onDone={toBossdoor}
            replay={replay}
          />
        ) : (
          <CardBody>
            <div style={{ ...whisper, textAlign: 'center' }}>Fetching your three…</div>
          </CardBody>
        ))}

      {card === 'bossdoor' && (
        <CardBody maxWidth={620}>
          {/* the weighted moment — a tonal stage; the topic's sigil glowing in its ring */}
          <Stage tonal minHeight={340}>
            <motion.div
              aria-hidden
              animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
              transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: 999,
                background: `radial-gradient(circle, ${rgba(hueForTopic(topic.id), 0.16)} 0%, transparent 62%)`,
                pointerEvents: 'none',
              }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 230, damping: 26, delay: 0.15 }}
              style={{ position: 'relative' }}
            >
              <BossSigil id={topic.id} size={120} mastered hue={hueForTopic(topic.id)} />
            </motion.div>
            <div
              style={{
                ...whisper,
                position: 'relative',
                marginTop: 22,
              }}
            >
              no fear — just weight
            </div>
          </Stage>
          <div style={{ textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.2, 0, 0, 1] }}
              style={{
                fontSize: 'clamp(1.6rem, 5vw, 2rem)',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: 'var(--clss-ink-900)',
              }}
            >
              the boss
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ ...lead, marginTop: 12 }}
            >
              three questions — everything you just did, once more with weight. two of three closes
              the topic.
            </motion.div>
          </div>
        </CardBody>
      )}

      {card === 'boss' && (
        <Boss
          nodeId={nodeId}
          items={bossItems}
          setBar={setBar}
          setSub={setSub}
          onAttempt={onAttempt}
          onPass={toGreeting}
        />
      )}

      {card === 'greeting' && (
        <Greeting
          topic={topic}
          nodeId={nodeId}
          attemptsTotal={attempts.current}
          enteredAt={enteredAt.current}
          setBar={setBar}
          onContinue={toTease}
          boss
          bossCorrect={bossCorrect}
          bossTotal={bossItems.length}
          itemsTotal={practiceItems.length + bossItems.length}
          replay={replay}
        />
      )}

      {card === 'tease' && <MysteryTease setBar={setBar} onOpen={toMystery} onSkip={onExit} />}

      {card === 'mystery' && <MysteryLesson setBar={setBar} onDone={finishMystery} />}
    </Deck>
  );
}
