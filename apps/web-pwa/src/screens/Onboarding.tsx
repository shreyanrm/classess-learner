'use client';

/**
 * Onboarding — Wobo is the whole interface (owner redesign, 2026-07-07). She settles at the
 * centre of the screen and asks one thing at a time, aloud (voice + a line that fades in whole,
 * gently rising — no typing). There is no thread, no dots, no chrome: the last beat fades out as
 * the next fades in, so it reads as one continuous conversation. She greets, then — before any
 * get-to-know-you question — makes the space theirs: sign-in is the FIRST beat and it is mandatory
 * (Google leads, phone-code the alternate). A dev bypass exists only when no account layer is
 * configured (no Supabase keys → local dev / tests). On the Google return she always asks your name
 * as its own beat — a given-name may sit prefilled, but she still asks and your answer wins — then
 * when you were born (a calendar; age is derived from it), class + board, and what you're into
 * (grounds her analogies from lesson one). She seals it with a personalised-plan promise, you step in.
 */

import { fontFamily } from '@classess/config';
import { useRegisterTarget, useWoboBus, WoboBody, type WoboMood } from '@classess/wobo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ONBOARDED_KEY, SIGNIN_SOURCE_KEY } from '../App';
import { ensureFrame } from '../data/frame';
import { useRouter } from '../shell/router';
import { rememberInterests } from '../store/mind';
import { useSdk } from '../store/sdk';
import { AmbientWash, cascade, fluidSpace, MagneticButton, rise } from '../ui/kit';
import { sfx } from '../ui/sound';
import { estimateReadMs, MuteButton, speakLine } from '../wobo/speech';
import { BoardPicker, GradePicker } from './you/GradeBoardPicker';
import {
  ageFromBirthdate,
  hasStoredName,
  loadProfile,
  resolveBoardId,
  saveProfile,
} from './you/profile';

// The first-run atmosphere (§1 ambient depth) — a soft brand dawn blooming from where Wobo
// settles at the centre, so she arrives inside her own light. Token-driven; both themes.
const ONBOARDING_WASH =
  'radial-gradient(46% 40% at 50% 38%, var(--clss-ultramarine-soft) 0%, transparent 66%),' +
  ' radial-gradient(60% 44% at 50% 40%, rgba(255,201,60,0.04) 0%, transparent 74%)';

/** Survives the Google round-trip in this tab: on return, resume at the name beat (given-name prefilled). */
const ONB_RETURN_KEY = 'clss-onb-return';
/**
 * She introduces herself ONCE, ever (owner law, 2026-09-02). This marks that the first meeting has
 * happened on this device; a learner who already knows her is greeted by name and never re-introduced.
 */
const MET_KEY = 'clss-wobo-met-v1';

/**
 * The first line a learner ever hears from her — owner copy, verbatim. "Hey there." is deliberately
 * a two-word sentence: the TTS pipeline synthesizes sentence by sentence, so her voice starts on a
 * short one and the rest streams behind it.
 */
const FIRST_MEETING_LINE =
  "Hey there. I'm Wobo, your AI wobot. I'll help you learn, and I'll be with you every step of the way.";

/** Her hand's pace when she writes a line letter by letter (matches the overlay's note pen, ms/char). */
const MS_PER_CHAR = 34;

/** Off-screen but announced — the written line reaches a screen reader whole, not letter by letter. */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Has this learner met her before? A name they actually typed counts too — a re-run is never a first
 * meeting. (Must not use loadProfile(): it fills in the seed name when nothing is stored, which would
 * make every learner look like an old friend and silence the introduction for good.)
 */
function hasMet(): boolean {
  try {
    return localStorage.getItem(MET_KEY) === '1' || hasStoredName();
  } catch {
    return false;
  }
}
function markMet(): void {
  try {
    localStorage.setItem(MET_KEY, '1');
  } catch {
    // private mode — she simply introduces herself again on a device that can't remember
  }
}
/** The given name she already knows them by, if any. */
function knownName(): string {
  try {
    return loadProfile().name?.trim().split(/\s+/)[0] ?? '';
  } catch {
    return '';
  }
}
const spring = { type: 'spring', stiffness: 320, damping: 30 } as const;
const softSpring = { type: 'spring', stiffness: 220, damping: 24 } as const;

/** Framed as fun, gathered as signal — Wobo's analogies reach for these. */
const LIKES = [
  'cricket',
  'football',
  'video games',
  'music',
  'movies',
  'drawing',
  'reading',
  'space',
  'coding',
  'animals',
  'dancing',
  'food',
];

type Phase = 'greet' | 'name' | 'age' | 'board' | 'grade' | 'likes' | 'auth';

/** "98765 43210" or "+91 98765 43210" → E.164; bare Indian numbers get +91. */
function normalizePhone(raw: string): string {
  const kept = raw.replace(/[^\d+]/g, '');
  return kept.startsWith('+') ? kept : `+91${kept}`;
}

const ghostButton: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--clss-ink-500)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 4,
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        // hairline depth (tonal-step, no shadow) on the resting chip; solid ink when chosen
        border: selected ? '0.5px solid transparent' : '0.5px solid var(--clss-hairline-on-paper)',
        background: selected ? 'var(--clss-ink-900)' : 'var(--clss-tonal)',
        color: selected ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
        borderRadius: 3,
        padding: '10px 16px',
        fontSize: '0.92rem',
        fontFamily: 'inherit',
        cursor: 'pointer',
        lineHeight: 1.2,
        transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease',
      }}
    >
      {label}
    </motion.button>
  );
}

/** The single text field this app uses for name and codes — one intention, centered, calm. */
const fieldStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: '1.15rem',
  fontFamily: 'inherit',
  color: 'var(--clss-ink-900)',
  background: 'var(--clss-tonal)',
  border: 'none',
  borderRadius: 3,
  // no inline `outline: none` — the global :focus-visible ring (main.tsx) marks the focused field
  padding: '13px 16px',
};

export function Onboarding() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useWoboBus();
  const reduced = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<Phase>('greet');
  // Her current line: it types on screen and plays aloud. `onDone` runs when the typing finishes
  // (reveal the beat's input, or — for a statement beat like the greeting — advance on its own).
  const [line, setLine] = useState('');
  // Her introduction alone is WRITTEN, letter by letter in her hand (Caveat) — everything after it
  // fades in whole. `written` is how many characters of the current line her pen has laid down.
  const [handwriting, setHandwriting] = useState(false);
  const [written, setWritten] = useState(0);
  const [promptReady, setPromptReady] = useState(false);
  const [mood, setMood] = useState<WoboMood>('idle');

  const [name, setName] = useState('');
  // She asks when they were born (free text — a year or a full date); age is derived, not asked.
  const [birthdate, setBirthdate] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  // Sign-in is the FIRST beat and it is mandatory — the additive account layer (Supabase) IS the
  // gate. `authed` tracks that ACCOUNT session (Google/phone), not the always-true dev-mock
  // identity. With no account layer (no Supabase keys → pure local dev / tests) the auth beat is
  // bypassed by config, never by the learner.
  const account = sdk.account;
  const canAuth = !!account;
  const [authed, setAuthed] = useState(() => !!account?.isAuthenticated());
  // Audio can't autoplay before a gesture — the first beat waits for one warm tap, which unlocks
  // her voice; then she greets and every later line rides the taps that advance the beats.
  const [begun, setBegun] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [authStage, setAuthStage] = useState<'phone' | 'code'>('phone');
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  const finalName = name.trim();
  // Setting up is a surface too: the beat she is on and what she is waiting for. It is what makes
  // the guided tour possible later — she can point at the very control she just asked about.
  const stageRef = useRegisterTarget<HTMLDivElement>('onboarding-stage', {
    kind: 'flow',
    label: 'setting up — the beat she is on and what she is waiting for',
    getSceneState: () => ({
      beat: phase,
      askedFor: line,
      signedIn: authed,
      name: finalName || undefined,
      grade: grade ?? undefined,
      board: boardId ?? undefined,
      interests,
    }),
  });
  // Times the input/continue reveal after each line settles (replaces the old typing-done signal).
  const revealTimer = useRef<number | undefined>(undefined);

  // --- she speaks a line: it fades in whole (gently rising — no typing) and plays aloud. The
  // input/continue reveal keys off a calm delay after the line settles, not a character count. -----
  const REVEAL_DELAY = 820;
  const penTimer = useRef<number | undefined>(undefined);
  /** A ceiling on waiting for her voice, so a dead TTS can never strand the learner on a beat. */
  const voiceTimer = useRef<number | undefined>(undefined);
  const say = (
    text: string,
    onDone?: () => void,
    opts?: { hand?: boolean; awaitVoice?: boolean },
  ) => {
    setPromptReady(false);
    setLine(text);
    // Her hand, when the line is written rather than spoken-and-shown: one character per tick,
    // instant under reduced motion. The pen and her voice start together — one performance.
    window.clearInterval(penTimer.current);
    const hand = Boolean(opts?.hand) && !reduced;
    setHandwriting(Boolean(opts?.hand));
    setWritten(hand ? 0 : text.length);
    if (hand) {
      penTimer.current = window.setInterval(() => {
        setWritten((n) => {
          if (n >= text.length) {
            window.clearInterval(penTimer.current);
            return n;
          }
          return n + 1;
        });
      }, MS_PER_CHAR);
    }
    // The reveal waits for the pen to finish the line, then the same calm beat as every other line.
    // A line she must finish saying (her introduction) also waits for her voice, so advancing never
    // cuts her off mid-word — with a ceiling, so a silent/failed TTS still releases the beat.
    const writeMs = hand ? text.length * MS_PER_CHAR : 0;
    let penDone = false;
    let voiceDone = !opts?.awaitVoice;
    const release = () => {
      if (!penDone || !voiceDone) return;
      window.clearTimeout(voiceTimer.current);
      if (onDone) onDone();
      else setPromptReady(true);
    };
    void speakLine(
      text,
      opts?.awaitVoice
        ? {
            onDone: () => {
              voiceDone = true;
              release();
            },
          }
        : undefined,
    );
    window.clearTimeout(voiceTimer.current);
    if (opts?.awaitVoice) {
      voiceTimer.current = window.setTimeout(
        () => {
          voiceDone = true;
          release();
        },
        REVEAL_DELAY + writeMs + estimateReadMs(text) + 4000,
      );
    }
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      penDone = true;
      release();
    }, REVEAL_DELAY + writeMs);
  };

  // --- the beats (a soft tick marks each advance; nothing on typing / idle) ---------------------
  const toName = () => {
    sfx.tap();
    setPhase('name');
    say('So — what should I call you?');
  };
  const toAge = (who: string) => {
    sfx.tap();
    setPhase('age');
    say(`Lovely to meet you, ${who}. So — when did you land on this planet? Pop your birthday in.`);
  };
  const toBoard = () => {
    sfx.tap();
    setPhase('board');
    say(`Which board are you on, ${finalName}?`);
  };
  const toGrade = () => {
    sfx.tap();
    setPhase('grade');
    say(`And which class, ${finalName}?`);
  };
  const toLikes = () => {
    sfx.tap();
    setPhase('likes');
    say(`Last fun one, ${finalName} — what are you into these days?`);
  };
  const toAuth = () => {
    sfx.tap();
    setPhase('auth');
    say(
      "First — let's make this space truly yours. One sign-in and everything you build here follows you everywhere.",
    );
  };
  // Everything gathered — persist locally, seal the onboarded marker + world onto the account (so a
  // future sign-in reconstructs it and lands home), and hand to the building theatre (FrameBuilding).
  const goBuilding = () => {
    if (grade && boardId) {
      saveProfile({
        name: finalName,
        grade,
        boardId,
        birthdate: birthdate || undefined,
        age: age ?? undefined,
        interests,
      });
      // board stored as its raw id so a restore rebuilds the frame; archetype_slot carries the
      // onboarded sentinel (a real column — no schema change). Best-effort; local stays the truth.
      // ponytail: birthdate/interests aren't in profiles_cache on this project, so they stay
      // local-only — cross-device restore of those needs the columns added, name/board/grade suffice.
      void account?.syncProfile({
        display_name: finalName,
        grade,
        board: boardId,
        archetype_slot: 'onboarded',
      });
    }
    rememberInterests(interests);
    sfx.reveal(); // her big moment — the world-build handoff
    router.replace({ name: 'building' });
  };

  // After the greeting: sign-in is the first ask (mandatory) unless there's no account layer
  // (local dev / tests), where we go straight to the name beat.
  const afterGreet = () => (canAuth && !authed ? toAuth() : toName());

  // The first warm tap unlocks her voice inside the gesture, then she greets and the flow begins.
  // A first meeting gets her introduction — verbatim owner copy, written in her hand and spoken.
  // Anyone she has already met is greeted by name and NEVER introduced again.
  const begin = () => {
    if (begun) return;
    setBegun(true);
    sfx.tap(); // the gesture that unlocks her voice — and ticks the first beat in
    const known = knownName();
    if (hasMet()) {
      say(known ? `Good to see you again, ${known}.` : 'Good to see you again.', () =>
        window.setTimeout(afterGreet, 600),
      );
      return;
    }
    markMet();
    say(FIRST_MEETING_LINE, () => window.setTimeout(afterGreet, 600), {
      hand: true,
      awaitVoice: true,
    });
  };

  // A Google return, resolved: an already-onboarded account skips every question and lands home
  // with one warm line; a new account resumes at the name beat (she ALWAYS asks — the Google
  // given-name only prefills, their answer wins).
  const resumeAfterAuth = async () => {
    const remote = (await account?.fetchProfile().catch(() => null)) ?? null;
    const restorable = remote?.archetype_slot === 'onboarded' && !!remote.grade && !!remote.board;
    if (restorable) {
      const p = loadProfile();
      const boardId = resolveBoardId(remote?.board) ?? p.boardId;
      const grade = (remote?.grade as string | undefined) ?? p.grade;
      // remote wins for identity/board/grade; local keeps birthdate/interests it already holds
      saveProfile({
        ...p,
        name: (remote?.display_name ?? p.name).trim() || p.name,
        grade,
        boardId,
      });
      void ensureFrame(boardId, grade); // warm their world before they land on it
      localStorage.setItem(ONBOARDED_KEY, '1');
      const given = (remote?.display_name ?? p.name).trim().split(/\s+/)[0];
      say(`Welcome back${given ? `, ${given}` : ''}.`);
      window.setTimeout(() => router.replace({ name: 'home' }), 1600);
      return;
    }
    const given = account?.profile()?.name?.trim().split(/\s+/)[0];
    if (given) setName(given);
    toName();
  };

  // Boot: a Google return resumes (restore-and-home, or the name beat prefilled). Otherwise the
  // first beat waits for the warm begin tap. A reload without a session simply replays this and,
  // after the greeting, lands back on the mandatory auth gate.
  const booted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once boot, guarded by booted ref
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (sessionStorage.getItem(ONB_RETURN_KEY) && account?.isAuthenticated()) {
      sessionStorage.removeItem(ONB_RETURN_KEY);
      setAuthed(true);
      setBegun(true); // returning from an OAuth gesture — no separate begin tap needed
      void resumeAfterAuth();
    }
  }, [sdk]);

  // Don't leave the reveal timer or her pen running past unmount.
  useEffect(
    () => () => {
      window.clearTimeout(revealTimer.current);
      window.clearTimeout(voiceTimer.current);
      window.clearInterval(penTimer.current);
    },
    [],
  );

  useEffect(() => {
    bus.publishPage({
      route: 'onboarding',
      state: {
        phase,
        name: name || undefined,
        age: age ?? undefined,
        grade: grade ?? undefined,
        board: boardId ?? undefined,
        interests: interests.length ? interests : undefined,
        signedIn: authed,
      },
    });
  }, [bus, phase, name, age, grade, boardId, interests, authed]);

  // --- answers ---------------------------------------------------------------------------------
  const submitName = () => {
    const n = name.trim();
    if (!n) return;
    setName(n);
    setMood('celebrate');
    window.setTimeout(() => setMood('idle'), 800);
    toAge(n);
  };
  const submitBirthdate = () => {
    const b = birthdate.trim();
    if (!b) return; // capture stays mandatory — but whatever they give, we take it (no value gate)
    setBirthdate(b);
    setAge(ageFromBirthdate(b) ?? null);
    setMood('celebrate');
    window.setTimeout(() => setMood('idle'), 600);
    toBoard();
  };
  const submitBoard = () => {
    if (!boardId) return;
    toGrade();
  };
  const submitGrade = () => {
    if (!grade) return;
    toLikes();
  };
  const toggleLike = (l: string) =>
    setInterests((xs) => (xs.includes(l) ? xs.filter((x) => x !== l) : [...xs, l]));
  const submitLikes = () => goBuilding();

  // --- the sign-in beat's moves (live mode) ----------------------------------------------------
  const sendCode = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, '').length < 10) {
      setAuthErr('That number looks short — check it once more');
      return;
    }
    setAuthBusy(true);
    setAuthErr(null);
    setMood('thinking');
    try {
      await sdk.identity.auth.requestPhoneOtp(normalized);
      setAuthStage('code');
      setMood('listening');
    } catch {
      setAuthErr('The code could not go out — check the number and try again');
      setMood('hint');
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyCode = async (candidate: string) => {
    setAuthBusy(true);
    setAuthErr(null);
    setMood('thinking');
    try {
      await sdk.identity.auth.verifyPhoneOtp(normalizePhone(phone), candidate);
      localStorage.setItem(SIGNIN_SOURCE_KEY, 'phone');
      setAuthed(true);
      void resumeAfterAuth(); // existing account → home; new → the name beat (she still asks)
    } catch {
      setAuthErr('That code did not match — take another look and try again');
      setMood('oops');
    } finally {
      setAuthBusy(false);
    }
  };

  const withGoogle = async () => {
    // Auth is beat one — nothing gathered yet. Mark the return so boot resumes here, signed in
    // (the additive account layer runs the redirect and completes it on the way back).
    sessionStorage.setItem(ONB_RETURN_KEY, '1');
    localStorage.setItem(SIGNIN_SOURCE_KEY, 'google');
    try {
      await account?.signInWithGoogle(window.location.origin);
    } catch {
      sessionStorage.removeItem(ONB_RETURN_KEY);
      setAuthErr('Google did not open — the phone code works just as well');
      setShowPhone(true);
    }
  };

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    router.replace({ name: 'home' });
  };

  const nameReady = name.trim().length > 0;

  return (
    <div
      ref={stageRef}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: `${fluidSpace.xl} ${fluidSpace.gutter}`,
        position: 'relative',
        isolation: 'isolate',
        gap: fluidSpace.md,
      }}
    >
      <AmbientWash gradient={ONBOARDING_WASH} />
      {/* the one control on the page — she speaks every line, so muting is always within reach */}
      <div style={{ position: 'fixed', top: fluidSpace.sm, right: fluidSpace.sm, zIndex: 2 }}>
        <MuteButton />
      </div>

      {/* she settles at the centre — the whole interface, present before a word is asked */}
      <motion.div
        initial={{ scale: 0.55, y: -46, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
        style={{ display: 'grid', placeItems: 'center', position: 'relative' }}
      >
        {/* her own light — the one earned pigment hit, ultramarine "ignite at rest": a soft halo
            that breathes so she reads as alive, brighter before the first tap (the door). Behind
            her body, never intercepts the tap; static under reduced motion. */}
        <motion.div
          aria-hidden
          initial={false}
          animate={
            reduced
              ? { opacity: begun ? 0.32 : 0.46 }
              : {
                  opacity: begun ? [0.24, 0.42, 0.24] : [0.36, 0.62, 0.36],
                  scale: [1, 1.09, 1],
                }
          }
          transition={
            reduced
              ? { duration: 0.4 }
              : { duration: begun ? 4.6 : 3.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          }
          style={{
            position: 'absolute',
            width: 230,
            height: 230,
            left: '50%',
            top: '50%',
            marginLeft: -115,
            marginTop: -115,
            borderRadius: '50%',
            background:
              'radial-gradient(closest-side, var(--clss-ultramarine-soft) 0%, transparent 72%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            // behind her body but scoped to this transformed wrapper's own stacking context
            zIndex: -1,
          }}
        />
        <WoboBody
          size={112}
          mood={mood}
          gaze="pointer"
          label={begun ? 'Wobo' : 'Wobo — tap to begin'}
          onTap={() => {
            if (!begun) {
              begin(); // her body is the tap that unlocks her voice
              return;
            }
            setMood('celebrate');
            window.setTimeout(() => setMood('idle'), 1000);
          }}
        />
      </motion.div>

      {/* one beat at a time — her line and its single input, the last fading out as the next fades in */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: fluidSpace.md,
        }}
      >
        {!begun ? (
          // The one gesture that unlocks her voice — she can't autoplay before it. Her body above is
          // tappable too; this is the warm, obvious door in.
          <motion.div
            variants={cascade}
            initial="hidden"
            animate="show"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: fluidSpace.md,
            }}
          >
            <motion.div
              variants={rise}
              style={{
                fontSize: 'clamp(1.32rem, 1.05rem + 1.5vw, 1.9rem)',
                fontWeight: 550,
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
                color: 'var(--clss-ink-900)',
                textAlign: 'center',
              }}
            >
              Ready when you are.
            </motion.div>
            <motion.div variants={rise}>
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={begin}
                ariaLabel="begin"
                style={{ minWidth: 160, justifyContent: 'center' }}
              >
                Tap to begin
              </MagneticButton>
            </motion.div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(6px)', transition: { duration: 0.24 } }}
              transition={softSpring}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: fluidSpace.md,
              }}
            >
              {/* her question — the only text on screen; the whole line fades in and gently rises
                (MOTION §3 spring), no typing. Keyed by the line so each new one re-animates. */}
              <div
                style={
                  handwriting
                    ? {
                        // her introduction, in her own hand — larger, warmer, and written on
                        fontFamily: fontFamily.handwritten,
                        fontSize: 'clamp(1.7rem, 1.2rem + 2.4vw, 2.6rem)',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        color: 'var(--clss-ink-900)',
                        textAlign: 'center',
                        textWrap: 'balance',
                        maxWidth: 560,
                        minHeight: '2.6em',
                      }
                    : {
                        fontSize: 'clamp(1.32rem, 1.05rem + 1.5vw, 1.9rem)',
                        fontWeight: 550,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.35,
                        color: 'var(--clss-ink-900)',
                        textAlign: 'center',
                        textWrap: 'balance',
                        maxWidth: 520,
                        minHeight: '2.6em',
                      }
                }
              >
                {handwriting ? (
                  // The pen lays the line down letter by letter; assistive tech reads the whole
                  // line at once (aria-label) rather than announcing every keystroke.
                  <div>
                    <span aria-hidden>{line.slice(0, written)}</span>
                    <span style={SR_ONLY}>{line}</span>
                  </div>
                ) : (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={softSpring}
                  >
                    {line}
                  </motion.div>
                )}
              </div>

              {/* the beat's single input, revealed once she has finished asking */}
              <AnimatePresence>
                {promptReady && phase === 'name' && (
                  <motion.div
                    key="i-name"
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: 380,
                    }}
                  >
                    <input
                      // biome-ignore lint/a11y/noAutofocus: the input is this beat's single intention
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setMood('listening')}
                      onBlur={() => setMood('idle')}
                      onKeyDown={(e) => e.key === 'Enter' && submitName()}
                      placeholder="Type your name"
                      aria-label="your name"
                      style={{ ...fieldStyle, textAlign: 'center' }}
                    />
                    {/* the continue affordance bubbles in only once there is a name to send */}
                    <AnimatePresence>
                      {nameReady && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6, x: -6 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 24 }}
                        >
                          <MagneticButton
                            size="lg"
                            variant="primary"
                            onClick={submitName}
                            ariaLabel="continue"
                            style={{ minWidth: 52, justifyContent: 'center', padding: '0 18px' }}
                          >
                            →
                          </MagneticButton>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {promptReady && phase === 'age' && (
                  <motion.div
                    key="i-age"
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: 380,
                    }}
                  >
                    <input
                      type="date"
                      // biome-ignore lint/a11y/noAutofocus: the input is this beat's single intention
                      autoFocus
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      onFocus={() => setMood('listening')}
                      onBlur={() => setMood('idle')}
                      onKeyDown={(e) => e.key === 'Enter' && submitBirthdate()}
                      aria-label="your date of birth"
                      style={{
                        ...fieldStyle,
                        textAlign: 'center',
                        cursor: 'pointer',
                        // native <input type="date"> over a picker lib (ponytail). Its calendar chrome
                        // follows the live theme so it stays legible in both. No range limit — owner law:
                        // take whatever they give; ageFromBirthdate parses the YYYY-MM-DD it yields.
                        colorScheme:
                          typeof document !== 'undefined' &&
                          document.documentElement.dataset.theme === 'dark'
                            ? 'dark'
                            : 'light',
                      }}
                    />
                    {/* the continue affordance bubbles in only once there is something to send */}
                    <AnimatePresence>
                      {birthdate.trim().length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6, x: -6 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 24 }}
                        >
                          <MagneticButton
                            size="lg"
                            variant="primary"
                            onClick={submitBirthdate}
                            ariaLabel="continue"
                            style={{ minWidth: 52, justifyContent: 'center', padding: '0 18px' }}
                          >
                            →
                          </MagneticButton>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {promptReady && phase === 'board' && (
                  <motion.div
                    key="i-board"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 18,
                      width: '100%',
                      maxWidth: 440,
                    }}
                  >
                    <BoardPicker boardId={boardId} onBoard={setBoardId} />
                    <AnimatePresence>
                      {boardId && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        >
                          <MagneticButton
                            size="lg"
                            variant="primary"
                            onClick={submitBoard}
                            style={{ minWidth: 120, justifyContent: 'center' }}
                          >
                            Next
                          </MagneticButton>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {promptReady && phase === 'grade' && (
                  <motion.div
                    key="i-grade"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 18,
                      width: '100%',
                      maxWidth: 440,
                    }}
                  >
                    <GradePicker boardId={boardId} grade={grade} onGrade={setGrade} />
                    <AnimatePresence>
                      {grade && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        >
                          <MagneticButton
                            size="lg"
                            variant="primary"
                            onClick={submitGrade}
                            style={{ minWidth: 140, justifyContent: 'center' }}
                          >
                            That's me
                          </MagneticButton>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {promptReady && phase === 'likes' && (
                  <motion.div
                    key="i-likes"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 16,
                      maxWidth: 460,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {LIKES.map((l) => (
                        <Chip
                          key={l}
                          label={l}
                          selected={interests.includes(l)}
                          onClick={() => toggleLike(l)}
                        />
                      ))}
                    </div>
                    <MagneticButton
                      size="lg"
                      variant="primary"
                      onClick={submitLikes}
                      style={{ minWidth: 150, justifyContent: 'center' }}
                    >
                      {interests.length ? 'That’s me' : 'A bit of everything'}
                    </MagneticButton>
                  </motion.div>
                )}

                {promptReady && phase === 'auth' && (
                  <motion.div
                    key="i-auth"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={spring}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      maxWidth: 380,
                    }}
                  >
                    {/* Google leads — one tap keeps it safe across devices */}
                    <MagneticButton
                      size="lg"
                      variant="primary"
                      disabled={authBusy}
                      onClick={() => void withGoogle()}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Continue with Google
                    </MagneticButton>

                    {!showPhone ? (
                      <button type="button" onClick={() => setShowPhone(true)} style={ghostButton}>
                        Or use your phone
                      </button>
                    ) : authStage === 'phone' ? (
                      <div
                        style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}
                      >
                        <input
                          type="tel"
                          inputMode="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onFocus={() => setMood('listening')}
                          onBlur={() => setMood('idle')}
                          onKeyDown={(e) => e.key === 'Enter' && !authBusy && void sendCode()}
                          placeholder="Your phone number"
                          aria-label="your phone number"
                          style={fieldStyle}
                        />
                        <MagneticButton
                          size="lg"
                          variant="primary"
                          disabled={authBusy}
                          onClick={() => void sendCode()}
                          style={{ minWidth: 92, justifyContent: 'center' }}
                        >
                          {authBusy ? 'sending…' : 'send'}
                        </MagneticButton>
                      </div>
                    ) : (
                      <div
                        style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}
                      >
                        <input
                          // biome-ignore lint/a11y/noAutofocus: the code is this stage's single intention
                          autoFocus
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={code}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setCode(digits);
                            if (digits.length === 6 && !authBusy) void verifyCode(digits);
                          }}
                          onFocus={() => setMood('listening')}
                          placeholder="6-digit code"
                          aria-label="the six-digit code we texted you"
                          style={{ ...fieldStyle, letterSpacing: '0.3em', textAlign: 'center' }}
                        />
                        <MagneticButton
                          size="lg"
                          variant="primary"
                          disabled={authBusy || code.length < 6}
                          onClick={() => void verifyCode(code)}
                          style={{ minWidth: 92, justifyContent: 'center' }}
                        >
                          {authBusy ? '…' : 'go'}
                        </MagneticButton>
                      </div>
                    )}
                    {authErr && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>
                        {authErr}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* a dev door out — ONLY when no account layer is configured (pure local dev / tests). With
          Supabase keys present, sign-in is mandatory and there is no skip. */}
      {!canAuth && (
        <button
          type="button"
          onClick={skip}
          style={{ ...ghostButton, position: 'fixed', bottom: fluidSpace.sm }}
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
