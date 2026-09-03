'use client';

/**
 * Level and subject, read from the framework itself.
 *
 * There is no list of grades in the client and no canonical six subjects: a framework says which
 * levels it has and which subjects it teaches at a level, and that is what the learner picks from.
 * A framework with no levels yet shows nothing and says so, rather than offering Class 6 to 10
 * because that is what our old catalogs happened to carry.
 *
 * Grades 4 to 13, school level only (CURRICULUM.md §11) — filtered here as well as in the brain,
 * because a picker is the last place a stray "Year 2" should be able to appear.
 */

import { motion } from 'framer-motion';
import { surface } from '../ui/kit';
import { schoolLevels } from './world';

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        border: 'none',
        background: selected ? surface.ink : surface.tonal,
        color: selected ? 'var(--wobo-on-ink)' : surface.inkSoft,
        borderRadius: surface.radius.control,
        padding: '9px 15px',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        lineHeight: 1.2,
        cursor: 'pointer',
      }}
    >
      {label}
    </motion.button>
  );
}

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };

export function LevelPicker({
  levels,
  level,
  onLevel,
  emptyLine = 'I do not have the classes for this one yet.',
}: {
  levels: readonly string[];
  level: string | null;
  onLevel(level: string): void;
  emptyLine?: string;
}) {
  const offered = schoolLevels(levels);
  if (offered.length === 0)
    return <p style={{ margin: 0, fontSize: '0.86rem', color: surface.inkFaint }}>{emptyLine}</p>;
  return (
    <fieldset style={{ ...row, border: 'none', margin: 0, padding: 0 }}>
      <legend
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        Your class
      </legend>
      {offered.map((l) => (
        <Chip key={l} label={l} selected={l === level} onClick={() => onLevel(l)} />
      ))}
    </fieldset>
  );
}

export function SubjectPicker({
  subjects,
  subject,
  onSubject,
  emptyLine = 'Pick your class and I will bring your subjects.',
}: {
  subjects: readonly string[];
  subject: string | null;
  onSubject(subject: string): void;
  emptyLine?: string;
}) {
  if (subjects.length === 0)
    return <p style={{ margin: 0, fontSize: '0.86rem', color: surface.inkFaint }}>{emptyLine}</p>;
  return (
    <fieldset style={{ ...row, border: 'none', margin: 0, padding: 0 }}>
      <legend
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        Your subjects
      </legend>
      {subjects.map((s) => (
        <Chip key={s} label={s} selected={s === subject} onClick={() => onSubject(s)} />
      ))}
    </fieldset>
  );
}
