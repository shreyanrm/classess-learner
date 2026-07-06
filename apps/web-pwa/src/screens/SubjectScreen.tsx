'use client';

/**
 * A subject — chapters as a numbered, quiet vertical list (DESIGN.md §8). One tap expands a
 * chapter into its topics; a topic is a course. Prerequisite gates are suggestions with a
 * proceed-anyway door — advice, never a wall (CONTEXT.md §8). Ultramarine appears only where
 * mastery is real: the tick and the earned stretch of each chapter's progress filament.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { chaptersBySubject, learner, subjectById, unmetPrereqs } from '../data/catalog';
import type { Chapter, Topic } from '../data/model';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { MagneticButton } from '../ui/kit';
import { Whisper } from './Learn';

const EXPAND_SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

type Intent = 'learn' | 'practice';

/** A topic opens as a course; with practice intent it opens as a sandbox on that topic. */
function topicRoute(topicId: string, intent: Intent) {
  return intent === 'practice'
    ? ({ name: 'sandbox', topicId } as const)
    : ({ name: 'course', topicId } as const);
}

function TopicRow({ topic, intent }: { topic: Topic; intent: Intent }) {
  const router = useRouter();
  const { completed } = useProgress();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mastered = completed.has(topic.id);
  const unmet = mastered ? [] : unmetPrereqs(topic, completed);
  const gated = unmet.length > 0;
  const unmetNames = unmet.map((u) => u.name).join(' and ');

  const open = (topicId: string) => router.navigate(topicRoute(topicId, intent));

  return (
    <div>
      <motion.button
        type="button"
        onClick={() => (gated ? setConfirmOpen((o) => !o) : open(topic.id))}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.995 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '13px 4px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
            {topic.name}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}>
            {topic.blurb}
          </span>
        </span>

        {mastered ? (
          <span
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--clss-ultramarine)',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            ✓ mastered
          </span>
        ) : gated ? (
          <span
            style={{
              flexShrink: 0,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: '0.75rem',
              color: 'var(--clss-ink-500)',
              whiteSpace: 'nowrap',
            }}
          >
            builds on {unmet[0]?.name}
          </span>
        ) : (
          <span style={{ flexShrink: 0, color: 'var(--clss-ink-300)', fontSize: '0.9rem' }}>›</span>
        )}
      </motion.button>

      {/* The gate is advice, never a wall — proceed anyway always works. */}
      <AnimatePresence initial={false}>
        {confirmOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_SPRING}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                margin: '2px 4px 12px',
                padding: '14px 16px',
                border: '0.5px solid var(--clss-hairline-on-paper)',
                borderRadius: 'var(--clss-radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '0.88rem', color: 'var(--clss-ink-700)', lineHeight: 1.55 }}>
                this builds on {unmetNames} — take those first, or proceed anyway
              </span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <MagneticButton
                  size="sm"
                  variant="primary"
                  onClick={() => unmet[0] && open(unmet[0].id)}
                >
                  take me there
                </MagneticButton>
                <MagneticButton size="sm" variant="quiet" onClick={() => open(topic.id)}>
                  proceed anyway
                </MagneticButton>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Endowed progress (CONTEXT.md §9): the filament never renders empty — an unstarted chapter
 * still shows a 4% thread of ink; the earned portion turns ultramarine only when it is real.
 */
function Filament({ done, total }: { done: number; total: number }) {
  const pct = Math.max(4, total > 0 ? (done / total) * 100 : 0);
  return (
    <div style={{ height: 2, background: 'var(--clss-hairline-on-paper)', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 26 }}
        style={{
          height: '100%',
          background: done > 0 ? 'var(--clss-ultramarine)' : 'var(--clss-ink-100)',
        }}
      />
    </div>
  );
}

function ChapterRow({
  chapter,
  intent,
  open,
  onToggle,
}: {
  chapter: Chapter;
  intent: Intent;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { completed } = useProgress();
  const total = chapter.topics.length;
  const done = chapter.topics.filter((t) => completed.has(t.id)).length;

  return (
    <div style={{ borderBottom: '0.5px solid var(--clss-hairline-on-paper)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '18px 4px 16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'baseline',
          gap: 18,
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--clss-ink-300)',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            width: 22,
          }}
        >
          {String(chapter.index).padStart(2, '0')}
        </span>
        <span style={{ flex: 1, fontSize: '1rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
          {chapter.name}
        </span>
        {done > 0 && (
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--clss-ink-500)',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {done} of {total}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          style={{ color: 'var(--clss-ink-300)', fontSize: '0.9rem', flexShrink: 0 }}
        >
          ›
        </motion.span>
      </button>

      <div style={{ margin: '0 4px' }}>
        <Filament done={done} total={total} />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_SPRING}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 0 14px 40px' }}>
              {total === 0 ? (
                <>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--clss-ink-500)',
                      lineHeight: 1.55,
                      padding: '4px 4px 2px',
                    }}
                  >
                    Vidya composes this chapter's course when you open it
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => router.navigate(topicRoute(chapter.id, intent))}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '11px 4px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <span
                      style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}
                    >
                      compose
                    </span>
                    <span style={{ color: 'var(--clss-ink-300)', fontSize: '0.9rem' }}>›</span>
                  </motion.button>
                </>
              ) : (
                chapter.topics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} intent={intent} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubjectScreen({ subjectId, intent }: { subjectId: string; intent: Intent }) {
  const router = useRouter();
  const { publishPage } = useVidyaBus();
  const subject = subjectById(subjectId);
  const chapters = chaptersBySubject[subjectId] ?? [];
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const listRef = useRegisterTarget<HTMLDivElement>('subject-chapters', {
    kind: 'list',
    label: `the ${subject?.name ?? subjectId} chapter list — a tap expands a chapter into its topics`,
  });

  useEffect(() => {
    publishPage({
      route: 'subject',
      state: { subjectId, subject: subject?.name, intent, openChapter },
    });
  }, [publishPage, subjectId, subject?.name, intent, openChapter]);

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
      <Whisper onClick={() => router.back()}>◦ {intent}</Whisper>

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
          {subject?.name.toLowerCase() ?? subjectId}
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          {subject?.line}
        </div>
        <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--clss-ink-300)' }}>
          {learner.board} {learner.grade.toLowerCase()} · {chapters.length} chapters
        </div>

        <div ref={listRef} style={{ marginTop: 44 }}>
          {chapters.map((ch) => (
            <ChapterRow
              key={ch.id}
              chapter={ch}
              intent={intent}
              open={openChapter === ch.id}
              onToggle={() => setOpenChapter((o) => (o === ch.id ? null : ch.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
