'use client';

/**
 * "Your board published a new year" (CURRICULUM.md §6).
 *
 * A version is never edited in place, so an upgrade is an offer, not an event that happens to the
 * learner. The card says what moved, one line per change, and — after they take it — says plainly
 * how much of their own work carried over and what did not. The second half is the honest half:
 * a report of nothing kept would be worse than useless if it were hidden.
 */

import type { CurriculumUpgradeView } from '@wobo/sdk';
import { Hairline, MagneticButton, surface } from '../ui/kit';
import { useUpgrade } from './hooks';

export function UpgradeCard() {
  const { offer, busy, error, accept, dismiss } = useUpgrade();
  if (!offer) return null;

  const applied = offer.upgraded;
  const changes = offer.changes.slice(0, 8);
  const more = offer.changes.length - changes.length;

  return (
    <section
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        background: surface.card,
        borderRadius: surface.radius.card,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontWeight: 560 }}>
          {applied ? 'You are on the new syllabus' : 'There is a newer syllabus'}
        </span>
        {offer.latestLabel && (
          <span style={{ fontSize: '0.82rem', color: surface.inkFaint }}>{offer.latestLabel}</span>
        )}
      </div>

      {offer.summary && (
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: surface.inkSoft }}>
          {offer.summary}
        </p>
      )}

      {changes.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          {changes.map((change) => (
            <li
              key={`${change.kind}-${change.nodeId ?? change.line}`}
              style={{ fontSize: '0.84rem', lineHeight: 1.5, color: surface.inkSoft }}
            >
              {change.line}
            </li>
          ))}
          {more > 0 && (
            <li style={{ fontSize: '0.84rem', color: surface.inkFaint }}>
              and {more} more {more === 1 ? 'change' : 'changes'}
            </li>
          )}
        </ul>
      )}

      {applied && (
        <>
          <Hairline />
          <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5, color: surface.inkSoft }}>
            {overlayLine(offer)}
          </p>
          {offer.overlayReport.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {offer.overlayReport.map((line) => (
                <li key={line} style={{ fontSize: '0.82rem', color: surface.inkFaint }}>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: '0.84rem', color: surface.inkSoft }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!applied && (
          <MagneticButton size="sm" onClick={() => void accept()} disabled={busy}>
            {busy ? 'Moving you over' : 'Move me to it'}
          </MagneticButton>
        )}
        <MagneticButton variant="quiet" size="sm" onClick={dismiss}>
          {applied ? 'Got it' : 'Stay on mine for now'}
        </MagneticButton>
      </div>
    </section>
  );
}

/** How much of the learner's own work carried over. Says the awkward number out loud. */
function overlayLine(offer: CurriculumUpgradeView): string {
  const kept = offer.overlayKept ?? 0;
  const dropped = offer.overlayDropped ?? 0;
  if (kept === 0 && dropped === 0) return 'You had no edits of your own, so nothing needed moving.';
  const keptWord = `${kept} of your ${kept === 1 ? 'edit' : 'edits'} moved across`;
  if (dropped === 0) return `${keptWord}.`;
  return `${keptWord}. ${dropped} no longer ${dropped === 1 ? 'has' : 'have'} a home — here they are, so you can put them back.`;
}
