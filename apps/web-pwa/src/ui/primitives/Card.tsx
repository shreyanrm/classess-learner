import type { HTMLAttributes } from 'react';

export type CardTint = 'pig' | 'mint' | 'rose' | 'marigold' | 'lilac';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** One leading pigment, as a wash. Left out, the card is paper-2. */
  tint?: CardTint;
  /** A side card: no minimum height. The today cards keep the prototype's 190px. */
  compact?: boolean;
}

/**
 * A tonal surface: 22px corners, 22px padding, a grid of 10px gaps. Put a <Tag> first, an <h3>,
 * a <p>, and a <CardFoot> last — the card styles those four itself.
 */
export function Card({ tint, compact, className, ...rest }: CardProps) {
  const cls = ['wk-card', tint && `wk-${tint}`, compact && 'wk-compact', className]
    .filter(Boolean)
    .join(' ');
  return <div className={cls} {...rest} />;
}

/** The last row of a card, pushed to the bottom: a button and a pill, or a head and a pill. */
export function CardFoot({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `wk-foot ${className}` : 'wk-foot'} {...rest} />;
}
