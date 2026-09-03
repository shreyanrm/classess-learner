import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type SpanProps = HTMLAttributes<HTMLSpanElement>;

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

/** A chapter marker in the brand pigment — uppercase, tracked, Wobo blue. */
export function Label({ className, ...rest }: SpanProps) {
  return <span className={cls('wk-label', className)} {...rest} />;
}

/** A card's eyebrow — uppercase, tracked, ink-3. */
export function Tag({ className, ...rest }: SpanProps) {
  return <span className={cls('wk-tag', className)} {...rest} />;
}

/** A small fact on a card: a duration, a day, a state. */
export function Pill({ className, ...rest }: SpanProps) {
  return <span className={cls('wk-pill', className)} {...rest} />;
}

/**
 * What Wobo writes by hand — Caveat, 24px. Wrap the line worth underlining in <em>; it is set in
 * coral, upright.
 */
export function HandNote({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cls('wk-hand', className)} {...rest} />;
}

export interface StickerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: ReactNode;
  /** Degrees. The site pages turn it -6 by default, +4 or +6 where it sits on the other side. */
  rotate?: number;
}

/**
 * A marigold sticker in Wobo's hand, absolutely placed — give it `style={{ right, top }}` against a
 * positioned parent.
 */
export function Sticker({ rotate, className, style, ...rest }: StickerProps) {
  const turned: CSSProperties | undefined =
    rotate === undefined ? style : { ...style, transform: `rotate(${rotate}deg)` };
  return <span className={cls('wk-sticker', className)} style={turned} {...rest} />;
}
