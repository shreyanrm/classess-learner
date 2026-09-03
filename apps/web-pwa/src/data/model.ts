/**
 * The shapes the screens read a syllabus in.
 *
 * These are a projection, never a source. Every one of them is built in `curriculum/registry.ts`
 * from a node the brain served for the learner's own framework and version, keeping the brain's
 * opaque ids so progress, downloads and deep links survive a version upgrade. Nothing constructs
 * one of these from a file (docs/CURRICULUM.md §10). A topic IS a course (DESIGN.md §8).
 */

export type ConsentTier = 'un_elevated' | 'elevated';

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
  /** The canonical concept this topic maps onto, when the brain has mapped one (§7). */
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
