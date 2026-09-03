'use client';

/**
 * "Which board or curriculum do you follow?" — the type-ahead over the global registry, and the
 * two doors that are always beside it (CURRICULUM.md §3):
 *
 *   · not listed? tell me   — sends the name straight to a discovery job, with an honest status
 *   · show me my syllabus   — the own-syllabus path, paste, photo or PDF
 *
 * Neither door is ever more than one tap away, and neither is hidden behind an empty result: a
 * learner whose board IS listed may still be following something else, and a registry that is
 * down is exactly when the other doors matter most.
 */

import type { CurriculumFramework } from '@wobo/sdk';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { surface } from '../ui/kit';
import { useBoardSearch } from './hooks';
import { ProvenanceLabel } from './Labels';
import { notListedMessage } from './search';

export interface BoardSearchProps {
  /** A framework the learner picked from the list. */
  onPick(framework: CurriculumFramework): void;
  /** "Not listed" — the raw name they typed, to be looked for. */
  onNotListed(query: string): void;
  /** "Show me my syllabus" — the own-syllabus door. */
  onOwnSyllabus(): void;
  autoFocus?: boolean;
}

const KIND_WORD: Record<string, string> = {
  national: 'national board',
  state: 'state board',
  international: 'international curriculum',
  open: 'open curriculum',
  homeschool: 'homeschool programme',
  online: 'online school',
  personal: 'your own syllabus',
};

/** One quiet line under a result: what kind of thing it is, and where. */
function whereLine(framework: CurriculumFramework): string {
  const kind = KIND_WORD[framework.kind] ?? '';
  const place = framework.region ?? framework.country ?? '';
  return [kind, place].filter(Boolean).join(' · ');
}

export function BoardSearch({ onPick, onNotListed, onOwnSyllabus, autoFocus }: BoardSearchProps) {
  const { state, setQuery, flush } = useBoardSearch();
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const results = state.result?.results ?? [];
  const searching = state.status === 'typing' || state.status === 'searching';
  const emptied = state.status === 'done' && results.length === 0;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 7 }}>
        <span style={{ fontSize: '0.86rem', color: surface.inkSoft }}>
          Your board or curriculum
        </span>
        <input
          ref={input}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Start typing — CBSE, IGCSE, Texas TEKS"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              flush();
            }
          }}
          aria-describedby="board-search-help"
          style={{
            font: 'inherit',
            fontSize: '1rem',
            padding: '12px 14px',
            color: surface.ink,
            background: surface.card,
            border: `1px solid ${surface.cardBorder}`,
            borderRadius: surface.radius.control,
            outlineOffset: 2,
          }}
        />
      </label>

      <div
        role="status"
        aria-live="polite"
        style={{ minHeight: 18, fontSize: '0.8rem', color: surface.inkFaint }}
      >
        {state.error
          ? state.error
          : searching
            ? 'Looking through my list of boards'
            : emptied
              ? 'Nothing in my list matches that yet.'
              : ''}
      </div>

      {results.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {results.map((framework, i) => (
            <motion.li
              key={framework.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.02, duration: 0.18 }}
            >
              <button
                type="button"
                onClick={() => onPick(framework)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'grid',
                  gap: 3,
                  padding: '11px 13px',
                  font: 'inherit',
                  color: surface.ink,
                  background: surface.card,
                  border: `1px solid ${surface.cardBorder}`,
                  borderRadius: surface.radius.card,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 560 }}>{framework.name}</span>
                {whereLine(framework) && (
                  <span style={{ fontSize: '0.78rem', color: surface.inkFaint }}>
                    {whereLine(framework)}
                  </span>
                )}
                <ProvenanceLabel
                  status={framework.status}
                  label={framework.label}
                  name={framework.name}
                  style={{ fontSize: '0.76rem' }}
                />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {/* The two doors. Always here, never behind an empty result. */}
      <div id="board-search-help" style={{ display: 'grid', gap: 8 }}>
        <DoorButton
          label={notListedMessage(state)}
          action="Tell me its name"
          disabled={!state.query.trim()}
          onClick={() => onNotListed(state.query.trim())}
        />
        <DoorButton
          label="Following something else, or a syllabus your school wrote?"
          action="Show me my syllabus"
          onClick={onOwnSyllabus}
        />
      </div>
    </div>
  );
}

function DoorButton({
  label,
  action,
  onClick,
  disabled,
}: {
  label: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'grid',
        gap: 3,
        textAlign: 'left',
        padding: '10px 13px',
        font: 'inherit',
        color: disabled ? surface.inkFaint : surface.ink,
        background: surface.tonal,
        border: 'none',
        borderRadius: surface.radius.control,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ fontSize: '0.82rem', color: surface.inkFaint }}>{label}</span>
      <span style={{ fontWeight: 550 }}>{action}</span>
    </button>
  );
}
