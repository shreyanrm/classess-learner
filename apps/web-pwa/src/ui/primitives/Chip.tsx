import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

interface ChipBase {
  /** The selected chip: ink on paper. */
  on?: boolean;
  children: ReactNode;
  className?: string;
}

export type ChipProps = ChipBase &
  (
    | ({ onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>['onClick']> } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        'onClick' | 'className' | 'children'
      >)
    | ({ onClick?: undefined } & Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children'>)
  );

/**
 * A pill of paper-2. With `onClick` it is a button (a mode, a filter); without, it states a fact
 * ("Streak · 7").
 */
export function Chip({ on, className, children, ...rest }: ChipProps) {
  const cls = ['wk-chip', on && 'wk-on', className].filter(Boolean).join(' ');
  if (rest.onClick) {
    const { onClick, ...button } = rest as Extract<ChipProps, { onClick: unknown }>;
    return (
      <button type="button" className={cls} aria-pressed={on} onClick={onClick} {...button}>
        {children}
      </button>
    );
  }
  const { onClick: _none, ...span } = rest as Extract<ChipProps, { onClick?: undefined }>;
  return (
    <span className={cls} {...span}>
      {children}
    </span>
  );
}
