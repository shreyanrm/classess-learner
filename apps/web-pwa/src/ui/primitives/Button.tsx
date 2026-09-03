import type { ButtonHTMLAttributes } from 'react';

export type ButtonTone = 'ink' | 'pig' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** ink (default) for the action; pig for the one primary action on a screen; quiet for the rest. */
  tone?: ButtonTone;
  /** sm sits inside a card or a row. */
  size?: 'md' | 'sm';
}

/** A button in the prototype's hand: 46px tall, 12px corners, no border, no shadow. */
export function Button({
  tone = 'ink',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const cls = ['wk-btn', tone !== 'ink' && `wk-${tone}`, size === 'sm' && 'wk-sm', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={cls} {...rest} />;
}
