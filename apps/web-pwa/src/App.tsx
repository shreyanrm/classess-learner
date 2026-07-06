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
import { useMemo, useState } from 'react';
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
import { type ChatTurn, VidyaChatProvider } from './vidya/chat';

const LLM_MODE = (import.meta.env.VITE_LLM_MODE as 'mock' | 'live' | undefined) ?? 'mock';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

/** Zero-argument destinations Vidya may offer to navigate to. */
const NAV_ROUTES: Record<string, Route> = {
  home: { name: 'home' },
  learn: { name: 'learn' },
  practice: { name: 'practice' },
  progress: { name: 'progress' },
  you: { name: 'you' },
};

export const ONBOARDED_KEY = 'clss-onboarded-v1';

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
  const [turns, setTurns] = useState<ChatTurn[]>([
    { id: 'seed', role: 'vidya', text: 'ask me anything — I can see the page you are on.' },
  ]);

  // A real Vidya turn: she reasons over the page she is plugged into, then speaks and acts on it.
  const ask = async (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    setBusy(true);
    setMood('thinking');
    bus.publishTurn({
      recentTurns: turns.map((t) => ({ role: t.role, text: t.text })),
      lastUserInput: text,
    });
    try {
      const result = await sdk.llm.invoke(
        'vidya.turn',
        { context: bus.assembleContext() },
        { consentTier: 'un_elevated' },
      );
      const output = result.output as { say?: string; actions?: unknown[] };
      setTurns((prev) => [
        ...prev,
        {
          id: `v-${prev.length}`,
          role: 'vidya',
          text: output.say ?? 'let us look at this together.',
        },
      ]);
      const actions = parseActions(output.actions ?? []);
      bus.dispatch(actions);
      setMood(actions.length > 0 ? 'explaining' : 'idle');
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: `v-${prev.length}`, role: 'vidya', text: 'give me a moment, then ask me again.' },
      ]);
      setMood('idle');
    } finally {
      setBusy(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ask is recreated with turns; tracking turns/busy/mood covers it
  const chat = useMemo(() => ({ turns, ask, busy, mood, setMood }), [turns, busy, mood]);

  // Design concepts render standalone — no app chrome over them, they own the whole canvas.
  const inFlow = route.name === 'onboarding' || route.name === 'concept';
  const onHome = route.name === 'home';

  return (
    <VidyaChatProvider value={chat}>
      <Screen />
      {/* Her ink over the current screen — annotations anchored to real elements. */}
      <VidyaOverlay />
      {!inFlow && <AppHeader />}
      {!inFlow && !onHome && <VidyaCompanion />}
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
  const sdk = useMemo(() => createSdk({ llmMode: LLM_MODE, gatewayUrl: GATEWAY_URL }), []);
  const initial: Route = localStorage.getItem(ONBOARDED_KEY)
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
