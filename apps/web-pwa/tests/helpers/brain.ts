/**
 * The brain the browser talks to in an end-to-end run.
 *
 * The Playwright config starts the app keyless (`VITE_GATEWAY_URL=`), which is the honest empty
 * state — no board, no class, no chapters. A journey that needs a syllabus therefore has to supply
 * the brain, and it supplies a REAL one: the payloads below are built in Node from the actual
 * files under `content/curriculum/`, so a chapter a spec asserts is a chapter a board publishes.
 *
 * The client is installed at the SDK's own seam (`createCurriculumClient(url, { post })`), so the
 * SDK parsers, `src/curriculum/client.ts` and `world.ts` all run for real and nothing leaves the
 * machine. Install it AFTER the navigation that needs it — a navigation throws the page's modules
 * away and the installed client goes with them.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CONTENT = join(REPO, 'content/curriculum');
const SDK_ENTRY = `/@fs${join(REPO, 'packages/sdk/src/index.ts')}`;

export interface SyllabusFile {
  framework_id: string;
  framework_name: string;
  level: string;
  subject: string;
  version: string;
  status: string;
  units: Array<{ title?: string; name?: string; topics?: Array<Record<string, unknown>> }> | null;
}

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (entry.endsWith('.json')) out.push(path);
  }
  return out;
}

export const SYLLABI: SyllabusFile[] = walk(join(CONTENT, 'syllabi')).map(
  (path) => JSON.parse(readFileSync(path, 'utf8')) as SyllabusFile,
);

export const REGISTRY: Array<{ id: string; name: string; aliases?: string[]; levels?: string[] }> =
  JSON.parse(readFileSync(join(CONTENT, 'frameworks.seed.json'), 'utf8')).frameworks ??
  JSON.parse(readFileSync(join(CONTENT, 'frameworks.seed.json'), 'utf8'));

/** A syllabus with chapters in it — the case where a learner sees a real chapter list. */
/** A seeded syllabus with chapters, for a named board, class and subject. */
export function syllabusFor(frameworkId: string, level: string, subject: string): SyllabusFile {
  const found = SYLLABI.find(
    (s) =>
      s.framework_id === frameworkId &&
      s.level === level &&
      s.subject === subject &&
      (s.units?.length ?? 0) > 0,
  );
  if (!found)
    throw new Error(`no seeded syllabus with chapters for ${frameworkId} ${level} ${subject}`);
  return found;
}

export function withChapters(frameworkId: string): SyllabusFile {
  const found = SYLLABI.find((s) => s.framework_id === frameworkId && (s.units?.length ?? 0) > 0);
  if (!found) throw new Error(`no seeded syllabus with chapters for ${frameworkId}`);
  return found;
}

export const nameOf = (node: { title?: string; name?: string }): string =>
  String(node.title ?? node.name ?? '');

// --- the brain the page talks to -----------------------------------------------------------------

/**
 * One capability responder, built in Node from the fixtures and serialised into the page. It
 * answers exactly what Worker 1's capabilities answer, including the door that §3 says is never
 * more than one tap away.
 */
export function brainFor(file: SyllabusFile) {
  const entry = REGISTRY.find((f) => f.id === file.framework_id);
  const framework = {
    id: file.framework_id,
    name: entry?.name ?? file.framework_name,
    kind: 'national',
    status: file.status,
    aliases: entry?.aliases ?? [],
    country: 'IN',
    region: null,
    languages: ['en'],
    levels: entry?.levels ?? [file.level],
    official_site: null,
    personal: false,
  };
  const version = {
    id: 'v-seeded',
    framework_id: file.framework_id,
    label: file.version,
    status: file.status,
  };
  // §5: only `verified` names the framework, because that is the falsifiable claim.
  const label =
    file.status === 'verified'
      ? `Official ${framework.name} ${version.label}, verified`
      : file.status === 'community'
        ? 'Shared by another learner, not yet checked'
        : file.status === 'personal'
          ? 'Drafted from your syllabus, check it'
          : "Found on the board's site, still checking";
  const notListed = {
    action: 'own_syllabus',
    message: 'Not listed? Show me your syllabus and I will build it with you.',
  };
  const units = (file.units ?? []).map((unit, index) => ({
    id: `unit-${index}`,
    kind: 'unit',
    name: nameOf(unit),
    parent_id: 'subject-node',
    order: index,
    aliases: [],
    source_ref: { document_id: 'doc', page: 1, section: nameOf(unit) },
    concept_ids: [],
    own: false,
    not_in_my_school: false,
    textbook: null,
    renamed_from: null,
    source: null,
  }));
  return { framework, version, label, notListed, units, file };
}

/**
 * Install a curriculum client in the page. Everything below the seam is the app's real code: the
 * SDK client, its parsers, and `setCurriculumClient` from the app's own module.
 */
export async function installBrain(page: Page, brain: ReturnType<typeof brainFor>): Promise<void> {
  await page.evaluate(
    async ({ sdkEntry, b }) => {
      const sdk = (await import(/* @vite-ignore */ sdkEntry)) as {
        createCurriculumClient: (url: string, opts: { post: unknown }) => unknown;
      };
      const CLIENT_MODULE = '/src/curriculum/client.ts';
      const app = (await import(/* @vite-ignore */ CLIENT_MODULE)) as {
        setCurriculumClient: (client: unknown) => void;
      };

      const calls: Array<{ capability: string; payload: Record<string, unknown> }> = [];
      (window as unknown as { __calls: typeof calls }).__calls = calls;

      const block = {
        framework: b.framework,
        version: b.version,
        label: b.label,
        levels: b.framework.levels,
      };

      const post = async (capability: string, payload: Record<string, unknown>) => {
        calls.push({ capability, payload });
        switch (capability) {
          case 'curriculum.search': {
            const typed = String(payload.q ?? '').toLowerCase();
            const haystack = [b.framework.name, ...b.framework.aliases, b.framework.id]
              .join(' ')
              .toLowerCase();
            const hit = typed.length > 0 && haystack.includes(typed);
            return {
              query: payload.q,
              country: payload.country ?? null,
              results: hit ? [{ ...b.framework, label: b.label }] : [],
              not_listed: b.notListed,
            };
          }
          case 'curriculum.framework': {
            const level = payload.level as string | undefined;
            const subjects = level === b.file.level ? [b.file.subject] : [];
            return {
              ...block,
              subjects,
              level: level ?? null,
              pinned_version_id: b.version.id,
              ...(level && subjects.length === 0 ? { not_listed: b.notListed } : {}),
            };
          }
          case 'curriculum.units': {
            const known = payload.level === b.file.level && payload.subject === b.file.subject;
            if (!known || b.units.length === 0) {
              return {
                ...block,
                level: payload.level,
                subject: payload.subject,
                status: 'looking',
                units: [],
                placeholder: {
                  id: 'job-1',
                  state: 'searching',
                  open: true,
                  message: 'Looking for the official syllabus now',
                },
                label: 'Looking for the official syllabus now',
                not_listed: b.notListed,
              };
            }
            return {
              ...block,
              level: payload.level,
              subject: payload.subject,
              subject_id: 'subject-node',
              status: 'ready',
              units: b.units,
            };
          }
          case 'curriculum.pin':
            // §2: the learner is pinned to a version, and everything after is that version.
            return { ...block, pinned: true };
          case 'curriculum.overlay.get':
            return { framework_id: payload.framework_id, ops: [], last_report: [] };
          case 'curriculum.overlay.apply':
            return {
              framework_id: payload.framework_id,
              ops: Array.isArray(payload.ops) ? payload.ops : [],
              last_report: [],
            };
          case 'curriculum.own.read':
            return {
              label: 'Drafted from your syllabus, check it',
              framework: {
                id: 'own:aanya-1',
                name: String(payload.framework_name ?? 'My syllabus'),
                kind: 'personal',
                status: 'personal',
                personal: true,
                level: payload.level,
                subject: payload.subject ?? null,
                units: String(payload.text ?? '')
                  .split('\n')
                  .map((line: string) => line.trim())
                  .filter((line: string) => line.length > 0)
                  .map((line: string, index: number) => ({
                    id: `own-${index}`,
                    kind: 'unit',
                    name: line,
                    parent_id: null,
                    order: index,
                    aliases: [],
                    source_ref: null,
                    concept_ids: [],
                    own: true,
                    not_in_my_school: false,
                    textbook: null,
                    renamed_from: null,
                    source: null,
                    confirmed: false,
                  })),
                unconfirmed: [],
              },
            };
          default:
            return {};
        }
      };

      app.setCurriculumClient(sdk.createCurriculumClient('', { post }));
    },
    { sdkEntry: SDK_ENTRY, b: brain },
  );
}

// --- the atom course ------------------------------------------------------------------------------

/**
 * The brain for a journey that has to reach the atom — the proven course for solving linear
 * equations in one variable.
 *
 * No board in the registry publishes a chapter by that name for this learner, and Wave 6 deleted
 * the bundled catalog that used to pretend one did. The honest way to that topic is the way the
 * product itself offers: the learner's OWN syllabus (`CURRICULUM.md` §6). So this brain answers as
 * a personal framework — kind and status `personal`, labelled as the learner's own — carrying the
 * one chapter and the one topic, and the topic carries the canonical concept id the atom course is
 * built against (§7). That is what makes the course player open the atom rather than compose.
 *
 * It is a double for the CONCEPT MAPPING, not for the door. The real gateway now answers
 * `curriculum.units`, `curriculum.topics`, `curriculum.pin` and the overlay capabilities on a
 * published personal framework — `curriculum.own.publish` writes it into the registry under the
 * learner's own subject, and `services/gateway/tests/test_curriculum_laws.py` holds it to exactly
 * the shape below. What the real store cannot yet supply is a topic already carrying a chosen
 * canonical concept id, which is the one thing this journey needs pinned; that is what is stubbed.
 */
export function atomBrain(atomConceptId: string) {
  const framework = {
    id: 'own:atom-journey',
    name: 'My own chapter list',
    kind: 'personal',
    status: 'personal',
    aliases: [],
    country: null,
    region: null,
    languages: ['en'],
    levels: ['Class 8'],
    official_site: null,
    personal: true,
  };
  const version = {
    id: 'own-v1',
    framework_id: framework.id,
    label: '1',
    status: 'personal',
  };
  const unit = {
    id: 'm2',
    kind: 'unit',
    name: 'Linear equations in one variable',
    parent_id: 'subject-node',
    order: 0,
    aliases: [],
    source_ref: null,
    concept_ids: [],
    own: true,
    not_in_my_school: false,
    textbook: null,
    renamed_from: null,
    source: null,
  };
  const topic = {
    ...unit,
    id: 'm2-1',
    kind: 'topic',
    name: 'Solving equations with the variable on one side',
    parent_id: unit.id,
    concept_ids: [atomConceptId],
    objectives: [],
  };
  return { framework, version, unit, topic };
}

/** Install the atom brain. Call it AFTER the navigation that needs it. */
export async function installAtomBrain(page: Page, atomConceptId: string): Promise<void> {
  await page.evaluate(
    async ({ sdkEntry, b }) => {
      const sdk = (await import(/* @vite-ignore */ sdkEntry)) as {
        createCurriculumClient: (url: string, opts: { post: unknown }) => unknown;
      };
      const app = (await import(/* @vite-ignore */ '/src/curriculum/client.ts')) as {
        setCurriculumClient: (client: unknown) => void;
      };
      const block = {
        framework: b.framework,
        version: b.version,
        label: 'Drafted from your syllabus, check it',
        levels: b.framework.levels,
      };
      const post = async (capability: string, payload: Record<string, unknown>) => {
        switch (capability) {
          case 'curriculum.pin':
            return { ...block, pinned: true };
          case 'curriculum.framework':
            return { ...block, level: payload.level ?? 'Class 8', subjects: ['Mathematics'] };
          case 'curriculum.units':
            return {
              ...block,
              level: payload.level,
              subject: payload.subject,
              subject_id: 'subject-node',
              status: 'ready',
              units: [b.unit],
            };
          case 'curriculum.topics':
            return { ...block, unit: b.unit, topics: [b.topic] };
          case 'curriculum.overlay.get':
            return { framework_id: b.framework.id, ops: [], last_report: [] };
          case 'curriculum.overlay.apply':
            return {
              framework_id: b.framework.id,
              ops: Array.isArray(payload.ops) ? payload.ops : [],
              last_report: [],
            };
          default:
            return {};
        }
      };
      app.setCurriculumClient(sdk.createCurriculumClient('', { post }));
    },
    { sdkEntry: SDK_ENTRY, b: atomBrain(atomConceptId) },
  );
}

/** The world the atom brain answers for, written before the app boots. */
export const ATOM_WORLD = {
  frameworkId: 'own:atom-journey',
  frameworkName: 'My own chapter list',
  versionId: 'own-v1',
  versionYear: '1',
  status: 'personal',
  label: 'Drafted from your syllabus, check it',
  level: 'Class 8',
  levels: ['Class 8'],
  subjects: ['Mathematics'],
};

/**
 * Pin the learner to that world before the app script runs, the way `adoptFramework` would have.
 * The e2e run has no account layer, so the per-learner scope is empty and the key is the bare one.
 */
export async function seedAtomWorld(page: Page): Promise<void> {
  await page.addInitScript((world) => {
    localStorage.setItem('wobo-curriculum-world-v1', JSON.stringify(world));
  }, ATOM_WORLD);
}
