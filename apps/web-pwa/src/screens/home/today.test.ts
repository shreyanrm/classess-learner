import { describe, expect, it } from 'bun:test';
import type { MindState } from '../../store/mind';
import { calendarWeek, continueLine, noticed, relativeDay, todayLine, words } from './today';

const topic = (id: string, name: string, chapterId = 'c6') => ({
  id,
  chapterId,
  name,
  blurb: '',
  prereqTopicIds: [],
  kind: 'syllabus' as const,
  xp: 120,
});

const chapter = {
  id: 'c6',
  subjectId: 'Mathematics',
  index: 6,
  name: 'Triangles and the hypotenuse',
  topics: [topic('t1', 'A'), topic('t2', 'B'), topic('t3', 'Pythagoras, the hypotenuse')],
};

describe('the situational line', () => {
  it('says the board is missing before anything else', () => {
    expect(todayLine({ world: false, continue: null, next: null })).toBe(
      'Tell me your board. Then your own syllabus lands here.',
    );
  });

  it('counts the lessons walked in the chapter under way', () => {
    const line = todayLine({
      world: true,
      continue: {
        topic: chapter.topics[2] as ReturnType<typeof topic>,
        chapter,
        lesson: 3,
        total: 5,
        done: 2,
        progress: 0.4,
      },
      next: null,
    });
    expect(line).toBe("Triangles and the hypotenuse. You're two lessons in.");
  });

  it('names the lesson when none is finished yet', () => {
    const line = todayLine({
      world: true,
      continue: {
        topic: chapter.topics[0] as ReturnType<typeof topic>,
        chapter,
        lesson: 1,
        total: 3,
        done: 0,
        progress: 0.2,
      },
      next: null,
    });
    expect(line).toBe('Triangles and the hypotenuse. Lesson 1 of 3.');
  });

  it('points at what is next when nothing is in flight', () => {
    const line = todayLine({
      world: true,
      continue: null,
      next: {
        topic: topic('t9', 'Data handling'),
        chapter: null,
        lesson: 0,
        total: 0,
        done: 0,
        progress: 0,
      },
    });
    expect(line).toBe('Next: Data handling.');
  });

  it('opens the subjects when the world has no topics loaded', () => {
    expect(todayLine({ world: true, continue: null, next: null })).toBe(
      'Open your subjects. Your chapters come from your board when you open one.',
    );
  });

  it('spells the small numbers', () => {
    expect(words(2)).toBe('two');
    expect(words(14)).toBe('14');
  });
});

describe('the continue card’s line', () => {
  it('is the chapter and the lesson of the total', () => {
    expect(
      continueLine({
        topic: chapter.topics[2] as ReturnType<typeof topic>,
        chapter,
        lesson: 3,
        total: 5,
        done: 2,
        progress: 0.4,
      }),
    ).toBe('Chapter 6 · lesson 3 of 5.');
  });
  it('says nothing it does not know', () => {
    expect(
      continueLine({
        topic: topic('x', 'X'),
        chapter: null,
        lesson: 0,
        total: 0,
        done: 0,
        progress: 0,
      }),
    ).toBe('');
  });
});

describe('the streak’s week', () => {
  it('runs Monday to Sunday and lights the days the learner showed up', () => {
    // 2026-09-03 is a Thursday
    const now = new Date('2026-09-03T10:00:00Z');
    const week = calendarWeek(['2026-08-31', '2026-09-02', '2026-09-03', '2026-08-30'], now);
    expect(week.map((d) => d.label).join('')).toBe('MTWTFSS');
    expect(week.map((d) => d.on)).toEqual([true, false, true, true, false, false, false]);
  });
});

describe('when something happened', () => {
  const now = new Date('2026-09-03T10:00:00Z');
  it('is today, yesterday, or the weekday', () => {
    expect(relativeDay('2026-09-03T02:00:00Z', now)).toBe('today');
    expect(relativeDay('2026-09-02T22:00:00Z', now)).toBe('yesterday');
    expect(relativeDay('2026-08-30T12:00:00Z', now)).toBe('Sunday');
    expect(relativeDay('nonsense', now)).toBe('');
  });
});

describe('what Wobo noticed', () => {
  const empty: MindState = {
    latenciesMs: [],
    slips: [],
    dwellSec: {},
    sessionDays: [],
    interests: [],
    facts: [],
  };
  const now = new Date('2026-09-03T10:00:00Z');

  it('is nothing until Wobo has watched something', () => {
    expect(noticed(empty, now)).toBeNull();
  });

  it('is the prototype’s card once help was asked for after a miss', () => {
    const seen = noticed({ ...empty, helpedAt: '2026-09-02T18:00:00Z' }, now);
    expect(seen).toEqual({ title: 'You asked for help after a miss', when: 'yesterday' });
  });

  it('says nothing about a wrong answer or a day shown up — the card’s second line is about help', () => {
    expect(
      noticed({ ...empty, slips: [{ nodeId: 'n1', value: 4, at: '2026-09-02T18:00:00Z' }] }, now),
    ).toBeNull();
    expect(noticed({ ...empty, sessionDays: ['2026-09-01', '2026-09-03'] }, now)).toBeNull();
  });
});
