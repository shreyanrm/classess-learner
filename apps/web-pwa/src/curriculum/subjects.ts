/**
 * Subject families, for visuals only.
 *
 * A framework names its subjects in its own words — "Mathematics", "Physical Science", "History,
 * Civics and Geography", "Matemáticas". The glyphs, hues and scenes are drawn per family, so this
 * maps a name (or a legacy id) onto one of the seven families the art knows. It decides nothing
 * about what is taught: an unrecognised subject keeps its own name and gets the neutral family.
 */

const FAMILIES = ['math', 'physics', 'chemistry', 'biology', 'science', 'cs', 'social'] as const;
export type SubjectFamily = (typeof FAMILIES)[number] | 'general';

/** Ordered most specific first — "physical science" must not be caught by "science". */
const PATTERNS: [RegExp, SubjectFamily][] = [
  [/\b(math|maths|mathematic|algebra|geometr|arithmetic|calculus|statistic)/, 'math'],
  [/\b(physical\s*science|physics)\b/, 'physics'],
  [/\bchemistr/, 'chemistry'],
  [/\b(biolog|biological\s*science|life\s*science|botany|zoology)\b/, 'biology'],
  [/\b(computer|computing|informatics|information\s*technology|coding|programming)\b/, 'cs'],
  [/\b(social|history|civics|geograph|economic|political|humanit|citizenship)\b/, 'social'],
  [/\b(science|environmental\s*studies|evs|general\s*science)\b/, 'science'],
];

/** Legacy family ids the art and hue layers already speak. */
const IDS: Record<string, SubjectFamily> = {
  math: 'math',
  physics: 'physics',
  chemistry: 'chemistry',
  biology: 'biology',
  science: 'science',
  cs: 'cs',
  social: 'social',
  physical_science: 'physics',
  biological_science: 'biology',
  history_civics: 'social',
  geography: 'social',
  evs: 'science',
  computer: 'cs',
};

/** The family behind a subject's own name or id. Never renames the subject itself. */
export function subjectFamily(subject: string): SubjectFamily {
  const raw = subject.trim();
  if (!raw) return 'general';
  const direct = IDS[raw.toLowerCase().replace(/[\s-]+/g, '_')];
  if (direct) return direct;
  const s = raw.toLowerCase();
  for (const [pattern, family] of PATTERNS) if (pattern.test(s)) return family;
  return 'general';
}

/**
 * Back-compat name for the art and hue layers, which ask for a "canonical subject id".
 * It is the family, and it is presentation only.
 */
export function canonicalSubjectId(subject: string): string {
  const family = subjectFamily(subject);
  return family === 'general' ? subject : family;
}

/** One quiet line under a subject door. A family we do not know gets no line rather than a guess. */
const LINES: Record<SubjectFamily, string> = {
  math: 'patterns, structure, and certainty',
  physics: 'forces, fields, and why things move',
  chemistry: 'what everything is made of',
  biology: 'the machinery of living things',
  science: 'how the world actually works',
  cs: 'how machines think in steps',
  social: 'people, places, and power',
  general: '',
};

export function subjectLine(subject: string): string {
  return LINES[subjectFamily(subject)];
}
