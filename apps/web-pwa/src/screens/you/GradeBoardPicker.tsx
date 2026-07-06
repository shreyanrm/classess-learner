'use client';

/**
 * Grade and board chips — shared by onboarding beat three and the You header. Seeded boards
 * lead; the rest follow, grouped by region, scrollable. Selecting an unseeded board is always
 * allowed — the world is fetched on arrival, never gated.
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { boards } from '../../data/catalog';
import { SectionLabel } from '../../ui/kit';

export const GRADES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

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
        border: selected
          ? '0.5px solid var(--clss-ink-900)'
          : '0.5px solid var(--clss-hairline-on-paper-strong)',
        background: selected ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
        color: selected ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
        borderRadius: 999,
        padding: '8px 15px',
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
        <SectionLabel>your grade</SectionLabel>
        <div style={row}>
          {GRADES.map((g) => (
            <Chip key={g} label={g} selected={grade === g} onClick={() => onGrade(g)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>your board</SectionLabel>
        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingRight: 4,
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
                {region.toLowerCase()}
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
