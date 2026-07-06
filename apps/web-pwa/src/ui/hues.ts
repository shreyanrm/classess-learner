/**
 * Subject hue families (owner directive) — pigment for EARNED moments only: sigils, ticks,
 * ignites, and blooms take the owning subject's hue. Chrome never does.
 */

import { chapterById, topicById } from '../data/catalog';

export interface SubjectTone {
  hue: string;
  wash: string;
}

export const SUBJECT_HUES: Record<string, SubjectTone> = {
  math: { hue: '#1F35E0', wash: 'rgba(31,53,224,0.06)' },
  science: { hue: '#0FA3B1', wash: 'rgba(15,163,177,0.07)' },
  social: { hue: '#B26A00', wash: 'rgba(178,106,0,0.07)' },
};

export function toneForSubject(subjectId: string): SubjectTone {
  return SUBJECT_HUES[subjectId] ?? (SUBJECT_HUES.math as SubjectTone);
}

/** The earned hue for a topic — resolved through its chapter's subject. */
export function hueForTopic(topicId: string): string {
  const chapter = topicById(topicId)
    ? chapterById(topicById(topicId)?.chapterId ?? '')
    : chapterById(topicId);
  return toneForSubject(chapter?.subjectId ?? 'math').hue;
}
