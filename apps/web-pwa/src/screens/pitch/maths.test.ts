/**
 * The three things a visitor can try, held to the prototypes' own arithmetic and words
 * (design/prototypes/site-students.html, site-how.html): the same loop, the same thresholds, the
 * same lines.
 */

import { describe, expect, it } from 'bun:test';
import {
  ANGLE_LINES,
  angleView,
  checkPoint,
  checkPuzzle,
  graphX,
  graphY,
  loopFor,
  POINT_LINES,
  PUZZLE_LINES,
  PUZZLE_WORDS,
  place,
} from './maths';

describe('colour half the square', () => {
  it('draws the loop the prototype draws around one cell', () => {
    // pos (0,0): box -4..100 → centre 48, radius 66 (52 + 14)
    const path = loopFor([0]);
    expect(path).toMatch(/^M[-\d.]+ [-\d.]+ C.* S.*$/);
    const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map((n) => Math.round(Number(n) * 10) / 10);
    expect(nums).toEqual([-18, 48, -18, -41.1, 114, -41.1, 114, 48, -11.4, 140.4, -24, 56]);
  });

  it('rings a quarter, three quarters and the whole thing, not half', () => {
    expect(checkPuzzle([true, false, false, false])).toEqual({
      line: PUZZLE_LINES.close,
      win: false,
      ring: { d: loopFor([0]), text: "that's a quarter, not half" },
    });
    expect(checkPuzzle([true, true, true, false]).ring?.text).toBe(
      "that's three quarters, not half",
    );
    expect(checkPuzzle([true, true, true, true]).ring?.text).toBe(
      "that's the whole thing, not half",
    );
  });

  it('says half is half, and asks for something first', () => {
    expect(checkPuzzle([true, false, false, true])).toEqual({
      line: "that's half. nice.",
      win: true,
      ring: null,
    });
    expect(checkPuzzle([false, false, false, false])).toEqual({
      line: 'colour something first',
      win: false,
      ring: null,
    });
  });

  it("keeps the prototype's words", () => {
    expect(PUZZLE_WORDS).toEqual([
      'nothing yet',
      "that's a quarter",
      '',
      "that's three quarters",
      "that's the whole thing",
    ]);
    expect(PUZZLE_LINES.start).toBe('tap the cells, then check');
  });
});

describe('turn the ray', () => {
  it('rotates about the vertex and labels the degrees', () => {
    const v = angleView(38);
    expect(v.transform).toBe('rotate(-38 40 190)');
    expect(v.deg).toBe('38°');
    expect(v.ok).toBe(false);
    expect(v.line).toBe(ANGLE_LINES.turn);
    expect(v.arc).toBe('M100 190 A60 60 0 0 0 87.3 153.1');
  });

  it('is a right angle within two degrees, close within eight', () => {
    expect(angleView(90).ok).toBe(true);
    expect(angleView(88).line).toBe("there. that's a right angle. nailed it.");
    expect(angleView(85).line).toBe('so close');
    expect(angleView(81).line).toBe('turn it');
  });

  it('places the label along the half angle, as the prototype does', () => {
    const v = angleView(90);
    expect(v.label.x).toBeCloseTo(40 + 94 * Math.cos(-Math.PI / 4), 6);
    expect(v.label.y).toBeCloseTo(190 + 94 * Math.sin(-Math.PI / 4), 6);
  });
});

describe('drag the point', () => {
  it('maps the graph to the drawing', () => {
    expect(graphX(3)).toBe(230);
    expect(graphY(7)).toBe(50);
  });

  it('clamps to the graph and reads the point', () => {
    expect(place(200, 200)).toEqual({ px: 200, py: 200, x: 2.5, y: 2, label: '(2.5, 2.0)' });
    expect(place(0, 400).label).toBe('(0.0, 0.0)');
    expect(place(999, -10).label).toBe('(6.0, 8.0)');
  });

  it('snaps onto (3, 7) when close enough', () => {
    const v = checkPoint(place(graphX(3.2), graphY(6.7)));
    expect(v.ok).toBe(true);
    expect(v.line).toBe(POINT_LINES.win);
    expect(v.point.label).toBe('(3.0, 7.0)');
    expect(v.gap).toBeNull();
  });

  it('says which way to go, and draws where the point should be', () => {
    const wrongX = checkPoint(place(graphX(1), graphY(7)));
    expect(wrongX.line).toBe('close. x should be 3, so slide along first');
    expect(wrongX.gap).toBe('M110 50 L230 50');
    expect(wrongX.ring).toBe('M208 50 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0');
    const wrongY = checkPoint(place(graphX(3), graphY(2)));
    expect(wrongY.line).toBe("close. x is right. now what's 2 × 3 + 1?");
  });
});
