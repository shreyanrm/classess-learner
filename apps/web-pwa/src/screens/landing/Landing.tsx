'use client';

/**
 * The landing page — what someone who has never met Wobo sees first.
 *
 * It is the unauthenticated root route: a visitor with no account and no completed onboarding lands
 * here, and every door on the page (sign in, start free, both plan buttons, the closing call) opens
 * Wobo's onboarding flow, which is where the sign-in beat lives. There are no `/sign-in` or
 * `/sign-up` routes to link to yet, and inventing dead ones would be worse than one honest door.
 *
 * The three pieces of craft on it, and the rule each obeys:
 *
 *  · the ink field (`field.ts`) — subject strokes drifting behind the page in one WebGL draw call.
 *    Paused when the page is scrolled away or the tab is hidden; a single static frame under
 *    reduced motion; silently absent where WebGL is not available.
 *  · the ink cursor (`cursor.tsx`) — the pointer becomes a pen. Native cursor on touch and under
 *    reduced motion. It never touches focus, so keyboard focus rings are exactly as they are
 *    everywhere else in the app.
 *  · the reveals (`scroll.ts`) — sections settle as they arrive, from a resting state that is
 *    already legible. Nothing on this page is invisible at load.
 *
 * Every element on it is accounted for in `scratchpad/wave7a/landing-inventory.md` (WOBO-PLAN §15).
 */

import { useReducedMotion } from '@wobo/motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '../../shell/router';
import { InkCursor, inkCursorAllowed, readCursorEnvironment } from './cursor';
import { type FieldHandle, fieldOpacity, startField } from './field';
import { useDocumentVisible, useNearTop } from './scroll';
import { Boards } from './sections/Boards';
import { Demo } from './sections/Demo';
import { Closing, Footer } from './sections/Footer';
import { Hero } from './sections/Hero';
import { Nav } from './sections/Nav';
import { Plans } from './sections/Plans';
import { Promises } from './sections/Promises';
import { Teaches } from './sections/Teaches';
import { ensureLandingStyles } from './styles';

// The chunk arriving IS the page being opened, so the stylesheet goes in at import time rather than
// in an effect — an effect would let the first paint land unstyled for a frame.
ensureLandingStyles();

/** The live value of a `--wobo-*` token, so the field and the nib follow the theme. */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * A host element for the field, pinned to the FRONT of `document.body`.
 *
 * Both halves of that sentence matter.
 *
 * In the body, because the app mounts every screen inside a `motion.div` carrying
 * `will-change: transform`, which makes that element the containing block for `position: fixed`
 * descendants — a field left inside the page would size itself to the whole document instead of the
 * viewport and stretch every stroke to five thousand pixels tall.
 *
 * At the front, because that same `will-change` also makes the screen wrapper a stacking context at
 * `z-index: auto`, and the field is one at `z-index: 0`. Two stacking contexts on the same level
 * paint in DOM order, and React's own portal APPENDS — so a field portalled into the body landed
 * after the app and painted over it. That is exactly the bug the proofs caught: subject strokes
 * running through the demo board's interior and across the paragraph beside it, worst in dark where
 * the pigment is brightest. Inserted before the app instead, the field paints above the body's page
 * colour and below every pixel the page draws, which is the whole of what it was ever meant to do.
 */
function useFieldHost(): HTMLDivElement | null {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'lp-field';
    el.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(el, document.body.firstChild);
    setHost(el);
    return () => {
      el.remove();
      setHost(null);
    };
  }, []);
  return host;
}

/** The ink field itself, drawn into that host. */
function InkField({ ink, theme }: { ink: string; theme: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useDocumentVisible();
  const near = useNearTop(2);
  const reduced = useReducedMotion();
  const handleRef = useRef<FieldHandle | null>(null);
  const host = useFieldHost();

  // `host` is what makes the canvas exist: the portal below renders only once it is there, so this
  // effect has to re-run when it arrives. Dropping it leaves this running once against a null ref
  // and the field never starts at all.
  // biome-ignore lint/correctness/useExhaustiveDependencies: host gates the ref this effect reads
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = startField(canvas, {
      ink,
      opacity: fieldOpacity(theme, reduced),
      still: reduced,
    });
    handleRef.current = handle;
    return () => {
      handle?.stop();
      handleRef.current = null;
    };
  }, [ink, reduced, theme, host]);

  // Scrolled past the field's part of the page, or in a background tab: stop the loop. This is the
  // whole "GPU-cheap" claim — reading the boards, or leaving the tab, costs exactly nothing.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (near && visible) handle.resume();
    else handle.pause();
  }, [near, visible]);

  if (!host) return null;
  return createPortal(
    <canvas ref={canvasRef} style={{ display: 'block', height: '100%', width: '100%' }} />,
    host,
  );
}

export function Landing() {
  const router = useRouter();
  const [ink, setInk] = useState('#1F35E0');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pen, setPen] = useState(false);

  // The three things that have to read the live theme and the live device, done in an effect so the
  // first render is deterministic and none of them runs where there is no window. `data-theme` is
  // written on the root at boot by ui/theme.ts and is always one of the two.
  useEffect(() => {
    setInk(token('--wobo-ultramarine', '#1F35E0'));
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    setPen(inkCursorAllowed(readCursorEnvironment()));
  }, []);

  // Every door leads to the same place: Wobo's onboarding, where signing in happens.
  const start = () => router.navigate({ name: 'onboarding' });

  return (
    <div className="lp">
      <InkField ink={ink} theme={theme} />
      {pen ? <InkCursor ink={ink} /> : null}
      <div className="lp-body">
        <Nav onStart={start} onSignIn={start} />
        <Hero onStart={start} />
        <Teaches />
        <Demo />
        <Boards />
        <Promises />
        <Plans onStart={start} />
        <Closing onStart={start} />
        <Footer />
      </div>
    </div>
  );
}
