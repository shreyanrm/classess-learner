/**
 * The learner's local identity — name, grade, board, photo, activity marks, quiet settings.
 * Everything lives under clss-* keys so "start over" can honestly erase this device.
 * ponytail: localStorage until real profiles sync through KGtoPG identity.
 */

import { boards, learner } from '../../data/catalog';

export const PROFILE_KEY = 'clss-learner-profile';
export const PHOTO_KEY = 'clss-profile-photo-v1';
export const ACTIVITY_KEY = 'clss-activity-v1';
export const PARENT_KEY = 'clss-parent-link-v1';
export const VOICE_KEY = 'clss-voice';
export const SOUND_KEY = 'clss-ignite-sound';

export interface StoredProfile {
  name: string;
  grade: string;
  boardId: string;
  /** Mandatory in onboarding (drives the age-branch); optional here for older saved profiles. */
  age?: number;
  /** What they're into — folded into Vidya's analogies/examples. */
  interests?: string[];
  /** Durable accessibility profile — rides the dossier so she honors it every turn. */
  largeText?: boolean;
  highContrast?: boolean;
  /** Persistent instruction language — she teaches in this until it's changed. */
  language?: string;
}

const FALLBACK: StoredProfile = { name: learner.name, grade: learner.grade, boardId: 'cbse' };

export function loadProfile(): StoredProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<StoredProfile>;
      return {
        name: p.name?.trim() || FALLBACK.name,
        grade: p.grade || FALLBACK.grade,
        boardId: p.boardId || FALLBACK.boardId,
        age: typeof p.age === 'number' ? p.age : undefined,
        interests: Array.isArray(p.interests) ? p.interests : undefined,
        largeText: p.largeText === true,
        highContrast: p.highContrast === true,
        language:
          typeof p.language === 'string' && p.language.trim() ? p.language.trim() : undefined,
      };
    }
  } catch {
    // unreadable — fall through to the seed learner
  }
  return { ...FALLBACK };
}

export function saveProfile(p: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — session-only profile is fine
  }
}

export function boardName(boardId: string): string {
  return boards.find((b) => b.id === boardId)?.name ?? boardId;
}

export function boardSeeded(boardId: string): boolean {
  return boards.find((b) => b.id === boardId)?.seeded ?? false;
}

export function loadPhoto(): string | null {
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

export function savePhoto(dataUrl: string): void {
  try {
    localStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    // a photo that does not persist is still a photo today
  }
}

function dayString(offset = 0): string {
  return new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
}

/** Mark today as an active day and return the (trimmed) mark list. Today is always marked. */
export function markToday(): string[] {
  let marks: string[] = [];
  try {
    marks = JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]') as string[];
  } catch {
    marks = [];
  }
  const t = dayString();
  if (!marks.includes(t)) marks.push(t);
  marks = marks.slice(-30);
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(marks));
  } catch {
    // fine
  }
  return marks;
}

/** The last seven days, oldest first — the activity filament. */
export function lastSevenDays(marks: string[]): { day: string; active: boolean }[] {
  const set = new Set(marks);
  return Array.from({ length: 7 }, (_, i) => {
    const d = dayString(6 - i);
    return { day: d, active: set.has(d) };
  });
}

/** Quiet on/off settings — default on. */
export function getFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== '0';
  } catch {
    return true;
  }
}

export function setFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // fine
  }
}
