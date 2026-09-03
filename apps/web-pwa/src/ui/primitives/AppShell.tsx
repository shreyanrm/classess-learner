import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnnounceShell } from '../shellPresence';
import { NavIcon, type NavIconName, Wordmark } from './icons';
import { usePhone } from './media';

export type NavId = NavIconName;

/** The four doors, in the rail's order, with the addresses the router answers. */
export const NAV_ITEMS: readonly { id: NavId; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'learn', label: 'Learn', path: '/learn' },
  { id: 'practice', label: 'Practice', path: '/practice' },
  { id: 'you', label: 'You', path: '/you' },
];

export interface AppShellProps {
  /** Which door the learner is behind. */
  active: NavId;
  /** Takes over the click; without it the links navigate on their own. */
  onNavigate?: (id: NavId, path: string) => void;
  /** The rail's bottom slot: an <AllowanceCard> or a <TalkHint>. Hidden on a phone. */
  bottom?: ReactNode;
  /** The main column. Put a <TopBar> first. */
  children: ReactNode;
  className?: string;
}

/**
 * The app frame: a 240px rail with the wordmark, the four doors and a bottom slot, beside the
 * main column. At 900px and under the rail becomes the bottom tab bar and the wordmark, spacer
 * and slot leave.
 *
 * On a phone the rail is fixed to the bottom of the viewport, and every screen renders inside the
 * route transition's wrapper, which keeps `will-change: transform` — a containing block that would
 * pin the tab bar to the page instead of the viewport, so it scrolled away with the content. The
 * rail is therefore portaled to <body> in the phone layout; on desktop it stays in the grid.
 */
export function AppShell({ active, onNavigate, bottom, children, className }: AppShellProps) {
  useAnnounceShell();
  const phone = usePhone();
  const rail = (
    <aside className="wk-rail">
      <div className="wk-wm">
        <Wordmark />
      </div>
      <nav aria-label="Wobo">
        {NAV_ITEMS.map((item) => {
          const on = item.id === active;
          const go = (e: MouseEvent<HTMLAnchorElement>) => {
            if (!onNavigate) return;
            e.preventDefault();
            onNavigate(item.id, item.path);
          };
          return (
            <a
              key={item.id}
              href={item.path}
              className={on ? 'wk-on' : undefined}
              aria-current={on ? 'page' : undefined}
              onClick={go}
            >
              <NavIcon name={item.id} />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="wk-spacer" />
      {bottom !== undefined && <div className="wk-bottom">{bottom}</div>}
    </aside>
  );
  return (
    <div className={className ? `wk-shell ${className}` : 'wk-shell'}>
      {phone && typeof document !== 'undefined' ? createPortal(rail, document.body) : rail}
      <main className="wk-main">{children}</main>
    </div>
  );
}

export interface TopBarProps {
  /** "Tuesday · Class 8 · CBSE" */
  crumb: ReactNode;
  /** Chips, a segmented control, the avatar. */
  right?: ReactNode;
  className?: string;
}

/** The line at the top of the main column: the crumb on the left, the screen's controls on the right. */
export function TopBar({ crumb, right, className }: TopBarProps) {
  return (
    <div className={className ? `wk-topbar ${className}` : 'wk-topbar'}>
      <span className="wk-crumb">{crumb}</span>
      {right !== undefined && <div className="wk-right">{right}</div>}
    </div>
  );
}

/** The learner's initial in a lilac-wash circle. */
export function Avatar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `wk-avatar ${className}` : 'wk-avatar'} {...rest} />;
}

export interface TalkHintProps {
  /** The key: "space". */
  keyLabel: ReactNode;
  /** "Hold to talk to Wobo" */
  children: ReactNode;
  className?: string;
}

/** The ink card in the lesson rail's bottom slot. */
export function TalkHint({ keyLabel, children, className }: TalkHintProps) {
  return (
    <div className={className ? `wk-talk ${className}` : 'wk-talk'}>
      <span className="wk-k">{keyLabel}</span>
      <span>{children}</span>
    </div>
  );
}
