/**
 * Build step: the boards the landing page names.
 *
 * WOBO-PLAN §16 ("their curriculum is a fixed ladder; ours is every board on earth on demand")
 * means the landing page may not invent a list of boards. It reads the real registry —
 * `content/curriculum/frameworks.seed.json`, built and site-verified by the content pipeline — and
 * copies a CURATED subset plus the registry's own totals into `src/screens/landing/boards.json`.
 *
 * Curated, not filtered: eighteen chips is what a page can hold, and which eighteen is an editorial
 * call. What is NOT editorial is the words: the long name is the registry's `name`, and the short
 * name on the chip must be one of that framework's own registered aliases — asserted here, so a
 * chip cannot drift into a name the registry does not recognise, and a framework renamed or
 * removed upstream fails this build rather than lingering on the page.
 *
 * The content directory is READ ONLY from this script.
 *
 * Run: `bun run scripts/landing-boards.ts` (wired into `bun run build`).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SEED = join(REPO, 'content', 'curriculum', 'frameworks.seed.json');
const OUT = join(HERE, '..', 'src', 'screens', 'landing', 'boards.json');

export interface CuratedBoard {
  id: string;
  /** What the chip says. Must be the framework's `name` or one of its registered aliases. */
  short: string;
}

/**
 * The eighteen, in the order they read on the page: the boards our first learners actually sit,
 * then the international ones, then a shape of school that is not a board at all.
 */
export const CURATED: readonly CuratedBoard[] = [
  { id: 'cbse', short: 'CBSE' },
  { id: 'icse', short: 'ICSE' },
  { id: 'ncert-ncf', short: 'NCERT' },
  { id: 'bse-telangana', short: 'Telangana SSC' },
  { id: 'msbshse', short: 'Maharashtra board' },
  { id: 'kseab', short: 'Karnataka board' },
  { id: 'tn-dge', short: 'Tamil Nadu board' },
  { id: 'upmsp', short: 'UP board' },
  { id: 'wbbse', short: 'WBBSE' },
  { id: 'nios', short: 'NIOS' },
  { id: 'ib-dp', short: 'IB' },
  { id: 'cambridge-igcse', short: 'IGCSE' },
  { id: 'pearson-edexcel-international-gcse', short: 'Edexcel IGCSE' },
  { id: 'college-board-ap', short: 'AP' },
  { id: 'england-national-curriculum', short: 'UK national curriculum' },
  { id: 'acara-australian-curriculum', short: 'Australian Curriculum' },
  { id: 'ontario-curriculum', short: 'Ontario curriculum' },
  { id: 'montessori-ami', short: 'Montessori' },
];

/**
 * The common nouns a board name ends in. A registry alias is written however its owner writes it —
 * "Australian Curriculum" title-cased, "UK national curriculum" and "Ontario curriculum" not — and
 * put side by side in one chip row those two conventions read as a typo rather than as a citation.
 *
 * So the chip's WORDS come from the registry and the chip's CASE comes from here: the proper nouns
 * are left exactly as the registry writes them, and only these common nouns are lowered, and only
 * where they are not the first word of the name. Nothing in `content/` is touched — the seed is
 * another workflow's, and it is read here and never written.
 */
const COMMON_NOUNS = new Set(['curriculum', 'board', 'boards', 'national', 'school', 'schools']);

/** A chip label in the page's own sentence case. Idempotent, and it never invents a word. */
export function chipLabel(name: string): string {
  return name
    .split(' ')
    .map((word, i) => (i > 0 && COMMON_NOUNS.has(word.toLowerCase()) ? word.toLowerCase() : word))
    .join(' ');
}

export interface SeedFramework {
  id: string;
  name: string;
  aliases?: string[];
}

export interface Seed {
  last_build: string;
  counts: { total: number; countries: number };
  frameworks: SeedFramework[];
}

export interface LandingBoard {
  id: string;
  short: string;
  /** The registry's full name — the chip's title, so the short form is never the only truth. */
  name: string;
}

export interface LandingBoards {
  /** Where this file came from, so a reader never wonders whether it was hand-typed. */
  source: string;
  /** The registry build it was copied from. */
  registryBuild: string;
  /** Every framework in the registry, not just the eighteen shown. */
  total: number;
  countries: number;
  shown: LandingBoard[];
}

export function buildLandingBoards(seed: Seed, curated: readonly CuratedBoard[]): LandingBoards {
  const byId = new Map(seed.frameworks.map((f) => [f.id, f]));
  const shown: LandingBoard[] = [];
  for (const pick of curated) {
    const f = byId.get(pick.id);
    if (!f) throw new Error(`landing-boards: '${pick.id}' is not in the framework registry`);
    // Validated against the registry as written, then cased for the page. Validation first, so a
    // chip can never drift onto a name the framework does not answer to.
    const known = f.name === pick.short || (f.aliases ?? []).includes(pick.short);
    if (!known) {
      throw new Error(`landing-boards: '${pick.short}' is not a registered name for '${pick.id}'`);
    }
    shown.push({ id: f.id, short: chipLabel(pick.short), name: f.name });
  }
  return {
    source: 'content/curriculum/frameworks.seed.json',
    registryBuild: seed.last_build,
    total: seed.counts.total,
    countries: seed.counts.countries,
    shown,
  };
}

function main(): void {
  const seed = JSON.parse(readFileSync(SEED, 'utf8')) as Seed;
  const built = buildLandingBoards(seed, CURATED);
  writeFileSync(OUT, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
  console.log(`landing-boards: ${built.shown.length} shown of ${built.total} in the registry`);
}

if (import.meta.main) main();
