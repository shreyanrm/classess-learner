'use client';

/**
 * The forged workbook, run. It steps the composed pages through the wave-15 MiniWorkbook engine —
 * every item graded into evidence/mastery/FSRS by the same event the boss uses — sums the score,
 * and logs the attempt to the shelf. Re-attempts earn no XP (owner replay law): the first
 * completion earns a single bonus; every later run holds the store's replay guard open so nothing
 * is granted twice.
 */

import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniWorkbook } from '../../engines/MiniWorkbook';
import { useProgress } from '../../store/progress';
import { hueForTopic } from '../../ui/hues';
import { ChevronIcon } from '../../ui/icons';
import { sfx } from '../../ui/sound';
import {
  ActionBar,
  type BarState,
  CardBody,
  cardTitle,
  rgba,
  Stage,
  whisper,
} from '../course/shared';
import { recordAttempt, useForge } from './forge-store';
import { MIX_LABEL, SIZE_LABEL } from './pools';

export function ForgeRun({ id, onExit }: { id: string; onExit: () => void }) {
  const forge = useForge(id);
  const { award, setReplay } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0); // remount seed so "try again" is a clean slate
  const [bar, setBar] = useState<BarState | null>(null);
  const score = useRef({ correct: 0, total: 0 });
  const recorded = useRef(false);

  // a re-attempt (this workbook was completed before) earns nothing — captured once at mount
  const replay = useRef((forge?.attempts.length ?? 0) > 0).current;
  useEffect(() => {
    setReplay(replay);
    return () => setReplay(false);
  }, [setReplay, replay]);

  const hue = forge ? hueForTopic(forge.picks[0] ?? '') : 'var(--wobo-ultramarine)';
  const pages = useMemo(() => forge?.pages ?? [], [forge]);

  const advance = useCallback(
    (result?: { correct: number; total: number }) => {
      if (result) {
        score.current = {
          correct: score.current.correct + result.correct,
          total: score.current.total + result.total,
        };
      }
      setPage((p) => {
        const next = p + 1;
        if (next >= pages.length) {
          setPhase('done');
          return p;
        }
        return next;
      });
    },
    [pages.length],
  );

  // log the attempt + the earned moment exactly once when the run settles
  useEffect(() => {
    if (phase !== 'done' || recorded.current) return;
    recorded.current = true;
    const { correct, total } = score.current;
    recordAttempt(id, correct, total);
    if (!replay) {
      // a real first-completion reward, once ever for this workbook (guarded by the once key)
      award('bonus', { onceKey: `forge-${id}`, hue });
      sfx.reward();
    } else {
      sfx.chord();
    }
  }, [phase, id, award, hue, replay]);

  // intro + done own their own bar; the run phase's bar is driven by MiniWorkbook
  useEffect(() => {
    if (phase === 'intro') {
      setBar({ primary: { label: 'Begin', onClick: () => setPhase('run') } });
    } else if (phase === 'done') {
      setBar({
        primary: { label: 'Back to practice', onClick: onExit },
        secondary: {
          label: 'Forge it again',
          onClick: () => {
            score.current = { correct: 0, total: 0 };
            recorded.current = false;
            setPage(0);
            setAttempt((a) => a + 1);
            setPhase('run');
          },
        },
      });
    }
  }, [phase, onExit]);

  if (!forge) return null;
  const current = pages[Math.min(page, pages.length - 1)];
  const pct =
    score.current.total > 0 ? Math.round((score.current.correct / score.current.total) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: 'var(--wobo-paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* close — back to the shelf, never a trap */}
      <button
        type="button"
        onClick={onExit}
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          left: 16,
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          color: 'var(--wobo-ink-500)',
        }}
      >
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
          <ChevronIcon size={14} />
        </span>
        Practice
      </button>

      <div style={{ flex: 1, overflowY: 'auto', padding: '72px 6vw 24px' }}>
        {phase === 'intro' && (
          <CardBody maxWidth={560}>
            <div style={whisper}>a forged workbook · {forge.pages.length} pages</div>
            <div style={{ ...cardTitle, marginTop: 8 }}>{forge.title.toLowerCase()}</div>
            <div style={{ marginTop: 6, color: 'var(--wobo-ink-500)', fontSize: '0.95rem' }}>
              {forge.total} items · {SIZE_LABEL[forge.size]} · {MIX_LABEL[forge.mix]}
            </div>
            <Stage hue={hue} tint={0.05} minHeight={0} style={{ marginTop: 20, padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {forge.pickNames.map((name, i) => (
                  <div
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'var(--wobo-paper)',
                      border: `0.5px solid ${rgba(hue, 0.4)}`,
                      borderRadius: 3,
                      fontSize: '0.95rem',
                      color: 'var(--wobo-ink-900)',
                    }}
                  >
                    <span style={{ ...whisper, minWidth: 16 }}>{i + 1}</span>
                    {name}
                  </div>
                ))}
              </div>
            </Stage>
          </CardBody>
        )}

        {phase === 'run' && current && (
          <MiniWorkbook
            key={`${current.spec.id}-${attempt}`}
            spec={current.spec}
            hue={hue}
            nodeId={current.nodeId}
            setBar={setBar}
            onDone={advance}
          />
        )}

        {phase === 'done' && (
          <CardBody maxWidth={520}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{ textAlign: 'center' }}
            >
              <div style={whisper}>the forge cooled — here is how it held</div>
              <div
                style={{
                  margin: '18px auto 0',
                  fontSize: '3rem',
                  fontWeight: 650,
                  letterSpacing: '-0.03em',
                  color: 'var(--wobo-ink-900)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {score.current.correct}
                <span style={{ color: 'var(--wobo-ink-300)', fontWeight: 500 }}>
                  {' / '}
                  {score.current.total}
                </span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 600,
                  color: pct >= 80 ? 'var(--wobo-feedback-correct)' : hue,
                }}
              >
                {pct}% held
              </div>
              <div
                style={{
                  marginTop: 14,
                  color: 'var(--wobo-ink-500)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                }}
              >
                {replay
                  ? 'a re-forge earns no new xp — but every answer still sharpens the record.'
                  : pct >= 80
                    ? 'clean work. this one is on your shelf to re-forge whenever it starts to fade.'
                    : 'the reds are the ones worth another pass — the shelf keeps it ready for you.'}
              </div>
            </motion.div>
          </CardBody>
        )}
      </div>

      <ActionBar bar={bar} />
    </div>
  );
}
