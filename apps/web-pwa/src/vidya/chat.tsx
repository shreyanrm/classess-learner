'use client';

/**
 * One conversation, two presentations (DESIGN.md §4): the home front door and the docked orb
 * share this context — she never forgets who the learner is between the two.
 */

import type { VidyaMood } from '@classess/vidya';
import { createContext, useContext } from 'react';
import type { TurnExtras } from './paths/types';

export interface ChatTurn {
  id: string;
  role: 'user' | 'vidya';
  text: string;
  /** What the turn carries beyond prose — a path result (component / viz / action / route). */
  extras?: TurnExtras;
}

export interface VidyaChat {
  turns: ChatTurn[];
  /** She reasons over the page she is plugged into, then speaks and acts on it. */
  ask: (text: string) => Promise<void>;
  busy: boolean;
  mood: VidyaMood;
  setMood: (mood: VidyaMood) => void;
  /** The conversation never ends — older turns wait beyond what is loaded. */
  hasOlder: boolean;
  /** WhatsApp-style: pull the previous page of the archive in above the current view. */
  loadOlder: () => void;
  /** Patch a turn's extras (approval outcomes, action results) — in memory and in the archive. */
  updateTurn: (id: string, patch: (extras: TurnExtras) => TurnExtras) => void;
}

// ---- the never-ending archive ----------------------------------------------------------------
// One conversation for life, append-only, local-first. Only a tail is ever held in memory or
// sent to the model — the archive is for the learner to scroll, not for Vidya to re-read.

const ARCHIVE_KEY = 'clss-vidya-archive-v1';
const ARCHIVE_CAP = 2000; // ponytail: localStorage quota guard; move to IndexedDB if anyone outgrows it
export const CHAT_PAGE = 40;

export function readArchive(): ChatTurn[] {
  try {
    const a = JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? '[]');
    return Array.isArray(a) ? (a as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

export function writeArchive(turns: ChatTurn[]): void {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(turns.slice(-ARCHIVE_CAP)));
  } catch {
    // storage unavailable — the conversation lives for this session only
  }
}

export function appendToArchive(turn: ChatTurn): void {
  const a = readArchive();
  a.push(turn);
  writeArchive(a);
}

/** Rewrite one archived turn in place (outcome recorded on a card, an action's result line). */
export function updateArchiveTurn(id: string, patch: (turn: ChatTurn) => ChatTurn): void {
  writeArchive(readArchive().map((t) => (t.id === id ? patch(t) : t)));
}

const Ctx = createContext<VidyaChat | null>(null);
export const VidyaChatProvider = Ctx.Provider;

export function useVidyaChat(): VidyaChat {
  const c = useContext(Ctx);
  if (!c) throw new Error('useVidyaChat must be used within the app');
  return c;
}
