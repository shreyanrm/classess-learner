/**
 * The board — Wobo's hand, on three surfaces (docs/BOARD.md).
 *
 * `schema.ts` is the grammar and the single source of truth (mirrored into the brain by
 * `scripts/board-schema-codegen.ts`). `anchors.ts` keeps every mark tied to something real.
 * `pen.ts` and `handwriting.ts` make ink read as a hand. `geometry.ts` turns objects into strokes,
 * `layout.ts` places them so nothing collides, `store.ts` remembers them, `renderer.tsx` draws
 * them, `timeline.ts` scrubs them and `export.ts` shares them. `plane.tsx` and `fullboard.tsx` are
 * two of the three presentations; the third is `BoardSurface` itself, laid over the screen.
 * `chrome.tsx` is the frame around all three — the kit's shapes, held to DESIGN.md by
 * `test/board/chrome.test.ts`. It is exported because the app docks its own chrome beside the
 * plane (the keeper bar), and one board must not carry two vocabularies.
 */

export * from './anchors';
// Named, not a star: the board's own `Scrubber` is the timeline's, and the chrome's is a shape.
export { BoardChromeStyle, ChromeButton } from './chrome';
export * from './export';
export * from './fullboard';
export * from './geometry';
export * from './handwriting';
export * from './layout';
export * from './pen';
export * from './plane';
export * from './renderer';
export * from './schema';
export * from './store';
export * from './timeline';
