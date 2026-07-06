'use client';

/**
 * The greeting — the earned close of a topic (DESIGN.md §3.9). A full-screen calm card, her
 * words, and the ignite: one ultramarine catch-light sweeping the region, sub-second, sound-free,
 * fired only on genuine mastery. Docked Vidya celebrates, then settles.
 */

import { useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { Topic } from '../../data/model';
import { useProgress } from '../../store/progress';
import { useSdk } from '../../store/sdk';
import { TopicSigil } from '../../ui/art';
import { hueForTopic } from '../../ui/hues';
import { useVidyaChat } from '../../vidya/chat';
import type { BarState } from './shared';
import { CardBody, GOLD, lead, rgba, whisper } from './shared';

/** Floating sparks — a handful of hue and gold motes rising once, then gone. */
function Sparks({ hue }: { hue: string }) {
  const sparks = [
    { id: 's1', left: '12%', top: '78%', s: 5, d: 0.4 },
    { id: 's2', left: '26%', top: '88%', s: 3, d: 0.9 },
    { id: 's3', left: '44%', top: '92%', s: 4, d: 0.6 },
    { id: 's4', left: '62%', top: '86%', s: 6, d: 0.3 },
    { id: 's5', left: '78%', top: '90%', s: 3, d: 1.1 },
    { id: 's6', left: '88%', top: '80%', s: 4, d: 0.7 },
    { id: 's7', left: '34%', top: '84%', s: 3, d: 1.4 },
    { id: 's8', left: '70%', top: '94%', s: 4, d: 1.2 },
  ];
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {sparks.map((sp, i) => (
        <motion.span
          key={sp.id}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -220 - i * 14, opacity: [0, 0.9, 0] }}
          transition={{ delay: sp.d, duration: 2.6, ease: [0.2, 0, 0.4, 1] }}
          style={{
            position: 'absolute',
            left: sp.left,
            top: sp.top,
            width: sp.s,
            height: sp.s,
            borderRadius: 999,
            background: i % 3 === 0 ? GOLD : hue,
          }}
        />
      ))}
    </div>
  );
}

export function Greeting({
  topic,
  nodeId,
  attemptsTotal,
  enteredAt,
  setBar,
  onContinue,
}: {
  topic: Topic;
  nodeId: string;
  attemptsTotal: number;
  enteredAt: number;
  setBar: (b: BarState | null) => void;
  onContinue: () => void;
}) {
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { completeTopic } = useProgress();
  const { setMood } = useVidyaChat();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    completeTopic(topic.id, topic.xp);
    setMood('celebrate');
    const settle = window.setTimeout(() => setMood('idle'), 1600);

    // the completion event carries the band the evidence actually earned
    void (async () => {
      let finalBand = 'developing';
      try {
        const bands = await sdk.kgtopg.mastery.getBands(sdk.config.mockSubjectId);
        finalBand = bands.find((b) => b.node_id === nodeId)?.band ?? finalBand;
      } catch {
        // seed path — the fallback band is honest for a fresh pass
      }
      sdk.events.record(
        'learn.node.completed.v1',
        {
          node_id: nodeId,
          final_band: finalBand as
            | 'not_started'
            | 'emerging'
            | 'developing'
            | 'secure'
            | 'independent',
          attempts_total: attemptsTotal,
          duration_ms: Math.max(0, Date.now() - enteredAt),
        },
        { ontologyNodeId: nodeId },
      );
    })();

    bus.publishCanvas(undefined);
    return () => window.clearTimeout(settle);
  }, [completeTopic, setMood, sdk, bus, topic, nodeId, attemptsTotal, enteredAt]);

  useEffect(() => {
    setBar({ primary: { label: 'continue', onClick: onContinue } });
  }, [setBar, onContinue]);

  const hue = hueForTopic(topic.id);

  return (
    <CardBody maxWidth={560}>
      {/* the full-screen ignite — one hue wave sweeping the whole viewport, once, sub-second */}
      <motion.div
        aria-hidden
        initial={{ x: '-45%' }}
        animate={{ x: '145%', opacity: [1, 1, 0] }}
        transition={{ duration: 0.9, ease: [0.2, 0, 0.2, 1], delay: 0.25 }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '55vw',
          background: `linear-gradient(100deg, transparent 0%, ${rgba(hue, 0.14)} 42%, ${rgba(hue, 0.26)} 50%, ${rgba(hue, 0.14)} 58%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 8px',
          textAlign: 'center',
        }}
      >
        {/* sparks drift up while the room catches light */}
        <Sparks hue={hue} />

        {/* the sigil, mastered — the same geometry from the row and the door, now lit large */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 230, damping: 24, delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}
        >
          <TopicSigil id={topic.id} size={96} mastered hue={hue} draw />
        </motion.div>

        <div style={whisper}>the greeting</div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55, ease: [0.2, 0, 0, 1] }}
          style={{
            marginTop: 16,
            fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
            fontWeight: 550,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: 'var(--clss-ink-900)',
          }}
        >
          you kept the scale level, every single time.
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{ ...lead, marginTop: 14 }}
        >
          <span style={{ color: hue, fontWeight: 550 }}>{topic.name.toLowerCase()}</span> is yours
          now — not memorised, understood.
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{ marginTop: 18, fontSize: '0.88rem', color: 'var(--clss-ink-500)' }}
        >
          the map just caught light.
        </motion.div>
      </div>
    </CardBody>
  );
}
