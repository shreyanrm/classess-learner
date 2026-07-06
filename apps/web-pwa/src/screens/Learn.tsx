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
import { SubjectGlyph } from '../ui/art';
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
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Back — ${String(children)}`}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      style={{
        position: 'fixed',
        top: 74,
        left: 24,
        zIndex: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 15px 8px 11px',
        background: 'var(--clss-paper)',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 999,
        color: 'var(--clss-ink-700)',
        fontFamily: 'inherit',
        fontSize: '0.85rem',
        fontWeight: 500,
        cursor: 'pointer',
        ...style,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden style={{ display: 'block' }}>
        <path
          d="M9.5 3 L4.5 8 L9.5 13 M4.8 8 L13 8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </motion.button>
  );
}

export const SUBJECT_HUES: Record<string, { hue: string; wash: string }> = {
  math: { hue: '#1F35E0', wash: 'rgba(31,53,224,0.06)' },
  science: { hue: '#0FA3B1', wash: 'rgba(15,163,177,0.07)' },
  social: { hue: '#B26A00', wash: 'rgba(178,106,0,0.07)' },
};

function SubjectCard({ subject, onOpen }: { subject: Subject; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const tone = SUBJECT_HUES[subject.id] ?? SUBJECT_HUES.math;
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
        background: hover
          ? `linear-gradient(150deg, ${tone?.wash} 0%, var(--clss-paper) 62%)`
          : 'var(--clss-paper)',
        border: `0.5px solid ${hover ? (tone?.hue ?? 'var(--clss-ink-300)') : 'var(--clss-hairline-on-paper-strong)'}`,
        transition: 'border-color 0.3s ease, background 0.3s ease',
        borderRadius: 'var(--clss-radius-md)',
        padding: '24px 22px 20px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 190,
      }}
    >
      <motion.span
        animate={hover ? { scale: 1.06, rotate: -2 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ display: 'block', width: 72, height: 72 }}
      >
        <SubjectGlyph subjectId={subject.id} size={72} accent={hover} />
      </motion.span>
      <span style={{ fontSize: '1.05rem', fontWeight: 550, color: 'var(--clss-ink-900)' }}>
        {subject.name}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}>
        {subject.line}
      </span>
      <span
        style={{
          marginTop: 'auto',
          fontSize: '0.78rem',
          fontWeight: 550,
          color: hover ? (tone?.hue ?? 'var(--clss-ink-500)') : 'var(--clss-ink-300)',
          transition: 'color 0.3s ease',
        }}
      >
        13 chapters →
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
          Learn
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
