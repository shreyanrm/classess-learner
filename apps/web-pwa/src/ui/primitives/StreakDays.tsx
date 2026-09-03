import type { ReactNode } from 'react';

export interface StreakDay {
  /** One letter. */
  label: string;
  on: boolean;
}

export interface StreakDaysProps {
  count: number;
  /** "days in a row" */
  title: ReactNode;
  days: readonly StreakDay[];
  /** The line under the week. */
  note?: ReactNode;
  className?: string;
}

/** The streak card: the number at 40px, the week as seven marigold dots, and the note. */
export function StreakDays({ count, title, days, note, className }: StreakDaysProps) {
  return (
    <div className={className ? `wk-streak ${className}` : 'wk-streak'}>
      <div className="wk-n">{count}</div>
      <div>
        <b>{title}</b>
        <div className="wk-days" aria-hidden="true">
          {days.map((d, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the week is a fixed run of seven marks
            <i key={i} className={d.on ? 'wk-on' : undefined}>
              {d.label}
            </i>
          ))}
        </div>
        {note !== undefined && <span className="wk-note">{note}</span>}
      </div>
    </div>
  );
}
