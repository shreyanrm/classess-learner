/**
 * Adopting a curriculum — the one place a learner's world is set.
 *
 * Every door into "this is what I study" goes through here: the registry search, the "not listed,
 * go and look" path, the own-syllabus path, and the class change on the learner's own page. They
 * share one shape so they share one guarantee — a world is only ever written from an answer the
 * brain gave. A board we could not pin produces a discovery job and a null world, not a world with
 * a hopeful name in it.
 */

import {
  CurriculumError,
  type CurriculumFramework,
  type CurriculumStatusView,
  type OwnFrameworkView,
} from '@wobo/sdk';
import { cache } from './cache';
import { curriculum, curriculumReady } from './client';
import { loadWorld, patchWorld, saveWorld, schoolLevels, type World, worldFrom } from './world';

export interface Adoption {
  /** The learner's new world, when the brain could pin one. */
  world: World | null;
  /** A discovery job now running for a curriculum we do not hold yet. */
  discovery: CurriculumStatusView | null;
  /** Wobo's line when neither happened. */
  error: string | null;
}

const OFFLINE = 'I cannot reach my list of boards right now. Try again in a moment.';

function voiceOf(error: unknown): string {
  if (error instanceof CurriculumError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return OFFLINE;
}

/**
 * Pin a framework the registry knows, and — when a class is named — bring its subjects with it.
 * A framework the registry does not know goes out as a discovery job instead.
 */
export async function adoptFramework(input: {
  frameworkId: string;
  /** What the learner typed or tapped, used only if we have to go looking. */
  name: string;
  level?: string | null;
}): Promise<Adoption> {
  if (!curriculumReady()) return { world: null, discovery: null, error: OFFLINE };

  try {
    const pinned = await curriculum().pin(input.frameworkId);
    const level = input.level ?? null;
    let levels = schoolLevels(pinned.framework.levels);
    let subjects: string[] = [];

    if (level) {
      const view = await curriculum().framework(input.frameworkId, { level });
      levels = schoolLevels(view.levels.length ? view.levels : levels);
      subjects = view.subjects;
    }

    const world = worldFrom(pinned.framework, {
      version: pinned.version,
      label: pinned.label,
      level,
      levels,
      subjects,
    });
    // A different framework or version means the previous one's cached chapters are not ours.
    const previous = loadWorld();
    if (
      previous &&
      (previous.frameworkId !== world.frameworkId || previous.versionId !== world.versionId)
    )
      cache.forget(previous.frameworkId, previous.versionId);
    saveWorld(world);
    return { world, discovery: null, error: null };
  } catch (error) {
    if (error instanceof CurriculumError && error.offersOwnSyllabus) {
      return askDiscovery(input.name, input.level ?? null);
    }
    return { world: null, discovery: null, error: voiceOf(error) };
  }
}

/**
 * Ask the brain to go and find a curriculum by name (CURRICULUM.md §4). Returns the job's state so
 * the screen can show an honest status card, and never a world — there is nothing to study yet.
 */
export async function askDiscovery(name: string, level: string | null): Promise<Adoption> {
  if (!curriculumReady()) return { world: null, discovery: null, error: OFFLINE };
  try {
    const status = await curriculum().status({ q: name, ...(level ? { level } : {}) });
    return { world: null, discovery: status, error: null };
  } catch (error) {
    return { world: null, discovery: null, error: voiceOf(error) };
  }
}

/** Choose (or change) the class inside the world the learner already has. */
export async function chooseLevel(level: string): Promise<Adoption> {
  const world = loadWorld();
  if (!world) return { world: null, discovery: null, error: null };
  if (!curriculumReady()) {
    return { world: patchWorld({ level, subjects: [] }), discovery: null, error: OFFLINE };
  }
  try {
    const view = await curriculum().framework(world.frameworkId, { level });
    return {
      world: patchWorld({
        level,
        levels: schoolLevels(view.levels.length ? view.levels : world.levels),
        subjects: view.subjects,
        label: view.label || world.label,
      }),
      discovery: null,
      error: null,
    };
  } catch (error) {
    // The class is still theirs; the subjects simply are not here yet.
    return { world: patchWorld({ level, subjects: [] }), discovery: null, error: voiceOf(error) };
  }
}

/** The learner's own syllabus, once they have confirmed and published it (§6). */
export function adoptOwnSyllabus(view: OwnFrameworkView): World {
  const framework: CurriculumFramework = { ...view.framework, label: view.label };
  const world = worldFrom(framework, {
    label: view.label,
    level: view.level || null,
    levels: schoolLevels(framework.levels.length ? framework.levels : [view.level]),
    subjects: view.subject ? [view.subject] : [],
  });
  saveWorld(world);
  return world;
}

/** Leave the current world entirely — "start over" on this device. */
export function forgetWorld(): void {
  const world = loadWorld();
  if (world) cache.forget(world.frameworkId);
  saveWorld(null);
}
