import { WoboBody, type WoboBodyProps } from '@wobo/wobo';
import type { CSSProperties } from 'react';

export interface WoboHeadProps extends Omit<WoboBodyProps, 'draggable' | 'style'> {
  /** The soft shadow under the hero head (the prototype's `drop-shadow`). Small heads go without. */
  shadow?: boolean;
  /** Placement only — the head's own box comes from `size`. */
  style?: CSSProperties;
}

/**
 * Wobo's head — the shipped rig from packages/wobo, wrapped, never redrawn.
 *
 * Two things the wrapper does: it hides the rig's grounding mark (a head on a card floats on the
 * card's tone; the prototype draws no patch under it), and it hands the rig the page's own
 * `--body` / `--visor` / `--eye` tokens so the head takes the theme of whatever panel it sits in,
 * not only the document's. The rig's own hairline rim stays as the rig sets it.
 */
export function WoboHead({ size = 88, shadow, className, style, ...rig }: WoboHeadProps) {
  const cls = ['wk-head', shadow && 'wk-shadow', className].filter(Boolean).join(' ');
  const tones = {
    '--wr-body': 'var(--body)',
    '--wr-visor': 'var(--visor)',
    '--wr-eye': 'var(--eye)',
  } as CSSProperties;
  return (
    <span className={cls} style={style}>
      <WoboBody size={size} style={tones} {...rig} />
    </span>
  );
}
