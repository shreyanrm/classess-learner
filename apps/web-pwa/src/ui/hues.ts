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
  physics: { hue: '#6D4AE0', wash: 'rgba(109,74,224,0.07)' },
  chemistry: { hue: '#0FA3B1', wash: 'rgba(15,163,177,0.07)' },
  biology: { hue: '#1CA363', wash: 'rgba(28,163,99,0.07)' },
  cs: { hue: '#D6196F', wash: 'rgba(214,25,111,0.06)' },
  social: { hue: '#E8881A', wash: 'rgba(232,136,26,0.08)' },
  // ponytail: presentation alias — the clubbed "Science" door (and legacy ids) reads chemistry teal
  science: { hue: '#0FA3B1', wash: 'rgba(15,163,177,0.07)' },
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
