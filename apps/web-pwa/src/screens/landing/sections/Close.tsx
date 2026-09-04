'use client';

/**
 * The close: a promotion, not an invitation.
 *
 * Law v5's copy rule is explicit — until the product opens, the last thing the page asks for is an
 * address, not a first lesson. So there is no "begin tonight" here and no door into onboarding: one
 * field, one button, and a sentence about what happens to what you type.
 *
 * WHERE THE ADDRESS GOES, and why the page says so. There is no waitlist endpoint: the gateway's
 * only mail route is an internal one guarded by a shared key a browser must never hold, so a form
 * that posted would be posting nowhere. Rather than build the most common lie a marketing page
 * tells, the address is kept in this browser and the page says that in one line under the button.
 * The moment there is somewhere to send it, this is the only component that changes.
 */

import { type FormEvent, useCallback, useState } from 'react';
import { useMagnet } from '../../../ui/primitives/magnetic';
import { CLOSE, EARLY_ID } from '../page-copy';

/** Where a kept address waits. Versioned, so a later shape can be told from this one. */
export const EARLY_ACCESS_KEY = 'wobo-early-access-v1';

/**
 * Keep an address on this device. Returns whether it was actually kept — a private window, a
 * browser with storage switched off, or a full quota all answer false, and the page tells the
 * truth about that rather than claiming a list it never joined.
 */
export function keepAddress(address: string, store: Storage | undefined = safeStorage()): boolean {
  if (!store) return false;
  try {
    store.setItem(EARLY_ACCESS_KEY, JSON.stringify({ address, at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined; // storage blocked entirely; the form still works, it just cannot remember
  }
}

export function Close() {
  const [address, setAddress] = useState('');
  const [state, setState] = useState<'idle' | 'kept' | 'unkept'>('idle');

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setState(keepAddress(address.trim()) ? 'kept' : 'unkept');
    },
    [address],
  );

  const done = state !== 'idle';
  return (
    <div className="wrap">
      <div id="close">
        <div className="glow" style={{ left: '-8%', top: '-20%' }} aria-hidden="true" />
        <div
          className="glow"
          style={{
            right: '-10%',
            bottom: '-30%',
            background: 'radial-gradient(circle,rgba(255,182,41,.28),transparent 70%)',
          }}
          aria-hidden="true"
        />
        <h2 className="reveal">{CLOSE.title}</h2>
        <p className="sub reveal">{CLOSE.sub}</p>
        <form className="reveal" id={EARLY_ID} onSubmit={submit}>
          <input
            type="email"
            required
            value={address}
            placeholder={CLOSE.placeholder}
            aria-label="Your email"
            onChange={(event) => {
              setAddress(event.target.value);
              setState('idle');
            }}
          />
          <button className="btn" type="submit" ref={useMagnet()}>
            <span>{done ? CLOSE.done : CLOSE.submit}</span>
          </button>
        </form>
        <p className="fine reveal" aria-live="polite">
          {state === 'kept' ? CLOSE.local : CLOSE.fine}
        </p>
      </div>
    </div>
  );
}
