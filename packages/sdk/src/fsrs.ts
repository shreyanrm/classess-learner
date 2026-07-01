/**
 * FSRS-lite spaced-retrieval scheduler. A compact scheduler in the spirit of FSRS (stability grows on
 * success, resets on a lapse; difficulty adapts) — enough to prove the retrieval mechanic on the atom.
 * The full FSRS parameter set slots in behind this same interface later.
 */

export interface RetrievalCard {
  stabilityDays: number;
  difficulty: number; // 1 (easy) .. 10 (hard)
  reps: number;
  lapses: number;
  dueAt: string; // ISO-8601
}

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const DAY_MS = 86_400_000;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Review a card after an unaided attempt, returning the next scheduling state. */
export function reviewCard(
  prev: RetrievalCard | null,
  correct: boolean,
  nowMs: number,
): RetrievalCard {
  const priorDifficulty = prev?.difficulty ?? 5;
  const difficulty = clamp(
    correct ? priorDifficulty - 0.5 : priorDifficulty + 1,
    MIN_DIFFICULTY,
    MAX_DIFFICULTY,
  );

  let stabilityDays: number;
  if (!correct) {
    stabilityDays = 0.02; // ~30 minutes: bring a lapsed item back soon
  } else if (!prev) {
    stabilityDays = 1;
  } else {
    // Easier cards grow faster; harder cards grow slowly. Always at least a small increase.
    const growth = Math.max(1.3, 1 + (2.5 - difficulty / 4) * 0.9);
    stabilityDays = Math.max(1, prev.stabilityDays * growth);
  }

  return {
    stabilityDays,
    difficulty,
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
    dueAt: new Date(nowMs + stabilityDays * DAY_MS).toISOString(),
  };
}
