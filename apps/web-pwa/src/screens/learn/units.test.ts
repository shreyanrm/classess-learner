import { describe, expect, it } from 'bun:test';
import type { Chapter } from '../../data/model';
import { defaultSubject, tileLine, unitLine, unitRows, unitState } from './units';

const topic = (id: string, chapterId: string) => ({
  id,
  chapterId,
  name: id,
  blurb: '',
  prereqTopicIds: [],
  kind: 'syllabus' as const,
  xp: 120,
});

const chapter = (index: number, name: string, n: number): Chapter => ({
  id: `c${index}`,
  subjectId: 'Mathematics',
  index,
  name,
  topics: Array.from({ length: n }, (_, i) => topic(`c${index}-t${i + 1}`, `c${index}`)),
});

const CHAPTERS = [
  chapter(5, 'Understanding quadrilaterals', 4),
  chapter(6, 'Triangles and the hypotenuse', 5),
  chapter(7, 'Data handling', 5),
  chapter(8, 'Squares and square roots', 4),
];

describe('the unit rows', () => {
  const rows = unitRows(CHAPTERS, {
    completed: new Set(['c5-t1', 'c5-t2', 'c5-t3', 'c5-t4', 'c6-t1', 'c6-t2']),
    topicProgress: { 'c6-t3': 0.5 },
  });

  it('are done, now, next and later — in that order for the prototype’s week', () => {
    expect(rows.map((r) => r.state)).toEqual(['done', 'now', 'next', 'later']);
  });

  it('say the lesson of the total on the chapter under way, and the bar is its fraction', () => {
    const now = rows[1];
    expect(now?.lesson).toBe(3);
    expect(unitLine(now as NonNullable<typeof now>)).toBe('Lesson 3 of 5');
    expect(now?.progress).toBe(0.5);
    expect(now?.topicId).toBe('c6-t3');
  });

  it('count the lessons of the others', () => {
    expect(rows.map((r) => unitLine(r))).toEqual([
      '4 lessons',
      'Lesson 3 of 5',
      '5 lessons',
      '4 lessons',
    ]);
    // the `now` row carries the Continue button, not a state word
    expect(rows.filter((r) => r.state !== 'now').map((r) => unitState(r.state))).toEqual([
      'Mastered',
      'Next',
      'Later',
    ]);
  });

  it('make the first chapter next when nothing has begun', () => {
    const fresh = unitRows(CHAPTERS, { completed: new Set(), topicProgress: {} });
    expect(fresh.map((r) => r.state)).toEqual(['next', 'later', 'later', 'later']);
    expect(fresh[0]?.topicId).toBe('c5-t1');
  });

  it('say nothing about lessons they have not loaded', () => {
    const unloaded = unitRows([{ ...chapter(9, 'Unknown', 0) }], {
      completed: new Set(),
      topicProgress: {},
    });
    expect(unitLine(unloaded[0] as NonNullable<(typeof unloaded)[0]>)).toBe('');
    expect(unloaded[0]?.state).toBe('next');
  });

  it('say nothing of an untouched chapter before the one under way', () => {
    const rows = unitRows([chapter(1, 'Rational numbers', 0), ...CHAPTERS], {
      completed: new Set(['c5-t1', 'c5-t2', 'c5-t3', 'c5-t4']),
      topicProgress: { 'c6-t1': 0.2 },
    });
    expect(rows.map((r) => r.state)).toEqual(['past', 'done', 'now', 'next', 'later']);
    expect(unitState('past')).toBe('');
  });

  it('treat a part-done chapter with no course in flight as under way', () => {
    const part = unitRows(CHAPTERS.slice(1, 2), {
      completed: new Set(['c6-t1']),
      topicProgress: {},
    });
    expect(part[0]?.state).toBe('now');
    expect(part[0]?.lesson).toBe(2);
    expect(part[0]?.topicId).toBe('c6-t2');
  });
});

describe('the tiles', () => {
  const maths = {
    id: 'Mathematics',
    name: 'Mathematics',
    line: 'patterns, structure, and certainty',
  };
  it('say where the class is', () => {
    const rows = unitRows(CHAPTERS, {
      completed: new Set(['c5-t1', 'c5-t2', 'c5-t3', 'c5-t4']),
      topicProgress: { 'c6-t1': 0.2 },
    });
    expect(tileLine(maths, rows)).toBe('Chapter 6 of 4 · Triangles and the hypotenuse');
  });
  it('fall back to the subject’s own line when nothing is loaded', () => {
    expect(tileLine(maths, [])).toBe('patterns, structure, and certainty');
  });
  it('open on the subject with a chapter under way, else the first', () => {
    const science = { id: 'Science', name: 'Science', line: '' };
    const rowsOf = (s: { id: string }) =>
      s.id === 'Science'
        ? unitRows(CHAPTERS.slice(0, 1), { completed: new Set(), topicProgress: { 'c5-t1': 0.3 } })
        : unitRows(CHAPTERS, { completed: new Set(), topicProgress: {} });
    expect(defaultSubject([maths, science], rowsOf)?.id).toBe('Science');
    expect(defaultSubject([maths, science], () => [])?.id).toBe('Mathematics');
    expect(defaultSubject([], () => [])).toBeNull();
  });
});
