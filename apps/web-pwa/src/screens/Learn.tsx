'use client';

/**
 * Learn — the subjects door (DESIGN.md §8). The learner's subjects in a clean tactile grid,
 * custom courses below under a "courses" heading, past courses a whisper. One intention:
 * choose what to understand next.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { subjects } from '../data/catalog';
import type { Subject } from '../data/model';
import { useRouter } from '../shell/router';
import { SectionLabel } from '../ui/kit';

/** A whisper-quiet fixed affordance, top left — the register of home's "◦ you". */
export function Whisper({
  children,
  onClick,
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 20,
        left: 24,
        zIndex: 10,
        border: 'none',
        background: 'transparent',
        color: 'var(--clss-ink-500)',
        fontSize: '0.85rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: 4,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SubjectCard({ subject, onOpen }: { subject: Subject; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      style={{
        textAlign: 'left',
        background: 'var(--clss-paper)',
        border: `0.5px solid ${hover ? 'var(--clss-ink-300)' : 'var(--clss-hairline-on-paper-strong)'}`,
        transition: 'border-color 0.25s ease',
        borderRadius: 'var(--clss-radius-sm)',
        padding: '26px 22px 22px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 132,
      }}
    >
      <span style={{ fontSize: '1.02rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
        {subject.name}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}>
        {subject.line}
      </span>
    </motion.button>
  );
}

/** The tactile subject grid — shared by learn and practice, differing only in intent. */
export function SubjectGrid({ intent }: { intent: 'learn' | 'practice' }) {
  const router = useRouter();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14,
      }}
    >
      {subjects.map((s) => (
        <SubjectCard
          key={s.id}
          subject={s}
          onOpen={() => router.navigate({ name: 'subject', subjectId: s.id, intent })}
        />
      ))}
    </div>
  );
}

export function Learn() {
  const router = useRouter();
  const { publishPage } = useVidyaBus();
  const gridRef = useRegisterTarget<HTMLDivElement>('learn-subjects', {
    kind: 'grid',
    label: 'the subject grid — one tap opens a subject',
  });
  const coursesRef = useRegisterTarget<HTMLButtonElement>('learn-courses', {
    kind: 'door',
    label: 'the custom courses shelf — asking Vidya composes one',
  });

  useEffect(() => {
    publishPage({ route: 'learn', state: { title: 'learn', intent: 'learn' } });
  }, [publishPage]);

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
      <Whisper onClick={() => router.navigate({ name: 'home' })}>◦ home</Whisper>

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
          learn
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          pick a subject — a topic is a course, composed for you
        </div>

        <SectionLabel style={{ marginTop: 52, marginBottom: 16 }}>your subjects</SectionLabel>
        <div ref={gridRef}>
          <SubjectGrid intent="learn" />
        </div>

        <SectionLabel style={{ marginTop: 64, marginBottom: 16 }}>courses</SectionLabel>
        <motion.button
          ref={coursesRef}
          type="button"
          onClick={() => router.navigate({ name: 'home' })}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: '0.5px solid var(--clss-hairline-on-paper)',
            borderRadius: 'var(--clss-radius-sm)',
            padding: '22px 22px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span style={{ fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
            ask Vidya for a course on anything
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--clss-ink-300)' }}>
            your custom courses will live here
          </span>
        </motion.button>

        <button
          type="button"
          onClick={() => router.navigate({ name: 'you' })}
          style={{
            marginTop: 28,
            border: 'none',
            background: 'transparent',
            color: 'var(--clss-ink-300)',
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 4,
          }}
        >
          past courses ›
        </button>
      </div>
    </div>
  );
}
