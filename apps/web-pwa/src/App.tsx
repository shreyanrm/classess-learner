'use client';

import { createSdk, type Sdk } from '@classess/sdk';
import {
  parseActions,
  useVidyaBus,
  type VidyaHandlers,
  VidyaProvider,
  type VidyaTurn,
} from '@classess/vidya';
import { useMemo, useState } from 'react';
import { AppShell } from './shell/AppShell';
import { type Route, RouterProvider, useRouter } from './shell/router';

const LLM_MODE = (import.meta.env.VITE_LLM_MODE as 'mock' | 'live' | undefined) ?? 'mock';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

/** Zero-argument destinations Vidya may offer to navigate to. */
const NAV_ROUTES: Record<string, Route> = {
  today: { name: 'today' },
  progress: { name: 'progress' },
  create: { name: 'create' },
  settings: { name: 'settings' },
  parent: { name: 'parent' },
  plans: { name: 'plans' },
};

function AppInner({ sdk }: { sdk: Sdk }) {
  const bus = useVidyaBus();
  const [turns, setTurns] = useState<VidyaTurn[]>([
    {
      id: 'seed',
      role: 'vidya',
      text: "Hi, I'm Vidya. Tap me whenever you want to think something through.",
    },
  ]);

  // A real Vidya turn: she reasons over the page she's plugged into, then speaks and acts on it.
  const ask = async (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    bus.publishTurn({
      recentTurns: turns.map((t) => ({ role: t.role, text: String(t.text) })),
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
          text: output.say ?? 'Let us look at this together.',
        },
      ]);
      bus.dispatch(parseActions(output.actions ?? []));
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: `v-${prev.length}`, role: 'vidya', text: 'Give me a moment, then ask me again.' },
      ]);
    }
  };

  return <AppShell sdk={sdk} turns={turns} onAsk={ask} />;
}

function WithVidya({ sdk }: { sdk: Sdk }) {
  const router = useRouter();
  const handlers = useMemo<VidyaHandlers>(
    () => ({
      navigate: (route: string) => {
        const r = NAV_ROUTES[route];
        if (r) router.navigate(r);
      },
      startPractice: (nodeId: string) => router.navigate({ name: 'practice', nodeId }),
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
  return (
    <RouterProvider initial={{ name: 'onboarding', step: 'door' }}>
      <WithVidya sdk={sdk} />
    </RouterProvider>
  );
}
