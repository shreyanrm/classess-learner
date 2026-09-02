'use client';

/**
 * Practice, reorganized (DESIGN.md §8, Fable's forge). One intention: sharpen what you already
 * hold. The page reads top-down as a workshop — what's fading first (FSRS due), the bosses you can
 * re-challenge, the sandboxes keyed to your own chapters, and then the forge, where you bind your
 * own workbook from what you've touched and keep it on a shelf. Wobo watches at code level
 * throughout; the copy never guilts, memory fades on a real curve.
 */

import { useWoboBus } from '@classess/wobo';
import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import { chaptersBySubject, subjects, topicById } from '../data/catalog';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { hueForTopic } from '../ui/hues';
import { ChevronIcon } from '../ui/icons';
import { AmbientWash, cascade, rise } from '../ui/kit';
import { rgba } from './course/shared';
import { Whisper } from './Learn';
import { ForgeBuilder } from './practice/ForgeBuilder';
import { ForgeRun } from './practice/ForgeRun';
import { bestScore, type ForgedWorkbook, removeForge, useForged } from './practice/forge-store';
import { MIX_LABEL, SIZE_LABEL } from './practice/pools';

const PRACTICE_WASH =
  'radial-gradient(64% 40% at 50% -6%, var(--clss-ultramarine-soft) 0%, transparent 68%),' +
  ' radial-gradient(48% 26% at 50% 30%, rgba(255,201,60,0.045) 0%, transparent 72%)';

function SectionHead({ title, line }: { title: string; line?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: '1.15rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--clss-ink-900)',
        }}
      >
        {title}
      </div>
      {line && (
        <div style={{ marginTop: 3, fontSize: '0.88rem', color: 'var(--clss-ink-500)' }}>
          {line}
        </div>
      )}
    </div>
  );
}

/** A horizontal rail — bosses and sandboxes scroll sideways, one intention each. */
function Rail({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 6,
        scrollbarWidth: 'thin',
      }}
    >
      {children}
    </div>
  );
}

function RailCard({
  eyebrow,
  title,
  hue,
  onClick,
}: {
  eyebrow: string;
  title: string;
  hue: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      style={{
        flex: '0 0 auto',
        width: 190,
        textAlign: 'left',
        padding: '16px 16px 18px',
        borderRadius: 3,
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: 'var(--clss-card)',
        border: '0.5px solid var(--clss-card-border)',
        borderTop: `3px solid ${hue}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 108,
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: hue,
          fontWeight: 600,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: '0.98rem',
          fontWeight: 560,
          color: 'var(--clss-ink-900)',
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
    </motion.button>
  );
}

// --- The forged-workbook shelf --------------------------------------------------------------------

function ShelfCard({ w, onRun }: { w: ForgedWorkbook; onRun: () => void }) {
  const hue = hueForTopic(w.picks[0] ?? '');
  const best = bestScore(w);
  const building = w.status === 'building';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        border: '0.5px solid var(--clss-card-border)',
        borderLeft: `3px solid ${hue}`,
        borderRadius: 3,
        background: 'var(--clss-card)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--clss-ink-900)' }}>
            {w.title.toLowerCase()}
          </div>
          <div style={{ marginTop: 3, fontSize: '0.82rem', color: 'var(--clss-ink-500)' }}>
            {w.total || w.size} items · {SIZE_LABEL[w.size]} · {MIX_LABEL[w.mix]}
          </div>
        </div>
        {best && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 650,
                color: best.correct / best.total >= 0.8 ? 'var(--clss-feedback-correct)' : hue,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {best.correct}/{best.total}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clss-ink-300)' }}>best</div>
          </div>
        )}
      </div>

      {w.attempts.length > 1 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 22 }}>
          {w.attempts.slice(-8).map((a, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: attempt bars are positional history
              key={i}
              title={`${a.correct}/${a.total}`}
              style={{
                width: 6,
                height: `${Math.max(0.12, a.correct / a.total) * 22}px`,
                background: rgba(hue, 0.5),
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <motion.button
          type="button"
          disabled={building}
          onClick={onRun}
          whileTap={building ? undefined : { scale: 0.98 }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 3,
            border: 'none',
            cursor: building ? 'default' : 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: building ? 'var(--clss-ink-500)' : 'var(--clss-on-ink)',
            background: building ? 'var(--clss-tonal)' : 'var(--clss-ultramarine)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {building ? (
            <>
              <motion.span
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  border: '2px solid var(--clss-ink-300)',
                  borderTopColor: 'transparent',
                }}
              />
              binding…
            </>
          ) : (
            <>
              {w.attempts.length > 0 ? 'forge it again' : 'attempt'}
              <ChevronIcon size={13} />
            </>
          )}
        </motion.button>
        {!building && (
          <button
            type="button"
            onClick={() => removeForge(w.id)}
            aria-label="remove this workbook"
            style={{
              padding: '9px 12px',
              borderRadius: 3,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              color: 'var(--clss-ink-500)',
            }}
          >
            remove
          </button>
        )}
      </div>
    </motion.div>
  );
}

// --- The screen -----------------------------------------------------------------------------------

export function Practice() {
  const router = useRouter();
  const { publishPage } = useWoboBus();
  const { completed } = useProgress();
  const forged = useForged();
  const [view, setView] = useState<'home' | 'builder'>('home');
  const [runId, setRunId] = useState<string | null>(null);

  // due: only what's genuinely been learned can fade (honest FSRS framing)
  const completedList = [...completed];
  const due = completedList.length > 0 ? Math.min(completedList.length, 3) : 0;
  const reviewTopicId = completedList[0];

  // the learner's own chapters — a sandbox door per chapter they've stepped into their subjects
  const sandboxChapters = subjects.flatMap((s) =>
    (chaptersBySubject[s.id] ?? []).slice(0, 3).map((c) => ({
      subject: s.name,
      chapter: c.name,
      topicId: c.topics[0]?.id ?? '',
    })),
  );

  useEffect(() => {
    publishPage({
      route: 'practice',
      state: { title: 'practice', intent: 'practice', due, forged: forged.length },
    });
  }, [publishPage, due, forged.length]);

  if (runId) {
    return <ForgeRun id={runId} onExit={() => setRunId(null)} />;
  }

  return (
    <motion.div
      variants={cascade}
      initial="hidden"
      animate="show"
      style={{
        minHeight: '100dvh',
        padding: '108px 6vw 96px',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <AmbientWash gradient={PRACTICE_WASH} />
      <Whisper
        onClick={() => (view === 'builder' ? setView('home') : router.navigate({ name: 'home' }))}
      >
        {view === 'builder' ? 'Practice' : 'Home'}
      </Whisper>

      <motion.div variants={rise}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.9rem',
            fontWeight: 650,
            letterSpacing: '-0.035em',
            color: 'var(--clss-ink-900)',
          }}
        >
          {view === 'builder' ? 'The forge' : 'Practice'}
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          {view === 'builder'
            ? "bind your own workbook from what you've already touched"
            : 'sharpen what you hold — memory fades on a real curve'}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'builder' ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
            style={{ marginTop: 40 }}
          >
            <ForgeBuilder onForged={() => setView('home')} />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 52 }}
          >
            {/* 1 — due for review, up top */}
            <motion.section variants={rise}>
              <SectionHead
                title="Due for review"
                line={
                  due === 0
                    ? 'nothing is fading yet — learn something first'
                    : due === 1
                      ? 'one concept is starting to fade'
                      : `${due} concepts are starting to fade`
                }
              />
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                onClick={() =>
                  due > 0
                    ? router.navigate({ name: 'sandbox', topicId: reviewTopicId })
                    : router.navigate({ name: 'learn' })
                }
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '18px 20px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'var(--clss-card)',
                  border: '0.5px solid var(--clss-card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                <span style={{ fontSize: '1rem', color: 'var(--clss-ink-900)', fontWeight: 520 }}>
                  {due > 0 ? 'refresh them before they slip' : 'go learn something to review later'}
                </span>
                <span style={{ color: 'var(--clss-ink-300)', display: 'inline-flex' }}>
                  <ChevronIcon size={15} />
                </span>
              </motion.button>
            </motion.section>

            {/* 2 — boss workbooks you can re-challenge */}
            {completedList.length > 0 && (
              <motion.section variants={rise}>
                <SectionHead
                  title="Boss workbooks"
                  line="the bosses you've beaten — re-run any to prove it still holds"
                />
                <Rail>
                  {completedList.map((id) => {
                    const topic = topicById(id);
                    return (
                      <RailCard
                        key={id}
                        eyebrow="re-challenge"
                        title={topic?.name ?? 'a topic you mastered'}
                        hue={hueForTopic(id)}
                        onClick={() => router.navigate({ name: 'course', topicId: id })}
                      />
                    );
                  })}
                </Rail>
              </motion.section>
            )}

            {/* 3 — sandboxes keyed to your chapters */}
            <motion.section variants={rise}>
              <SectionHead
                title="Sandboxes"
                line="an open canvas on your own chapters — no task, Wobo watching"
              />
              <Rail>
                {sandboxChapters.map((s) => (
                  <RailCard
                    key={`${s.subject}-${s.chapter}`}
                    eyebrow={s.subject.toLowerCase()}
                    title={s.chapter}
                    hue={hueForTopic(s.topicId)}
                    onClick={() => router.navigate({ name: 'sandbox', topicId: s.topicId })}
                  />
                ))}
              </Rail>
            </motion.section>

            {/* 4 — forge your own */}
            <motion.section variants={rise}>
              <SectionHead
                title="Forge your own"
                line="bind a custom workbook from the chapters you've touched"
              />
              <motion.button
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                onClick={() => setView('builder')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '22px 24px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--clss-on-ink)',
                  background: 'linear-gradient(120deg, var(--clss-ultramarine) 0%, #3A4EF0 100%)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
                    Open the forge
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: '0.88rem',
                      opacity: 0.85,
                      lineHeight: 1.5,
                    }}
                  >
                    pick your pages, choose the size and balance, and bind them into a book of your
                    own
                  </span>
                </span>
                <span style={{ opacity: 0.9, display: 'inline-flex', flexShrink: 0 }}>
                  <ChevronIcon size={16} />
                </span>
              </motion.button>

              {/* the shelf — forged workbooks persist here, re-attemptable */}
              {forged.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ ...{ fontSize: '0.82rem', color: 'var(--clss-ink-500)' } }}>
                    your shelf
                  </div>
                  <AnimatePresence initial={false}>
                    {forged.map((w) => (
                      <ShelfCard key={w.id} w={w} onRun={() => setRunId(w.id)} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
