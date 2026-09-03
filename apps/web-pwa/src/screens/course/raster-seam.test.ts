/**
 * The raster seam, end to end on the client side.
 *
 * The gateway has always been able to serve a rastered diagram — `engines.run_engine` routes
 * `engine.diagram` with a truthy `raster` through Nano Banana and wraps the image as an inline
 * SVG — and `_verify_image_spec`'s docstring states that the client hydrates an `imageSpec` card
 * that way. Nothing ever sent the flag, so the seam was unreachable from the requesting side.
 * These tests pin the request the client now makes, from the wire card through to the payload.
 */

import { describe, expect, it } from 'bun:test';
import { engineRequest, type GenCard, parseGenCourse } from './Composing';

const item = (i: number) => ({
  type: 'fill',
  prompt: `q${i}`,
  answer: 'a',
});

/** A minimal wire course that survives the gate: three cards, three workbook items, three boss. */
function wireCourse(cards: unknown[]): Record<string, unknown> {
  return {
    topic: 'The cell',
    cards,
    workbook: [item(1), item(2), item(3)],
    boss: [item(4), item(5), item(6)],
  };
}

function wireCard(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    kind: 'diagram',
    title: `card ${id}`,
    idea: 'an idea worth a look',
    reveal: 'the reveal',
    interaction: { kind: 'tap', prompt: 'tap it' },
    ...extra,
  };
}

const card = (over: Partial<GenCard> = {}): GenCard => ({
  id: 'c1',
  kind: 'diagram',
  title: 'The cell wall',
  idea: 'an idea worth a look',
  interaction: { kind: 'tap', prompt: 'tap it' },
  reveal: 'the reveal',
  ...over,
});

describe('the raster seam is reachable from the client', () => {
  it('asks for a raster only when the card declared an imageSpec', () => {
    const plain = engineRequest(card(), 'Biology', 'course-1');
    expect(plain.capability).toBe('engine.diagram');
    expect(plain.payload.raster).toBeUndefined();
    expect('raster' in plain.payload).toBe(false);

    const rastered = engineRequest(
      card({ imageSpec: { subject: 'a plant cell under a microscope' } }),
      'Biology',
      'course-1',
    );
    expect(rastered.capability).toBe('engine.diagram');
    expect(rastered.payload.raster).toBe(true);
  });

  it('prompts with the subject the model named, not the card title', () => {
    const req = engineRequest(
      card({ title: 'Look closer', imageSpec: { subject: 'a plant cell under a microscope' } }),
      'Biology',
      'course-1',
    );
    expect(req.payload.concept).toBe('Biology: a plant cell under a microscope');
    // and the untouched fields still travel
    expect(req.payload.topic).toBe('Biology');
    expect(req.payload.course_id).toBe('course-1');
    expect(req.payload.difficulty).toBe('core');
  });

  it('never rasters a sim card, whatever it carries', () => {
    const req = engineRequest(
      card({ kind: 'sim', imageSpec: { subject: 'a plant cell' } }),
      'Biology',
      'course-1',
    );
    expect(req.capability).toBe('engine.simulate');
    expect('raster' in req.payload).toBe(false);
  });

  it('carries a wire imageSpec through the gate and into the request', () => {
    const course = parseGenCourse(
      wireCourse([
        wireCard('c1', { imageSpec: { subject: 'a plant cell', caption: 'under a microscope' } }),
        wireCard('c2'),
        wireCard('c3'),
      ]),
      'fallback',
    );
    expect(course).not.toBeNull();
    const cards = course?.cards ?? [];
    expect(cards[0]?.imageSpec).toEqual({ subject: 'a plant cell', caption: 'under a microscope' });
    expect(cards[1]?.imageSpec).toBeUndefined();
    expect(engineRequest(cards[0] as GenCard, 'Biology', 'x').payload.raster).toBe(true);
    expect('raster' in engineRequest(cards[1] as GenCard, 'Biology', 'x').payload).toBe(false);
  });

  it('refuses a malformed imageSpec rather than spending a raster on it', () => {
    const course = parseGenCourse(
      wireCourse([
        wireCard('c1', { imageSpec: { caption: 'no subject' } }),
        wireCard('c2', { imageSpec: { subject: '   ' } }),
        wireCard('c3', { imageSpec: 'a plant cell' }),
      ]),
      'fallback',
    );
    for (const c of course?.cards ?? []) {
      expect(c.imageSpec).toBeUndefined();
      expect('raster' in engineRequest(c, 'Biology', 'x').payload).toBe(false);
    }
  });

  it('drops a blank caption instead of sending an empty one', () => {
    const course = parseGenCourse(
      wireCourse([
        wireCard('c1', { imageSpec: { subject: ' a plant cell ', caption: '  ' } }),
        wireCard('c2'),
        wireCard('c3'),
      ]),
      'fallback',
    );
    expect(course?.cards[0]?.imageSpec).toEqual({ subject: 'a plant cell' });
  });
});
