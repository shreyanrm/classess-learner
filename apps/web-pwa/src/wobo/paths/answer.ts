/**
 * The one place a typed answer is judged. A fill-in-the-blank is checked against a model-written
 * string, so the learner must not lose a right answer to a capital letter, a double space or a
 * trailing full stop — only to being wrong.
 */

/** Trim, lowercase, collapse inner whitespace, drop trailing punctuation. */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .trim();
}

/** True when a typed answer matches the expected one after normalisation. */
export function answersMatch(given: string, expected: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(expected);
}
