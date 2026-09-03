'use client';

/**
 * The six states, as pages.
 *
 * Every word here obeys `docs/copy/voice.md`: sentence case, no exclamation marks, no emoji, the
 * name before any pronoun, and the answer in the first line. Two more rules run through all six.
 *
 * The dead-end rule: none of them is only an apology. Each says what still works — a saved place, a
 * lesson already downloaded, practice already opened — because a learner meeting one of these has
 * usually just lost their thread and needs to be told it is still there.
 *
 * The no-invented-numbers rule: a time is shown only when the server actually sent one. The daily
 * limit prints the real reset instant off the 429's own header, and when the brain sent no time the
 * sentence says "tomorrow" rather than making an hour up.
 */

import {
  DAILY_LIMIT_WOBO,
  DailyLimitArt,
  EXPIRED_WOBO,
  ExpiredLinkArt,
  InkScene,
  MAINTENANCE_WOBO,
  MaintenanceArt,
  NOT_FOUND_WOBO,
  NotFoundArt,
  OFFLINE_WOBO,
  OfflineArt,
  SERVER_ERROR_WOBO,
  ServerErrorArt,
} from './art';
import { StateScene } from './Scene';
import { resetClock, resetDay } from './select';

export function NotFound({ onHome, onAsk }: { onHome: () => void; onAsk: () => void }) {
  return (
    <StateScene
      code="Not found"
      title="This page isn't here"
      body="Wobo looked around and couldn't find it. It may have moved, or the link had a slip in it."
      actions={[
        { label: 'Back to learning', onSelect: onHome, primary: true },
        { label: 'Ask Wobo', onSelect: onAsk },
      ]}
      art={
        <InkScene
          label="A dotted path drawn across a map ends at a question mark, and Wobo looks for it"
          wobo={NOT_FOUND_WOBO}
        >
          <NotFoundArt />
        </InkScene>
      }
    />
  );
}

export function ServerError({ onRetry, onHome }: { onRetry: () => void; onHome: () => void }) {
  return (
    <StateScene
      code="Our fault"
      title="Something on our side broke"
      body="Not you. Wobo has already told us, and your place is saved. Try again in a moment."
      actions={[
        { label: 'Try again', onSelect: onRetry, primary: true },
        { label: 'Back to learning', onSelect: onHome },
      ]}
      note="If it keeps happening, the flag in the corner sends us the details."
      art={
        <InkScene
          label="A line Wobo was drawing wobbles and breaks, and Wobo shakes it off"
          wobo={SERVER_ERROR_WOBO}
        >
          <ServerErrorArt />
        </InkScene>
      }
    />
  );
}

export function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <StateScene
      code="Offline"
      title="You're offline"
      body="Your place is saved and nothing is lost. Wobo will pick up exactly here the moment you're back."
      actions={[{ label: 'Try again', onSelect: onRetry }]}
      note="Lessons you've opened before still work offline."
      art={
        <InkScene
          label="A paper plane Wobo threw drifts and drops, ready to fly when the connection returns"
          wobo={OFFLINE_WOBO}
        >
          <OfflineArt />
        </InkScene>
      }
    />
  );
}

/**
 * The spent day. `resetAt` is the instant the brain put in the 429's `X-Wobo-Budget-Reset` header
 * and nothing else; with no header the sentence stays true by staying vague.
 *
 * It carries TWO doors. WOBO-PLAN §14 puts the plan ask "just before the wow it unlocks, at the
 * emotional peak, framed as pushing limits, never on a timer" — and a learner who has used a whole
 * day of turns is exactly that person. So the second door goes to /plans, phrased as what a bigger
 * day carries rather than as a loss; the primary door is still back to learning, because the day
 * refills by itself and nobody has to pay for that to happen. Nothing here counts down, nothing
 * expires, and the price is the same for everyone (§14).
 */
export function DailyLimit({
  resetAt,
  onBack,
  onPlans,
}: {
  resetAt?: string | null;
  onBack: () => void;
  /** Absent where there is nowhere to send them — the door is then simply not drawn. */
  onPlans?: () => void;
}) {
  const clock = resetClock(resetAt);
  const day = resetDay(resetAt);
  const when = clock && day ? `at ${clock} ${day}` : 'tomorrow';
  return (
    <StateScene
      code="Daily limit"
      title="That's a lot of learning for one day"
      body={`You've used today's free turns. They come back ${when}, and your streak is safe.`}
      actions={[
        { label: 'Back to learning', onSelect: onBack, primary: true },
        ...(onPlans ? [{ label: 'See what a bigger day carries', onSelect: onPlans }] : []),
      ]}
      note="Practice and lessons you've already opened still work. Pro carries five times this allowance and Max twenty, at one price for everyone."
      art={
        <InkScene label="An hourglass drawn in ink, which Wobo turns over" wobo={DAILY_LIMIT_WOBO}>
          <DailyLimitArt />
        </InkScene>
      }
    />
  );
}

export function ExpiredLink({ onNewLink }: { onNewLink: () => void }) {
  return (
    <StateScene
      code="Link expired"
      title="This link has expired"
      body="Sign-in links stop working after a short while, so nobody who finds one can use it. Ask for a fresh one and it will be in your inbox in a moment."
      actions={[{ label: 'Send a new link', onSelect: onNewLink, primary: true }]}
      art={
        <InkScene label="An envelope drawn in ink, its seal fading" wobo={EXPIRED_WOBO}>
          <ExpiredLinkArt />
        </InkScene>
      }
    />
  );
}

/** Planned work. A return time is shown only when the server sent one. */
export function Maintenance({ backAt, onRetry }: { backAt?: string | null; onRetry: () => void }) {
  const clock = resetClock(backAt);
  return (
    <StateScene
      code="Back soon"
      title="Wobo is tightening a few bolts"
      body={
        clock
          ? `We're doing planned work and expect to be back by ${clock}. Your place is saved and your streak is safe.`
          : "We're doing planned work and will be back shortly. Your place is saved and your streak is safe."
      }
      actions={[{ label: 'Check again', onSelect: onRetry }]}
      art={
        <InkScene label="Wobo tightens a bolt with a spanner" wobo={MAINTENANCE_WOBO}>
          <MaintenanceArt />
        </InkScene>
      }
    />
  );
}
