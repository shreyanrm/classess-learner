'use client';

/**
 * One conversation, two presentations (DESIGN.md §4): the home front door and the docked orb
 * share this context — she never forgets who the learner is between the two.
 */

import type { VidyaMood } from '@classess/vidya';
import { createContext, useContext } from 'react';

export interface ChatTurn {
  id: string;
  role: 'user' | 'vidya';
  text: string;
}

export interface VidyaChat {
  turns: ChatTurn[];
  /** She reasons over the page she is plugged into, then speaks and acts on it. */
  ask: (text: string) => Promise<void>;
  busy: boolean;
  mood: VidyaMood;
  setMood: (mood: VidyaMood) => void;
}

const Ctx = createContext<VidyaChat | null>(null);
export const VidyaChatProvider = Ctx.Provider;

export function useVidyaChat(): VidyaChat {
  const c = useContext(Ctx);
  if (!c) throw new Error('useVidyaChat must be used within the app');
  return c;
}
