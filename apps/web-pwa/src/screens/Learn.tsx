'use client';

/**
 * Learn — the subjects door (DESIGN.md §8). The learner's subjects in a clean tactile grid,
 * custom courses below under a "courses" heading, past courses a whisper. One intention:
 * choose what to understand next.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { chaptersBySubject, subjects } from '../data/catalog';
import type { Subject } from '../data/model';
import { useRouter } from '../shell/router';
import { EmptyConstellation, SubjectGlyph } from '../ui/art';
import { toneForSubject } from '../ui/hues';
import { BackIcon } from '../ui/icons';
import { SectionLabel, TiltCard } from '../ui/kit';

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
      <BackIcon size={15} />
      {children}
    </motion.button>
  );
}

function SubjectCard({ subject, onOpen }: { subject: Subject; onOpen: () => void }) {
  const [lit, setLit] = useState(false);
  const tone = toneForSubject(subject.id);
  const chapterCount = (chaptersBySubject[subject.id] ?? []).length;
  return (
    <TiltCard
      onClick={onOpen}
      ariaLabel={`${subject.name} — open the subject`}
      onLitChange={setLit}
      spotlight={tone.wash}
      style={{
        padding: '26px 24px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 200,
      }}
    >
      <motion.span
        animate={lit ? { scale: 1.06, rotate: -2 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ display: 'block', width: 72, height: 72 }}
      >
        <SubjectGlyph subjectId={subject.id} size={72} accent={lit} />
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
          paddingTop: 8,
          fontSize: '0.78rem',
          fontWeight: 550,
          color: lit ? tone.hue : 'var(--clss-ink-300)',
          transition: 'color 0.3s ease',
        }}
      >
        {chapterCount} chapters →
      </span>
    </TiltCard>
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
        gap: 16,
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

        <SectionLabel style={{ marginTop: 72, marginBottom: 18 }}>courses</SectionLabel>
        <motion.button
          ref={coursesRef}
          type="button"
          onClick={() => router.navigate({ name: 'home' })}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          style={{
            width: '100%',
            background: 'transparent',
            border: '0.5px solid var(--clss-hairline-on-paper)',
            borderRadius: 'var(--clss-radius-sm)',
            padding: '30px 22px 26px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* an empty shelf is a promise, not a void */}
          <EmptyConstellation size={110} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
              ask Vidya for a course on anything
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--clss-ink-300)' }}>
              your custom courses will live here
            </span>
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
