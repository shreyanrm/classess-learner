'use client';

/**
 * What the home says, from what the learner has actually done — every number and every name comes
 * from the registry, the progress store, the activity marks and the mind. Nothing here is a
 * catalog, a seed or a guess; where a field the prototype's copy needs does not exist yet, the
 * sentence that needs it is left out and the gap is named in a TODO.
 */

import { chapterById, topicById } from '../../curriculum/registry';
import { loadWorld } from '../../curriculum/world';
import type { Chapter, Topic } from '../../data/model';
import type { MindState } from '../../store/mind';
import type { ProgressStore } from '../../store/progress';
import type { StreakDay } from '../../ui/primitives';
import { deriveStops } from './stops';

type Progress = Pick<ProgressStore, 'completed' | 'topicProgress' | 'streakDays'>;

/** A topic the learner is inside, placed in its chapter. */
export interface Lesson {
  topic: Topic;
  chapter: Chapter | null;
  /** This topic's 1-based place in its chapter; 0 when the chapter's topics are not loaded. */
  lesson: number;
  /** Topics in the chapter; 0 when not loaded. */
  total: number;
  /** Topics of the chapter already completed. */
  done: number;
  /** How far into this topic's course the learner has walked, 0..1. */
  progress: number;
}

export interface TodayPlan {
  /** False until a board and a class are chosen on this device. */
  world: boolean;
  continue: Lesson | null;
  next: Lesson | null;
}

function lessonOf(topic: Topic, p: Progress): Lesson {
  const chapter = chapterById(topic.chapterId) ?? null;
  const index = chapter ? chapter.topics.findIndex((t) => t.id === topic.id) : -1;
  return {
    topic,
    chapter,
    lesson: index >= 0 ? index + 1 : 0,
    total: chapter?.topics.length ?? 0,
    done: chapter ? chapter.topics.filter((t) => p.completed.has(t.id)).length : 0,
    progress: p.topicProgress[topic.id] ?? 0,
  };
}

/** The day's two topics — the one in flight and the one after — from the same derivation the thread used. */
export function todayPlan(p: Progress): TodayPlan {
  const { stops } = deriveStops(p);
  const topicAt = (kind: 'continue' | 'next'): Topic | undefined => {
    const stop = stops.find((s) => s.kind === kind);
    if (stop?.route.name !== 'course') return undefined;
    return topicById(stop.route.topicId);
  };
  const cont = topicAt('continue');
  const next = topicAt('next');
  return {
    world: Boolean(loadWorld()),
    continue: cont ? lessonOf(cont, p) : null,
    next: next ? lessonOf(next, p) : null,
  };
}

const SMALL = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** "two", "ten", "14". */
export function words(n: number): string {
  return SMALL[n] ?? String(n);
}

/**
 * The one situational paragraph under the greeting.
 *
 * TODO(data): the prototype opens with the next test — "Friday's test is on triangles" — and closes
 * with a minutes-to-ready estimate — "Ten minutes on the hypotenuse and you're ready for the first
 * half". Neither the test (subject, day) nor the estimate is a field the app holds yet; both
 * sentences return when those fields exist. What is here is built from the fields that do.
 */
export function todayLine(plan: TodayPlan): string {
  if (!plan.world) return 'Tell me your board. Then your own syllabus lands here.';
  const c = plan.continue;
  if (c) {
    const name = c.chapter?.name ?? c.topic.name;
    if (c.done > 0) {
      return `${name}. You're ${words(c.done)} ${c.done === 1 ? 'lesson' : 'lessons'} in.`;
    }
    if (c.lesson > 0 && c.total > 0) return `${name}. Lesson ${c.lesson} of ${c.total}.`;
    return `${name}.`;
  }
  if (plan.next) return `Next: ${plan.next.topic.name}.`;
  return 'Open your subjects. Your chapters come from your board when you open one.';
}

/** "Chapter 6 · lesson 3 of 5." — the continue card's line. */
export function continueLine(l: Lesson): string {
  // TODO(data): the prototype adds the learner's last win — "Last time you found c = 5 yourself."
  // The course player does not yet report the moment a learner found something on their own.
  const parts: string[] = [];
  if (l.chapter) parts.push(`Chapter ${l.chapter.index}`);
  if (l.lesson > 0 && l.total > 0) parts.push(`lesson ${l.lesson} of ${l.total}`);
  return parts.length > 0 ? `${parts.join(' · ')}.` : '';
}

// "This week, in Wobo's words" is the You screen's sentence (`you/week.ts`), read from the same
// ledger — the home and You say one thing, in one voice.

// --- the streak's week -----------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** ISO day, the way the activity marks are written. */
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Monday to Sunday of the current week, each lit if the learner showed up that day. */
export function calendarWeek(marks: readonly string[], now: Date = new Date()): StreakDay[] {
  const set = new Set(marks);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS;
  return LABELS.map((label, i) => ({ label, on: set.has(isoDay(monday + i * DAY_MS)) }));
}

// --- Wobo noticed ------------------------------------------------------------------------------------

export interface Noticed {
  title: string;
  /** "today", "yesterday", or the weekday. */
  when: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "today", "yesterday", "Sunday" — when something happened, in the learner's own words for it. */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const days = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())) /
      DAY_MS,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return WEEKDAYS[at.getUTCDay()] ?? '';
}

/**
 * The thing Wobo noticed: help asked for after a miss (the mind's `helpedAt`) — the one
 * observation the prototype's card carries, and the one its second line ("That's exactly how
 * learning looks. It goes in the Sunday note.") is about. Nothing until it has happened; a
 * different observation under that line would not make sense.
 */
export function noticed(mind: MindState, now: Date = new Date()): Noticed | null {
  if (!mind.helpedAt) return null;
  return { title: 'You asked for help after a miss', when: relativeDay(mind.helpedAt, now) };
}
