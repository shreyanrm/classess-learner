'use client';

/**
 * The ink close panel every site page ends on: a headline, a line in Wobo's hand in marigold, the
 * marigold door and the quiet one. The words default to the prototype's shared close ("Begin
 * tonight.") and a page that closes differently (the plans page, the gift page) passes its own.
 */

import type { ReactNode } from 'react';
import type { Route } from '../../shell/router';
import { SiteLink } from './nav';

export interface CloseAction {
  label: string;
  /** A route or a path — the action is a real link. Give `onClick` instead for an action. */
  to?: Route;
  href?: string;
  onClick?: () => void;
}

/** The shared close, word for word from the prototypes. */
export const CLOSE = {
  title: 'Begin tonight.',
  hand: 'The first question is on us.',
  primary: { label: 'Start learning for free', to: { name: 'onboarding' } as Route },
  quiet: { label: "I'm a parent", href: '/for-parents' },
} as const;

function Action({ action, className }: { action: CloseAction; className: string }) {
  if (action.to || action.href) {
    return (
      <SiteLink
        className={className}
        {...(action.to ? { to: action.to } : { href: action.href ?? '/' })}
      >
        {action.label}
      </SiteLink>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function ClosePanel({
  title = CLOSE.title,
  hand = CLOSE.hand,
  primary = CLOSE.primary,
  quiet = CLOSE.quiet,
  children,
}: {
  title?: string;
  /** The line in Wobo's hand. Pass null for a close with no handwritten line. */
  hand?: string | null;
  primary?: CloseAction;
  quiet?: CloseAction | null;
  /** A short honest note under the doors, where a page has one. */
  children?: ReactNode;
}) {
  return (
    <div className="st-close">
      <div className="st-wrap">
        <h2>{title}</h2>
        {hand ? <span className="hand">{hand}</span> : null}
        <div className="st-row">
          <Action action={primary} className="st-btn" />
          {quiet ? <Action action={quiet} className="st-btn st-q" /> : null}
        </div>
        {children ? <div className="st-fine">{children}</div> : null}
      </div>
    </div>
  );
}
