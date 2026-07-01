'use client';

import { ink, radius, space, typeScale } from '@classess/config';

/** The plain-language mastery bands (never a raw formula). */
export type Band = 'not_started' | 'emerging' | 'developing' | 'secure' | 'independent';

export interface BandMeta {
  label: string;
  /** Filled pips out of four — the SHAPE channel, so meaning never rides on colour alone. */
  level: number;
  /** Whether the earned accent may tint this band (only the top bands earn colour). */
  earnsColor: boolean;
}

const META: Record<Band, BandMeta> = {
  not_started: { label: 'Not started', level: 0, earnsColor: false },
  emerging: { label: 'Emerging', level: 1, earnsColor: false },
  developing: { label: 'Developing', level: 2, earnsColor: false },
  secure: { label: 'Secure', level: 3, earnsColor: true },
  independent: { label: 'Independent', level: 4, earnsColor: true },
};

/** Pure, tested: the label + shape (and whether colour is earned) for a band. */
export function bandMeta(band: Band): BandMeta {
  return META[band];
}

export interface MasteryBandProps {
  band: Band;
  /** The subject's earned accent; applied only on colour-earning bands. */
  accent?: string;
  /** Hide the text label (shape still carries meaning). */
  compact?: boolean;
}

/**
 * MasteryBand — a band shown as label + shape + (earned) colour, never colour alone. Four pips carry
 * the level; the text names it; the accent only tints once the band has earned colour (secure and up).
 */
export function MasteryBand({ band, accent, compact = false }: MasteryBandProps) {
  const meta = bandMeta(band);
  const tint = meta.earnsColor && accent ? accent : ink[900];
  const pips = [0, 1, 2, 3];

  return (
    <span
      role="img"
      aria-label={`Mastery: ${meta.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space[1],
        fontFamily: 'inherit',
      }}
    >
      <span aria-hidden style={{ display: 'inline-flex', gap: space.half }}>
        {pips.map((i) => {
          const filled = i < meta.level;
          return (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.jelly,
                border: `1px solid ${filled ? tint : ink[300]}`,
                background: filled ? tint : 'transparent',
              }}
            />
          );
        })}
      </span>
      {!compact && (
        <span style={{ fontSize: typeScale.caption.size, color: ink[700] }}>{meta.label}</span>
      )}
    </span>
  );
}
