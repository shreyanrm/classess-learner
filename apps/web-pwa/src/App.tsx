'use client';

/**
 * The spine. Identity → SDK → Vidya's bus → the router → screens. Vidya is the runtime the app
 * executes inside (DESIGN.md §4): the home is her front door; everywhere else she is docked,
 * reading the page at code level through the context bus, one tap from expanding.
 */

import { createSdk, type Sdk } from '@classess/sdk';
import {
  parseActions,
  useVidyaBus,
  type VidyaHandlers,
  type VidyaMood,
  VidyaOverlay,
  VidyaProvider,
} from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Discovery, DISCOVERY_DEMO } from './engines/Discovery';
import { ActionBar, type BarState } from './screens/course/shared';
import { ChatScreen } from './screens/ChatScreen';
import { Course } from './screens/Course';
import { ConceptA } from './screens/concepts/ConceptA';
import { ConceptB } from './screens/concepts/ConceptB';
import { ConceptC } from './screens/concepts/ConceptC';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { Onboarding } from './screens/Onboarding';
import { Practice } from './screens/Practice';
import { ProgressScreen } from './screens/ProgressScreen';
import { SubjectScreen } from './screens/SubjectScreen';
import { You } from './screens/You';
import { boardName, loadProfile, mergeAccount } from './screens/you/profile';
import { CommandPalette } from './shell/CommandPalette';
import { resolveDestination } from './shell/destinations';
import { type Route, RouterProvider, useRouter } from './shell/router';
import { DownloadCenter } from './store/DownloadCenter';
import { machineRoomSnapshot } from './store/machine-room';
import {
  clearMind,
  forgetMatching,
  lifetimeSnapshot,
  loadMind,
  MindObserver,
  mindLines,
  rememberFact,
} from './store/mind';
import { ProgressProvider, useProgress } from './store/progress';
import { SdkProvider } from './store/sdk';
import { AppHeader } from './ui/AppHeader';
import { ClickInk } from './ui/ClickInk';
import { CeremonyHost } from './ui/ceremony';
import { sfx } from './ui/sound';
import { VidyaCompanion } from './vidya/Companion';
import {
  appendToArchive,
  CHAT_PAGE,
  type ChatTurn,
  readArchive,
  updateArchiveTurn,
  VidyaChatProvider,
  writeArchive,
} from './vidya/chat';
import { resolveTurnExtras, type TurnExtras } from './vidya/paths';
import { SpeechNarrator, speakLine } from './vidya/speech';

const LLM_MODE = (import.meta.env.VITE_LLM_MODE as 'mock' | 'live' | undefined) ?? 'mock';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;
// Live auth (Supabase phone-OTP + Google) only when explicitly flipped; dev mock stays the default.
const DEV_AUTH = (import.meta.env.VITE_DEV_AUTH as string | undefined) !== 'false';
// Live persistence (Supabase learner_state / learner_threads / outbox) — env only, keyless => local.
const PERSIST_MODE = (import.meta.env.VITE_PERSIST_MODE as 'local' | 'live' | undefined) ?? 'local';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_DEV_JWT = import.meta.env.VITE_SUPABASE_DEV_JWT as string | undefined;

/** Zero-argument destinations Vidya may offer to navigate to. */
const NAV_ROUTES: Record<string, Route> = {
  home: { name: 'home' },
  chat: { name: 'chat' },
  learn: { name: 'learn' },
  practice: { name: 'practice' },
  progress: { name: 'progress' },
  you: { name: 'you' },
};

export const ONBOARDED_KEY = 'clss-onboarded-v1';
/** Set by the sign-in beat; the next boot records identity.subject.created.v1 fully attributed. */
export const SIGNIN_SOURCE_KEY = 'clss-signin-source-v1';

// The shared-axis law (MOTION.md §2): navigation is spatial. Nav-level routes are siblings —
// they crossfade with a small rise, silently. Going deeper is a forward shared-axis push; back is
// its mirror; each rides the single transition sound. Scenes that own the viewport bring their own
// entrances and are never doubled with route motion.
type Dir = 'forward' | 'back' | 'sibling' | 'none';
const SIBLING_ROUTES = new Set(['home', 'chat', 'learn', 'practice', 'progress', 'you']);
const OWN_VIEWPORT_ROUTES = new Set(['onboarding', 'concept']);
const SHARED_SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const;

function classifyTransition(
  prev: { name: string; depth: number } | null,
  name: string,
  depth: number,
): Dir {
  if (!prev) return 'none';
  if (OWN_VIEWPORT_ROUTES.has(name) || OWN_VIEWPORT_ROUTES.has(prev.name)) return 'none';
  if (SIBLING_ROUTES.has(name) && SIBLING_ROUTES.has(prev.name)) return 'sibling';
  return depth < prev.depth ? 'back' : 'forward';
}

const screenVariants = {
  enter: (d: Dir) =>
    d === 'sibling'
      ? { opacity: 0, y: 8, x: 0 }
      : d === 'back'
        ? { opacity: 0, x: -24, y: 0 }
        : d === 'forward'
          ? { opacity: 0, x: 24, y: 0 }
          : { opacity: 1, x: 0, y: 0 },
  center: (d: Dir) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition:
      d === 'sibling'
        ? { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
        : d === 'none'
          ? { duration: 0.001 }
          : SHARED_SPRING,
  }),
  exit: (d: Dir) =>
    d === 'sibling'
      ? { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }
      : d === 'back'
        ? { opacity: 0, x: 24, transition: { duration: 0.18, ease: [0.3, 0, 0.8, 0.4] } }
        : d === 'forward'
          ? { opacity: 0, x: -24, transition: { duration: 0.18, ease: [0.3, 0, 0.8, 0.4] } }
          : { opacity: 0, transition: { duration: 0.12 } },
} as const;

// TEMP demo hatch (#discovery-demo) — proves the guided-discovery shell live; removed after capture.
function DiscoveryDemoHatch() {
  const [bar, setBar] = DemoBarState();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <main
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <Discovery spec={DISCOVERY_DEMO} hue="#FF5A1F" setBar={setBar} onDone={() => {}} />
      </main>
      <ActionBar bar={bar} />
    </div>
  );
}
function DemoBarState() {
  return useState<BarState | null>(null);
}

function Screen() {
  const { route, depth } = useRouter();
  if (typeof window !== 'undefined' && window.location.hash === '#discovery-demo') {
    return <DiscoveryDemoHatch />;
  }
  const key = JSON.stringify(route);
  const prevRef = useRef<{ name: string; depth: number } | null>(null);
  const dir = classifyTransition(prevRef.current, route.name, depth);
  // The single transition sound (MOTION.md §2) rides structural forward/back only — never a sibling
  // tab, never an own-viewport scene. Skip the first mount.
  const firstScreen = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: key is the trigger, not a body dep
  useEffect(() => {
    const d = classifyTransition(prevRef.current, route.name, depth);
    prevRef.current = { name: route.name, depth };
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    if (d === 'forward' || d === 'back') sfx.whoosh();
  }, [key]);
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div
        key={key}
        custom={dir}
        variants={screenVariants}
        initial="enter"
        animate="center"
        exit="exit"
        style={{ willChange: 'transform, opacity' }}
      >
        {route.name === 'onboarding' && <Onboarding />}
        {route.name === 'home' && <Home />}
        {route.name === 'chat' && <ChatScreen />}
        {route.name === 'learn' && <Learn />}
        {route.name === 'practice' && <Practice />}
        {route.name === 'subject' && (
          <SubjectScreen subjectId={route.subjectId} intent={route.intent} />
        )}
        {route.name === 'course' && <Course topicId={route.topicId} />}
        {route.name === 'sandbox' && <Course topicId={route.topicId ?? ''} sandbox />}
        {route.name === 'progress' && <ProgressScreen />}
        {route.name === 'you' && <You />}
        {route.name === 'concept' && route.which === 'a' && <ConceptA />}
        {route.name === 'concept' && route.which === 'b' && <ConceptB />}
        {route.name === 'concept' && route.which === 'c' && <ConceptC />}
      </motion.div>
    </AnimatePresence>
  );
}

function AppInner({ sdk }: { sdk: Sdk }) {
  const bus = useVidyaBus();
  const router = useRouter();
  const { route } = router;
  const { xp, streakDays } = useProgress();
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<VidyaMood>('idle');
  // One conversation for life: the archive is the local source of truth; only its tail loads.
  const [boot] = useState(() => {
    let archive = readArchive();
    if (archive.length === 0) {
      // migrate the old tail-only thread cache into the archive, once
      const cached = sdk.state.loadThreadCache('vidya');
      if (cached && cached.turns.length > 0) {
        archive = cached.turns
          .filter((t) => t.id !== 'seed')
          .map((t, i) => ({ ...t, id: `t${i}-${t.role}` }));
        writeArchive(archive);
      }
    }
    const start = Math.max(0, archive.length - CHAT_PAGE);
    return { tail: archive.slice(start), start };
  });
  const [turns, setTurns] = useState<ChatTurn[]>(() =>
    boot.tail.length > 0
      ? boot.tail
      : [{ id: 'seed', role: 'vidya', text: 'ask me anything — I can see the page you are on.' }],
  );
  const loadedStart = useRef(boot.start);
  const [hasOlder, setHasOlder] = useState(boot.start > 0);
  const loadOlder = () => {
    const from = Math.max(0, loadedStart.current - CHAT_PAGE);
    if (from === loadedStart.current) return;
    const older = readArchive().slice(from, loadedStart.current);
    loadedStart.current = from;
    setHasOlder(from > 0);
    setTurns((prev) => [...older, ...prev]);
  };
  // Cross-device: learner_threads reconciles in (live mode) only when this device has nothing.
  const emptyAtBoot = useRef(boot.tail.length === 0);
  useEffect(() => {
    let cancelled = false;
    sdk.state.hydrateThread('vidya').then((snapshot) => {
      if (cancelled || !snapshot || !emptyAtBoot.current || snapshot.turns.length === 0) return;
      const migrated = snapshot.turns
        .filter((t) => t.id !== 'seed')
        .map((t, i) => ({ ...t, id: `t${i}-${t.role}` }));
      writeArchive(migrated);
      loadedStart.current = Math.max(0, migrated.length - CHAT_PAGE);
      setHasOlder(loadedStart.current > 0);
      setTurns(migrated.slice(loadedStart.current));
    });
    return () => {
      cancelled = true;
    };
  }, [sdk]);
  // Save only after the conversation actually moves — re-stamping the boot snapshot "now" would
  // out-fresh an older-but-richer transcript from another device during reconciliation.
  const bootTurns = useRef(true);
  useEffect(() => {
    if (bootTurns.current) {
      bootTurns.current = false;
      return;
    }
    sdk.state.saveThread('vidya', turns.slice(-60));
  }, [sdk, turns]);

  // A real Vidya turn: she reasons over the page she is plugged into, then speaks and acts on it.
  const ask = async (text: string) => {
    const say = (t: Omit<ChatTurn, 'id'>) => {
      const turn = { ...t, id: `t${readArchive().length}-${t.role}` };
      appendToArchive(turn);
      setTurns((prev) => [...prev, turn]);
      if (t.role === 'vidya') sfx.chime(); // a gentle chime as she arrives
      return turn;
    };
    const userTurn = say({ role: 'user', text });
    setBusy(true);
    setMood('thinking');
    // Optimistic ink: she reacts in <100ms — a point at what she's looking at, before the model
    // returns. The real actions replace this the moment they land, so it never lingers wrong.
    const targets = bus.getTargets();
    const looking =
      targets.find((t) => /equation|expression|step|option/.test(t.kind)) ?? targets[0];
    if (looking) bus.dispatch([{ type: 'point', targetId: looking.id, ttl: 2200 }]);
    // She remembers what matters, not the transcript: a short recent window, with her own long
    // explanations clipped — the archive is for the learner to scroll, never re-fed to the model.
    const recent = [...turns.slice(-7), userTurn].map((t) => ({
      role: t.role,
      text:
        t.role === 'vidya' && t.text.length > 220
          ? `${t.text.slice(0, 220)}…`
          : t.text.slice(0, 600),
    }));
    // The clock rides the context (VIDYA-CAPABILITIES.md family O): a human-readable local
    // wall-clock so wellbeing turns — late-night on a school night, "I'm exhausted" — reason about
    // the real time, not a guess. Weekday + time is all she needs to sanction rest.
    const now = new Date();
    const localTime = now.toLocaleString(undefined, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
    bus.publishTurn({ recentTurns: recent, lastUserInput: text, localTime });
    // What the learner has actually been doing — the last few backbone events, compacted. Carries
    // her interaction history into the assembled context so Vidya grounds in real activity, not just
    // the static page (context-bus SessionContext.recentEvents; rendered by the gateway).
    const recentEvents = sdk.events
      .getLog()
      .slice(-6)
      .map((e) => {
        const p = (e.payload ?? {}) as Record<string, unknown>;
        const tail =
          p.correct !== undefined
            ? ` (correct=${p.correct})`
            : typeof p.assistance_level === 'string'
              ? ` (${p.assistance_level})`
              : '';
        return `${e.event_type.replace(/\.v1$/, '')}${tail}`;
      });
    bus.publishSession({ sessionId: 'dev-session', recentEvents });
    // The machine room (VIDYA-CAPABILITIES.md family J — the total-context law): the system's live
    // internal truth for this turn — the mastery-band snapshot, the FSRS due queue, XP/level/streak,
    // the event-stream tail, and any in-flight generation. The selector digests it; the gateway
    // renders it compactly so she references it naturally ("3 reviews due", "how far to level 5").
    let bands: { band: string }[] = [];
    try {
      bands = await sdk.kgtopg.mastery.getBands(sdk.config.mockSubjectId);
    } catch {
      // the mastery view is unavailable — the rest of the machine room still rides
    }
    bus.publishMachine(
      machineRoomSnapshot({
        bands,
        eventLog: sdk.events.getLog(),
        xp,
        streakDays,
        nowMs: Date.now(),
      }),
    );
    try {
      const context = bus.assembleContext();
      const result = await sdk.llm.invoke(
        'vidya.turn',
        { context },
        { consentTier: 'un_elevated' },
      );
      const output = result.output as {
        say?: string;
        actions?: unknown[];
        grounded?: boolean;
        safety?: { flagged?: boolean; category?: string; severity?: string; action?: string };
      };
      // The gateway's child-safety pass flagged this turn — record it on the event backbone.
      if (output.safety?.flagged) {
        const s = output.safety;
        sdk.events.record('safety.flag.raised.v1', {
          surface: 'vidya_chat',
          category: s.category === 'crisis' ? 'crisis' : 'moderation',
          severity: s.severity === 'low' || s.severity === 'high' ? s.severity : 'medium',
          action: s.action === 'escalated' ? 'escalated' : 'blocked',
          ...(s.category === 'crisis' ? { escalated_to: 'guardian' as const } : {}),
        });
      }
      // Navigation on command (VIDYA.md §10) — the one nav path, shared by the chat page and the
      // drawer. Any phrasing that resolves to a place navigates directly: no approval card, a spoken
      // + inked confirmation (SpeechNarrator voices her line), and never silence on a clear miss.
      // Runs on the raw text, so it works even when the classifier would have split it into an
      // approval-gated action or dropped it to inline.
      const nav = resolveDestination(text);
      if (nav) {
        say({ role: 'vidya', text: 'route' in nav ? nav.say : nav.unknown });
        sdk.events.record('vidya.turn.assistant.v1', {
          turn_id: crypto.randomUUID(),
          assistance_level: 'coach',
          hint_level: 0,
          grounded: Boolean(output.grounded),
          track: result.track,
          handed_answer: false,
        });
        if ('route' in nav) {
          setMood('explaining');
          window.setTimeout(() => router.navigate(nav.route), 650);
        } else {
          setMood('idle');
        }
        return;
      }

      const actions = parseActions(output.actions ?? []);
      // Data rights (VIDYA-CAPABILITIES.md family E, the forget verb): show or purge her memory,
      // grounded in the real on-device dossier — never the model's guess. Deleting is honest: she
      // reports exactly what left (or that there was nothing), so no fake confirmation ever lands.
      // The forget action is destructive; the gateway prompt gates it (confirm-before-execute) so
      // she only emits a delete after the learner says yes.
      const forgets = actions.filter((a) => a.type === 'forget');
      if (forgets.length > 0) {
        for (const a of forgets) {
          if (a.type !== 'forget') continue; // narrow the discriminated union
          if (a.scope === 'show') {
            const lines = mindLines(loadMind());
            say({
              role: 'vidya',
              text:
                lines.length > 0
                  ? `here is everything I am keeping about you:\n${lines
                      .map((l) => `· ${l}`)
                      .join('\n')}\n\nsay the word and I will forget any of it.`
                  : 'I have not saved anything about you yet — tell me what matters and I will keep it.',
            });
          } else if (a.scope === 'all') {
            clearMind();
            bus.publishLifetime({});
            say({
              role: 'vidya',
              text: 'done — I cleared everything I was keeping about you. we start fresh from here.',
            });
          } else {
            const removed = forgetMatching(a.target ?? '');
            bus.publishLifetime(lifetimeSnapshot());
            say({
              role: 'vidya',
              text:
                removed.length > 0
                  ? `forgotten — I let go of “${removed.join('”, “')}”.`
                  : 'I could not find that in what I remember — nothing to forget there.',
            });
          }
        }
      } else {
        // The five-path orchestrator (VIDYA.md §6): the gateway's classification wins; unclassified
        // turns fall to the deterministic keyword classifier so every mode works keyless.
        const extras = resolveTurnExtras(
          output as Record<string, unknown>,
          text,
          context.curriculum?.nodeName,
        );
        say({
          role: 'vidya',
          text: output.say ?? 'let us look at this together.',
          ...(extras.path !== 'inline' ? { extras } : {}),
        });
        // the route path: she takes you there herself, docked — after her line lands
        if (extras.route) {
          const dest = NAV_ROUTES[extras.route.to];
          if (dest) window.setTimeout(() => router.navigate(dest), 650);
        }
      }
      // her turn on the event backbone — attributed, grounded, accountable
      sdk.events.record('vidya.turn.assistant.v1', {
        turn_id: crypto.randomUUID(),
        assistance_level: 'coach',
        hint_level: 0,
        grounded: Boolean(output.grounded),
        track: result.track,
        handed_answer: false,
      });
      bus.dispatch(actions);
      setMood(actions.length > 0 ? 'explaining' : 'idle');
    } catch {
      say({ role: 'vidya', text: 'give me a moment, then ask me again.' });
      setMood('idle');
    } finally {
      setBusy(false);
    }
  };

  // Approval outcomes and action results patch the turn wherever it is rendered — and the archive,
  // so a decided card never re-offers after reload.
  const updateTurn = (id: string, patch: (extras: TurnExtras) => TurnExtras) => {
    const apply = (t: ChatTurn): ChatTurn =>
      t.id === id && t.extras ? { ...t, extras: patch(t.extras) } : t;
    setTurns((prev) => prev.map(apply));
    updateArchiveTurn(id, apply);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ask is recreated with turns; tracking turns/busy/mood covers it
  const chat = useMemo(
    () => ({ turns, ask, busy, mood, setMood, hasOlder, loadOlder, updateTurn }),
    [turns, busy, mood, hasOlder],
  );

  // The first authenticated boot after the sign-in beat: record the subject's creation, fully
  // attributed to the real auth.uid() through the live outbox.
  useEffect(() => {
    const source = localStorage.getItem(SIGNIN_SOURCE_KEY);
    if (!source || !sdk.identity.isAuthenticated()) return;
    localStorage.removeItem(SIGNIN_SOURCE_KEY);
    sdk.events.record('identity.subject.created.v1', {
      source: source === 'google' ? 'linked' : 'phone_otp',
      age_branch: 'unknown',
      consent_tier_initial: 'un_elevated',
    });
  }, [sdk]);

  // A signed-in account (optional, additive) folds its identity into the local profile and syncs the
  // profile row — name/email/avatar fill only gaps, the local copy stays the working truth. Runs on
  // every boot, so it completes a Google round-trip started from onboarding OR from You.
  useEffect(() => {
    const acct = sdk.account?.profile();
    if (!acct) return;
    mergeAccount(acct);
    const p = loadProfile();
    void sdk.account?.syncProfile({
      display_name: p.name,
      grade: p.grade,
      board: boardName(p.boardId),
    });
  }, [sdk]);

  // The guard: unauthenticated in live mode always lands on onboarding — the sign-in beat lives
  // there, in her flow. No route (palette, Vidya nav) can walk around it.
  const locked = !sdk.config.devAuth && !sdk.identity.isAuthenticated();

  // Design concepts render standalone — no app chrome over them, they own the whole canvas.
  const inFlow = locked || route.name === 'onboarding' || route.name === 'concept';
  const onHome = route.name === 'home';

  return (
    <VidyaChatProvider value={chat}>
      {locked && route.name !== 'onboarding' ? <Onboarding /> : <Screen />}
      {/* Her ink over the current screen — annotations anchored to real elements. */}
      <VidyaOverlay />
      {!inFlow && <AppHeader />}
      {/* the chat page IS her — no docked twin over it */}
      {!inFlow && !onHome && route.name !== 'chat' && <VidyaCompanion />}
      <CommandPalette />
      {/* the award ceremony for a milestone crossing — blur, descend, confetti, fanfare, her jump */}
      <CeremonyHost />
      <ClickInk />
      {/* the per-learner mind — folds behavioural signals into her lifetime context */}
      <MindObserver />
      {/* she speaks what she writes — sound and ink on the same beat */}
      <SpeechNarrator />
      {/* the course-download queue: composes ungened courses one at a time, notifies on ready */}
      <DownloadCenter />
    </VidyaChatProvider>
  );
}

function WithVidya({ sdk }: { sdk: Sdk }) {
  const router = useRouter();
  const handlers = useMemo<VidyaHandlers>(
    () => ({
      navigate: (route: string) => {
        const r = NAV_ROUTES[route];
        if (r) router.navigate(r);
      },
      startPractice: () => router.navigate({ name: 'practice' }),
      switchModality: () => {},
      // her 'speak' action plays aloud through the TTS path (mute-respecting); the drawer
      // still shows the written line either way
      onSpeak: (text: string) => void speakLine(text),
      // she writes a durable fact to the learner's mind; MindObserver folds it into the next
      // lifetime pulse (~4s) and every reload thereafter carries it in the dossier
      onRemember: (text: string) => rememberFact(text),
    }),
    [router],
  );
  return (
    <VidyaProvider handlers={handlers}>
      <AppInner sdk={sdk} />
    </VidyaProvider>
  );
}

export function App() {
  const sdk = useMemo(
    () =>
      createSdk({
        devAuth: DEV_AUTH,
        llmMode: LLM_MODE,
        gatewayUrl: GATEWAY_URL,
        persistMode: PERSIST_MODE,
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        supabaseAccessToken: SUPABASE_DEV_JWT,
      }),
    [],
  );
  // Unauthenticated in live mode => onboarding, always (the sign-in beat lives there).
  const initial: Route =
    sdk.identity.isAuthenticated() && localStorage.getItem(ONBOARDED_KEY)
      ? { name: 'home' }
      : { name: 'onboarding' };
  return (
    <SdkProvider value={sdk}>
      <ProgressProvider>
        <RouterProvider initial={initial}>
          <WithVidya sdk={sdk} />
        </RouterProvider>
      </ProgressProvider>
    </SdkProvider>
  );
}
