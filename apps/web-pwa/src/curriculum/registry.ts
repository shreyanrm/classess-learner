/**
 * The live syllabus registry on the client.
 *
 * Everything the brain has served this session, held in memory in the shapes the screens read.
 * It is filled by the hooks as a learner opens a level, a subject, a chapter — never ahead of
 * them, and never from a file. Two rules make the audit's "invented CBSE Class 8" impossible:
 *
 *   1. Nothing is written here that did not come from the brain or from the offline cache of a
 *      version the learner is pinned to.
 *   2. A lookup that does not know the answer returns undefined or an empty list. There is no
 *      fallback board, no seed grade, and no dev learner.
 *
 * The `Chapter` and `Topic` shapes are the app's own (data/model.ts); a curriculum unit becomes a
 * chapter and a curriculum topic becomes a topic, keeping the brain's opaque node ids so progress,
 * downloads and deep links survive a version upgrade.
 */

import type { CurriculumNode, CurriculumTopicsView, CurriculumUnitsView } from '@wobo/sdk';
import type { Chapter, Subject, Topic } from '../data/model';
import { subjectFamily, subjectLine } from './subjects';
import { loadWorld, subscribeWorld, type World } from './world';

/** How much a topic's boss battle pays. One number, not a per-topic invention. */
export const TOPIC_XP = 120;

// --- the stores -----------------------------------------------------------------------------------

/** Chapters for the world in front of the learner right now, keyed by the subject's own name. */
let bySubject: Record<string, Chapter[]> = {};
/** Every node seen this session, so a deep link into a topic still resolves after a navigation. */
const topics = new Map<string, Topic>();
const chapters = new Map<string, Chapter>();

let worldKey = keyOf(loadWorld());

/**
 * The subjects of the learner's level, in the framework's own words and order. Empty when they have
 * not chosen a world yet — which is the honest empty state every screen is built for.
 *
 * A live array (mutated in place) so callers can keep importing it as a value.
 */
export const subjects: Subject[] = [];

function refreshSubjects(): Subject[] {
  const world = loadWorld();
  const names = world?.subjects ?? [];
  const same = subjects.length === names.length && subjects.every((s, i) => s.id === names[i]);
  if (!same) {
    subjects.length = 0;
    for (const name of names) subjects.push({ id: name, name, line: subjectLine(name) });
  }
  return subjects;
}

subscribeWorld(() => {
  refreshSubjects();
});
refreshSubjects();

function keyOf(world: World | null): string {
  return world ? `${world.frameworkId}:${world.versionId ?? 'pinned'}:${world.level ?? ''}` : '';
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to "the syllabus in memory changed" — what `useSyncExternalStore` binds to. */
export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A version of the store's contents; changes whenever anything is ingested. */
let revision = 0;
export function registryRevision(): number {
  return revision;
}

/** Drop the current level's chapters — a new framework, version or level is a new world. */
export function resetRegistry(): void {
  bySubject = {};
  topics.clear();
  chapters.clear();
  worldKey = keyOf(loadWorld());
  refreshSubjects();
  revision++;
  notify();
}

subscribeWorld((world) => {
  const next = keyOf(world);
  if (next !== worldKey) {
    worldKey = next;
    resetRegistry();
  }
});

/** Called before every read: a world switched underneath us clears the previous world's chapters. */
function syncWorld(): void {
  const next = keyOf(loadWorld());
  if (next !== worldKey) {
    worldKey = next;
    bySubject = {};
    topics.clear();
    chapters.clear();
    refreshSubjects();
    revision++;
  }
}

// --- shaping --------------------------------------------------------------------------------------

/** A curriculum topic node, in the app's topic shape. Its blurb is its first objective, verbatim. */
export function topicOf(node: CurriculumNode, chapterId: string): Topic {
  const topic: Topic = {
    id: node.id,
    chapterId,
    name: node.name,
    blurb: node.objectives[0]?.name ?? '',
    // Prerequisites live in the concept graph, in the brain. The client states none of its own.
    prereqTopicIds: [],
    kind: 'syllabus',
    xp: TOPIC_XP,
  };
  const concept = node.conceptIds[0];
  if (concept) topic.nodeId = concept;
  return topic;
}

/** A curriculum unit node, in the app's chapter shape. Topics arrive later, on open. */
export function chapterOf(node: CurriculumNode, subject: string, index: number): Chapter {
  return { id: node.id, subjectId: subject, index, name: node.name, topics: [] };
}

// --- ingestion ------------------------------------------------------------------------------------

/** Take a units answer into memory. A "looking" answer is a status, not a syllabus — it is ignored. */
export function ingestUnits(view: CurriculumUnitsView): void {
  syncWorld();
  if (view.status !== 'ready') return;
  const built = view.units.map((node, i) => {
    const existing = chapters.get(node.id);
    const chapter = chapterOf(node, view.subject, i + 1);
    // Keep topics already fetched for this chapter — reordering a unit must not empty it.
    if (existing) chapter.topics = existing.topics;
    chapters.set(chapter.id, chapter);
    return chapter;
  });
  bySubject = { ...bySubject, [view.subject]: built };
  revision++;
  notify();
}

/** Take a topics answer into memory, under the chapter it belongs to. */
export function ingestTopics(view: CurriculumTopicsView): void {
  syncWorld();
  const chapter = chapters.get(view.unit.id);
  if (!chapter) return;
  chapter.topics = view.topics.map((node) => {
    const topic = topicOf(node, chapter.id);
    topics.set(topic.id, topic);
    return topic;
  });
  // Re-key the subject list so React sees a new array identity for the chapter that changed.
  const list = bySubject[chapter.subjectId];
  if (list) bySubject = { ...bySubject, [chapter.subjectId]: [...list] };
  revision++;
  notify();
}

// --- the lookups the screens use ------------------------------------------------------------------

/**
 * Chapters by subject, live. A Proxy so every read resolves the current world without the caller
 * holding a stale object. An unknown subject is undefined — not an empty syllabus, not a seeded one.
 */
export const chaptersBySubject: Record<string, Chapter[]> = new Proxy(
  {},
  {
    get(_t, prop: string) {
      syncWorld();
      return bySubject[prop];
    },
    has(_t, prop: string) {
      syncWorld();
      return prop in bySubject;
    },
    ownKeys() {
      syncWorld();
      return Reflect.ownKeys(bySubject);
    },
    getOwnPropertyDescriptor(_t, prop) {
      syncWorld();
      if (!(prop in bySubject)) return undefined;
      return { enumerable: true, configurable: true, value: bySubject[prop as string] };
    },
  },
) as Record<string, Chapter[]>;

export function topicById(id: string): Topic | undefined {
  syncWorld();
  return topics.get(id);
}

export function chapterById(id: string): Chapter | undefined {
  syncWorld();
  return chapters.get(id);
}

export function subjectById(id: string): Subject | undefined {
  return refreshSubjects().find((s) => s.id === id);
}

/**
 * A subject door. The framework does its own clubbing — if a board teaches one "Science", the
 * registry says "Science" and that is the door. The client never splits or merges a board's
 * subjects on its behalf.
 */
export interface DisplaySubject {
  id: string;
  name: string;
  line: string;
  /** Kept for the screens that ask which canonical families sit behind a door. */
  subjectIds: string[];
}

export function displaySubjects(): DisplaySubject[] {
  return refreshSubjects().map((s) => ({
    id: s.id,
    name: s.name,
    line: s.line,
    subjectIds: [subjectFamily(s.name)],
  }));
}

export function displaySubjectById(id: string): DisplaySubject | undefined {
  return displaySubjects().find((d) => d.id === id);
}

/**
 * Prerequisite suggestions. The concept graph that knows them lives in the brain, so until a turn
 * asks for them the client claims none — a suggestion we cannot source is a suggestion we do not
 * make (CURRICULUM.md §12).
 */
export function unmetPrereqs(topic: Topic, completed: ReadonlySet<string>): Topic[] {
  return topic.prereqTopicIds
    .map((id) => topicById(id))
    .filter((p): p is Topic => Boolean(p) && !completed.has((p as Topic).id));
}

/** Every topic of the learner's world that has been loaded, in subject then chapter order. */
export function loadedTopics(): Topic[] {
  syncWorld();
  const out: Topic[] = [];
  for (const subject of refreshSubjects()) {
    for (const chapter of bySubject[subject.id] ?? []) out.push(...chapter.topics);
  }
  return out;
}
