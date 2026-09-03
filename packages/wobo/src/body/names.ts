/**
 * Display names for the rig's identifiers.
 *
 * The expressions, behaviours and scenes are keyed by camelCase identifiers, because that is what a
 * caller types. A contact sheet is not a caller: putting `followPointer`, `penTap`, `gotIt` and
 * `headShake` on a page next to `wave` and `drift` shows the reader the variable rather than the
 * thing, and reads as a screen nobody finished (DESIGN.md: sentence case, everywhere, including the
 * surfaces only we look at).
 *
 * Derived rather than hand-listed on purpose: a table of forty labels is a table that goes stale
 * the first time somebody adds a scene. Pure, so it is a test rather than a screenshot.
 */

/**
 * An identifier as a person reads it: camel humps become spaces, and the whole thing is sentence
 * case — first letter up, the rest as written, so an acronym inside a name survives.
 */
export function displayName(identifier: string): string {
  const words = identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((word, i) => {
      // The first word opens the sentence. Every word after it goes down, unless it is written in
      // capitals throughout — an acronym is a name, and lowering it would be a different word.
      if (i === 0) return (word[0] ?? '').toUpperCase() + word.slice(1);
      if (word === word.toUpperCase()) return word;
      return (word[0] ?? '').toLowerCase() + word.slice(1);
    })
    .join(' ');
}
