/**
 * The learner's world: which framework they follow, which version they are pinned to, and which
 * level they are in. One small record, scoped to the learner (a sibling on the same tablet has
 * their own), and the single source of truth for every screen that asks "what am I studying".
 *
 * An empty world is a real state, not a bug: a device that has never chosen a board has no
 * syllabus, and every surface says so and offers the search. Nothing here ever defaults to a board
 * or a class — that default is exactly the invented CBSE Class 8 the audit caught.
 */

import type { CurriculumFramework, CurriculumStatus, CurriculumVersion } from '@wobo/sdk';
import { scoped } from '../store/scope';

export const WORLD_KEY = 'wobo-curriculum-world-v1';

export interface World {
  frameworkId: string;
  frameworkName: string;
  /** The version the learner is pinned to. Null until the brain has pinned one. */
  versionId: string | null;
  versionYear: string | null;
  status: CurriculumStatus;
  /** The brain's honest label for what they are looking at (CURRICULUM.md §5). */
  label: string;
  /** Their class or grade, in the framework's own words. Null until they pick one. */
  level: string | null;
  /** The levels this framework has, grades 4 to 13 only. */
  levels: string[];
  /** The subjects at the chosen level. Empty until a level is chosen. */
  subjects: string[];
  /** True for the learner's own syllabus — never shared unless they offer it. */
  personal: boolean;
}

type Listener = (world: World | null) => void;
const listeners = new Set<Listener>();
let cached: World | null | undefined;

const strings = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

/** Read the world. Anything unreadable is an empty world, never a half-built one. */
export function loadWorld(): World | null {
  if (cached !== undefined) return cached;
  cached = read();
  return cached;
}

function read(): World | null {
  try {
    const raw = scoped.getItem(WORLD_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<World>;
    // A half-written world is no world: a framework with no name could only ever be guessed at.
    if (!p.frameworkId?.trim() || !p.frameworkName?.trim()) return null;
    return {
      frameworkId: p.frameworkId.trim(),
      frameworkName: p.frameworkName.trim(),
      versionId: p.versionId?.trim() || null,
      versionYear: p.versionYear?.trim() || null,
      status: (p.status as CurriculumStatus) ?? 'provisional',
      label: typeof p.label === 'string' ? p.label : '',
      level: p.level?.trim() || null,
      levels: strings(p.levels),
      subjects: strings(p.subjects),
      personal: p.personal === true,
    };
  } catch {
    return null;
  }
}

export function saveWorld(world: World | null): void {
  cached = world;
  if (world) scoped.setItem(WORLD_KEY, JSON.stringify(world));
  else scoped.removeItem(WORLD_KEY);
  for (const listener of listeners) listener(world);
}

/** Merge a partial change into the world. Does nothing when there is no world to change. */
export function patchWorld(patch: Partial<World>): World | null {
  const current = loadWorld();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveWorld(next);
  return next;
}

/**
 * Forget the cached read — used after a scope change (a different learner on this device) and
 * after storage is cleared. Everything downstream is told, so a previous learner's subjects and
 * chapters cannot survive into the next one's session.
 */
export function resetWorldCache(): void {
  cached = undefined;
  const world = loadWorld();
  for (const listener of listeners) listener(world);
}

export function subscribeWorld(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Build a world from what the registry just told us about a framework. */
export function worldFrom(
  framework: CurriculumFramework,
  options: {
    version?: CurriculumVersion | null;
    label?: string;
    level?: string | null;
    levels?: string[];
    subjects?: string[];
  } = {},
): World {
  return {
    frameworkId: framework.id,
    frameworkName: framework.name,
    versionId: options.version?.id ?? null,
    versionYear: options.version?.year ?? null,
    status: framework.status,
    label: options.label ?? framework.label,
    level: options.level ?? null,
    levels: options.levels ?? framework.levels,
    subjects: options.subjects ?? [],
    personal: framework.personal,
  };
}

/** Grades 4 to 13, school level only (CURRICULUM.md §11) — the client's own guard on a level list. */
export const GRADE_MIN = 4;
export const GRADE_MAX = 13;

/** The grade number inside a level's name ("Class 9" -> 9, "Year 11" -> 11), or null. */
export function gradeOf(level: string): number | null {
  const match = level.match(/\d{1,2}/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Keep only school levels in range. A level with no number in its name (IGCSE, "Lower Secondary")
 * is kept — the framework knows its own stages better than a regular expression does.
 */
export function schoolLevels(levels: readonly string[]): string[] {
  return levels.filter((level) => {
    const grade = gradeOf(level);
    return grade === null || (grade >= GRADE_MIN && grade <= GRADE_MAX);
  });
}
