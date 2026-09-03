import { describe, expect, it } from 'bun:test';
import {
  COMPOSE_STAGES,
  composeStage,
  isLongWait,
  LOADING_LINE_MS,
  LOADING_LINES,
  LONG_WAIT_MS,
  loadingLine,
} from './generation';

describe('what Wobo is doing while a lesson is being made', () => {
  it('walks the stages in order and never runs out of them', () => {
    expect(composeStage(0)).toBe('Writing the lesson');
    expect(composeStage(8_999)).toBe('Writing the lesson');
    expect(composeStage(9_000)).toBe('Drawing the visuals');
    expect(composeStage(19_999)).toBe('Drawing the visuals');
    expect(composeStage(20_000)).toBe('Checking every answer');
    expect(composeStage(34_000)).toBe('Almost ready');
    expect(composeStage(10 * 60_000)).toBe('Almost ready');
  });

  it('never goes backwards', () => {
    let last = '';
    const seen: string[] = [];
    for (let t = 0; t < 60_000; t += 500) {
      const label = composeStage(t);
      if (label !== last) seen.push(label);
      last = label;
    }
    expect(seen).toEqual(COMPOSE_STAGES.map((s) => s.label));
  });

  it('names a stage in sentence case, with no promise of a percentage', () => {
    for (const { label } of COMPOSE_STAGES) {
      expect(label).toMatch(/^[A-Z][^!]*$/);
      expect(label).not.toMatch(/\d/);
    }
  });
});

describe('when a wait is worth the whole screen', () => {
  it('leaves a short wait to the toast in the corner', () => {
    expect(isLongWait(1_000, 1_000)).toBe(false);
    expect(isLongWait(1_000, 1_000 + LONG_WAIT_MS - 1)).toBe(false);
  });

  it('fills the screen once the learner has really been left waiting', () => {
    expect(isLongWait(1_000, 1_000 + LONG_WAIT_MS)).toBe(true);
    expect(isLongWait(1_000, 40_000)).toBe(true);
  });
});

describe('the handwritten line under the loader', () => {
  it('starts on the first line and rotates through them all', () => {
    expect(loadingLine(0)).toBe(LOADING_LINES[0] as string);
    expect(loadingLine(LOADING_LINE_MS)).toBe(LOADING_LINES[1] as string);
    expect(loadingLine(LOADING_LINE_MS * LOADING_LINES.length)).toBe(LOADING_LINES[0] as string);
  });

  it('is written the way a hand writes, not the way a machine reports', () => {
    for (const line of LOADING_LINES) {
      expect(line).toBe(line.toLowerCase());
      expect(line).not.toContain('!');
      expect(line.length).toBeLessThan(30);
    }
  });
});
