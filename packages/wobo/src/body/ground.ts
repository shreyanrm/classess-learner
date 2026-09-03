/**
 * What holds Wobo down.
 *
 * Wobo floats, and something has to say the floor is there or Wobo reads as a sticker. The rig has
 * always drawn a flat tonal ellipse under the orb — deliberately NOT a shadow: no blur, no offset,
 * no second light source, just Wobo's own ink at a tenth of its weight, the way a printed contact
 * patch works (DESIGN.md §2, law 3: depth is hairlines and tonal steps, never a shadow).
 *
 * That reading is scale-dependent, and the proofs caught the point where it breaks. At bench size
 * the patch is plainly a tonal mark on the page. Blown up to hero size it is a soft grey ellipse
 * sitting below a floating orb with a gap between them, and no viewer on earth calls that anything
 * but a drop shadow — least of all in a product whose first law is that it has none.
 *
 * So above a threshold the patch is replaced by the mark the rest of the system grounds things
 * with: a half-pixel hairline, drawn as a short rule under Wobo. Same job, same vocabulary as every
 * card edge and section rule in the app, and at that size the hairline is the more confident mark
 * of the two anyway.
 *
 * Pure and free of React, so the threshold is a number in a test rather than a judgement in a
 * screenshot.
 */

export type GroundMark = 'patch' | 'hairline';

/**
 * The largest rendered size, in px, at which the tonal patch still reads as a contact patch.
 *
 * Set from the proofs rather than from taste: the bench draws Wobo at 92 and 148 and the patch is
 * right at both; the landing hero draws Wobo at 210 and it is a shadow. The line is drawn above the
 * largest size that was reviewed as correct and below the size that failed.
 */
export const GROUND_PATCH_MAX_SIZE = 160;

/** Which grounding mark a Wobo of this rendered size gets. */
export function groundMark(size: number): GroundMark {
  return Number.isFinite(size) && size > GROUND_PATCH_MAX_SIZE ? 'hairline' : 'patch';
}

/**
 * The grounding mark's geometry in the rig's own 150 x 124 unit space.
 *
 * The hairline is narrower than the patch on purpose: a contact patch is the shape of the thing
 * resting on it, and a rule is a mark on the page, so it is drawn as a rule — shorter than Wobo is
 * wide, which reads as a line Wobo stands on rather than as a plinth Wobo sits on.
 */
export const GROUND_GEOMETRY = Object.freeze({
  /** Both marks are centred on Wobo. */
  cx: 75,
  /**
   * The tonal patch: a flat ellipse in Wobo's own ink, a little below the shell.
   *
   * The clearance is right for a patch — a contact patch is the floor Wobo is above, and a gap
   * between them is the gap a person expects to see.
   */
  patch: Object.freeze({ cy: 112, rx: 26, ry: 3.5, opacity: 0.1 }),
  /**
   * The hairline: the system's own rule weight, drawn where the shell actually ends.
   *
   * A rule read at the patch's height did not look like a floor, it looked like an underline
   * floating clear of the thing above it. The shell's lowest ink is at 108 (the head's centre plus
   * its radius), so the rule sits a half unit under that and Wobo stands on it.
   */
  hairline: Object.freeze({ cy: 108.5, halfWidth: 30, strokeWidth: 0.5, opacity: 0.34 }),
});
