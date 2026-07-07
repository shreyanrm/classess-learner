'use client';

/**
 * Grade and board chips. Onboarding asks them as two separate beats — board first (BoardPicker,
 * with a free-text door for a board we don't list yet), then the grades for that board (GradePicker).
 * The You header still edits both at once (GradeBoardPicker). Selecting any board is always allowed —
 * an unlisted or unsourced board is sourced on arrival, never gated.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { type CSSProperties, useState } from 'react';
import { boards } from '../../data/catalog';
import { MagneticButton, SectionLabel } from '../../ui/kit';

export const GRADES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

/** Grades to offer for a board. The seeded catalogs all cover 6–10; an unlisted board gets the same. */
export function gradesForBoard(_boardId: string | null): string[] {
  return GRADES;
}

function Chip({
  label,
  selected,
  onClick,
  style,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        // the one chip system: tonal at rest, solid ink when chosen — 3px, never pills
        border: 'none',
        background: selected ? 'var(--clss-ink-900)' : 'var(--clss-tonal)',
        color: selected ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
        borderRadius: 3,
        padding: '9px 15px',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        cursor: 'pointer',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {label}
    </motion.button>
  );
}

const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };

/** The board list: seeded lead, the rest grouped by region, plus the free-text door for the unlisted. */
export function BoardPicker({
  boardId,
  onBoard,
}: {
  boardId: string | null;
  onBoard: (boardId: string) => void;
}) {
  const seeded = boards.filter((b) => b.seeded);
  const rest = boards.filter((b) => !b.seeded);
  const regions = [...new Set(rest.map((b) => b.region))];
  const listed = boards.some((b) => b.id === boardId);
  // "unlisted" = a board the learner typed that isn't one of our chips.
  const [typing, setTyping] = useState(false);
  const [custom, setCustom] = useState('');
  const customChosen = boardId != null && !listed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <SectionLabel>Your board</SectionLabel>
      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingRight: 4,
          // Fade the bottom edge so it's clear the list scrolls — a board below the cut still reads.
          WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%)',
        }}
      >
        <div style={row}>
          {seeded.map((b) => (
            <Chip
              key={b.id}
              label={b.name}
              selected={boardId === b.id}
              onClick={() => onBoard(b.id)}
            />
          ))}
        </div>
        {regions.map((region) => (
          <div key={region} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{ fontSize: '0.72rem', color: 'var(--clss-ink-300)', letterSpacing: '0.1em' }}
            >
              {region}
            </div>
            <div style={row}>
              {rest
                .filter((b) => b.region === region)
                .map((b) => (
                  <Chip
                    key={b.id}
                    label={b.name}
                    selected={boardId === b.id}
                    onClick={() => onBoard(b.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* the free-text door — for a board we don't list yet */}
      {!typing && !customChosen ? (
        <button
          type="button"
          onClick={() => setTyping(true)}
          style={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            color: 'var(--clss-ink-500)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 4,
          }}
        >
          My board isn't here
        </button>
      ) : (
        <div
          style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 380 }}
        >
          <input
            // biome-ignore lint/a11y/noAutofocus: the field is this affordance's single intention
            autoFocus
            value={custom || (customChosen ? (boardId as string) : '')}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && custom.trim() && onBoard(custom.trim())}
            placeholder="Type your board's name"
            aria-label="your board's name"
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '1rem',
              fontFamily: 'inherit',
              color: 'var(--clss-ink-900)',
              background: 'var(--clss-tonal)',
              border: 'none',
              borderRadius: 3,
              padding: '11px 14px',
            }}
          />
          <MagneticButton
            size="md"
            variant="primary"
            onClick={() => custom.trim() && onBoard(custom.trim())}
            style={{ minWidth: 64, justifyContent: 'center' }}
          >
            Set
          </MagneticButton>
        </div>
      )}
      <AnimatePresence>
        {customChosen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
            style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}
          >
            I'll try to source {boardId} when you arrive
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The grades relevant to the chosen board — its own beat, after the board is set. */
export function GradePicker({
  boardId,
  grade,
  onGrade,
}: {
  boardId: string | null;
  grade: string | null;
  onGrade: (grade: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <SectionLabel>Your grade</SectionLabel>
      <div style={row}>
        {gradesForBoard(boardId).map((g) => (
          <Chip key={g} label={g} selected={grade === g} onClick={() => onGrade(g)} />
        ))}
      </div>
    </div>
  );
}

export function GradeBoardPicker({
  grade,
  boardId,
  onGrade,
  onBoard,
}: {
  grade: string | null;
  boardId: string | null;
  onGrade: (grade: string) => void;
  onBoard: (boardId: string) => void;
}) {
  const seeded = boards.filter((b) => b.seeded);
  const rest = boards.filter((b) => !b.seeded);
  const regions = [...new Set(rest.map((b) => b.region))];
  const chosen = boards.find((b) => b.id === boardId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Your grade</SectionLabel>
        <div style={row}>
          {GRADES.map((g) => (
            <Chip key={g} label={g} selected={grade === g} onClick={() => onGrade(g)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Your board</SectionLabel>
        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingRight: 4,
            // Fade the bottom edge so it's clear the list scrolls — otherwise a learner whose board
            // sits below the cut (Common Core, UK, IB…) sees a hard-sliced row and assumes it's the end.
            WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%)',
          }}
        >
          <div style={row}>
            {seeded.map((b) => (
              <Chip
                key={b.id}
                label={b.name}
                selected={boardId === b.id}
                onClick={() => onBoard(b.id)}
              />
            ))}
          </div>
          {regions.map((region) => (
            <div key={region} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--clss-ink-300)',
                  letterSpacing: '0.1em',
                }}
              >
                {region}
              </div>
              <div style={row}>
                {rest
                  .filter((b) => b.region === region)
                  .map((b) => (
                    <Chip
                      key={b.id}
                      label={b.name}
                      selected={boardId === b.id}
                      onClick={() => onBoard(b.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <AnimatePresence>
          {chosen && !chosen.seeded && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
              style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}
            >
              I'll fetch this board's world when you arrive
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
