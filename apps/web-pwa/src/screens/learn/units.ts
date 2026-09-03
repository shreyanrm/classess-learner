/**
 * The unit rows of the learn screen — each chapter of the subject in front of the learner, in one
 * of four states, from the topics the registry holds and the progress store's truth.
 *
 *   done   every topic completed
 *   now    the one chapter with a course in flight (or part-done) — the row with the bar and the button
 *   next   the first chapter after it that is not done (the first chapter at all, when nothing has begun)
 *   later  every untouched chapter after that
 *   past   an untouched chapter before the one under way — the class may have done it, Wobo has no
 *          record either way, so the row carries no word at all rather than "Later"
 *
 * A chapter whose topics are not loaded has no lesson count: the row says the name and nothing it
 * cannot know.
 */

import type { Chapter, Subject } from '../../data/model';

export type UnitState = 'done' | 'now' | 'next' | 'later' | 'past';

export interface UnitRow {
  chapter: Chapter;
  state: UnitState;
  /** Topics in the chapter; 0 when they have not been loaded. */
  lessons: number;
  done: number;
  /** The 1-based lesson the learner is on, when the chapter is under way. */
  lesson: number | null;
  /** Fraction of the chapter walked, 0..1 — the bar on the `now` row. */
  progress: number;
  /** The topic "Continue" opens: the one in flight, else the first not yet completed. */
  topicId: string | null;
}

type ProgressInput = {
  completed: ReadonlySet<string>;
  topicProgress: Record<string, number>;
};

export function unitRows(chapters: readonly Chapter[], p: ProgressInput): UnitRow[] {
  const rows: UnitRow[] = chapters.map((chapter) => {
    const lessons = chapter.topics.length;
    const done = chapter.topics.filter((t) => p.completed.has(t.id)).length;
    let inFlight: { id: string; f: number } | null = null;
    for (const t of chapter.topics) {
      const f = p.topicProgress[t.id] ?? 0;
      if (p.completed.has(t.id) || f <= 0 || f >= 1) continue;
      if (!inFlight || f > inFlight.f) inFlight = { id: t.id, f };
    }
    const firstOpen = chapter.topics.find((t) => !p.completed.has(t.id));
    const underWay = inFlight !== null || (done > 0 && done < lessons);
    const lesson = underWay
      ? inFlight
        ? chapter.topics.findIndex((t) => t.id === inFlight?.id) + 1
        : done + 1
      : null;
    return {
      chapter,
      state: lessons > 0 && done === lessons ? 'done' : 'later',
      lessons,
      done,
      lesson,
      progress: lessons > 0 ? (done + (inFlight?.f ?? 0)) / lessons : 0,
      topicId: inFlight?.id ?? firstOpen?.id ?? null,
    };
  });

  // One row is "now": the chapter furthest into a course, else the first part-done one.
  let now = -1;
  let best = -1;
  rows.forEach((r, i) => {
    if (r.state === 'done' || r.lesson === null) return;
    const f = r.progress;
    if (f > best) {
      best = f;
      now = i;
    }
  });
  if (now >= 0) {
    const row = rows[now];
    if (row) row.state = 'now';
    // Untouched chapters before the one under way are not "later" — nothing is known of them.
    for (const r of rows.slice(0, now)) if (r.state === 'later') r.state = 'past';
  }
  // One row is "next": the first not-done chapter after "now" (or the first at all).
  const next = rows.findIndex((r, i) => i > now && r.state === 'later');
  if (next >= 0) {
    const row = rows[next];
    if (row) row.state = 'next';
  }
  return rows;
}

/** "Lesson 3 of 5", "4 lessons" — the quiet line under a chapter's name, from what is known. */
export function unitLine(row: UnitRow): string {
  // TODO(data): the prototype's lines carry a completion day ("Done on Sunday"), a practice score
  // ("practice 9 of 10") and the next test ("test on Friday", "starts after the test"). None of the
  // three is a field yet: completions are undated, practice sets do not report a score to the
  // chapter, and there is no test date.
  if (row.state === 'now' && row.lesson !== null && row.lessons > 0) {
    return `Lesson ${row.lesson} of ${row.lessons}`;
  }
  if (row.lessons === 0) return '';
  return `${row.lessons} ${row.lessons === 1 ? 'lesson' : 'lessons'}`;
}

/** The state word on the right of a row that has no button; nothing for a chapter Wobo knows nothing of. */
export function unitState(state: UnitState): string {
  switch (state) {
    case 'done':
      return 'Mastered';
    case 'next':
      return 'Next';
    case 'later':
      return 'Later';
    default:
      return '';
  }
}

/** "Chapter 6 of 14 · Triangles and the hypotenuse" — a subject tile's line; the subject's own line when nothing is loaded. */
export function tileLine(subject: Subject, rows: readonly UnitRow[]): string {
  if (rows.length === 0) return subject.line;
  const here = rows.find((r) => r.state === 'now') ?? rows.find((r) => r.state === 'next');
  if (!here) return `${rows.length} ${rows.length === 1 ? 'chapter' : 'chapters'}`;
  return `Chapter ${here.chapter.index} of ${rows.length} · ${here.chapter.name}`;
}

/** The subject to open on: the one with a chapter under way, else the first. */
export function defaultSubject(
  subjects: readonly Subject[],
  rowsOf: (subject: Subject) => readonly UnitRow[],
): Subject | null {
  for (const s of subjects) if (rowsOf(s).some((r) => r.state === 'now')) return s;
  return subjects[0] ?? null;
}
