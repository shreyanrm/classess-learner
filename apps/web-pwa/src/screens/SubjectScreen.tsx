'use client';

/**
 * A subject — second cut. The header is a poster band: the subject glyph XL floating on its
 * hue-washed stage with the layered scene behind it, title overlaid. Chapter rows carry their
 * own sigil stage thumbnails; expanded topics slide in with stagger. Prerequisite gates are
 * suggestions with a proceed-anyway door — advice, never a wall (CONTEXT.md §8). Pigment
 * appears only where mastery is real: ignited sigils and the earned stretch of each filament.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  chaptersBySubject,
  displaySubjectById,
  learner,
  subjectById,
  unmetPrereqs,
} from '../data/catalog';
import type { Chapter, Topic } from '../data/model';
import { useRouter } from '../shell/router';
import { useViewport } from '../shell/useViewport';
import { useProgress } from '../store/progress';
import { ChapterFiligree, SubjectGlyph, TopicSigil } from '../ui/art';
import { hueForTopic, type SubjectTone, toneForSubject } from '../ui/hues';
import { ChevronIcon } from '../ui/icons';
import { cascade, MagneticButton, rise } from '../ui/kit';
import { SubjectSceneBackdrop, Whisper } from './Learn';

const EXPAND_SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

type Intent = 'learn' | 'practice';

/** A topic opens as a course; with practice intent it opens as a sandbox on that topic. */
function topicRoute(topicId: string, intent: Intent) {
  return intent === 'practice'
    ? ({ name: 'sandbox', topicId } as const)
    : ({ name: 'course', topicId } as const);
}

function TopicRow({ topic, intent, tone }: { topic: Topic; intent: Intent; tone: SubjectTone }) {
  const router = useRouter();
  const { completed, topicProgress } = useProgress();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const p = completed.has(topic.id) ? 1 : (topicProgress[topic.id] ?? 0);
  const fillTint = p >= 0.7 ? 'var(--clss-feedback-correctSoft)' : 'rgba(178,106,0,0.12)';

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
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        whileHover={{ x: 3, y: -1 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        style={{
          width: '100%',
          textAlign: 'left',
          background:
            p > 0
              ? `linear-gradient(90deg, ${fillTint} ${p * 100}%, transparent ${p * 100}%)`
              : hover
                ? 'var(--clss-ink-100)'
                : 'transparent',
          border: hover
            ? '0.5px solid var(--clss-ink-300)'
            : '0.5px solid var(--clss-hairline-on-paper)',
          borderRadius: 3,
          padding: '12px 12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* the concept's own geometry on its own small stage — ignited once mastered */}
        <span
          style={{
            flexShrink: 0,
            width: 48,
            height: 48,
            borderRadius: 3,
            background: tone.wash,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <TopicSigil id={topic.id} size={36} mastered={mastered} hue={hueForTopic(topic.id)} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '0.98rem', fontWeight: 550, color: 'var(--clss-ink-900)' }}>
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
              // the earned tick takes the owning subject's hue
              color: hueForTopic(topic.id),
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              role="presentation"
              aria-hidden
              style={{ display: 'block' }}
            >
              <path
                d="M2 6.4 L4.6 9 L10 3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            mastered
          </span>
        ) : gated ? (
          <span
            style={{
              flexShrink: 0,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 3,
              padding: '4px 10px',
              fontSize: '0.75rem',
              color: 'var(--clss-ink-500)',
              whiteSpace: 'nowrap',
            }}
          >
            builds on {unmet[0]?.name}
          </span>
        ) : (
          <span style={{ flexShrink: 0, color: 'var(--clss-ink-300)' }}>
            <ChevronIcon size={14} />
          </span>
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
                borderRadius: 3,
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
 * still shows a 4% thread of ink; the earned portion turns the subject's hue only when real.
 */
function Filament({ done, total, hue }: { done: number; total: number; hue: string }) {
  const pct = Math.max(4, total > 0 ? (done / total) * 100 : 0);
  return (
    <div style={{ height: 2, background: 'var(--clss-hairline-on-paper)', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 26 }}
        style={{
          height: '100%',
          // the earned stretch carries the subject's hue; the endowed thread stays ink
          background: done > 0 ? hue : 'var(--clss-ink-100)',
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
  const tone = toneForSubject(chapter.subjectId);
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
          padding: '16px 4px 14px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* the chapter's sigil on its own stage thumbnail — ignited when every topic is done */}
        <span
          style={{
            position: 'relative',
            flexShrink: 0,
            width: 56,
            height: 56,
            borderRadius: 3,
            background: tone.wash,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <TopicSigil
            id={chapter.id}
            size={40}
            mastered={total > 0 && done === total}
            hue={tone.hue}
          />
          <span
            style={{
              position: 'absolute',
              right: 5,
              bottom: 3,
              fontSize: '0.6rem',
              fontWeight: 700,
              color: tone.hue,
              fontVariantNumeric: 'tabular-nums',
              opacity: 0.85,
            }}
          >
            {String(chapter.index).padStart(2, '0')}
          </span>
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          <span style={{ fontSize: '1.05rem', fontWeight: 550, color: 'var(--clss-ink-900)' }}>
            {chapter.name}
          </span>
          {/* the chapter's own filigree — generative, derived from its id */}
          <ChapterFiligree id={chapter.id} width={104} height={8} />
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
          style={{ color: 'var(--clss-ink-300)', flexShrink: 0 }}
        >
          <ChevronIcon size={14} />
        </motion.span>
      </button>

      <div style={{ margin: '0 4px' }}>
        <Filament done={done} total={total} hue={tone.hue} />
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
            {/* topics slide in with stagger — each rises as the chapter unfolds */}
            <motion.div
              variants={cascade}
              initial="hidden"
              animate="show"
              style={{
                padding: '12px 0 16px 74px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {total === 0 ? (
                <>
                  <motion.div
                    variants={rise}
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--clss-ink-500)',
                      lineHeight: 1.55,
                      padding: '4px 4px 2px',
                    }}
                  >
                    Vidya composes this chapter's course when you open it
                  </motion.div>
                  <motion.button
                    variants={rise}
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
                    <span style={{ color: 'var(--clss-ink-300)' }}>
                      <ChevronIcon size={14} />
                    </span>
                  </motion.button>
                </>
              ) : (
                chapter.topics.map((topic) => (
                  <motion.div key={topic.id} variants={rise}>
                    <TopicRow topic={topic} intent={intent} tone={tone} />
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubjectScreen({ subjectId, intent }: { subjectId: string; intent: Intent }) {
  const router = useRouter();
  const { publishPage } = useVidyaBus();
  const { isDesktop } = useViewport();
  // the door may be a clubbed display group (CBSE "Science" = physics + chemistry + biology);
  // chapters keep canonical subjectIds underneath, so each section carries its own hue and glyph
  const group = displaySubjectById(subjectId);
  const tone = toneForSubject(subjectId);
  const sections = (group?.subjectIds ?? [subjectId]).map((id) => ({
    subject: subjectById(id),
    tone: toneForSubject(id),
    chapters: chaptersBySubject[id] ?? [],
  }));
  const clubbed = sections.length > 1;
  const chapterTotal = sections.reduce((n, s) => n + s.chapters.length, 0);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const listRef = useRegisterTarget<HTMLDivElement>('subject-chapters', {
    kind: 'list',
    label: `the ${group?.name ?? subjectId} chapter list — a tap expands a chapter into its topics`,
  });

  useEffect(() => {
    publishPage({
      route: 'subject',
      state: { subjectId, subject: group?.name, intent, openChapter },
    });
  }, [publishPage, subjectId, group?.name, intent, openChapter]);

  return (
    <motion.div
      variants={cascade}
      initial="hidden"
      animate="show"
      style={{ minHeight: '100dvh', padding: '108px 6vw 96px' }}
    >
      <Whisper onClick={() => router.back()}>◦ {intent}</Whisper>

      {/* the poster band — the subject's stage, its scene behind, the glyph XL afloat */}
      <motion.div
        variants={rise}
        style={{
          position: 'relative',
          minHeight: isDesktop ? 300 : 260,
          borderRadius: 3,
          background: tone.wash,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <SubjectSceneBackdrop subjectId={subjectId} wide={isDesktop} />
        <div
          style={{
            position: 'absolute',
            right: isDesktop ? '8%' : 16,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <motion.div
            animate={{ y: [0, -9, 0], rotate: [0, -2, 0] }}
            transition={{ duration: 6.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <SubjectGlyph subjectId={subjectId} size={isDesktop ? 184 : 116} accent />
          </motion.div>
        </div>
        <div
          style={{
            position: 'relative',
            padding: isDesktop ? '30px 36px' : '22px 22px',
            maxWidth: isDesktop ? '58%' : '64%',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isDesktop ? '2rem' : '1.55rem',
              fontWeight: 650,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
              color: 'var(--clss-ink-900)',
            }}
          >
            {group?.name ?? subjectId}
          </h1>
          <div style={{ marginTop: 7, fontSize: '0.92rem', color: 'var(--clss-ink-500)' }}>
            {group?.line}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '5px 11px',
                borderRadius: 3,
                background: '#FFFFFF',
                border: '0.5px solid var(--clss-hairline-on-paper)',
                fontSize: '0.75rem',
                fontWeight: 550,
                color: 'var(--clss-ink-500)',
              }}
            >
              {learner.board} · {learner.grade}
            </span>
            <span
              style={{
                padding: '5px 11px',
                borderRadius: 3,
                background: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: tone.hue,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {chapterTotal} chapters
            </span>
          </div>
        </div>
      </motion.div>

      <div ref={listRef} style={{ marginTop: 40 }}>
        {sections.map((sec, i) => (
          <div key={sec.subject?.id ?? subjectId}>
            {/* a clubbed door sections its chapters under the canonical disciplines */}
            {clubbed && sec.subject && (
              <motion.div
                variants={rise}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 4px 12px',
                  marginTop: i === 0 ? 0 : 38,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 3,
                    background: sec.tone.wash,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <SubjectGlyph subjectId={sec.subject.id} size={26} />
                </span>
                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 650,
                    letterSpacing: '-0.01em',
                    color: sec.tone.hue,
                  }}
                >
                  {sec.subject.name}
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--clss-ink-300)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {sec.chapters.length} chapters
                </span>
              </motion.div>
            )}
            {sec.chapters.map((ch) => (
              <motion.div key={ch.id} variants={rise}>
                <ChapterRow
                  chapter={ch}
                  intent={intent}
                  open={openChapter === ch.id}
                  onToggle={() => setOpenChapter((o) => (o === ch.id ? null : ch.id))}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
