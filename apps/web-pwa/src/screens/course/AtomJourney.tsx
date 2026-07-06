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
import { BossSigil, TopicSigil } from '../../ui/art';
import { hueForTopic } from '../../ui/hues';
import { BalanceScale } from './BalanceScale';
import { Boss } from './Boss';
import { Greeting } from './Greeting';
import { MysteryLesson, MysteryTease } from './Mystery';
import { PracticeRun } from './PracticeRun';
import type { BarState } from './shared';
import { CardBody, Deck, lead, rgba, Stage, whisper } from './shared';
import { WhatIf } from './WhatIf';

/** A few slow hue motes drifting on the arrival stage — calm, alive. */
function StageMotes({ hue }: { hue: string }) {
  const motes = [
    { id: 'm1', left: '16%', top: '68%', s: 6, dur: 7 },
    { id: 'm2', left: '80%', top: '30%', s: 4, dur: 9 },
    { id: 'm3', left: '70%', top: '76%', s: 5, dur: 8 },
    { id: 'm4', left: '24%', top: '22%', s: 3, dur: 10 },
  ];
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {motes.map((m, i) => (
        <motion.span
          key={m.id}
          animate={{ y: [0, -14, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{
            duration: m.dur,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            delay: i * 0.9,
          }}
          style={{
            position: 'absolute',
            left: m.left,
            top: m.top,
            width: m.s,
            height: m.s,
            borderRadius: 999,
            background: i === 1 ? '#FFC93C' : rgba(hue, 0.5),
          }}
        />
      ))}
    </div>
  );
}

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
}: {
  topic: Topic;
  nodeId: string;
  setBar: (b: BarState | null) => void;
  setProgress: (p: { f: number; segments: number }) => void;
  onExit: () => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { award } = useProgress();

  const [card, setCard] = useState<CardId>('arrival');
  const [sub, setSub] = useState(0);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const enteredAt = useRef(Date.now());
  const attempts = useRef(0);
  const enteredFired = useRef(false);

  const chapter = chapterById(topic.chapterId);

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
  const toGreeting = useCallback(() => go('greeting'), [go]);
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
      setBar({ primary: { label: 'begin', onClick: () => go('scale') } });
    } else if (card === 'bossdoor') {
      setBar({ primary: { label: 'step in', onClick: () => go('boss') } });
    }
  }, [card, setBar, go]);

  return (
    <Deck id={card}>
      {card === 'arrival' && (
        <CardBody maxWidth={620}>
          {/* the concept's own sigil, XL, drawing itself over its stage — this course's identity */}
          <Stage hue={hueForTopic(topic.id)} tint={0.06} minHeight={320}>
            <StageMotes hue={hueForTopic(topic.id)} />
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 230, damping: 26 }}
            >
              <TopicSigil id={topic.id} size={140} draw />
            </motion.div>
          </Stage>
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
          />
        ) : (
          <CardBody>
            <div style={{ ...whisper, textAlign: 'center' }}>fetching your three…</div>
          </CardBody>
        ))}

      {card === 'bossdoor' && (
        <CardBody maxWidth={620}>
          {/* the one dark moment — an ink stage; the topic's sigil glowing in its ring */}
          <Stage dark minHeight={340}>
            <motion.div
              aria-hidden
              animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
              transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: 999,
                background: `radial-gradient(circle, ${rgba(hueForTopic(topic.id), 0.3)} 0%, transparent 62%)`,
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
                color: 'rgba(255,255,255,0.6)',
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
        />
      )}

      {card === 'tease' && <MysteryTease setBar={setBar} onOpen={toMystery} onSkip={onExit} />}

      {card === 'mystery' && <MysteryLesson setBar={setBar} onDone={finishMystery} />}
    </Deck>
  );
}
