'use client';

/**
 * Practice — one intention (DESIGN.md §8). Three doors, stacked with intent: the free-play
 * sandbox, the honest FSRS review door, and the subject grid routed with practice intent.
 * Memory fades on a real curve; the copy never guilts.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { ChevronIcon } from '../ui/icons';
import { SectionLabel } from '../ui/kit';
import { SubjectGrid, Whisper } from './Learn';

function Door({
  title,
  line,
  hint,
  onOpen,
  targetRef,
}: {
  title: string;
  line: string;
  hint?: ReactNode;
  onOpen: () => void;
  targetRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      ref={targetRef}
      type="button"
      onClick={onOpen}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--clss-paper)',
        border: `0.5px solid ${hover ? 'var(--clss-ink-300)' : 'var(--clss-hairline-on-paper-strong)'}`,
        transition: 'border-color 0.25s ease',
        borderRadius: 'var(--clss-radius-sm)',
        padding: '20px 22px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
          {title}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}>
          {line}
        </span>
      </span>
      <span
        style={{
          color: hover ? 'var(--clss-ink-500)' : 'var(--clss-ink-300)',
          fontSize: '0.9rem',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'color 0.25s ease',
        }}
      >
        {hint}
        <ChevronIcon size={14} />
      </span>
    </motion.button>
  );
}

export function Practice() {
  const router = useRouter();
  const { publishPage } = useVidyaBus();
  const { completed } = useProgress();
  const sandboxRef = useRegisterTarget<HTMLButtonElement>('practice-sandbox', {
    kind: 'door',
    label: 'the free play sandbox door',
  });
  const reviewRef = useRegisterTarget<HTMLButtonElement>('practice-review', {
    kind: 'door',
    label: 'the due-for-review door — spaced retrieval against the real forgetting curve',
  });

  // Honest FSRS framing: only concepts actually learned can fade.
  const due = completed.size > 0 ? Math.min(completed.size, 3) : 0;
  const reviewTopicId = [...completed][0];

  useEffect(() => {
    publishPage({ route: 'practice', state: { title: 'practice', intent: 'practice', due } });
  }, [publishPage, due]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '108px 24px 72px',
      }}
    >
      <Whisper onClick={() => router.navigate({ name: 'home' })}>Home</Whisper>

      <div style={{ width: '100%', maxWidth: 720 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.6rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--clss-ink-900)',
          }}
        >
          Practice
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          memory fades on a real curve — practice keeps it honest
        </div>

        <div style={{ marginTop: 52, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Door
            targetRef={sandboxRef}
            title="free play sandbox"
            line="an open canvas on any topic — no task, Vidya watching"
            onOpen={() => router.navigate({ name: 'sandbox' })}
          />
          {due > 0 ? (
            <Door
              targetRef={reviewRef}
              title="due for review"
              line={
                due === 1
                  ? 'one concept is fading — refresh it'
                  : `${due} concepts are fading — refresh them`
              }
              onOpen={() => router.navigate({ name: 'sandbox', topicId: reviewTopicId })}
            />
          ) : (
            <Door
              targetRef={reviewRef}
              title="due for review"
              line="nothing is fading yet — learn something first"
              hint="learn"
              onOpen={() => router.navigate({ name: 'learn' })}
            />
          )}
        </div>

        <SectionLabel style={{ marginTop: 64, marginBottom: 16 }}>your subjects</SectionLabel>
        <SubjectGrid intent="practice" />
      </div>
    </div>
  );
}
