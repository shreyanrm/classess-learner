'use client';

import { hairline, ink, radius, space, typeScale } from '@classess/config';
import { Ignite, SpringBar } from '@classess/motion';
import type { ReactNode } from 'react';
import { FOCUSABLE, useClssStyles } from './internal/styles';

/** The lifecycle of a concept, monochrome until it is mastered. */
export type ConceptState = 'locked' | 'not_started' | 'in_progress' | 'mastered';

/**
 * Colour is earned. A concept shows its content-colour ONLY once it is mastered (the ignite moment).
 * Pure and unit-tested — the whole brand thesis lives in this one predicate.
 */
export function showsColor(state: ConceptState): boolean {
  return state === 'mastered';
}

export interface ConceptTileProps {
  title: string;
  state: ConceptState;
  /** The concept's earned accent (a @classess/config subject accent). Shown only when mastered. */
  accent?: string;
  /** 0..1 progress, rendered as a monochrome bar while in progress. */
  progress?: number;
  icon?: ReactNode;
  onActivate?: () => void;
}

/**
 * ConceptTile — the monochrome -> ignite unit. Locked and not-started tiles are grayscale and quiet;
 * an in-progress tile shows a monochrome progress bar; a mastered tile ignites into its accent and
 * carries colour from then on. Never colour before mastery.
 */
export function ConceptTile({
  title,
  state,
  accent,
  progress = 0,
  icon,
  onActivate,
}: ConceptTileProps) {
  useClssStyles();
  const mastered = showsColor(state);
  const locked = state === 'locked';
  const earned = mastered ? (accent ?? ink[900]) : ink[900];

  const inner = (
    <button
      type="button"
      className={FOCUSABLE}
      aria-disabled={locked || undefined}
      aria-current={mastered ? 'true' : undefined}
      onClick={locked ? undefined : onActivate}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space[1],
        width: '100%',
        textAlign: 'left',
        padding: space[2],
        border: `1px solid ${hairline.onPaper}`,
        borderRadius: radius.md,
        background: 'transparent',
        color: earned,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.5 : 1,
        // Monochrome until mastered. Filter IS the meaning (understanding = colour).
        filter: mastered ? 'none' : 'grayscale(1) saturate(0.35)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
        {icon}
        <span style={{ fontSize: typeScale.h3.size, fontWeight: 500 }}>{title}</span>
      </span>
      {state === 'in_progress' && (
        <SpringBar
          value={Math.max(0, Math.min(1, progress))}
          max={1}
          label={`Progress on ${title}`}
        />
      )}
    </button>
  );

  // The ignite plays once when the tile enters its mastered state.
  return mastered ? (
    <Ignite accent={accent ?? ink[900]} style={{ borderRadius: radius.md }}>
      {inner}
    </Ignite>
  ) : (
    inner
  );
}
