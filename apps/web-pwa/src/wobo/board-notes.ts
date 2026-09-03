'use client';

/**
 * The artifact (docs/BOARD.md §9) — a board has a history, saves to notes, and shares as an image.
 *
 * "Save to notes" keeps the OBJECTS, never the pixels: a saved board can be reopened, scrubbed, and
 * drawn on again, and it survives a redesign of the renderer. "Share" renders the branded image from
 * the live surface, which is the proof loop.
 *
 * Everything here is keyed to the learner (store/scope.ts): a shared device must never show one
 * child another child's board, and signing out takes them with it.
 */

import { type BoardObject, type BoardStore, saveBoard } from '@classess/wobo';
import { scoped } from '../store/scope';

export const BOARD_NOTES_KEY = 'clss-board-notes-v1';
/** localStorage is not a filing cabinet; the newest boards are the ones worth keeping. */
export const NOTES_CAP = 24;

export interface SavedBoard {
  id: string;
  title: string;
  savedAt: string;
  /** The route she drew it on, so "the board from my atoms lesson" resolves. */
  route?: string;
  objects: BoardObject[];
}

/** Newest first, capped. Pure, so the trimming rule is testable without storage. */
export function mergeNote(list: SavedBoard[], note: SavedBoard, cap = NOTES_CAP): SavedBoard[] {
  return [note, ...list.filter((n) => n.id !== note.id)].slice(0, cap);
}

/** A calm, sentence-case name for an unnamed board. */
export function noteTitle(title: string | undefined, route: string | undefined): string {
  const clean = title?.trim();
  if (clean) return clean;
  return route ? `board from ${route}` : 'a board';
}

export function readNotes(): SavedBoard[] {
  try {
    const parsed = JSON.parse(scoped.getItem(BOARD_NOTES_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SavedBoard[]) : [];
  } catch {
    return [];
  }
}

function writeNotes(list: SavedBoard[]): void {
  try {
    scoped.setItem(BOARD_NOTES_KEY, JSON.stringify(list.slice(0, NOTES_CAP)));
  } catch {
    // quota or private mode — the board stays on screen, it just is not kept
  }
}

function mintId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Save the board she is on. Returns the note, or null when there was nothing on it. */
export function saveBoardToNotes(
  store: BoardStore,
  opts: { title?: string; route?: string } = {},
): SavedBoard | null {
  const snapshot = saveBoard(store, opts.title);
  if (snapshot.objects.length === 0) return null;
  const note: SavedBoard = {
    id: mintId(),
    title: noteTitle(opts.title, opts.route),
    savedAt: snapshot.savedAt,
    ...(opts.route ? { route: opts.route } : {}),
    objects: snapshot.objects,
  };
  writeNotes(mergeNote(readNotes(), note));
  return note;
}

export function deleteNote(id: string): void {
  writeNotes(readNotes().filter((n) => n.id !== id));
}

export function findNote(id: string): SavedBoard | undefined {
  return readNotes().find((n) => n.id === id);
}
