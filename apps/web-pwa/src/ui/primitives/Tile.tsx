import type { MouseEvent, ReactNode } from 'react';

export interface TileProps {
  /** The subject. */
  title: ReactNode;
  /** Where the class is in it. */
  meta?: ReactNode;
  /** The tile the screen is showing: a 3px Wobo-blue outline. */
  on?: boolean;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
}

/** A subject door in the grid. A link when it has an address, a button otherwise. */
export function Tile({ title, meta, on, href, onClick, className }: TileProps) {
  const cls = ['wk-tile', on && 'wk-on', className].filter(Boolean).join(' ');
  const body = (
    <>
      <b>{title}</b>
      {meta !== undefined && <span>{meta}</span>}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} onClick={onClick} aria-current={on ? 'page' : undefined}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={on}>
      {body}
    </button>
  );
}
