/**
 * The universal frame — a learner's whole curriculum world, assembled per board + grade from the
 * real catalogs in content/catalogs/*.json (the NCERT-reconciled slices). CBSE Class 8 (the atom)
 * and Class 10 keep their hand-carried, richly-wired arrays in catalog.ts; every OTHER board+grade
 * combination is built here from JSON — real subjects, chapters, and topics, never fabricated.
 *
 * Two speeds, honestly (DESIGN §5 / the mission's building screen):
 *  - INSTANT — a frame already in memory or persisted to localStorage (board-shared cache).
 *  - SLOW    — first time for a board+grade: its JSON is code-split and fetched, built, then cached
 *              so it is instant ever after. Frames cached per board+grade, never baked into a bundle.
 *
 * The builder (`buildFrame`) is pure and JSON-in, so the drift-guard test can bind each board's
 * frame to its source (test/frame.test.ts) without the Vite import wrapper.
 */

import type { DisplaySubject } from './catalog';
import type { Chapter, Topic } from './model';

export interface Frame {
  boardId: string;
  grade: string;
  /** The board's own subject doors, in its own naming and order. */
  doors: DisplaySubject[];
  /** Chapters keyed by the board's subject id (the door id) — a topic is a course. */
  chaptersBySubject: Record<string, Chapter[]>;
}

/** The raw shape content/catalogs/*.json carries — chapter name + topic name/blurb, in order. */
interface JsonTopic {
  name: string;
  blurb?: string;
}
interface JsonChapter {
  index: number;
  name: string;
  topics: JsonTopic[];
}
interface JsonSubject {
  id: string;
  name: string;
  chapters: JsonChapter[];
}
export interface JsonGrade {
  grade: string;
  subjects: JsonSubject[];
}

/**
 * A board names Physical Science / Biological Science / Computer / History & Civics its own way; the
 * canonical family behind each drives the shared visuals (hue, glyph, scene). Presentation only —
 * the door keeps the board's real id so distinct doors never collide (Maharashtra keeps History and
 * Geography as two doors).
 */
const CANON: Record<string, string> = {
  math: 'math',
  science: 'science',
  physical_science: 'physics',
  biological_science: 'biology',
  physics: 'physics',
  chemistry: 'chemistry',
  biology: 'biology',
  evs: 'science',
  computer: 'cs',
  cs: 'cs',
  social: 'social',
  history_civics: 'social',
  geography: 'social',
};

export function canonicalSubjectId(id: string): string {
  return CANON[id] ?? id;
}

/** One quiet line under a door — the canonical family's line, or a calm default. */
const LINES: Record<string, string> = {
  math: 'patterns, structure, and certainty',
  physics: 'forces, fields, and why things move',
  chemistry: 'what everything is made of',
  biology: 'the machinery of living things',
  cs: 'how machines think in steps',
  social: 'people, places, and power',
  science: 'how the world actually works',
};

/** Which boards have a real catalog — the seam that decides sourceable vs unknown. */
const CATALOG_LOADERS: Record<string, () => Promise<{ default: { grades: JsonGrade[] } }>> = {
  cbse: () => import('../../../../content/catalogs/cbse.json'),
  telangana: () => import('../../../../content/catalogs/telangana.json'),
  karnataka: () => import('../../../../content/catalogs/karnataka.json'),
  icse: () => import('../../../../content/catalogs/icse.json'),
  ap: () => import('../../../../content/catalogs/ap.json'),
  maharashtra: () => import('../../../../content/catalogs/maharashtra.json'),
};

export function boardIsSourceable(boardId: string): boolean {
  return boardId in CATALOG_LOADERS;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);

/**
 * Assemble a frame from one grade slice of a catalog JSON — pure, deterministic, testable. Topic and
 * chapter ids are stable per board+grade so mastery, the twin, and deep links survive a rebuild.
 */
export function buildFrame(boardId: string, grade: string, slice: JsonGrade): Frame {
  const gradeKey = slug(grade);
  const doors: DisplaySubject[] = [];
  const chaptersBySubject: Record<string, Chapter[]> = {};

  for (const subject of slice.subjects) {
    const sid = subject.id;
    const canon = canonicalSubjectId(sid);
    doors.push({
      id: sid,
      name: subject.name,
      line: LINES[canon] ?? '',
      subjectIds: [sid],
    });
    chaptersBySubject[sid] = subject.chapters.map((ch): Chapter => {
      const chapterId = `${boardId}-${gradeKey}-${sid}-c${ch.index}`;
      return {
        id: chapterId,
        subjectId: sid,
        index: ch.index,
        name: ch.name,
        topics: ch.topics.map(
          (t, ti): Topic => ({
            id: `${chapterId}-t${ti + 1}`,
            chapterId,
            name: t.name,
            blurb: t.blurb ?? '',
            prereqTopicIds: [],
            kind: 'syllabus',
            xp: 120,
          }),
        ),
      };
    });
  }

  return { boardId, grade, doors, chaptersBySubject };
}

// --- the cache (in-memory + localStorage, per board+grade) -----------------------------------------

const memory = new Map<string, Frame>();
const topicReg = new Map<string, Topic>();
const chapterReg = new Map<string, Chapter>();

const key = (boardId: string, grade: string) => `${boardId}:${grade}`;
const persistKey = (boardId: string, grade: string) => `wobo-frame-v1:${boardId}:${grade}`;

function register(frame: Frame): Frame {
  memory.set(key(frame.boardId, frame.grade), frame);
  for (const chapters of Object.values(frame.chaptersBySubject))
    for (const ch of chapters) {
      chapterReg.set(ch.id, ch);
      for (const t of ch.topics) topicReg.set(t.id, t);
    }
  return frame;
}

function persist(frame: Frame): void {
  try {
    localStorage.setItem(
      persistKey(frame.boardId, frame.grade),
      JSON.stringify({ doors: frame.doors, chaptersBySubject: frame.chaptersBySubject }),
    );
  } catch {
    // storage full or unavailable — the in-memory frame still serves this session
  }
}

/**
 * The synchronous read every screen uses: memory first, then the persisted cache (hydrated once).
 * Returns null when a board+grade has never been built — the caller falls back (CBSE seed) or shows
 * the empty state. Never triggers a fetch; `ensureFrame` owns the slow path.
 */
export function frameSync(boardId: string, grade: string): Frame | null {
  const cached = memory.get(key(boardId, grade));
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(persistKey(boardId, grade));
    if (raw) {
      const { doors, chaptersBySubject } = JSON.parse(raw) as Pick<
        Frame,
        'doors' | 'chaptersBySubject'
      >;
      return register({ boardId, grade, doors, chaptersBySubject });
    }
  } catch {
    // unreadable cache — treat as cold
  }
  return null;
}

export type FrameStatus = 'ready' | 'unsourceable';
export interface FrameResult {
  status: FrameStatus;
  /** True when it was already cached — the building screen tells the honest instant vs slow story. */
  instant: boolean;
  frame?: Frame;
}

/**
 * The building screen awaits this. Cached → instant. Otherwise code-split the board's JSON, build,
 * cache, return. A board with no catalog (or a grade its catalog lacks) resolves `unsourceable` so
 * the screen can flag it for the fetch pipeline and fall to the warm empty state.
 */
export async function ensureFrame(boardId: string, grade: string): Promise<FrameResult> {
  const cached = frameSync(boardId, grade);
  if (cached) return { status: 'ready', instant: true, frame: cached };

  const loader = CATALOG_LOADERS[boardId];
  if (!loader) return { status: 'unsourceable', instant: false };
  try {
    const mod = await loader();
    const slice = mod.default.grades.find((g) => g.grade === grade);
    if (!slice) return { status: 'unsourceable', instant: false };
    const frame = register(buildFrame(boardId, grade, slice));
    persist(frame);
    return { status: 'ready', instant: false, frame };
  } catch {
    return { status: 'unsourceable', instant: false };
  }
}

/** A topic from any frame built so far (the current one, or a sibling cached earlier). */
export function frameTopic(id: string): Topic | undefined {
  return topicReg.get(id);
}
export function frameChapter(id: string): Chapter | undefined {
  return chapterReg.get(id);
}
