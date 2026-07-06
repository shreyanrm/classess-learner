'use client';

/**
 * Vidya, alive. The package gives us her locked identity (the molten jelly, the flame, the eyes);
 * this is her CHOREOGRAPHY — the Vidya-cute license made real. She never just "appears": she arcs in
 * from a corner, rises from behind the card, swoops across, and glides to her dock, differently on
 * every screen, so she surprises without ever becoming unrecognisable. Depth is her flame, never a
 * shadow. Reduced motion collapses every entrance to a calm fade.
 */

import { frost, hairline, ink, radius, space, typeScale, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import {
  useVidyaBus,
  VidyaOverlay,
  VidyaPanel,
  VidyaPresence,
  type VidyaTurn,
} from '@classess/vidya';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

type Entrance = 'arc' | 'rise' | 'swoop' | 'drop' | 'zoom';

interface EntranceSpec {
  initial: Record<string, number>;
  animate: Record<string, number | number[]>;
  transition: Transition;
}

const SETTLE: Transition = { duration: 0.9, ease: [0.16, 1, 0.3, 1], times: [0, 0.62, 1] };

/** Each entrance ends at the dock (0,0). She overshoots a touch, then settles — playful, not bouncy. */
const ENTRANCES: Record<Entrance, EntranceSpec> = {
  arc: {
    initial: { x: 150, y: -190, scale: 0.35, opacity: 0, rotate: 12 },
    animate: {
      x: [150, 34, 0],
      y: [-190, 22, 0],
      scale: [0.35, 1.06, 1],
      opacity: [0, 1, 1],
      rotate: [12, -4, 0],
    },
    transition: SETTLE,
  },
  rise: {
    initial: { x: 0, y: 240, scale: 0.5, opacity: 0 },
    animate: { y: [240, -22, 0], scale: [0.5, 1.08, 1], opacity: [0, 1, 1] },
    transition: SETTLE,
  },
  swoop: {
    initial: { x: -360, y: 60, scale: 0.4, opacity: 0, rotate: -16 },
    animate: {
      x: [-360, 26, 0],
      y: [60, -8, 0],
      scale: [0.4, 1.05, 1],
      opacity: [0, 1, 1],
      rotate: [-16, 3, 0],
    },
    transition: SETTLE,
  },
  drop: {
    initial: { x: 0, y: -300, scale: 0.6, opacity: 0 },
    animate: { y: [-300, 14, 0], scale: [0.6, 1.05, 1], opacity: [0, 1, 1] },
    transition: SETTLE,
  },
  zoom: {
    initial: { x: 0, y: 0, scale: 0, opacity: 0 },
    animate: { scale: [0, 1.14, 1], opacity: [0, 1, 1] },
    transition: SETTLE,
  },
};

const ORDER: Entrance[] = ['arc', 'rise', 'swoop', 'drop', 'zoom'];

/** Deterministic-but-varied entrance per screen key (so each screen has its own way of arriving). */
function entranceFor(key: string): Entrance {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ORDER[h % ORDER.length] as Entrance;
}

/** A calm offer chip — power available, never imposed (mirrors the package's offer, app-styled). */
function Offer() {
  const bus = useVidyaBus();
  const offer = bus.pendingOffer;
  if (!offer) return null;
  const text =
    offer.reason ??
    (offer.type === 'navigate'
      ? 'Shall we head there?'
      : offer.type === 'startPractice'
        ? 'Want to try a short practice?'
        : 'Shall we look at this another way?');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 8 }}
      role="dialog"
      aria-label="Vidya suggestion"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 108,
        zIndex: zIndex.panel,
        maxWidth: 260,
        padding: space[2],
        borderRadius: radius.lg,
        border: `1px solid ${hairline.onPaper}`,
        background: frost.onPaper,
        backdropFilter: `blur(${frost.blur})`,
        WebkitBackdropFilter: `blur(${frost.blur})`,
      }}
    >
      <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[900] }}>{text}</p>
      <div style={{ display: 'flex', gap: space[1], marginTop: space[1] }}>
        <button
          type="button"
          onClick={() => bus.acceptOffer()}
          style={{
            border: 0,
            borderRadius: radius.sm,
            padding: `${space.half}px ${space[2]}px`,
            background: ink[900],
            color: '#fff',
            cursor: 'pointer',
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
          }}
        >
          Not now
        </button>
      </div>
    </motion.div>
  );
}

export interface LivingVidyaProps {
  turns: VidyaTurn[];
  onSend?: (text: string) => void;
  /** Changing this key replays her entrance — pass the current route name. */
  entranceKey: string;
  listening?: boolean;
  onToggleVoice?: () => void;
}

export function LivingVidya({
  turns,
  onSend,
  entranceKey,
  listening = false,
  onToggleVoice,
}: LivingVidyaProps) {
  const bus = useVidyaBus();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const spec = useMemo(() => ENTRANCES[entranceFor(entranceKey)], [entranceKey]);

  // A tiny anticipatory beat: she blinks awake a moment after she lands.
  const [awake, setAwake] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: entranceKey re-triggers the wake beat on every route change.
  useEffect(() => {
    setAwake(false);
    const t = window.setTimeout(() => setAwake(true), reduced ? 0 : 700);
    return () => window.clearTimeout(t);
  }, [entranceKey, reduced]);

  // A lived-in flame flicker while she rests, so she never feels static.
  const [flick, setFlick] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setFlick((f) => !f), 4500);
    return () => window.clearInterval(t);
  }, [reduced]);

  const resting = !open && !listening && (bus.mood === 'idle' || bus.mood === 'waiting');
  const restFlame = resting ? (flick ? 'steady' : 'ember') : undefined;

  return (
    <>
      <VidyaOverlay />
      <AnimatePresence>
        <Offer />
      </AnimatePresence>

      <motion.div
        key={entranceKey}
        initial={reduced ? { opacity: 0 } : spec.initial}
        animate={reduced ? { opacity: 1 } : spec.animate}
        transition={reduced ? { duration: 0.2 } : spec.transition}
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: zIndex.vidyaPresence }}
      >
        {/* Inner idle life: a gentle playful sway while she rests, independent of her entrance. */}
        <motion.div
          animate={reduced || open ? {} : { x: [0, 3, -2, 0], rotate: [0, -2.5, 1.5, 0] }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 9, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          }
        >
          <VidyaPresence
            size={72}
            mood={listening ? 'listening' : awake ? bus.mood : 'waiting'}
            flame={restFlame}
            onTap={() => setOpen((o) => !o)}
          />
        </motion.div>
      </motion.div>

      <VidyaPanel
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
