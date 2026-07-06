'use client';

/**
 * Progress — the unlit page for the mind made visible. The constellation is the hero: it gets the room
 * and the one soft molten aura on the screen. Around it, card chrome gives way to whitespace and thin
 * hairline rules; a selected concept keeps its earned hue. The knowledge twin answers in honest ranges —
 * canned chips for the common questions, a free-text ask through the SDK (graceful fallback in mock
 * mode). Vidya turns 'thinking' while a live question runs, and her hand sits by the twin.
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
import { useReducedMotion } from '@classess/motion';
import type { Sdk } from '@classess/sdk';
import { Button, Input, MasteryBand } from '@classess/ui';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Constellation, ConstellationLegend } from '../components/Constellation';
import {
  carriesColor,
  currentNodeId,
  isLocked,
  type MapNode,
  masteredCount,
  nodeById,
  subject,
  totalCount,
  twinQuestions,
} from '../mock/appData';
import { useRouter } from '../shell/router';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const HUE = accent[subject.accent]; // cobalt — the subject's earned hue

/** A thin rule — the app's structural line, replacing most card borders. */
function Rule() {
  return <div aria-hidden style={{ height: 1, background: hairline.onPaper, width: '100%' }} />;
}

/** A tiny sentence-case section label (never an all-caps eyebrow on every block). */
const labelStyle = { fontSize: typeScale.caption.size, color: ink[500] } as const;

/** One calm answer the twin is currently showing — from a canned chip or a live query. */
interface TwinAnswer {
  question: string;
  answer: string;
  nodeId?: string;
}

/** Honest-ranges fallback when the SDK can't answer in words (always the case in mock mode). */
function twinFallback(): string {
  return `I can read your map, but I'm still learning to put that into words. Here's what stands out: you've made ${masteredCount()} of ${totalCount()} concepts your own, and two-step equations are the one to secure next — you're around 55–70% there.`;
}

export function Progress({ sdk }: { sdk: Sdk }) {
  const bus = useVidyaBus();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<TwinAnswer | null>(null);

  const mapRef = useRegisterTarget<HTMLDivElement>('progress-map', {
    kind: 'region',
    label: 'your learning constellation',
  });
  const askRef = useRegisterTarget<HTMLDivElement>('progress-twin-ask', {
    kind: 'control',
    label: 'ask your knowledge twin',
  });

  useEffect(() => {
    bus.publishPage({ route: 'progress', state: { selected } });
  }, [bus, selected]);

  const node = selected ? nodeById(selected) : null;

  const rise = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: EASE_OUT },
        };

  // A tighter swap for keyed content (node detail, twin answer).
  const reveal = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: EASE_OUT },
      };

  function onSelect(id: string) {
    setSelected(id);
    const n = nodeById(id);
    if (n) {
      bus.publishCurriculum({
        nodeId: n.id,
        nodeName: n.name,
        band: n.band,
        prerequisiteIds: n.prereqIds,
      });
    }
  }

  async function ask() {
    const question = draft.trim();
    if (!question || asking) return;
    setAsking(true);
    bus.dispatch([{ type: 'setMood', mood: 'thinking' }]);
    try {
      const res = await sdk.llm.invoke('twin.query', { question }, { consentTier: 'un_elevated' });
      const message = (res.output as { message?: string } | null)?.message;
      setAnswer({ question, answer: message ?? twinFallback() });
    } catch {
      setAnswer({ question, answer: twinFallback() });
    } finally {
      setAsking(false);
      setDraft('');
      bus.dispatch([{ type: 'setMood', mood: 'idle' }]);
    }
  }

  const learnNode = answer?.nodeId ? nodeById(answer.nodeId) : undefined;

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
      {/* Masthead — one deliberate tracked label, then a confident display title. */}
      <motion.header
        {...rise(0)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
      >
        <span
          style={{ fontSize: typeScale.caption.size, letterSpacing: '0.14em', color: ink[500] }}
        >
          {subject.name.toUpperCase()}
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
          Your learning map
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: typeScale.bodyLg.size,
            lineHeight: typeScale.bodyLg.lineHeight,
            color: ink[700],
            maxWidth: '46ch',
          }}
        >
          {masteredCount()} of {totalCount()} concepts have earned their colour — the lit ones are
          yours.
        </p>
      </motion.header>

      {/* Hero: the constellation, given room and the screen's one soft molten aura (light, not a box). */}
      <motion.section {...rise(1)} style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            width: 540,
            height: 380,
            maxWidth: '100%',
            background: `radial-gradient(closest-side, ${molten.soft}, transparent 70%)`,
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
        <div
          ref={mapRef}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: space[2],
          }}
        >
          <span style={labelStyle}>Your mind, lighting up</span>
          <Constellation
            variant="full"
            selectedId={selected}
            onSelect={onSelect}
            currentId={currentNodeId}
          />
          <ConstellationLegend />
        </div>
      </motion.section>

      <Rule />

      {/* Node detail — where a concept stands, as an editorial block, not a boxed card. */}
      {node ? (
        <motion.section
          key={node.id}
          {...reveal}
          style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: space[3],
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: typeScale.h2.size,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: carriesColor(node.band) ? HUE : ink[900],
              }}
            >
              {node.name}
            </h2>
            <MasteryBand band={node.band} accent={HUE} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: typeScale.body.size,
              color: ink[700],
              lineHeight: 1.55,
              maxWidth: '52ch',
            }}
          >
            {node.blurb}
          </p>
          <div>
            {isLocked(node) ? (
              <LockedNote node={node} />
            ) : (
              <Button
                variant="primary"
                onClick={() => router.navigate({ name: 'learn', nodeId: node.id })}
              >
                Learn this
              </Button>
            )}
          </div>
        </motion.section>
      ) : (
        <p style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}>
          Tap a concept to see where it stands.
        </p>
      )}

      <Rule />

      {/* The knowledge twin — type-led, with Vidya's hand and the answer read as prose, not a card. */}
      <motion.section
        {...rise(2)}
        style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          <h2
            style={{
              margin: 0,
              fontSize: typeScale.h2.size,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: ink[900],
            }}
          >
            Ask your knowledge twin
          </h2>
          <span
            style={{
              fontFamily: fontFamily.handwritten,
              fontSize: '1.35rem',
              lineHeight: 1.2,
              color: molten.base,
              transform: 'rotate(-1.5deg)',
              transformOrigin: 'left',
              maxWidth: '34ch',
            }}
          >
            it knows your map — ask honestly, and you'll get honest ranges back
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[1] }}>
          {twinQuestions.map((qa) => {
            const active = answer?.question === qa.q;
            return (
              <Button
                key={qa.q}
                variant="ghost"
                size="sm"
                aria-pressed={active}
                onClick={() => setAnswer({ question: qa.q, answer: qa.a, nodeId: qa.nodeId })}
                style={{
                  border: `1px solid ${active ? molten.base : hairline.onPaper}`,
                  borderRadius: radius.jelly,
                  color: active ? molten.base : ink[700],
                }}
              >
                {qa.q}
              </Button>
            );
          })}
        </div>

        <div ref={askRef} style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          <Input
            label="Ask about your learning"
            placeholder="e.g. Which concept is holding me back?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void ask();
              }
            }}
          />
          <div style={{ alignSelf: 'flex-start' }}>
            <Button
              variant="primary"
              loading={asking}
              disabled={!draft.trim()}
              onClick={() => void ask()}
            >
              Ask
            </Button>
          </div>
        </div>

        {answer && (
          <motion.div
            key={answer.question}
            {...reveal}
            style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}
          >
            <span style={labelStyle}>You asked</span>
            <p
              style={{
                margin: 0,
                fontSize: typeScale.body.size,
                fontWeight: 600,
                color: ink[900],
              }}
            >
              {answer.question}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typeScale.bodyLg.size,
                color: ink[700],
                lineHeight: 1.6,
                maxWidth: '52ch',
              }}
            >
              {answer.answer}
            </p>
            {learnNode && (
              <div style={{ marginTop: space[1] }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.navigate({ name: 'learn', nodeId: learnNode.id })}
                >
                  Learn this next
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </motion.section>
    </main>
  );
}

/** Why a concept is still dark — named honestly, so the way in is never a mystery. */
function LockedNote({ node }: { node: MapNode }) {
  const blockers = node.prereqIds
    .map((pid) => nodeById(pid))
    .filter((p): p is MapNode => !!p && !carriesColor(p.band))
    .map((p) => p.name);
  return (
    <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[700], lineHeight: 1.5 }}>
      Locked for now.{' '}
      {blockers.length > 0
        ? `Opens once you secure ${blockers.join(' and ')}.`
        : 'Secure its earlier concepts first.'}
    </p>
  );
}
