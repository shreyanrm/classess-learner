import type { ReactNode } from 'react';

export interface AllowanceCardProps {
  /** "Today's allowance", or "Your plan". */
  title: ReactNode;
  /** 0..1 — draws the marigold bar. Left out, no bar. */
  progress?: number;
  /** The small line under the bar. */
  note?: ReactNode;
  /** Anything else the slot needs: a plan line, a small button. */
  children?: ReactNode;
  className?: string;
}

/** The marigold-wash card at the foot of the rail. */
export function AllowanceCard({ title, progress, note, children, className }: AllowanceCardProps) {
  const pct = progress === undefined ? undefined : Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className={className ? `wk-allow ${className}` : 'wk-allow'}>
      <b>{title}</b>
      {pct !== undefined && (
        <div className="wk-bar" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      {note !== undefined && <span>{note}</span>}
      {children}
    </div>
  );
}
