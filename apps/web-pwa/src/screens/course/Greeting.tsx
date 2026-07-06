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
import { CardBody, lead, whisper } from './shared';

/** `rgba()` from a hex hue — the ignite sweep needs translucent stops of the subject's hue. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
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
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 8px',
          textAlign: 'center',
        }}
      >
        {/* the ignite — one region catching light, once, under a second, in the subject's hue */}
        <motion.div
          aria-hidden
          initial={{ x: '-130%' }}
          animate={{ x: '260%' }}
          transition={{ duration: 0.75, ease: [0.2, 0, 0.2, 1], delay: 0.25 }}
          style={{
            position: 'absolute',
            top: '-30%',
            bottom: '-30%',
            left: 0,
            width: '42%',
            background: `linear-gradient(100deg, transparent 0%, ${rgba(hue, 0.16)} 45%, ${rgba(hue, 0.24)} 50%, ${rgba(hue, 0.16)} 55%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* the sigil, mastered — the same geometry from the row and the door, now lit */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <TopicSigil id={topic.id} size={68} mastered hue={hue} draw />
        </div>

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
          <span style={{ color: hue, fontWeight: 550 }}>{topic.name.toLowerCase()}</span>{' '}
          is yours now — not memorised, understood.
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
