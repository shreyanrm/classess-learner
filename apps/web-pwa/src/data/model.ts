/**
 * The learner-facing curriculum model. Shapes mirror the KGtoPG ontology views so the catalog
 * generation pipeline (content/catalogs/*.json) and the governed views can back them without a
 * reshape. A topic IS a course (DESIGN.md §8).
 */

export type ConsentTier = 'un_elevated' | 'elevated';

export interface LearnerProfile {
  name: string;
  grade: string;
  board: string;
  consentTier: ConsentTier;
}

export interface Subject {
  id: string;
  name: string;
  /** One quiet line under the name. Mastery moments ignite in ultramarine — the one pigment. */
  line: string;
}

export type TopicKind = 'syllabus' | 'custom' | 'mystery' | 'bonus';

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  blurb: string;
  /** Prerequisite gating is a suggestion, never a wall (proceed anyway door). */
  prereqTopicIds: string[];
  kind: TopicKind;
  /** Ontology node backing this topic, when the real graph covers it (the atom does). */
  nodeId?: string;
  /** XP for closing the boss battle. */
  xp: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  index: number;
  name: string;
  topics: Topic[];
}

export interface Board {
  id: string;
  name: string;
  region: string;
  /** Catalogs are fetched on demand for every board except the three seeded ones. */
  seeded: boolean;
}
