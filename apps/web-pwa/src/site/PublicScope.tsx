'use client';

/**
 * What a public page can reach.
 *
 * Most of the site carries an ask box, an allowance bar or a door, and those read the SDK — so the
 * SDK is provided here, built quietly (no session is minted; nothing is fetched). The landing page
 * reads none of it, which is why this scope is a chunk of its own and the front door renders
 * outside it: the first page a stranger ever sees downloads the page and nothing else.
 *
 * Wobo's conversation is a stub on purpose. The real one is the runtime's — a hundred kilobytes of
 * bus, board and speech that a document page has no use for. Every caller here does the same two
 * things with it (ask, then walk to the chat page), so the stub parks the question and the runtime
 * that mounts a beat later asks it for real.
 */

import type { FocusObject } from '@wobo/wobo';
import { type ReactNode, useMemo } from 'react';
import { appSdk } from '../store/app-sdk';
import { SdkProvider } from '../store/sdk';
import { type WoboChat, WoboChatProvider } from '../wobo/chat';
import { handOffQuestion } from '../wobo/handoff';

export function PublicScope({ children }: { children: ReactNode }) {
  const sdk = appSdk();
  const chat = useMemo<WoboChat>(
    () => ({
      turns: [],
      ask: async (text: string) => handOffQuestion(text),
      busy: false,
      mood: 'idle',
      setMood: () => {},
      hasOlder: false,
      loadOlder: () => {},
      updateTurn: () => {},
      offline: false,
      pending: [],
      focus: null as FocusObject | null,
    }),
    [],
  );
  return (
    <SdkProvider value={sdk}>
      <WoboChatProvider value={chat}>{children}</WoboChatProvider>
    </SdkProvider>
  );
}
