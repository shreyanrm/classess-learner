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
import { CommandPalette } from './shell/CommandPalette';
import { type Route, RouterProvider, useRouter } from './shell/router';
import { ProgressProvider } from './store/progress';
import { SdkProvider } from './store/sdk';
import { AppHeader } from './ui/AppHeader';
import { ClickInk } from './ui/ClickInk';
import { VidyaCompanion } from './vidya/Companion';
import {
  appendToArchive,
  CHAT_PAGE,
  type ChatTurn,
  readArchive,
  VidyaChatProvider,
  writeArchive,
} from './vidya/chat';

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

function Screen() {
  const { route } = useRouter();
  // One intention per screen; transitions overlap and ease with physical logic (DESIGN.md §5) —
  // the leaving page recedes while the arriving one springs in, so nothing ever feels like a cut.
  const key = JSON.stringify(route);
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 16, scale: 0.992, filter: 'blur(5px)' }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: { type: 'spring', stiffness: 240, damping: 30, mass: 0.9 },
        }}
        exit={{
          opacity: 0,
          y: -12,
          scale: 0.994,
          filter: 'blur(5px)',
          transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.4] },
        }}
        style={{ willChange: 'transform, opacity, filter' }}
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
  const { route } = useRouter();
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
      return turn;
    };
    const userTurn = say({ role: 'user', text });
    setBusy(true);
    setMood('thinking');
    // She remembers what matters, not the transcript: a short recent window, with her own long
    // explanations clipped — the archive is for the learner to scroll, never re-fed to the model.
    const recent = [...turns.slice(-7), userTurn].map((t) => ({
      role: t.role,
      text:
        t.role === 'vidya' && t.text.length > 220
          ? `${t.text.slice(0, 220)}…`
          : t.text.slice(0, 600),
    }));
    bus.publishTurn({ recentTurns: recent, lastUserInput: text });
    try {
      const result = await sdk.llm.invoke(
        'vidya.turn',
        { context: bus.assembleContext() },
        { consentTier: 'un_elevated' },
      );
      const output = result.output as { say?: string; actions?: unknown[] };
      say({ role: 'vidya', text: output.say ?? 'let us look at this together.' });
      const actions = parseActions(output.actions ?? []);
      bus.dispatch(actions);
      setMood(actions.length > 0 ? 'explaining' : 'idle');
    } catch {
      say({ role: 'vidya', text: 'give me a moment, then ask me again.' });
      setMood('idle');
    } finally {
      setBusy(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ask is recreated with turns; tracking turns/busy/mood covers it
  const chat = useMemo(
    () => ({ turns, ask, busy, mood, setMood, hasOlder, loadOlder }),
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
      <ClickInk />
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
