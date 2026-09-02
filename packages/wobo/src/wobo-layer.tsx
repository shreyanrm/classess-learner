'use client';

import { frost, hairline, ink, radius, space, typeScale, zIndex } from '@classess/config';
import { useState } from 'react';
import { useWoboBus } from './context-bus';
import { WoboOverlay } from './highlight-overlay';
import { WoboPanel, type WoboTurn } from './WoboPanel';
import { WoboPresence } from './WoboPresence';

function offerText(offer: NonNullable<ReturnType<typeof useWoboBus>['pendingOffer']>): string {
  if (offer.reason) return offer.reason;
  if (offer.type === 'navigate') return 'Shall we head there?';
  if (offer.type === 'startPractice') return 'Want to try a short practice?';
  return 'Shall we switch how we look at this?';
}

/** A calm offer for a consequential action — power available, never imposed. */
function WoboOffer() {
  const bus = useWoboBus();
  const offer = bus.pendingOffer;
  if (!offer) return null;
  return (
    <div
      role="dialog"
      aria-label="Wobo suggestion"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 104,
        zIndex: zIndex.panel,
        maxWidth: 300,
        padding: space[2],
        borderRadius: radius.md,
        border: `1px solid ${hairline.onPaper}`,
        background: frost.onPaper,
        backdropFilter: `blur(${frost.blur})`,
        WebkitBackdropFilter: `blur(${frost.blur})`,
      }}
    >
      <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[900] }}>
        {offerText(offer)}
      </p>
      <div style={{ display: 'flex', gap: space[1], marginTop: space[2] }}>
        <button
          type="button"
          onClick={() => bus.acceptOffer()}
          style={{
            border: 0,
            borderRadius: radius.sm,
            padding: `${space.half}px ${space[2]}px`,
            background: ink[900],
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: typeScale.body.size,
          }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => bus.dismissOffer()}
          style={{
            border: `1px solid ${ink[100]}`,
            borderRadius: radius.sm,
            padding: `${space.half}px ${space[2]}px`,
            background: 'transparent',
            color: ink[700],
            cursor: 'pointer',
            fontSize: typeScale.body.size,
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export interface WoboLayerProps {
  turns: WoboTurn[];
  onSend?: (text: string) => void;
  listening?: boolean;
  onToggleVoice?: () => void;
}

/**
 * WoboLayer — mount this once inside a <WoboProvider>. It renders the whole connected presence: the
 * overlay that draws on the page, the consequential-action offer, and Wobo herself (presence + panel).
 * Her mood is driven by the bus, so her reactions follow what she is doing on the page.
 */
export function WoboLayer({ turns, onSend, listening = false, onToggleVoice }: WoboLayerProps) {
  const bus = useWoboBus();
  const [open, setOpen] = useState(false);

  return (
    <>
      <WoboOverlay />
      <WoboOffer />
      <WoboPresence
        fixed
        mood={listening ? 'listening' : bus.mood}
        onTap={() => setOpen((o) => !o)}
      />
      <WoboPanel
        open={open}
        onClose={() => setOpen(false)}
        turns={turns}
        onSend={onSend}
        listening={listening}
        onToggleVoice={onToggleVoice}
      />
    </>
  );
}
