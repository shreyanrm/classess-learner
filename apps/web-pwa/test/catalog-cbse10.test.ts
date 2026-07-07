/**
 * CBSE Class 10 is the source-of-record catalog: the chapters and topics the app ships MUST match
 * content/catalogs/cbse.json (the NCERT-reconciled slice). This test is the wire — if either the
 * generated catalog or the hand-carried arrays drift, it fails and names the mismatch. CS is the
 * app's own SUBJECTS.md ramp (not an NCERT subject), so it is intentionally absent from cbse.json
 * and not asserted here.
 */

import { describe, expect, it } from 'bun:test';
import cbse from '../../../content/catalogs/cbse.json';
import {
  biologyChapters10,
  chemistryChapters10,
  mathChapters10,
  physicsChapters10,
  scienceChapters10,
  socialChapters10,
} from '../src/data/catalog';
import type { Chapter } from '../src/data/model';

interface JsonTopic {
  name: string;
}
interface JsonChapter {
  index: number;
  name: string;
  topics: JsonTopic[];
}
interface JsonSubject {
  id: string;
  chapters: JsonChapter[];
}

const class10 = (cbse.grades as { grade: string; subjects: JsonSubject[] }[]).find(
  (g) => g.grade === 'Class 10',
);
const subjectOf = (id: string): JsonChapter[] =>
  class10?.subjects.find((s) => s.id === id)?.chapters ?? [];

/** Flatten a catalog subject to the same shape cbse.json carries: chapter name + topic names, in order. */
const shape = (chapters: Chapter[]) =>
  chapters.map((c) => ({ name: c.name, topics: c.topics.map((t) => t.name) }));
const jsonShape = (chapters: JsonChapter[]) =>
  chapters.map((c) => ({ name: c.name, topics: c.topics.map((t) => t.name) }));

describe('CBSE Class 10 catalog matches the NCERT source (content/catalogs/cbse.json)', () => {
  it('has a Class 10 slice with math, science, and social', () => {
    expect(class10).toBeDefined();
    for (const id of ['math', 'science', 'social']) expect(subjectOf(id).length).toBeGreaterThan(0);
  });

  it('mathematics matches, chapter and topic, in order', () => {
    expect(shape(mathChapters10)).toEqual(jsonShape(subjectOf('math')));
  });

  it('science matches in NCERT order, and splits cleanly into the three disciplines', () => {
    expect(shape(scienceChapters10)).toEqual(jsonShape(subjectOf('science')));
    // the clubbed door is presentation only — every science chapter keys to one canonical discipline
    expect(scienceChapters10.length).toBe(
      physicsChapters10.length + chemistryChapters10.length + biologyChapters10.length,
    );
    for (const c of scienceChapters10)
      expect(['physics', 'chemistry', 'biology']).toContain(c.subjectId);
  });

  it('social science matches, chapter and topic, in order', () => {
    expect(shape(socialChapters10)).toEqual(jsonShape(subjectOf('social')));
  });
});
